import { describe, expect, it } from "vitest";
import piLocatorPatch from "../src/index.js";

describe("extension registration", () => {
  it("registers read_hash/patch and activates them while hiding write/edit", () => {
    const registeredTools: string[] = [];
    let sessionStart: (() => void) | undefined;
    let activeTools = ["read", "edit", "write", "locator_read", "locator_patch"];

    piLocatorPatch({
      registerTool(tool: { name: string }) {
        registeredTools.push(tool.name);
      },
      on(event: string, handler: () => void) {
        if (event === "session_start") {
          sessionStart = handler;
        }
      },
      getActiveTools() {
        return activeTools;
      },
      setActiveTools(nextTools: string[]) {
        activeTools = nextTools;
      }
    } as never);

    expect(registeredTools).toEqual(["read_hash", "patch"]);

    sessionStart?.();

    expect(activeTools).toContain("read");
    expect(activeTools).toContain("read_hash");
    expect(activeTools).toContain("patch");
    expect(activeTools).not.toContain("write");
    expect(activeTools).not.toContain("edit");
    expect(activeTools).not.toContain("locator_read");
    expect(activeTools).not.toContain("locator_patch");
  });
});
