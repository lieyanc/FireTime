// Package server serves the FireTime REST API and the embedded web UI.
package server

import (
	"encoding/json"
	"errors"
	"io/fs"
	"log/slog"
	"net/http"
	"path"
	"strings"
	"time"

	"github.com/lieyanc/FireTime/internal/store"
)

const (
	cookieName  = "auth_token"
	maxJSONBody = 8 << 20
)

type Server struct {
	store  *store.Store
	web    fs.FS
	static *staticFS
}

// New builds the HTTP handler; web is the built UI (web/dist).
func New(st *store.Store, web fs.FS) http.Handler {
	s := &Server{store: st, web: web, static: newStaticFS(web)}
	return s.routes()
}

func (s *Server) routes() http.Handler {
	mux := http.NewServeMux()
	h := mux.HandleFunc

	h("GET /api/auth/login", s.passwordEnabled)
	h("POST /api/auth/login", s.login)
	h("POST /api/auth/logout", s.logout)
	h("GET /api/auth/verify", s.verify)
	h("GET /api/auth/password", s.passwordStatus)
	h("PUT /api/auth/password", s.setPassword)
	h("DELETE /api/auth/password", s.removePassword)

	h("GET /api/users", s.getUsers)
	h("PUT /api/users", s.putUser)
	h("POST /api/users/avatar", s.uploadAvatar)
	h("GET /avatars/{file}", s.avatar)

	h("GET /api/settings", s.getSettings)
	h("PUT /api/settings", s.putSettings)
	h("GET /api/todos", s.getTodos)
	h("PUT /api/todos", s.putTodos)
	h("GET /api/daily-tasks", s.getDailyTasks)
	h("PUT /api/daily-tasks", s.putDailyTasks)

	h("GET /api/templates", s.getTemplates)
	h("POST /api/templates", s.addTemplate)
	h("PUT /api/templates", s.updateTemplate)
	h("DELETE /api/templates", s.deleteTemplate)

	h("GET /api/days", s.listDays)
	h("GET /api/days/{date}", s.getDay)
	h("PUT /api/days/{date}", s.putDay)
	h("GET /api/schedules/{date}", s.getUserDayField("schedule"))
	h("PUT /api/schedules/{date}", s.putUserDayField("schedule"))
	h("GET /api/tasks/{date}", s.getUserDayField("tasks"))
	h("PUT /api/tasks/{date}", s.putUserDayField("tasks"))

	h("GET /api/checkins/{date}", s.getCheckIns)
	h("PUT /api/checkins/{date}", s.putCheckIns)

	h("/api/", func(w http.ResponseWriter, r *http.Request) {
		fail(w, http.StatusNotFound, "Not found")
	})
	mux.Handle("/", s.static)

	return withLog(s.withAuth(mux))
}

// withAuth gates the API (401) and the app pages (redirect to /login) once a
// password is set. Login, static files and avatars stay public.
func (s *Server) withAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := r.URL.Path
		api := strings.HasPrefix(p, "/api/")
		public := strings.HasPrefix(p, "/api/auth/") ||
			(!api && (p == "/login" || path.Ext(p) != ""))
		if public {
			next.ServeHTTP(w, r)
			return
		}
		ok, err := s.authorized(r)
		if err != nil {
			serverError(w, err)
			return
		}
		switch {
		case ok:
			next.ServeHTTP(w, r)
		case api:
			fail(w, http.StatusUnauthorized, "Unauthorized")
		default:
			http.Redirect(w, r, "/login", http.StatusFound)
		}
	})
}

func (s *Server) authorized(r *http.Request) (bool, error) {
	enabled, err := s.store.PasswordEnabled()
	if err != nil || !enabled {
		return !enabled, err
	}
	_, ok, err := s.store.Session(sessionToken(r))
	return ok, err
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

func withLog(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		defer func() {
			if v := recover(); v != nil {
				slog.Error("panic serving request", "method", r.Method, "path", r.URL.Path, "panic", v)
				fail(rec, http.StatusInternalServerError, "Internal server error")
			}
			if strings.HasPrefix(r.URL.Path, "/api/") {
				slog.Debug("request", "method", r.Method, "path", r.URL.Path, "status", rec.status, "duration", time.Since(start))
			}
		}()
		next.ServeHTTP(rec, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	enc.Encode(v)
}

func fail(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// serverError maps store validation errors to 4xx and logs the rest.
func serverError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, store.ErrInvalidDate):
		fail(w, http.StatusBadRequest, "Invalid date")
	case errors.Is(err, store.ErrInvalidUser):
		fail(w, http.StatusBadRequest, "Invalid user ID")
	case errors.Is(err, store.ErrNotFound):
		fail(w, http.StatusNotFound, "Not found")
	default:
		slog.Error("request failed", "err", err)
		fail(w, http.StatusInternalServerError, "Internal server error")
	}
}

// decode reads a JSON body into v, answering 400 itself on failure.
func decode(w http.ResponseWriter, r *http.Request, v any) bool {
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxJSONBody)).Decode(v); err != nil {
		fail(w, http.StatusBadRequest, "Invalid JSON body")
		return false
	}
	return true
}

// decodeObject reads a body that must be a JSON object, kept verbatim.
func decodeObject(w http.ResponseWriter, r *http.Request) (store.Object, bool) {
	var obj store.Object
	if !decode(w, r, &obj) {
		return nil, false
	}
	if obj == nil {
		fail(w, http.StatusBadRequest, "Expected a JSON object")
		return nil, false
	}
	return obj, true
}
