import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { patchTool } from "./tools/locator-patch.js";
import { readTool } from "./tools/locator-read.js";

export default function piLocatorPatch(pi: ExtensionAPI): void {
  pi.registerTool(readTool);
  pi.registerTool(patchTool);

  pi.on("session_start", () => {
    const activeTools = pi.getActiveTools();
    const requiredLocatorTools = ["read", "patch"];
    const withoutConflictingTools = activeTools.filter(
      (tool) => tool !== "edit" && tool !== "write" && tool !== "locator_read" && tool !== "locator_patch"
    );
    pi.setActiveTools([...new Set([...withoutConflictingTools, ...requiredLocatorTools])]);
  });
}
