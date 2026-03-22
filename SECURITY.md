# Security Assessment and Recommendations

This document summarizes a security review of the Oncology Research Data Collection application (FastAPI backend + React frontend) and the changes applied to improve security.

---

## Summary

| Area | Status | Notes |
|------|--------|--------|
| Authentication | ✅ Good | JWT + bcrypt; role-based access (admin/user) |
| Authorization | ✅ Good | Admin-only routes protected; users can only see own data where intended |
| Secrets / Config | ⚠️ Hardened | Default secrets removed for production; `.env.example` added |
| Error handling | ✅ Fixed | No longer leaking exception details to clients |
| Passwords | ✅ Improved | Min length validation; `datetime.utcnow` replaced with timezone-aware UTC |
| Frontend | ✅ Fixed | API base URL from env; auth via httpOnly cookie |
| Headers / Docs | ✅ Improved | Security headers; HSTS in prod; docs disabled in prod |
| Token storage | ✅ Fixed | httpOnly cookie (no token in localStorage) |
| Default admin | ✅ Guarded | Script refuses to run when `ENVIRONMENT=production` |
| Dependencies | ⚠️ Manual | Run `./scripts/audit_dependencies.sh` or pip/npm audit |

---

## 1. Authentication and Authorization

- **JWT**: Access tokens with configurable expiry; signed with `SECRET_KEY`. Ensure `SECRET_KEY` is strong and unique in production (e.g. 32+ random bytes, never committed).
- **Passwords**: Hashed with bcrypt. Password strength validation added (min length); consider adding complexity rules if required by policy.
- **Roles**: `get_current_user` and `get_current_admin_user` enforce access; admin-only endpoints (users, hospitals, export, form create/update/delete) are correctly protected.
- **Registration**: `/api/auth/register` only allows creating the first user (no users in DB). After that, only admins can create users.

**Recommendation**: In production, do not rely on the default admin created by `create_admin.py`. Create the first user via `/api/auth/register` or change the default password immediately and restrict who can run `create_admin.py`.

---

## 2. Secrets and Configuration

- **Before**: Default `SECRET_KEY` and `ENCRYPTION_KEY` in code; dangerous if deployed as-is.
- **After**:
  - Production mode (e.g. `ENVIRONMENT=production`) should require `SECRET_KEY` and `ENCRYPTION_KEY` from environment (no defaults).
  - `.env.example` added with placeholders and instructions; real `.env` remains gitignored.

**Recommendation**: Use a secrets manager or secure env injection in production; never commit `.env` or real keys.

---

## 3. Error Handling and Logging

- **Before**: Global exception handler returned `str(exc)` to the client; auth module used `print()` for JWT errors.
- **After**:
  - Clients receive a generic “Internal server error” message; details are logged server-side only.
  - JWT decode failures no longer print to stdout (avoid leaking token/error details).

**Recommendation**: Use structured logging (e.g. `logging` with levels) and avoid logging full tokens or passwords.

---

## 4. Passwords and JWT Expiry

- **Passwords**: Pydantic validation added for minimum length (e.g. 8 characters) on registration and user create/update where password is set.
- **JWT**: Replaced deprecated `datetime.utcnow()` with `datetime.now(timezone.utc)` for token expiry to avoid future deprecation and timezone issues.

---

## 5. Frontend

- **Before**: `/api/auth/me` called with hardcoded `http://localhost:8000`; login response and user data logged with `console.log`.
- **After**:
  - Auth context uses `process.env.REACT_APP_API_URL` (same as `api.ts`) for the auth/me request.
  - Sensitive `console.log` calls removed from login flow.

**Implemented**: Auth uses an **httpOnly** cookie (`access_token`) set on login; the frontend sends `withCredentials: true` and does not store the token in `localStorage`, reducing XSS impact. Bearer token in `Authorization` header is still accepted for API clients. Logout clears the cookie via `POST /api/auth/logout`.

---

## 6. HTTP Security Headers and API Docs

- **Headers**: Middleware sets:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains` when `ENVIRONMENT=production` (use only when served over HTTPS).
- **Docs**: When `ENVIRONMENT=production`, Swagger UI and ReDoc are disabled (`docs_url=None`, `redoc_url=None`).

---

## 7. Data and Cryptography

- **Encryption**: Sensitive data encrypted with Fernet (symmetric). Key must be 32 bytes, base64-encoded; stored in `ENCRYPTION_KEY`. Key derivation from a non-base64 default was fixed so production uses a proper key from env.
- **Database**: SQLAlchemy ORM used for queries; no raw SQL with user input, reducing SQL injection risk. Migrations use parameterized or fixed DDL.
- **Decryption fallback**: Legacy unencrypted JSON is still supported for backward compatibility; consider re-encrypting old data and removing this path when possible.

---

## 8. CORS

- CORS is configured from `CORS_ORIGINS` (e.g. `http://localhost:3000`); localhost/127.0.0.1 are kept in sync. In production, set `CORS_ORIGINS` to the exact frontend origin(s); avoid `*` with credentials.

---

## 9. Dependency and Operational Security

- **Audit script**: Run `./scripts/audit_dependencies.sh` to check backend (pip-audit) and frontend (npm audit). Install pip-audit with `pip install pip-audit` if needed.
- **Backend**: `pip-audit -r requirements.txt`; address reported vulnerabilities.
- **Frontend**: `npm audit`; fix or accept risks for dependencies.
- **Database**: SQLite is fine for development; for production consider PostgreSQL with restricted access, backups, and encryption at rest if required.
- **Default admin**: `create_admin.py` **refuses to run** when `ENVIRONMENT=production`. In production, create the first user via `POST /api/auth/register`. Dev credentials are documented as development-only.

---

## 10. Checklist Before Production

- [ ] Set `ENVIRONMENT=production` (or equivalent).
- [ ] Set strong, unique `SECRET_KEY` and `ENCRYPTION_KEY` in env (no defaults).
- [ ] Restrict `CORS_ORIGINS` to the real frontend origin(s).
- [ ] Disable or protect API docs if enabled.
- [ ] Do not use default admin credentials; use strong passwords and MFA if available.
- [ ] Enable HTTPS only (HSTS header is set automatically in production).
- [ ] Run `./scripts/audit_dependencies.sh` (or pip-audit / npm audit) and fix critical/high issues.
- [ ] Configure logging and monitoring; no secrets in logs.
- [ ] Regular backups and access controls for DB and secrets.

---

*Last updated: March 2025*
