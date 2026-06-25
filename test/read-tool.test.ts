import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { hashLine } from "../src/api.js";
import { readTool } from "../src/tools/hashline-read.js";

const makeTempDir = () => mkdtemp(join(tmpdir(), "pi-hashline-patch-"));
const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lJ3rZQAAAABJRU5ErkJggg==",
  "base64"
);

const firstText = (result: Awaited<ReturnType<typeof readTool.execute>>) => {
  const content = result.content[0];
  if (content.type !== "text") {
    throw new Error("Expected first content item to be text");
  }
  return content.text;
};

describe("read tool", () => {
  it("is agent-visible as read and returns HASH│content for text files", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "file.txt"), "alpha\nbeta\n");

    const result = await readTool.execute("tool-call", { path: "file.txt" }, undefined, undefined, { cwd: dir } as never);

    expect(readTool.name).toBe("read");
    expect(firstText(result)).toBe(`${hashLine("alpha")}│alpha\n${hashLine("beta")}│beta`);
  });

  it("delegates supported images to Pi's built-in read behavior", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "image.png"), tinyPng);

    const result = await readTool.execute("tool-call", { path: "image.png" }, undefined, undefined, { cwd: dir } as never);

    expect(firstText(result)).toContain("Read image file [image/png]");
    expect(firstText(result)).not.toContain("│");
  });
});
