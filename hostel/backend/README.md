# MSEC Hostel Management System - Backend API

High-performance, scalable REST API built with **FastAPI**, **SQLAlchemy**, and **Pydantic v2**.

## 🚀 Features

- **Authentication & RBAC**: JWT bearer tokens, bcrypt password hashing, role-based access for Admin, Warden, and Students.
- **Hostel Blocks & Rooms**: Manage blocks (Boys/Girls/PG), room capacities, room types (AC/Non-AC), and live occupancy tracking.
- **Bed Allocation**: Dynamic bed assignment, vacancy processing, and student linkage.
- **Complaints & Maintenance**: Maintenance ticket lifecycle (Electrical, Plumbing, Wi-Fi, Mess, etc.) with priority, status, and resolution logging.
- **Digital Gate Pass / Outpass**: Student outpass approval workflow with return verification.
- **Fee Management**: Hostel & mess fee records, payment status, and due tracking.
- **Dashboard Analytics**: Real-time KPI metrics, occupancy rate, pending tickets, and activity feeds.
- **Auto-Seeding**: Comes pre-configured with sample blocks, rooms, users, and tickets on initial boot.

---

## 🛠️ Tech Stack

- **Python 3.10+ / 3.14**
- **FastAPI** (Modern async web framework)
- **SQLAlchemy 2.0** (ORM)
- **Pydantic v2 & Pydantic-Settings** (Data validation & env parsing)
- **SQLite / PostgreSQL** (Pluggable database backend)
- **Uvicorn** (ASGI server)

---

## 📁 Directory Structure

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── auth.py
│   │       │   ├── dashboard.py
│   │       │   ├── rooms.py
│   │       │   ├── students.py
│   │       │   ├── allocations.py
│   │       │   ├── complaints.py
│   │       │   ├── gate_pass.py
│   │       │   └── fees.py
│   │       └── api.py
│   ├── core/
│   │   ├── config.py         # App configuration & settings
│   │   ├── database.py       # Engine, sessionmaker, Base
│   │   ├── dependencies.py   # Auth & role dependencies
│   │   └── security.py       # Hashing & JWT tokens
│   ├── models/               # SQLAlchemy ORM models
│   │   ├── user.py
│   │   ├── hostel.py
│   │   ├── allocation.py
│   │   ├── complaint.py
│   │   ├── gate_pass.py
│   │   └── fee.py
│   ├── schemas/              # Pydantic v2 schemas
│   ├── services/
│   │   └── seed.py           # Initial data seeder
│   └── main.py               # FastAPI entry point & lifespan
├── tests/                    # Pytest test suite
├── .env.example              # Template environment variables
├── .env                      # Active environment variables
├── pyproject.toml            # Project metadata
├── requirements.txt          # Python dependencies
├── run.py                    # Dev server runner
└── Dockerfile                # Production container spec
```

---

## ⚡ Quick Start

### 1. Set up Virtual Environment
```bash
python -m venv .venv

# Windows:
.venv\Scripts\activate

# macOS/Linux:
source .venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` (already done by default):
```bash
cp .env.example .env
```

### 4. Run Development Server
```bash
python run.py
# or:
uvicorn app.main:app --reload --port 8000
```

### 5. Access Interactive API Documentation
- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **Health Check**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

### 6. Default Demo Credentials
- **Admin**: `admin@msec.edu.in` / `Admin@123`
- **Warden**: `warden.kaveri@msec.edu.in` / `Warden@123`
- **Student**: `rahul.cse@msec.edu.in` / `Student@123`
