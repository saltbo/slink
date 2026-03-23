import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Context, Next } from "hono";

type Bindings = {
  DB: D1Database;
};

type Variables = {
  userId: number;
};

type Env = { Bindings: Bindings; Variables: Variables };

const auth = new Hono<Env>();

async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: encoder.encode(salt), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  const hashArray = Array.from(new Uint8Array(bits));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return salt + ":" + hashHex;
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const salt = storedHash.split(":")[0];
  const computed = await hashPassword(password, salt);
  return computed === storedHash;
}

auth.post("/register", async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>();

  if (!body.email || !body.password) {
    return c.json({ error: "Email and password are required" }, 400);
  }

  if (body.password.length < 8) {
    return c.json({ error: "Password must be at least 8 characters" }, 400);
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(body.password, salt);

  try {
    const user = await c.env.DB.prepare(
      "INSERT INTO users (email, password_hash) VALUES (?, ?) RETURNING id",
    )
      .bind(body.email, passwordHash)
      .first<{ id: number }>();

    if (!user) {
      return c.json({ error: "Failed to create user" }, 500);
    }

    const token = generateToken();
    await c.env.DB.prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)")
      .bind(token, user.id)
      .run();

    setCookie(c, "session", token, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return c.json({ email: body.email }, 201);
  } catch (e) {
    if (e instanceof Error && e.message.includes("UNIQUE")) {
      return c.json({ error: "Email already registered" }, 409);
    }
    throw e;
  }
});

auth.post("/login", async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>();

  if (!body.email || !body.password) {
    return c.json({ error: "Email and password are required" }, 400);
  }

  const user = await c.env.DB.prepare("SELECT id, password_hash FROM users WHERE email = ?")
    .bind(body.email)
    .first<{ id: number; password_hash: string }>();

  if (!user || !(await verifyPassword(body.password, user.password_hash))) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const token = generateToken();
  await c.env.DB.prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)")
    .bind(token, user.id)
    .run();

  setCookie(c, "session", token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return c.json({ email: body.email });
});

auth.post("/logout", async (c) => {
  const token = getCookie(c, "session");
  if (token) {
    await c.env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
    deleteCookie(c, "session", { path: "/" });
  }
  return c.body(null, 204);
});

auth.get("/me", async (c) => {
  const token = getCookie(c, "session");
  if (!token) {
    return c.json({ user: null });
  }

  const session = await c.env.DB.prepare(
    "SELECT u.id, u.email FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ?",
  )
    .bind(token)
    .first<{ id: number; email: string }>();

  if (!session) {
    deleteCookie(c, "session", { path: "/" });
    return c.json({ user: null });
  }

  return c.json({ user: { email: session.email } });
});

async function requireAuth(c: Context<Env>, next: Next) {
  const token = getCookie(c, "session");
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const session = await c.env.DB.prepare("SELECT user_id FROM sessions WHERE token = ?")
    .bind(token)
    .first<{ user_id: number }>();

  if (!session) {
    deleteCookie(c, "session", { path: "/" });
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("userId", session.user_id);
  await next();
}

export { auth, requireAuth };
export type { Env };
