# Dokploy — Empiya P2P MoMo Crypto eXchange

Deploy this **webapp** repo (`p2p-momo-crypto-echange-webapp`) so **`main`** serves **`https://p2p.oneziko.com`**.

The Hardhat contracts live in a separate repo (`p2p-momo-crypto-exchange`) and are **not** deployed here — only their public addresses go into `VITE_*` build args.

---

## Prerequisites

1. Dokploy project (e.g. `Empiya P2P` / `oneziko-apps`).
2. DNS **A record**: `p2p.oneziko.com` → Dokploy server IP.
3. MySQL (Dokploy database service or the optional Compose MySQL).
4. Sepolia contract addresses + Alchemy key for the Vite build.

---

## Recommended: Application (Dockerfile)

### 1. Create Application

1. Dokploy → your project → **Create Service** → **Application**.
2. Provider: GitHub → `Chizzoz/p2p-momo-crypto-echange-webapp`.
3. Branch: **`main`** (auto-deploy on push if you enable it).
4. Build type: **Dockerfile**
   - Dockerfile: `Dockerfile`
   - Context: `.`
5. Port: **`80`**
6. Domains → add **`p2p.oneziko.com`**, HTTPS / Let’s Encrypt, port **80**.

### 2. Build arguments (Vite — baked into JS)

In **Build** / **Args** (must be set at image build time):

```env
VITE_CHAIN_ID=11155111
VITE_ALCHEMY_API_KEY=your_alchemy_key
VITE_EMPIYA_P2P_ADDRESS=0x7302919144a2B620a22F862d0a557c995d0b435D
VITE_EMPIYA_PAYMENTS_ADDRESS=0xaD9e29524952bf9EEE548EB56839C0b443fAEf72
VITE_USDT_ADDRESS=0x7169D38820dfd117C3FA1f22a697dBA58d90BA06
VITE_USDT_DECIMALS=6
```

Addresses above match the current Sepolia deploy (`SEPOLIA_CONTRACT_ADDRESS` / `SEPOLIA_PAYMENTS_ADDRESS`). Update them after redeploying contracts. Never put private keys in `VITE_*`.

### 3. Runtime environment

Paste into the Application **Environment** tab (adjust DB host to your Dokploy MySQL service hostname):

```env
APP_NAME="e-Mpiya P2P"
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:GENERATE_WITH_php_artisan_key_generate_show
APP_URL=https://p2p.oneziko.com

LOG_CHANNEL=stderr
LOG_LEVEL=info

DB_CONNECTION=mysql
DB_HOST=your-dokploy-mysql-service
DB_PORT=3306
DB_DATABASE=empiya_p2p
DB_USERNAME=empiya
DB_PASSWORD=change-me

CACHE_DRIVER=file
SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_SECURE_COOKIE=true
QUEUE_CONNECTION=sync

SANCTUM_STATEFUL_DOMAINS=p2p.oneziko.com
SESSION_DOMAIN=.oneziko.com

# First deploy only — seeds currencies / countries / MNOs / USDT token
RUN_DB_SEEDERS=true
```

Generate `APP_KEY` locally:

```bash
php artisan key:generate --show
```

After the first successful deploy + seed, set `RUN_DB_SEEDERS=false` (or remove it) so restarts do not re-seed.

### 4. Deploy

Click **Deploy**. Entrypoint runs `migrate --force`, optional seeders, config/route/view cache, then FrankenPHP on port 80.

Health check: `https://p2p.oneziko.com/health` → `ok`.

---

## Optional: Compose stack

Compose path: `./docker-compose.dokploy.yml`

- Joins external `dokploy-network`.
- Persists MySQL / public storage under Dokploy `../files/…`.
- Put the same env vars (including `VITE_*` for build args) in the Compose **Environment** tab.
- Prefer **Domains** UI on service `app`, port **80** (avoid `container_name`).

---

## Post-deploy checklist

- [ ] `https://p2p.oneziko.com/health` returns `ok`
- [ ] MetaMask login works (wallet SIWE)
- [ ] Profile country / MNO selectors load (seeded payment methods)
- [ ] Sell Crypto modal shows USDT balance / Sepolia contracts
- [ ] `RUN_DB_SEEDERS=false` after first seed
- [ ] Auto-deploy from `main` enabled if desired

---

## Local image smoke test

```bash
docker build \
  --build-arg VITE_CHAIN_ID=11155111 \
  --build-arg VITE_ALCHEMY_API_KEY=… \
  --build-arg VITE_EMPIYA_P2P_ADDRESS=… \
  --build-arg VITE_EMPIYA_PAYMENTS_ADDRESS=… \
  --build-arg VITE_USDT_ADDRESS=0x7169D38820dfd117C3FA1f22a697dBA58d90BA06 \
  -t empiya-p2p-webapp .

docker run --rm -p 8080:80 --env-file .env.production empiya-p2p-webapp
# open http://localhost:8080/health
```

---

## Notes

- **PHP**: FrankenPHP PHP 8.2 + Laravel 9.
- **Proxies**: `TrustProxies` trusts `*` so Traefik HTTPS forwarding works.
- **Queues**: default `sync`. Set `QUEUE_CONNECTION=redis` (+ Redis host) to start a worker from `docker/entrypoint.sh`.
- Rebuild the image whenever `VITE_*` contract addresses change — they are not runtime env vars.
