import { defineTool, withFileMutationQueue } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { readExistingTextFile, resolveExistingRealPath, writeTextFileAtomically } from "../fs-text.js";
import { applyPatchToText } from "../apply.js";
import { assertHashlineOutputFits } from "../output-size.js";

export const hashlinePatchTool = defineTool({
  name: "hashline_patch",
  label: "Hashline Patch",
  description: "Apply a single-file hash-only unified patch to an existing UTF-8 text file.",
  promptSnippet: "hashline_patch applies @@ @@ hunks using exact HASH│content anchors from hashline_read.",
  promptGuidelines: [
    "hashline_patch hunks must use header '@@ @@' and operation lines like ' HHHH│context', '-HHHH│old', '+HHHH│new'.",
    "hashline_patch matches only context/deletion hash sequences. Do not use line numbers, duplicate counters, fuzzy fallback, or legacy replace fields.",
    "For hashline_patch, each hunk's context/deletion hash sequence must match exactly one span in the current file."
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
      assertHashlineOutputFits("hashline_patch", result.renderedHashLines, result.entries.length);
      const dryRun = params.dry_run ?? false;
      if (!dryRun) {
        await writeTextFileAtomically(realTargetPath, result.text);
      }

      return {
        content: [{ type: "text", text: result.renderedHashLines }],
        details: {
          path: realTargetPath,
          dryRun,
          lineCount: result.entries.length
        }
      };
    });
  }
});
