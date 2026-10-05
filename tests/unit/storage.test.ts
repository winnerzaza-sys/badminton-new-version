import "fake-indexeddb/auto";
import { it, expect } from "vitest";
import { BadmintonDatabase } from "../../src/data/indexeddb/database";
import { repositories } from "../../src/data/repositories";
import {
  createSession,
  defaultConfig,
  previousRoster,
} from "../../src/features/session/service";
import { profiles } from "../fixtures";
it("persists profiles and unfinished sessions across connections; resets new session counters", async () => {
  const name = `test-${crypto.randomUUID()}`,
    db = new BadmintonDatabase(name),
    repo = repositories(db),
    ps = profiles("MMMM");
  for (const p of ps) await repo.players.save(p);
  const session = createSession(
    ps.map((p) => p.id),
    defaultConfig(),
  );
  session.sessionPlayers.p0.totalGames = 8;
  await repo.sessions.save(session);
  db.close();
  const reopened = new BadmintonDatabase(name),
    next = repositories(reopened);
  expect(await next.players.list()).toHaveLength(4);
  expect((await next.sessions.unfinished())?.sessionPlayers.p0.totalGames).toBe(
    8,
  );
  session.status = "COMPLETED";
  session.completedAt = new Date().toISOString();
  await next.sessions.save(session);
  expect(await next.sessions.unfinished()).toBeUndefined();
  const roster = previousRoster(
    await next.sessions.list(),
    await next.players.list(),
  );
  const fresh = createSession(roster, defaultConfig());
  expect(fresh.sessionPlayers.p0.totalGames).toBe(0);
  expect(fresh.sessionPlayers.p0.partnerHistory).toEqual({});
  await next.sessions.save(fresh);
  expect(await next.sessions.list()).toHaveLength(2);
  expect(
    (await next.sessions.list()).find((s) => s.id === session.id)
      ?.sessionPlayers.p0.totalGames,
  ).toBe(8);
  await reopened.delete();
});
