import { createHash } from "node:crypto";

export const HASH_WIDTH = 4;
export const HASH_SEPARATOR = "│";
export const HASH_PATTERN = /^[A-Za-z0-9_-]{4}$/;

export type HashFunction = (content: string) => string;

export function hashLine(content: string): string {
  return createHash("sha256").update(content, "utf8").digest().subarray(0, 3).toString("base64url");
}

export function isHash(value: string): boolean {
  return HASH_PATTERN.test(value);
}
