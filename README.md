# 🚀 Frellancer — Invoice SaaS for Freelancers

A complete, production-ready invoice management SaaS built for freelancers and small businesses in India.

![Node.js](https://img.shields.io/badge/Node.js-v18+-green)
![React](https://img.shields.io/badge/React-v19-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v15+-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8)

---

## ✨ Features

- **Auth** — JWT-based registration, login, profile management, password change
- **Clients** — Full CRUD with search, per-client invoice history
- **Invoices** — Auto-numbered, dynamic line items, GST calculation (5/12/18/28%)
- **PDF Generation** — Professional A4 invoices via `pdf-lib` with your logo
- **Payments** — Razorpay integration with order creation + signature verification
- **Dashboard** — Earnings, paid/unpaid/overdue stats, recent invoices
- **Reports** — Monthly revenue bar chart (Recharts) + GST filing summary
- **Settings** — Business info, logo upload, password change
- **Pricing** — Free vs Premium plan comparison with upgrade flow
- **Overdue Detection** — Automatic status updates for past-due invoices
- **Free Plan Limits** — 2 clients/month, 5 invoices/month (configurable)

---

## 🏗 Tech Stack

| Layer       | Technology                              |
|-------------|----------------------------------------|
| Frontend    | React 19 + Vite + Tailwind CSS v4      |
| Routing     | React Router v7                        |
| Charts      | Recharts                               |
| HTTP Client | Axios (with JWT interceptor)           |
| Backend     | Node.js + Express.js                   |
| Database    | PostgreSQL                             |
| Auth        | JWT + bcrypt                           |
| PDF         | pdf-lib                                |
| Payments    | Razorpay                               |
| Email       | Nodemailer (SMTP)                      |
| Hosting     | Vercel (frontend) + Railway (backend)  |

---

## 📁 Project Structure

```
FrellancerWebApp/
├── backend/
│   ├── db.js                  # PostgreSQL connection pool
│   ├── migrate.js             # Database schema migration
│   ├── index.js               # Express server + routes
│   ├── middleware/
│   │   └── authMiddleware.js  # JWT authentication guard
│   ├── routes/
│   │   ├── auth.js            # Register, login, profile, password
│   │   ├── clients.js         # Client CRUD + search
│   │   ├── invoices.js        # Invoice CRUD + PDF + status
│   │   ├── payments.js        # Razorpay order + verification
│   │   ├── dashboard.js       # Aggregated dashboard stats
│   │   └── reports.js         # Monthly earnings + GST summary
│   ├── utils/
│   │   └── pdfGenerator.js    # A4 PDF builder (pdf-lib)
│   ├── railway.json           # Railway deployment config
│   ├── Procfile               # Process file for deployment
│   └── .env.example           # Environment variables template
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx           # React entry point
│   │   ├── App.jsx            # Router with all routes
│   │   ├── index.css          # Design system + Tailwind theme
│   │   ├── utils/
│   │   │   └── api.js         # Axios instance + JWT interceptor
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx # Auth state management
│   │   ├── components/
│   │   │   ├── Sidebar.jsx       # Navigation sidebar
│   │   │   ├── DashboardLayout.jsx # Auth guard + layout shell
│   │   │   ├── StatsCard.jsx     # Reusable stats card
│   │   │   └── InvoicePreview.jsx # Live invoice preview
│   │   └── pages/
│   │       ├── Login.jsx         # Sign in
│   │       ├── Register.jsx      # Create account
│   │       ├── Onboarding.jsx    # Business setup
│   │       ├── Dashboard.jsx     # Overview dashboard
│   │       ├── Clients.jsx       # Client management
│   │       ├── CreateInvoice.jsx # Invoice creation + preview
│   │       ├── InvoiceList.jsx   # Invoice table with filters
│   │       ├── InvoiceDetail.jsx # Invoice view + actions
│   │       ├── Reports.jsx       # Charts + GST summary
│   │       ├── Settings.jsx      # Profile + password
│   │       └── Pricing.jsx       # Plan comparison
│   ├── vercel.json            # Vercel SPA rewrites
│   └── vite.config.js         # Vite + React + Tailwind
│
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js v18+
- PostgreSQL v15+
- npm v9+

### 1. Clone & Install

```bash
git clone https://github.com/your-username/FrellancerWebApp.git
cd FrellancerWebApp

# Backend
cd backend
cp .env.example .env    # Fill in your values
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Set Up Database

```bash
# Create the database
createdb frellancer_invoices

# Run migrations
cd backend
node migrate.js
```

### 3. Configure Environment

Edit `backend/.env` with your values:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/frellancer_invoices
JWT_SECRET=your-secret-key
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=your-secret
```

### 4. Run Development Servers

```bash
# Terminal 1 — Backend (port 5000)
cd backend
npm run dev     # or: node index.js

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

Visit **http://localhost:5173** → Register → Onboard → Start invoicing!

---

## 🌐 Deployment

### Frontend → Vercel

```bash
cd frontend
npx vercel --prod
```

Set environment variable:
- `VITE_API_URL` = your Railway backend URL

### Backend → Railway

1. Connect your repo to [Railway](https://railway.app)
2. Add a PostgreSQL database service
3. Set environment variables in Railway dashboard
4. Deploy — Railway auto-detects `railway.json`

---

## 📊 API Endpoints

| Method | Endpoint                        | Auth | Description                     |
|--------|--------------------------------|------|---------------------------------|
| POST   | `/api/auth/register`           | ❌   | Create account                  |
| POST   | `/api/auth/login`              | ❌   | Sign in, get JWT                |
| GET    | `/api/auth/profile`            | ✅   | Get current user profile        |
| PUT    | `/api/auth/profile`            | ✅   | Update profile + logo upload    |
| PUT    | `/api/auth/change-password`    | ✅   | Change password                 |
| GET    | `/api/clients`                 | ✅   | List clients (with search)      |
| POST   | `/api/clients`                 | ✅   | Create client                   |
| PUT    | `/api/clients/:id`             | ✅   | Update client                   |
| DELETE | `/api/clients/:id`             | ✅   | Delete client                   |
| GET    | `/api/clients/:id/invoices`    | ✅   | Client's invoices               |
| POST   | `/api/invoices/create`         | ✅   | Create invoice with items       |
| GET    | `/api/invoices`                | ✅   | List invoices (search + filter) |
| GET    | `/api/invoices/:id`            | ✅   | Invoice detail with items       |
| PUT    | `/api/invoices/:id/status`     | ✅   | Update invoice status           |
| GET    | `/api/invoices/:id/pdf`        | ✅   | Download invoice PDF            |
| POST   | `/api/payments/create-order/:id`| ✅  | Create Razorpay order           |
| POST   | `/api/payments/verify`         | ✅   | Verify Razorpay payment         |
| GET    | `/api/dashboard/stats`         | ✅   | Dashboard aggregated data       |
| GET    | `/api/reports/monthly`         | ✅   | Monthly earnings report         |
| GET    | `/api/reports/gst`             | ✅   | GST summary report              |
| GET    | `/api/health`                  | ❌   | Server health check             |

---

## 📝 License

MIT © Frellancer
