#!/bin/sh
set -e

cd /app

echo "Waiting for database…"
# Soft wait — migrate will fail clearly if DB is unreachable.
if [ -n "${DB_HOST:-}" ]; then
  i=0
  while [ "$i" -lt 30 ]; do
    if php -r "try { new PDO('mysql:host='.getenv('DB_HOST').';port='.(getenv('DB_PORT')?:'3306').';dbname='.getenv('DB_DATABASE'), getenv('DB_USERNAME'), getenv('DB_PASSWORD') ?: null); exit(0);} catch (Throwable \$e) { exit(1);}"; then
      break
    fi
    i=$((i + 1))
    sleep 2
  done
fi

if [ -n "${DB_HOST:-}" ] || [ -n "${DB_DATABASE:-}" ]; then
  echo "Running database migrations…"
  php artisan migrate --force --no-interaction

  if [ "${RUN_DB_SEEDERS:-false}" = "true" ]; then
    echo "Running database seeders (RUN_DB_SEEDERS=true)…"
    php artisan db:seed --force --no-interaction
  fi
fi

echo "Caching Laravel configuration…"
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "Ensuring storage symlink…"
php artisan storage:link || true

echo "Setting storage permissions…"
chown -R www-data:www-data /app/storage /app/bootstrap/cache
chmod -R 775 /app/storage /app/bootstrap/cache

if [ "${QUEUE_CONNECTION:-sync}" != "sync" ] && [ "${START_QUEUE_WORKER:-true}" = "true" ]; then
  echo "Starting queue worker…"
  php artisan queue:work --sleep=3 --tries=3 --max-time=3600 &
fi

echo "Starting FrankenPHP…"
exec frankenphp run --config /etc/caddy/Caddyfile
