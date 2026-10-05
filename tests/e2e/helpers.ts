import type { Session } from "../../src/domain/models";
import { expect } from "@playwright/test";
export async function savedSession(
  page: import("@playwright/test").Page,
): Promise<Session> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("badminton-pairing");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const records = await new Promise<Session[]>((resolve, reject) => {
      const r = db.transaction("sessions").objectStore("sessions").getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    db.close();
    return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  });
}
export async function seedPlayers(
  page: import("@playwright/test").Page,
  url = "/",
) {
  await page.goto(url);
  await expect(
    page.getByRole("heading", { name: "สร้างตารางวันนี้" }),
  ).toBeVisible();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("badminton-pairing");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("players", "readwrite");
      const store = transaction.objectStore("players");
      for (let i = 0; i < 10; i++)
        store.put({
          id: `test-${i}`,
          name: `ผู้เล่น ${i + 1}`,
          gender: i < 5 ? "M" : "F",
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  });
  await page.reload();
  await expect(page.getByRole("checkbox")).toHaveCount(10);
}
