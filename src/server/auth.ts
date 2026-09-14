import type { NextRequest } from "next/server";
import { GameError } from "@/game/errors";
import { findProfile } from "@/server/profiles";
import { supabase } from "@/server/supabase";

export interface AccountUser {
  id: string;
  username: string;
}

/** The Supabase access token from `Authorization: Bearer <token>`, or null when the header is absent. */
export function bearerToken(req: Pick<NextRequest, "headers">): string | null {
  const header = req.headers.get("authorization");
  return header?.startsWith("Bearer ") === true ? header.slice("Bearer ".length) : null;
}

/** Verify an access token with Supabase Auth: the user's id and email, or GameError("unauthorized"). */
export async function verifyToken(token: string): Promise<{ id: string; email: string | undefined }> {
  const { data, error } = await supabase.auth.getUser(token);
  if (error !== null) throw new GameError("unauthorized", "That sign-in is not good here. Sign in again.");
  return { id: data.user.id, email: data.user.email };
}

/** Verify the token and load its profile; GameError("unauthorized") when either is missing. */
export async function loadAccount(token: string): Promise<AccountUser & { email: string | undefined }> {
  const { id, email } = await verifyToken(token);
  const username = await findProfile(id);
  if (username === null) throw new GameError("unauthorized", "This sign-in has no name yet. Finish signing up.");
  return { id, username, email };
}

/**
 * Resolve the signed-in account from `Authorization: Bearer <supabase access token>`.
 * Verifies the token with Supabase Auth (server client) and loads the profile row.
 * Throws GameError("unauthorized") when the token is missing, invalid, or has no profile.
 */
export async function requireUser(req: Pick<NextRequest, "headers">): Promise<AccountUser> {
  const token = bearerToken(req);
  if (token === null) throw new GameError("unauthorized", "Sign in first.");
  const { id, username } = await loadAccount(token);
  return { id, username };
}

/** Like requireUser but resolves to null instead of throwing when there is no token. */
export async function optionalUser(req: Pick<NextRequest, "headers">): Promise<AccountUser | null> {
  return bearerToken(req) === null ? null : requireUser(req);
}
