import { choose, autoConfirm } from "./helpers";
import { test, expect } from "@playwright/test";
import { seedPlayers } from "./helpers";
test("full-block generation, persistence and four intentional layouts", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedPlayers(page);
  await page.getByRole("button", { name: "เลือกทั้งหมด", exact: true }).click();
  await page.getByRole("button", { name: "✧ สร้างตาราง", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "ตารางการเล่น", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await expect(
    page.getByRole("heading", { name: "ตารางทั้งหมด 6 รอบ" }),
  ).toBeVisible();
  const columns = await page
    .locator(".court-grid")
    .evaluate(
      (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
    );
  expect(columns).toBe(info.project.name.startsWith("mobile") ? 1 : 2);
  if (info.project.name.startsWith("mobile")) {
    await expect(page.locator(".schedule-table")).toBeHidden();
    await expect(page.locator(".mobile-round")).toHaveCount(6);
  } else await expect(page.locator(".schedule-table")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `test-results/${info.project.name}-schedule.png`,
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "เปิดเซสชันเดิม →" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "เปิดเซสชันเดิม →" }).click();
  await expect(
    page.getByRole("heading", { name: "ตารางการเล่น", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  await page.getByRole("button", { name: "＋ สร้างตารางใหม่" }).click();
  await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(10);
});
test("player add, edit, deactivate and draft survive refresh", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  await page.goto("/");
  await page.getByRole("button", { name: "เพิ่มผู้เล่นคนแรก" }).click();
  await page.getByLabel("ชื่อผู้เล่น").fill("ทดสอบ");
  await choose(page, page.getByLabel("เพศ", { exact: true }), "F");
  await page.getByRole("button", { name: "บันทึกผู้เล่น" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.reload();
  await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(1);
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "ผู้เล่น", exact: true })
    .click();
  await page.getByRole("button", { name: "แก้ไข", exact: true }).click();
  await page.getByLabel("ชื่อผู้เล่น").fill("แก้ไขชื่อ");
  await page.getByRole("button", { name: "บันทึกผู้เล่น" }).click();
  await expect(page.getByText("แก้ไขชื่อ", { exact: true })).toBeVisible();
  await autoConfirm(page);
  await page.getByRole("button", { name: "ปิดใช้งาน", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "เปิดใช้งาน", exact: true }),
  ).toBeVisible();
});
test("cached production shell and pairing work offline", async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name !== "desktop");
  await seedPlayers(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Prompt-mode SW registration does not claim the page that installed it.
  // A navigation after activation is the real offline-launch precondition.
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "สร้างตารางวันนี้" }),
  ).toBeVisible();
  const offlineFonts = await page.evaluate(async () => {
    const faces = await Promise.all([
      document.fonts.load('700 26px "Prompt"', "หัวข้อ"),
      document.fonts.load('400 16px "Sarabun"', "ข้อความ"),
      document.fonts.load('20px "UIcons Rounded"', "\ufc05"),
    ]);
    return faces.map(
      (group) =>
        group.length > 0 && group.every((face) => face.status === "loaded"),
    );
  });
  expect(offlineFonts).toEqual([true, true, true]);
  await page.getByRole("button", { name: "เลือกทั้งหมด", exact: true }).click();
  await page.getByRole("button", { name: "✧ สร้างตาราง", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "ตารางการเล่น", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await context.setOffline(false);
});
