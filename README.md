# ✉️ pvrge

A modern, fast, and lightweight disposable email service powered entirely by a **Single Unified Cloudflare Native Worker**, **Cloudflare D1**, and **Cloudflare R2**.

---

## 🏗️ Architecture: Cloudflare Native

`pvrge` leverages a Cloudflare Native repository layout combining both the frontend single-page application and backend API into **one single Cloudflare Worker deployment**, eliminating CORS issues, simplifying infrastructure, and leveraging Cloudflare Workers edge execution.

The backend Worker is positioned directly at the repository root (`src/`, `wrangler.jsonc`, `schema.sql`), while the frontend SPA resides in the `web/` directory. Static assets are bundled directly into `./web/dist` and bound via Cloudflare's `ASSETS` binding with single-page application fallback.

```
                      ┌────────────────────────────────────────┐
                      │    Single Cloudflare Worker (Root)     │
                      ├────────────────────────────────────────┤
HTTP Requests         │                                        │
GET /*                │  Static Assets Binding (ASSETS)        │
Static Files (SPA) ───┼─► Vue 3 + Tailwind + shadcn-vue        │
                      │  (Reads ./web/dist with SPA fallback)  │
                      │                                        │
HTTP Requests         │  Fetch Event Handler                   │
/api/*             ───┼─► ElysiaJS REST API                    │
                      │  (Auth, Messages, Admin / Duty Desk)   │
                      ├────────────────────────────────────────┤
Cloudflare Email      │  Email Event Handler                   │
Routing Catch-All  ───┼─► Inbound Email Processor              │
                      │  (PostalMime -> D1 meta + R2 attach)   │
                      ├────────────────────────────────────────┤
Cron Triggers         │  Scheduled Event Handler               │
hourly (0 * * * *) ───┼─► Cleanup Cron                         │
                      │  (Purges 24h expired msgs & R2 files)  │
                      └────────────────────────────────────────┘
                                    │               │
                                    ▼               ▼
                             Cloudflare D1   Cloudflare R2
                             (SQLite DB)     (Storage & Attachments)
```

- **Frontend Edge Serving:** The frontend SPA (Vue 3 + Vite + Tailwind CSS + shadcn-vue) is compiled to `./web/dist` and served directly from Cloudflare's edge using **Cloudflare Workers Static Assets** (`assets: { directory: "./web/dist", binding: "ASSETS", not_found_handling: "single-page-application" }`).
- **Unified API Routing:** Inbound HTTP requests directed at `/api/*` are handled by ElysiaJS within the Worker `fetch` handler.
- **Zero CORS Issues:** Frontend and API share the exact same origin and domain.
- **Inbound Email Routing:** Cloudflare Email Routing delivers incoming catch-all emails straight to the Worker's `email` event handler with automated MIME parsing.
- **Automated Retention Cron:** The Worker's `scheduled` handler runs hourly (`0 * * * *`) to automatically purge expired emails and cascade-delete orphaned attachments from R2.

---

## 🚀 Cloudflare Workers Builds (Git Native CI/CD)

`pvrge` is optimized for **Cloudflare Workers Git Native Builds** (directly connecting your GitHub repository in the Cloudflare Dashboard):

1. Navigate to **Cloudflare Dashboard** -> **Compute (Workers & Pages)** -> **Create application** -> **Workers** -> **Connect to Git**.
2. Select your `pvrge` repository.
3. Configure the build settings:
   - **Root directory:** `/`
   - **Build command:** `bun run build`
   - **Deploy command:** `bunx wrangler deploy` (or Cloudflare default)
   - **Build output directory:** Automatically resolved from `assets.directory` in `wrangler.jsonc` (`./web/dist`).
4. Attach your D1 database (`DB`) and R2 bucket (`STORAGE`) in **Settings -> Bindings**.
5. Add the `JWT_SECRET` environment variable / secret under **Settings -> Variables and Secrets**.

Any push to `main` will automatically trigger a clean build of `web/` and deploy the unified worker.

---

## 🛡️ On-Duty Desk (`/onduty/*`)

The built-in **On-Duty Desk** provides internal staff administration for monitoring and managing temporary mail operations:

- **Auto-Seeded Support Account:** The dedicated admin account `support@pvrge.com` is automatically provisioned on cold start (`ensureAdminSeeded`). On the first deployment cold start, a secure 16-character random password is generated and logged to Cloudflare Worker logs.
- **Auto-Delete Exemption:** Emails sent to `support@pvrge.com` are explicitly exempted from the 24-hour cleanup cron (`scheduled`). Messages in this inbox are preserved permanently until manually deleted.
- **User Management (`/onduty/users`):**
  - Searchable real-time user directory displaying accounts, creation timestamps, and message counts.
  - **Cascade User Deletion:** Removing a user account automatically deletes all associated messages from Cloudflare D1 and purges all corresponding raw email files and multipart attachments from Cloudflare R2.
- **Full Session Isolation:** On-Duty Desk authentication utilizes an isolated session store (`pvrge_duty_session`) separate from public accounts (`pvrge_accounts`), ensuring administrative duty state never collides with regular disposable mailbox usage.

---

## 📎 Attachment Handling (Cloudflare R2)

`pvrge` handles inbound multipart MIME attachments:

- **Automated MIME Parsing:** When an inbound email is processed by Cloudflare Email Routing, PostalMime extracts attachments and streams them into Cloudflare R2 bucket (`STORAGE`) under unique hashes.
- **Rich UI Cards & Paperclip Indicators:**
  - Inbound messages with attachments display an attachment paperclip indicator in the inbox list.
  - Email detail view renders attachment cards displaying filename, MIME type, human-readable file size, and direct download links (`/api/messages/:id/attachments/:filename`).
- **Cascade Deletion Cleanup:** When messages expire after 24 hours or are deleted manually via API or On-Duty Desk, all associated files stored in Cloudflare R2 are deleted in bulk (`STORAGE.delete(r2Keys)`), preventing orphaned storage accumulation.

---

## ✨ Key Features

- **🌐 Multi-Domain Round-Robin:** Supports multiple domain rotation (`pvrge.com`, `voyd.top`, and configurable custom domains).
- **👤 Human-Friendly Username Generation:** Generates readable, natural usernames without dashes using the `[adjective][noun][2digit]` format (e.g., `swiftfox42@pvrge.com`).
- **🔒 Permanent Account Retention & 24h Message Purge:** Accounts stay stored in browser storage for easy re-login, while inbound emails and attachments expire after 24 hours.
- **⚡ Auto OTP / Verification Code Extraction:** Automatically parses verification codes and OTP tokens using smart regex matching with a one-click copy button.
- **🛡️ Sender Authentication Badges:** Verifies and visually indicates SPF, DKIM, and DMARC status (PASS/FAIL) directly in the message header.
- **🖼️ Sandboxed Email Body Viewer:** HTML email bodies render inside an isolated `iframe` with `sandbox="allow-same-origin allow-popups..."` and dynamic auto-height resizing.
- **🛑 Abuse Prevention & Free-Tier Rate Limiting:** Implements hybrid in-memory + durable D1 rate limiting (max 5 accounts per day per IP, brute-force lockout protection, polling throttles) engineered to remain 100% within Cloudflare Free Tier quotas.

---

## 📂 Project Structure

```
pvrge/
├── src/                      # Cloudflare Worker backend source
│   ├── index.ts              # Entry point (fetch, email, scheduled handlers)
│   ├── api.ts                # ElysiaJS API routes & /onduty admin endpoints
│   ├── admin.ts              # Cold-start admin seeding (support@pvrge.com)
│   ├── email.ts              # Inbound email parsing & R2 attachment storage
│   ├── scheduled.ts          # Hourly cron message purge & R2 cleanup
│   ├── crypto.ts             # Password hashing & JWT signing
│   ├── generator.ts          # Username & domain generators
│   ├── rate-limit.ts         # IP burst & durable D1 rate limiters
│   └── types.ts              # Worker environment bindings & D1 models
├── web/                      # Frontend Single-Page Application (SPA)
│   ├── src/
│   │   ├── App.vue           # Main shell & On-Duty navigation layout
│   │   ├── views/            # InboxView, AdminUsersView, AdminLoginView
│   │   ├── components/       # UI components & sandboxed email viewer
│   │   ├── composables/      # Session (useSession) & Duty state stores
│   │   └── router/           # Vue Router with On-Duty auth guards
│   ├── dist/                 # Production SPA bundle (read by ASSETS)
│   ├── package.json          # Web dependencies & scripts
│   └── vite.config.js        # Vite build configuration
├── schema.sql                # Cloudflare D1 database schema
├── wrangler.jsonc            # Cloudflare Worker configuration & asset bindings
├── package.json              # Monorepo root scripts
└── README.md
```

---

## 🛠️ Available Scripts

| Script | Command | Description |
|---|---|---|
| **Build SPA** | `bun run build` | Compiles the Vue 3 SPA into `./web/dist` |
| **Worker Dev** | `bun run dev` | Runs the unified Worker locally with Wrangler |
| **Frontend Dev** | `bun run dev:web` | Starts the Vite development server for `web/` |
| **Migrate Local D1** | `bun run db:migrate:local` | Applies `schema.sql` to local D1 SQLite database |
| **Migrate Remote D1** | `bun run db:migrate:remote` | Applies `schema.sql` to production Cloudflare D1 |

---

## 🚀 Setup & Deployment Guide

### Prerequisites

- [Bun](https://bun.sh/) (v1.0 or newer)
- [Cloudflare Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (`bunx wrangler login`)

---

### Step 1: Provision Cloudflare Resources

1. **Create the D1 Database:**
   ```bash
   bunx wrangler d1 create pvrge-db
   ```
   Update `database_id` inside `wrangler.jsonc`:
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
   bunx wrangler r2 bucket create pvrge-storage
   ```

3. **Set Secrets in Cloudflare Workers:**
   ```bash
   bunx wrangler secret put JWT_SECRET
   ```

4. **Execute Database Schema Migration:**
   ```bash
   bun run db:migrate:remote
   ```

5. **Configure Cloudflare Email Routing:**
   - Go to Cloudflare Dashboard -> **Email Routing** for your active domain (e.g., `pvrge.com`).
   - Under **Routing rules**, create a **Catch-all rule**.
   - Set the action to **Send to a Worker** and select `pvrge-backend`.

---

### Step 2: Local Development

```bash
# Terminal 1: Frontend dev server
bun run dev:web

# Terminal 2: Worker dev server
bun run dev
```

---

### Step 3: Production Deployment via CLI

```bash
# Build frontend SPA
bun run build

# Deploy unified worker to Cloudflare
bunx wrangler deploy
```

---

## 📄 License

MIT License.
