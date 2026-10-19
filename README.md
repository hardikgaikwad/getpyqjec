<div align="center">
  <a href="https://www.getpyqjec.in">
    <img src="frontend/src/assets/logo.png" alt="GetPYQ JEC Logo" width="100" />
  </a>
  <h1><a href="https://www.getpyqjec.in">GetPYQJEC</a></h1>
  <p><strong>The Community-Driven Academic Archive for JEC Students</strong></p>
  <p>Built by students, for students — an open platform to download custom PDF bundles and contribute verified question papers across all engineering branches.</p>

  <p>
    <img src="https://img.shields.io/badge/React_19-14121F?style=flat&logo=react&logoColor=61DAFB" alt="React 19" />
    <img src="https://img.shields.io/badge/Vite_7-14121F?style=flat&logo=vite&logoColor=FFD62E" alt="Vite 7" />
    <img src="https://img.shields.io/badge/Django_5.2-14121F?style=flat&logo=django&logoColor=44B78B" alt="Django 5.2" />
    <img src="https://img.shields.io/badge/Cloudflare_R2-14121F?style=flat&logo=cloudflare&logoColor=F38020" alt="Cloudflare R2" />
    <img src="https://img.shields.io/badge/PostgreSQL-14121F?style=flat&logo=postgresql&logoColor=4169E1" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Docker-14121F?style=flat&logo=docker&logoColor=2496ED" alt="Docker" />
  </p>
</div>

<hr/>

## 📖 Table of Contents
1. [Overview](#-overview)
2. [Key Features](#-key-features)
3. [Architecture Diagram](#-architecture-diagram)
4. [Technology Stack](#-technology-stack)
5. [Local Setup Guide](#-local-setup-guide)
    - [Prerequisites](#prerequisites)
    - [Backend Setup](#backend-setup-django)
    - [Frontend Setup](#frontend-setup-react)
6. [Deployment Notes](#-deployment-notes)
7. [Project Structure](#-project-structure)

---

## 🌟 Overview
**[GetPYQJEC](https://www.getpyqjec.in)** is an advanced academic resource platform designed to centralize and organize college examination papers. It solves the chaotic spread of academic materials across messaging groups and drives by providing an ultra-fast, structured search, multi-year PDF compile-and-download system, and a verified community contribution workflow.

* 🌐 **Live Website**: [https://www.getpyqjec.in](https://www.getpyqjec.in)
* ↪️ **Old address**: [https://getpyqjec.vercel.app](https://getpyqjec.vercel.app/) now permanently redirects to the live website.

---

## ✨ Key Features

- 🚀 **Lightning-Fast Modern UI**: Powered by React 19 and Vite 7 with custom Heming typography, sleek responsive controls, and unified `CustomSelect` dropdowns.
- 📱 **One-Screen Forms on Every Device**: The download (landing) and upload pages fit the heading, form and buttons on a single screen from small phones to desktops, with height-aware spacing and a two-column phone layout. Dropdowns open upwards when there's no room below and always stay on screen.
- ☁️ **Cloudflare R2 Cloud Storage**: Zero-egress-fee, S3-compatible cloud object storage via `boto3` for PDF and ID card hosting (local disk storage is used only in development).
- 📑 **In-Browser PDF Merging**: The backend returns short-lived presigned R2 links for the selected papers; the browser downloads them directly from R2 (4 at a time, with progress) and merges them into one PDF with `pdf-lib`. File bytes never pass through the API server. Papers that are missing or fail to download are listed on the result card.
- 📸 **In-Browser Multi-Image to PDF**: Contributors can capture or upload multiple photos/scans of question paper pages and compile them into a single clean PDF in-browser using `pdf-lib`.
- 🎓 **Student Verification Workflow**: Contributor access is protected by an ID-card verification lifecycle, allowing administrators to inspect and verify students before granting paper upload rights.
- 📚 **Unlisted Subject Approval**: When syllabus electives or updated course codes are not yet in the catalog, contributors can request unlisted subjects for admin approval directly into the curriculum.
- 📜 **Paper Upload History & Audit Logs**: Administrators have direct visibility into all community paper submissions, with individual paper audit trails, uploader details, and direct one-click PDF validation links.
- ⚡ **Dynamic Upload Filtering**: Upload forms automatically query existing papers and omit years and sessions where papers are already available to prevent duplicates.
- 🧱 **Database-Enforced Duplicate Prevention**: Uploads are validated (branch, semester, year, session, catalog subject code) and stored with canonical branch names. A unique constraint treats semesters 1 and 2 as one common group, so the same paper can't be stored twice, even under concurrent uploads (returns `409`).
- 🔐 **JWT Authentication & Moderation**: HttpOnly refresh cookie with token rotation and blacklisting on logout, password strength validation, role-based permissions (`IsVerifiedStudent`, `IsAdminUser`), and admin review dashboards.
- 🛡️ **Rate Limiting & Hardening**: Per-IP limits on login, registration, password reset, token refresh, uploads, subject requests and verification submissions (using Cloudflare's `CF-Connecting-IP`). CORS allows only the official domains; production refuses to start without a `SECRET_KEY` and never silently falls back to local storage.
- 📈 **Built-in Request Timing**: Every API response carries a `Server-Timing` header (total time, DB time and query count), visible in browser devtools and logged per request.
- 📬 **Automated Transactional Emails**: Password reset links and verification review results delivered via Resend API (printed directly to console in local development).

---

## 🏗 Architecture Diagram

```text
+-----------------------------------------------------------------------------------------+
|                               Client (React 19 + Vite SPA)                              |
|          - CustomSelect Dropdowns       - Dynamic Year/Session Filter                   |
|          - Student Verification Portal  - In-Browser Multi-Image to PDF (pdf-lib)       |
+--------+----------------------------+-----------------------------+---------------------+
         |                            |                             |
         | HTTP / JSON                | HTTP / JSON                 | Multipart / JSON
         | Auth & Verification        | Query & Search              | Uploads & Download Links
         v                            v                             v
+--------------------+       +--------------------+        +----------------------+
|    Auth & Roles    |       |   PYQ Query Engine |        | Upload & Link Service|
|   (Django / JWT)   |       |   (Django / DRF)   |        |   (Django / boto3)   |
|                    |       |                    |        |                      |
| * Contributor Auth |       | * Existing Options |        | * Validated Uploads  |
| * ID Verification  |       | * Filter by Branch |        | * Presigned R2 Links |
| * Rate Limiting    |       | * Semester/Subject |        |   (/download/links/) |
+--------+-----------+       +--------+-----------+        +--------+-------------+
         |                            |                             |
         |                            v                             |
         |             +------------------------------+             |
         +------------>| Database (PostgreSQL/SQLite) |<------------+
                       | - Users & Permissions        |
                       | - PYQ Catalog Indexes        |
                       | - Student Verifications      |
                       | - Unlisted Subject Requests  |
                       +------------------------------+
                                      |
                                      v
                       +------------------------------+
                       |   Cloudflare R2 / Storage    |
                       |                              |
                       |  Bucket: getpyqjec-pyqs      |
                       |  Bucket: getpyqjec-verif...  |
                       |  (Dev only: local ./media/)  |
                       +------------------------------+
                                      ^
                                      | Presigned GET (direct, no API hop)
                       +------------------------------+
                       |  Browser: fetch papers and   |
                       |  merge into one PDF (pdf-lib)|
                       +------------------------------+
```

---

## 💻 Technology Stack

### Frontend
* **React 19**: Modern component-driven UI architecture.
* **Vite 7**: Rapid development tooling, hot-module replacement (HMR), and production asset bundling.
* **React Router DOM 7**: Client-side single-page application routing with code splitting.
* **pdf-lib** (lazy-loaded): In-browser merging of downloaded papers and multi-image scan to PDF compilation.
* **Custom Design System**: Bespoke vanilla CSS tokens, responsive layouts, Heming typography, and unified select menus.

### Backend
* **Django 5.2 (LTS) & Django REST Framework (DRF)**: High-performance RESTful API endpoints.
* **Simple JWT**: Token-based authentication with secure cookie handling, refresh-token rotation and blacklisting.
* **DRF Throttling**: Scoped, per-IP rate limits on sensitive endpoints.
* **Cloudflare R2 (`boto3`) & Local Disk Storage**: Object storage for papers and verification media, with presigned download links; local disk storage in development.
* **Pikepdf**: Used only by the legacy server-side `/download/` endpoint, which is kept temporarily for old clients and will be removed.
* **Resend**: Transactional emails for password resets and verification approvals with automatic terminal console fallback.
* **WhiteNoise**: Direct static file serving for containerized environments.
* **PostgreSQL / SQLite**: Relational database with composite indexes (`pyq_lookup_idx`) and a functional unique constraint (`pyq_unique_paper`). Connection health checks keep pooled NeonDB connections reliable.
* **Gunicorn (gthread)**: 2 workers × 4 threads in production.

---

## 🚀 Local Setup Guide

You can run GetPYQ JEC locally using either **Docker (recommended for instant 1-command setup)** or manual setup.

> [!TIP]
> **Zero Cloud Keys Required for Local Development!**  
> The application automatically falls back to local SQLite (`db.sqlite3`), local disk file storage (`media/`), and console email output. You don't need Cloudflare R2, NeonDB, or Resend credentials to contribute!

---

### Option A: One-Command Quickstart (Docker — Recommended)

With [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed, run:

```bash
docker compose up --build
```

* **Frontend**: [http://localhost:5173](http://localhost:5173) (Vite with hot-module reload)
* **Backend API**: [http://localhost:8000](http://localhost:8000) (Django with auto-reload)
* **Admin Panel**: [http://localhost:8000/admin](http://localhost:8000/admin)

To populate the database with sample users and papers, open a second terminal and run:
```bash
docker compose exec backend python manage.py seed_dev_data
```

---

### Option B: Manual Setup (Python + Node.js)

#### Prerequisites
* [Python 3.10+](https://www.python.org/downloads/)
* [Node.js 18+](https://nodejs.org/) & npm
* [Git](https://git-scm.com/)

#### 1. Backend Setup (Django)

1. **Clone the repository**
   ```bash
   git clone https://github.com/hardikgaikwad/getpyqjec.git
   cd getpyqjec
   ```

2. **Create and activate a virtual environment**
   * Windows:
     ```powershell
     python -m venv venv
     venv\Scripts\activate
     ```
   * macOS / Linux:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up Environment Variables**
   Copy `.env.example` to `.env` (comes with `CONTRIBUTOR_MODE=True`, no cloud keys needed):
   * Windows: `copy .env.example .env`
   * macOS / Linux: `cp .env.example .env`

5. **Apply database migrations**
   ```bash
   python manage.py migrate
   ```

6. **Seed sample data (Users, subjects & sample PDF papers)**
   ```bash
   python manage.py seed_dev_data
   ```

7. **Run the development server**
   ```bash
   python manage.py runserver
   ```
   *Backend running at `http://127.0.0.1:8000/`*

#### 2. Frontend Setup (React)

In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
*Frontend running at `http://localhost:5173/`*

---

## 👥 Seed Accounts & Demo Data for Testing

Running `python manage.py seed_dev_data` provides ready-to-use accounts:

| Role | Enrollment / Roll No. | Email | Password | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `0201IT211001` | `admin@jecjabalpur.ac.in` | `admin123` | Verified (Access to `/admin`, unlisted subjects & moderation) |
| **Student** | `0201CS221045` | `student@jecjabalpur.ac.in` | `student123` | Verified (Can upload PYQs) |
| **Pending Student** | `0201ME231012` | `pending@jecjabalpur.ac.in` | `student123` | Pending Review (Mock ID card generated for verification review) |

> [!NOTE]
> When logging in on the frontend, enter the **Enrollment / Roll No.** and **Password**.

### 📄 Sample Papers for Download & Merge Testing
Binary PDFs are gitignored to keep repository clones lightweight. The seed command **programmatically generates 12 real 1-page sample A4 PDFs** under `./media/getpyqjec-pyqs/` so you can immediately test paper browsing, merging, and downloading:
* **CSE - Semester 4**: Database Management Systems (`CS42`) — 2021, 2022, 2023
* **CSE - Semester 3**: Energy & Environmental Engineering (`CH32`) — 2021, 2022, 2023
* **IT - Semester 3**: Energy & Environmental Engineering (`CH32`) — 2021, 2022, 2023
* **ME - Semester 3**: Mathematics-III (`MA31`) — 2021, 2022, 2023

### 📋 Sample Unlisted Subject Request for Moderation Testing
The seed command also creates a sample unlisted subject request for **`CS508`** (*Cloud Computing & DevOps*) in `pending` status. This allows you to immediately test the admin approval workflow at `/admin/unlisted-subjects`.

---

## 🤝 Contributing

We welcome contributions from everyone! Please read our [CONTRIBUTING.md](CONTRIBUTING.md) guide for details on:
* Setting up your development environment
* Git workflow & branch naming conventions
* Running automated test suites (`python manage.py test core`)
* Opening Pull Requests

---

## 📄 License

This project is licensed under the terms of the [MIT License](LICENSE).

---

## 🚢 Deployment Notes

Production runs the React build on Vercel, the Django API on Render (Docker), PostgreSQL on NeonDB and files on Cloudflare R2. A few settings matter for the features above (set in each platform's environment settings; never commit values):

* **R2 bucket CORS**: The PYQ bucket must allow `GET` from the site origins (`https://www.getpyqjec.in`, `https://getpyqjec.in`), because browsers download papers straight from R2.
* **`DEBUG=False` and `SECRET_KEY`**: Required in production; the app refuses to start without a `SECRET_KEY` when debug is off.
* **`CORS_ALLOWED_ORIGINS`**: Optional comma-separated extra origins (e.g. a preview deployment). Only `*.getpyqjec.in` is allowed by pattern.
* **`SECURE_HSTS_SECONDS`**: HSTS max-age (defaults to 1 hour; raise it once HTTPS is confirmed everywhere).
* **Migrations** run automatically when the container starts. Before deploying a migration that adds constraints, take a NeonDB branch snapshot.
* **Benchmarking**: `scripts/bench.py` measures cold and warm latency (p50/p95/p99) of API endpoints. Run it against local or staging, not production.

---

## 📂 Project Structure

```text
getpyqjec/
├── backend/               # Django project settings, WSGI, and root routing
├── core/                  # Main DRF app: models, views, serializers, tests, migrations
│   ├── academics.py       # Shared branch/semester rules and upload validation
│   ├── middleware.py      # Server-Timing header and request logging
│   ├── throttling.py      # Per-IP rate limiting behind Cloudflare
│   └── management/        # Custom management commands (seed_dev_data)
├── frontend/              # React single-page application
│   ├── public/            # Static assets (official logo favicon)
│   ├── src/               # React components, CustomSelect, AuthContext, HTTP layer
│   │   ├── assets/        # Official brand logo (logo.png) & Heming variable font
│   │   ├── components/    # DownloadPage, UploadPage, VerificationPage, UnlistedSubjectApproval, UploadHistory
│   │   ├── hooks/         # useSubjects: session-cached subject lists
│   │   ├── store/         # Global authentication and verification state
│   │   ├── http.js        # Centralized API fetch methods
│   │   ├── pdfMerge.js    # Downloads papers from R2 and merges them in the browser
│   │   └── imgTopdf.js    # Client-side multi-image to PDF compiler
│   └── package.json       # Frontend scripts and dependencies
├── utils/                 # Utilities: Cloudflare R2 / Local storage and Resend email service
├── scripts/               # bench.py latency benchmark
├── templates/             # Custom HTML templates and admin overrides
├── Dockerfile             # Production container image definition
├── docker-compose.yml     # Local one-command development environment
├── render.yaml            # Render deployment blueprint
├── requirements.txt       # Backend Python dependencies
├── .env.example           # Environment variables template
├── CONTRIBUTING.md        # Contributor guide and workflow instructions
├── LICENSE                # MIT License
└── manage.py              # Django management CLI
```
