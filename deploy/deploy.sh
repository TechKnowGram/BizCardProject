#!/usr/bin/env bash
# Runs on the server as the `bizcard` user after CI has synced the code.
set -euo pipefail

APP=/opt/bizcard/app
VENV=/opt/bizcard/venv
ENV_FILE=/opt/bizcard/shared/backend.env

echo "==> Backend dependencies"
"$VENV/bin/pip" install --quiet --disable-pip-version-check -r "$APP/backend/requirements.txt"

echo "==> Database migrations"
cd "$APP/backend"
set -a; . "$ENV_FILE"; set +a
"$VENV/bin/alembic" upgrade head

echo "==> Frontend build"
cd "$APP/frontend"
echo "BACKEND_URL=http://127.0.0.1:8001" > .env.production
npm ci --no-audit --no-fund
npm run build

echo "==> Restarting services"
sudo /usr/bin/systemctl restart bizcard-api bizcard-web

echo "==> Health checks"
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:8001/ >/dev/null && curl -fsS http://127.0.0.1:3001/ >/dev/null; then
    echo "OK: API and web are up"
    exit 0
  fi
  sleep 2
done
echo "Health check failed" >&2
sudo /usr/bin/journalctl -u bizcard-api -u bizcard-web -n 40 --no-pager >&2 || true
exit 1
