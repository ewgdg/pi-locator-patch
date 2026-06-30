export function dedentBlock(text: string): string {
  return dedentBlockWithLineOffset(text).text;
}

export function dedentBlockWithLineOffset(text: string): { text: string; lineOffset: number } {
  const { lines, lineOffset } = trimOuterBlankLines(text.split(/\r\n|\n|\r/));
  const sharedIndent = commonLeadingWhitespacePrefix(lines.filter((line) => line.trim().length > 0));

  return {
    text: lines.map((line) => (line.trim().length === 0 ? "" : line.slice(sharedIndent.length))).join("\n"),
    lineOffset,
  };
}

function trimOuterBlankLines(lines: string[]): { lines: string[]; lineOffset: number } {
  let firstContentLine = 0;
  while (firstContentLine < lines.length && lines[firstContentLine]?.trim().length === 0) {
    firstContentLine += 1;
  }

  let lastContentLine = lines.length - 1;
  while (lastContentLine >= firstContentLine && lines[lastContentLine]?.trim().length === 0) {
    lastContentLine -= 1;
  }

  return {
    lines: lines.slice(firstContentLine, lastContentLine + 1),
    lineOffset: lastContentLine < firstContentLine ? 0 : firstContentLine,
  };
}

function commonLeadingWhitespacePrefix(lines: readonly string[]): string {
  if (lines.length === 0) return "";

  let prefix = leadingWhitespace(lines[0]);
  for (const line of lines.slice(1)) {
    prefix = commonPrefix(prefix, leadingWhitespace(line));
    if (prefix.length === 0) break;
  }
  return prefix;
}

function leadingWhitespace(line: string): string {
  return /^\s*/.exec(line)?.[0] ?? "";
}

function commonPrefix(left: string, right: string): string {
  let index = 0;
  while (index < left.length && index < right.length && left[index] === right[index]) {
    index += 1;
  }
  return left.slice(0, index);
}
