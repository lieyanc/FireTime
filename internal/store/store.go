// Package store persists FireTime data as JSON files under a data directory.
// The on-disk layout matches the original Next.js version so existing data
// directories keep working:
//
//	users.json, settings.json, todos.json, templates.json, daily-tasks.json, auth.json
//	days/YYYY-MM-DD.json, checkins/YYYY-MM-DD.json, avatars/<userId>.<ext>
//
// Most documents are owned by the frontend, so they are stored and returned
// as raw JSON; only the fields the server reasons about are decoded.
package store

import (
	"bytes"
	"embed"
	"encoding/json"
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync"
)

//go:embed defaults/*.json
var defaults embed.FS

// Object is a JSON object whose values are kept verbatim.
type Object = map[string]json.RawMessage

var (
	ErrInvalidDate = errors.New("invalid date")
	ErrInvalidUser = errors.New("invalid user id")
	ErrNotFound    = errors.New("not found")
)

var dateRe = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)

// ValidDate reports whether s is a YYYY-MM-DD date string.
func ValidDate(s string) bool { return dateRe.MatchString(s) }

// ValidUser reports whether id is one of the two users.
func ValidUser(id string) bool { return id == "user1" || id == "user2" }

// Store serializes every read-modify-write on the data directory.
type Store struct {
	dir string
	mu  sync.Mutex
}

// Open creates the data directory tree if needed.
func Open(dir string) (*Store, error) {
	for _, sub := range []string{"days", "checkins", "avatars"} {
		if err := os.MkdirAll(filepath.Join(dir, sub), 0o755); err != nil {
			return nil, err
		}
	}
	return &Store{dir: dir}, nil
}

// Dir returns the data directory.
func (s *Store) Dir() string { return s.dir }

// AvatarDir returns the directory holding uploaded avatars.
func (s *Store) AvatarDir() string { return filepath.Join(s.dir, "avatars") }

func encode(v any) ([]byte, error) {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	enc.SetIndent("", "  ")
	if err := enc.Encode(v); err != nil {
		return nil, err
	}
	return bytes.TrimRight(buf.Bytes(), "\n"), nil
}

// marshal is json.Marshal without HTML escaping, so stored text stays readable.
func marshal(v any) json.RawMessage {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	enc.Encode(v)
	return bytes.TrimRight(buf.Bytes(), "\n")
}

// write replaces name atomically so a crash never leaves a truncated file.
func (s *Store) write(name string, v any) error {
	data, err := encode(v)
	if err != nil {
		return err
	}
	p := filepath.Join(s.dir, name)
	tmp, err := os.CreateTemp(filepath.Dir(p), ".tmp-*")
	if err != nil {
		return err
	}
	if _, err = tmp.Write(data); err == nil {
		err = tmp.Close()
	} else {
		tmp.Close()
	}
	if err == nil {
		err = os.Rename(tmp.Name(), p)
	}
	if err != nil {
		os.Remove(tmp.Name())
	}
	return err
}

// read decodes name into v; ok is false when the file does not exist.
func (s *Store) read(name string, v any) (ok bool, err error) {
	data, err := os.ReadFile(filepath.Join(s.dir, name))
	if errors.Is(err, fs.ErrNotExist) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, json.Unmarshal(data, v)
}

// global loads a top-level document, seeding it from defaults on first use.
func (s *Store) global(name string) (json.RawMessage, error) {
	var raw json.RawMessage
	ok, err := s.read(name, &raw)
	if err != nil || ok {
		return raw, err
	}
	raw, err = defaults.ReadFile("defaults/" + name)
	if err != nil {
		return nil, err
	}
	return raw, s.write(name, raw)
}

func (s *Store) loadGlobal(name string, v any) error {
	raw, err := s.global(name)
	if err != nil {
		return err
	}
	return json.Unmarshal(raw, v)
}

func listDates(dir string) ([]string, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	var dates []string
	for _, e := range entries {
		if name, ok := strings.CutSuffix(e.Name(), ".json"); ok && ValidDate(name) {
			dates = append(dates, name)
		}
	}
	sort.Strings(dates)
	return dates, nil
}

// ---- Users ----

type User struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	Avatar        string `json:"avatar,omitempty"`
	ProgressColor string `json:"progressColor,omitempty"`
}

func (s *Store) Users() ([]User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var users []User
	return users, s.loadGlobal("users.json", &users)
}

// UpdateUser renames a user; nil avatar/progressColor leave those unchanged.
func (s *Store) UpdateUser(id, name string, avatar, progressColor *string) ([]User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var users []User
	if err := s.loadGlobal("users.json", &users); err != nil {
		return nil, err
	}
	for i := range users {
		if users[i].ID != id {
			continue
		}
		users[i].Name = name
		if avatar != nil {
			users[i].Avatar = *avatar
		}
		if progressColor != nil {
			users[i].ProgressColor = *progressColor
		}
		return users, s.write("users.json", users)
	}
	return users, nil
}

// ---- Settings, todos, daily tasks ----

// Settings returns the app settings, migrating homework progress stored as a
// single number (pre per-user tracking) to {user1, user2}.
func (s *Store) Settings() (json.RawMessage, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	raw, err := s.global("settings.json")
	if err != nil {
		return nil, err
	}
	var settings Object
	if err := json.Unmarshal(raw, &settings); err != nil {
		return nil, err
	}
	var subjects []Object
	if len(settings["subjects"]) == 0 || json.Unmarshal(settings["subjects"], &subjects) != nil {
		return raw, nil
	}
	migrated := false
	for _, subject := range subjects {
		var homework []Object
		if json.Unmarshal(subject["homework"], &homework) != nil {
			continue
		}
		changed := false
		for _, hw := range homework {
			var n json.Number
			if json.Unmarshal(hw["completedPages"], &n) == nil {
				hw["completedPages"] = marshal(map[string]json.Number{"user1": n, "user2": "0"})
				changed = true
			}
		}
		if changed {
			subject["homework"] = marshal(homework)
			migrated = true
		}
	}
	if !migrated {
		return raw, nil
	}
	settings["subjects"] = marshal(subjects)
	if err := s.write("settings.json", settings); err != nil {
		return nil, err
	}
	return marshal(settings), nil
}

func (s *Store) SaveSettings(raw json.RawMessage) error { return s.save("settings.json", raw) }

func (s *Store) Todos() (json.RawMessage, error) { return s.get("todos.json") }

func (s *Store) SaveTodos(raw json.RawMessage) error { return s.save("todos.json", raw) }

func (s *Store) DailyTasks() (json.RawMessage, error) { return s.get("daily-tasks.json") }

func (s *Store) SaveDailyTasks(raw json.RawMessage) error { return s.save("daily-tasks.json", raw) }

func (s *Store) get(name string) (json.RawMessage, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.global(name)
}

func (s *Store) save(name string, raw json.RawMessage) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.write(name, raw)
}

// ---- Templates ----

func (s *Store) Templates() ([]Object, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.templates()
}

func (s *Store) templates() ([]Object, error) {
	var list []Object
	return list, s.loadGlobal("templates.json", &list)
}

func isDefault(t Object) bool { return string(t["isDefault"]) == "true" }

func templateID(t Object) string {
	var id string
	json.Unmarshal(t["id"], &id)
	return id
}

// AddTemplate appends t; a new default template clears the previous default.
func (s *Store) AddTemplate(t Object) ([]Object, error) {
	return s.editTemplates(func(list []Object) ([]Object, error) {
		if isDefault(t) {
			clearDefault(list)
		}
		return append(list, t), nil
	})
}

// UpdateTemplate replaces the template with t's id.
func (s *Store) UpdateTemplate(t Object) ([]Object, error) {
	return s.editTemplates(func(list []Object) ([]Object, error) {
		id := templateID(t)
		for i := range list {
			if templateID(list[i]) == id {
				if isDefault(t) {
					clearDefault(list)
				}
				list[i] = t
				return list, nil
			}
		}
		return nil, ErrNotFound
	})
}

func (s *Store) DeleteTemplate(id string) ([]Object, error) {
	return s.editTemplates(func(list []Object) ([]Object, error) {
		kept := list[:0]
		for _, t := range list {
			if templateID(t) != id {
				kept = append(kept, t)
			}
		}
		return kept, nil
	})
}

func clearDefault(list []Object) {
	for _, t := range list {
		t["isDefault"] = json.RawMessage("false")
	}
}

func (s *Store) editTemplates(fn func([]Object) ([]Object, error)) ([]Object, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	list, err := s.templates()
	if err != nil {
		return nil, err
	}
	if list, err = fn(list); err != nil {
		return nil, err
	}
	if list == nil {
		list = []Object{}
	}
	return list, s.write("templates.json", list)
}

// ---- Days ----

func dayFile(date string) string { return filepath.Join("days", date+".json") }

// Day returns a day's data, creating it from the default template if missing.
func (s *Store) Day(date string) (Object, error) {
	if !ValidDate(date) {
		return nil, ErrInvalidDate
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.day(date)
}

func (s *Store) day(date string) (Object, error) {
	var day Object
	if ok, err := s.read(dayFile(date), &day); err != nil || ok {
		return day, err
	}
	list, err := s.templates()
	if err != nil {
		return nil, err
	}
	var tpl Object
	for _, t := range list {
		if isDefault(t) {
			tpl = t
			break
		}
	}
	if tpl == nil && len(list) > 0 {
		tpl = list[0]
	}
	blocks := json.RawMessage("[]")
	if b := tpl["blocks"]; len(b) > 0 && string(b) != "null" {
		blocks = b
	}
	user := marshal(map[string]json.RawMessage{"schedule": blocks, "tasks": json.RawMessage("[]")})
	day = Object{"date": marshal(date), "user1": user, "user2": user}
	return day, s.write(dayFile(date), day)
}

// Days returns every stored day within [from, to]; empty bounds are open.
func (s *Store) Days(from, to string) ([]Object, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	dates, err := listDates(filepath.Join(s.dir, "days"))
	if err != nil {
		return nil, err
	}
	days := []Object{}
	for _, d := range dates {
		if (from != "" && d < from) || (to != "" && d > to) {
			continue
		}
		day, err := s.day(d)
		if err != nil {
			return nil, err
		}
		days = append(days, day)
	}
	return days, nil
}

// MergeDay shallow-merges patch into the day, keeping date authoritative.
func (s *Store) MergeDay(date string, patch Object) (Object, error) {
	if !ValidDate(date) {
		return nil, ErrInvalidDate
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	day, err := s.day(date)
	if err != nil {
		return nil, err
	}
	for k, v := range patch {
		day[k] = v
	}
	day["date"] = marshal(date)
	return day, s.write(dayFile(date), day)
}

// UserDayField returns one field ("schedule" or "tasks") of a user's day.
func (s *Store) UserDayField(date, userID, field string) (json.RawMessage, error) {
	day, err := s.Day(date)
	if err != nil {
		return nil, err
	}
	var user Object
	json.Unmarshal(day[userID], &user)
	if v := user[field]; len(v) > 0 && string(v) != "null" {
		return v, nil
	}
	return json.RawMessage("[]"), nil
}

// SetUserDayField replaces one field of a user's day.
func (s *Store) SetUserDayField(date, userID, field string, value json.RawMessage) error {
	if !ValidDate(date) {
		return ErrInvalidDate
	}
	if !ValidUser(userID) {
		return ErrInvalidUser
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	day, err := s.day(date)
	if err != nil {
		return err
	}
	var user Object
	json.Unmarshal(day[userID], &user)
	if user == nil {
		user = Object{}
	}
	user[field] = value
	day[userID] = marshal(user)
	return s.write(dayFile(date), day)
}
