import { describe, expect, it } from "vitest";
import { extractJson } from "./json";

describe("extractJson", () => {
  it("parses a bare JSON object", () => {
    expect(extractJson('{"pick":"HOME","confidence":72}')).toEqual({
      pick: "HOME",
      confidence: 72,
    });
  });

  it("extracts JSON from markdown fences and surrounding prose", () => {
    const text = 'Here is my call:\n```json\n{"pick":"AWAY"}\n```\nGood luck!';
    expect(extractJson(text)).toEqual({ pick: "AWAY" });
  });

  it("handles braces inside string values", () => {
    const text = 'reasoning {note}: {"reasoning":"a {weird} take","pick":"DRAW"}';
    expect(extractJson(text)).toEqual({
      reasoning: "a {weird} take",
      pick: "DRAW",
    });
  });

  it("returns null when there is no JSON object", () => {
    expect(extractJson("I think Brazil will win, no doubt.")).toBeNull();
  });

  it("returns the LAST object when several are present (reasoning models put the answer last)", () => {
    const text =
      'The schema is like {"pick":"HOME"}. After thinking, my answer is {"pick":"AWAY","confidence":80}';
    expect(extractJson(text)).toEqual({ pick: "AWAY", confidence: 80 });
  });
});
