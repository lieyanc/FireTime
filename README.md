# FireTime

A two-person vacation time manager: two users each keep a daily schedule, todos, homework progress and exam countdowns, and can see each other's.

## Features

- **Dual schedules** — each user keeps their own daily timeline and can view the other's
- **Todos** — status cycles pending → in progress → completed
- **Vacation progress** — days left at a glance
- **Homework tracking** — per-subject progress, per user
- **Daily check-ins** — fixed daily tasks with streaks and a head-to-head PK view
- **Exam countdowns**
- **Schedule templates** — new days start from the default template
- **Calendar view** and an **immersive clock**
- Optional per-user **password protection**

## Tech Stack

- **Backend**: Go (standard library only), shipped as a single static binary with the UI embedded via `go:embed`
- **Frontend**: React 19 + Vite + React Router, TypeScript
- **UI**: Tailwind CSS 4, shadcn/ui (Radix UI), lucide-react
- **Data fetching**: SWR
- **Storage**: JSON files on the local filesystem (`data/`)

## Quick Start

Download the binary for your platform from [Releases](https://github.com/lieyanc/FireTime/releases) (`dev` is the latest master build) and run it:

```bash
./firetime -addr :9853 -data ./data
```

Open http://localhost:9853. Default data is created on first run.

| Flag | Default | Description |
|------|---------|-------------|
| `-addr` | `:9853` | Listen address |
| `-data` | `data` | Data directory |
| `-debug` | `false` | Log every API request |
| `-v` | | Print version and exit |

## Development

Requirements: Go 1.26+, Node.js 24+.

```bash
make build      # Build the UI into web/dist and the binary into bin/firetime
make run        # Build everything, then run on :9853
make dev        # Run the backend (serves the UI currently in web/dist)
make dev-web    # Vite dev server on http://localhost:3010, proxies /api to the backend
make lint       # go vet + ESLint + TypeScript
```

For hot reload, run `make dev` and `make dev-web` side by side and open http://localhost:3010.

## Project Structure

```
FireTime/
├── cmd/firetime/           # Binary entry point
├── internal/
│   ├── server/             # HTTP API, auth middleware, embedded static files, avatars
│   ├── store/              # JSON-file data layer (defaults/ holds first-run data)
│   └── version/            # Build metadata injected via -ldflags
├── web/                    # Frontend (Vite)
│   ├── embed.go            # Embeds web/dist into the binary
│   ├── public/             # Static files copied as-is
│   └── src/
│       ├── pages/          # Route pages
│       ├── components/     # React components (ui/ = shadcn/ui)
│       ├── hooks/          # SWR data hooks
│       ├── lib/            # Types and date/util helpers
│       └── router.tsx      # Routes
└── scripts/deploy.sh       # Server deploy/update script
```

## Data Storage

All data lives as JSON under the data directory:

| File | Contents |
|------|----------|
| `users.json` | User names, avatars, colors |
| `settings.json` | Vacation, subjects/homework, exams, motto |
| `templates.json` | Schedule templates |
| `todos.json` | Both users' todos |
| `daily-tasks.json` | Fixed daily check-in tasks |
| `auth.json` | Password hashes and sessions |
| `days/YYYY-MM-DD.json` | Per-day schedules and tasks |
| `checkins/YYYY-MM-DD.json` | Per-day check-ins and homework progress |
| `avatars/` | Uploaded avatars |

The layout is unchanged from the earlier Next.js version, so an existing `data/` directory works as-is.

## Deployment

Every push to master publishes a rolling `dev` prerelease; `v*` tags publish stable releases. Each release has binaries for Linux, macOS and Windows plus `SHA256SUMS`.

`scripts/deploy.sh` downloads the right binary for the server, verifies its checksum and runs it, keeping data in `./data`:

```bash
mkdir -p /opt/firetime && cd /opt/firetime
curl -fsSL -o deploy.sh https://raw.githubusercontent.com/lieyanc/FireTime/master/scripts/deploy.sh
chmod +x deploy.sh

./deploy.sh               # Update and run in the foreground
./deploy.sh --daemon      # Update and run in the background
./deploy.sh --update-only # Update only
./deploy.sh --run-only    # Run the current binary
./deploy.sh --stop        # Stop the background process
```

Environment variables: `PORT` (default `9853`), `BIND_HOST` (default `0.0.0.0`), `RELEASE_TAG` (default `dev`, e.g. `v1.0.0`).

> Users in mainland China can fetch the script through a mirror:
> ```bash
> curl -fsSL -o deploy.sh https://gh-proxy.org/https://raw.githubusercontent.com/lieyanc/FireTime/master/scripts/deploy.sh
> ```

Behind an HTTPS reverse proxy, forward `X-Forwarded-Proto` so the session cookie is marked `Secure`.

## License

GPL-3.0
