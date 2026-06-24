import { describe, expect, it } from "vitest";
import { parseText, serializeText } from "../src/api.js";

describe("text line model", () => {
  it("represents empty file as zero lines", () => {
    const model = parseText("");
    expect(model.lines).toEqual([]);
    expect(serializeText(model)).toBe("");
  });

  it("preserves absence or presence of terminal newline", () => {
    expect(serializeText(parseText("a\nb"))).toBe("a\nb");
    expect(serializeText(parseText("a\nb\n"))).toBe("a\nb\n");
  });

  it("treats a single newline as one empty line with final newline", () => {
    const model = parseText("\n");
    expect(model.lines).toEqual([""]);
    expect(model.finalNewline).toBe(true);
    expect(serializeText(model)).toBe("\n");
  });

  it("preserves BOM and CRLF newline convention", () => {
    const text = "\uFEFFa\r\nb\r\n";
    const model = parseText(text);
    expect(model.bom).toBe(true);
    expect(model.newline).toBe("\r\n");
    expect(model.lines).toEqual(["a", "b"]);
    expect(serializeText(model)).toBe(text);
  });
});
