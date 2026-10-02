# Contributing to GetPYQ JEC

First off, thank you for considering contributing to **GetPYQ JEC**! 🎉

GetPYQ JEC is an open-source, student-led platform providing previous year question papers for Jabalpur Engineering College students. Whether you are fixing a typo, resolving a bug, improving UI/UX, or adding new features, your help is warmly welcomed!

---

## 🧭 Table of Contents
1. [Code of Conduct](#code-of-conduct)
2. [Local Development Setup](#local-development-setup)
   - [Option A: Docker (Recommended - One Command)](#option-a-docker-recommended)
   - [Option B: Manual Setup (Python + Node.js)](#option-b-manual-setup)
3. [Zero Cloud Keys Required (Local Fallbacks)](#zero-cloud-keys-required-local-fallbacks)
4. [Seeding Sample Data](#seeding-sample-data)
5. [Git Workflow & Branching Strategy](#git-workflow--branching-strategy)
6. [Commit Conventions](#commit-conventions)
7. [Running Tests](#running-tests)
8. [Submitting a Pull Request](#submitting-a-pull-request)

---

## 📜 Code of Conduct
We are committed to providing a friendly, safe, and welcoming environment for everyone, regardless of experience level, background, or identity. Please be respectful, constructive, and collaborative in all issues, pull requests, and discussions.

---

## 💻 Local Development Setup

You do **not** need Cloudflare R2 credentials, a NeonDB PostgreSQL account, or a Resend API key to develop locally. The application automatically falls back to local SQLite, local disk storage, and console email output.

### Option A: Docker (Recommended)

If you have [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed, you can start the entire stack with a single command:

```bash
docker compose up --build
```

* **Frontend**: [http://localhost:5173](http://localhost:5173) (Vite with hot-module reload)
* **Backend API**: [http://localhost:8000](http://localhost:8000) (Django with auto-reload)
* **Admin Panel**: [http://localhost:8000/admin](http://localhost:8000/admin)

To seed demo data while Docker is running:
```bash
docker compose exec backend python manage.py seed_dev_data
```

---

### Option B: Manual Setup

If you prefer running directly on your host machine:

#### Prerequisites
* **Python 3.10+**
* **Node.js 18+** & npm
* **Git**

#### 1. Backend Setup (Django)
```bash
# 1. Create and activate a virtual environment
python -m venv venv

# Windows (PowerShell):
venv\Scripts\Activate.ps1
# macOS / Linux:
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Create .env from template (no cloud keys needed for local development!)
copy .env.example .env    # Windows
cp .env.example .env      # macOS / Linux

# 4. Apply database migrations
python manage.py migrate

# 5. Populate sample data (users, subjects, papers)
python manage.py seed_dev_data

# 6. Start the backend server
python manage.py runserver
```
*Backend runs on `http://127.0.0.1:8000`.*

#### 2. Frontend Setup (React / Vite)
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 🛡️ Zero Cloud Keys Required (Local Fallbacks)

GetPYQ JEC is designed for seamless local onboarding:
1. **Database**: When `DATABASE_URL` is omitted in `.env`, Django automatically uses local `db.sqlite3`.
2. **File Storage (Cloudflare R2 Fallback)**: If R2 credentials are missing, uploads and downloads automatically save to your local `media/` directory.
3. **Emails (Resend Fallback)**: In local development (`DEBUG=True`), OTP and verification emails are printed directly to your terminal console instead of attempting to send over the internet.

### ⚙️ What is `CONTRIBUTOR_MODE`?
In `.env.example`, you will notice `CONTRIBUTOR_MODE=True`.
- **Automatic Fallback (Zero Config)**: Even if you do **not** set `CONTRIBUTOR_MODE=True`, the project automatically falls back to local SQLite, local disk storage, and console emails whenever cloud credentials (`DATABASE_URL`, `R2_ACCESS_KEY_ID`, `RESEND_API_KEY`) are omitted from `.env`.
- **Force Local Override**: If you are a maintainer or contributor who *does* have production cloud credentials in your `.env` file, setting `CONTRIBUTOR_MODE=True` acts as a master switch—forcing Django to ignore remote NeonDB/R2 and use local SQLite and disk storage without needing to delete your remote keys.

---

## 🧪 Seeding Sample Data & Demo PDFs

To avoid testing with an empty database, run the built-in seed command:

```bash
python manage.py seed_dev_data
```

### 📄 How Demo PDFs Work (Generated on the Fly)
To keep the git repository lightweight and fast to clone, **raw binary files (PDFs, images) are gitignored and never committed to GitHub**. 

Instead, `python manage.py seed_dev_data` **programmatically generates 12 real 1-page sample A4 PDFs** and a demo student ID card image directly on your local disk under `./media/`.

You can immediately test paper browsing, merging, and downloading for the following subjects:

| Branch | Semester | Subject Code | Subject Name | Years Available |
| :--- | :---: | :---: | :--- | :---: |
| **CSE** | 4th Sem | `CS42` | Database Management Systems | 2021, 2022, 2023 |
| **CSE** | 3rd Sem | `CH32` | Energy & Environmental Engineering | 2021, 2022, 2023 |
| **IT** | 3rd Sem | `CH32` | Energy & Environmental Engineering | 2021, 2022, 2023 |
| **ME** | 3rd Sem | `MA31` | Mathematics-III | 2021, 2022, 2023 |

### 👥 Seed Accounts Created
* **Admin Account**: Roll No: `0201IT211001` | Email: `admin@jecjabalpur.ac.in` | Password: `admin123` (Access to moderation, unlisted subjects & admin APIs)
* **Verified Student**: Roll No: `0201CS221045` | Email: `student@jecjabalpur.ac.in` | Password: `student123` (Access to upload PYQs)
* **Pending Verification Student**: Roll No: `0201ME231012` | Email: `pending@jecjabalpur.ac.in` | Password: `student123` (Includes a generated mock ID card under `media/getpyqjec-verifications/` for testing admin approval)
* **Sample Subject Request**: A mock unlisted subject request (`CS508 - Cloud Computing & DevOps`) ready for approval testing in the admin menu.

---

## 🌿 Git Workflow & Branching Strategy

We follow the standard **GitHub Flow**:

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/<your-username>/getpyqjec.git
   cd getpyqjec
   ```
3. **Create a descriptive feature branch** off `main`:
   ```bash
   git checkout -b feat/your-feature-name
   # or for bug fixes:
   git checkout -b fix/issue-description
   ```
4. **Make your changes** in focused, well-documented commits.
5. **Keep your branch updated** with upstream `main`:
   ```bash
   git remote add upstream https://github.com/hardikgaikwad/getpyqjec.git
   git fetch upstream
   git rebase upstream/main
   ```

---

## 📝 Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

* `feat: add filter by exam session in search`
* `fix: correct navbar blur animation on mobile touchscreens`
* `docs: update setup instructions in README`
* `refactor: simplify token refresh in http.js`
* `test: add unit tests for subject approval API`

---

## 🧪 Running Tests

Always ensure existing tests pass before submitting a Pull Request:

### Backend Tests
```bash
python manage.py test core
```

### Frontend Build & Lint Check
```bash
cd frontend
npm run build
```

---

## 🚀 Submitting a Pull Request

1. Push your branch to your GitHub fork:
   ```bash
   git push origin feat/your-feature-name
   ```
2. Navigate to your forked repository on GitHub (`https://github.com/<your-username>/getpyqjec`).
3. You will see a banner with **"Compare & pull request"** (or click the **"Contribute"** dropdown → **"Open pull request"**).
4. Verify that the **base repository** is set to `hardikgaikwad/getpyqjec` (`main`) and the **head repository** is your fork and feature branch.
5. **PR Title**: Use conventional commit format (e.g., `feat: support dark mode toggle`).
6. **Description**:
   - What changed and why?
   - Any relevant issue numbers (`Fixes #12`).
   - Screenshots or recordings if UI changes were made.
7. Ensure all test checks pass. Maintainers will review your PR and provide feedback!
> [!NOTE]
> *Seeing ❌ Vercel — Authorization required to deploy on your PR?*
> Don't worry! This is completely normal for external contributors. Vercel simply pauses the live preview build until a team maintainer authorizes it. As long as GitHub shows ✅ No conflicts with base branch, your PR is ready for review!

Thank you for helping make GetPYQ JEC better for all students! 🎓
