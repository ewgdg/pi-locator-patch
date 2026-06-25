import { defineTool, withFileMutationQueue } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { readExistingTextFile, resolveExistingRealPath, writeTextFileAtomically } from "../fs-text.js";
import { applyPatchToText, type ApplyPatchResult } from "../apply.js";
import { countRenderedLines, getVisibleOutputOverflow, type VisibleOutputOverflow } from "../output-size.js";

interface PatchReceiptDecision {
  text: string;
  omitted: boolean;
  omitReason?: "empty" | "too_large";
  overflow?: VisibleOutputOverflow;
  visibleLineCount: number;
}

export const patchTool = defineTool({
  name: "patch",
  label: "Hashline Patch",
  description: "Apply a single-file hash-only unified patch to an existing UTF-8 text file.",
  promptSnippet: "patch applies @@ @@ hunks using exact HASH│content anchors from read.",
  promptGuidelines: [
    "patch hunks must use header '@@ @@' and operation lines like ' HHHH│context', '-HHHH│old', '+HHHH│new'.",
    "patch matches only context/deletion hash sequences. Do not use line numbers, duplicate counters, fuzzy fallback, or legacy replace fields.",
    "For patch, each hunk's context/deletion hash sequence must match exactly one span in the current file.",
    "On patch success, visible output is a compact hash-only receipt: '@@ result' plus surviving context hashes prefixed with space and inserted hashes prefixed with '+'. Deleted hashes are omitted; use read when the receipt is omitted or more context is needed."
  ],
  parameters: Type.Object(
    {
      path: Type.String({ description: "Existing target text file to patch." }),
      patch: Type.String({ description: "Hash-only unified patch using @@ @@ hunks." }),
      dry_run: Type.Optional(Type.Boolean({ description: "Validate/apply in memory and do not write." }))
    },
    { additionalProperties: false }
  ),
  async execute(_toolCallId, params, signal, _onUpdate, ctx) {
    if (signal?.aborted) {
      throw new Error("Cancelled");
    }

    const realTargetPath = await resolveExistingRealPath(ctx.cwd, params.path);
    return withFileMutationQueue(realTargetPath, async () => {
      const { text } = await readExistingTextFile(realTargetPath, { writable: true });
      const result = applyPatchToText(text, params.patch);
      const dryRun = params.dry_run ?? false;
      const receipt = buildPatchReceiptDecision(result, dryRun);
      if (!dryRun) {
        await writeTextFileAtomically(realTargetPath, result.text);
      }

      return {
        content: [{ type: "text", text: receipt.text }],
        details: {
          path: realTargetPath,
          dryRun,
          lineCount: result.entries.length,
          receipt: {
            omitted: receipt.omitted,
            omitReason: receipt.omitReason,
            overflow: receipt.overflow,
            visibleLineCount: receipt.visibleLineCount,
            hashLineCount: result.receiptHashLineCount,
            hunkReceipts: result.hunkReceipts
          },
          audit: {
            hunkAudits: result.hunkAudits
          }
        }
      };
    });
  }
});

function buildPatchReceiptDecision(result: ApplyPatchResult, dryRun: boolean): PatchReceiptDecision {
  const action = dryRun ? "Patch dry-run succeeded" : "Patch applied";
  if (result.receiptHashLineCount === 0) {
    return {
      text: `${action}. Receipt omitted: no surviving context or inserted hashes. Use read to inspect current file hashes.`,
      omitted: true,
      omitReason: "empty",
      visibleLineCount: 1
    };
  }

  const visibleLineCount = countRenderedLines(result.renderedReceipt);
  const overflow = getVisibleOutputOverflow(result.renderedReceipt, visibleLineCount);
  if (overflow) {
    return {
      text: `${action}. Receipt omitted: ${overflow.actual} exceeds visible cap ${overflow.max}. Use read to inspect current file hashes.`,
      omitted: true,
      omitReason: "too_large",
      overflow,
      visibleLineCount
    };
  }

  return {
    text: result.renderedReceipt,
    omitted: false,
    visibleLineCount
  };
}
