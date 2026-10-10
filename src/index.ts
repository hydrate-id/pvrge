import { app } from "./api";
import { email } from "./email";
import { scheduled } from "./scheduled";
import { ensureAdminSeeded } from "./admin";
import type { Env } from "./types";

let adminChecked = false;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    if (!adminChecked) {
      await ensureAdminSeeded(env);
      adminChecked = true;
    }

    const url = new URL(request.url);

    // If it's not an API call, let assets or SPA fallback handle it
    if (!url.pathname.startsWith("/api") && env.ASSETS) {
      const assetRes = await env.ASSETS.fetch(request);
      if (assetRes.status !== 404) {
        return assetRes;
      }
      // SPA Fallback: serve root index.html for direct navigation (e.g. /faq, /terms)
      const fallbackReq = new Request(new URL("/", request.url), request);
      return env.ASSETS.fetch(fallbackReq);
    }

    (request as unknown as { env: Env; ctx: ExecutionContext }).env = env;
    (request as unknown as { env: Env; ctx: ExecutionContext }).ctx = ctx;
    return app.fetch(request);
  },
  async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext) {
    if (!adminChecked) {
      await ensureAdminSeeded(env);
      adminChecked = true;
    }
    return email(message, env, ctx);
  },
  scheduled
};
