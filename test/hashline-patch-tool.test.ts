import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { hashLine } from "../src/api.js";
import { hashlinePatchTool } from "../src/tools/hashline-patch.js";

const makeTempDir = () => mkdtemp(join(tmpdir(), "pi-hashline-patch-"));
const row = (prefix: " " | "-" | "+", content: string) => `${prefix}${hashLine(content)}│${content}`;
const resultText = (result: Awaited<ReturnType<typeof hashlinePatchTool.execute>>) => {
  const content = result.content[0];
  if (content.type !== "text") {
    throw new Error("Expected text content");
  }
  return content.text;
};

async function patchFile(initialText: string, diff: string) {
  const dir = await makeTempDir();
  const file = join(dir, "file.txt");
  await writeFile(file, initialText);
  const result = await hashlinePatchTool.execute(
    "tool-call",
    { path: "file.txt", patch: diff },
    undefined,
    undefined,
    { cwd: dir } as never
  );
  return { file, result };
}

describe("hashline_patch visible receipt", () => {
  it("returns post-edit hash-only receipt without deleted hashes or file content", async () => {
    const diff = ["@@ @@", row(" ", "a"), row("-", "old"), row("+", "new"), row(" ", "z")].join("\n");

    const { file, result } = await patchFile("a\nold\nz\n", diff);

    expect(resultText(result)).toBe(
      ["@@ result", ` ${hashLine("a")}`, `+${hashLine("new")}`, ` ${hashLine("z")}`].join("\n")
    );
    expect(resultText(result)).not.toContain(hashLine("old"));
    expect(resultText(result)).not.toContain("old");
    expect(resultText(result)).not.toContain("new");
    await expect(readFile(file, "utf8")).resolves.toBe("a\nnew\nz\n");
  });

  it("omits empty receipts and tells caller to use hashline_read", async () => {
    const diff = ["@@ @@", row("-", "only")].join("\n");

    const { file, result } = await patchFile("only", diff);

    expect(resultText(result)).toMatch(/Patch applied\. Receipt omitted: no surviving context or inserted hashes\. Use hashline_read/);
    await expect(readFile(file, "utf8")).resolves.toBe("");
  });
});
