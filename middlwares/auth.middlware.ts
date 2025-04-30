import { getCookie } from "@hono/hono/cookie";
import { createMiddleware } from "@hono/hono/factory";
import { verifyJWT } from "../auth/auth.ts";
import { connectDb } from "../db.ts";
import { getConnInfo } from "@hono/hono/deno";

export const authMiddlware = createMiddleware(async (c, next) => {
  // get the cookie
  const currentSession = getCookie(c, "session");
  if (!currentSession) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const dbclient = await connectDb();
  const storedSession = await dbclient?.sendCommand(["GET", "session"]);
  if (!storedSession) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  // if the storedsession and currentsession match - it means user is logged in to a single device
  if (storedSession.toString() !== currentSession?.toString()) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const payload = await verifyJWT(storedSession.toString());
  if (!payload) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  await next();
});

export const checkRequestSpam = createMiddleware(async (c, next) => {
  const info = getConnInfo(c);

  const ip = info.remote.address;
  console.log(`IP: ${ip}`);

  // ban localhost ip address

  // if (ip.startsWith("127.0.0.1") || ip.startsWith("::1")) {
  //   return c.json(
  //     { message: "Request from localhost is not allowed. IP Banned" },
  //     403
  //   );
  // }
  await next();
});

export const csrfMiddleware = createMiddleware(async (c, next) => {
  if (["POST", "PUT", "DELETE"].includes(c.req.method)) {
    const csrfToken =
      c.req.header("x-csrf-token") ||
      c.req.header("csrf-token") ||
      c.req.query("csrf_token");
    const session = getCookie(c, "session");
    if (!csrfToken || !session) {
      return c.json({ message: "Missing CSRF token or session" }, 403);
    }
    const dbclient = await connectDb();
    const storedToken = await dbclient?.sendCommand(["GET", `csrf:${session}`]);
    if (!storedToken || storedToken !== csrfToken) {
      return c.json({ message: "Invalid CSRF token" }, 403);
    }
  }
  await next();
});
