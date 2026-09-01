# Constra AI Quality Review

**Review date:** 2026-08-27
**Build scope:** Role-aware estimating workflow, administrator capability configuration, configurable estimator onboarding, project-type trade libraries, dashboard activity, private AI-completion notification history and review decisions, plan uploads, takeoff review, and exports.

## Validation results

| Area | Evidence | Result |
|---|---|---|
| Build quality | `pnpm check` | Passed with no TypeScript errors |
| Regression coverage | `pnpm test` | Passed: 6 files, 21 tests, including selected-library sample provenance, administrator-only library configuration, current-user notification filtering, and authorized alert approval/rejection. |
| Role workflow coverage | `server/roles.access.test.ts`, `server/takeoff.workflow.test.ts` | Passed: viewer creation/export/alert-decision denials, viewer-safe reads, estimator project and selected trade-library starter creation, scoped activity retrieval, notification persistence/filtering, completed-analysis approval/rejection audit state, and administrator configuration were exercised with isolated procedure callers. |
| Cross-browser public and authenticated routes | `pnpm test:browser` | Passed: 22 checks. Chromium and Firefox each rendered the public landing page and pricing section at 1440 × 960 and 390 × 844 without horizontal overflow; both engines also completed signed-session checks for `/dashboard`, `/project/1`, `/profile`, and `/admin/settings`. |
| Complete temporary-account role workflows | `tests/temporary-roles.e2e.spec.ts` | Passed in Chromium and Firefox: the administrator reversibly toggled a capability, saved/restored walkthrough copy, and saved/restored a trade-library description; a self-provisioned estimator selected the commercial tenant-improvement library, created its eight-package training project, uploaded a self-contained PNG fixture, reached AI-analysis selection, reviewed a labeled test takeoff, approved a seeded private completion alert in the inbox, filtered notification history by project and approved state, verified the persisted takeoff approval, exported CSV, and saw the resulting feed event; a viewer reviewed that project and takeoff with edit/export controls disabled and Administration access redirected. Each run removes temporary notification, user, project, takeoff, file, line-item, bid, and audit records. |
| Source hygiene | `git diff --check` | Passed with no whitespace errors |
| Production bundle | `pnpm build` | Passed; Vite reports a non-blocking recommendation to split the largest client bundle (approximately 1.02 MB pre-gzip / 256 KB gzip for the principal JavaScript asset). |
| Isolated integration coverage | `server/takeoff.workflow.test.ts` | Passed: mocked signed-file input, AI extraction persistence, lifecycle audits, and project-scoped deletion with retained prior metadata. A real uploaded-plan walkthrough remains intentionally separate. |
| Live plan workflow | Authorized temporary project `60001` with a public sample floor plan | Passed: project creation, JPEG upload, 257.5 KB file metadata, served preview target, persisted 12-item AI takeoff, and all expected activity events were observed before cleanup. |
| Live deletion workflow | Protected `files.delete` procedure on temporary project `60001` | Passed: the file list returned zero records after deletion and the retained audit event included the original filename, MIME type, and 263,715-byte size. |
| Administrator UI | Authenticated `/admin/settings` visual review and reversible browser save | Capability switches, role guidance, walkthrough label/description/step editors, editable project-type trade libraries and packages, membership controls, and restricted navigation are visible and coherent. Inputs remain unavailable until persisted walkthrough content has loaded, preventing overwrite races. |
| Estimating dashboard | Authenticated `/dashboard` desktop and mobile visual review | Project creation, project-type training starter, project-scoped upload control, takeoff-status insights, search, activity, notification history filters, and notification entry point render correctly |
| Help experience | Authenticated `/help` mobile visual review | Workflow steps, role definitions, and workspace-control guidance are readable |
| Navigation | Fresh dashboard render after route cleanup | No new duplicate-key warning recorded after the recent render |

## Role validation matrix

| Role | Live UI validation | Automated authorization validation | Expected product behavior |
|---|---|---|---|
| Administrator | Chromium and Firefox rendered Administration from a signed session and reversibly toggled the Bid reports capability | Administrator-only configuration procedure is protected by server middleware | Manages members and toggles plan uploads, AI takeoffs, bid reports, and exports; can perform estimating work |
| Estimator | Chromium and Firefox completed the onboarding entry point, created a sample training project, uploaded a self-contained PNG, entered AI-analysis selection, reviewed a labeled test takeoff, exported CSV, and saw the export activity event | An isolated estimator caller successfully creates a normal or sample audit-linked project; non-administrators are denied configuration changes | Creates projects, uploads plans, triggers analysis, reviews quantities, creates bids, and exports when enabled |
| Viewer | Chromium and Firefox reviewed the temporary estimator's project and takeoff while upload, edit, export, and Administration controls remained unavailable | Tests verify viewers cannot create projects or record export events; workspace-read procedures have focused regression coverage | Reviews workspace projects, quantities, and reports without changing estimating records |

> The current workspace retains its live administrator account. Browser role validation uses self-provisioned estimator and viewer accounts and removes them, along with any associated projects, when each test completes.

## Audit and data integrity review

Project, file, takeoff, line-item, bid, and export events record activity entries. Update and removal events include structured `oldValues` and `newValues` metadata where applicable, supporting estimator review and project history traceability.

## Final critical-flow code review

| Area | Files reviewed | Outcome |
|---|---|---|
| Routing and shared navigation | `client/src/App.tsx`, `client/src/components/DashboardLayout.tsx` | Public, authenticated, administrator, project, takeoff, bid, and help routes are represented. A duplicate `/dashboard` navigation item that produced a React key warning was removed; a fresh dashboard render did not add a new warning. |
| Dashboard and project workflow | `client/src/pages/Dashboard.tsx`, `client/src/components/NotificationHistory.tsx`, `client/src/pages/ProjectDetail.tsx` | Project creation, selected project-type training library, search, status filtering, project-scoped upload entry, recent takeoff summary, activity pagination, and current-user notification history filters align with typed procedures. |
| Plan uploads | `client/src/components/PlanUploadDropzone.tsx` | PDF/PNG/JPG type validation, a 10 MB per-file guard, a required project scope, completion feedback, and accessible file-input labeling are present. |
| Takeoff review and exports | `client/src/pages/TakeoffDetail.tsx`, `client/src/lib/takeoffExport.ts` | Viewer users are blocked from client-side editing; exports and bid generation reflect workspace feature availability and record export activity. Review status visibly records direct completion-alert approval or rejection. Server authorization tests protect the boundary independently of UI state. |
| Administration and access | `client/src/pages/AdminSettings.tsx`, `server/_core/trpc.ts`, `server/routers.ts` | Administration is role-gated; capability switches, persisted walkthrough copy, and project-type trade libraries use typed procedures; user role changes have feedback; viewers have workspace-wide read access; and estimator-only mutations prevent viewers from changing estimating data. |
| Completion notifications | `server/db.ts`, `server/routers.ts`, `client/src/components/WorkspaceNotificationMenu.tsx` | A completed AI takeoff creates a persistent in-app alert only for the initiating estimator, with user-scoped listing, project/status filtering, read acknowledgement, and direct authorized review. An estimator may approve or reject only an alert and takeoff they own; both records update and an audit event is written. The operational owner alert dispatch is non-blocking, so a delivery fault does not invalidate a completed takeoff. |
| Server resilience | `server/db.ts`, `server/routers.ts` | Database and AI parsing errors are logged at the server boundary and return mutation errors rather than being handled as client-side silent failures. The inbox query invalidates after a successful takeoff mutation, so the new completion alert is retrieved without a manual reload. |

## Final interface verification

| Route | Verification evidence | Result |
|---|---|---|
| `/project/1` | Authenticated visual review after the project-query stabilization correction | The file-library tab resolved to its empty state with project-scoped upload actions rather than remaining on a loading indicator. |
| `/profile` | Authenticated visual review | The profile page displays the signed-in account identity, provider, workspace role, and permissions summary. The shared account menu provides the associated profile and sign-out actions. |
| `/admin` and `/admin/settings` | Authenticated visual review after adding a route alias | Both paths render the role-gated Administration workspace with capability switches and role guidance; the intuitive direct path no longer reaches the fallback page. |
| Temporary file library | Authenticated visual review at `/project/60001` before deletion | The file-library tab showed the uploaded public floor plan with its filename, image/JPEG type, size, date, Preview action, Analyze action, and deletion control. The Preview target served the uploaded 2000 × 2000 image successfully. |
| AI analysis workflow | Authorized live analysis at `/project/60001/takeoff/1` | The uploaded public sample produced a completed, persisted 12-item takeoff with AI provenance badges. The activity record contained project-created, file-uploaded, AI-started, AI-completed, and file-deleted events. |
| `/admin/settings` walkthrough and trade-library editors | Authenticated visual review plus Chromium/Firefox reversible save and reload | Administrators can tailor walkthrough content and can configure active project-type library names, descriptions, package scope, units, and guidance. A temporary description value persisted across reload and was restored. |
| Sample starter, notification history, and alert decisions | Chromium/Firefox self-cleaning estimator workflow | The estimator selects a clearly labeled commercial tenant-improvement library, opens its eight-package completed training project, approves a seeded per-user completion alert directly in the inbox, filters history by associated project and approved state, and sees the approval on the takeoff. The alert is not exposed to the viewer. |

**Review conclusion:** The review retains the resolved administrator-route, creation-audit, dialog-accessibility, and viewer-read-access corrections. It adds administrator-managed project-type trade-package libraries; selected library copies into clearly labeled training projects; private persistent takeoff-completion alerts with filterable history; direct, audited approval/rejection; and a non-blocking owner signal. The repeatable browser suite serializes data-backed checks, uses a self-contained plan fixture and seeded test alert to avoid live-AI capacity dependency, and exercises administrator, estimator, and viewer workflows in Chromium and Firefox with temporary data removed after each run.

## Follow-up recommendation

The application is ready for a new checkpoint. Future quality work can focus on code-splitting the principal client bundle and tailoring library package assumptions to the organization’s own scopes, labor standards, and vendor strategy.
