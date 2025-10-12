Backend quick notes
===================

This file documents small, safe ops for admin password and seeding.

- ADMIN_PW: set `ADMIN_PW` in `backend/.env` to the desired admin password. Example:

  ADMIN_PW=Admin123

- Seed admin: create/update admin user using the seed script (reads `ADMIN_PW`):

  node backend/scripts/seed-admin.mjs

- Update admin password only: use the helper script which updates the existing admin user (more targeted):

  node backend/scripts/set-admin-password.mjs

  or pass a password directly (does NOT require `.env`):

  node backend/scripts/set-admin-password.mjs MyNewS3cret!

- Security: Do NOT commit `backend/.env`. This repo's `.gitignore` includes `/backend/.env` but double-check before committing.

Development
-----------

Dev auto-login (optional) to avoid frequent re-login during frontend development:

- Backend endpoint: `POST /api/auth/dev-login` is available when `NODE_ENV !== 'production'`. You can additionally require `ALLOW_DEV_LOGIN=1` in `backend/.env` to enable it.
- Frontend: If `VITE_DEV_AUTO_LOGIN=1` is set (e.g. in `frontend/.env.development.local`), the app will auto-call the endpoint and navigate to the dashboard if no token is present.

Env flags:

- `ALLOW_DEV_LOGIN=1` (backend) to permit dev login
- `DEV_TOKEN_EXPIRES_IN=7d` (backend) to control token expiry duration
- `VITE_DEV_AUTO_LOGIN=1` (frontend) to enable auto-login on load

Important: Never enable these in production.
