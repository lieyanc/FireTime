package store

import (
	"encoding/json"
	"path/filepath"
	"time"
)

func checkInFile(date string) string { return filepath.Join("checkins", date+".json") }

// CheckIns returns a day's check-in record; missing days and pre-homework
// records get empty defaults (not written back).
func (s *Store) CheckIns(date string) (Object, error) {
	if !ValidDate(date) {
		return nil, ErrInvalidDate
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	var data Object
	ok, err := s.read(checkInFile(date), &data)
	if err != nil {
		return nil, err
	}
	empty := json.RawMessage(`{"user1":[],"user2":[]}`)
	if !ok {
		data = Object{"date": marshal(date), "checkIns": empty}
	}
	if v := data["homeworkProgress"]; len(v) == 0 || string(v) == "null" {
		data["homeworkProgress"] = empty
	}
	return data, nil
}

// SaveCheckIns stores a day's check-ins; nil homeworkProgress is omitted.
func (s *Store) SaveCheckIns(date string, checkIns, homeworkProgress json.RawMessage) error {
	if !ValidDate(date) {
		return ErrInvalidDate
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	data := Object{"date": marshal(date), "checkIns": checkIns}
	if len(homeworkProgress) > 0 {
		data["homeworkProgress"] = homeworkProgress
	}
	return s.write(checkInFile(date), data)
}

type dailyTask struct {
	ID        string `json:"id"`
	SubjectID string `json:"subjectId"`
}

type subjectOwner struct {
	ID         string `json:"id"`
	AssignedTo string `json:"assignedTo"`
}

// tasksFor mirrors filterDailyTasksForUser in web/src/lib/daily-tasks.ts:
// tasks without a subject, or whose subject is gone, belong to both users.
func tasksFor(tasks []dailyTask, subjects []subjectOwner, userID string) map[string]bool {
	owner := make(map[string]string, len(subjects))
	for _, s := range subjects {
		owner[s.ID] = s.AssignedTo
	}
	set := make(map[string]bool)
	for _, t := range tasks {
		to, found := owner[t.SubjectID]
		if t.SubjectID == "" || !found || to == "" || to == "both" || to == userID {
			set[t.ID] = true
		}
	}
	return set
}

// Streaks counts, per user, the consecutive days ending at today on which
// every daily task assigned to them was completed. An unfinished today does
// not break the streak.
func (s *Store) Streaks(today string, dailyTasks, settings json.RawMessage) (map[string]int, error) {
	day, err := time.Parse(time.DateOnly, today)
	if err != nil {
		return nil, ErrInvalidDate
	}
	var tl struct {
		Tasks []dailyTask `json:"tasks"`
	}
	var st struct {
		Subjects []subjectOwner `json:"subjects"`
	}
	json.Unmarshal(dailyTasks, &tl)
	json.Unmarshal(settings, &st)

	users := []string{"user1", "user2"}
	assigned := map[string]map[string]bool{}
	active := map[string]bool{}
	streaks := map[string]int{"user1": 0, "user2": 0}
	for _, u := range users {
		assigned[u] = tasksFor(tl.Tasks, st.Subjects, u)
		active[u] = len(assigned[u]) > 0
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	for i := 0; i < 365 && (active["user1"] || active["user2"]); i++ {
		var rec struct {
			CheckIns map[string][]struct {
				TaskID    string `json:"taskId"`
				Completed bool   `json:"completed"`
			} `json:"checkIns"`
		}
		date := day.AddDate(0, 0, -i).Format(time.DateOnly)
		if _, err := s.read(checkInFile(date), &rec); err != nil {
			return nil, err
		}
		for _, u := range users {
			if !active[u] {
				continue
			}
			done := 0
			for _, c := range rec.CheckIns[u] {
				if c.Completed && assigned[u][c.TaskID] {
					done++
				}
			}
			if done >= len(assigned[u]) {
				streaks[u]++
			} else if i != 0 {
				active[u] = false
			}
		}
	}
	return streaks, nil
}
