import type { Theme } from "@earendil-works/pi-coding-agent";

export const COLLAPSED_RESULT_DIFF_MAX_LINES = 16;
export const EXPANDED_RESULT_DIFF_MAX_LINES = 200;

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

export function buildPatchResultRenderText(options: {
  resultText?: string;
  details: unknown;
  expanded: boolean;
  isPartial: boolean;
  isError: boolean;
  theme: PatchRenderTheme;
}): string {
  const { resultText, details, expanded, isPartial, isError, theme } = options;
  if (isPartial) {
    return theme.fg("warning", "Applying patch...");
  }

  if (isError) {
    return theme.fg("error", firstLine(resultText) ?? "Patch failed");
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
    theme.fg("dim", `${stats.totalLines} diff lines`)
  ];
  const renderedDiff = formatPatchResultDiff(diff, expanded, theme);

  return `${theme.fg("success", summaryParts[0])} ${summaryParts.slice(1).join(theme.fg("dim", " / "))}\n${renderedDiff.text}`;
}

function splitDiffLines(diff: string): string[] {
  return diff.split("\n");
}

function firstLine(text: string | undefined): string | undefined {
  return text?.split("\n", 1)[0];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
