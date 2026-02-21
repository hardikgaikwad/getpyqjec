# PROJECT_INTELLIGENCE.md — GETPYQJEC

> **Document Purpose:** This is a single AI-readable technical reference that describes the complete architecture, logic, data flow, and implementation of the GETPYQJEC project. An AI assistant reading this document should be able to understand the entire system without reading source code.

---

## 1. Project Overview

### 1.1 Purpose

GETPYQJEC ("Get Previous Year Questions — JEC") is a **Previous Year Questions (PYQ) sharing platform** built for Jabalpur Engineering College (JEC) by a **team of three developers**. The main goal is to make academic resources easily accessible while allowing students to contribute new materials for others. The system organizes PYQs by **branch** (department), **semester**, **subject**, **year**, and **exam session** (April or December).

### 1.2 Main Features

**Public Download System (No Login Required)**
- Year-wise download (single year's PYQ)
- Bundled years download (e.g., 2023–2026 merged into one PDF)
- Subject-wise download (specific subject across a year range)
- Combined all-subject packages (all subjects for a semester within a year range)
- Designed for quick, frictionless access to study materials

**Student Contribution System (Upload — Authenticated)**
- Students can upload PYQ files as PDFs or images (images are auto-converted to PDF client-side)
- Uploaded content becomes immediately available for other students to download
- Upload is protected by authentication and authorization to prevent unwanted or unreliable content

**User Management**
- User registration and JWT-based authentication
- Role-based user model (admin / contributor)
- Django Admin panel for user and system management

### 1.3 Design Philosophy

The architecture deliberately separates **public consumption** (download) from **protected contribution** (upload):

- **Downloads remain fully public** — no login required. This maximizes accessibility and ensures any student can get study materials instantly.
- **Uploads require authentication** — only verified, registered users can contribute. This maintains content quality and system security by preventing unknown or spam uploads.
- This separation ensures the platform is both maximally useful for consumers and reliably curated by contributors.

### 1.4 Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Backend Framework** | Django | 6.0.2 |
| **REST API** | Django REST Framework (DRF) | 3.16.1 |
| **Authentication** | `djangorestframework-simplejwt` | 5.5.1 |
| **PDF Merging (Server)** | pikepdf | 10.3.0 |
| **Database** | SQLite 3 | (bundled) |
| **Frontend Framework** | React | 19.1.1 |
| **Bundler** | Vite | 7.1.2 |
| **Client Routing** | react-router-dom | 7.13.0 |
| **PDF Generation (Client)** | pdf-lib | 1.17.1 |
| **Language** | Python 3 + JavaScript (ES Modules) | — |

### 1.5 Deployment Architecture

- Vite builds the React frontend to `frontend/dist/`.
- Django serves `frontend/dist/index.html` as a template and `frontend/dist/` as the static files root.
- A catch-all URL pattern in `backend/urls.py` serves the React SPA for any route not matched by API endpoints, enabling client-side routing.
- This produces a single unified deployment where Django serves both API and frontend.

---

## 2. High-Level Architecture

### 2.1 System Architecture Diagram (Text)

```
┌─────────────────────────────────────────────────────────────┐
│                      USER (Browser)                         │
│  React SPA — served by Django                               │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Download  │  │  Upload    │  │ Profile  │  │  NavBar  │  │
│  │  Page     │  │  Page      │  │  Page    │  │          │  │
│  └─────┬────┘  └─────┬──────┘  └────┬─────┘  └──────────┘  │
│        │              │              │                       │
│        │     HTTP Requests (REST)    │                       │
└────────┼──────────────┼──────────────┼───────────────────────┘
         │              │              │
         ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Django Backend                            │
│                                                             │
│  backend/urls.py                                            │
│  ├── /admin/           → Django Admin                       │
│  ├── /auth/register/   → RegisterView          [AllowAny]   │
│  ├── /auth/login/      → TokenObtainPairView   [AllowAny]   │
│  ├── /auth/refresh/    → TokenRefreshView      [AllowAny]   │
│  ├── /upload/          → UploadPYQView     [IsAuthenticated] │
│  ├── /download/        → DownloadPYQView       [AllowAny]   │
│  └── /*                → react_app (SPA fallback)           │
│                                                             │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐                │
│  │ core/    │   │ utils/   │   │ data/    │                │
│  │models.py │   │storage.py│   │files/    │ ← PDF storage  │
│  │views.py  │   │finder.py │   │metadata/ │ ← JSON index   │
│  │serial.py │   │pdf.py    │   │          │                │
│  └──────────┘   └──────────┘   └──────────┘                │
│                                                             │
│  Database: db.sqlite3  (User model)                         │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 External Services

**None.** The application has no external API dependencies, no cloud storage, no email service, no third-party auth providers. Everything runs locally with file-system storage and SQLite.

### 2.3 Authentication Flow Overview

- **Registration:** `POST /auth/register/` with `{rno, email, name, password}` → creates user → returns JWT `{access, refresh, user}`.
- **Login:** `POST /auth/login/` with `{rno, password}` → returns JWT pair `{access, refresh}`.
- **Token Refresh:** `POST /auth/refresh/` with `{refresh}` → returns new `{access}`.
- **Protected Endpoints:** Require `Authorization: Bearer <access_token>` header. Token lifetimes: access = 60 minutes, refresh = 1 day.

---

## 3. Folder Structure Explanation

```
getpyqjec/                          # Project root (Django project root)
├── manage.py                       # Django CLI entry point
├── requirements.txt                # Python dependencies
├── db.sqlite3                      # SQLite database (User records)
│
├── backend/                        # Django project settings package
│   ├── settings.py                 # All Django config (DB, JWT, apps, static files)
│   ├── urls.py                     # Root URL dispatcher (admin → API → SPA catch-all)
│   ├── wsgi.py                     # WSGI deployment entry point
│   └── asgi.py                     # ASGI deployment entry point
│
├── core/                           # Django app — all business logic
│   ├── models.py                   # Custom User model (AbstractBaseUser)
│   ├── managers.py                 # UserManager (create_user, create_superuser)
│   ├── serializers.py              # RegisterSerializer
│   ├── views.py                    # RegisterView, UploadPYQView, DownloadPYQView, react_app
│   ├── urls.py                     # API route definitions
│   ├── admin.py                    # CustomUserAdmin for Django Admin
│   └── migrations/                 # Database migration files
│
├── utils/                          # Utility layer (file operations, PDF processing)
│   ├── storage.py                  # File path building, metadata JSON I/O, normalization
│   ├── finder.py                   # PDF file discovery by branch/semester/year range
│   └── pdf.py                      # PDF merging with pikepdf
│
├── data/                           # Runtime data directory (auto-created)
│   ├── files/                      # PDF storage hierarchy
│   └── metadata/
│       └── pyqs.json               # JSON array of upload metadata records
│
├── templates/
│   └── admin/
│       └── base_site.html          # Django admin template override (custom welcome msg)
│
└── frontend/                       # React SPA (Vite project)
    ├── package.json                # NPM dependencies and scripts
    ├── vite.config.js              # Vite config (base="/", outDir="dist")
    ├── index.html                  # SPA entry HTML
    └── src/
        ├── main.jsx                # React DOM entry point
        ├── App.jsx                 # Router definition (4 routes)
        ├── index.css               # Global styles (dark theme, CSS reset)
        ├── http.js                 # API call functions (fetchUrls, uploadData)
        ├── information.js          # Static data: branches, semesters, subject catalog
        ├── imgTopdf.js             # Client-side image-to-PDF conversion (pdf-lib)
        └── components/
            ├── Root/
            │   ├── Root.jsx        # Layout shell: NavBar + <Outlet />
            │   └── NavBar.jsx      # Navigation bar with links
            ├── DownloadPage/
            │   ├── DownloadPage.jsx # Page orchestrator (form → loading → data/error)
            │   ├── Form.jsx        # Download filter form (cascading dropdowns)
            │   ├── DataArea.jsx    # Single-file download card with blob download
            │   └── LoadingPage.jsx # Animated loading indicator
            ├── UploadPage/
            │   ├── UploadPage.jsx  # Page orchestrator for upload
            │   └── UploadForm.jsx  # Upload form (metadata fields + file picker)
            ├── LoginForm/
            │   └── LoginForm.jsx   # Sign In / Sign Up form
            ├── ErrorPage/
            │   └── Error.jsx       # Reusable error display component
            └── hooks/
                └── useFetch.js     # Generic async fetch hook
```

### 3.1 Key Interactions Between Files

- `backend/urls.py` includes `core/urls.py` for all API routes, then catches everything else with `react_app` to serve the SPA.
- `core/views.py` imports from `utils/storage.py` (path building, metadata), `utils/finder.py` (PDF discovery), and `utils/pdf.py` (PDF merging).
- Frontend `App.jsx` defines the router; each route maps to a page component under `components/`.
- `information.js` provides the data that drives the cascading dropdown logic in both download and upload forms.
- `http.js` is the centralized API layer for all frontend HTTP requests.

---

## 4. Backend Deep Analysis

### 4.1 API Routes and Responsibilities

| Method | Path | View | Permission | Responsibility |
|---|---|---|---|---|
| POST | `/auth/register/` | `RegisterView` | AllowAny | Create new user, return JWT tokens |
| POST | `/auth/login/` | `TokenObtainPairView` | AllowAny | Authenticate with rno + password, return JWT pair |
| POST | `/auth/refresh/` | `TokenRefreshView` | AllowAny | Exchange refresh token for new access token |
| POST | `/upload/` | `UploadPYQView` | IsAuthenticated | Validate & save PDF, update metadata |
| GET | `/download/` | `DownloadPYQView` | AllowAny | Find matching PYQs, merge, stream download |
| GET | `/*` | `react_app` | AllowAny | Serve React SPA index.html |
| — | `/admin/` | Django Admin | Staff only | User management panel |

### 4.2 Middleware Chain

Standard Django middleware stack (in order):
1. `SecurityMiddleware` — HTTPS redirects, HSTS headers
2. `SessionMiddleware` — Session handling (used by admin)
3. `CommonMiddleware` — URL normalization, content-length
4. `CsrfViewMiddleware` — CSRF protection (DRF API uses JWT, separate from this)
5. `AuthenticationMiddleware` — Attaches `request.user` from session
6. `MessageMiddleware` — Flash messages (admin)
7. `XFrameOptionsMiddleware` — Clickjacking protection

**DRF Authentication:** Configured globally as `JWTAuthentication`. DRF reads the `Authorization: Bearer <token>` header, independent of Django's session-based middleware auth.

### 4.3 Authentication & Authorization Flow (Detailed)

#### Registration (`RegisterView.post`)
1. Receives `{rno, email, name, password}`.
2. `RegisterSerializer` validates:
   - `rno` must match regex `^0201(CS|IT|AI|ME|CE|MT|IP|EE|EC)\d{6}$` (e.g., `0201IT231046`).
   - `email` must be unique.
   - `password` is write-only (not returned in response).
3. `UserManager.create_user()` normalizes email, hashes password via `set_password()`, saves to DB.
4. Default role assigned: `'contributor'`.
5. Generates `RefreshToken.for_user(user)`.
6. Returns `{access, refresh, user: {rno, email, name, role}}` with HTTP 201.

#### Login (SimpleJWT Default)
1. `TokenObtainPairView` accepts `{rno, password}` (because `USERNAME_FIELD = 'rno'`).
2. Validates credentials against the database.
3. Returns `{access, refresh}`.

#### Token Lifecycle
- Access token lifetime: **60 minutes**.
- Refresh token lifetime: **1 day**.
- Header format: `Authorization: Bearer <access_token>`.

#### Role Model
- Two roles: `admin` and `contributor`.
- Stored as a field on the User model.
- Upload endpoint requires `IsAuthenticated` — any authenticated user can upload.

### 4.4 Database Schema

**Model: `User`** (custom, extends `AbstractBaseUser + PermissionsMixin`)

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `rno` | CharField(12) | unique, regex-validated | **USERNAME_FIELD** — the login identifier |
| `email` | EmailField | unique | |
| `name` | CharField(100) | required | |
| `role` | CharField(20) | choices: admin/contributor, default: contributor | |
| `password` | (inherited) | hashed | from AbstractBaseUser |
| `is_active` | BooleanField | default: True | |
| `is_staff` | BooleanField | default: False | Controls Django Admin access |
| `is_superuser` | (inherited) | | from PermissionsMixin |
| `date_joined` | DateField | auto_now_add | |

**PYQ data is not stored in the database.** Files live on the filesystem; metadata is tracked in a JSON file (`data/metadata/pyqs.json`).

#### Metadata JSON Record Structure
Each entry in `pyqs.json` looks like:
```json
{
  "branch": "IT",
  "semester": 3,
  "subject_code": "IT33",
  "year": 2024,
  "exam_session": "April",
  "file_path": "data/files/IT/sem3/IT33/2024_April.pdf",
  "uploaded_by": "0201IT231046",
  "uploaded_at": "2025-11-23T08:32:58+00:00"
}
```

### 4.5 Service / Utility Layer

#### `utils/storage.py` — File System & Metadata Management
- **`BASE_DATA_DIR`**: `<project_root>/data/`
- **`FILES_ROOT`**: `<project_root>/data/files/`
- **`META_FILE`**: `<project_root>/data/metadata/pyqs.json`
- **`ensure_base_dirs()`**: Creates directories and initializes `pyqs.json` if absent.
- **`load_metadata()`**: Reads and returns the full JSON array from `pyqs.json`.
- **`save_metadata(data)`**: Writes the full JSON array back to `pyqs.json`.
- **`normalize_branch(branch)`**: Strips whitespace, uppercases.
- **`normalize_session(session)`**: Validates "april" or "december" only, capitalizes.
- **`build_dir_path(branch, semester, subject_code)`**: Returns `files/{BRANCH}/sem{N}/{SUBJECT_CODE}/`.
- **`build_file_path(...)`**: Returns `(directory, filepath)` where filename = `{YEAR}_{Session}.pdf`.

**File storage convention:**
```
data/files/{BRANCH}/sem{SEMESTER}/{SUBJECT_CODE}/{YEAR}_{Session}.pdf
Example: data/files/IT/sem3/IT33/2024_April.pdf
```

#### `utils/finder.py` — PDF Discovery
- **`get_pdfs(branch, semester, subject_code, from_year, to_year)`**:
  1. Builds base path: `data/files/{BRANCH}/sem{SEMESTER}/`.
  2. If `subject_code` is `"all"`, scans all subject subdirectories; otherwise scans only the specified one.
  3. For each `.pdf` file, parses filename (`{year}_{session}.pdf`) to extract year and session.
  4. Filters by `from_year <= year <= to_year`.
  5. Sorts results by `(subject_code, year, session_order)` where April=0, December=1.
  6. Returns sorted list of absolute file paths.

#### `utils/pdf.py` — PDF Merging
- **`compile_pdfs(file_paths)`**: Uses pikepdf to open each PDF, append all pages into a single new in-memory PDF (`BytesIO`), and return the stream for Django's `FileResponse`.

### 4.6 Upload Logic (`UploadPYQView.post`)

1. **Authentication** — `IsAuthenticated` permission required (JWT).
2. **Field extraction** from `request.POST`: `branch`, `semester`, `subject_code`, `year`, `exam_session`.
3. **File extraction** from `request.FILES`: `file`.
4. **Validation:**
   - All fields and file must be present → 400 if missing.
   - File must have `.pdf` extension → 400 if not.
   - File size must be ≤ 10MB → 400 if exceeded.
   - Session must be "april" or "december" → 400 if invalid.
5. **Normalization:** branch → uppercase, session → capitalized.
6. **Path construction** via `build_file_path()`.
7. **Duplicate check:** If file exists at computed path → 409 Conflict.
8. **File write:** Creates directories with `os.makedirs`, writes file in chunks. On failure, cleans up partial file.
9. **Metadata update:** Appends record to `pyqs.json` with upload timestamp (UTC ISO) and uploader's `rno`.
10. **Response:** HTTP 201 with `{success: true, path: "..."}`.

### 4.7 Download Logic (`DownloadPYQView.get`)

1. **No authentication required** (AllowAny).
2. **Query param extraction:** `branch`, `semester`, `subject_code` (default `"all"`), `from_year`, `to_year`.
3. **Validation:** All params required → 400 if missing. `semester`, `from_year`, `to_year` must be integers → 400 if invalid.
4. **PDF discovery** via `get_pdfs()` — scans filesystem for matching PDFs.
5. **No results check** → 404 if no PYQs found.
6. **PDF merging** via `compile_pdfs()` — all matching PDFs merged into one document.
7. **Response:** `FileResponse` with `as_attachment=True`, content type `application/pdf`, filename: `{branch}_sem{semester}_{subject_code}_{from_year}-{to_year}.pdf`.

### 4.8 Django Admin Configuration

- Custom `CustomUserAdmin` registered for the `User` model.
- List display: `rno`, `email`, `name`, `role`, `is_staff`.
- Filterable by: `role`.
- Searchable by: `rno`, `email`.
- Fieldsets for create/edit expose: rno, password, name, email, role, permissions.
- Admin template override shows user's `name` in welcome message.

### 4.9 Async Jobs / Queues

**None.** All operations are synchronous within the request-response cycle.

---

## 5. Frontend Deep Analysis

### 5.1 Routing Architecture

The application uses `react-router-dom` v7 with `createBrowserRouter`:

| Path | Component | Purpose |
|---|---|---|
| `/` | `RootLayout` (wrapper) | Persistent NavBar + `<Outlet />` for child routes |
| `/` (index) | `DownloadPage` | Main page: search and download PYQs |
| `/upload` | `UploadDataPage` | Upload PYQ form |
| `/profile` | `LoginForm` | Sign in / Sign up form |
| `/*` | `ErrorPage` | 404 catch-all |

All routes are nested under `RootLayout`, providing the `NavBar` across all pages. Each route has an `errorElement` that renders `ErrorPage` for route-level errors.

### 5.2 State Management

State is managed with local `useState` and `useRef` hooks within each component — a lightweight approach suited to the application's page-based structure:

- **`DownloadPage`**: `fetchedData`, `error`, `isLoading` — orchestrates form submission, loading state, and result display.
- **`Form.jsx`**: `selectedValues` (semester, branch, subject, fromYear, toYear), `manualFromYear`, `manualToYear`, `fetching` — drives cascading dropdown logic.
- **`UploadForm.jsx`**: `selectedValues` (semester, branch, subject, session, year, files), `fileType`, `errorMessage`, `upload` — manages upload workflow.
- **`LoginForm.jsx`**: `mode` (signin/signup), `form` (email, rollno, password, identifier) — manages form mode toggle and input state.
- **`DataArea.jsx`**: `isDownloading`, `isComplete`, `error` — manages download button states.

### 5.3 Component Hierarchy

```
App
└── RouterProvider
    └── RootLayout                    [Root/Root.jsx]
        ├── NavBar                    [Root/NavBar.jsx]
        │   ├── NavLink → "/"         ("OPEN SOURCE JEC" logo + home)
        │   ├── NavLink → "/upload"   ("UPLOAD")
        │   └── NavLink → "/profile"  ("PROFILE" with icon)
        │
        └── <Outlet /> renders one of:
            │
            ├── DownloadPage          [DownloadPage/DownloadPage.jsx]
            │   ├── FormPYQ           [DownloadPage/Form.jsx]
            │   │   └── Cascading selects: semester → branch → subject → year range
            │   ├── LoadingPage       [DownloadPage/LoadingPage.jsx]  (while fetching)
            │   ├── ErrorPage         [ErrorPage/Error.jsx]           (on error)
            │   └── DataArea          [DownloadPage/DataArea.jsx]     (on success)
            │
            ├── UploadDataPage        [UploadPage/UploadPage.jsx]
            │   ├── UploadForm        [UploadPage/UploadForm.jsx]
            │   │   └── Selects + file: semester → branch → subject → session → year → file
            │   └── ErrorPage         (on error)
            │
            ├── LoginForm             [LoginForm/LoginForm.jsx]
            │
            └── ErrorPage             [ErrorPage/Error.jsx]  (404 catch-all)
```

### 5.4 API Integration Layer (`http.js`)

Two centralized functions for all backend communication:

- **`fetchUrls(queries)`** — Sends a `GET` request with query string parameters. Parses the JSON response and returns the `url` property. Throws on non-OK responses.
- **`uploadData(data)`** — Sends a `POST` request with a `FormData` body. Parses and returns JSON response. Throws on non-OK responses with error message propagation.

### 5.5 Image-to-PDF Conversion (`imgTopdf.js`)

Client-side utility using `pdf-lib`:
- Takes an array of image `File` objects (PNG or JPG).
- Creates a new PDF document.
- Embeds each image as a full page at its native resolution.
- Returns a `File` object named `converted_images.pdf`, ready for upload.
- Used by `UploadForm` when the user selects "Images" as the file type.

### 5.6 Static Data Layer (`information.js`)

A comprehensive lookup module containing:

- **`branches`**: 9 branch abbreviations mapped to full names — IT, CSE, ECE, EE, CE, ME, IP, AIDS, MT.
- **`semesters`**: `[1, 2, 3, 4, 5, 6, 7, 8]`.
- **`ordinals`**: Maps semester numbers to words (`1→"first"`, `2→"second"`, etc.).
- **`subjects`**: Nested object `{branch: {semester_ordinal: [[subjectName, subjectCode], ...]}}`.
  - `CommonForAllBranches` covers semesters 1 and 2 (shared subjects).
  - Each branch has its own subjects for semesters 3–8.
- **`previousYears`**: Dynamically computed — last 5 years from current year (for download form).
- **`years`**: Current year and previous year (for upload form).

**Cascading dropdown logic:** Selecting a semester and branch causes the form component to look up `subjects[branch][ordinals[semester]]` to populate the subject dropdown.

### 5.7 Key Component Deep Dives

#### Download Form (`Form.jsx`)
- Manages cascading state: when semester changes to 1 or 2, branch auto-sets to `"CommonForAllBranches"`; for semesters 3+, user selects from the branch list.
- Year selection supports both dropdown (last 5 years) and manual text input (for older years).
- "To Year" dropdown filters to only show years ≥ the selected "From Year".
- On submit, builds a query string from all form fields and passes it to the parent's `fetchFn`.
- Disables submit button while fetching. Resets form on success.

#### Upload Form (`UploadForm.jsx`)
- Same cascading semester/branch/subject logic as the download form.
- Adds **session** (April/December) and single **year** selection.
- **File type choice:** User selects between PDF (single file, ≤5MB) or Images (up to 6, ≤2MB each, PNG/JPG only).
- Client-side validation: file count, file size, MIME type.
- If images are selected, converts them to a single PDF via `createPdfFromImages()` before upload.
- Constructs `FormData` with all metadata fields and the final PDF file.
- Disables submit/reset during upload. Alerts on success.

#### DataArea (`DataArea.jsx`)
- Receives a file object with `{url, name}`.
- Implements blob-based download: fetches the URL, creates an object URL, triggers a browser download via a dynamically created `<a>` element.
- Three visual states: ready → downloading (spinner) → completed (checkmark, auto-resets after 3s).
- Styled as a premium card with decorative glowing orbs, a PDF icon, and animated pulse ring.

#### LoadingPage (`LoadingPage.jsx`)
- Displays during data fetching with three animation types: spinner, dots, and ring.
- Rotates through loading messages every 2 seconds: "Loading Data..." → "Fetching PYQs..." → "Processing Request..." → "Almost Ready..."
- Includes an animated progress bar and responsive design adjustments.

#### ErrorPage (`Error.jsx`)
- Reusable error display accepting an optional `msg` prop.
- Shows a pulsing warning icon, gradient error title, message details, and help text.
- Dark themed with red accent colors. Responsive for smaller screens.

#### NavBar (`NavBar.jsx`)
- Fixed navigation with three links: logo/home (`/`), Upload (`/upload`), Profile (`/profile`).
- Uses `NavLink` from react-router-dom with `isActive` class for highlighting the current route.
- Includes SVG icons for the logo and profile link.

### 5.8 Styling Approach

- **Global:** `index.css` sets black background (`#000000`), CSS reset, and `Segoe UI` font family.
- **Component-level:** CSS Modules (`*.module.css`) for scoped styling on Form, DataArea, UploadForm, LoginForm, NavBar.
- **Inline + embedded:** `LoadingPage` and `ErrorPage` use inline styles with embedded `<style>` tags for `@keyframes` animations.
- **Design language:** Dark mode, indigo/purple accent gradient (`#6366f1`, `#8b5cf6`), glassmorphism-style cards with glows and shadows, micro-animations.

---

## 6. End-to-End Workflow Narratives

### 6.1 PYQ Download Workflow

1. **User** navigates to `/` → sees the download form with cascading dropdowns.
2. **User** selects semester → if 1 or 2, branch auto-sets to "Common For All Branches"; otherwise selects from 9 engineering branches.
3. **User** selects branch → subject dropdown populates from `information.js`.
4. **User** selects "From Year" and "To Year" (dropdown or manual entry).
5. **User** clicks "Submit" → button shows "Sending Request...", form builds query string.
6. **Frontend** calls `fetchUrls(queryString)`, sends GET request with parameters.
7. **UI** shows `LoadingPage` with animated spinner and rotating messages. Page auto-scrolls to the loading indicator.
8. **Backend** (`DownloadPYQView`) parses query params, calls `get_pdfs()` to scan the filesystem for matching PDFs within the year range, then calls `compile_pdfs()` to merge them into a single PDF.
9. **Backend** returns the merged PDF as a `FileResponse` attachment.
10. **Frontend** receives the response, `DataArea` renders a download card showing the file name and a "Download File" button.
11. **User** clicks "Download File" → `DataArea` fetches the URL as a blob, creates an object URL, and triggers a browser download. Button animates through downloading → completed states.
12. On any error → `ErrorPage` renders with the error message; page auto-scrolls to it.

### 6.2 PYQ Upload Workflow

1. **User** navigates to `/upload` → sees the upload form.
2. **User** selects semester, branch, subject (cascading logic), session (April/December), and year.
3. **User** selects file type (PDF or Images):
   - **PDF mode:** Single file, ≤5MB. File input accepts `.pdf` only.
   - **Image mode:** Up to 6 files, ≤2MB each, PNG/JPG only. Multiple file selection enabled.
4. **User** selects file(s). Client-side validation runs immediately (size, type, count). Errors displayed inline.
5. **User** clicks "Upload" → button shows "Uploading...", submit and reset are disabled.
6. **If images:** `createPdfFromImages()` converts them to a single PDF client-side using pdf-lib.
7. **Frontend** builds `FormData` with branch, semester, session, subject, year, and the PDF file. Calls `uploadData(formData)`.
8. **Backend** (`UploadPYQView`) validates fields, checks file extension and size (≤10MB), normalizes branch/session, builds filesystem path, checks for duplicate, writes file in chunks, appends metadata to `pyqs.json`.
9. **Backend** returns HTTP 201 Created with `{success: true, path: "..."}`.
10. **Frontend** alerts "File Uploaded Successfully", resets form.
11. On error → `ErrorPage` renders below the form; page auto-scrolls to it.

### 6.3 User Registration Workflow

1. **User** navigates to `/profile` → sees sign-in form by default.
2. **User** clicks "Sign Up" toggle → form switches to registration mode.
3. **User** enters email, roll number, and password.
4. **Frontend** submits `POST /auth/register/` with `{rno, email, name, password}`.
5. **Backend** validates roll number format (`0201XX######`), checks email uniqueness, hashes password, creates user with `contributor` role.
6. **Backend** generates JWT pair, returns `{access, refresh, user: {rno, email, name, role}}` (HTTP 201).

### 6.4 User Login Workflow

1. **User** navigates to `/profile` → sees sign-in form.
2. **User** enters roll number (or email) and password.
3. **Frontend** submits `POST /auth/login/` with `{rno, password}`.
4. **Backend** (SimpleJWT) authenticates credentials against the User model.
5. **Backend** returns `{access, refresh}`.

### 6.5 Django Admin Workflow

1. **Admin** navigates to `/admin/` → Django login page.
2. **Admin** authenticates with superuser credentials.
3. **Admin panel** shows users with columns: rno, email, name, role, is_staff.
4. **Admin** can filter by role, search by rno/email.
5. **Admin** can create, edit, and manage users through fieldsets (rno, personal info, permissions).
6. Custom template shows welcome message with admin's actual name.

---

## 7. Developer Mental Model

### 7.1 Design Patterns

| Pattern | Where | Description |
|---|---|---|
| **SPA + API** | Overall architecture | React SPA served by Django, communicating via REST API |
| **File-based storage** | `utils/storage.py` | PYQs stored on filesystem with structured directory hierarchy; metadata in JSON flat-file |
| **Service/Utility layer** | `utils/` package | Business logic extracted from views into reusable utility functions |
| **Custom User model** | `core/models.py` | AbstractBaseUser with domain-specific fields (roll number as login) |
| **Cascading form controls** | `Form.jsx`, `UploadForm.jsx` | Dropdown selections dynamically filter subsequent dropdown options |
| **CSS Modules** | Frontend components | Scoped, per-component styling avoiding global class collisions |
| **Component composition** | `DownloadPage.jsx` | Parent orchestrates conditional rendering of child components based on state |
| **Client-side file processing** | `imgTopdf.js` | Image-to-PDF conversion happens in the browser before upload |

### 7.2 Conventions

- **Backend:**
  - Single Django app (`core`) for all models and views.
  - `utils/` for non-view business logic.
  - JSON flat-file (`pyqs.json`) for upload metadata rather than a database table.
  - File naming: `{year}_{Session}.pdf` (e.g., `2024_April.pdf`).
  - Directory structure: `{BRANCH}/sem{N}/{SUBJECT_CODE}/`.
  - API routes grouped by purpose: `auth/*` for authentication, `upload/` and `download/` for PYQ operations.

- **Frontend:**
  - Feature-based component folders (e.g., `DownloadPage/`, `UploadPage/`).
  - Each folder: JSX component + co-located CSS Module.
  - Static reference data centralized in `information.js`.
  - API calls centralized in `http.js`.
  - Plain JavaScript with JSX (no TypeScript).

### 7.3 Extension Points

- **Adding a new branch:** Add entry to `branches` in `information.js`, add subject mapping in `subjects` for each semester.
- **Adding a new API endpoint:** Create view in `core/views.py`, register URL in `core/urls.py`.
- **Adding new permissions:** Create a custom DRF permission class checking `request.user.role`, apply to relevant views.
- **Switching to database-backed metadata:** Create a PYQ model in `core/models.py` with the same fields as the JSON records. Replace `load_metadata`/`save_metadata` with ORM calls.
- **Adding a new exam session:** Update `normalize_session()` in `utils/storage.py` to accept the new value.

---

## 8. AI Quick Reference Summary

### 8.1 Key Modules

| Module | Path | Role |
|---|---|---|
| Django Settings | `backend/settings.py` | DB, JWT, apps, static files, templates config |
| URL Router | `backend/urls.py` + `core/urls.py` | API routes + SPA catch-all |
| User Model | `core/models.py` | Custom user with rno as primary identifier |
| API Views | `core/views.py` | Register, Upload, Download, Serve React |
| Serializer | `core/serializers.py` | User registration validation |
| User Manager | `core/managers.py` | User creation logic (password hashing) |
| File Storage | `utils/storage.py` | Path building, metadata JSON I/O |
| PDF Finder | `utils/finder.py` | Filesystem scan for matching PYQs |
| PDF Merger | `utils/pdf.py` | Merge PDFs with pikepdf |
| React Entry | `frontend/src/App.jsx` | Router definition, 4 routes |
| API Client | `frontend/src/http.js` | `fetchUrls()` and `uploadData()` |
| Subject Catalog | `frontend/src/information.js` | Branches, semesters, subjects data |
| Image→PDF | `frontend/src/imgTopdf.js` | Client-side image conversion |
| Download Form | `frontend/src/components/DownloadPage/Form.jsx` | Cascading filter form |
| Upload Form | `frontend/src/components/UploadPage/UploadForm.jsx` | Upload form with file handling |
| Login Form | `frontend/src/components/LoginForm/LoginForm.jsx` | Authentication form |

### 8.2 Main Flows

| Flow | Entry Point | Key Files |
|---|---|---|
| **Download PYQ** | `GET /download/` | `views.py` → `finder.py` → `pdf.py` |
| **Upload PYQ** | `POST /upload/` | `views.py` → `storage.py` |
| **Register** | `POST /auth/register/` | `views.py` → `serializers.py` → `managers.py` |
| **Login** | `POST /auth/login/` | SimpleJWT `TokenObtainPairView` |
| **Admin** | `/admin/` | `admin.py` |

### 8.3 Important Files (Priority Reading Order)

1. `core/views.py` — All API logic
2. `core/models.py` — Data model
3. `frontend/src/App.jsx` — Frontend routing
4. `frontend/src/http.js` — API integration layer
5. `frontend/src/information.js` — Static data catalog
6. `utils/storage.py` — File storage strategy
7. `utils/finder.py` — PDF discovery logic
8. `backend/settings.py` — Configuration reference
9. `frontend/src/components/DownloadPage/Form.jsx` — Most complex frontend component
10. `frontend/src/components/UploadPage/UploadForm.jsx` — Upload UI logic

---

> **Document generated:** 2026-02-21
> **Codebase analyzed:** `getpyqjec` (complete repository)
