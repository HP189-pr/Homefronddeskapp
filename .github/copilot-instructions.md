# Copilot Instructions for AI Agents

## Project Overview
- **Monorepo** with `backend/` (Node.js/Express/PostgreSQL) and `frontend/` (React + Vite + Tailwind + MUI)
- Backend and frontend are decoupled, communicate via HTTP API (see `backend/server.mjs`)
- **Backend**: Handles authentication (JWT), user management, and data persistence (PostgreSQL via Sequelize)
- **Frontend**: SPA with React Router, modular components, and Tailwind for styling

## Key Workflows
### Backend
- **Start (dev)**: `npm run dev` (uses `nodemon`)
- **Start (prod)**: `npm start`
- **Lint**: `npm run lint` / `npm run lint:fix`
- **Format**: `npm run format`
- **Migrations**: `npm run migrate` (Sequelize CLI)
- **Seeding**: `npm run seed`
- **Testing**: `npm test` (Node.js built-in test runner)

### Frontend
- **Start (dev)**: `npm run dev` (Vite dev server)
- **Build**: `npm run build`
- **Preview**: `npm run preview`
- **Lint**: `npm run lint` / `npm run lint:fix`
- **Format**: `npm run format`
- **Test**: `npm run test` (Vitest)
- **Typecheck**: `npm run typecheck`

## Project Conventions
- **Frontend components**: Grouped by feature in `src/components/`, e.g., `Menu/`, `Auth/`, `Admin/`
- **React Router**: Centralized in `AppRouter.jsx`
- **Hooks**: Custom hooks in `src/hooks/`
- **Navigation**: Context in `src/navigation/`
- **Styling**: Tailwind config in `tailwind.config.js`, PostCSS in `postcss.config.js`
- **Backend**: All API logic in `server.mjs` and `app.mjs`, DB models/config in `db.mjs`
- **Environment**: Use `.env` files for secrets/config (see `dotenv` usage)
- **Lint/format**: Enforced via Husky + lint-staged on commit

## Patterns & Examples
- **Menu actions**: Menu items map to action arrays in `frontend/src/components/Menu/menuActions.jsx`. Example: `'📜 Transcript': () => ['➕', '✏️', '🔍']` means the Transcript menu shows add, edit, and search actions. Admin menus return string actions (e.g., 'User Management').
- **Topbar**: `frontend/src/components/Menu/Topbar.jsx` renders buttons for the current menu's actions, using the selected menu key to look up actions in `menuActions.jsx`.
- **Role-based UI**: Admin features are in `Admin/`, user features in `Auth/`. UI adapts based on user role and selected menu.
- **API calls**: Use `axios` in frontend for all HTTP requests. Backend endpoints are defined in `server.mjs`.
- **Component grouping**: All React components are grouped by feature (not type) under `src/components/`.

## Integration Points
- **Frontend ↔ Backend**: All data via REST API (see backend routes)
- **DB**: PostgreSQL, managed via Sequelize
- **Auth**: JWT, handled in backend, token stored in frontend (see `useAuth.jsx`)

## Tips for AI Agents
- Always match file/folder structure and naming conventions
- Prefer feature-based component grouping
- Use provided scripts for all workflows (build, lint, test, migrate)
- Reference existing components for UI/logic patterns before introducing new ones
- Keep backend and frontend logic decoupled except via API

---
For questions or unclear patterns, ask for clarification or examples from maintainers.