import { createMiddleware } from "@hono/hono/factory";
import { getConnInfo } from "@hono/hono/deno";

interface User {
  count: number;
  windowStart: number;
}

// Create a global store outside the middleware to persist across requests
const store: Record<string, User> = {};

export const rateLimit = createMiddleware(async (c, next) => {
  const info = await getConnInfo(c);

  const limit = 3;
  const ip = info.remote.address;

  const currentTime = Date.now();
  const timeWindow = 60 * 1000; // 1 minute in milliseconds

  const user = store[ip];

  if (!user || currentTime - user.windowStart > timeWindow) {
    // reset if the window expires or create a new user entry
    store[ip] = {
      count: 1,
      windowStart: currentTime,
    };
  } else {
    user.count++;
    if (user.count > limit) {
      return c.json({ message: "Rate limit exceeded. Try again later." }, 429);
    }
  }

  console.log(`IP: ${ip}`);

  await next();
});
