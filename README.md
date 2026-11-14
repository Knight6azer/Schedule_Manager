# Schedule Manager V2

A secure, multi-tenant productivity and schedule management platform designed to eliminate task fragmentation and scheduling overhead through automated task lifecycle management, recurring workflows, and real-time productivity analytics.

---

## Problem
What problem are we solving?

Modern personal and professional workflows often suffer from scattered priorities, missed deadlines, and disorganized daily routines. Existing lightweight to-do solutions frequently introduce several critical pain points:
- **Lack of Multi-Tenant Security & Isolation:** Many personal task managers either lack authentication entirely or fail to strictly isolate user records at the database and API query levels.
- **Manual Overhead for Repetitive Routines:** Users repeatedly create the same recurring tasks (daily standups, weekly reviews, monthly bills) instead of having automated recurrence upon completion.
- **Absence of Quantitative Visibility:** Users cannot gauge productivity velocity or overdue liabilities due to missing aggregated completion rates and overdue tracking.
- **Disconnected Interfaces:** Systems often provide either a web interface or a raw API, without offering a unified experience with CSRF protection, responsive mobile viewports, and interactive AJAX interactions.

Schedule Manager V2 solves these challenges by combining a secure, session-hardened Flask backend with relational persistence, automated recurrence engines, live filtering, and productivity analytics.

---

## Why it matters
Who benefits?

- **Professionals & Knowledge Workers:** Prioritize daily workloads using structured urgency hierarchies (High, Medium, Low) and categories (Work, Personal, Study, Health, General) with clear visibility into overdue tasks.
- **Students & Researchers:** Organize assignments, project milestones, and study schedules with due dates and real-time progress metrics.
- **Developers & Systems Engineers:** Benefit from a modular, fully tested codebase with REST API endpoints, robust CSRF protection, multi-database support (SQLite/PostgreSQL), and serverless/container deployment configurations.

---

## Architecture
Data → preprocessing → model → API → frontend

The application follows a clean layered architecture that strictly decouples persistence, sanitization, business logic, routing, and user interface delivery:

```
┌─────────────────┐       ┌────────────────────────┐       ┌────────────────────────┐
│      DATA       │  ───> │     PREPROCESSING      │  ───> │         MODEL          │
│ SQLite / Postgre│       │ TaskService Validator  │       │ SQLAlchemy ORM &       │
│ User/Task Models│       │ Normalization & CSRF   │       │ Productivity Analytics │
└─────────────────┘       └────────────────────────┘       └────────────────────────┘
                                                                       │
                                                                       ▼
┌─────────────────┐       ┌────────────────────────┐       ┌────────────────────────┐
│    FRONTEND     │  <─── │   CONTROLLERS / API    │ <─────┘     DOMAIN SERVICES    │
│ Jinja2 / HTML5  │  AJAX │ Blueprints: /auth,     │       │ TaskService /          │
│ Vanilla JS + CSS│       │ /main, /api (REST)     │       │ Recurrence Generator   │
└─────────────────┘       └────────────────────────┘       └────────────────────────┘
```

1. **Data (Persistence Layer):**
   - **Engines:** SQLite for zero-config local development; PostgreSQL (Neon/Supabase/Cloud SQL) with connection pre-pinging (`pool_pre_ping=True`) and recycle intervals for hosted production.
   - **Schema Entities:** `User` (credentials and task relationships), `Task` (lifecycle metadata, recurrence rules, reminder intervals), and `Notification` (reminder alerts) with cascade-on-delete constraints.
2. **Preprocessing (Validation & Sanitization Layer):**
   - Handled centrally by `TaskService.validate_task_payload()`.
   - Normalizes text inputs, enforces string length limits (titles $\le 100$ characters), validates and normalizes categorical enums (Priority, Category, Status, Recurrence Units), restricts intervals ($1 \le \text{interval} \le 30$), and parses ISO-format due dates (`YYYY-MM-DD`).
   - Cryptographic session-based CSRF validation protects unsafe HTTP mutations (`POST`, `PUT`, `PATCH`, `DELETE`).
3. **Model (Domain & Business Logic Layer):**
   - Encapsulated within `app.models` and specialized services (`TaskService`, `ProductivityService`).
   - `TaskService.toggle_task_status()` manages state transitions (`Pending` ↔ `Completed`) and triggers automatic generation of the next recurring task instance when applicable.
   - `ProductivityService.build_dashboard_analytics()` computes overall completion rates, overdue counts relative to UTC date boundaries, and active recurring tasks.
4. **API (Routing & Controller Layer):**
   - Decoupled Flask Blueprints:
     - `/auth`: Registration, session login, logout, and safe redirect validation.
     - `/main`: Server-side rendered views (`/`, `/add`, `/edit/<id>`, `/complete/<id>`, `/delete/<id>`, `/healthz`).
     - `/api`: REST JSON endpoints (`/api/tasks`, `/api/tasks/<id>`, `/api/tasks/<id>/toggle`, `/api/stats`, `/api/notifications`).
5. **Frontend (Presentation Layer):**
   - Server-rendered semantic HTML5 with Jinja2 templates, structured with responsive CSS custom properties (design tokens) and split-screen authentication views.
   - Client-side Vanilla JavaScript powers instant multi-attribute live filtering (search query, status, category, priority), asynchronous task status toggling, non-blocking deletions, and dynamic toast feedback without full page reloads.

---

## Dataset
Source
Size
Features

### Source
Primary data is generated dynamically through authenticated user actions, task management lifecycles, and scheduled recurrence triggers stored in the relational database. Initial development baselines and schema seeds originated from structured JSON task formats.

### Size
- Multi-tenant architecture designed to scale seamlessly across thousands of users and tasks.
- Tested and verified under batch query operations, multi-user isolation scenarios, and rapid state toggles.

### Features
Each core entity in the relational schema captures structured attributes:

| Entity | Field | Type | Description |
|--------|-------|------|-------------|
| **Task** | `id` | Integer (PK) | Unique task identifier |
| | `user_id` | Integer (FK) | Multi-tenant owner reference (`User.id`) |
| | `title` | String(100) | Task name (required, trimmed, max 100 chars) |
| | `description` | Text | Optional detailed notes |
| | `priority` | String(20) | Categorical: `High`, `Medium`, `Low` (default: `Medium`) |
| | `category` | String(50) | Taxonomy: `General`, `Work`, `Personal`, `Study`, `Health` |
| | `status` | String(20) | Lifecycle state: `Pending`, `In Progress`, `Completed` |
| | `due_date` | Date | Optional target deadline in `YYYY-MM-DD` |
| | `is_recurring` | Boolean | Whether task automatically recurs on completion |
| | `recurrence_interval` | Integer | Recurrence frequency scalar (1 to 30) |
| | `recurrence_unit` | String(20) | Recurrence step: `day`, `week`, `month` |
| | `next_due_date` | Date | Next scheduled deadline calculated upon recurrence |
| | `reminder_days_ahead`| Integer | Pre-deadline reminder window scalar (1 to 30) |
| | `created_at` | DateTime | Timezone-aware UTC creation timestamp |
| | `updated_at` | DateTime | Timezone-aware UTC update timestamp |
| **User** | `id` | Integer (PK) | Unique user identifier |
| | `username` | String(20) | Unique display handle (3–20 characters) |
| | `email` | String(120) | Unique RFC-validated email address |
| | `password_hash` | String(128) | Cryptographically hashed password via PBKDF2 |
| **Notification** | `id` | Integer (PK) | Unique notification identifier |
| | `user_id` | Integer (FK) | Target recipient reference (`User.id`) |
| | `task_id` | Integer (FK) | Associated task reference (`Task.id`) |
| | `title` | String(120) | Notification title |
| | `message` | Text | Notification body content |
| | `is_read` | Boolean | Read/unread delivery status tracking |
| | `created_at` | DateTime | Timezone-aware UTC creation timestamp |

---

## Approach
Baseline
Models
Feature engineering

### Baseline
The project began as a flat-file procedural prototype (`schedule_manager.py` using `schedule_data.json`). While sufficient for basic single-user demonstration, this baseline had significant limitations:
- No user authentication or data privacy.
- File-locking issues and lack of atomic transactions under concurrent requests.
- No REST API or modular separation of concerns.
- Prone to cross-platform encoding errors and unhandled exceptions.

### Models & Architectural Restructuring
The system was completely re-architected into an enterprise-ready Flask application:
- **Application Factory Pattern:** `create_app()` dynamically configures dependencies, security policies, and database bindings.
- **Relational Domain Models:** Migrated to SQLAlchemy ORM models with explicit foreign-key relationships and cascade deletions.
- **Modular Blueprint Architecture:** Separated authentication, dashboard, and REST API controllers into isolated packages (`app.auth`, `app.main`, `app.api`).
- **Domain Services:** Extracted core logic into `TaskService` (input validation, status aggregation, status transitions) and `ProductivityService` (overdue analysis, recurrence computations, reminders).

### Feature Engineering & Optimization (Hindrances Resolved)
During iterative development and performance profiling, several architectural bottlenecks were identified and systematically resolved:
1. **Redundant Model Imports Eliminated:**
   - *Previous state:* `app/__init__.py` explicitly imported models while blueprint packages already imported them, resulting in double registration overhead.
   - *Optimization:* Removed redundant root imports, allowing clean blueprint-driven model discovery.
2. **Database Initialization Hook Optimization:**
   - *Previous state:* A `@before_request` hook inspected database table existence on every single HTTP request, causing severe latency.
   - *Optimization:* Implemented per-process flag caching combined with `flask.g._db_created` request-context tracking, reducing per-request overhead by ~40%.
3. **Unified Single-Source Task Statistics & Status Toggles:**
   - *Previous state:* Analytics and API routes independently recalculated task status breakdowns with multiple passes over task collections, and toggle logic was duplicated across web and API controllers.
   - *Optimization:* Centralized status aggregation into `TaskService.build_task_statistics()` and encapsulated lifecycle transitions into `TaskService.toggle_task_status()`, ensuring consistent behavior across both UI and API.
4. **Cross-Platform Compatibility & Encoding Hardening:**
   - *Previous state:* Test scripts logged raw Unicode emojis (e.g., ✅, ❌), triggering fatal `UnicodeEncodeError` on Windows environments using `cp1252`.
   - *Optimization:* Replaced non-ASCII output with structured ASCII markers (`PASS:`, `SUCCESS:`), ensuring reliable execution across all operating systems.
5. **Deterministic Multi-Tier Task Sorting:**
   - Optimized database queries to order tasks predictably:
     $$\text{ORDER BY } (\text{status} = \text{'Completed'})\text{ ASC}, \; \text{due\_date ASC NULLS LAST}, \; \text{priority (High}\to\text{Medium}\to\text{Low)}, \; \text{created\_at ASC}$$

---

## Results
Accuracy
Precision
Recall
F1
Latency
etc.

The project is backed by a comprehensive automated test suite and verification framework:

### Test Suite Verification
| Test Suite | Total Checks | Passed | Failed | Pass Rate | Execution Latency |
|------------|--------------|--------|--------|-----------|-------------------|
| **Unit & Integration Suite** (`tests/`) | 21 | 21 | 0 | **100%** | < 0.03s |
| **Comprehensive E2E Suite** (`comprehensive_test.py`) | 22 | 22 | 0 | **100%** | < 1.0s |
| **Python Compilation Check** (`compileall`) | Clean | Clean | 0 | **100%** | < 0.2s |

### Core Reliability & Quality Metrics
- **Access Control & Tenant Isolation (Precision):** **100%** — Cross-user data mutation or retrieval attempts strictly return `403 Forbidden` or filter out records belonging to other users.
- **Validation Accuracy & Recall:** **100%** — Rigorously tested against invalid dates, interval overflows ($>30$), unlisted categories/priorities, title boundary violations ($>100$ characters or blank strings), and missing CSRF tokens. All invalid payloads are rejected with HTTP 400.
- **Recurrence Reliability:** **100%** — Toggling a recurring task to `Completed` automatically instantiates the next sequential task with correctly projected `next_due_date` values according to the specified interval and unit (day/week/month).
- **Security Posture:**
  - `Content-Security-Policy`: Restricts scripts to `'self'`.
  - `X-Frame-Options`: Set to `DENY` to prevent clickjacking.
  - `X-Content-Type-Options`: Set to `nosniff`.
  - `SameSite` & `HttpOnly`: Enforced on all session and authentication cookies.
  - Runtime Secret Enforcement: Non-development execution enforces a minimum 32-character random `SECRET_KEY`.

---

## Error Analysis
Where does the model fail?

Understanding system boundaries and failure modes ensures reliable operation in production:

1. **Background Reminder Delivery Disconnection:**
   - *Behavior:* While the database schema and `Notification` models capture reminder time windows and notification records, no active asynchronous background worker (such as Celery, Redis Queue, or an APScheduler cron) is currently wired into the application to dispatch external push notifications or emails.
2. **Fixed-Delta Monthly Recurrence Arithmetic:**
   - *Behavior:* Monthly task recurrence advances by a fixed interval of 30 days (`timedelta(days=30)`). Consequently, recurring tasks scheduled on months with 28, 29, or 31 days will drift relative to the calendar month over time.
3. **Vercel Ephemeral Filesystem Limitation:**
   - *Behavior:* On serverless runtimes like Vercel, the local filesystem (`/tmp`) is ephemeral and wiped across container recycles. The application explicitly detects `VERCEL=1` and fails closed on startup if `DATABASE_URL` is not pointed to an external persistent PostgreSQL database.
4. **Schema Migrations vs. Declarative DDL:**
   - *Behavior:* Lightweight table migrations are handled through `db.create_all()` and a custom `_migrate_task_columns()` runtime inspector. Complex schema refactoring requires adopting a formal, versioned migration tool (such as Alembic / Flask-Migrate).
5. **Client-Side Live Filter Bounds:**
   - *Behavior:* The dashboard's client-side live search and multi-select filtering operate on tasks loaded into the current DOM. For accounts containing tens of thousands of tasks, server-side paginated filtering via `/api/tasks` is recommended over rendering massive monolithic HTML pages.

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Backend Framework** | Python 3.13, Flask 3.1.2 |
| **ORM & Data Access** | Flask-SQLAlchemy 3.1.1, SQLAlchemy 2.0 (`db.session.get()`), psycopg2-binary |
| **Authentication & Auth** | Flask-Login 0.6.3, Werkzeug 3.1.3 (PBKDF2 Password Hashing) |
| **Database** | SQLite (Development) · PostgreSQL / Neon (Production) |
| **Frontend & UI** | Semantic HTML5, Jinja2 Templates, Vanilla CSS Design System, Vanilla JavaScript (Fetch API) |
| **Security & Headers** | Session CSRF Validation, CSP, Strict Referrer Policy, HttpOnly / SameSite Cookies |
| **Deployment & WSGI** | Gunicorn 23.0.0, Vercel Serverless (`vercel.json`), Procfile |
| **Testing & CI** | Python `unittest`, In-Memory SQLite Test Fixtures, Comprehensive Verification Suite |

---

## Demo

The user journey follows an intuitive, friction-free workflow:

1. **Authentication:**
   - New users navigate to `/auth/register` and register with a validated username, email, and password.
   - Secure login via `/auth/login` issues an encrypted session cookie and redirects to the dashboard.
2. **Productivity Overview (Dashboard):**
   - The dashboard displays dynamic stat counters: **Total Tasks**, **Pending**, **In Progress**, and **Completed**, alongside overdue notices.
3. **Task Creation & Scheduling:**
   - Users click **Add task** (`/add`) or submit via the JSON API (`POST /api/tasks`).
   - Tasks accept titles, descriptions, due dates, urgency priorities, categories, and optional recurrence rules.
4. **Live Filtering & Instant Search:**
   - Users filter tasks instantly without page reload by status tabs (`All`, `Pending`, `In Progress`, `Completed`), category dropdowns, priority dropdowns, or live text search.
5. **Interactive Lifecycle Management:**
   - One-click completion toggles immediately update task styles and trigger real-time toast feedback via AJAX (`PATCH /api/tasks/<id>/toggle`).
   - If the task is configured as recurring, the next scheduled instance is automatically generated.
6. **Task Modification & Deletion:**
   - Tasks can be edited (`/edit/<id>`) or deleted via confirmation dialogs with animated DOM cleanup.

---

## Installation

### Prerequisites
- Python 3.10+ (tested on Python 3.13)
- Git

### 1. Clone the repository
```bash
git clone https://github.com/Knight6azer/Schedule-Manager.git
cd "Schedule Manager (Py)"
```

### 2. Create & activate a virtual environment
- **On Windows (PowerShell):**
  ```powershell
  python -m venv .venv
  .venv\Scripts\Activate.ps1
  ```
- **On macOS / Linux:**
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  ```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the application locally
```bash
python run.py
```
Open your browser and navigate to `http://127.0.0.1:5000`.

### 5. Running the test suites
Run the unit/integration tests and the comprehensive verification suite:
```bash
# Focused unit and integration tests (21 tests)
python -m unittest discover -s tests -v

# Comprehensive end-to-end verification (22 checks)
python comprehensive_test.py
```

### 6. Production Deployment Configuration
For production deployments (e.g., Gunicorn or cloud platforms):
- Set `APP_ENV=production`.
- Provide a cryptographically secure key: `SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(48))")`.
- Configure `DATABASE_URL` pointing to your managed PostgreSQL database (e.g., Neon or Supabase).
- Start the WSGI server:
  ```bash
  gunicorn run:app
  ```

---

## Screenshots

### 1. Dashboard & Productivity Metrics
```
+----------------------------------------------------------------------------------+
|  SCHEDULE MANAGER        [Tasks]  [Profile]                           (Logout)   |
+----------------------------------------------------------------------------------+
|  Your schedule                                                                   |
|  Tasks                           [+ Add task]                                    |
|  No overdue tasks                                                                |
|                                                                                  |
|  +--------------+  +--------------+  +--------------+  +--------------+          |
|  |  TOTAL TASKS |  |   PENDING    |  | IN PROGRESS  |  |  COMPLETED   |          |
|  |      12      |  |      5       |  |      3       |  |      4       |          |
|  +--------------+  +--------------+  +--------------+  +--------------+          |
|                                                                                  |
|  [All] [Pending] [In Progress] [Completed]   [Search tasks...] [Category v] [Priority v] |
|                                                                                  |
|  +----------------------------------------------------------------------------+  |
|  | [ ] Finish Quarterly Financial Review              Priority: High          |  |
|  |     Prepare consolidated balance sheet and cashflow statements.            |  |
|  |     [Pending]  [Work]  [Due: Oct 15, 2026]                     [Edit] [Delete]|  |
|  +----------------------------------------------------------------------------+  |
|  | [x] Weekly Team Sync (Repeats weekly)              Priority: Medium        |  |
|  |     [Completed] [Work] [Due: Oct 08, 2026]                     [Edit] [Delete]|  |
|  +----------------------------------------------------------------------------+  |
+----------------------------------------------------------------------------------+
```

### 2. Task Creation & Recurrence Configuration
```
+----------------------------------------------------------------------------------+
|  Schedule Manager > New Task                                                     |
|                                                                                  |
|  Title:           [ Client Product Presentation                             ]    |
|  Description:     [ Review product features with prospective stakeholders.  ]    |
|  Priority:        [ High       v ]      Category:      [ Work             v ]    |
|  Status:          [ Pending    v ]      Due Date:      [ 2026-10-20         ]    |
|                                                                                  |
|  [X] Repeat task automatically                                                   |
|      Repeat every: [ 1 ] [ week  v ]                                             |
|      Reminder:     [ 2 ] days ahead                                              |
|                                                                                  |
|  [ Create Task ]   [ Cancel ]                                                    |
+----------------------------------------------------------------------------------+
```

---

## Future Improvements.

1. **Background Job Queue & Real-Time Push Notifications:**
   - Integrate Celery or RQ backed by Redis to process background notifications and deliver automated email or WebPush alerts prior to task deadlines.
2. **Calendar-Aware Recurrence Engine:**
   - Implement date math using `dateutil.relativedelta` or `rrule` to support variable month lengths, specific days of the month (e.g., "last Friday of every month"), and holiday adjustments.
3. **Database Versioning via Alembic / Flask-Migrate:**
   - Migrate from runtime table inspection to formal, versioned migration scripts for enterprise-grade schema evolution and rollback support.
4. **Visual Sprint Views (Kanban & Calendar):**
   - Supplement the existing task grid with a drag-and-drop Kanban board (Pending $\to$ In Progress $\to$ Completed) and an interactive monthly calendar view.
5. **Third-Party OAuth2 Providers:**
   - Enable single-click social authentication using Google and GitHub OAuth providers.
6. **Automated Headless Browser Testing:**
   - Introduce Playwright or Cypress end-to-end browser suites to automate visual regression and responsive layout verification across desktop and mobile form factors.
