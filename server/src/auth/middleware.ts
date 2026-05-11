import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Request, Response, NextFunction } from "express";

let supabase: SupabaseClient | null = null;

// Wraps fetch to return an error Response instead of throwing on network failure,
// preventing @supabase/auth-js from printing raw network errors to console.
const silentFetch: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, init);
  } catch {
    return new Response(JSON.stringify({ error: "Network unavailable", message: "Network unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
};

function getSupabase(): SupabaseClient {
  if (!supabase) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
    supabase = createClient(url, key, { global: { fetch: silentFetch } });
  }
  return supabase;
}

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token manquant" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const { data, error } = await getSupabase().auth.getUser(token);
    if (error || !data.user) {
      res.status(401).json({ error: "Token invalide" });
      return;
    }

    req.userId = data.user.id;
    next();
  } catch {
    res.status(401).json({ error: "Erreur d'authentification" });
  }
}
