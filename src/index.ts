import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { hashlinePatchTool } from "./tools/hashline-patch.js";
import { hashlineReadTool } from "./tools/hashline-read.js";

export default function piHashlinePatch(pi: ExtensionAPI): void {
  pi.registerTool(hashlineReadTool);
  pi.registerTool(hashlinePatchTool);

  pi.on("session_start", () => {
    const activeTools = pi.getActiveTools();
    const hashlineTools = ["hashline_read", "hashline_patch"];
    const withoutPlainTextEditTools = activeTools.filter((tool) => tool !== "read" && tool !== "edit");
    pi.setActiveTools([...new Set([...withoutPlainTextEditTools, ...hashlineTools])]);
  });
}
