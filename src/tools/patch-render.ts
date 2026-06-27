import type { Theme } from "@earendil-works/pi-coding-agent";

export const COLLAPSED_RESULT_DIFF_MAX_LINES = 16;
export const EXPANDED_RESULT_DIFF_MAX_LINES = 200;
export const COLLAPSED_ERROR_INPUT_MAX_LINES = 16;
export const EXPANDED_ERROR_INPUT_MAX_LINES = 200;
export const COLLAPSED_ERROR_INPUT_CONTEXT_RADIUS = 4;
export const EXPANDED_ERROR_INPUT_CONTEXT_RADIUS = 20;

export type PatchRenderTheme = Pick<Theme, "fg">;

export interface PatchDiffStats {
  additions: number;
  removals: number;
  totalLines: number;
}

export interface FormattedPatchResultDiff {
  text: string;
  omittedLineCount: number;
  shownLineCount: number;
  totalLineCount: number;
}

export function getPatchResultText(result: { content?: Array<{ type: string; text?: string }> }): string | undefined {
  const textContent = result.content?.find(
    (entry): entry is { type: "text"; text: string } => entry.type === "text" && typeof entry.text === "string"
  );
  return textContent?.text;
}

export function getPatchResultDiff(details: unknown): string | undefined {
  if (!isRecord(details) || typeof details.diff !== "string" || details.diff.length === 0) {
    return undefined;
  }
  return details.diff;
}

export function getPatchDiffStats(diff: string): PatchDiffStats {
  let additions = 0;
  let removals = 0;
  const lines = splitDiffLines(diff);
  for (const line of lines) {
    if (line.startsWith("+") && !line.startsWith("+++")) additions += 1;
    if (line.startsWith("-") && !line.startsWith("---")) removals += 1;
  }
  return { additions, removals, totalLines: lines.length };
}

export function formatPatchResultDiff(diff: string, expanded: boolean, theme: PatchRenderTheme): FormattedPatchResultDiff {
  const lines = splitDiffLines(diff);
  const maxLines = expanded ? EXPANDED_RESULT_DIFF_MAX_LINES : COLLAPSED_RESULT_DIFF_MAX_LINES;
  const shownLines = lines.slice(0, maxLines);
  const omittedLineCount = Math.max(0, lines.length - shownLines.length);
  const renderedLines = colorPatchDiffLines(shownLines, theme);

  if (omittedLineCount > 0) {
    const suffix = expanded ? "omitted" : "omitted; Ctrl+O to expand";
    renderedLines.push(theme.fg("muted", `... ${omittedLineCount} more diff lines ${suffix}`));
  }

  return {
    text: renderedLines.join("\n"),
    omittedLineCount,
    shownLineCount: shownLines.length,
    totalLineCount: lines.length
  };
}

export function colorPatchDiffLines(lines: readonly string[], theme: PatchRenderTheme): string[] {
  return lines.map((line) => {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      return theme.fg("toolDiffAdded", line);
    }
    if (line.startsWith("-") && !line.startsWith("---")) {
      return theme.fg("toolDiffRemoved", line);
    }
    return theme.fg("toolDiffContext", line);
  });
}

export function formatPatchErrorInputPreview(input: unknown, expanded: boolean, theme: PatchRenderTheme, errorText?: string): string | undefined {
  if (!isRecord(input)) {
    return undefined;
  }

  if (typeof input.patch === "string") {
    return formatPatchTextPreview("patch", input.patch, expanded, theme, getErrorInputLine(errorText));
  }

  if (typeof input.patch_file === "string") {
    return [
      theme.fg("muted", "Agent input:"),
      `${theme.fg("dim", "patch_file: ")}${theme.fg("toolDiffContext", input.patch_file)}`
    ].join("\n");
  }

  return undefined;
}

export function buildPatchResultRenderText(options: {
  resultText?: string;
  details: unknown;
  expanded: boolean;
  isPartial: boolean;
  isError: boolean;
  errorInput?: unknown;
  theme: PatchRenderTheme;
}): string {
  const { resultText, details, expanded, isPartial, isError, errorInput, theme } = options;
  if (isPartial) {
    return theme.fg("warning", "Applying patch...");
  }

  if (isError) {
    const errorText = firstLine(resultText) ?? "Patch failed";
    const preview = formatPatchErrorInputPreview(errorInput, expanded, theme, errorText);
    return [theme.fg("error", errorText), preview].filter((part): part is string => Boolean(part)).join("\n");
  }

  const diff = getPatchResultDiff(details);
  if (!diff) {
    return theme.fg("success", firstLine(resultText) ?? "Patch completed");
  }

  const stats = getPatchDiffStats(diff);
  const dryRun = isRecord(details) && details.dryRun === true;
  const summaryParts = [
    dryRun ? "Patch dry-run succeeded" : "Patch applied",
    theme.fg("toolDiffAdded", `+${stats.additions}`),
    theme.fg("toolDiffRemoved", `-${stats.removals}`),
  ];
  const renderedDiff = formatPatchResultDiff(diff, expanded, theme);

  return `${theme.fg("success", summaryParts[0])} ${summaryParts.slice(1).join(theme.fg("dim", " / "))}\n${renderedDiff.text}`;
}

function formatPatchTextPreview(label: string, text: string, expanded: boolean, theme: PatchRenderTheme, targetLine?: number): string {
  const lines = splitInputLines(text);
  if (targetLine !== undefined && targetLine >= 1 && targetLine <= lines.length) {
    return formatPatchTextWindow(label, lines, expanded, theme, targetLine);
  }

  const maxLines = expanded ? EXPANDED_ERROR_INPUT_MAX_LINES : COLLAPSED_ERROR_INPUT_MAX_LINES;
  const shownLines = lines.slice(0, maxLines);
  const omittedLineCount = Math.max(0, lines.length - shownLines.length);
  const renderedLines = renderNumberedPatchLines(shownLines, 1, lines.length, theme);

  if (omittedLineCount > 0) {
    const suffix = expanded ? "omitted" : "omitted; Ctrl+O to expand";
    renderedLines.push(theme.fg("muted", `... ${omittedLineCount} more input lines ${suffix}`));
  }

  const countSummary = lines.length === shownLines.length ? `${lines.length} lines` : `${shownLines.length}/${lines.length} lines`;
  return [theme.fg("muted", `Agent input preview (${label}, ${countSummary}):`), ...renderedLines].join("\n");
}

function formatPatchTextWindow(label: string, lines: readonly string[], expanded: boolean, theme: PatchRenderTheme, targetLine: number): string {
  const radius = expanded ? EXPANDED_ERROR_INPUT_CONTEXT_RADIUS : COLLAPSED_ERROR_INPUT_CONTEXT_RADIUS;
  const startLine = Math.max(1, targetLine - radius);
  const endLine = Math.min(lines.length, targetLine + radius);
  const shownLines = lines.slice(startLine - 1, endLine);
  const renderedLines = renderNumberedPatchLines(shownLines, startLine, lines.length, theme, targetLine);

  if (startLine > 1) {
    renderedLines.unshift(theme.fg("muted", `... ${startLine - 1} earlier input lines omitted`));
  }
  if (endLine < lines.length) {
    renderedLines.push(theme.fg("muted", `... ${lines.length - endLine} later input lines omitted`));
  }

  return [theme.fg("muted", `Agent input around line ${targetLine} (${label}, lines ${startLine}-${endLine} of ${lines.length}):`), ...renderedLines].join("\n");
}

function renderNumberedPatchLines(lines: readonly string[], startLine: number, totalLineCount: number, theme: PatchRenderTheme, targetLine?: number): string[] {
  const numberWidth = String(Math.max(totalLineCount, 1)).length;
  return colorPatchDiffLines(lines, theme).map((line, index) => {
    const actualLine = startLine + index;
    const lineNumber = String(actualLine).padStart(numberWidth, " ");
    const lineNumberTheme = actualLine === targetLine ? "error" : "dim";
    return `${theme.fg(lineNumberTheme, `${lineNumber} │ `)}${line}`;
  });
}

function getErrorInputLine(errorText: string | undefined): number | undefined {
  const match = /^\[[A-Z0-9_]+\] Line ([1-9]\d*):/.exec(errorText ?? "");
  return match ? Number(match[1]) : undefined;
}

function splitDiffLines(diff: string): string[] {
  return diff.split("\n");
}

function splitInputLines(text: string): string[] {
  const lines = text.split(/\r\n|\n|\r/);
  if (lines.at(-1) === "") {
    lines.pop();
  }
  return lines;
}

function firstLine(text: string | undefined): string | undefined {
  return text?.split("\n", 1)[0];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
