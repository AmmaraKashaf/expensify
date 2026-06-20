import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "../lib/prisma";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface AuthRequest extends Request {
  userId?: string;
  isDemo?: boolean;
}

// Cache token → internal userId to avoid a Supabase API call + DB upsert on every request.
// TTL: 5 minutes. Cleared on expiry; tokens invalidated server-side will be rejected on next cache miss.
interface CacheEntry { userId: string; expiresAt: number }
const tokenCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

// Periodically purge expired entries so the map doesn't grow unbounded
setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of tokenCache) {
    if (entry.expiresAt <= now) tokenCache.delete(token);
  }
}, CACHE_TTL_MS);

let demoUserId: string | null = null;

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing authorization header" });
    return;
  }

  const token = authHeader.slice(7);

  // Demo token bypass — cache the demo user id after first lookup
  if (token === "demo") {
    if (!demoUserId) {
      const demoUser = await prisma.user.findUnique({ where: { email: "demo@wealthlens.app" } });
      if (!demoUser) {
        res.status(401).json({ error: "Demo user not found. Run the seed script first." });
        return;
      }
      demoUserId = demoUser.id;
    }
    req.userId = demoUserId;
    req.isDemo = true;
    return next();
  }

  // Check in-memory cache first
  const cached = tokenCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    req.userId = cached.userId;
    return next();
  }

  // Cache miss — verify with Supabase and upsert user
  const { data, error } = await supabaseAdmin.auth.getUser(token).catch(() => ({ data: { user: null }, error: true }));
  if (error || !data.user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const user = await prisma.user.upsert({
    where: { supabaseId: data.user.id },
    update: { email: data.user.email! },
    create: {
      email: data.user.email!,
      supabaseId: data.user.id,
      displayName: data.user.user_metadata?.display_name,
    },
  });

  tokenCache.set(token, { userId: user.id, expiresAt: Date.now() + CACHE_TTL_MS });
  req.userId = user.id;
  next();
}
