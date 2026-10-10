# ✉️ pvrge

A modern, fast, and lightweight disposable email service powered entirely by a **Single Unified Cloudflare Worker**, **Cloudflare D1**, and **Cloudflare R2**.

---

## 🏗️ Architecture: Single Cloudflare Worker

`pvrge` combines both the frontend single-page application and backend API into **one single Cloudflare Worker deployment**, eliminating CORS issues, simplifying infrastructure, and leveraging Cloudflare Workers edge execution.

```
                      ┌────────────────────────────────────────┐
                      │        Single Cloudflare Worker        │
                      ├────────────────────────────────────────┤
HTTP Requests         │                                        │
GET /                 │  Static Assets Binding (ASSETS)        │
Static Files (SPA) ───┼─► Vue 3 + Tailwind + shadcn-vue        │
                      │  (Single-Page Application fallback)    │
                      │                                        │
HTTP Requests         │  Fetch Event Handler                   │
/api/*             ───┼─► ElysiaJS REST API                    │
                      │  (Auth, Messages, Accounts, Tokens)    │
                      ├────────────────────────────────────────┤
Cloudflare Email      │  Email Event Handler                   │
Routing Catch-All  ───┼─► Inbound Email Processor              │
                      │  (PostalMime parse -> D1 meta + R2 raw)│
                      ├────────────────────────────────────────┤
Cron Triggers         │  Scheduled Event Handler               │
hourly (0 * * * *) ───┼─► Cleanup Cron                         │
                      │  (Purges messages older than 24 hours) │
                      └────────────────────────────────────────┘
                                    │               │
                                    ▼               ▼
                             Cloudflare D1   Cloudflare R2
                             (SQLite DB)     (Raw Email Store)
```

- **Frontend Edge Serving:** The frontend SPA (Vue 3 + Vite + Tailwind CSS + shadcn-vue) is bundled into `frontend/dist` and served directly from Cloudflare's edge using **Cloudflare Workers Static Assets** (`assets: { directory: "../frontend/dist", binding: "ASSETS", not_found_handling: "single-page-application" }`).
- **Unified API Routing:** Inbound HTTP requests directed at `/api/*` are handled by ElysiaJS within the Worker `fetch` handler.
- **Zero CORS Issues:** Frontend and API share the exact same origin and domain.
- **Inbound Email Routing:** Cloudflare Email Routing delivers incoming catch-all emails straight to the Worker's `email` event handler without third-party email parsers.
- **Automated Retention Cron:** The Worker's `scheduled` handler runs every hour (`0 * * * *`) to automatically purge expired emails older than 24 hours.

---

## ✨ Key Features

- **🌐 Multi-Domain Round-Robin:** Supports multiple domain rotation (`pvrge.com`, `suar.in`, and configurable custom domains).
- **👤 Human-Friendly Username Generation:** Generates readable, natural usernames without dashes using the `[adjective][noun][2digit]` format (e.g., `swiftfox42@pvrge.com`).
- **🔒 Permanent Account Retention & 24h Message Purge:** Accounts stay permanently stored in the browser (localStorage) with easy re-login, while inbound emails and attachments are automatically deleted after 24 hours to conserve storage.
- **⚡ Auto OTP / Verification Code Extraction:** Automatically parses verification codes and OTP tokens using smart regex matching, rendering an instant one-click copy button above the message.
- **🛡️ Sender Authentication Badges:** Verifies and visually indicates SPF, DKIM, and DMARC status (PASS/FAIL) directly in the message header.
- **🖼️ Sandboxed Email Body Viewer:** HTML email bodies are rendered inside an isolated `iframe` with `sandbox="allow-same-origin allow-popups..."` and dynamic auto-height resizing, eliminating internal iframe scrollbars.
- **🛑 Abuse Prevention & Free-Tier Rate Limiting:** Implements hybrid in-memory + durable D1 rate limiting (max 5 accounts per day per IP, brute-force lockout protection, polling throttles) engineered to remain 100% within Cloudflare Free Tier quotas.
- **🔄 Multi-Session Switcher & Password Visibility:** Easily switch between active sessions from the account switcher and inspect generated passwords with a toggle button.

---

## 🚀 Setup & Deployment Guide

### Prerequisites

- [Bun](https://bun.sh/) (v1.0 or newer)
- [Cloudflare Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) authenticated with your Cloudflare account (`npx wrangler login` or `bunx wrangler login`)

---

### Step 1: Cloudflare Resource Provisioning

1. **Create the D1 Database:**
   ```bash
   wrangler d1 create pvrge-db
   ```
   Copy the generated `database_id` and update `backend/wrangler.jsonc`:
   ```jsonc
   "d1_databases": [
     {
       "binding": "DB",
       "database_name": "pvrge-db",
       "database_id": "<YOUR_D1_DATABASE_ID>"
     }
   ]
   ```

2. **Create the R2 Storage Bucket:**
   ```bash
   wrangler r2 bucket create pvrge-storage
   ```

3. **Set Secrets in Cloudflare Workers:**
   Generate and store a secure secret key for JWT signing:
   ```bash
   cd backend
   wrangler secret put JWT_SECRET
   ```

4. **Execute Database Schema Migration:**
   Apply the initial database schema to your remote D1 instance:
   ```bash
   bun run db:migrate:remote
   ```

5. **Configure Cloudflare Email Routing:**
   - Go to your Cloudflare Dashboard -> **Email Routing** for your domain (e.g. `pvrge.com`).
   - Under **Routing rules**, create a **Catch-all rule**.
   - Set the action to **Send to a Worker** and select `pvrge-backend`.

---

### Step 2: Local Development

Run the frontend development server:
```bash
bun run dev
```

Run the backend worker locally:
```bash
bun run backend:dev
```

---

### Step 3: Production Deployment

Deploy the entire stack with a single command:
```bash
bun run deploy
```

This single command will:
1. Build the Vue 3 SPA production bundle into `frontend/dist`.
2. Package the unified Worker (backend API + static assets) and deploy it to Cloudflare Workers via Wrangler.

---

## 📂 Project Structure

```
pvrge/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Unified Worker entry point (fetch, email, scheduled)
│   │   ├── routes/           # Elysia API endpoints (/api/*)
│   │   ├── email/            # Inbound email parsing & storage handler
│   │   └── utils/            # Rate limiting, auth, password & username generators
│   ├── schema.sql            # D1 database schema
│   ├── wrangler.jsonc        # Cloudflare Worker configuration & asset bindings
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.vue           # Main application view & layouts
│   │   ├── components/       # UI components & sandboxed email viewer
│   │   └── lib/              # API client & local state management
│   ├── vite.config.ts        # Vite build configuration
│   └── package.json
├── package.json              # Monorepo scripts (dev, deploy, migrate)
└── README.md
```

---

## 📄 License

MIT License.
