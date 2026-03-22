# Production and Internet Deployment Readiness

Short answer: **the app is production-ready from a security and code perspective** once you complete the checklist below. Deploying it **on the internet** adds infrastructure and operational requirements (HTTPS, hosting, database, backups).

---

## What’s already in place

- **Authentication**: JWT + bcrypt, httpOnly cookie, no token in `localStorage`
- **Authorization**: Role-based (admin/user), protected routes
- **Secrets**: Production mode requires `SECRET_KEY` and `ENCRYPTION_KEY` from env (no defaults)
- **Security headers**: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, HSTS in production
- **Error handling**: No exception details leaked to clients
- **API docs**: Disabled when `ENVIRONMENT=production`
- **Default admin**: `create_admin.py` blocked in production; first user via `/api/auth/register`
- **CORS**: Configurable; must be set to your real frontend origin(s) in production

---

## Before you deploy on the internet

### 1. HTTPS (required)

- The app must be served over **HTTPS** only.
- TLS is usually terminated by a reverse proxy (e.g. Nginx, Caddy) or your hosting (Railway, Render, Fly.io, AWS ALB, etc.). The backend can still listen on HTTP behind the proxy.
- Set `AUTH_COOKIE_SECURE=true` in production (or rely on the code that sets Secure when `ENVIRONMENT=production`).

### 2. Environment variables (required)

In production, set at least:

| Variable | Purpose |
|----------|---------|
| `ENVIRONMENT` | `production` |
| `SECRET_KEY` | Strong random value (e.g. `python -c "import secrets; print(secrets.token_urlsafe(32))"`) |
| `ENCRYPTION_KEY` | Fernet key: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
| `CORS_ORIGINS` | Exact frontend URL(s), e.g. `https://your-app.example.com` (no trailing slash) |
| `DATABASE_URL` | For production, prefer PostgreSQL (see below) |

Optional: `AUTH_COOKIE_SECURE=true`, `ACCESS_TOKEN_EXPIRE_MINUTES`, etc.

### 3. Database

- **SQLite** is fine for dev and very low traffic; for **internet deployment** with multiple users or concurrency, use **PostgreSQL** (or similar).
- Set `DATABASE_URL` to your Postgres connection string, e.g. `postgresql://user:password@host:5432/dbname`.
- Ensure the DB is backed up and access is restricted (no public exposure).

### 4. Frontend

- Build: `cd frontend && npm run build`.
- Set **`REACT_APP_API_URL`** to your production API URL (e.g. `https://api.yourdomain.com`) so the UI calls the right backend.
- Serve the `build/` output with a static host or your backend (same origin simplifies cookies; otherwise CORS + credentials is already supported).

### 5. Cookie and CORS when frontend and API are on different domains

- Frontend: `https://app.example.com`  
- API: `https://api.example.com`  

Already supported: the auth cookie is set by the API response; the browser sends it on requests to the API. Set `CORS_ORIGINS=https://app.example.com` (your real frontend origin). No extra cookie config needed for same-site/subdomain unless you use a different top-level domain.

### 6. First user in production

- Do **not** run `create_admin.py` in production (it will exit).
- Create the first admin with:  
  `POST /api/auth/register`  
  Body: `{ "email": "...", "password": "...", "full_name": "..." }`  
  Use a strong password.

### 7. Optional but recommended

- **Rate limiting**: Add rate limiting (e.g. on login) to reduce brute-force risk. Not included in the app today.
- **Dependency audits**: Run `./scripts/audit_dependencies.sh` and fix critical/high issues before go-live.
- **Logging**: Use structured logging; avoid logging secrets or full tokens.
- **Backups**: Automated DB backups and a simple recovery procedure.
- **Monitoring**: Health checks, error tracking (e.g. Sentry), and uptime monitoring.

---

## Quick production checklist

- [ ] `ENVIRONMENT=production`
- [ ] Strong `SECRET_KEY` and `ENCRYPTION_KEY` (from env)
- [ ] `CORS_ORIGINS` = your frontend URL(s) only
- [ ] HTTPS for frontend and API
- [ ] Production database (e.g. PostgreSQL) and `DATABASE_URL`
- [ ] First user created via `/api/auth/register` (strong password)
- [ ] Frontend built with `REACT_APP_API_URL` set to production API URL
- [ ] Dependency audit run and critical/high issues addressed
- [ ] Backups and basic runbook in place

---

## Verdict

- **Code and security**: Ready for production if you follow the checklist (secrets, CORS, HTTPS, first user).
- **Internet deployment**: Ready once infrastructure is in place (HTTPS, hosting, DB, env, and optional hardening like rate limiting and monitoring).

For a small team or internal tool, completing the checklist is usually enough. For a large or public-facing deployment, add rate limiting, monitoring, and a more formal backup and incident process.
