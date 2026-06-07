import { describe, expect, it } from "vitest";
import { parseMemoryRecord, toMemoryText } from "./format";

describe("toMemoryText", () => {
  it("joins a human lead sentence with a JSON tail", () => {
    const text = toMemoryText("EVA picks Brazil.", { type: "prediction", confidence: 72 });
    expect(text).toBe('EVA picks Brazil. {"type":"prediction","confidence":72}');
  });
});

describe("parseMemoryRecord", () => {
  it("round-trips a record through format + parse", () => {
    const record = { type: "lesson", rule: "cap confidence", teams: ["MAR", "ESP"] };
    const text = toMemoryText("Lesson learned.", record);
    expect(parseMemoryRecord(text)).toEqual(record);
  });

  it("extracts the trailing JSON even with prose in front", () => {
    const text =
      'EVA prediction — Brazil vs Croatia. Pick: Brazil. {"type":"prediction","pick":"HOME"}';
    expect(parseMemoryRecord(text)).toEqual({ type: "prediction", pick: "HOME" });
  });

  it("ignores stray braces in the lead sentence", () => {
    const text = 'Note {with braces} in prose. {"type":"dossier","team":"BRA"}';
    expect(parseMemoryRecord(text)).toEqual({ type: "dossier", team: "BRA" });
  });

  it("returns null when there is no JSON tail", () => {
    expect(parseMemoryRecord("just a sentence, no json")).toBeNull();
  });
});
