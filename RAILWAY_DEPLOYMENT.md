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

### Generate production keys (on your machine)

```bash
cd /path/to/general-purpose-investigation
python scripts/generate_production_keys.py
```

Copy the output and add `SECRET_KEY` and `ENCRYPTION_KEY` to the backend's Variables.

### Database

- **SQLite (default):** Works for small deployments. Data may be lost on redeploy on Railway (ephemeral disk).
- **PostgreSQL (recommended):** Add a PostgreSQL service in Railway, copy its `DATABASE_URL`, and add it to the backend Variables. Install the driver: add `psycopg2-binary` to `requirements.txt` or use `requirements-prod.txt` if you have one.

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

| Service  | Root Directory | Key env vars                                              |
|----------|----------------|-----------------------------------------------------------|
| Backend  | `backend`      | `ENVIRONMENT`, `SECRET_KEY`, `ENCRYPTION_KEY`, `CORS_ORIGINS`, `AUTH_COOKIE_SECURE` |
| Frontend | `frontend`     | `REACT_APP_API_URL`                                       |

Ensure `backend/railway.json` and `frontend/railway.json` are committed and pushed. Then set each service's root directory in Railway and add the environment variables above.
