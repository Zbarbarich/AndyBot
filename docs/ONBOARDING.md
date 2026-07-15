# Onboarding

Step-by-step guide to run Andy Bot locally for evaluation or development.

## What you will run

- One Postgres container (`deploy/docker-compose.dev.yml`)
- Node microservices (auth, customer, ticket, order, invoice, pdf, API gateway)
- React frontend (Vite)

Database name: `the_nineteenth_chamber` (legacy identifier; do not rename for existing hosts).

## 1. Clone and install

```bash
git clone https://github.com/Zbarbarich/AndyBot.git
cd AndyBot
npm run install-all
```

## 2. Start local Postgres

```bash
docker compose -f deploy/docker-compose.dev.yml up -d
docker compose -f deploy/docker-compose.dev.yml ps
```

Default credentials (development only):

| Variable | Value |
|----------|-------|
| User | `andybot` |
| Password | `andybot_dev_password` |
| Database | `the_nineteenth_chamber` |
| Port | `5432` |

If port 5432 is already in use on your machine, stop the other Postgres instance or change the published port in `deploy/docker-compose.dev.yml` and match `DB_PORT` in your `.env` files.

## 3. Environment files

```bash
cp backend/auth-service/.env.example backend/auth-service/.env
cp backend/api-gateway/.env.example backend/api-gateway/.env
cp frontend/.env.example frontend/.env
```

Set `backend/auth-service/.env`:

```env
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=the_nineteenth_chamber
DB_USER=andybot
DB_PASSWORD=andybot_dev_password
DB_SSL=false
JWT_SECRET=dev-only-change-me
JWT_EXPIRES_IN=1h
NODE_ENV=development
```

Propagate settings:

```bash
cd backend
chmod +x scripts/setup-env.sh
./scripts/setup-env.sh
cd ..
```

Set:

- `backend/api-gateway/.env` → `CORS_ORIGIN=http://localhost:5173`
- `frontend/.env` → `VITE_API_BASE=http://localhost:3000`

Optional PDF **sender identity** (not committed; set per environment):

| Variable | Purpose |
|----------|---------|
| `COMPANY_NAME` | Name on PDF header/footer |
| `COMPANY_ADDRESS_LINE1` | Street line |
| `COMPANY_CITY_STATE_ZIP` | City / state / ZIP |
| `COMPANY_LOGO_URL` | Optional remote logo URL (Andy minimal mark is used by default from service assets) |

- Local: put these in `backend/pdf-service/.env` (gitignored). If unset, generic “Your Company” placeholders are used.
- Production: put them in `deploy/.env`; Compose passes them into `pdf-service`.

PDF documents also bundle a minimal Andy mark in `backend/pdf-service/assets/`.

## 4. Schema migrations

Run once on an empty database:

```bash
cd backend/auth-service
NODE_PATH=./node_modules node ../scripts/run-all-migrations.js
cd ../..
```

This applies `backend/shared/schema/000_*.sql` through `022_*.sql` in order. Do not re-run on a populated database without reviewing each migration (some files are historical and destructive by design).

Existing databases that already ran through `021` can apply only the latest file:

```bash
cd backend/auth-service
NODE_PATH=./node_modules node ../scripts/run-migration-022.js
cd ../..
```

Migration `022` adds `users.ui_preferences` (JSONB) for per-account UI settings such as table column widths and sidebar collapsed state.

Product defaults after this branch: new quotes/orders use a **6%** tax rate; line items resolve catalog SKUs via authenticated item search (not the admin-only full items list).

## 5. First user

```bash
cd backend/auth-service
NODE_PATH=./node_modules node ../scripts/create-first-user.js "admin@example.com" "ChangeMe123!" "Admin"
cd ../..
```

## 6. Start the application

From the repository root:

```bash
npm start
```

This starts the frontend and all backend services. Open http://localhost:5173 and sign in.

To stop local Postgres later:

```bash
docker compose -f deploy/docker-compose.dev.yml down
```

Add `-v` only if you intend to delete the database volume.

## Troubleshooting

| Symptom | Check |
|---------|--------|
| `ECONNREFUSED` on DB | Compose is up; `DB_HOST` / `DB_PORT` match; credentials match Compose |
| `address already in use` | Another process holds 3000–3007 or 5173; stop it or change `PORT` |
| CORS errors in browser | `CORS_ORIGIN` includes `http://localhost:5173` |
| Blank API calls from UI | `VITE_API_BASE=http://localhost:3000` and restart Vite after editing `.env` |
| Migration errors mid-run | Drop the volume and restart Compose for a clean DB, then re-run migrations |
| SKU search returns empty | Confirm gateway → order-service; you are signed in; item exists (search is not admin-only) |
| PDF shows “Your Company” | Set `COMPANY_*` in `backend/pdf-service/.env` (local) or `deploy/.env` (prod) and restart pdf-service |

## Next reading

- [README.md](../README.md) — product overview and tech stack
- [backend/README.md](../backend/README.md) — gateway routing and service ports
- [backend/shared/schema/README.md](../backend/shared/schema/README.md) — table reference
- [deploy/README.md](../deploy/README.md) — production Docker and Caddy
