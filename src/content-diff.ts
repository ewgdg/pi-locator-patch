import type { ApplyPatchResult, PatchTranscriptLine } from "./apply.js";
import { hashLine } from "./hash.js";
import { parseText } from "./text-lines.js";

export type PatchTranscriptDiffKind = "add" | "update" | "delete";

export interface PatchTranscriptDiffInput {
  kind: PatchTranscriptDiffKind;
  path: string;
  oldText?: string;
  newText?: string;
  applyResult?: ApplyPatchResult;
}

export function renderPatchTranscriptDiffs(inputs: readonly PatchTranscriptDiffInput[]): string {
  return inputs.map(renderPatchTranscriptDiff).join("\n");
}

export function renderPatchHashReceiptDiffs(inputs: readonly PatchTranscriptDiffInput[]): string {
  return inputs.map(renderPatchHashReceiptDiff).join("\n");
}

export function renderPatchHashReceiptDiff(input: PatchTranscriptDiffInput): string {
  return [renderUniversalPatchHeader(input), ...renderHashReceiptBody(input)].join("\n");
}

export function renderPatchTranscriptDiff(input: PatchTranscriptDiffInput): string {
  return [renderOldPathHeader(input), renderNewPathHeader(input), ...renderTranscriptBody(input)].join("\n");
}

function renderOldPathHeader(input: PatchTranscriptDiffInput): string {
  return `--- ${input.kind === "add" ? "/dev/null" : `a/${input.path}`}`;
}

function renderNewPathHeader(input: PatchTranscriptDiffInput): string {
  return `+++ ${input.kind === "delete" ? "/dev/null" : `b/${input.path}`}`;
}

function renderUniversalPatchHeader(input: PatchTranscriptDiffInput): string {
  const operation = input.kind === "add" ? "Add" : input.kind === "delete" ? "Delete" : "Update";
  return `*** ${operation} File: ${input.path}`;
}

function renderHashReceiptBody(input: PatchTranscriptDiffInput): string[] {
  if (input.kind === "add") {
    return ["@@ add file @@", ...parseText(input.newText ?? "").lines.map((line) => `+${hashLine(line)}`)];
  }

  if (input.kind === "delete") {
    return ["Deleted file"];
  }

  if (!input.applyResult) {
    throw new Error("Update hash receipt requires applyResult.");
  }

  return input.applyResult.hunkTranscripts.flatMap((hunk) => [
    hunk.matchStart === null ? "@@ empty file @@" : `@@ matched line ${hunk.matchStart + 1} @@`,
    ...hunk.lines.flatMap(renderHashReceiptLine)
  ]);
}

function renderHashReceiptLine(line: PatchTranscriptLine): string[] {
  if (line.kind === "insert") return [`+${hashLine(line.content)}`];
  if (line.kind === "context") return [` ${hashLine(line.content)}`];
  return [];
}

function renderTranscriptBody(input: PatchTranscriptDiffInput): string[] {
  if (input.kind === "add") {
    return ["@@ add file @@", ...parseText(input.newText ?? "").lines.map((line) => `+${line}`)];
  }

  if (input.kind === "delete") {
    return ["@@ delete file @@", `-${deletedFileSummary(input.oldText ?? "")}`];
  }

  if (!input.applyResult) {
    throw new Error("Update diff transcript requires applyResult.");
  }

  return input.applyResult.hunkTranscripts.flatMap((hunk) => [
    hunk.matchStart === null ? "@@ empty file @@" : `@@ matched line ${hunk.matchStart + 1} @@`,
    ...hunk.lines.map(renderTranscriptLine)
  ]);
}

function renderTranscriptLine(line: PatchTranscriptLine): string {
  const prefix = line.kind === "insert" ? "+" : line.kind === "delete" ? "-" : " ";
  return `${prefix}${line.content}`;
}

function deletedFileSummary(text: string): string {
  const lineCount = parseText(text).lines.length;
  return `Deleted file (${lineCount} line${lineCount === 1 ? "" : "s"})`;
}
