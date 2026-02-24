// src/lib/redis.ts
import { Redis } from '@upstash/redis';

const url   = import.meta.env.UPSTASH_REDIS_REST_URL;
const token = import.meta.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  console.warn('[Redis] Variables manquantes — cache désactivé');
}

export const redis = url && token
  ? new Redis({ url, token })
  : null;
