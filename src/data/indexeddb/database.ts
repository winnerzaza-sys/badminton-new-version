import Dexie, { type EntityTable } from "dexie";
import type { PlayerProfile, Session } from "../../domain/models";
export class BadmintonDatabase extends Dexie {
  players!: EntityTable<PlayerProfile, "id">;
  sessions!: EntityTable<Session, "id">;
  appSettings!: EntityTable<{ key: string; value: unknown }, "key">;
  constructor(name = "badminton-pairing") {
    super(name);
    this.version(1).stores({
      players: "id, active, updatedAt",
      sessions: "id, status, createdAt",
      appSettings: "key",
    });
    this.version(2).stores({
      players: "id, updatedAt",
      sessions: "id, status, createdAt",
      appSettings: "key",
    });
  }
}
export const database = new BadmintonDatabase();
