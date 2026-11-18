#!/usr/bin/env bash
# One-time (idempotent) server setup. Run as root on the target server.
#
#   DEPLOY_PUBKEY="ssh-ed25519 AAAA... ci" \
#   CERTBOT_EMAIL="you@example.com" \
#   ADMIN_EMAIL="admin@example.com" \
#   bash bootstrap.sh
#
# Additive only: it adds a `bizcard` user, PostgreSQL, two systemd units and two
# nginx vhosts. It never edits existing nginx sites or other services.
set -euo pipefail

: "${DEPLOY_PUBKEY:?set DEPLOY_PUBKEY to the CI public key}"
: "${CERTBOT_EMAIL:?set CERTBOT_EMAIL}"
: "${ADMIN_EMAIL:?set ADMIN_EMAIL}"
ADMIN_USERNAME="${ADMIN_USERNAME:-sysadmin}"
WEB_DOMAIN="${WEB_DOMAIN:-bizcard.ahmedul.com}"
API_DOMAIN="${API_DOMAIN:-bizcardapi.ahmedul.com}"
HERE="$(cd "$(dirname "$0")" && pwd)"
BASE=/opt/bizcard
ENV_FILE=$BASE/shared/backend.env

[ "$(id -u)" -eq 0 ] || { echo "run as root" >&2; exit 1; }

echo "==> Packages (only installing what is missing)"
missing=()
for p in postgresql python3-venv curl rsync libgl1 libglib2.0-0 python3-certbot-nginx; do
  dpkg -s "$p" >/dev/null 2>&1 || missing+=("$p")
done
if [ ${#missing[@]} -gt 0 ]; then
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends "${missing[@]}"
fi

echo "==> bizcard user"
id bizcard >/dev/null 2>&1 || useradd --create-home --shell /bin/bash bizcard
install -d -m 700 -o bizcard -g bizcard /home/bizcard/.ssh
grep -qxF "$DEPLOY_PUBKEY" /home/bizcard/.ssh/authorized_keys 2>/dev/null \
  || echo "$DEPLOY_PUBKEY" >> /home/bizcard/.ssh/authorized_keys
chmod 600 /home/bizcard/.ssh/authorized_keys
chown bizcard:bizcard /home/bizcard/.ssh/authorized_keys

echo "==> Directories"
install -d -o bizcard -g bizcard "$BASE" "$BASE/app" "$BASE/shared" \
  "$BASE/shared/generated_cards" "$BASE/shared/uploads"
install -d -m 700 -o postgres -g postgres "$BASE/backups"

echo "==> Python virtualenv"
[ -x "$BASE/venv/bin/python" ] || sudo -u bizcard python3 -m venv "$BASE/venv"

echo "==> PostgreSQL database + backend.env"
if [ ! -f "$ENV_FILE" ]; then
  DB_PASS="$(openssl rand -hex 24)"
  SECRET="$(openssl rand -hex 32)"
  ADMIN_PASS="$(openssl rand -hex 12)"
  sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bizcard') THEN
    CREATE ROLE bizcard LOGIN PASSWORD '$DB_PASS';
  ELSE
    ALTER ROLE bizcard PASSWORD '$DB_PASS';
  END IF;
END \$\$;
SQL
  sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='bizcard_db'" | grep -q 1 \
    || sudo -u postgres createdb -O bizcard bizcard_db
  umask 077
  cat > "$ENV_FILE" <<ENV
DATABASE_URL=postgresql+psycopg://bizcard:$DB_PASS@127.0.0.1:5432/bizcard_db
SECRET_KEY=$SECRET
ACCESS_TOKEN_EXPIRE_MINUTES=1440
SYSTEM_ADMIN_USERNAME=$ADMIN_USERNAME
SYSTEM_ADMIN_EMAIL=$ADMIN_EMAIL
SYSTEM_ADMIN_PASSWORD=$ADMIN_PASS
GENERATED_CARD_STORAGE=$BASE/shared/generated_cards
UPLOAD_STORAGE=$BASE/shared/uploads
PUBLIC_APP_URL=https://$WEB_DOMAIN
APP_DEBUG=false
GEMINI_API_KEY=
ENV
  chown bizcard:bizcard "$ENV_FILE"; chmod 600 "$ENV_FILE"
  NEW_ADMIN_PASS="$ADMIN_PASS"
else
  echo "    $ENV_FILE already exists, leaving it untouched"
fi

echo "==> sudoers for service restarts"
cat > /etc/sudoers.d/bizcard <<'SUDO'
bizcard ALL=(root) NOPASSWD: /usr/bin/systemctl restart bizcard-api bizcard-web, /usr/bin/journalctl -u bizcard-api -u bizcard-web -n 40 --no-pager
SUDO
chmod 440 /etc/sudoers.d/bizcard
visudo -cf /etc/sudoers.d/bizcard >/dev/null

echo "==> systemd units"
install -m 644 "$HERE/systemd/bizcard-api.service" /etc/systemd/system/
install -m 644 "$HERE/systemd/bizcard-web.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable bizcard-api bizcard-web

echo "==> Nightly database backup"
cat > /etc/cron.d/bizcard-backup <<CRON
30 2 * * * postgres pg_dump -Fc bizcard_db > $BASE/backups/bizcard_db_\$(date +\%F).dump && find $BASE/backups -name '*.dump' -mtime +14 -delete
CRON
chmod 644 /etc/cron.d/bizcard-backup

echo "==> nginx vhosts (new files only)"
for d in "$WEB_DOMAIN" "$API_DOMAIN"; do
  install -m 644 "$HERE/nginx/$d.conf" "/etc/nginx/sites-available/$d"
  ln -sf "/etc/nginx/sites-available/$d" "/etc/nginx/sites-enabled/$d"
done
if nginx -t; then
  systemctl reload nginx
else
  echo "nginx config test failed; removing the new vhosts" >&2
  rm -f "/etc/nginx/sites-enabled/$WEB_DOMAIN" "/etc/nginx/sites-enabled/$API_DOMAIN"
  exit 1
fi

echo "==> TLS certificate"
certbot --nginx --non-interactive --agree-tos --redirect -m "$CERTBOT_EMAIL" \
  --cert-name "$WEB_DOMAIN" -d "$WEB_DOMAIN" -d "$API_DOMAIN"

echo
echo "Bootstrap complete."
if [ -n "${NEW_ADMIN_PASS:-}" ]; then
  echo "System admin login (shown once; also stored in $ENV_FILE):"
  echo "  email:    $ADMIN_EMAIL"
  echo "  password: $NEW_ADMIN_PASS"
fi
