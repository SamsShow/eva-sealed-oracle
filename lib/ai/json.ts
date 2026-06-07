/**
 * Extract a JSON object from arbitrary model output.
 *
 * Returns the LAST complete, parseable top-level object — reasoning models
 * (Qwen3, etc.) emit their thinking first and the real answer last, and prose
 * may contain earlier brace fragments or schema examples. String-aware, so
 * braces inside string values don't affect matching.
 */
export function extractJson(text: string): unknown | null {
  const cleaned = text.replace(/```(?:json)?/gi, "");

  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  let last: unknown | null = null;

  for (let i = 0; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
    } else if (c === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (c === "}" && depth > 0) {
      depth--;
      if (depth === 0 && start >= 0) {
        try {
          const parsed = JSON.parse(cleaned.slice(start, i + 1));
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            last = parsed;
          }
        } catch {
          // Not valid JSON from this top-level group; keep scanning.
        }
        start = -1;
      }
    }
  }
  return last;
}
