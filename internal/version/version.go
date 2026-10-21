// Package version holds build metadata injected at link time via
// -ldflags "-X github.com/lieyanc/FireTime/internal/version.Version=...".
package version

var (
	Version   = "dev"
	Commit    = "unknown"
	BuildTime = "unknown"
)
