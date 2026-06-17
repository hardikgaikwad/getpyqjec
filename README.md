<div align="center">
  <img src="https://img.icons8.com/color/100/000000/graduation-cap.png" alt="GetPYQJEC Logo" width="100"/>
  <h1>🎓 GetPYQJEC</h1>
  <p><strong>A Next-Generation Academic Resource Platform</strong></p>
  <p>Providing seamless, systematic, and intuitive access to Previous Year Questions (PYQs) for college students.</p>

  <p>
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
    <img src="https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=green" alt="Django" />
    <img src="https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
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
6. [Project Structure](#-project-structure)

---

## 🌟 Overview
**GetPYQJEC** is an advanced academic resource management system designed to make discovering, uploading, and managing college examination papers completely effortless. Built with a robust service-oriented architecture, the platform guarantees high performance, secure document delivery, and a pristine user experience. 

It solves the chaotic spread of college resources by centralizing them into a single, beautifully structured portal. Furthermore, the built-in upload feature empowers students to seamlessly contribute PYQs, transforming the platform into a community-driven, self-growing repository.

---

## ✨ Key Features
- 🚀 **High-Performance UI**: Lightning-fast, responsive web interface powered by React 19 and Vite.
- 🔐 **Secure Authentication**: Publicly accessible document viewing, with strict JSON Web Token (JWT) authentication protecting against unwanted uploads or modifications.
- 📄 **Smart PDF Processing**: Integrated PDF capabilities (via `pdf-lib` and `pikepdf`) for optimized document serving and viewing.
- 📂 **Systematic Organization**: Advanced querying and filtering system to effortlessly locate academic materials.
- 🛡️ **Robust REST API**: A scalable backend powered by Django REST Framework serving structured, optimized data payloads.

---

## 🏗 Architecture Diagram

The system operates on a decoupled client-server architecture, allowing the frontend and backend to scale and evolve independently. The detailed interaction between all modules is mapped out below:

```text
+---------------------------------------------------------------------------------------------+
|                                  Client (React 19 + Vite SPA)                               |
|                     - React Router DOM          - pdf-lib Document Viewer                   |
+--------+---------------------------------+---------------------------------+----------------+
         |                                 |                                 |
         | HTTP/REST                       | HTTP/REST                       | HTTP/REST
         | (JSON)                          | (JSON)                          | (Multipart)
         v                                 v                                 v
+--------------------+            +--------------------+            +--------------------+
|    Auth Module     |            |    PYQ Data API    |            |   Media Service    |
|   (Django / JWT)   |            |   (Django / DRF)   |            |  (Django/pikepdf)  |
|                    |            |                    |            |                    |
| * User Register    |            | * Search & Filter  |            | * Handle Uploads   |
| * Login / Logout   |            | * List Questions   |            | * Optimize PDFs    |
| * Issue JWT Tokens |            | * CRUD Operations  |            | * Serve Documents  |
| * Role Validation  |            | * Query Validation |            | * Storage Config   |
+--------+-----------+            +--------+-----------+            +--------+-----------+
         |                                 |                                 |
         |                                 |                                 |
         |                                 v                                 |
         |                  +-----------------------------+                  |
         |                  |      SQLite 3 Database      |                  |
         |                  |                             |                  |
         |                  |  +---------+   +---------+  |                  |
         +----------------->|  | Auth    |   | PYQ     |  |                  |
                            |  | Tables  |   | Tables  |  |                  |
                            |  | - Users |   | - Papers|  |                  |
                            |  +---------+   +---------+  |                  |
                            +-----------------------------+                  |
                                                                             v
                                                            +-----------------------------+
                                                            |     Local Media Storage     |
                                                            |                             |
                                                            |  - /media/pyqs/             |
                                                            |  - uploaded_pdf_files.pdf   |
                                                            |  - Temporary buffers        |
                                                            +-----------------------------+
```

- **Frontend Layer (React)**: A highly interactive Single Page Application (SPA) managing routing, PDF rendering, and API communication.
- **Backend Layer (Django)**: A robust REST API managing authentication, business logic, file uploads (with PDF processing capabilities), and database transactions.

---

## 💻 Technology Stack

### Frontend
* **React 19**: The core view library for dynamic UI components.
* **Vite**: Next-generation frontend tooling for rapid development and optimized builds.
* **React Router DOM**: Client-side routing for seamless, non-blocking page transitions.
* **PDF-Lib**: For in-browser PDF manipulation and rendering.

### Backend
* **Django 6.0**: A high-level Python web framework that encourages rapid development and clean design.
* **Django REST Framework (DRF)**: A powerful toolkit for building robust web APIs.
* **Simple JWT**: For secure, token-based authentication.
* **Pikepdf**: Backend PDF processing and optimization.
* **SQLite**: Lightweight, file-based database for structured data storage.

---

## 🚀 Local Setup Guide

Follow these steps to get the project up and running on your local machine.

### Prerequisites
Make sure you have the following installed:
* [Python 3.10+](https://www.python.org/downloads/)
* [Node.js 18+](https://nodejs.org/) & npm
* [Git](https://git-scm.com/)

---

### Backend Setup (Django)

1. **Navigate to the workspace root**
   ```bash
   cd getpyqjec
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   ```

3. **Activate the virtual environment**
   * On Windows:
     ```bash
     venv\Scripts\activate
     ```
   * On macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

4. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

5. **Apply database migrations**
   ```bash
   python manage.py migrate
   ```

6. **Create a superuser (Admin access)**
   ```bash
   python manage.py createsuperuser
   ```

7. **Run the development server**
   ```bash
   python manage.py runserver
   ```
   *The backend API will now be running at `http://127.0.0.1:8000/`*

---

### Frontend Setup (React)

1. **Open a new terminal and navigate to the frontend directory**
   ```bash
   cd getpyqjec/frontend
   ```

2. **Install Node dependencies**
   ```bash
   npm install
   ```

3. **Start the Vite development server**
   ```bash
   npm run dev
   ```
   *The React application will be available at `http://localhost:5173/`*

---

## 📂 Project Structure

```text
getpyqjec/
├── backend/               # Django project settings and root configurations
├── core/                  # Main backend application logic and models
├── frontend/              # React single-page application (SPA)
│   ├── src/               # React components, contexts, and hooks
│   ├── public/            # Static assets for the frontend
│   └── package.json       # Frontend dependencies and scripts
├── data/                  # Local data storage / fixtures
├── requirements.txt       # Python backend dependencies
├── manage.py              # Django command-line utility
└── README.md              # Project documentation
```

---
