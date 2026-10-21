# FireTime

Vacation time manager for two people, written in Go with a built-in web UI. Each user keeps a daily schedule, todos, homework progress and exam countdowns, and can see the other's. Ships as a single static binary; data is plain JSON files.

> The original Next.js implementation lives on the [`legacy`](https://github.com/lieyanc/FireTime/tree/legacy) branch. Its `data/` directory is used as-is, including passwords.

## Features

- **Dual schedules**: each user keeps their own daily timeline and can view the other's; new days start from the default template.
- **Todos**: status cycles pending → in progress → completed, and either user can add todos for the other.
- **Daily check-ins**: fixed daily tasks per user, with streaks and a head-to-head PK view.
- **Homework tracking**: per-subject progress for each user, fed automatically by check-ins.
- **Vacation progress and exam countdowns**.
- **Calendar view** and an **immersive clock**.
- **Password protection** (optional, per user): the password picks which user logs in.
- **Web UI** (React + shadcn/ui, embedded in the binary), light and dark themes.

## Quick start

Download a binary for your platform from [Releases](https://github.com/lieyanc/FireTime/releases) (`dev` is the latest master build), or build from source (Go 1.26+, Node 24+):

```bash
make build                          # builds web/ then bin/firetime
./bin/firetime                      # listens on :9853, data in ./data
./bin/firetime -addr 127.0.0.1:9853 -data /var/lib/firetime
```

Open `http://127.0.0.1:9853`. Default data is created on first start. Set passwords under Settings; until then the app is open to anyone who can reach it.

Flags: `-addr` listen address (default `:9853`), `-data` data directory (default `data`), `-debug` log every API request, `-v` print version. `SIGINT`/`SIGTERM` shut down gracefully.

Behind an HTTPS reverse proxy, forward `X-Forwarded-Proto` so the session cookie is marked `Secure`.

### systemd

```ini
[Unit]
Description=FireTime
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/opt/firetime/firetime -addr :9853 -data /opt/firetime/data
WorkingDirectory=/opt/firetime
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

To update, replace the binary and restart the service. Each release has a `SHA256SUMS` file to check the download against:

```bash
curl -fLO https://github.com/lieyanc/FireTime/releases/download/dev/firetime-linux-amd64
curl -fsSL https://github.com/lieyanc/FireTime/releases/download/dev/SHA256SUMS | sha256sum -c --ignore-missing
install -m 755 firetime-linux-amd64 /opt/firetime/firetime && systemctl restart firetime
```

### Migrating from the Next.js version

Stop the old Node process (`./deploy.sh --stop`), then start the binary with `-data` pointing at the existing `data/` directory (the old deploy script created it in the directory it was run from). The old `deploy.sh`, `app/` directory and `.artifact-version` file are no longer needed.

## Data

Everything lives under the data directory; back it up by copying it.

| Path | Contents |
|---|---|
| `users.json` | User names, avatars, progress colors |
| `settings.json` | Vacation dates, subjects and homework, exams, motto |
| `templates.json` | Schedule templates |
| `todos.json` | Both users' todos |
| `daily-tasks.json` | Daily check-in tasks |
| `auth.json` | Password hashes and login sessions |
| `days/YYYY-MM-DD.json` | Schedules and tasks for a day |
| `checkins/YYYY-MM-DD.json` | Check-ins and homework progress for a day |
| `avatars/` | Uploaded avatars |

## Development

```bash
make run        # full build, then run bin/firetime (ADDR=:9853 DATA=data)
make dev        # backend on :9853 with the UI currently in web/dist
make dev-web    # Vite dev server on :3010 proxying /api to :9853 (hot reload)
make lint       # go vet + ESLint + TypeScript
```

Layout:

```
cmd/firetime        entrypoint
internal/store      JSON-file data layer, auth, streaks; defaults/ seeds first-run data
internal/server     REST handlers, auth middleware, avatars, embedded UI serving
internal/version    build metadata injected via -ldflags
web/                React + TypeScript + shadcn/ui frontend (embedded via go:embed)
```

Releases: pushing to `master` publishes a rolling `dev` prerelease; pushing a `v*` tag publishes a stable release. Both include binaries for linux (amd64/arm64/riscv64), darwin (amd64/arm64) and windows (amd64/arm64) plus `SHA256SUMS`.

## License

GPL-3.0
