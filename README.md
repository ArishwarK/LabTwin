# LabTwin — Coimbatore Institute of Technology Laboratory Digital Twin & Monitoring System

Centralized Academic Block & Floor-wise Laboratory Monitoring System for college computer laboratories. Features real-time Digital Twin telemetry for workstation connectivity and electrical power relays, floor navigation, occupancy tracking, and Google Calendar lab booking integration with strict Role-Based Access Control (RBAC).

---

## Key Features

- **Authentication & User Registration**:
  - **New User Registration Flow**: Allows institutional users (Faculty and Students) to sign up with Full Name, Username/Roll ID, Email, Department, and Password.
  - **Credential Validation**: Validates user credentials and role matches prior to granting session access.
  - **Role-Based Access Control (RBAC)**:
    - **Faculty Administrator**: Full privileges to reserve laboratory slots, toggle power relays, cancel bookings, and synchronize with Google Calendar.
    - **Student (View-Only)**: Real-time visibility of lab floor plans, workstation telemetry, and laboratory occupancy schedules. **Students cannot book or reserve slots.**
- **Laboratory Schedule & Slot Management**:
  - 5 Standard Academic Periods (S1–S5) across all laboratories in the Library Block (Block-A).
  - Real-time collision detection to prevent double-booking.
  - Google Calendar integration for calendar syncing with Faculty accounts.
  - Explicit access restrictions guarding against unauthorized student reservations.
- **Floor Navigation & Elevation View**: Interactive elevation explorer for CIT campus Library Block with individual lab tracking across Ground Floor to 4th Floor.
- **Digital Twin Telemetry**: Live telemetry view monitoring PC power, CPU/RAM/Disk utilization, operating status, and network connectivity.
- **Firebase Firestore Live Synchronization**: Real-time cloud synchronization for bookings, device power states, and activity audit logs.

---

## User Roles & Permissions

| Feature | Faculty Administrator | Student Scholar |
| :--- | :---: | :---: |
| **View Floor Plans & Device Telemetry** | ✅ Yes | ✅ Yes |
| **View Laboratory Schedules (S1–S5)** | ✅ Yes | ✅ Yes |
| **Search Labs & Equipment** | ✅ Yes | ✅ Yes |
| **Book / Reserve Laboratory Slots** | ✅ **Allowed** | ❌ **Restricted (View-Only)** |
| **Cancel / Release Bookings** | ✅ **Allowed** | ❌ **Restricted** |
| **Hardware Power Relay Control** | ✅ **Allowed** | ❌ **Restricted** |
| **Google Calendar Sync** | ✅ **Allowed** | ❌ **Restricted** |

---

## Default Demo Accounts

Users can sign in instantly using the demo accounts or register their own:

- **Faculty Admin (Full Access)**:
  - Username: `admin` / Password: `admin`
  - Username: `faculty` / Password: `faculty123`
- **Student (View-Only Access)**:
  - Username: `student` / Password: `student`
  - Username: `arish` / Password: `password`

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Backend & API**: Node.js, Express, TSX
- **Cloud Database**: Firebase Firestore (Realtime database for slot bookings and device states)
- **Authentication**: Institutional authentication with localStorage persistence & Firebase Google OAuth for Calendar Sync
- **External APIs**: Google Calendar API v3

---

## Getting Started

### Prerequisites
- Node.js 20+

### Installation & Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the unified application on port 3000:
   ```bash
   npm run dev
   ```

3. Build and test for production:
   ```bash
   npm run build
   npm start
   ```

---

## Deploy to Vercel

1. Push your repository to GitHub or GitLab.
2. Import project into Vercel with framework preset **Vite**.
3. Deploy! The application uses server routes with client SPA routing.
