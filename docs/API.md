# Constra AI Application API

Constra AI uses **tRPC** for typed application calls. Procedures are available beneath the `/api/trpc` gateway and are intended to be consumed through the generated React client in `client/src/lib/trpc.ts`, rather than through handcrafted HTTP requests.

## Access model

| Procedure class | Allowed roles | Intended use |
|---|---|---|
| Public | Anyone | Session discovery and sign-out |
| Protected | Administrator, estimator, viewer | Read-only projects, plans, takeoffs, reports, and activity history |
| Estimator | Administrator, estimator | Project changes, plan uploads, AI analysis, quantity edits, bid creation, and export logging |
| Administrator | Administrator | Member role management and workspace feature configuration |

> All project-scoped procedures validate ownership before returning or changing data. Viewer accounts are intentionally read-only.

## Projects

| Procedure | Type | Required input | Result |
|---|---|---|---|
| `projects.create` | Mutation | `name`, optional `description` | New project ID |
| `projects.createSample` | Mutation | Optional active `libraryId` | New training project and completed package takeoff copied from the selected project-type library |
| `projects.list` | Query | None | Current user’s projects |
| `projects.recentSummaries` | Query | None | Recent projects with takeoff status and extracted-quantity summary |
| `projects.getById` | Query | `projectId` | Project details |
| `projects.update` | Mutation | `projectId`, optional `name`, `description`, `status` | Update confirmation and audit record |
| `projects.delete` | Mutation | `projectId` | Deletion confirmation and audit record |

Valid project statuses are `draft`, `in_progress`, `completed`, and `archived`.

## Plan files

| Procedure | Type | Required input | Result |
|---|---|---|---|
| `files.upload` | Mutation | Project ID, file metadata, validated data URL | Stored file metadata |
| `files.getUploadUrl` | Mutation | Project ID, file name, MIME type | Project-scoped storage key and upload URL |
| `files.recordUpload` | Mutation | Project ID and uploaded-file metadata | New file record |
| `files.list` | Query | `projectId` | Plan-file library |
| `files.delete` | Mutation | `projectId`, `fileId` | Removal confirmation and audit record |

The application accepts `application/pdf`, `image/png`, and `image/jpeg` plan files. Uploads are project-scoped, size-validated, and governed by the administrator’s **Plan uploads** capability setting.

## AI takeoffs and line items

| Procedure | Type | Required input | Result |
|---|---|---|---|
| `takeoffs.analyzeFiles` | Mutation | `projectId`, one or more `fileIds`, `takeoffName` | First-pass takeoff generated from selected plans |
| `takeoffs.list` / `takeoffs.getById` | Query | Project ID or takeoff ID | Takeoff summaries or detail |
| `takeoffs.update` / `takeoffs.delete` | Mutation | Takeoff ID and changes | Updated or deleted takeoff |
| `lineItems.list` | Query | `takeoffId` | Structured takeoff quantities |
| `lineItems.create` / `lineItems.update` / `lineItems.delete` | Mutation | Takeoff ID and item data | Managed line item and audit record |

AI analysis is enabled only when the **AI takeoffs** workspace capability is on. AI-extracted values retain review notes, and estimator edits are recorded so teams can distinguish reviewed quantities from the first pass. Completed first-pass takeoffs begin in `pending_review` and may be marked `approved` or `rejected` through the associated scoped completion alert.

## Trade-package libraries and notifications

| Procedure | Type | Required input | Result |
|---|---|---|---|
| `tradePackageLibraries.listActive` | Query | None | Active project-type libraries available to authenticated estimators. |
| `tradePackageLibraries.list` | Admin query | None | All libraries, including inactive libraries. |
| `tradePackageLibraries.create` | Admin mutation | Name, project type, training context, 1–20 packages, active state | New reusable library ID. |
| `tradePackageLibraries.update` | Admin mutation | Library ID and validated library content | Updated library confirmation. |
| `notifications.list` | Query | Optional `limit`, `projectId`, and `status` | Current user’s private completion-history records, newest first. |
| `notifications.markRead` | Mutation | Notification ID | Records a current-user read acknowledgement. |
| `notifications.resolveTakeoff` | Estimator mutation | Notification ID and `approved` or `rejected` decision | Updates the associated owned takeoff review state, resolves the alert, and writes an audit event. |

Notification filters are applied only after current-user scoping. A viewer cannot approve or reject; a caller cannot resolve another user’s alert or a takeoff outside their owned project.

## Bid reports, exports, and activity

| Procedure | Type | Required input | Result |
|---|---|---|---|
| `bidReports.generate` | Mutation | `projectId`, `takeoffId`, optional pricing context | Bid report snapshot |
| `bidReports.list` / `bidReports.getById` | Query | Project ID or report ID | Report summaries or detail |
| `audit.getProjectHistory` | Query | `projectId`, optional `eventType`, `limit`, `offset` | Filtered, paginated audit entries |
| `audit.logExport` | Mutation | Project ID and export context | Export audit entry |

CSV and printable exports are governed by the **Exports** workspace capability. All uploads, AI analysis runs, edits, bid creation, and exports appear in the project activity log with structured metadata where applicable.

## Administrator configuration

| Procedure | Type | Purpose |
|---|---|---|
| `configuration.list` / `configuration.updateFeature` | Query / mutation | Lists or updates workspace capability state |
| `configuration.users` / `configuration.updateUserRole` | Query / mutation | Lists workspace members or assigns Administrator, Estimator, or Viewer access |
| `onboarding.get` / `onboarding.update` | Query / admin mutation | Reads or updates persisted estimator walkthrough copy and visibility |
| `tradePackageLibraries.*` | Query / admin mutations | Manages active and inactive project-type training package libraries |

Feature gates are enforced at both the interface and server boundaries. A disabled capability is not merely hidden; related mutations are rejected by the application API.
