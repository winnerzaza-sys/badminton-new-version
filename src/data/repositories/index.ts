import { database, type BadmintonDatabase } from "../indexeddb/database";
import type { PlayerProfile, Session } from "../../domain/models";
export function repositories(db: BadmintonDatabase = database) {
  return {
    players: {
      list: () => db.players.toArray(),
      save: (player: PlayerProfile) => db.players.put(player),
      deactivate: async (id: string) => {
        await db.players.update(id, {
          active: false,
          updatedAt: new Date().toISOString(),
        });
      },
    },
    sessions: {
      list: () => db.sessions.orderBy("createdAt").reverse().toArray(),
      save: (session: Session) => db.sessions.put(session),
      remove: (ids: string[]) => db.sessions.bulkDelete(ids),
      restore: (sessions: Session[]) => db.sessions.bulkPut(sessions),
      unfinished: async () =>
        (await db.sessions.orderBy("createdAt").reverse().toArray()).find(
          (s) => s.status !== "COMPLETED",
        ),
    },
    settings: {
      get: async (key: string) => (await db.appSettings.get(key))?.value,
      set: (key: string, value: unknown) => db.appSettings.put({ key, value }),
    },
  };
}
export const repo = repositories();
