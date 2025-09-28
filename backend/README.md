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
