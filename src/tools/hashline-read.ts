import { defineTool } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { readExistingTextFile, resolveToolPath } from "../fs-text.js";
import { assertHashlineOutputFits, LLM_VISIBLE_OUTPUT_MAX_LINES } from "../output-size.js";
import { renderHashLines, toHashLines } from "../read-format.js";
import { parseText } from "../text-lines.js";

const MAX_LIMIT = LLM_VISIBLE_OUTPUT_MAX_LINES;

export const hashlineReadTool = defineTool({
  name: "hashline_read",
  label: "Hashline Read",
  description: "Read a UTF-8 text file as stable HASH│content lines.",
  promptSnippet: "hashline_read reads text files as stable 4-character HASH│content rows for hash-only patching.",
  promptGuidelines: [
    "Use hashline_read before hashline_patch so patches can anchor on HASH│content rows.",
    "hashline_read output has no line numbers, duplicate counters, or fuzzy anchors."
  ],
  parameters: Type.Object(
    {
      path: Type.String({ description: "Text file path to read as hashlines." }),
      offset: Type.Optional(Type.Integer({ minimum: 1, description: "1-based logical line offset." })),
      limit: Type.Optional(Type.Integer({ minimum: 1, maximum: MAX_LIMIT, description: "Max logical lines to return." }))
    },
    { additionalProperties: false }
  ),
  async execute(_toolCallId, params, signal, _onUpdate, ctx) {
    if (signal?.aborted) {
      throw new Error("Cancelled");
    }

    const offset = params.offset ?? 1;
    const limit = params.limit ?? MAX_LIMIT;
    const absolutePath = resolveToolPath(ctx.cwd, params.path);
    const { path, text } = await readExistingTextFile(absolutePath);
    const model = parseText(text);
    const selected = model.lines.slice(offset - 1, offset - 1 + limit);
    const entries = toHashLines(selected);
    const renderedHashLines = renderHashLines(entries);
    assertHashlineOutputFits("hashline_read", renderedHashLines, entries.length);

    return {
      content: [{ type: "text", text: renderedHashLines }],
      details: {
        path,
        offset,
        limit,
        lineCount: model.lines.length,
        returnedLineCount: entries.length,
        hasMore: offset - 1 + limit < model.lines.length
      }
    };
  }
});
