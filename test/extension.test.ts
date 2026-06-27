import { describe, expect, it } from "vitest";
import piLocatorPatch from "../src/index.js";
import { patchTool } from "../src/tools/locator-patch.js";

describe("extension registration", () => {
  it("keeps read by default while hiding write/edit", async () => {
    const registeredTools: string[] = [];
    let sessionStart: ((event: unknown, ctx: unknown) => Promise<void> | void) | undefined;
    let activeTools = ["read", "edit", "write", "locator_read", "locator_patch"];

    piLocatorPatch({
      registerTool(tool: { name: string }) {
        registeredTools.push(tool.name);
      },
      on(event: string, handler: (event: unknown, ctx: unknown) => Promise<void> | void) {
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

    await sessionStart?.({}, { cwd: process.cwd(), isProjectTrusted: () => false });

    expect(activeTools).toContain("read");
    expect(activeTools).toContain("read_hash");
    expect(activeTools).toContain("patch");
    expect(patchTool.promptGuidelines?.join("\n")).not.toContain("Hash mode");
    expect(activeTools).not.toContain("write");
    expect(activeTools).not.toContain("edit");
    expect(activeTools).not.toContain("locator_read");
    expect(activeTools).not.toContain("locator_patch");
  });

  it("hides read when hash mode is enabled", async () => {
    const previous = process.env.PI_LOCATOR_PATCH_HASH_MODE;
    process.env.PI_LOCATOR_PATCH_HASH_MODE = "1";
    try {
      let sessionStart: ((event: unknown, ctx: unknown) => Promise<void> | void) | undefined;
      let activeTools = ["read", "edit", "write"];

      piLocatorPatch({
        registerTool() {},
        on(event: string, handler: (event: unknown, ctx: unknown) => Promise<void> | void) {
          if (event === "session_start") sessionStart = handler;
        },
        getActiveTools() {
          return activeTools;
        },
        setActiveTools(nextTools: string[]) {
          activeTools = nextTools;
        }
      } as never);

      await sessionStart?.({}, { cwd: process.cwd(), isProjectTrusted: () => false });

      expect(activeTools).not.toContain("read");
      expect(activeTools).toContain("read_hash");
      expect(activeTools).toContain("patch");
      expect(patchTool.promptGuidelines?.join("\n")).toContain("Hash mode active");
    } finally {
      if (previous === undefined) delete process.env.PI_LOCATOR_PATCH_HASH_MODE;
      else process.env.PI_LOCATOR_PATCH_HASH_MODE = previous;
    }
  });
});
