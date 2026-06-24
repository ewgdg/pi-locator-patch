import { InvalidPatchError } from "./errors.js";
import { type HashFunction, hashLine } from "./hash.js";
import { parseHashLine } from "./read-format.js";

export type PatchOpKind = "context" | "delete" | "insert";

export interface PatchOp {
  kind: PatchOpKind;
  hash: string;
  content: string;
}

export interface Hunk {
  ops: PatchOp[];
}

export interface Patch {
  oldFile?: string;
  newFile?: string;
  hunks: Hunk[];
}

const OP_KIND_BY_PREFIX: Record<string, PatchOpKind> = {
  " ": "context",
  "-": "delete",
  "+": "insert"
};

export function parsePatch(patchText: string, hashFn: HashFunction = hashLine): Patch {
  const lines = splitPatchLines(patchText);
  let index = 0;
  let oldFile: string | undefined;
  let newFile: string | undefined;
  const hunks: Hunk[] = [];

  if (lines.length === 0 || (lines.length === 1 && lines[0] === "")) {
    throw new InvalidPatchError("Patch is empty.");
  }

  if (lines[index]?.startsWith("--- ")) {
    oldFile = lines[index].slice(4);
    index += 1;
    if (!lines[index]?.startsWith("+++ ")) {
      throw new InvalidPatchError("File header '---' must be followed by '+++'.");
    }
    newFile = lines[index].slice(4);
    index += 1;
  } else if (lines[index]?.startsWith("+++ ")) {
    throw new InvalidPatchError("File header '+++' cannot appear before '---'.");
  }

  while (index < lines.length) {
    const line = lines[index];
    if (line.startsWith("--- ") || line.startsWith("+++ ")) {
      throw new InvalidPatchError("Multiple file sections are not supported.");
    }
    if (line.startsWith("@@") && line !== "@@ @@") {
      throw new InvalidPatchError("Hunk header must be exactly '@@ @@' with no line numbers.");
    }
    if (line !== "@@ @@") {
      throw new InvalidPatchError(`Expected hunk header '@@ @@', got '${line}'.`);
    }
    index += 1;

    const ops: PatchOp[] = [];
    while (index < lines.length && lines[index] !== "@@ @@") {
      const opLine = lines[index];
      if (opLine.startsWith("--- ") || opLine.startsWith("+++ ")) {
        throw new InvalidPatchError("Multiple file sections are not supported.");
      }
      if (opLine.startsWith("@@")) {
        throw new InvalidPatchError("Hunk header must be exactly '@@ @@' with no line numbers.");
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

  return { oldFile, newFile, hunks };
}

function parsePatchOp(line: string, hashFn: HashFunction): PatchOp {
  const prefix = line[0];
  const kind = OP_KIND_BY_PREFIX[prefix];
  if (!kind) {
    throw new InvalidPatchError(`Malformed patch operation '${line}'.`);
  }

  const hashLine = parseHashLine(line.slice(1));
  const expectedHash = hashFn(hashLine.content);
  if (hashLine.hash !== expectedHash) {
    throw new InvalidPatchError(
      `Hash/content mismatch for ${kind} line: expected ${expectedHash}, got ${hashLine.hash}.`
    );
  }

  return { kind, ...hashLine };
}

function splitPatchLines(text: string): string[] {
  const lines = text.split(/\r\n|\n|\r/);
  if (lines.at(-1) === "") {
    lines.pop();
  }
  return lines;
}
