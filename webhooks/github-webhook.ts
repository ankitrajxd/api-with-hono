import { Hono } from "@hono/hono";

const app = new Hono();
let webhookData = {}; // Initialize webhookData as an empty object

app.post("/", async (c) => {
  const body = await c.req.json();
  console.log(body);
  webhookData = body; // Simply assign the already parsed body
  return c.json({ message: "Webhook received!" });
});

app.get("/", (c) => {
  return c.json(webhookData);
});

export default app;
