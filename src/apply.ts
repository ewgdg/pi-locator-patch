import { AmbiguousHunkError, StaleHunkError, UnsupportedHunkError } from "./errors.js";
import { type HashFunction, hashLine } from "./hash.js";
import { parsePatch, type Hunk, type Patch } from "./patch-format.js";
import { renderHashLines, toHashLines, type HashLineEntry } from "./read-format.js";
import { parseText, serializeText } from "./text-lines.js";

export interface ApplyPatchOptions {
  hashFn?: HashFunction;
}

export type PatchReceiptLineKind = "context" | "insert";

export interface PatchReceiptLine {
  kind: PatchReceiptLineKind;
  hash: string;
}

export interface PatchHunkReceipt {
  hunkIndex: number;
  lines: PatchReceiptLine[];
}

export interface PatchHunkAudit {
  hunkIndex: number;
  matchStart: number | null;
  matchHashes: string[];
  survivingContextHashes: string[];
  insertedHashes: string[];
  deletedHashes: string[];
}

export interface ApplyPatchResult {
  text: string;
  entries: HashLineEntry[];
  renderedHashLines: string;
  hunkReceipts: PatchHunkReceipt[];
  hunkAudits: PatchHunkAudit[];
  renderedReceipt: string;
  receiptHashLineCount: number;
}

interface AppliedHunk {
  lines: string[];
  receipt: PatchHunkReceipt;
  audit: PatchHunkAudit;
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
  const hunkReceipts: PatchHunkReceipt[] = [];
  const hunkAudits: PatchHunkAudit[] = [];

  for (const [hunkOffset, hunk] of patch.hunks.entries()) {
    const applied = applyHunk(currentLines, hunk, hunkOffset + 1, hashFn);
    currentLines = applied.lines;
    hunkReceipts.push(applied.receipt);
    hunkAudits.push(applied.audit);
  }

  const finalText = serializeText({
    ...model,
    lines: currentLines,
    finalNewline: currentLines.length > 0 ? model.finalNewline : false
  });
  const entries = toHashLines(currentLines, hashFn);
  return {
    text: finalText,
    entries,
    renderedHashLines: renderHashLines(entries),
    hunkReceipts,
    hunkAudits,
    renderedReceipt: renderPatchReceipt(hunkReceipts),
    receiptHashLineCount: hunkReceipts.reduce((count, receipt) => count + receipt.lines.length, 0)
  };
}

export function renderPatchReceipt(receipts: readonly PatchHunkReceipt[]): string {
  return receipts
    .flatMap((receipt) => ["@@ result", ...receipt.lines.map(renderPatchReceiptLine)])
    .join("\n");
}

function renderPatchReceiptLine(line: PatchReceiptLine): string {
  return `${line.kind === "insert" ? "+" : " "}${line.hash}`;
}

function applyHunk(lines: string[], hunk: Hunk, hunkIndex: number, hashFn: HashFunction): AppliedHunk {
  const matchHashes = hunk.ops.filter((op) => op.kind !== "insert").map((op) => op.hash);

  if (matchHashes.length === 0) {
    if (lines.length === 0 && hunk.ops.every((op) => op.kind === "insert")) {
      const insertedHashes = hunk.ops.map((op) => hashFn(op.content));
      return {
        lines: hunk.ops.map((op) => op.content),
        receipt: {
          hunkIndex,
          lines: insertedHashes.map((hash) => ({ kind: "insert", hash }))
        },
        audit: {
          hunkIndex,
          matchStart: null,
          matchHashes,
          survivingContextHashes: [],
          insertedHashes,
          deletedHashes: []
        }
      };
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
  const receiptLines: PatchReceiptLine[] = [];
  const survivingContextHashes: string[] = [];
  const insertedHashes: string[] = [];
  const deletedHashes: string[] = [];

  for (const op of hunk.ops) {
    if (op.kind === "insert") {
      replacement.push(op.content);
      const insertedHash = hashFn(op.content);
      insertedHashes.push(insertedHash);
      receiptLines.push({ kind: "insert", hash: insertedHash });
      continue;
    }

    const targetContent = lines[start + consumed];
    const targetHash = hashFn(targetContent);
    if (op.kind === "context") {
      replacement.push(targetContent);
      survivingContextHashes.push(targetHash);
      receiptLines.push({ kind: "context", hash: targetHash });
    } else {
      deletedHashes.push(targetHash);
    }
    consumed += 1;
  }

  return {
    lines: [...lines.slice(0, start), ...replacement, ...lines.slice(start + matchHashes.length)],
    receipt: { hunkIndex, lines: receiptLines },
    audit: {
      hunkIndex,
      matchStart: start,
      matchHashes,
      survivingContextHashes,
      insertedHashes,
      deletedHashes
    }
  };
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
