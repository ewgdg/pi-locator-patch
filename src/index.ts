import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { hashlinePatchTool } from "./tools/hashline-patch.js";
import { hashlineReadTool } from "./tools/hashline-read.js";

export default function piHashlinePatch(pi: ExtensionAPI): void {
  pi.registerTool(hashlineReadTool);
  pi.registerTool(hashlinePatchTool);
}
