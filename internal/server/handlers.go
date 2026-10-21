package server

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/lieyanc/FireTime/internal/store"
)

// ---- Users ----

func (s *Server) getUsers(w http.ResponseWriter, r *http.Request) {
	users, err := s.store.Users()
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"users": users})
}

func (s *Server) putUser(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ID            string  `json:"id"`
		Name          string  `json:"name"`
		Avatar        *string `json:"avatar"`
		ProgressColor *string `json:"progressColor"`
	}
	if !decode(w, r, &body) {
		return
	}
	if body.ID == "" || body.Name == "" {
		fail(w, http.StatusBadRequest, "Missing id or name")
		return
	}
	users, err := s.store.UpdateUser(body.ID, body.Name, body.Avatar, body.ProgressColor)
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"users": users})
}

// ---- Whole-document settings ----

func (s *Server) getSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := s.store.Settings()
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]json.RawMessage{"settings": settings})
}

func (s *Server) putSettings(w http.ResponseWriter, r *http.Request) {
	s.putDocument(w, r, s.store.SaveSettings, "settings")
}

func (s *Server) getTodos(w http.ResponseWriter, r *http.Request) {
	todos, err := s.store.Todos()
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]json.RawMessage{"todos": todos})
}

func (s *Server) putTodos(w http.ResponseWriter, r *http.Request) {
	s.putDocument(w, r, s.store.SaveTodos, "todos")
}

func (s *Server) getDailyTasks(w http.ResponseWriter, r *http.Request) {
	tasks, err := s.store.DailyTasks()
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, tasks)
}

func (s *Server) putDailyTasks(w http.ResponseWriter, r *http.Request) {
	s.putDocument(w, r, s.store.SaveDailyTasks, "")
}

// putDocument stores a JSON object body and echoes it under key, or answers
// {"success": true} when key is empty.
func (s *Server) putDocument(w http.ResponseWriter, r *http.Request, save func(json.RawMessage) error, key string) {
	var raw json.RawMessage
	if !decode(w, r, &raw) {
		return
	}
	if raw = bytes.TrimSpace(raw); len(raw) == 0 || raw[0] != '{' {
		fail(w, http.StatusBadRequest, "Expected a JSON object")
		return
	}
	if err := save(raw); err != nil {
		serverError(w, err)
		return
	}
	if key == "" {
		writeJSON(w, http.StatusOK, map[string]bool{"success": true})
		return
	}
	writeJSON(w, http.StatusOK, map[string]json.RawMessage{key: raw})
}

// ---- Templates ----

func (s *Server) getTemplates(w http.ResponseWriter, r *http.Request) {
	list, err := s.store.Templates()
	s.templatesResult(w, list, err)
}

func (s *Server) addTemplate(w http.ResponseWriter, r *http.Request) {
	if t, ok := decodeObject(w, r); ok {
		list, err := s.store.AddTemplate(t)
		s.templatesResult(w, list, err)
	}
}

func (s *Server) updateTemplate(w http.ResponseWriter, r *http.Request) {
	if t, ok := decodeObject(w, r); ok {
		list, err := s.store.UpdateTemplate(t)
		if errors.Is(err, store.ErrNotFound) {
			fail(w, http.StatusNotFound, "Template not found")
			return
		}
		s.templatesResult(w, list, err)
	}
}

func (s *Server) deleteTemplate(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		fail(w, http.StatusBadRequest, "Missing id")
		return
	}
	list, err := s.store.DeleteTemplate(id)
	s.templatesResult(w, list, err)
}

func (s *Server) templatesResult(w http.ResponseWriter, list []store.Object, err error) {
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"templates": list})
}

// ---- Days ----

func (s *Server) listDays(w http.ResponseWriter, r *http.Request) {
	from, to := r.URL.Query().Get("from"), r.URL.Query().Get("to")
	switch {
	case from != "" && !store.ValidDate(from):
		fail(w, http.StatusBadRequest, "Invalid from date")
		return
	case to != "" && !store.ValidDate(to):
		fail(w, http.StatusBadRequest, "Invalid to date")
		return
	case from != "" && to != "" && from > to:
		fail(w, http.StatusBadRequest, "from must be <= to")
		return
	}
	days, err := s.store.Days(from, to)
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": days})
}

func (s *Server) getDay(w http.ResponseWriter, r *http.Request) {
	day, err := s.store.Day(r.PathValue("date"))
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": day})
}

func (s *Server) putDay(w http.ResponseWriter, r *http.Request) {
	patch, ok := decodeObject(w, r)
	if !ok {
		return
	}
	day, err := s.store.MergeDay(r.PathValue("date"), patch)
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": day})
}

// getUserDayField serves ?userId=…'s schedule or tasks for a day.
func (s *Server) getUserDayField(field string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := r.URL.Query().Get("userId")
		if userID == "" {
			userID = "user1"
		}
		if !store.ValidUser(userID) {
			fail(w, http.StatusBadRequest, "Invalid user ID")
			return
		}
		v, err := s.store.UserDayField(r.PathValue("date"), userID, field)
		if err != nil {
			serverError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]json.RawMessage{field: v})
	}
}

// putUserDayField replaces one user's schedule or tasks: {userId, <field>}.
func (s *Server) putUserDayField(field string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		body, ok := decodeObject(w, r)
		if !ok {
			return
		}
		var userID string
		json.Unmarshal(body["userId"], &userID)
		value := body[field]
		if userID == "" || len(value) == 0 || string(value) == "null" {
			fail(w, http.StatusBadRequest, "Missing userId or "+field)
			return
		}
		if err := s.store.SetUserDayField(r.PathValue("date"), userID, field, value); err != nil {
			serverError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]json.RawMessage{field: value})
	}
}

// ---- Check-ins ----

// getCheckIns returns the day's check-ins plus the daily task list and both
// users' current streaks.
func (s *Server) getCheckIns(w http.ResponseWriter, r *http.Request) {
	date := r.PathValue("date")
	data, err := s.store.CheckIns(date)
	if err != nil {
		serverError(w, err)
		return
	}
	tasks, err := s.store.DailyTasks()
	if err != nil {
		serverError(w, err)
		return
	}
	settings, err := s.store.Settings()
	if err != nil {
		serverError(w, err)
		return
	}
	streaks, err := s.store.Streaks(date, tasks, settings)
	if err != nil {
		serverError(w, err)
		return
	}
	var list struct {
		Tasks json.RawMessage `json:"tasks"`
	}
	json.Unmarshal(tasks, &list)
	if len(list.Tasks) == 0 {
		list.Tasks = json.RawMessage("[]")
	}
	data["streaks"], _ = json.Marshal(streaks)
	data["tasks"] = list.Tasks
	writeJSON(w, http.StatusOK, data)
}

func (s *Server) putCheckIns(w http.ResponseWriter, r *http.Request) {
	var body struct {
		CheckIns         json.RawMessage `json:"checkIns"`
		HomeworkProgress json.RawMessage `json:"homeworkProgress"`
	}
	if !decode(w, r, &body) {
		return
	}
	if len(body.CheckIns) == 0 || string(body.CheckIns) == "null" {
		fail(w, http.StatusBadRequest, "Missing checkIns")
		return
	}
	if string(body.HomeworkProgress) == "null" {
		body.HomeworkProgress = nil
	}
	if err := s.store.SaveCheckIns(r.PathValue("date"), body.CheckIns, body.HomeworkProgress); err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"success": true})
}
