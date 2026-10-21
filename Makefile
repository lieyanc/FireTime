.PHONY: all web build binary run start dev dev-web lint clean

BIN     ?= bin/firetime
ADDR    ?= :9853
DATA    ?= data
PKG     := github.com/lieyanc/FireTime/internal/version
VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)
COMMIT  ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo unknown)
LDFLAGS := -s -w -X $(PKG).Version=$(VERSION) -X $(PKG).Commit=$(COMMIT) -X $(PKG).BuildTime=$(shell date -u +%Y-%m-%dT%H:%M:%SZ)

all: build

web/node_modules: web/package-lock.json
	npm ci --prefix web
	@touch $@

# Build the UI into web/dist (embedded by the Go binary).
web: web/node_modules
	npm run --prefix web build

build: web binary

# Static binary only, embedding whatever is already in web/dist.
binary:
	CGO_ENABLED=0 go build -trimpath -ldflags "$(LDFLAGS)" -o $(BIN) ./cmd/firetime

# Full build (UI + binary), then run it.
run: build
	./$(BIN) -addr $(ADDR) -data $(DATA)

# Build the binary without rebuilding the UI, then run it.
start: binary
	./$(BIN) -addr $(ADDR) -data $(DATA)

# Backend with the UI currently in web/dist; run `make dev-web` alongside for
# hot reload on http://localhost:3010 (proxies /api to the backend).
dev:
	go run ./cmd/firetime -addr $(ADDR) -data $(DATA) -debug

dev-web: web/node_modules
	npm run --prefix web dev

lint: web/node_modules
	go vet ./...
	npm run --prefix web lint
	npm run --prefix web typecheck

clean:
	rm -rf bin web/dist/assets web/dist/*.html web/dist/*.ico web/dist/*.png web/dist/avatars
