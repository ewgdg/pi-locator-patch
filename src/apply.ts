import { AmbiguousHunkError, StaleHunkError, UnsupportedHunkError } from "./errors.js";
import { type HashFunction, hashLine } from "./hash.js";
import { parsePatch, type Hunk, type Patch } from "./patch-format.js";
import { renderHashLines, toHashLines, type HashLineEntry } from "./read-format.js";
import { parseText, serializeText } from "./text-lines.js";

export interface ApplyPatchOptions {
  hashFn?: HashFunction;
}

export interface ApplyPatchResult {
  text: string;
  entries: HashLineEntry[];
  renderedHashLines: string;
}

export function applyPatchToText(
  text: string,
  patchInput: string | Patch,
  options: ApplyPatchOptions = {}
): ApplyPatchResult {
  const hashFn = options.hashFn ?? hashLine;
  const patch = typeof patchInput === "string" ? parsePatch(patchInput, hashFn) : patchInput;
  const model = parseText(text);
  let currentLines = [...model.lines];

  for (const [hunkOffset, hunk] of patch.hunks.entries()) {
    currentLines = applyHunk(currentLines, hunk, hunkOffset + 1, hashFn);
  }

  const finalText = serializeText({
    ...model,
    lines: currentLines,
    finalNewline: currentLines.length > 0 ? model.finalNewline : false
  });
  const entries = toHashLines(currentLines, hashFn);
  return { text: finalText, entries, renderedHashLines: renderHashLines(entries) };
}

function applyHunk(lines: string[], hunk: Hunk, hunkIndex: number, hashFn: HashFunction): string[] {
  const matchHashes = hunk.ops.filter((op) => op.kind !== "insert").map((op) => op.hash);

  if (matchHashes.length === 0) {
    if (lines.length === 0 && hunk.ops.every((op) => op.kind === "insert")) {
      return hunk.ops.map((op) => op.content);
    }
    throw new UnsupportedHunkError(`Hunk ${hunkIndex} has no context/deletion hashes; pure insertion requires an empty file.`);
  }

  const currentHashes = lines.map(hashFn);
  const matches = findContiguousMatches(currentHashes, matchHashes);
  if (matches.length === 0) {
    throw new StaleHunkError(`Hunk ${hunkIndex} match sequence ${matchHashes.join(" ")} was not found.`);
  }
  if (matches.length > 1) {
    throw new AmbiguousHunkError(
      `Hunk ${hunkIndex} match sequence ${matchHashes.join(" ")} matched ${matches.length} spans.`
    );
  }

  const start = matches[0];
  let consumed = 0;
  const replacement: string[] = [];

  for (const op of hunk.ops) {
    if (op.kind === "insert") {
      replacement.push(op.content);
      continue;
    }

    const targetContent = lines[start + consumed];
    if (op.kind === "context") {
      replacement.push(targetContent);
    }
    consumed += 1;
  }

  return [...lines.slice(0, start), ...replacement, ...lines.slice(start + matchHashes.length)];
}

function findContiguousMatches(hashes: string[], sequence: string[]): number[] {
  const matches: number[] = [];
  for (let index = 0; index <= hashes.length - sequence.length; index += 1) {
    if (sequence.every((hash, offset) => hashes[index + offset] === hash)) {
      matches.push(index);
    }
  }
  return matches;
}
