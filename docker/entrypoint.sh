#!/bin/sh
# Khởi động container LIBRIVO trên Render:
#   1) suy ra URL công khai và kiểm tra biến môi trường bắt buộc
#   2) migrate + seed dữ liệu demo lần đầu
#   3) chạy scheduler nền (hết hạn giữ sách mỗi phút) và Apache
set -eu
cd /var/www/html

log() { echo "[librivo] $*"; }
die() { echo "[librivo] LỖI: $*" >&2; exit 1; }

# Mọi lệnh artisan chạy bằng www-data để file trong storage/ không bị root giữ quyền.
artisan() { runuser -u www-data -- php artisan "$@"; }

# ---------- 1. Biến môi trường ----------
PORT="${PORT:-10000}"
# Render tự đặt RENDER_EXTERNAL_URL / RENDER_EXTERNAL_HOSTNAME cho Web Service.
if [ -z "${APP_URL:-}" ] && [ -n "${RENDER_EXTERNAL_URL:-}" ]; then APP_URL="$RENDER_EXTERNAL_URL"; fi
if [ -z "${FRONTEND_URL:-}" ] && [ -n "${APP_URL:-}" ]; then FRONTEND_URL="$APP_URL"; fi
if [ -z "${SANCTUM_STATEFUL_DOMAINS:-}" ] && [ -n "${RENDER_EXTERNAL_HOSTNAME:-}" ]; then
  SANCTUM_STATEFUL_DOMAINS="$RENDER_EXTERNAL_HOSTNAME"
fi
[ -n "${APP_URL:-}" ] || die "Chưa có APP_URL (Render tự đặt RENDER_EXTERNAL_URL; nếu chạy ngoài Render hãy tự đặt APP_URL)."
[ -n "${SANCTUM_STATEFUL_DOMAINS:-}" ] || die "Chưa có SANCTUM_STATEFUL_DOMAINS (tên miền của website, không kèm https://)."

# APP_KEY: Render sinh chuỗi base64 của 32 byte ngẫu nhiên; Laravel cần tiền tố "base64:".
[ -n "${APP_KEY:-}" ] || die "Chưa có APP_KEY."
case "$APP_KEY" in base64:*) ;; *) APP_KEY="base64:$APP_KEY" ;; esac
KEY_BYTES=$(printf '%s' "${APP_KEY#base64:}" | base64 -d 2>/dev/null | wc -c | tr -d ' ')
[ "$KEY_BYTES" = "32" ] || die "APP_KEY phải là base64 của đúng 32 byte (hiện $KEY_BYTES byte). Tạo bằng: php artisan key:generate --show"

# CSDL: hoặc một chuỗi kết nối DB_URL (Render Postgres), hoặc đủ DB_HOST/DB_DATABASE/DB_USERNAME/DB_PASSWORD (MySQL thuê ngoài).
[ -n "${DB_CONNECTION:-}" ] || die "Chưa có DB_CONNECTION (pgsql hoặc mysql)."
if [ -z "${DB_URL:-}" ]; then
  for v in DB_HOST DB_DATABASE DB_USERNAME DB_PASSWORD; do
    eval "val=\${$v:-}"
    [ -n "$val" ] || die "Chưa có DB_URL, và cũng thiếu biến $v. Cần một trong hai cách khai báo CSDL."
  done
fi

# Một số nhà cung cấp MySQL (vd. Aiven) yêu cầu chứng chỉ CA riêng: dán nội dung PEM vào DB_SSL_CA_PEM.
if [ -n "${DB_SSL_CA_PEM:-}" ]; then
  printf '%s\n' "$DB_SSL_CA_PEM" > /etc/ssl/librivo-db-ca.pem
  MYSQL_ATTR_SSL_CA=/etc/ssl/librivo-db-ca.pem
fi

export PORT APP_URL FRONTEND_URL SANCTUM_STATEFUL_DOMAINS APP_KEY
[ -z "${MYSQL_ATTR_SSL_CA:-}" ] || export MYSQL_ATTR_SSL_CA

# ---------- 2. Thư mục ghi và cấu hình ----------
mkdir -p storage/app/public storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
artisan storage:link --force >/dev/null 2>&1 || true
# Không dùng route:cache vì routes/web.php có closure.
artisan config:cache

# ---------- 3. Migrate (thử lại vài lần phòng khi MySQL chưa sẵn sàng/đang thức dậy) ----------
attempt=1
until artisan migrate --force; do
  [ "$attempt" -lt 6 ] || die "Không migrate được sau $attempt lần. Kiểm tra DB_URL (hoặc DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD) và SSL."
  log "Migrate lỗi, thử lại sau 10 giây ($attempt/6)..."
  attempt=$((attempt + 1))
  sleep 10
done

# ---------- 4. Seed dữ liệu demo (chỉ khi CSDL chưa có sách) ----------
if [ "${SEED_ON_BOOT:-true}" = "true" ]; then
  if artisan tinker --execute='echo \App\Models\Book::withTrashed()->exists() ? "HAS_DATA" : "EMPTY";' 2>/dev/null | grep -q HAS_DATA; then
    log "CSDL đã có dữ liệu, bỏ qua seed."
  else
    log "CSDL trống, nạp dữ liệu demo (có thể mất 1-2 phút)..."
    artisan db:seed --force
  fi
fi

# ---------- 5. Scheduler nền + Apache ----------
( while true; do artisan schedule:work || true; sleep 5; done ) &

log "Khởi động Apache trên cổng $PORT (APP_URL=$APP_URL)"
exec apache2-foreground
