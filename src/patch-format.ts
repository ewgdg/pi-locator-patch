import { InvalidPatchError } from "./errors.js";
import { isHash, type HashFunction, hashLine } from "./hash.js";

export type MatchPatchOpKind = "context" | "delete";
export type RangePatchOpKind = "context" | "delete";
export type PatchOpKind = MatchPatchOpKind | "insert" | "range";

export type PatchOp = MatchPatchOp | InsertPatchOp | RangePatchOp;

export interface MatchPatchOp {
  kind: MatchPatchOpKind;
  hash?: string;
  content?: string;
}

export interface InsertPatchOp {
  kind: "insert";
  hash: string;
  content: string;
}

export interface RangePatchOp {
  kind: "range";
  rangeKind: RangePatchOpKind;
}

export interface Hunk {
  ops: PatchOp[];
}

export interface Patch {
  hunks: Hunk[];
}

export function parsePatch(patchText: string, hashFn: HashFunction = hashLine): Patch {
  const lines = splitPatchLines(patchText);
  let index = 0;
  const hunks: Hunk[] = [];

  if (lines.length === 0 || (lines.length === 1 && lines[0] === "")) {
    throw new InvalidPatchError("Patch is empty.");
  }

  if (lines[index]?.startsWith("--- ") || lines[index]?.startsWith("+++ ")) {
    throw new InvalidPatchError("File headers are not supported inside Codex-style Update File sections.");
  }

  while (index < lines.length) {
    const line = lines[index];
    if (line.startsWith("--- ") || line.startsWith("+++ ")) {
      throw new InvalidPatchError("File headers are not supported inside Codex-style Update File sections.");
    }
    if (line.startsWith("@@") && line !== "@@") {
      throw new InvalidPatchError("Hunk header must be exactly '@@' with no line numbers.");
    }
    if (line !== "@@") {
      throw new InvalidPatchError(`Expected hunk header '@@', got '${line}'.`);
    }
    index += 1;

    const ops: PatchOp[] = [];
    while (index < lines.length && lines[index] !== "@@") {
      const opLine = lines[index];
      if (opLine.startsWith("--- ") || opLine.startsWith("+++ ")) {
        throw new InvalidPatchError("File headers are not supported inside Codex-style Update File sections.");
      }
      if (opLine.startsWith("@@")) {
        throw new InvalidPatchError("Hunk header must be exactly '@@' with no line numbers.");
      }
      ops.push(parsePatchOp(opLine, hashFn));
      index += 1;
    }

    if (ops.length === 0) {
      throw new InvalidPatchError("Hunk must contain at least one operation.");
    }
    hunks.push({ ops });
  }

  if (hunks.length === 0) {
    throw new InvalidPatchError("Patch must contain at least one hunk.");
  }

  return { hunks };
}

function parsePatchOp(line: string, hashFn: HashFunction): PatchOp {
  if (line.startsWith("+")) {
    const content = line.slice(1);
    return { kind: "insert", hash: hashFn(content), content };
  }
  if (line.startsWith(" ")) {
    return parseSelectorPatchOp("context", line.slice(1), line);
  }
  if (line.startsWith("-")) {
    return parseSelectorPatchOp("delete", line.slice(1), line);
  }

  throw new InvalidPatchError(`Malformed patch operation '${line}'. Use ' :<text>', '-:<text>', '+<text>', ' #<hash>', '-#<hash>', ' ...', or '-...'. Prefix selectors (^<prefix>) are not supported yet.`);
}

function parseSelectorPatchOp(kind: MatchPatchOpKind, selector: string, line: string): PatchOp {
  if (selector === "...") {
    return { kind: "range", rangeKind: kind };
  }
  if (selector.startsWith(":")) {
    return { kind, content: selector.slice(1) };
  }
  if (selector.startsWith("#")) {
    return parseHashPatchOp(kind, selector.slice(1), line);
  }
  if (selector.startsWith("^")) {
    throw new InvalidPatchError(`Prefix selectors are not supported yet in operation '${line}'.`);
  }

  throw new InvalidPatchError(`Malformed ${kind} selector operation '${line}'. Use ${kind === "context" ? "' :<text>', ' #<hash>', or ' ...'" : "'-:<text>', '-#<hash>', or '-...'"}.`);
}

function parseHashPatchOp(kind: MatchPatchOpKind, hash: string, line: string): MatchPatchOp {
  if (!isHash(hash)) {
    throw new InvalidPatchError(`Malformed ${kind} hash operation '${line}'. Hash locators must be exactly 4 base64url characters after '${kind === "context" ? " #" : "-#"}'.`);
  }
  return { kind, hash };
}

function splitPatchLines(text: string): string[] {
  const lines = text.split(/\r\n|\n|\r/);
  if (lines.at(-1) === "") {
    lines.pop();
  }
  return lines;
}
