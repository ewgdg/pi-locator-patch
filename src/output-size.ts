import * as PiCodingAgent from "@earendil-works/pi-coding-agent";
import { OutputTooLargeError } from "./errors.js";

export const LLM_VISIBLE_OUTPUT_MAX_BYTES = PiCodingAgent.DEFAULT_MAX_BYTES;

// Pi's documented visible-output cap is 2000 lines; keep fallback for older Pi builds without the export.
const LOCAL_DEFAULT_MAX_LINES = 2000;
const piDefaultMaxLines = (PiCodingAgent as { DEFAULT_MAX_LINES?: unknown }).DEFAULT_MAX_LINES;
export const LLM_VISIBLE_OUTPUT_MAX_LINES =
  typeof piDefaultMaxLines === "number" ? piDefaultMaxLines : LOCAL_DEFAULT_MAX_LINES;

type HashlineToolName = "hashline_read" | "hashline_patch";

export function assertHashlineOutputFits(
  toolName: HashlineToolName,
  renderedOutput: string,
  renderedLineCount = countRenderedLines(renderedOutput)
): void {
  if (renderedLineCount > LLM_VISIBLE_OUTPUT_MAX_LINES) {
    throw outputTooLargeError(toolName, `${renderedLineCount} lines`, `${LLM_VISIBLE_OUTPUT_MAX_LINES} lines`);
  }

  const byteLength = Buffer.byteLength(renderedOutput, "utf8");
  if (byteLength > LLM_VISIBLE_OUTPUT_MAX_BYTES) {
    throw outputTooLargeError(toolName, `${byteLength} bytes`, `${LLM_VISIBLE_OUTPUT_MAX_BYTES} bytes`);
  }
}

function countRenderedLines(renderedOutput: string): number {
  return renderedOutput === "" ? 0 : renderedOutput.split("\n").length;
}

function outputTooLargeError(toolName: HashlineToolName, actual: string, max: string): OutputTooLargeError {
  if (toolName === "hashline_read") {
    return new OutputTooLargeError(
      `hashline_read output is ${actual}, exceeding ${max}. Use a lower limit and/or different offset to paginate; no file was written.`
    );
  }

  return new OutputTooLargeError(
    `hashline_patch success output is ${actual}, exceeding ${max}. No file was written; reduce resulting file size before retrying.`
  );
}
