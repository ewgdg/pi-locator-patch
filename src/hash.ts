import { createHash } from "node:crypto";

export const HASH_WIDTH = 4;
export const HASH_SEPARATOR = "│";
export const HASH_PATTERN = /^[A-Za-z0-9_-]{1,4}$/;

export type HashFunction = (content: string) => string;

export function hashLine(content: string): string {
  return createHash("sha256").update(content, "utf8").digest().subarray(0, 3).toString("base64url");
}

export function isHash(value: string): boolean {
  return HASH_PATTERN.test(value);
}

// Display heuristic, not true Shannon entropy.
export function entropy(content: string): number {
  const trimmed = content.trim();
  return Math.min(24, Math.log2(new Set(trimmed).size + 1) * Math.log2(trimmed.length + 1));
}

export function hashLengthForLine(content: string): 1 | 2 | 3 | 4 {
  const bits = entropy(content);
  if (bits < 4) return 1;
  if (bits < 10) return 2;
  if (bits < 24) return 3;
  return 4;
}
