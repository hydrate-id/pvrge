# pvrge

Temporary email service powered by Cloudflare Workers, D1, and R2.

## Architecture

- **Backend:** Bun + Elysia deployed to Cloudflare Workers (unified `fetch`, `email`, and `scheduled` handlers).
- **Frontend:** Vue 3 + Vite + Tailwind CSS (mail.tm inspired interface).
- **Storage:**
  - Cloudflare D1 (SQLite database for accounts, messages metadata).
  - Cloudflare R2 (Object storage for raw emails and attachments).
- **Inbound Email:** Cloudflare Email Routing catch-all forwarding to Worker.
