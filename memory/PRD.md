# CVLN Command Center - Product Requirements Document

## Project Overview
**Name:** CVLN Command Center  
**Type:** Internal Dashboard Application  
**Purpose:** Private command center to manage multiple projects, events, finances, and partners for a creative conglomerate.

## Architecture

### Tech Stack
- **Frontend:** React 19 + Tailwind CSS + Shadcn UI
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **Authentication:** JWT-based custom auth

### Key Features Implemented

#### 1. Authentication System ✅
- JWT-based login/register
- Role-based access control (Admin, Manager, Viewer)
- Protected routes

#### 2. Dashboard Overview ✅
- Summary cards for projects, tasks, contacts, events
- Financial snapshot (revenue, expenses, profit)
- Upcoming events list
- Active tasks list

#### 3. Projects Module ✅
- CRUD operations
- Status tracking (Planning, In Progress, On Hold, Completed)
- Deadlines and team members
- Budget tracking

#### 4. Task Manager ✅
- Priority levels (Low, Medium, High, Urgent)
- Status tracking (To Do, In Progress, Review, Completed)
- Assignment to projects
- Deadline management

#### 5. Finance Module ✅
- Revenue/Expense/Budget tracking
- Category-based organization
- Charts (Pie, Bar)
- Project-linked finances

#### 6. Contacts CRM ✅
- Contact types: Partners, Sponsors, Artists, Institutions, Investors
- Contact details (email, phone, company)
- Notes and filtering

#### 7. Events Module ✅
- Calendar view with event indicators
- Event checklist functionality
- Location and status tracking
- Project linking

#### 8. Document Manager ✅
- File upload (local storage)
- Category organization
- Project linking
- Metadata tracking

#### 9. KPI Dashboard ✅
- Multiple categories (Revenue, Growth, Performance, Engagement)
- Period tracking (Daily to Yearly)
- Target setting with progress bars
- Performance trend chart

#### 10. Admin Panel ✅
- User management
- Role assignment
- User deletion (admin only)

#### 11. Multilingual Support ✅ (NEW)
- English (default)
- French (Français)
- Language switcher in UI
- Persistent language preference

## User Roles & Permissions

| Feature | Admin | Manager | Viewer |
|---------|-------|---------|--------|
| View Data | ✅ | ✅ | ✅ |
| Create/Edit | ✅ | ✅ | ❌ |
| Delete | ✅ | ❌ | ❌ |
| User Management | ✅ | ❌ | ❌ |

## Design

- **Theme:** Dark mode primary (#050505)
- **Accent:** Gold (#D4AF37)
- **Typography:** Rajdhani (headings), DM Sans (body)
- **Style:** Executive Futurism, minimalist, sharp edges

## API Endpoints

### Auth
- POST `/api/auth/register`
- POST `/api/auth/login`
- GET `/api/auth/me`

### Resources (all CRUD)
- `/api/projects`
- `/api/tasks`
- `/api/finance`
- `/api/contacts`
- `/api/events`
- `/api/documents`
- `/api/kpis`
- `/api/users` (admin only)
- `/api/dashboard/stats`

## Implementation Date
- Initial MVP: January 2026
- Multilingual Update: January 2026
- P0 Rollback to stable v1.0 + i18n fixes: June 2026

## v1.0 Rollback Log (June 2026)
- Reverted DashboardPage (df844ac), ProjectsPage (bfd72b4), TasksPage (0efb620) to clean v1.0 versions; deleted broken v1.2 component dirs (Alerts/Projects/Search/Tasks).
- Backend confirmed clean v1.0 (no heatmap/weekly-summary/burn-rate; simple Project model).
- Fixed: Finance PUT 500 (model_dump exclude_none), Sonner toast duration 2.5s, wired i18n into Projects & Tasks pages.
- LanguageContext default set to French.
- Verified via testing_agent (iteration_2): backend 28/29 then fixed, frontend all 8 modules OK.

## Entities Module (P1) — June 2026 ✅ DONE
- Backend: Entity model (name, description, type[holding/studio/label/agency/other], color) + full CRUD at /api/entities; entity_id added to Project create/response; delete-entity unlinks projects.
- Frontend: EntitiesPage (CRUD, type select, color picker, project count, FR/EN i18n); Sidebar nav "Entités" (Building2); ProjectsPage entity selector + entity filter + entity badge on cards.
- Fixed during QA: missing entity badge on project cards; language-switcher/CTA header overlap (added lg:pt-16, removed duplicate Toaster).
- Verified via testing_agent (iteration_3): backend 44/44 pytest (15 entity + 29 regression), frontend flows OK.

## Backlog / Future Features

### Upcoming — Conglomerate Mode (strict incremental, after v1.0 stable)
- [x] P1 Entities module — DONE (June 2026)
- [ ] P1 Board Pack page: read-only executive view (entity performance, top 10 priorities, risk summary, cash runway).
- [ ] P1 Decisions module: log strategic decisions.
- [ ] P1 Risks module: risk register.
- [ ] P2 Audit logs (immutable global audit log).
- [ ] P2 Alerts automation (overdue tasks, budget alerts).
- [ ] P2 Global search across projects/tasks/contacts/documents.

### Other Backlog

### P0 (High Priority)
- [ ] Password reset functionality
- [ ] Data export (CSV/Excel)

### P1 (Medium Priority)
- [ ] Team member assignment UI
- [ ] Task comments/activity log
- [ ] Email notifications

### P2 (Low Priority)
- [ ] Cloud storage integration (S3/Google Drive)
- [ ] Advanced reporting

## Test Credentials
- **Admin:** cvlgroupe@hotmail.com / CVLN@dmin2026! (see /app/memory/test_credentials.md)

