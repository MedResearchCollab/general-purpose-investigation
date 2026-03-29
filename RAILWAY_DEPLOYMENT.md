# Deploying to Railway

This guide explains how to deploy the Oncology Research Data Collection app (backend + frontend) to [Railway](https://railway.app).

## Why the build was failing

Railway's Railpack looks at the **root** of your repository. Your project is a **monorepo** with:

- `backend/` — Python FastAPI (has `requirements.txt`)
- `frontend/` — React (has `package.json`)

At the repo root there is no `package.json` or `requirements.txt`, so Railpack could not detect how to build the app.

**Solution:** Use **two separate Railway services**, each with its **root directory** set to `backend` or `frontend`.

---

## Step 1: Create two services from the same repo

1. Go to [Railway](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
2. Select your `general-purpose-investigation` repository.
3. Railway creates one service by default. You need **two**:
   - **Backend** (API)
   - **Frontend** (React app)

### Add the second service

1. In your project, click **+ New** → **GitHub Repo**.
2. Select the **same** repository again.
3. You now have two services from the same repo.

---

## Step 2: Configure the Backend service

1. Select the **first** service (or the one you want to use as the API).
2. Go to **Settings**.
3. Set **Root Directory** to `backend`.
4. Ensure **railway.json** in `backend/` is committed (it configures the start command).

### Environment variables (Backend)

Add these in **Variables**:

| Variable           | Value                                   | Required |
|--------------------|-----------------------------------------|----------|
| `ENVIRONMENT`      | `production`                            | Yes      |
| `SECRET_KEY`       | From `python scripts/generate_production_keys.py` | Yes      |
| `ENCRYPTION_KEY`   | From `python scripts/generate_production_keys.py`  | Yes      |
| `CORS_ORIGINS`     | Your frontend URL, e.g. `https://your-frontend.up.railway.app` | Yes      |
| `AUTH_COOKIE_SECURE` | `true`                                | Yes      |
| `DATABASE_URL`     | **Reference** from Railway PostgreSQL (see Database below) | **Yes** for durable data |
| `DATABASE_SSLMODE` | `require` — only if Postgres connections fail with SSL errors | No       |

### Generate production keys (on your machine)

```bash
cd /path/to/general-purpose-investigation
python scripts/generate_production_keys.py
```

Copy the output and add `SECRET_KEY` and `ENCRYPTION_KEY` to the backend's Variables.

### Database

- **SQLite (default):** No extra setup. On Railway the filesystem is often **ephemeral** — data can be **lost on redeploy**. Fine for quick tests only.
- **PostgreSQL (recommended for staging/production):**
  1. In the same Railway project, click **+ New** → **Database** → **PostgreSQL**.
  2. Open your **backend** service → **Variables**.
  3. Click **Add variable** → **Add reference** → select the Postgres plugin → choose **`DATABASE_URL`**. Railway wires the URL automatically.
  4. Redeploy the backend. Tables are created on startup (`create_all`); the bootstrap admin user is created only when the `users` table is empty.
  5. If you see SSL connection errors, add **`DATABASE_SSLMODE`** = `require` on the backend.

The repo includes **`psycopg2-binary`** in `backend/requirements.txt`, so the Nixpacks build installs the Postgres driver without extra build commands.

For **local** Postgres, use the repo root **`docker-compose.yml`** (`docker compose up -d postgres`) and set `DATABASE_URL=postgresql://medstudy:medstudy@localhost:5432/medstudy` in `backend/.env` (see `backend/.env.example`).

### Generate a public URL (Backend)

1. Go to **Settings** → **Networking**.
2. Click **Generate Domain**.
3. Copy the URL (e.g. `https://your-backend.up.railway.app`). You will use it for `CORS_ORIGINS` and for the frontend's `REACT_APP_API_URL`.

---

## Step 3: Configure the Frontend service

1. Select the **second** service (the one for the React app).
2. Go to **Settings**.
3. Set **Root Directory** to `frontend`.

### Environment variables (Frontend)

Add this **before the first build** (it is used at build time):

| Variable             | Value                              | Required |
|----------------------|------------------------------------|----------|
| `REACT_APP_API_URL` | Your backend URL, e.g. `https://your-backend.up.railway.app` | Yes      |

Use the backend domain you generated in Step 2. **No trailing slash.**

### Generate a public URL (Frontend)

1. Go to **Settings** → **Networking**.
2. Click **Generate Domain**.
3. Copy the URL (e.g. `https://your-frontend.up.railway.app`).

### Watch paths (optional)

To avoid rebuilding the frontend when only backend code changes (and vice versa):

- **Backend:** Watch path `backend/**`
- **Frontend:** Watch path `frontend/**`

Set these under **Settings** → **Watch Paths** for each service.

---

## Step 4: Deploy order and CORS

1. Deploy the **backend** first and generate its domain.
2. Set `CORS_ORIGINS` on the backend to your frontend domain.
3. Set `REACT_APP_API_URL` on the frontend to your backend domain.
4. Deploy the frontend (or redeploy if it was deployed before).

---

## Step 5: Create the first admin user

After the backend is running in production:

```bash
curl -X POST "https://your-backend.up.railway.app/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"YourStrongPassword8","full_name":"Admin User"}'
```

Or use `python scripts/register_first_user.py` with `API_URL` set to your backend URL.

---

## Summary

| Service    | Root Directory | Key env vars |
|------------|----------------|--------------|
| Backend    | `backend`      | `ENVIRONMENT`, `SECRET_KEY`, `ENCRYPTION_KEY`, `CORS_ORIGINS`, `AUTH_COOKIE_SECURE`, plus **`DATABASE_URL`** (from Postgres reference) |
| Frontend   | `frontend`     | `REACT_APP_API_URL` |
| PostgreSQL | (plugin)       | (none — attach `DATABASE_URL` to backend via **Reference**) |

Ensure `backend/railway.json` and `frontend/railway.json` are committed and pushed. Then set each service's root directory in Railway and add the environment variables above.
