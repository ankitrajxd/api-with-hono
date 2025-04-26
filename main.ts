import { Hono } from "@hono/hono";
import githubWebhook from "./webhooks/github-webhook.ts";
import login from "./auth/auth.ts";
import { connectDb } from "./db.ts";
import {
  authMiddlware,
  checkRequestSpam,
} from "./middlwares/auth.middlware.ts";
import { rateLimit } from "./middlwares/rateLimiter.middlware.ts";

const app = new Hono();
const port = 3000;

await connectDb();

app.use(checkRequestSpam);
app.use(rateLimit);
app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.route("/webhook", githubWebhook);
app.route("/auth", login);

// protected route
app.get("/protected", authMiddlware, (c) => {
  return c.json({ message: "Protected route" });
});

Deno.serve(
  {
    port,
  },
  app.fetch
);
