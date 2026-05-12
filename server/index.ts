import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { migrate } from "./db.js";
import { seedIfEmpty } from "./seed.js";
import { findingsRouter } from "./routes/findings.js";
import { templatesRouter } from "./routes/templates.js";
import { capabilitiesRouter } from "./routes/capabilities.js";

migrate();
await seedIfEmpty();

const app = new Hono();

app.use("*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  await next();
});

const api = new Hono();
api.route("/", findingsRouter);
api.route("/", templatesRouter);
api.route("/", capabilitiesRouter);

app.route("/api", api);

app.get("/health", (c) => c.json({ ok: true }));

const port = Number(process.env.PORT ?? 4000);
serve({ fetch: app.fetch, port });
console.log(`[api] listening on http://localhost:${port}`);
