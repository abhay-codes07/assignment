# Adbrew test - notes and plan

TODO app: React (port 3000) + Django/DRF (port 8000) + Mongo (27017), all running
in Docker. The API and frontend were stubs; this documents how the solution is
structured and why.

## Plan

Backend (src/rest):
- Keep views thin. Mongo access goes through a small repository class
  (`rest/todos.py`) instead of inline pymongo calls in the view, so the storage
  layer can be tested/swapped without touching HTTP code.
- Move the Mongo client into `rest/db.py`. One client per process, short server
  selection timeout so a dead Mongo fails fast instead of hanging the request.
- `GET /todos/` -> list of todos, newest first. ObjectId is not JSON serializable,
  so the repository maps `_id` -> `id` (string) before anything leaves it.
- `POST /todos/` -> validate that `description` is a non-empty string, 400 if not,
  201 with the created todo on success.
- Mongo being down should return a 503 with a readable error, not a 500 traceback.
- No Django models/serializers/SQLite (test requirement) - everything goes through
  the pymongo instance.

Frontend (src/app):
- Hooks only, no class components (test requirement).
- `api/todos.js` - tiny fetch wrapper. One place that knows the base URL, JSON
  headers and how to turn a bad response into an Error with a useful message.
- `hooks/useTodos.js` - owns the todo list state: load on mount, expose
  `addTodo` which POSTs and then re-fetches so the list always reflects Mongo.
- `components/TodoForm.js` / `components/TodoList.js` - presentational, get
  everything via props. Form keeps its own input/submit state and shows its own
  error; the list shows loading/error/empty states.
- `App.js` just wires the hook to the two components.

## Dockerfile fixes (the repo is from 2021 and no longer built as-is)

- `FROM python:3.8` now resolves to a bookworm-based image. The mongodb-org 4.4
  apt repo only publishes buster packages, and those depend on libssl1.1 which
  bookworm dropped - apt fails with "held broken packages". Pinned the base to
  `python:3.8-buster`.
- Buster itself is EOL and its apt repos moved off deb.debian.org, so the
  sources.list gets rewritten to archive.debian.org (with the expired-Release
  check disabled) before the first apt-get update.
- `easy_install pip` fails because easy_install was removed from setuptools in
  2021. The python base image already ships pip, so it's now an upgrade instead.
  Capped at `pip<24.1`: newer pip hard-rejects the malformed `pytz (>dev)`
  metadata inside the pinned celery 5.0.5 wheel.

## Decisions / gotchas

- Webpack's watcher relies on inotify, and those events don't cross a
  Windows/macOS bind mount - edits on the host never triggered a recompile
  inside the `app` container. `CHOKIDAR_USEPOLLING=true` in the compose file
  switches CRA to a polling watcher. (Django wasn't affected: its StatReloader
  polls by design.)
- Timestamps are stored and returned timezone-aware. `datetime.utcnow()` gives
  a naive datetime whose isoformat string has no offset, and `new Date()` in JS
  would misparse that as local time; pymongo also returns naive UTC datetimes
  on reads, so the repository normalizes before serializing.

- The route is `todos/` with a trailing slash. Django's APPEND_SLASH redirect
  doesn't play nicely with POSTs from fetch, so the frontend always calls
  `/todos/` directly.
- CORS is already open in settings.py (`CORS_ORIGIN_ALLOW_ALL`), and DRF auth is
  disabled, so no CSRF/auth handling needed on the frontend.
- API base URL comes from `REACT_APP_API_URL` with a localhost:8000 fallback -
  CRA inlines these at build time.
- Newest-first ordering via an inserted `created_at` timestamp; sorting by `_id`
  would also work but the explicit field is clearer.

## Running it (Windows)

`export ADBREW_CODEBASE_PATH=...` from the README is bash syntax. Compose reads
a `.env` file next to docker-compose.yml, so this repo has one with:

    ADBREW_CODEBASE_PATH=C:/Ass/adb_test/src

Then the usual:

    docker-compose build
    docker-compose up -d

First `app` start is slow (yarn install runs inside the container). Mongo data
lands in `src/db/` on the host via the bind mount - don't commit it.

## Docker setup (for the walkthrough)

- All three services build the same image from the one Dockerfile (python:3.8
  base + node/yarn + mongod + pip deps). Only the `command:` differs per
  container.
- Source is never baked into the image - `${ADBREW_CODEBASE_PATH}` is
  bind-mounted at /src in every container, which is why code changes apply
  without rebuilds (runserver and CRA both hot-reload).
- The API reaches Mongo at hostname `mongo` (compose `links` + MONGO_HOST /
  MONGO_PORT env vars set in the Dockerfile). mongod binds 0.0.0.0 so it's
  reachable from the other containers.
- The `ln -s /bin/echo /bin/systemctl` line fakes systemctl so the mongodb-org
  package's post-install scripts don't fail in a container without an init
  system.
