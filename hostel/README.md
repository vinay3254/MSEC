# MSEC Central Hostel Management Dashboard

A modern, full-stack residential operations and student hostel management system developed for **M.S. Engineering College (MSEC)**. Built with a decoupled architecture featuring a **FastAPI (Python 3)** backend and a **React + TypeScript (Vite + Tailwind CSS)** frontend.

---

## Key Features

- **Dashboard Overview**: Real-time KPI metric cards (Total Residents, Bed Availability, Occupied Rooms, Overdue Accounts), live activity ledger, and wing-wise occupancy tracking.
- **Student Management**: Comprehensive student records using official MSEC USN format (`1ME...`), contact details, parent info, and hostel admission onboarding.
- **Room & Allocation Management**: Floor-wise room matrix, bed assignments, mutual room transfers, and check-out / vacate workflows.
- **Attendance & Outing Management**: Nightly roll-call tracking (Present, Late, Absent, Leave) with one-click logging, outpass issuance, and leave approvals.
- **Visitor Management**: Security gate check-in/check-out ledger, visitor identity verification, and resident host tracking.
- **Fee Management**: Fee structure definitions (accommodation, mess, caution deposits), payment status tracking, and printable fee receipts.
- **Complaints & Maintenance**: Ticket management across electrical, plumbing, furniture, and facility issues with priority tagging and resolution tracking.
- **Mess Management**: Weekly meal schedules (Breakfast, Lunch, Snacks, Dinner), student dining feedback, and dietary complaint monitoring.
- **Inventory & Operational Reports**: Asset tracking (condition, location, maintenance status) and consolidated executive reports for occupancy, attendance, finance, and maintenance SLAs.
- **Authentication & Multi-Role Switching**: Direct authenticated dashboard access with dynamic academic year (`2026–27`) and in-app role switching (Chief Warden, Deputy Warden, Student Resident, Accounts Admin).

---

## Tech Stack

### Frontend
- **Framework**: React 18 / 19 with TypeScript
- **Bundler & Tooling**: Vite
- **Styling**: Tailwind CSS with custom institutional design system (`#4E2478` purple, `#F30137` crimson, Poppins & Inter typography)
- **Icons**: Lucide React
- **Routing**: React Router v7
- **HTTP Client**: Axios

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **ORM & Database**: SQLAlchemy 2.0 with SQLite (compatible with PostgreSQL/MySQL)
- **Data Validation**: Pydantic v2
- **Server**: Uvicorn ASGI
- **Testing**: Pytest & HTTPX TestClient

---

## Project Structure

```text
msec-hostel-management/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # REST routes for all 9 modules
│   │   ├── core/               # App configuration, security, DB engine
│   │   ├── models/             # SQLAlchemy ORM entities
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   └── services/           # Initial seed data and business logic
│   ├── tests/                  # Pytest test suite
│   ├── requirements.txt        # Python dependencies
│   ├── run.py                  # Backend server entrypoint
│   └── Dockerfile              # Container definition for backend
├── frontend/
│   ├── public/                 # Static assets & official MSEC logo
│   ├── src/
│   │   ├── components/         # Reusable UI components, Sidebar, Navbar
│   │   ├── context/            # AuthContext & user session management
│   │   ├── pages/              # Module views matching all 9 features
│   │   ├── services/           # Axios API service layer
│   │   └── types/              # TypeScript interface definitions
│   ├── package.json            # Node.js dependencies
│   ├── tailwind.config.js      # Palette and font token definitions
│   └── vite.config.ts          # Vite configuration & dev proxy
├── docker-compose.yml          # Multi-container orchestration
└── README.md                   # Project documentation
```

---

## Getting Started

### Prerequisites
- Node.js (v18+) & npm
- Python (v3.11+)

### 1. Backend Setup

```bash
cd backend
python -m venv .venv

# Windows
.\.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
python run.py
```

- API Base URL: `http://127.0.0.1:8000`
- Interactive API Docs: `http://127.0.0.1:8000/docs`

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

- Dashboard URL: `http://localhost:5173`

---

## Running Tests

Execute backend test suite:

```bash
cd backend
pytest -v
```

Execute frontend production build check:

```bash
cd frontend
npm run build
```

---

## License

Developed for **M.S. Engineering College (MSEC)**. Internal operational use only.
