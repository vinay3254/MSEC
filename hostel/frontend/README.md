# MSEC Hostel Management System - Frontend Dashboard

Modern, responsive web dashboard built with **React 19**, **TypeScript**, **Vite**, and **Tailwind CSS**.

## 🚀 Features

- **Executive Analytics Dashboard**: Instant visibility into campus hostel capacity, occupancy rates, live complaints, and pending fee dues.
- **Interactive Rooms & Blocks Matrix**: Filter by Boys, Girls, or PG wings; view live bed vacancy and AC/Non-AC room specifications.
- **Bed Allocation Management**: Real-time assignment of registered students to specific rooms and bed units with one-click vacating.
- **Maintenance & Complaints Tracking**: Ticketing lifecycle for electrical, plumbing, carpentry, and Wi-Fi issues with status updates and resolution notes.
- **Digital Outpass / Gate Pass**: Student pass application and warden approval system with departure and return logging.
- **Fee Management**: Track hostel and mess fee dues with instant receipt recording.
- **Role-Based Authentication**: Secure JWT-backed session persistence with quick demo access for Admin, Warden, and Student roles.

---

## 🛠️ Tech Stack

- **React 19**
- **TypeScript 5+ / 7**
- **Vite 8**
- **Tailwind CSS**
- **Lucide Icons**
- **React Router v7**
- **Axios** (with token interception and error handling)

---

## 📁 Directory Structure

```
frontend/
├── public/               # Static assets & favicon
├── src/
│   ├── assets/           # Media & graphics
│   ├── components/
│   │   ├── common/       # Reusable primitives (Badge, Card, StatCard, Loader)
│   │   └── layout/       # Sidebar, Navbar, Page Layout
│   ├── context/          # React AuthContext & user state
│   ├── pages/            # View pages (Dashboard, Rooms, Students, Allocations, Complaints, GatePass, Fees, Login)
│   ├── services/         # Axios API clients
│   ├── types/            # TypeScript interfaces matching backend models
│   ├── App.tsx           # Route provider & protected routes
│   ├── index.css         # Tailwind directives & theme styles
│   └── main.tsx          # Application entry point
├── .env.example          # Environment variables template
├── .env                  # Active environment variables
├── package.json          # Node.js dependencies & scripts
├── vite.config.ts        # Vite build & backend proxy config
├── tailwind.config.js    # Tailwind styling config
├── Dockerfile            # Multi-stage production container
└── nginx.conf            # Nginx reverse proxy configuration
```

---

## ⚡ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` (already done by default):
```bash
cp .env.example .env
```
Ensure `VITE_API_BASE_URL` points to your backend (`http://127.0.0.1:8000/api/v1`).

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for Production
```bash
npm run build
npm run preview
```

### 5. Demo Credentials
Click the quick-fill buttons on `/login` or enter:
- **Admin**: `admin@msec.edu.in` / `Admin@123`
- **Warden**: `warden.kaveri@msec.edu.in` / `Warden@123`
- **Student**: `rahul.cse@msec.edu.in` / `Student@123`
