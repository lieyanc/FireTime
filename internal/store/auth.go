package store

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"time"
)

// SessionTTL is how long a login lasts.
const SessionTTL = 7 * 24 * time.Hour

type passwordEntry struct {
	PasswordHash string `json:"passwordHash"`
}

type session struct {
	UserID    string `json:"userId"`
	ExpiresAt int64  `json:"expiresAt"` // Unix milliseconds
}

// authData is data/auth.json. Passwords are unsalted SHA-256 hex, kept for
// compatibility with existing installs.
type authData struct {
	User1    *passwordEntry     `json:"user1"`
	User2    *passwordEntry     `json:"user2"`
	Sessions map[string]session `json:"sessions"`
}

func (a *authData) entry(userID string) **passwordEntry {
	if userID == "user2" {
		return &a.User2
	}
	return &a.User1
}

func hashPassword(pw string) string {
	sum := sha256.Sum256([]byte(pw))
	return hex.EncodeToString(sum[:])
}

func (e *passwordEntry) matches(pw string) bool {
	return e != nil && subtle.ConstantTimeCompare([]byte(e.PasswordHash), []byte(hashPassword(pw))) == 1
}

func (s *Store) auth() (*authData, error) {
	a := &authData{}
	ok, err := s.read("auth.json", a)
	if err != nil {
		return nil, err
	}
	if a.Sessions == nil {
		a.Sessions = map[string]session{}
	}
	if !ok {
		return a, s.write("auth.json", a)
	}
	return a, nil
}

func (s *Store) editAuth(fn func(*authData) error) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	a, err := s.auth()
	if err != nil {
		return err
	}
	if err := fn(a); err != nil {
		return err
	}
	return s.write("auth.json", a)
}

// PasswordStatus reports which users have a password.
func (s *Store) PasswordStatus() (user1, user2 bool, err error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	a, err := s.auth()
	if err != nil {
		return false, false, err
	}
	return a.User1 != nil, a.User2 != nil, nil
}

// PasswordEnabled reports whether the app is password-protected at all.
func (s *Store) PasswordEnabled() (bool, error) {
	u1, u2, err := s.PasswordStatus()
	return u1 || u2, err
}

// MatchPassword returns the user whose password is pw.
func (s *Store) MatchPassword(pw string) (string, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	a, err := s.auth()
	if err != nil {
		return "", false, err
	}
	switch {
	case a.User1.matches(pw):
		return "user1", true, nil
	case a.User2.matches(pw):
		return "user2", true, nil
	}
	return "", false, nil
}

// CheckPassword verifies pw for userID; users without a password always pass.
func (s *Store) CheckPassword(userID, pw string) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	a, err := s.auth()
	if err != nil {
		return false, err
	}
	e := *a.entry(userID)
	return e == nil || e.matches(pw), nil
}

// PasswordUsedByOther reports whether pw is the other user's password, which
// would make login ambiguous.
func (s *Store) PasswordUsedByOther(userID, pw string) (bool, error) {
	other := "user1"
	if userID == "user1" {
		other = "user2"
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	a, err := s.auth()
	if err != nil {
		return false, err
	}
	return (*a.entry(other)).matches(pw), nil
}

func (s *Store) SetPassword(userID, pw string) error {
	return s.editAuth(func(a *authData) error {
		*a.entry(userID) = &passwordEntry{PasswordHash: hashPassword(pw)}
		return nil
	})
}

func (s *Store) RemovePassword(userID string) error {
	return s.editAuth(func(a *authData) error {
		*a.entry(userID) = nil
		return nil
	})
}

// CreateSession starts a session for userID and prunes expired ones.
func (s *Store) CreateSession(userID string) (string, error) {
	b := make([]byte, 32)
	rand.Read(b)
	token := hex.EncodeToString(b)
	now := time.Now()
	err := s.editAuth(func(a *authData) error {
		for k, v := range a.Sessions {
			if v.ExpiresAt < now.UnixMilli() {
				delete(a.Sessions, k)
			}
		}
		a.Sessions[token] = session{UserID: userID, ExpiresAt: now.Add(SessionTTL).UnixMilli()}
		return nil
	})
	return token, err
}

// Session returns the user a live session token belongs to.
func (s *Store) Session(token string) (string, bool, error) {
	if token == "" {
		return "", false, nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	a, err := s.auth()
	if err != nil {
		return "", false, err
	}
	sess, ok := a.Sessions[token]
	if !ok {
		return "", false, nil
	}
	if sess.ExpiresAt < time.Now().UnixMilli() {
		delete(a.Sessions, token)
		return "", false, s.write("auth.json", a)
	}
	return sess.UserID, true, nil
}

func (s *Store) DeleteSession(token string) error {
	return s.editAuth(func(a *authData) error {
		delete(a.Sessions, token)
		return nil
	})
}
