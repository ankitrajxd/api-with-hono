import { Context, Hono } from "@hono/hono";
import { setCookie, deleteCookie } from "@hono/hono/cookie";
import { JWTPayload, jwtVerify, SignJWT } from "npm:jose@5.9.6";
import { connectDb } from "../db.ts";
import { authMiddlware } from "../middlwares/auth.middlware.ts";
import { rateLimit } from "../middlwares/rateLimiter.middlware.ts";
import { nanoid } from "npm:nanoid"; // Add at the top

const app = new Hono();

const secretkey = new TextEncoder().encode("super secret key"); // use a better secret key in production AND store it in an env variable
//====================================================================

app.post("/login", rateLimit, async (c) => {
  // dummy auth check - passed
  const result = await handleSession(c, "testuser");
  if (result) return result;
  return c.json({ message: "Authenticated" });
});

//====================================================================
// it should be a post request (vulnerable to csrf) - but for testing purposes we are using get request
app.post("/logout", rateLimit, authMiddlware, async (c) => {
  // check if the user is logged in or not - if not, return a message saying already logged out

  const dbclient = await connectDb();
  const value = await dbclient?.sendCommand(["GET", "session"]);
  if (!value) {
    return c.json({ message: "Already logged out" });
  }
  dbclient?.sendCommand(["DEL", "session"]);
  deleteCookie(c, "session");
  return c.json({ message: "Logged out" });
});

//====================================================================
// google oauth
app.get("/google", (c) => {
  const redirectUri = "http://localhost:3000/auth/google/callback";
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const scope = "https://www.googleapis.com/auth/userinfo.profile";
  const state = "random_state_string"; // should be a random string
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`;
  return c.redirect(url);
});

app.get("/google/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  if (!code || !state) {
    return c.text("Missing code or state", 400);
  }
  // exchange code for access token
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const redirectUri = "http://localhost:3000/auth/google/callback";

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId!,
      client_secret: clientSecret!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenRes.json();

  if (tokenRes.status !== 200) {
    return c.text("Error exchanging code for token", 500);
  }

  // use the access token to get user info
  const userRes = await fetch("https://www.googleapis.com/oauth2/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });
  const userData = await userRes.json();
  if (userRes.status !== 200) {
    return c.text("Error fetching user info", 500);
  }

  await handleSession(c, userData.email); // use the email as username - you can use any other field as well - but make sure to use a unique field

  // return c.json(userData, 200);

  return c.redirect("/auth/success");
});

app.get("/success", (c) => {
  return c.json({ message: `you're authenticated!` });
});

//====================================================================
async function handleSession(c: Context, username: string) {
  const dbclient = await connectDb();
  const value = await dbclient?.sendCommand(["GET", "session"]);
  if (value) {
    const payload = await verifyJWT(value.toString());
    if (payload) {
      return c.json(
        { message: "Already logged in. Logout from other devices." },
        401
      );
      // or you can just delehte the cookie and create a new one - this way old session will be invalidated
    } else {
      // delete the cookie and create a new one
      dbclient?.sendCommand(["DEL", "session"]);
    }
  }

  // invalidate the session if it exists - check if the user is already logged in somewhere else - if so, invalidate the session and create a new one
  // set a session cookie store it in the redis db - but before that check if the user is already logged in somewhere else - if so, invalidate the session and create a new one

  const csrfToken = nanoid();
  setCookie(c, "csrf_token", csrfToken, {
    httpOnly: false, // Must be accessible by JS
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60,
  });

  const paylod: JWTPayload = {
    userId: 1,
    username,
  };
  const jwt = await createJWT(paylod);
  setCookie(c, "session", jwt, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60,
  });

  dbclient?.sendCommand(["SET", `csrf:${jwt}`, csrfToken]);
  dbclient?.sendCommand(["SET", "session", jwt]);
  return null;
}

async function createJWT(payload: JWTPayload): Promise<string> {
  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secretkey);

  return jwt;
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretkey);
    console.log("JWT is valid:", payload);
    return payload;
  } catch (error) {
    console.error("Invalid JWT:", error);
    return null;
  }
}

export default app;
