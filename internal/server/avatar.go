package server

import (
	"errors"
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	"github.com/lieyanc/FireTime/internal/store"
)

const maxAvatarSize = 2 << 20

var avatarTypes = map[string]string{
	"image/jpeg": "jpg",
	"image/png":  "png",
	"image/gif":  "gif",
	"image/webp": "webp",
}

var avatarExtTypes = map[string]string{
	"jpg":  "image/jpeg",
	"jpeg": "image/jpeg",
	"png":  "image/png",
	"gif":  "image/gif",
	"webp": "image/webp",
}

// uploadAvatar stores data/avatars/<userId>.<ext> and returns its URL; the
// client then saves the URL on the user via PUT /api/users.
func (s *Server) uploadAvatar(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxAvatarSize+1<<20)
	file, header, err := r.FormFile("file")
	userID := r.FormValue("userId")
	if err != nil || userID == "" {
		fail(w, http.StatusBadRequest, "Missing file or userId")
		return
	}
	defer file.Close()
	if !store.ValidUser(userID) {
		fail(w, http.StatusBadRequest, "Invalid user ID")
		return
	}
	ext, ok := avatarTypes[header.Header.Get("Content-Type")]
	if !ok {
		fail(w, http.StatusBadRequest, "Invalid file type")
		return
	}
	data, err := io.ReadAll(io.LimitReader(file, maxAvatarSize+1))
	if err != nil {
		serverError(w, err)
		return
	}
	if len(data) > maxAvatarSize {
		fail(w, http.StatusBadRequest, "File too large (max 2MB)")
		return
	}
	dir := s.store.AvatarDir()
	name := userID + "." + ext
	if err := os.WriteFile(filepath.Join(dir, name), data, 0o644); err != nil {
		serverError(w, err)
		return
	}
	// Drop the user's avatar in other formats so stale files don't pile up.
	for _, other := range avatarTypes {
		if other != ext {
			os.Remove(filepath.Join(dir, userID+"."+other))
		}
	}
	writeJSON(w, http.StatusOK, map[string]string{"avatar": fmt.Sprintf("/avatars/%s?t=%d", name, time.Now().UnixMilli())})
}

// avatar serves uploaded avatars, falling back to ones bundled in the UI.
func (s *Server) avatar(w http.ResponseWriter, r *http.Request) {
	name := path.Base(r.PathValue("file"))
	ctype, ok := avatarExtTypes[strings.ToLower(strings.TrimPrefix(path.Ext(name), "."))]
	if !ok {
		http.NotFound(w, r)
		return
	}
	data, err := os.ReadFile(filepath.Join(s.store.AvatarDir(), name))
	if errors.Is(err, fs.ErrNotExist) && s.web != nil {
		data, err = fs.ReadFile(s.web, "avatars/"+name)
	}
	if err != nil {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", ctype)
	w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	w.Write(data)
}
