#!/usr/bin/env bash
# Dumps the MySQL database (schema + data) and gzips it with a timestamped
# filename, pruning backups older than $RETENTION_DAYS. Reads DATABASE_URL
# from the environment (same variable the app itself uses) so it stays in
# sync with whatever the server is actually configured to talk to.
#
# Usage:
#   DATABASE_URL=mysql://user:pass@host:3306/brickcity ./scripts/backup.sh
#   BACKUP_DIR=/var/backups/brickcity RETENTION_DAYS=30 ./scripts/backup.sh
#
# Cron example (daily at 03:00, 14-day retention):
#   0 3 * * * DATABASE_URL=... BACKUP_DIR=/var/backups/brickcity RETENTION_DAYS=14 /path/to/backup.sh >> /var/log/brickcity-backup.log 2>&1
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set" >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "$BACKUP_DIR"

# Parse DATABASE_URL=mysql://user:pass@host:port/dbname into mysqldump args
# without ever echoing the password to stdout/argv-visible-in-ps.
url="${DATABASE_URL#mysql://}"
userpass="${url%%@*}"
hostpart="${url#*@}"
DB_USER="${userpass%%:*}"
DB_PASS="${userpass#*:}"
hostport="${hostpart%%/*}"
DB_HOST="${hostport%%:*}"
DB_PORT="${hostport#*:}"
[[ "$DB_PORT" == "$DB_HOST" ]] && DB_PORT=3306
DB_NAME="${hostpart#*/}"
DB_NAME="${DB_NAME%%\?*}"

OUT_FILE="$BACKUP_DIR/brickcity-${TIMESTAMP}.sql.gz"

MYSQL_PWD="$DB_PASS" mysqldump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  --single-transaction \
  --routines \
  --triggers \
  "$DB_NAME" | gzip > "$OUT_FILE"

echo "Backup written: $OUT_FILE ($(du -h "$OUT_FILE" | cut -f1))"

if [[ "$RETENTION_DAYS" -gt 0 ]]; then
  find "$BACKUP_DIR" -name 'brickcity-*.sql.gz' -mtime "+${RETENTION_DAYS}" -print -delete
fi
