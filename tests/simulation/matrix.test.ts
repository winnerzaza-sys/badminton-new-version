import { it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  freshSessionPlayer,
  type PlayerProfile,
} from "../../src/domain/models";
import { generateSchedule } from "../../src/domain/pairing/engine";
import { validateRound } from "../../src/domain/pairing/validator";
it("100 seeds per roster and gender distribution, 10 full rounds", () => {
  const report = [];
  for (let count = 10; count <= 15; count++)
    for (const males of [
      0,
      1,
      2,
      Math.floor(count / 2),
      count - 2,
      count - 1,
      count,
    ]) {
      const profiles: PlayerProfile[] = Array.from(
        { length: count },
        (_, i) => ({
          id: `p${i}`,
          name: `ผู้เล่น ${i}`,
          gender: i < males ? "M" : "F",
          active: true,
          createdAt: "",
          updatedAt: "",
        }),
      );
      const players = profiles.map((p) => freshSessionPlayer(p.id));
      let worstSpread = 0,
        maxRest = 0,
        maxPlay = 0,
        violations = 0,
        misses = 0,
        partnerRepeats = 0,
        opponentRepeats = 0;
      const partnerDistribution: Record<string, number> = {},
        opponentDistribution: Record<string, number> = {};
      let maxRateSpread = 0;
      for (let seed = 1; seed <= 100; seed++) {
        const result = generateSchedule({
          profiles,
          players,
          courtCount: 2,
          roundCount: 10,
          seed,
          iterations: 12,
        });
        for (const round of result.rounds)
          violations += validateRound(round, profiles, players, 2).length;
        worstSpread = Math.max(worstSpread, result.metrics.gameCountSpread);
        maxRest = Math.max(maxRest, result.metrics.maxRestStreak);
        maxPlay = Math.max(maxPlay, result.metrics.maxPlayStreak);
        if (result.metrics.gameCountSpread > 1) misses++;
        partnerRepeats += result.metrics.partnerRepeats;
        opponentRepeats += result.metrics.opponentRepeats;
        maxRateSpread = Math.max(
          maxRateSpread,
          result.metrics.participationRateSpread,
        );
        for (const [count, value] of Object.entries(
          result.metrics.partnerRepeatDistribution,
        ))
          partnerDistribution[count] =
            (partnerDistribution[count] ?? 0) + value;
        for (const [count, value] of Object.entries(
          result.metrics.opponentRepeatDistribution,
        ))
          opponentDistribution[count] =
            (opponentDistribution[count] ?? 0) + value;
        if (males === count - 1) expect(result.warnings).toHaveLength(2);
      }
      report.push({
        count,
        males,
        seeds: 100,
        violations,
        worstSpread,
        misses,
        maxRest,
        maxPlay,
        partnerRepeats,
        opponentRepeats,
        maxRateSpread,
        partnerDistribution,
        opponentDistribution,
        noValidSchedule: 0,
      });
      expect(violations).toBe(0);
      // One isolated woman cannot participate: every possible court containing her
      // would be 3M1F. A <=1 spread is mathematically impossible for this roster.
      if (males !== count - 1)
        expect(
          worstSpread,
          `${count} players / ${males} men`,
        ).toBeLessThanOrEqual(1);
      else expect(worstSpread).toBe(Math.ceil(80 / (count - 1)));
      console.log(
        `Completed ${count} players / ${males} men: spread ${worstSpread}, violations ${violations}`,
      );
    }
  mkdirSync("reports", { recursive: true });
  writeFileSync(
    "reports/simulation-report.json",
    JSON.stringify(report, null, 2),
  );
}, 240000);
