# Constra AI - Construction Estimating SaaS

## Project TODO

### Phase 1: Backend Infrastructure
- [x] Database schema designed and created (users, projects, projectFiles, takeoffs, takeoffLineItems, bidReports, auditLog)
- [x] Database query helpers in server/db.ts (projects, files, takeoffs, lineItems, bidReports, auditLog)
- [x] tRPC procedures for project management (create, list, update, delete, getById)
- [x] tRPC procedures for file upload and management (upload, list, delete)
- [x] AI plan analysis procedure (send to LLM, extract quantities, create takeoff)
- [x] Takeoff line item procedures (list, update, delete)
- [x] Bid report generation procedure (aggregate takeoff items, calculate totals)
- [x] Audit log procedures (log events, retrieve history)
- [x] File storage integration (S3 upload/download helpers)
- [x] Focused Vitest regression coverage for authentication, role access, and protected estimating actions

### Phase 2: Frontend - Public & Auth
- [x] Landing page with product overview and CTA
- [x] Features section highlighting AI extraction, takeoff editing, bid generation
- [x] Sign-up/login integration (Manus OAuth)
- [x] Auth guard for protected routes
- [x] Redirect unauthenticated users to landing page

### Phase 3: Frontend - Dashboard & Project Management
- [x] Dashboard layout with sidebar navigation
- [x] Projects list page with create/edit/delete actions
- [x] Project detail page with tabs (Overview, Files, Takeoffs, Bids, Activity)
- [x] Project status tracking (draft, in_progress, completed, archived)
- [x] Create project form
- [x] Edit project form
- [x] Delete project with confirmation

### Phase 4: Frontend - File Upload & Management
- [x] File upload component (drag-and-drop, file picker)
- [x] Supported formats: PDF, PNG, JPG
- [x] File library view per project
- [x] File preview (thumbnail or icon)
- [x] Delete file with confirmation
- [x] File size validation and error handling
- [x] Upload progress indicator

### Phase 5: Frontend - AI Analysis & Takeoff
- [x] Trigger AI analysis from uploaded files
- [x] Loading state during LLM processing
- [x] Display AI analysis results (extracted quantities, materials)
- [x] Takeoff results table with columns: Material, Description, Quantity, Unit, Notes
- [x] Inline editing for takeoff line items
- [x] Add/delete line items manually
- [x] Save changes to database
- [x] Track which items were edited by user

### Phase 6: Frontend - Bid Report & Export
- [x] Bid summary generator from takeoff
- [x] Bid report view with line items and totals
- [x] Unit price input for line items
- [x] Total cost calculation
- [x] Export to CSV functionality
- [x] Export to printable format
- [x] Download bid report

### Phase 7: Frontend - Activity & Audit Trail
- [x] Activity/audit log view per project
- [x] Display events: file uploads, AI analysis runs, manual edits, bid creation, exports
- [x] Event timestamp and user information
- [x] Event details (what changed, old vs new values for edits)
- [x] Filter by event type
- [x] Pagination for long audit logs

### Phase 8: UI Polish & Styling
- [x] Elegant, refined color palette and typography
- [x] Consistent spacing and component design
- [x] Professional shadows and borders
- [x] Responsive design (mobile, tablet, desktop)
- [x] Loading skeletons for data-heavy views
- [x] Empty states for lists
- [x] Error messages and toast notifications
- [x] Hover states and micro-interactions
- [x] Accessibility (ARIA labels, keyboard navigation, focus rings)

### Phase 9: Testing & QA
- [x] Vitest regression tests for authentication, role access, exports, and landing redirects
- [x] Manual QA of administrator screens plus isolated estimator/viewer authorization and workflow coverage
- [x] Cross-browser testing of authenticated product surfaces in Chromium and Firefox

### Phase 10: Deployment & Documentation
- [x] Create checkpoint
- [x] Final code review
- [x] Deploy to production
- [x] User documentation/help section
- [x] API documentation

### Bug Fixes
- [x] Fix the dashboard authentication redirect so navigation never runs during the Home render phase

### Construction Estimating Enhancements
- [x] Package the proven construction estimating implementation workflow as a reusable skill
- [x] Add an accessible drag-and-drop dashboard upload component for PDF, PNG, and JPG construction plans
- [x] Build a recent-projects dashboard table with takeoff status, extracted quantity summary, and last modified date
- [x] Create a detailed project takeoff review view with quantity editing and CSV/print export actions

### Role-Based Access and Administration
- [x] Define polished role-aware navigation and user journeys for administrators and estimators
- [x] Add estimator and administrator roles to the account model with server-side permission checks
- [x] Create an administrator settings page with feature-toggle controls
- [x] Apply administrator-controlled feature flags to protected product actions and navigation
- [x] Add regression tests for role access and feature-toggle authorization

### Verification Follow-up
- [x] Log structured before-and-after metadata for project and file edit-style audit events
- [x] Exercise and document complete administrator, estimator, and viewer workflows end to end
- [x] Show and verify user-facing profile and logout controls
- [x] Add a dedicated authenticated user profile surface with role and account information

## Feature Checklist by Component

### Landing Page
- [x] Hero section with product overview
- [x] Key features section (AI extraction, quick review, bid generation)
- [x] Call-to-action button for sign-up
- [x] Testimonials or use case section
- [x] Pricing or freemium information
- [x] Footer with product attribution

### Authentication
- [x] Manus OAuth integration
- [x] Login/logout flow
- [x] Protected routes (redirect to landing if not authenticated)
- [x] User profile access

### Project Management
- [x] Create project
- [x] List projects with status badges
- [x] View project details
- [x] Edit project name/description
- [x] Change project status
- [x] Delete project
- [x] Project search/filter

### File Management
- [x] Upload files (PDF, PNG, JPG)
- [x] Store in S3 with project scoping
- [x] List files per project
- [x] View file metadata (name, size, upload date)
- [x] Delete file
- [x] File preview/thumbnail

### AI Analysis & Takeoff
- [x] Select files for analysis
- [x] Call LLM to extract quantities
- [x] Display extraction results
- [x] Create takeoff from results
- [x] Store takeoff in database

### Takeoff Editor
- [x] Display takeoff line items in table
- [x] Inline editing (material, quantity, unit, notes)
- [x] Add new line items
- [x] Delete line items
- [x] Track edited items
- [x] Save changes

### Bid Report
- [x] Generate bid from takeoff
- [x] Input unit prices
- [x] Calculate totals
- [x] Display formatted report
- [x] Export to CSV
- [x] Export to PDF via the browser print dialog

### Audit Trail
- [x] Log file uploads
- [x] Log AI analysis runs
- [x] Log manual edits
- [x] Log bid creation
- [x] Log exports
- [x] Display audit log with filters
- [x] Show event details

### Verification Follow-up
- [x] Show and verify user-facing profile and logout controls
- [x] Stabilize and verify the per-project file library with metadata, preview, and confirmed deletion
- [x] Verify the AI analysis pipeline end to end, from selected file through persisted takeoff results
- [x] Expose edited-state indicators and verify successful AI-run audit entries
- [x] Add and verify an audit-logged browser print-to-PDF action on the bid report page

### Final Verification Fixes
- [x] Restore the direct administrator settings route so the visible Administration navigation does not lead to a 404 page
- [x] Add isolated workflow regression coverage for AI takeoff persistence and project-scoped file deletion
- [x] Create a temporary public-sample project and verify live file upload, metadata, preview, deletion, AI takeoff creation, and audit events
- [x] Remove all temporary verification records after completing the authorized live workflow check
- [x] Fix project creation audit logging so a new project can be created when auditLog.projectId is non-nullable
- [x] Resolve the final QA-document trailing-whitespace validation finding
- [x] Add repeatable Chromium and Firefox checks at desktop and mobile viewport sizes
- [x] Add Chromium and Firefox coverage for authenticated dashboard, project, profile, and administration routes
- [x] Create temporary estimator and viewer accounts for authorized browser-level role validation
- [x] Run Chromium and Firefox workflows for temporary estimator and viewer accounts, then remove all temporary accounts and project records
- [x] Remove the duplicate empty-state project-creation dialog that creates redundant interactive controls
- [x] Add self-cleaning browser workflows for administrator capability changes, estimator upload/analyze/review/export actions, and viewer read-only project/takeoff review
- [x] Allow viewer accounts to read workspace projects and takeoffs while preserving server-side mutation denial
- [x] Create a deployment-ready ZIP of the complete application source code

### Estimator Enablement & Dashboard Enhancements
- [x] Create a reusable skill documenting the proven Constra AI enhancement workflow
- [x] Add an interactive role-aware onboarding walkthrough for first-time estimators
- [x] Add a sample-plan project template to quickly start an estimation project
- [x] Add a dashboard recent-activity feed for project updates
- [x] Add regression tests and visual validation for onboarding, sample projects, and activity feed
- [x] Make browser workflow validation independent of temporary live-AI capacity while retaining server-level AI persistence coverage
- [x] Restore the bid-report feature flag after browser validation and make the reversible administrator test wait for persisted state
- [x] Stabilize the full browser suite by serializing data-backed cross-browser workflow checks
- [x] Make the self-cleaning browser workflow fixture self-contained for source-package portability

### Configurable Estimator Operations
- [x] Update the reusable Constra AI enhancement skill for configurable onboarding, trade templates, and takeoff completion alerts
- [x] Add trade-package sample project templates with clearly labeled training quantities
- [x] Allow administrators to customize estimator onboarding walkthrough content
- [x] Notify the relevant workspace user when an AI takeoff completes
- [x] Add regression coverage and interface validation for templates, onboarding configuration, and notifications

### Configurable Trade Libraries and Alert Decisions
- [x] Update the reusable Constra AI enhancement skill for project-type trade libraries, filtered notification history, and quick review decisions
- [x] Add administrator-managed trade-package libraries scoped to configurable project types
- [x] Let estimators select a project-type library when starting a training sample project
- [x] Add dashboard notification history filters by associated project and review status
- [x] Add secure approve and reject quick actions to completed AI takeoff alerts
- [x] Prepare complete deployment documentation and a verified source ZIP package
- [x] Add regression coverage, interface validation, and self-cleaning role workflows for trade libraries and alert decisions

## Notes
- All file uploads stored in S3 with project scoping
- Audit log captures: eventType (file_upload, ai_analysis, item_edit, bid_created, export), entityType, entityId, description, metadata
- Takeoff line items track isEdited flag to distinguish AI-extracted vs user-edited
- Bid reports are snapshots of takeoff data
- All timestamps stored as UTC
