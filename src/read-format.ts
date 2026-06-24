import { HASH_SEPARATOR, type HashFunction, hashLine, isHash } from "./hash.js";
import { InvalidPatchError } from "./errors.js";

export interface HashLineEntry {
  hash: string;
  content: string;
}

export function toHashLines(lines: string[], hashFn: HashFunction = hashLine): HashLineEntry[] {
  return lines.map((content) => ({ hash: hashFn(content), content }));
}

export function renderHashLines(entries: readonly HashLineEntry[]): string {
  return entries.map(({ hash, content }) => `${hash}${HASH_SEPARATOR}${content}`).join("\n");
}

export function parseHashLine(text: string): HashLineEntry {
  const separatorIndex = text.indexOf(HASH_SEPARATOR);
  if (separatorIndex < 0) {
    throw new InvalidPatchError("Malformed hashline: missing separator.");
  }

  const hash = text.slice(0, separatorIndex);
  if (!isHash(hash)) {
    throw new InvalidPatchError(`Malformed hashline: invalid 4-character base64url hash '${hash}'.`);
  }

  return { hash, content: text.slice(separatorIndex + HASH_SEPARATOR.length) };
}
