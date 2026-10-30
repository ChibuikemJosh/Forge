/** Tiny unified-diff hunk applier.
 * Backend diffs are generated from the extracted function source, so hunk
 * line numbers are function-relative. We locate each hunk by matching its
 * context/removed lines in the full file snapshot instead of trusting offsets. */
interface Hunk { oldStart: number; oldLines: string[]; newLines: string[] }
function parseHunks(diff: string): Hunk[] {
  const hunks: Hunk[] = [];
  let cur: Hunk | null = null;
  for (const line of diff.split("\n")) {
    const m = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (m) { cur = { oldStart: parseInt(m[1], 10) - 1, oldLines: [], newLines: [] }; hunks.push(cur); continue; }
    if (!cur) continue;
    if (line.startsWith("\\")) continue;
    const p = line[0]; const text = line.slice(1);
    if (p === " ") { cur.oldLines.push(text); cur.newLines.push(text); }
    else if (p === "-") { if (!line.startsWith("---")) cur.oldLines.push(text); }
    else if (p === "+") { if (!line.startsWith("+++")) cur.newLines.push(text); }
  }
  return hunks;
}
function findHunk(src: string[], hunk: Hunk, from: number): number {
  const at = (idx: number) => hunk.oldLines.every((l, j) => src[idx + j] === l);
  if (hunk.oldStart >= from && at(hunk.oldStart)) return hunk.oldStart;
  for (let i = from; i + hunk.oldLines.length <= src.length; i++) if (at(i)) return i;
  return -1;
}
export function applyUnifiedDiff(source: string, diff: string | null): string {
  if (!diff) return source;
  const src = source.split("\n");
  const out: string[] = [];
  let idx = 0;
  for (const hunk of parseHunks(diff)) {
    const found = findHunk(src, hunk, idx);
    if (found === -1) continue;
    while (idx < found) { out.push(src[idx]); idx++; }
    out.push(...hunk.newLines);
    idx = found + hunk.oldLines.length;
  }
  while (idx < src.length) { out.push(src[idx]); idx++; }
  return out.join("\n");
}
/** 1-based line numbers in the patched full file that were added. */
export function addedLineNumbers(source: string, diff: string | null): Set<number> {
  const added = new Set<number>();
  if (!diff) return added;
  const src = source.split("\n");
  let idx = 0; let outLine = 1; // 1-based count of lines emitted so far +1
  outLine = 1;
  for (const hunk of parseHunks(diff)) {
    const found = findHunk(src, hunk, idx);
    if (found === -1) continue;
    outLine += found - idx;
    idx = found;
    // walk newLines, marking those not in old context: added lines are '+' lines.
    // Re-derive: new lines that are not context — track by parsing again is ambiguous,
    // so mark lines whose text is in newLines but position corresponds to '+' entries.
    // Simpler: recompute added texts from hunk by diffing old vs new sequences:
    const oldSet = hunk.oldLines;
    let oi = 0;
    for (const nl of hunk.newLines) {
      if (oldSet[oi] === nl) { oi++; outLine++; }
      else { added.add(outLine); outLine++; }
    }
    idx = found + hunk.oldLines.length;
  }
  return added;
}
