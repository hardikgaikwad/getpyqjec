# PYQ Website — AI-Readable Technical Document

This document describes the **getpyqjec** project (Previous Year Question papers website for JEC college) as a coherent, production-style system. It focuses **only** on stable, fully implemented workflows and omits discussion of incomplete, experimental, or non-integrated pieces.

---

## 1. Project Overview

### Purpose
- **Primary:** Allow students to **download** previous year question papers (PYQs) as PDFs, for specific subjects or bundles across year ranges, **without any login requirement**.
- **Secondary:** Allow **authenticated contributors** to **upload** new PYQ PDFs with structured metadata so they become immediately available for download to all students.

### Main Features (Stable Scope)
| Feature | Description |
|--------|-------------|
| Public PYQ download | Students can fetch merged PDFs for a given branch, semester, subject (or all subjects), and year range. |
| Secure PYQ upload | Authenticated users can upload a new PYQ PDF with branch, semester, subject code, year, and exam session. |
| JWT-based authentication | Register, login, and refresh tokens using JSON Web Tokens for API access. |
| Admin management | Custom user model with admin integration for managing contributors and roles. |

### Tech Stack
- **Backend:** Django 6, Django REST Framework, Simple JWT, SQLite.
- **Storage:** Local file system for PDF storage under `data/files/`, plus JSON metadata under `data/metadata/pyqs.json`.
- **Frontend:** React + Vite single-page application (SPA) served by Django, used as the main user interface for browsing and interacting with the system.

### Deployment Overview
- Django runs the **REST API** and also serves the **built SPA** from `frontend/dist` via the template and static file configuration.
- The SPA is compiled with Vite (`npm run build`) and deployed alongside the backend, providing a seamless single-origin application for both UI and API.

---

## 2. High-Level Architecture

### Frontend–Backend–Data Flow
```
[Browser SPA]  ←HTTP→  [Django API + SPA host]
                             ↓
                   [SQLite: Users & auth]
                             ↓
                   [File system: PYQ PDFs + metadata]
```

- The **React SPA** presents the user interface for selecting filters and initiating downloads or uploads.
- The **Django API** exposes stable endpoints for:
  - Authentication (register, login, refresh).
  - PYQ upload (protected).
  - PYQ download (public).
- The **data layer** is split between:
  - **SQLite** for user accounts, authentication, and roles.
  - **File system + JSON** for actual PDF content and associated PYQ metadata.

### External Services
- No external APIs or third-party services are required; the system is self-contained.

### Authentication Flow Overview
- Clients authenticate using **JWTs**:
  - POST credentials to obtain a **refresh + access** token pair.
  - Use the **access token** in `Authorization: Bearer <token>` for protected API calls.
  - Refresh access tokens via a dedicated refresh endpoint.
- Only the **upload** functionality is protected; **download and auth endpoints** are public.

---

## 3. Folder Structure Explanation

```
getpyqjec/
├── backend/
│   ├── settings.py      # Core Django/DRF/JWT configuration and SPA/static integration
│   ├── urls.py          # Project URL routing, including API and SPA fallback
│   ├── wsgi.py, asgi.py # Deployment entry points
├── core/                # Main application logic
│   ├── models.py        # Custom User model (rno, role, etc.)
│   ├── views.py         # API endpoints and SPA entry view
│   ├── urls.py          # Auth and PYQ API routes
│   ├── serializers.py   # Registration serializer
│   ├── managers.py      # UserManager for creating users/superusers
│   ├── admin.py         # Django admin configuration for User
│   └── migrations/      # Database schema for the custom user
├── utils/               # Backend utilities
│   ├── storage.py       # Directory layout, metadata file handling, normalization
│   ├── finder.py        # Discovery and filtering of stored PYQ PDFs
│   └── pdf.py           # Merging of multiple PDFs into one stream
├── data/                # Runtime-created storage (not versioned)
│   ├── files/           # Branch/semester/subject structured PDF storage
│   └── metadata/
│       └── pyqs.json    # PYQ metadata array
├── frontend/            # React SPA source
│   ├── src/             # Routing, page components, and UI logic
│   ├── vite.config.js   # Build configuration (outputs to dist/)
│   └── package.json     # Frontend dependencies and scripts
├── manage.py
└── requirements.txt
```

**How directories interact:**
- `backend/settings.py` and `backend/urls.py` integrate the **core** app and serve the built SPA under the same origin as the API.
- `core/views.py` uses the helpers in `utils/` to:
  - Resolve file-system locations for PDFs.
  - Maintain the JSON metadata store.
  - Merge and stream PDFs back to clients.
- `frontend/` is responsible for the entire browser experience (routing, forms, feedback) while delegating data operations to the REST API.

---

## 4. Backend Deep Analysis

### API Routes and Responsibilities

| Method | Path | View | Permission | Responsibility |
|--------|------|------|------------|----------------|
| POST | `/auth/register/` | `RegisterView` | Public | Create a new user and immediately return JWT tokens and profile data. |
| POST | `/auth/login/` | Simple JWT `TokenObtainPairView` | Public | Authenticate a user and issue JWT refresh + access tokens. |
| POST | `/auth/refresh/` | Simple JWT `TokenRefreshView` | Public | Issue a new access token from a valid refresh token. |
| POST | `/upload/` | `UploadPYQView` | Authenticated | Accept a new PYQ PDF with metadata, persist it, and register it in metadata. |
| GET | `/download/` | `DownloadPYQView` | Public | Generate a merged PDF of one or more PYQs based on query filters and stream it to the user. |

All endpoints use consistent, well-defined parameters, and the upload/download flows are fully implemented in terms of validation, storage, and response handling.

### Middleware Chain
- Standard Django middleware:
  - Security, sessions, common HTTP utilities.
  - CSRF, authentication, message handling, clickjacking protection.
- DRF + Simple JWT:
  - Authentication is enforced at the **view level** using `JWTAuthentication`.

### Authentication and Authorization Flow
- **Custom User Model:**
  - The login identifier is **roll number (`rno`)**, validated by a strict regex.
  - Users also have `email`, `name`, and a `role` field (`admin` or `contributor`).
- **Registration:**
  - Uses `RegisterSerializer` backed by `UserManager.create_user`.
  - On success, a refresh + access token pair is returned along with user details.
- **Login & Refresh:**
  - Implemented via Simple JWT’s standard views; they issue and refresh tokens based on the custom user model and its `USERNAME_FIELD`.
- **Protected Operations:**
  - Uploading PYQs requires a valid JWT access token.
  - Public operations (download and authentication itself) remain accessible without prior login.

### Database Schemas and Relationships
- **User (`core.User`):**
  - Fields: `rno` (unique identifier), `email`, `name`, `role`, and standard Django auth fields (`password`, `is_active`, `is_staff`, `is_superuser`, `date_joined`, etc.).
  - Integrated with Django’s permission and group system and exposed in the admin.
- **PYQ Content:**
  - Stored outside the database in a structured **directory tree**:
    - `data/files/<BRANCH>/sem<SEMESTER>/<SUBJECT_CODE>/<YEAR>_<SESSION>.pdf`
  - A JSON metadata file `data/metadata/pyqs.json` maintains an array of records:
    - `branch`, `semester`, `subject_code`, `year`, `exam_session`, `file_path`, `uploaded_by`, `uploaded_at`.

There are no complex relational joins; the system relies on directory conventions and metadata lookups.

### Storage and Metadata Logic (`utils.storage`)
- Ensures the **base directory structure** exists (files + metadata).
- Provides **normalization** for:
  - Branch identifiers (e.g., uppercase, trimmed).
  - Exam sessions (`April` / `December` enforced).
- Builds consistent directory and file paths based on metadata:
  - `build_dir_path(branch, semester, subject_code)`
  - `build_file_path(branch, semester, subject_code, year, session)`
- Handles **metadata lifecycle**:
  - `load_metadata()` reads the JSON list.
  - `save_metadata()` writes the updated list with pretty indentation.

### PDF Discovery (`utils.finder`)
- Locates all PDFs for a given **branch**, **semester**, **subject scope**, and **year range**:
  - Can be restricted to a single `subject_code` or expanded to “all subjects” in a semester.
- Filters by year bounds and ensures only valid `YEAR_SESSION.pdf` filenames are considered.
- Returns results **sorted** by subject code, year, and session ordering, so the merged PDF has a deterministic, logical sequence.

### PDF Compilation (`utils.pdf`)
- Uses `pikepdf` to:
  - Open each source PDF.
  - Append their pages into a single in-memory document.
- Produces a `BytesIO` stream suitable for Django’s `FileResponse`, enabling efficient streaming without writing an intermediate merged file to disk.

### Upload Validation Workflow
1. Authenticate the user via JWT (enforced by `IsAuthenticated`).
2. Extract multipart fields: branch, semester, subject code, year, exam session, and PDF file.
3. Validate:
   - All required fields present.
   - File extension is PDF.
   - File size does not exceed the configured maximum.
   - Branch and exam session values are normalized and valid.
4. Build the target directory and file path using `utils.storage`.
5. If the file already exists at that path, abort with a conflict response.
6. Stream the uploaded file contents to disk.
7. Append a new entry into `pyqs.json` including uploader identity and timestamp.
8. Return a success response containing the canonical stored path.

### Download Query Workflow
1. Accept query parameters: `branch`, `semester`, `subject_code` (or “all”), `from_year`, and `to_year`.
2. Validate presence and type of parameters (e.g., integer conversion for semester and year bounds).
3. Use `utils.finder.get_pdfs(...)` to locate all matching PDF paths.
4. If no files are found, return a 404-style error response.
5. Use `utils.pdf.compile_pdfs(paths)` to produce a single, ordered combined PDF.
6. Stream the result via `FileResponse` with a descriptive filename constructed from the filter values.

---

## 5. Frontend Deep Analysis

### Routing Architecture
- The SPA uses **React Router** with a single root layout:
  - Root route (`/`) renders a shared layout with a top navigation bar and an `Outlet` for page content.
  - Child routes:
    - Index route for the main **download experience**.
    - An **upload page** for contributors to submit new PYQs.
    - A **profile/auth page** for user authentication tasks.
    - A fallback error boundary for unknown paths.

This routing structure ensures a clean separation between public download, authenticated contributor flows, and profile-related views within a single-page shell.

### State Management
- The frontend uses **local React state hooks** (`useState`, `useEffect`, `useRef`) within each page:
  - Download page:
    - Tracks current filters (branch, semester, subject, years).
    - Tracks loading states and any errors while interacting with the API.
    - Holds the resulting document representation shown in the UI.
  - Upload page:
    - Manages selected files (either raw PDFs or images converted to PDFs).
    - Tracks metadata fields (branch, semester, subject, year, session).
    - Tracks upload in-progress / error states.
  - Auth/profile page:
    - Manages sign-in vs sign-up mode and associated form inputs.

There is **no global store**; all logic is co-located with the components that use it, which simplifies mental modeling for this scale of application.

### Component Hierarchy and Responsibilities
- **Root Layout & Navigation:**
  - A top-level navigation bar with links to:
    - Download page.
    - Upload page.
    - Profile/authentication page.
  - Ensures consistent branding and quick switching between primary workflows.

- **Download Experience:**
  - A **filter form** that exposes:
    - Semester and branch selectors.
    - Subject selector driven by structured curriculum data.
    - From/To year selection, including manual overrides when needed.
  - A **loading view** that provides engaging feedback while the system prepares the requested document.
  - A **result card** that represents the prepared PDF, with a clear “Download” action wired to the underlying HTTP response stream.

- **Upload Experience:**
  - A **structured metadata form** for:
    - Semester, branch, subject, session, and year.
  - A **file input control** that supports:
    - Direct PDF uploads.
    - Multiple image uploads (PNG/JPEG) that are combined into a single PDF using `pdf-lib` in the browser before upload.
  - Client-side validation of:
    - Maximum number of images.
    - Allowed file types.
    - Size constraints per file and for the overall upload.

- **Auth/Profile Experience:**
  - A single page that toggles between “Sign In” and “Sign Up” modes.
  - Forms designed for:
    - Collecting email, roll number, and password for registration.
    - Collecting roll number/email and password for sign-in.
  - Provides the UI foundation to connect to backend auth endpoints and manage tokens on the client side.

### API Integration Strategy (Conceptual)
- The SPA centralizes its HTTP communication in a small API helper module.
- Key patterns:
  - **Download:** Send the currently selected filter parameters to an API endpoint responsible for generating or locating the correct PDF bundle; then initiate a browser download of the resulting file.
  - **Upload:** Construct a `FormData` payload containing both metadata and the prepared PDF file; POST this payload to an authenticated upload endpoint.
  - **Auth:** Provide credentials from the profile/auth page to the auth endpoints to obtain JWT tokens, which in turn can be attached to upload or other protected requests.

This separation keeps React components focused on **user interaction and state**, while the API layer encapsulates low-level HTTP details.

---

## 6. End-to-End Workflow Narratives

All flows below describe **fully implemented backend behavior** and how a typical client (such as the SPA) interacts with it.

### 6.1 User Registration and Authentication

**User Registration:**
1. A new contributor submits a registration form containing `rno`, `email`, `name`, and `password`.
2. The client sends this payload via `POST /auth/register/`.
3. The backend validates the roll number format, uniqueness of `rno` and `email`, and password constraints.
4. A new user record is created with role `contributor` by default.
5. The response includes:
   - A `refresh` token.
   - An `access` token.
   - A `user` object (roll number, email, name, role).

**User Login:**
1. An existing contributor submits `rno` and `password`.
2. The client sends these credentials to `POST /auth/login/`.
3. On success, the backend issues a new `refresh` + `access` token pair.
4. The client persists these tokens (for example in memory or secure storage) and uses the access token for authenticated API calls.

**Token Refresh:**
1. When the access token nears expiry, the client calls `POST /auth/refresh/` with the stored `refresh` token.
2. The backend validates the refresh token and returns a new access token, extending the authenticated session without re-prompting for credentials.

### 6.2 Secure Upload of a New PYQ

1. A logged-in contributor prepares upload metadata:
   - `branch`, `semester`, `subject_code`, `year`, `exam_session`.
2. They select:
   - Either a final PDF file, **or**
   - A set of page images that the client converts into a consolidated PDF using `pdf-lib`.
3. The client constructs a `FormData` object containing:
   - All the metadata fields.
   - The final PDF file under a single file field.
4. The client sends a `POST /upload/` request:
   - With `Authorization: Bearer <access_token>`.
   - With `multipart/form-data` payload.
5. The backend:
   - Authenticates the request via JWT.
   - Normalizes branch and session and parses year and semester.
   - Builds the target path (`data/files/.../<YEAR>_<SESSION>.pdf`).
   - Rejects the upload if a file already exists at that location.
   - Streams the file to disk.
   - Loads `pyqs.json`, appends a metadata record, and saves it back.
6. A success response is returned, confirming that the new PYQ is now part of the system’s catalogue.

### 6.3 Public Download of PYQs

1. A student chooses filters:
   - `branch`, `semester`, `subject_code` **or** “all subjects”, and a year range (`from_year`–`to_year`).
2. The client constructs a query string and sends `GET /download/` with those parameters.
3. The backend:
   - Validates and normalizes the incoming query parameters.
   - Uses `utils.finder.get_pdfs(...)` to determine all matching PDF file paths.
   - If none are found, returns a clear 404-style JSON error.
   - Otherwise, passes the paths to `utils.pdf.compile_pdfs(...)` to build a combined PDF.
4. The combined PDF is streamed back as a `FileResponse`, with a filename reflecting the chosen filters (e.g., `<BRANCH>_sem<SEM>_<SUBJECT_SCOPE>_<FROM>-<TO>.pdf`).
5. The client triggers a browser download, giving the student a single consolidated document.

### 6.4 Access Control and Protected Routes

- **Protected Operations:**
  - Only the upload endpoint requires a JWT access token.
- **Public Operations:**
  - Download and all authentication endpoints remain open to unauthenticated clients.
- This model ensures that **content consumption is frictionless** for students, while **content contribution is gated** behind authenticated contributor accounts.

---

## 7. Developer Mental Model

### How to Think About the Backend
- The backend is a **thin but complete REST API** around three core concerns:
  1. Authentication (register/login/refresh).
  2. PYQ upload (with validation and metadata registration).
  3. PYQ download (with filtering and PDF merging).
- The **custom User model** makes roll number the primary identity, aligning with institutional norms.
- PYQ content is **file-system centric**:
  - The database is only for user accounts.
  - All question paper content and metadata live under the `data/` tree.

### How to Think About the File Layout
- The system treats `(branch, semester, subject_code, year, exam_session)` as the logical primary key of a PYQ.
- That key is mirrored in:
  - The **directory structure** under `data/files/`.
  - Each **metadata record** in `pyqs.json`.
- Finding a PYQ is therefore as simple as:
  1. Using the directory structure and naming convention.
  2. Filtering metadata records for higher-level operations like listing or analytics (if extended).

### How to Think About the Frontend
- The SPA is organized as:
  - A **root shell** for navigation and layout.
  - Distinct pages for download, upload, and profile/auth experiences.
- Each page:
  - Manages its own local state.
  - Delegates HTTP operations to a small API helper module.
  - Uses centralized curriculum/branch/subject data for form options.
- This structure makes it straightforward to:
  - Tweak the visual design without touching API contracts.
  - Add new pages or workflows without disturbing existing routes.

### Extension Points
- **New Metadata or Filters:**
  - Extend the metadata entries in `pyqs.json` and adjust finder logic to filter by new criteria (e.g., exam type, difficulty).
- **Role-Based Permissions:**
  - Introduce custom DRF permission classes to distinguish between admins and contributors for sensitive operations (e.g., deletion or modification of PYQs).
- **Analytics and Reporting:**
  - Build views that read `pyqs.json` to expose stats, such as most frequently uploaded subjects or coverage by year.
- **Client Enhancements:**
  - Add global state (e.g., React Context) to track auth state and surface user-specific UI (like “My uploads”).

---

## 8. AI Quick Reference Summary

### Key Backend Modules
- **`backend/settings.py`**: Configures Django, DRF, Simple JWT, custom user model, and SPA/static directories.
- **`backend/urls.py`**: Wires admin, API URLs, and the SPA catch-all route.
- **`core/models.py`**: Defines the `User` model with `rno` and role.
- **`core/views.py`**:
  - `RegisterView` for sign-up and token issuance.
  - `UploadPYQView` for authenticated PYQ upload.
  - `DownloadPYQView` for public merged PDF download.
  - `react_app` for serving the SPA shell.
- **`core/urls.py`**: Declares `/auth/register/`, `/auth/login/`, `/auth/refresh/`, `/upload/`, `/download/`.
- **`utils/storage.py`**: Normalization, path building, metadata reading/writing.
- **`utils.finder.py`**: Filtering/locating PYQ PDFs given branch/semester/subject/year range.
- **`utils/pdf.py`**: Efficient multi-PDF merge into a single stream.

### Key Frontend Concepts
- **Routing:** Root layout with dedicated pages for download, upload, and profile/auth.
- **Data Integration:** A small HTTP helper module centralizes interaction with the REST API.
- **User Flows:** Rich forms for selecting filters, configuring uploads, and managing authentication inputs.

### Main Stable Flows
- **Authentication:** `/auth/register/` → `/auth/login/` → `/auth/refresh/` for JWT lifecycle.
- **Upload:** Authenticated `POST /upload/` with structured metadata + PDF ⇒ new entry in `data/files/` and `pyqs.json`.
- **Download:** Public `GET /download/?branch=…&semester=…&subject_code=…&from_year=…&to_year=…` ⇒ streamed merged PDF.

### Mental Model in One Sentence
> Think of this system as a Django-powered API that securely curates a structured library of PYQ PDFs on the filesystem, wrapped by a React SPA that provides user-friendly flows for contributors to upload and students to download consolidated question paper bundles.
