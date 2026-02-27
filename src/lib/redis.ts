// src/lib/redis.ts
import { Redis } from '@upstash/redis';

const url   = import.meta.env.KV_REST_API_URL;
const token = import.meta.env.KV_REST_API_TOKEN;

if (!url || !token) {
  console.warn('[Redis] Variables manquantes (KV_REST_API_URL / KV_REST_API_TOKEN) — cache désactivé');
}

export const redis = url && token
  ? new Redis({ url, token })
  : null;
