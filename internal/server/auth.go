package server

import (
	"net/http"

	"github.com/lieyanc/FireTime/internal/store"
)

func sessionToken(r *http.Request) string {
	if c, err := r.Cookie(cookieName); err == nil {
		return c.Value
	}
	return ""
}

func secureRequest(r *http.Request) bool {
	return r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https"
}

func setSessionCookie(w http.ResponseWriter, r *http.Request, token string, maxAge int) {
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    token,
		Path:     "/",
		MaxAge:   maxAge,
		HttpOnly: true,
		Secure:   secureRequest(r),
		SameSite: http.SameSiteLaxMode,
	})
}

func (s *Server) passwordEnabled(w http.ResponseWriter, r *http.Request) {
	enabled, err := s.store.PasswordEnabled()
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"passwordEnabled": enabled})
}

// login matches the password against both users; without any password set,
// everyone enters as user1.
func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Password string `json:"password"`
	}
	if !decode(w, r, &body) {
		return
	}
	enabled, err := s.store.PasswordEnabled()
	if err != nil {
		serverError(w, err)
		return
	}
	userID := "user1"
	if enabled {
		var ok bool
		if userID, ok, err = s.store.MatchPassword(body.Password); err != nil {
			serverError(w, err)
			return
		} else if !ok {
			fail(w, http.StatusUnauthorized, "密码错误")
			return
		}
	}
	token, err := s.store.CreateSession(userID)
	if err != nil {
		serverError(w, err)
		return
	}
	setSessionCookie(w, r, token, int(store.SessionTTL.Seconds()))
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "userId": userID})
}

func (s *Server) logout(w http.ResponseWriter, r *http.Request) {
	if token := sessionToken(r); token != "" {
		if err := s.store.DeleteSession(token); err != nil {
			serverError(w, err)
			return
		}
	}
	setSessionCookie(w, r, "", -1)
	writeJSON(w, http.StatusOK, map[string]bool{"success": true})
}

func (s *Server) verify(w http.ResponseWriter, r *http.Request) {
	enabled, err := s.store.PasswordEnabled()
	if err != nil {
		serverError(w, err)
		return
	}
	if !enabled {
		writeJSON(w, http.StatusOK, map[string]bool{"authenticated": true, "passwordEnabled": false})
		return
	}
	userID, ok, err := s.store.Session(sessionToken(r))
	if err != nil {
		serverError(w, err)
		return
	}
	if !ok {
		writeJSON(w, http.StatusOK, map[string]bool{"authenticated": false, "passwordEnabled": true})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"authenticated": true, "userId": userID, "passwordEnabled": true})
}

func (s *Server) passwordStatus(w http.ResponseWriter, r *http.Request) {
	u1, u2, err := s.store.PasswordStatus()
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"user1": u1, "user2": u2})
}

// mayChangePassword allows changing a user's password with either their own
// session or their current password; users without one are open.
func (s *Server) mayChangePassword(r *http.Request, userID, currentPassword string) (bool, error) {
	u1, u2, err := s.store.PasswordStatus()
	if err != nil {
		return false, err
	}
	if !map[string]bool{"user1": u1, "user2": u2}[userID] {
		return true, nil
	}
	if sessionUser, ok, err := s.store.Session(sessionToken(r)); err != nil || (ok && sessionUser == userID) {
		return err == nil, err
	}
	if currentPassword == "" {
		return false, nil
	}
	return s.store.CheckPassword(userID, currentPassword)
}

type passwordRequest struct {
	UserID          string `json:"userId"`
	NewPassword     string `json:"newPassword"`
	CurrentPassword string `json:"currentPassword"`
}

func (s *Server) setPassword(w http.ResponseWriter, r *http.Request) {
	var body passwordRequest
	if !decode(w, r, &body) {
		return
	}
	if !store.ValidUser(body.UserID) {
		fail(w, http.StatusBadRequest, "Invalid user ID")
		return
	}
	if len([]rune(body.NewPassword)) < 4 {
		fail(w, http.StatusBadRequest, "密码至少需要4位")
		return
	}
	if used, err := s.store.PasswordUsedByOther(body.UserID, body.NewPassword); err != nil {
		serverError(w, err)
		return
	} else if used {
		fail(w, http.StatusBadRequest, "此密码已被使用，请设置不同的密码")
		return
	}
	if ok, err := s.mayChangePassword(r, body.UserID, body.CurrentPassword); err != nil {
		serverError(w, err)
		return
	} else if !ok {
		fail(w, http.StatusUnauthorized, "需要验证当前密码")
		return
	}
	if err := s.store.SetPassword(body.UserID, body.NewPassword); err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"success": true})
}

func (s *Server) removePassword(w http.ResponseWriter, r *http.Request) {
	var body passwordRequest
	if !decode(w, r, &body) {
		return
	}
	if !store.ValidUser(body.UserID) {
		fail(w, http.StatusBadRequest, "Invalid user ID")
		return
	}
	if ok, err := s.mayChangePassword(r, body.UserID, body.CurrentPassword); err != nil {
		serverError(w, err)
		return
	} else if !ok {
		fail(w, http.StatusUnauthorized, "需要验证当前密码")
		return
	}
	if err := s.store.RemovePassword(body.UserID); err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"success": true})
}
