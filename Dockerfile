# syntax=docker/dockerfile:1
#
# Một image duy nhất cho Render: Apache + PHP chạy Laravel, và Laravel phục vụ luôn bản build React.
# Cùng một domain cho web và API nên không cần cấu hình CORS/cookie chéo domain.

# ---------- Giai đoạn 1: build React ----------
FROM node:22-bookworm-slim AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
# Dùng "npm install" thay "npm ci": package-lock.json hiện thiếu @emnapi/core và @emnapi/runtime
# nên "npm ci" báo lệch lockfile. "npm install" vẫn bám phiên bản trong lockfile và chỉ bổ sung phần thiếu.
RUN npm install --no-audit --no-fund
COPY frontend/ ./
# VITE_API_URL để trống -> frontend gọi /api cùng domain.
RUN npm run build

# ---------- Giai đoạn 2: Laravel + Apache ----------
FROM php:8.4-apache

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      libfreetype6-dev libjpeg62-turbo-dev libpng-dev libzip-dev libicu-dev libpq-dev unzip \
 && docker-php-ext-configure gd --with-freetype --with-jpeg \
 && docker-php-ext-install -j"$(nproc)" pdo_mysql pdo_pgsql gd zip intl opcache \
 && a2enmod rewrite headers \
 && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

ENV APP_ENV=production \
    APP_DEBUG=false \
    COMPOSER_ALLOW_SUPERUSER=1 \
    PORT=10000

WORKDIR /var/www/html

# Cài thư viện PHP trước (tận dụng cache layer khi chỉ sửa code).
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-interaction --no-progress --no-scripts --no-autoloader --prefer-dist

COPY backend/ ./
RUN mkdir -p bootstrap/cache storage/app/public storage/framework/cache storage/framework/sessions storage/framework/views storage/logs \
 && composer dump-autoload --no-dev --optimize --no-interaction

# Bản build React đặt cạnh index.php; Apache phục vụ file tĩnh, còn lại về Laravel.
COPY --from=frontend /build/dist/ ./public/

# Cấu hình Apache/PHP và script khởi động.
COPY docker/vhost.conf /etc/apache2/sites-available/000-default.conf
COPY docker/ports.conf /etc/apache2/ports.conf
COPY docker/mpm_prefork.conf /etc/apache2/mods-available/mpm_prefork.conf
COPY docker/php.ini /usr/local/etc/php/conf.d/zz-librivo.ini
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN echo "ServerName localhost" > /etc/apache2/conf-available/servername.conf \
 && a2enconf servername \
 && sed -i 's/\r$//' /usr/local/bin/entrypoint.sh \
 && chmod +x /usr/local/bin/entrypoint.sh \
 && chown -R www-data:www-data storage bootstrap/cache

EXPOSE 10000
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
