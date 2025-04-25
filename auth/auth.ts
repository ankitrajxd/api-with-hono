import { Hono } from "@hono/hono";
import { setCookie, deleteCookie } from "@hono/hono/cookie";
import { JWTPayload, jwtVerify, SignJWT } from "npm:jose@5.9.6";
import { connectDb } from "../db.ts";
import { authMiddlware } from "../middlwares/auth.middlware.ts";

const app = new Hono();

const secretkey = new TextEncoder().encode("super secret key"); // use a better secret key in production AND store it in an env variable
//====================================================================

app.post("/login", async (c) => {
  const dbclient = await connectDb();
  // dummy auth check - passed

  const value = await dbclient.sendCommand(["GET", "session"]);
  if (value) {
    const payload = await verifyJWT(value.toString());
    if (payload) {
      return c.json(
        {
          message: "Already logged in. Logout from other devices.",
        },
        401
      );

      // or you can just delehte the cookie and create a new one - this way old session will be invalidated
    } else {
      // delete the cookie and create a new one
      dbclient.sendCommand(["DEL", "session"]);
    }
  }

  // invalidate the session if it exists - check if the user is already logged in somewhere else - if so, invalidate the session and create a new one

  // set a session cookie store it in the redis db - but before that check if the user is already logged in somewhere else - if so, invalidate the session and create a new one
  const paylod: JWTPayload = {
    userId: 1,
    username: "testuser",
  };
  const jwt = await createJWT(paylod);
  setCookie(c, "session", jwt);
  dbclient.sendCommand(["SET", "session", jwt]);
  return c.json({ message: "Authenticated" });
});

//====================================================================

app.post("/logout", authMiddlware, async (c) => {
  // check if the user is logged in or not - if not, return a message saying already logged out

  const dbclient = await connectDb();
  const value = await dbclient.sendCommand(["GET", "session"]);
  if (!value) {
    return c.json({ message: "Already logged out" });
  }
  dbclient.sendCommand(["DEL", "session"]);
  deleteCookie(c, "session");
  return c.json({ message: "Logged out" });
});

//====================================================================

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
