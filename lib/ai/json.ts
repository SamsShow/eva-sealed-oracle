/**
 * Extract the first *parseable* JSON object from arbitrary model output.
 * Local models often wrap JSON in prose or ```json fences (and prose may itself
 * contain braces) — so we try each `{` as a candidate start, balance-scan to its
 * matching `}` (string-aware, so braces inside strings don't count), and return
 * the first candidate that parses.
 */
export function extractJson(text: string): unknown | null {
  const cleaned = text.replace(/```(?:json)?/gi, "");
  for (
    let start = cleaned.indexOf("{");
    start >= 0;
    start = cleaned.indexOf("{", start + 1)
  ) {
    const parsed = tryParseFrom(cleaned, start);
    if (parsed !== undefined) return parsed;
  }
  return null;
}

function tryParseFrom(text: string, start: number): unknown | undefined {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          return undefined;
        }
      }
    }
  }
  return undefined;
}
