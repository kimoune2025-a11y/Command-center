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

## Backlog / Future Features

### P0 (High Priority)
- [ ] Password reset functionality
- [ ] Profile picture upload
- [ ] Data export (CSV/Excel)

### P1 (Medium Priority)
- [ ] Team member assignment UI
- [ ] Task comments/activity log
- [ ] Email notifications
- [ ] Dashboard customization

### P2 (Low Priority)
- [ ] Cloud storage integration (S3/Google Drive)
- [ ] Mobile app (React Native)
- [ ] Advanced reporting
- [ ] Audit logs
- [ ] Additional languages (Spanish, German, etc.)

## Test Credentials
- **Admin:** admin@cvln.com / admin123
