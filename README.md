# Adbrew assignment - TODO app

A small full-stack TODO app: React (hooks only) talking to a Django REST API
that persists straight into MongoDB with pymongo - no Django models,
serializers or SQLite involved. Everything runs in Docker.

## Running it

Compose needs to know where the code lives. Copy the example env file and
point it at the `src` directory of your clone:

```
cp .env.example .env   # then edit the path inside
docker-compose build
docker-compose up -d
```

- App: http://localhost:3000
- API: http://localhost:8000/todos/
- Mongo: localhost:27017 (data lands in `src/db/` on the host)

The first `app` start is slow because `yarn install` runs inside the
container. Follow along with `docker logs -f app` until it says
"Compiled successfully".

## API

| Method | Path      | Body                            | Response |
|--------|-----------|---------------------------------|----------|
| GET    | `/todos/` | -                               | `200` list of todos, newest first |
| POST   | `/todos/` | `{"description": "Learn Docker"}` | `201` created todo, `400` if description is missing/blank |

Both return `503` with a readable error if Mongo is unreachable.

## How it's structured

Backend (`src/rest/rest/`):
- `db.py` - one MongoClient for the process, with a short server-selection
  timeout so requests fail fast instead of hanging when Mongo is down.
- `todos.py` - `TodoRepository`, the only place that touches pymongo. Owns
  serialization (`ObjectId` -> string, timezone-aware timestamps) and ordering.
- `views.py` - thin DRF view: validate input, call the repository, map
  errors to status codes. No storage details in HTTP code.

Frontend (`src/app/src/`):
- `api/todos.js` - single fetch wrapper; one place that knows the base URL
  and how to turn a bad response into an Error with a useful message.
- `hooks/useTodos.js` - owns the list state. Loads on mount; `addTodo` POSTs
  and then re-fetches, so the list always reflects what's actually in Mongo
  rather than an optimistic local copy.
- `components/TodoForm.js` / `TodoList.js` - presentational, props in,
  with their own loading / error / empty / submitting states.
- `App.js` wires the hook to the two components.

## Fixes the original setup needed

The repo predates 2022 and no longer built as-is, so the Docker setup needed
some archaeology:

- `FROM python:3.8` now resolves to a bookworm-based image, but the
  mongodb-org 4.4 apt repo only ships buster packages and they need libssl1.1,
  which newer Debian dropped ("held broken packages"). Pinned the base image
  to `python:3.8-buster`.
- Buster itself is EOL and its packages moved off the main mirrors, so
  sources.list is rewritten to archive.debian.org before the first
  `apt-get update`.
- `easy_install pip` fails because easy_install was removed from setuptools.
  The base image already ships pip; it's now an upgrade capped at `pip<24.1`,
  since newer pip hard-rejects the malformed `pytz (>dev)` metadata inside the
  pinned celery 5.0.5 wheel.
- Webpack's file watcher relies on inotify events, which don't cross a
  Windows/macOS bind mount - host edits never triggered a recompile in the
  `app` container. `CHOKIDAR_USEPOLLING=true` in the compose file switches CRA
  to polling. (Django was unaffected; its StatReloader polls by design.)

## Design notes

- The frontend always calls `/todos/` with the trailing slash: Django's
  APPEND_SLASH redirect doesn't play nicely with POSTs from fetch.
- Timestamps are stored and returned timezone-aware. `datetime.utcnow()`
  yields a naive isoformat string with no offset, which `new Date()` in the
  browser would misparse as local time; pymongo also returns naive UTC
  datetimes on reads, so the repository normalizes before serializing.
- Newest-first ordering comes from an explicit `created_at` field rather than
  relying on `_id` ordering.
- API base URL comes from `REACT_APP_API_URL` with a localhost fallback, so
  it can be pointed elsewhere without touching code.

## Docker setup in one paragraph

All three services build the same image from the one Dockerfile (python
base + node/yarn + mongod + pip deps); only the `command:` differs per
container. Source is never baked into the image - the codebase is
bind-mounted at `/src` in every container, which is why code changes apply
without rebuilds. The API reaches Mongo at hostname `mongo` via the compose
link and the `MONGO_HOST`/`MONGO_PORT` env vars set in the Dockerfile, and
mongod binds 0.0.0.0 so it's reachable from the other containers.
