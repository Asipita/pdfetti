/** Parse a human-readable page list (for example, "1-3, 5, 8"). */
export function parsePageRanges(value: string, pageCount: number): number[] {
  const input = value.trim();
  if (!input) return [];

  const selected = new Set<number>();
  for (const rawPart of input.split(",")) {
    const part = rawPart.trim().replace(/[–—]/g, "-");
    const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(part);
    if (!match) throw new Error(`“${rawPart.trim()}” is not a page or range.`);

    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;
    if (start < 1 || end < 1) throw new Error("Page numbers start at 1.");
    if (start > end) throw new Error("Ranges must go from lower to higher pages.");
    if (end > pageCount) throw new Error(`This PDF has ${pageCount} pages.`);
    for (let page = start; page <= end; page += 1) selected.add(page - 1);
  }

  return [...selected].sort((a, b) => a - b);
}

export function formatPageRanges(zeroBasedPages: Iterable<number>): string {
  const pages = [...new Set(zeroBasedPages)].sort((a, b) => a - b);
  if (pages.length === 0) return "";

  const ranges: string[] = [];
  let start = pages[0];
  let end = start;
  for (const page of pages.slice(1)) {
    if (page === end + 1) {
      end = page;
    } else {
      ranges.push(start === end ? `${start + 1}` : `${start + 1}-${end + 1}`);
      start = end = page;
    }
  }
  ranges.push(start === end ? `${start + 1}` : `${start + 1}-${end + 1}`);
  return ranges.join(", ");
}
