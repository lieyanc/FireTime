# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
make build                       # Build UI (web/dist) + single binary (bin/firetime)
make dev                         # Go backend on :9853, serving the UI in web/dist
make dev-web                     # Vite dev server on localhost:3010, proxies /api + /avatars to :9853
make lint                        # go vet + ESLint + tsc
go vet ./... && go build ./...   # Fast backend check
npm run --prefix web typecheck   # Fast frontend type-check
```

The Go package `web` embeds `web/dist` (`//go:embed all:dist`); `web/dist/.gitkeep` must stay so the embed compiles before the UI is built.

If type-check or build shows errors unrelated to your changes, they were likely introduced by another Claude Code instance or the user — ignore them and focus on your own work.

## Architecture

FireTime is a dual-user vacation time management app shipped as one Go binary with the React UI embedded. Two users (user1, user2) each manage daily schedules, tasks, and todos, and can view each other's data.

### Backend (Go, standard library only)

- `cmd/firetime/main.go` — flags `-addr` (default `:9853`), `-data` (default `data`), `-debug`, `-v`
- `internal/store/` — the single data access layer; JSON files under the data dir, one mutex, atomic writes
  - Documents the frontend owns (settings, todos, days, templates…) are kept as raw JSON (`store.Object` = `map[string]json.RawMessage`) so unknown fields survive; only fields the server reasons about are decoded
  - `defaults/*.json` seed global files on first access; a missing day file is created from the default template
  - `auth.json` — unsalted SHA-256 password hashes (kept for compatibility with the old Node version) + sessions
- `internal/server/` — REST handlers, auth middleware, embedded static file server (gzip + ETag, SPA fallback to index.html), avatars

The on-disk layout (`days/`, `checkins/`, `avatars/`, top-level JSON files) is identical to the former Next.js version.

### API

- `GET/PUT /api/days/[date]`, `GET /api/days?from=&to=` — day data
- `GET/PUT /api/schedules/[date]`, `/api/tasks/[date]` — one user's schedule/tasks within a day
- `GET/PUT /api/checkins/[date]` — check-ins (GET also returns daily tasks + streaks)
- `GET/PUT /api/todos`, `/api/settings`, `/api/daily-tasks`, `/api/users`; `POST /api/users/avatar`
- `GET/POST/PUT/DELETE /api/templates`
- `/api/auth/{login,logout,verify,password}`

Auth: once any password is set, `/api/*` (except `/api/auth/*`) needs a valid `auth_token` session cookie (401 otherwise) and page loads redirect to `/login`. The frontend's fetch wrapper in `web/src/main.tsx` sends the user to `/login` on a 401.

### Frontend (`web/`, Vite + React Router)

- `web/src/router.tsx` — routes; `components/app-layout.tsx` is the sidebar layout (`<Outlet />`)
- Hooks in `web/src/hooks/` use **SWR** against the API and expose mutate functions (`useDayData`, `useGlobalTodos`, `useSettings`, `useCalendarData`, `useWeekData`, `useDailyTasks`)
- Providers (`main.tsx`): `ThemeProvider` (next-themes) → `UserProvider` (current user in localStorage, `useUser()`) → `RouterProvider`
- **shadcn/ui** (new-york) + Radix in `web/src/components/ui/`, **Tailwind CSS 4** in `web/src/index.css`, **lucide-react** icons
- Build info shown in the header comes from Vite `define` (`import.meta.env.VITE_COMMIT_ID` etc.)

### Key Types (web/src/lib/types.ts)

- `DayData` — `date`, `user1: UserDayData`, `user2: UserDayData`; `UserDayData` — `schedule: TimeBlock[]`, `tasks: Task[]`
- `GlobalTodoItem` — status cycles pending → in_progress → completed
- `AppSettings` — vacation, subjects with per-user homework progress, exams
- Daily task visibility per user follows `web/src/lib/daily-tasks.ts`; `internal/store/checkins.go` mirrors it for streaks — keep them in sync

### Date Conventions

All dates use `YYYY-MM-DD` strings (validated server-side), times use `HH:mm`. Helpers in `web/src/lib/dates.ts`.

### Release

`.github/workflows/release.yml` builds binaries for linux/darwin/windows; master pushes refresh the rolling `dev` prerelease, `v*` tags publish stable releases. `scripts/deploy.sh` downloads from those releases and verifies `SHA256SUMS`.
