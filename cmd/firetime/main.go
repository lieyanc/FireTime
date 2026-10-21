package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/lieyanc/FireTime/internal/server"
	"github.com/lieyanc/FireTime/internal/store"
	"github.com/lieyanc/FireTime/internal/version"
	"github.com/lieyanc/FireTime/web"
)

func main() {
	addr := flag.String("addr", ":9853", "listen address")
	dataDir := flag.String("data", "data", "data directory")
	debug := flag.Bool("debug", false, "log every API request")
	showVersion := flag.Bool("v", false, "print version and exit")
	flag.Parse()
	if *showVersion {
		fmt.Printf("FireTime %s (commit %s, built %s)\n", version.Version, version.Commit, version.BuildTime)
		return
	}
	if *debug {
		slog.SetLogLoggerLevel(slog.LevelDebug)
	}

	st, err := store.Open(*dataDir)
	if err != nil {
		slog.Error("failed to open data directory", "dir", *dataDir, "err", err)
		os.Exit(1)
	}
	srv := &http.Server{
		Addr:              *addr,
		Handler:           server.New(st, web.FS()),
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       2 * time.Minute,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		srv.Shutdown(shutdownCtx)
	}()

	slog.Info("FireTime started", "version", version.Version, "addr", *addr, "data", *dataDir)
	if err := srv.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
		slog.Error("server failed", "err", err)
		os.Exit(1)
	}
	slog.Info("shutdown complete")
}
