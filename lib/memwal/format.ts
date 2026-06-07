/**
 * Memory text format for EVA.
 *
 * Each memory is stored as a human-readable lead sentence (so semantic recall
 * embeds on meaningful prose) followed by a machine-parseable JSON tail (so we
 * can deterministically read records back for grading and display).
 *
 *   "EVA picks Brazil. {"type":"prediction","pick":"HOME","confidence":72}"
 */

export function toMemoryText(lead: string, record: unknown): string {
  return `${lead} ${JSON.stringify(record)}`;
}

/**
 * Extract the trailing JSON object from a memory's text. Scans `{` positions
 * from right to left and returns the first one whose slice-to-end parses as a
 * JSON object — robust to stray braces in the lead sentence and to nested
 * objects in the record.
 */
export function parseMemoryRecord<T = Record<string, unknown>>(
  text: string,
): T | null {
  let i = text.length - 1;
  while (i >= 0) {
    const idx = text.lastIndexOf("{", i);
    if (idx < 0) break;
    const candidate = text.slice(idx);
    try {
      const parsed = JSON.parse(candidate);
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as T;
      }
    } catch {
      // Not valid JSON starting here; keep scanning left.
    }
    i = idx - 1;
  }
  return null;
}
