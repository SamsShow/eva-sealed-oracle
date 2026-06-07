/** Render recalled Walrus memory into a prompt block for EVA. */

import type { FixtureContext } from "../memwal/client";

export function buildContextBlock(ctx: FixtureContext): string {
  const sections: string[] = [];

  if (ctx.lessons.length) {
    sections.push(
      "LESSONS YOU HAVE LEARNED (apply the relevant ones):\n" +
        ctx.lessons
          .map((l, i) => `  L${i + 1}. ${l.record.rule} — ${l.record.adjustment} (applies when: ${l.record.appliesWhen})`)
          .join("\n"),
    );
  } else {
    sections.push("LESSONS YOU HAVE LEARNED: none yet — this is early in your run.");
  }

  const dossier = [...ctx.homeDossier, ...ctx.awayDossier];
  if (dossier.length) {
    sections.push(
      "TEAM DOSSIERS:\n" +
        dossier.map((d) => `  • ${d.record.team}: ${d.record.note} [${d.record.tags.join(", ")}]`).join("\n"),
    );
  }

  if (ctx.pastCalls.length) {
    sections.push(
      "YOUR PAST CALLS ON THESE TEAMS:\n" +
        ctx.pastCalls
          .map((p) => `  • ${p.record.homeCode} v ${p.record.awayCode}: picked ${p.record.pick} @${p.record.confidence}`)
          .join("\n"),
    );
  }

  if (ctx.userBias.length) {
    sections.push(
      "WHAT YOU KNOW ABOUT THE USER:\n" +
        ctx.userBias.map((b) => `  • ${b.record.note} [${b.record.tendencies.join(", ")}]`).join("\n"),
    );
  }

  return sections.join("\n\n");
}

/** The lesson ids EVA had available, so we can record which she cited. */
export function availableLessonRules(ctx: FixtureContext): string[] {
  return ctx.lessons.map((l) => l.record.rule);
}
