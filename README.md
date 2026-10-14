# Ripple — Cash-Flow Intelligence & Business Command Center

Ripple is a modern financial operating system and predictive cash-flow intelligence platform designed for small-to-medium enterprises (SMBs). It bridges the gap between static accounting ledgers and dynamic supply-chain operations by interconnecting Accounts Receivable (customer invoices), Accounts Payable (vendor bills), inventory stock movements, and order fulfillment into an interactive, real-time command center.

---

## Key Features

- **Business Command Center (Dashboard):** Real-time monitoring of Cash on Hand, Runway, Net Cash Flow, Working Capital Ratio, Quick Action modal workflows (`+ New Record`), cash trends, and prioritized action alerts.
- **Predictive Cash Flow Forecasting:** Horizon-based projections (7, 14, 30, 60, and 90 days) showing opening balances, daily inflows, outflows, and projected closing cash with minimum safety threshold breach alerts.
- **Ripple What-If Simulator:** Interactive scenario testing to simulate delayed customer payments, supplier price spikes, or unexpected demand surges, measuring liquidity impact before taking action.
- **Counterparty Relationship Graph:** Interactive node-link network visualization (built with `@xyflow/react`) mapping suppliers, purchase orders, inventory, customer orders, and receivables to uncover supply-chain bottlenecks and credit risks.
- **Invoices & Bills Management:** Full lifecycle tracking for customer receivables and vendor payables, supporting partial settlements, aging breakdowns, and overdue reminder generation.
- **Customer & Supplier CRM:** Rich counterparty profiles, dynamic payment reliability ratings, custom credit terms, and sub-ledgers.
- **Inventory & Reorder Intelligence:** Real-time stock valuation, available quantity tracking, automatic low-stock alerts, and one-click purchase order generation.
- **Financial Precision:** Strict integer minor-unit math (**paise** for INR; ₹1.00 = 100 paise) to prevent floating-point rounding errors.
- **Dual Data Modes:**
  - `DATA_MODE="api"`: Full-stack operation with FastAPI, SQLAlchemy ORM, and JWT-authenticated tenant isolation.
  - `DATA_MODE="mock"`: Zero-backend, offline-ready reactive store seeded with a realistic apparel manufacturing business (*Rupi Clothing*).

---

## Tech Stack

### Frontend
- **Framework & SSR:** [TanStack Start](https://tanstack.com/start) (Nitro engine + Vite 8.1, React 19, TypeScript 5.8)
- **Routing:** TanStack Router (file-based routing with full type safety)
- **State Management & Caching:** TanStack Query v5 (`useSuspenseQuery`, `queryOptions`)
- **Styling:** Tailwind CSS v4 with curated OKLCH design tokens
- **UI Components & Icons:** Radix UI primitives, Lucide Icons, Sonner toast notifications
- **Visualizations:** Recharts (financial trends) and @xyflow/react (dependency graphs)
- **Validation:** Zod schemas with React Hook Form

### Backend
- **Framework:** FastAPI (Python 3.10+) with Uvicorn
- **Database ORM:** SQLAlchemy 2.0 with Alembic migrations
- **Databases:** SQLite (zero-config local default) or PostgreSQL (production-ready)
- **Security:** JWT authentication (`PyJWT`), password hashing (`bcrypt`), and tenant isolation

---

## Getting Started

### Prerequisites
- **Node.js:** v20.x or higher
- **npm:** v10.x or higher
- **Python:** v3.10 or higher (for backend mode)

---

### Quick Start (Full Stack with Backend)

#### 1. Clone the repository
```bash
git clone <repository-url>
cd 404NotFound
```

#### 2. Configure Environment Variables
Copy or verify the `.env` file in the project root:
```env
VITE_DATA_MODE=api
VITE_API_BASE_URL=http://127.0.0.1:8000
```

#### 3. Start the FastAPI Backend
```bash
cd backend

# Create and activate a virtual environment
python -m venv venv

# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the backend server (starts on http://127.0.0.1:8000)
python run.py
```

*Note: The SQLite database (`backend/ripple.db`) is automatically initialized and seeded with demo data on first start.*

#### 4. Start the Frontend Development Server
In a new terminal window at the project root:
```bash
# Install frontend dependencies
npm install

# Start the Vite development server (starts on http://localhost:8080)
npm run dev
```

Visit **`http://localhost:8080`** in your browser.

---

### Demo Login Credentials

You can log in directly using the pre-seeded demo account:
- **Email:** `owner@rupiclothing.in`
- **Password:** `admin123`

*(Alternatively, click **"Use Demo Account"** on the login page, or click **"Create an account"** to register a new isolated business tenant.)*

---

### Standalone Offline / Mock Mode

To run the frontend completely standalone without the Python backend:
1. Set `VITE_DATA_MODE=mock` in your `.env` file.
2. Run `npm run dev`.
3. All operations will use the in-memory reactive store (`src/mocks/store.ts`).

---

## Project Structure

```
├── backend/                           # FastAPI backend application
│   ├── app/
│   │   ├── api/                       # API route handlers (auth, dashboard, counterparties, invoices, etc.)
│   │   ├── models/                    # SQLAlchemy database models
│   │   ├── schemas/                   # Pydantic validation schemas
│   │   ├── services/                  # Business logic (forecasts, calculations, simulation)
│   │   └── seed.py                    # Database seeding logic
│   ├── run.py                         # Backend entrypoint (uvicorn)
│   └── test_backend.py                # Backend integration test suite
│
├── src/                               # Frontend application (TanStack Start)
│   ├── components/                    # UI Components
│   │   ├── cash-flow/                 # Forecast tables, timeline, and scenario cards
│   │   ├── dashboard/                 # Metric cards, quick actions, and alerts
│   │   ├── inventory/                 # Stock tables, PO modals, and reorder cards
│   │   ├── layout/                    # Sidebar and header layout shell
│   │   ├── settings/                  # Business preferences and data management
│   │   ├── shared/                    # Reusable components (badges, money amounts, empty states)
│   │   └── suppliers/                 # Counterparty directory and detail components
│   ├── lib/
│   │   ├── api/                       # Typed client API services (invoiceApi, supplierApi, etc.)
│   │   ├── config.ts                  # Runtime configuration and DATA_MODE resolver
│   │   └── formatters.ts              # Integer-paise currency and date formatting utilities
│   ├── mocks/
│   │   ├── data.ts                    # Pristine demo seed dataset ("Rupi Clothing")
│   │   └── store.ts                   # In-memory reactive state store
│   ├── routes/                        # TanStack Router file-based routes
│   │   ├── _app.dashboard.tsx         # Dashboard Overview (/dashboard)
│   │   ├── _app.cash-flow.tsx         # Cash Flow Forecasting (/cash-flow)
│   │   ├── _app.invoices.index.tsx    # Invoices & Bills List (/invoices)
│   │   ├── _app.invoices.$invoiceId.tsx # Invoice Detail View (/invoices/:invoiceId)
│   │   ├── _app.customers.index.tsx   # Customer Directory (/customers)
│   │   ├── _app.customers.$customerId.tsx # Customer Profile (/customers/:customerId)
│   │   ├── _app.suppliers.index.tsx   # Supplier Directory (/suppliers)
│   │   ├── _app.suppliers.$supplierId.tsx # Supplier Profile (/suppliers/:supplierId)
│   │   ├── _app.inventory.tsx         # Inventory Management (/inventory)
│   │   ├── _app.relationships.tsx     # Supply Chain Dependency Graph (/relationships)
│   │   ├── _app.simulator.tsx         # What-If Cash Flow Simulator (/simulator)
│   │   ├── _app.settings.tsx          # Business Settings (/settings)
│   │   ├── login.tsx                  # User Login (/login)
│   │   └── register.tsx               # Tenant Registration (/register)
│   └── types/index.ts                 # Central domain TypeScript interfaces
│
├── BUG_AUDIT.md                       # Comprehensive system bug audit and verification report
└── PROJECT_CONTEXT.md                 # Fast developer reference guide
```

---

## Testing & Quality Assurance

### Run Frontend Vitest Suites
Runs 84 unit and integration tests across 11 test suites:
```bash
npm test
```

### Run Backend Integration Tests
Runs 13 end-to-end integration test suites against FastAPI and SQLite:
```bash
python backend/test_backend.py
```

### Production Build
Verifies type safety and compiles the production SSR client and server bundles:
```bash
npm run build
```

### Code Style & Formatting
```bash
npm run lint       # Run ESLint checks
npm run format     # Format with Prettier
```

---

## License

This project is licensed under the MIT License.
