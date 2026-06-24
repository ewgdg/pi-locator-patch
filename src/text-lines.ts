export type Newline = "\n" | "\r\n" | "\r";

export interface TextLineModel {
  bom: boolean;
  finalNewline: boolean;
  lines: string[];
  newline: Newline;
}

const FIRST_NEWLINE = /\r\n|\n|\r/;

export function parseText(text: string): TextLineModel {
  const bom = text.startsWith("\uFEFF");
  const body = bom ? text.slice(1) : text;
  const newline = (body.match(FIRST_NEWLINE)?.[0] as Newline | undefined) ?? "\n";

  if (body.length === 0) {
    return { bom, finalNewline: false, lines: [], newline };
  }

  const finalNewline = body.endsWith("\n") || body.endsWith("\r");
  const lines = body.split(/\r\n|\n|\r/);
  if (finalNewline) {
    lines.pop();
  }

  return { bom, finalNewline, lines, newline };
}

export function serializeText(model: TextLineModel): string {
  const prefix = model.bom ? "\uFEFF" : "";
  if (model.lines.length === 0) {
    return prefix;
  }

  const body = model.lines.join(model.newline);
  return prefix + (model.finalNewline ? `${body}${model.newline}` : body);
}
