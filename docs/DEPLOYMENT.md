# Constra AI Deployment Handoff

This repository is a React/Vite frontend with an Express/tRPC server and a MySQL-compatible database. The managed project is hosted at **https://constraai-eaj9i6fv.manus.space**. Deploy source only; do not include `node_modules`, generated `dist` assets, local browser-test output, or environment files.

## Release contents

| Path | Deployment purpose |
|---|---|
| `client/` | React application, dashboard, role-aware interfaces, and shared UI components. |
| `server/` | Express/tRPC server, authorization, AI workflow, storage integration, and database helpers. |
| `drizzle/schema.ts` | Current database schema. |
| `drizzle/0001_*.sql` through `drizzle/0004_*.sql` | Ordered, applied schema migrations. |
| `shared/` | Client-safe onboarding and trade-library defaults/types. |
| `docs/API.md` | Typed procedure reference. |
| `docs/QA.md` | Validation evidence and access-control review. |
| `package.json`, `pnpm-lock.yaml`, `vite.config.ts`, `tsconfig.json` | Reproducible build and runtime configuration. |

## Required runtime configuration

Set platform-managed secrets through the hosting environment; never commit a `.env` file or secret value. The application expects the following variable names.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MySQL/TiDB-compatible database connection string. |
| `JWT_SECRET` | Signed-session protection. |
| `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL`, `VITE_APP_ID` | Manus OAuth integration. |
| `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` | Server-side AI, storage, and notification services. |
| `VITE_FRONTEND_FORGE_API_URL`, `VITE_FRONTEND_FORGE_API_KEY` | Frontend service integration. |
| `OWNER_OPEN_ID`, `OWNER_NAME` | Owner-facing operational completion alerts. |

## Database release order

Apply migrations in ascending numeric order before releasing the server. Migration `0004_stiff_the_leader.sql` adds project-type trade libraries, a source-library link on projects, notification review state, and takeoff approval/rejection fields. It is additive and does not remove historical project, takeoff, or notification data.

## Build and run

Use Node.js 22 and pnpm. From the repository root, run the following commands after dependencies and hosting secrets are available.

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
NODE_ENV=production pnpm start
```

The server reads the platform-provided port at runtime; do not hard-code a port. The production readiness check should include an authenticated dashboard request, an administrator library-settings request, and a scoped notification-history request.

## Operational safeguards

> Completion alerts are application records scoped to the initiating estimator. Owner alerts are non-blocking operational signals. A failed owner delivery must not undo an already-persisted takeoff.

Administrators may edit trade-library package content and active status. Estimators can only copy active libraries into new **training** projects; library changes never alter previously created training takeoffs. Approval or rejection from a completion alert is a recorded review decision, not a destructive takeoff deletion.

## Archive verification

The release archive must contain the source paths and documentation above, exclude `node_modules`, `.env*`, `dist`, `.manus-logs`, `test-results`, and temporary files, and pass `unzip -t` before transfer. The archive is intended for source handoff and deployment, while the managed checkpoint remains the recoverable hosted release.
