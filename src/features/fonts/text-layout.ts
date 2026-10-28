export type TextLine = { text: string; width: number };

export function layoutText(
  text: string,
  maxWidth: number,
  measure: (value: string) => number,
): TextLine[] {
  const lines: TextLine[] = [];
  const limit = Math.max(1, maxWidth);
  for (const paragraph of text.split("\n")) {
    if (!paragraph) {
      lines.push({ text: "", width: 0 });
      continue;
    }
    let line = "";
    for (const token of paragraph.match(/\S+|\s+/g) || []) {
      if (/^\s+$/.test(token)) {
        if (line) line += token;
        continue;
      }
      const candidate = line + token;
      if (measure(candidate) <= limit) {
        line = candidate;
        continue;
      }
      if (line.trim()) {
        const value = line.trimEnd();
        lines.push({ text: value, width: measure(value) });
        line = "";
      }
      if (measure(token) <= limit) {
        line = token;
        continue;
      }
      for (const char of token) {
        if (line && measure(line + char) > limit) {
          lines.push({ text: line, width: measure(line) });
          line = "";
        }
        line += char;
      }
    }
    const value = line.trimEnd();
    lines.push({ text: value, width: measure(value) });
  }
  return lines;
}

export function requiredTextHeight(
  lineCount: number,
  fontSize: number,
  lineHeight: number,
): number {
  return Math.max(fontSize * lineHeight + 2, lineCount * fontSize * lineHeight + 2);
}
