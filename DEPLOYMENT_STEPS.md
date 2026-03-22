# Step-by-step production deployment

Follow these steps to deploy the app on the internet.

---

## Step 1: Generate production secrets

On your machine (or a secure place), from the **project root**:

```bash
cd /path/to/general-purpose-investigation
python scripts/generate_production_keys.py
```

Copy the two lines it prints (`SECRET_KEY=...` and `ENCRYPTION_KEY=...`). You will add them to the backend `.env` on the server.

---

## Step 2: Backend environment variables

On the server (or in your hosting dashboard), create a `.env` file in the **backend** folder with at least:

```env
ENVIRONMENT=production
SECRET_KEY=<paste from step 1>
ENCRYPTION_KEY=<paste from step 1>
CORS_ORIGINS=https://your-frontend-url.com
AUTH_COOKIE_SECURE=true
```

- **CORS_ORIGINS**: Your real frontend URL(s), comma-separated, no trailing slash. Example: `https://app.example.com` or `https://app.example.com,https://www.example.com`.
- If you use **PostgreSQL**, add:
  ```env
  DATABASE_URL=postgresql://user:password@host:5432/dbname
  ```
  And install the driver: `pip install -r requirements.txt -r requirements-prod.txt`

If you keep **SQLite** for a small deployment, ensure the `database/` directory exists and is writable.

---

## Step 3: Create the first admin user (production)

After the backend is running in production (with HTTPS), create the first user. You can use the script or curl.

**Option A – Script (run from your computer, replace URL with your API):**

```bash
export API_URL=https://api.yourdomain.com
python scripts/register_first_user.py
```

Then enter email, password (min 8 chars), and full name when prompted.

**Option B – curl:**

```bash
curl -X POST https://api.yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourdomain.com","password":"YourStrongPassword8","full_name":"Admin"}'
```

This only works when **no users exist** in the database. After that, new users are created by an admin in the UI.

---

## Step 4: Build and deploy the frontend

On your machine or CI:

```bash
cd frontend
# Set the production API URL (use your real API URL)
export REACT_APP_API_URL=https://api.yourdomain.com
npm ci
npm run build
```

Upload the contents of the **`build/`** folder to your static hosting (Vercel, Netlify, S3, Nginx, etc.). The app will call `REACT_APP_API_URL` for all API requests.

If your host uses a single env at build time, set `REACT_APP_API_URL` in the dashboard instead of exporting it.

---

## Step 5: HTTPS and running the backend

- The backend **must** be served over **HTTPS** in production (TLS is usually handled by a reverse proxy or your host).
- Run the backend, for example:
  ```bash
  cd backend
  uvicorn app.main:app --host 0.0.0.0 --port 8000
  ```
  If you use a reverse proxy (Nginx, Caddy), it can listen on 443 and proxy to `http://127.0.0.1:8000`.

---

## Step 6: Quick checklist

- [ ] Step 1: Generated and saved `SECRET_KEY` and `ENCRYPTION_KEY`
- [ ] Step 2: Backend `.env` has `ENVIRONMENT=production`, both keys, `CORS_ORIGINS`, and optional `DATABASE_URL` (PostgreSQL)
- [ ] Step 3: First admin created via script or curl (strong password)
- [ ] Step 4: Frontend built with `REACT_APP_API_URL` set and `build/` deployed
- [ ] Step 5: Backend running behind HTTPS

---

## Optional: PostgreSQL

1. Create a PostgreSQL database (e.g. on Railway, Render, AWS RDS).
2. Get the connection URL (e.g. `postgresql://user:pass@host:5432/dbname`).
3. In backend: `pip install -r requirements.txt -r requirements-prod.txt`
4. Set in `.env`: `DATABASE_URL=postgresql://...`
5. Tables are created on first run (`Base.metadata.create_all` in `app.main`). For schema changes, use or adapt the existing migration scripts.

---

## Optional: Rate limiting

To reduce brute-force risk on login, you can add rate limiting (e.g. with `slowapi`) on the `/api/auth/login` endpoint. See the project’s security docs for details.
