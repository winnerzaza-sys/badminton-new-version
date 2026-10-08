import { test, expect } from "@playwright/test";
import { seedPlayers, savedSession } from "./helpers";

test("replay badges agree in round cards, the full schedule and offline PNG", async ({
  page,
  context,
}, info) => {
  await seedPlayers(page);
  await page.getByRole("button", { name: "เลือกทั้งหมด", exact: true }).click();
  await page.getByRole("button", { name: "✧ สร้างตาราง", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "ตารางการเล่น", exact: true }),
  ).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.getByRole("button", { name: "เปิดเซสชันเดิม →" }).click();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await expect(page.locator(".court-grid .playing-streak")).toHaveCount(0);
  const session = await savedSession(page);
  const [first, second] = session.blocks[0].rounds;
  const firstPlayers = first.matches.flatMap((m) => [
    ...m.teamA.playerIds,
    ...m.teamB.playerIds,
  ]);
  const repeated = second.matches
    .flatMap((m) => [...m.teamA.playerIds, ...m.teamB.playerIds])
    .filter((id) => firstPlayers.includes(id));
  await page
    .locator(".round-tabs")
    .getByRole("button", { name: "รอบ 2", exact: true })
    .click();
  await expect(page.locator(".court-grid .playing-streak")).toHaveCount(
    repeated.length,
  );
  for (const badge of await page.locator(".court-grid .playing-streak").all()) {
    await expect(badge).toHaveAttribute(
      "aria-label",
      "เล่นติดกัน 2 รอบ รวมรอบนี้",
    );
    await expect(badge.locator("svg path")).toHaveCount(1);
  }
  await expect(page.locator(".court.rest .playing-streak")).toHaveCount(0);
  const full = info.project.name.startsWith("mobile")
    ? page.locator(".mobile-round").nth(1)
    : page.locator(".schedule-table tbody tr").nth(1);
  await expect(full.locator(".playing-streak")).toHaveCount(repeated.length);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/${info.project.name}-streaks.png`,
    fullPage: true,
  });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  if (info.project.name !== "mobile-webkit") await context.setOffline(true);
  await page
    .locator(".block-toolbar")
    .getByRole("button", { name: "ส่งออก / แชร์", exact: true })
    .click();
  await expect(page.locator(".export-image")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "บันทึก PNG", exact: true }),
  ).toBeEnabled();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "บันทึก PNG", exact: true }).click();
  await (
    await downloading
  ).saveAs(`test-results/${info.project.name}-streaks-share.png`);
});

test("PNG export recovers when the asynchronous canvas encoder stalls", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  await seedPlayers(page);
  await page.getByRole("button", { name: "เลือกทั้งหมด", exact: true }).click();
  await page.getByRole("button", { name: "✧ สร้างตาราง", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "ตารางการเล่น", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    HTMLCanvasElement.prototype.toBlob = () => {};
  });
  await page
    .locator(".block-toolbar")
    .getByRole("button", { name: "ส่งออก / แชร์", exact: true })
    .click();
  await expect(page.locator(".export-image")).toBeVisible();
  const dimensions = await page
    .locator(".export-image")
    .evaluate((image: HTMLImageElement) => ({
      width: image.naturalWidth,
      height: image.naturalHeight,
    }));
  expect(dimensions.width).toBe(1080);
  expect(dimensions.height).toBeGreaterThan(1200);
  await expect(
    page.getByRole("button", { name: "บันทึก PNG", exact: true }),
  ).toBeEnabled();
});
