import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { readLocatorPatchConfig } from "./config.js";
import {
  patchTool,
  setPatchToolProfileGuideline,
} from "./tools/locator-patch.js";
import { hashProfileReadTool } from "./tools/locator-read.js";

export default function piLocatorPatch(pi: ExtensionAPI): void {
  pi.registerTool(patchTool);

  pi.on("session_start", async (_event, ctx) => {
    const activeTools = pi.getActiveTools();
    const { profile } = await readLocatorPatchConfig();
    if (profile === "hash") {
      pi.registerTool(hashProfileReadTool);
    }
    const requiredLocatorTools =
      profile === "hash" ? [hashProfileReadTool.name, "patch"] : ["patch"];
    setPatchToolProfileGuideline(profile);
    const withoutConflictingTools = activeTools.filter(
      (tool) =>
        tool !== "read_hash" &&
        tool !== "edit" &&
        tool !== "write" &&
        tool !== "locator_read" &&
        tool !== "locator_patch",
    );
    pi.setActiveTools([
      ...new Set([...withoutConflictingTools, ...requiredLocatorTools]),
    ]);
  });
}
