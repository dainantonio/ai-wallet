import * as client from "openid-client";
import crypto from "crypto";
import { type Request, type Response } from "express";

export const ISSUER_URL = process.env.ISSUER_URL ?? "https://replit.com/oidc";
export const SESSION_COOKIE = "sid";
export const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

export interface SessionData {
  user: AuthUser;
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

interface SessionRecord {
  data: SessionData;
  expiresAt: number;
}

// ─── In-memory stores (no database required) ─────────────────────────────────
const sessions = new Map<string, SessionRecord>();
export const usersStore = new Map<string, AuthUser>();

// Clean up expired sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [sid, rec] of sessions) {
    if (rec.expiresAt < now) sessions.delete(sid);
  }
}, 5 * 60 * 1000);

// ─── OIDC config ──────────────────────────────────────────────────────────────
let oidcConfig: client.Configuration | null = null;

export async function getOidcConfig(): Promise<client.Configuration> {
  if (!oidcConfig) {
    oidcConfig = await client.discovery(
      new URL(ISSUER_URL),
      process.env.REPL_ID!,
    );
  }
  return oidcConfig;
}

// ─── Session CRUD ─────────────────────────────────────────────────────────────
export async function createSession(data: SessionData): Promise<string> {
  const sid = crypto.randomBytes(32).toString("hex");
  sessions.set(sid, { data, expiresAt: Date.now() + SESSION_TTL });
  return sid;
}

export async function getSession(sid: string): Promise<SessionData | null> {
  const record = sessions.get(sid);
  if (!record) return null;
  if (record.expiresAt < Date.now()) {
    sessions.delete(sid);
    return null;
  }
  return record.data;
}

export async function updateSession(sid: string, data: SessionData): Promise<void> {
  const record = sessions.get(sid);
  if (record) {
    record.data = data;
    record.expiresAt = Date.now() + SESSION_TTL;
  }
}

export async function deleteSession(sid: string): Promise<void> {
  sessions.delete(sid);
}

export async function clearSession(res: Response, sid?: string): Promise<void> {
  if (sid) await deleteSession(sid);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export function getSessionId(req: Request): string | undefined {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  return req.cookies?.[SESSION_COOKIE];
}

// ─── User upsert (in-memory) ─────────────────────────────────────────────────
export function upsertUser(claims: Record<string, unknown>): AuthUser {
  const user: AuthUser = {
    id: claims.sub as string,
    email: (claims.email as string) || null,
    firstName: (claims.first_name as string) || null,
    lastName: (claims.last_name as string) || null,
    profileImageUrl: (claims.profile_image_url || claims.picture) as string | null,
  };
  usersStore.set(user.id, user);
  return user;
}
