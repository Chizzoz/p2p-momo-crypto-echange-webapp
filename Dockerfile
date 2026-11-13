# =============================================================================
# Stage 1: Vite frontend assets (VITE_* must be build-args — baked into JS)
# =============================================================================
FROM node:20-bookworm-slim AS frontend

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY vite.config.ts tsconfig.json tailwind.config.js postcss.config.js ./
COPY resources ./resources
COPY public ./public

# Public chain / Alchemy values are compiled into the browser bundle.
ARG VITE_CHAIN_ID=11155111
ARG VITE_ALCHEMY_API_KEY=
ARG VITE_EMPIYA_P2P_ADDRESS=
ARG VITE_EMPIYA_PAYMENTS_ADDRESS=
ARG VITE_USDT_ADDRESS=0x7169D38820dfd117C3FA1f22a697dBA58d90BA06
ARG VITE_USDT_DECIMALS=6

ENV VITE_CHAIN_ID=$VITE_CHAIN_ID \
    VITE_ALCHEMY_API_KEY=$VITE_ALCHEMY_API_KEY \
    VITE_EMPIYA_P2P_ADDRESS=$VITE_EMPIYA_P2P_ADDRESS \
    VITE_EMPIYA_PAYMENTS_ADDRESS=$VITE_EMPIYA_PAYMENTS_ADDRESS \
    VITE_USDT_ADDRESS=$VITE_USDT_ADDRESS \
    VITE_USDT_DECIMALS=$VITE_USDT_DECIMALS

RUN npm run build

# =============================================================================
# Stage 2: FrankenPHP runtime (Laravel 9 / PHP 8.2)
# =============================================================================
FROM dunglas/frankenphp:1-php8.2 AS runner

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    unzip \
    curl \
    && rm -rf /var/lib/apt/lists/*

ADD --chmod=0755 https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/

RUN install-php-extensions \
    bcmath \
    gd \
    gmp \
    intl \
    opcache \
    pdo_mysql \
    pcntl \
    sockets \
    zip \
    redis

RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"
COPY docker/uploads.ini $PHP_INI_DIR/conf.d/uploads.ini

WORKDIR /app

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY . .
COPY --from=frontend /app/public/build ./public/build

ENV COMPOSER_ALLOW_SUPERUSER=1
RUN composer install \
    --no-dev \
    --optimize-autoloader \
    --no-interaction \
    --no-progress \
    --prefer-dist

RUN mkdir -p \
    storage/app/public \
    storage/framework/sessions \
    storage/framework/views \
    storage/framework/cache \
    storage/logs \
    bootstrap/cache \
    && chown -R www-data:www-data /app \
    && chmod -R 775 storage bootstrap/cache

COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD curl -f http://localhost:80/health || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
