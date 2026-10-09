import { app } from "./api";
import { email } from "./email";
import { scheduled } from "./scheduled";
import type { Env } from "./types";

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    (request as unknown as { env: Env; ctx: ExecutionContext }).env = env;
    (request as unknown as { env: Env; ctx: ExecutionContext }).ctx = ctx;
    return app.fetch(request);
  },
  email,
  scheduled
};
