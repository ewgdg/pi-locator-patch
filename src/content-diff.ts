import type { ApplyPatchResult, PatchTranscriptLine } from "./apply.js";
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

export function renderPatchTranscriptDiff(input: PatchTranscriptDiffInput): string {
  return [renderOldPathHeader(input), renderNewPathHeader(input), ...renderTranscriptBody(input)].join("\n");
}

function renderOldPathHeader(input: PatchTranscriptDiffInput): string {
  return `--- ${input.kind === "add" ? "/dev/null" : `a/${input.path}`}`;
}

function renderNewPathHeader(input: PatchTranscriptDiffInput): string {
  return `+++ ${input.kind === "delete" ? "/dev/null" : `b/${input.path}`}`;
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
