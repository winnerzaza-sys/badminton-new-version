import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { seedPlayers } from "./helpers";
test("Thai forms and schedule workflows meet automated accessibility checks", async ({
  page,
}) => {
  test.setTimeout(90000);
  await seedPlayers(page);
  async function check(screen: string) {
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        description: v.description,
        targets: v.nodes.map((n) => n.target),
      })),
      screen,
    ).toEqual([]);
  }
  await check("setup");
  await page
    .getByRole("button", { name: "＋ เพิ่มผู้เล่น", exact: true })
    .click();
  await check("player dialog");
  await page.getByRole("button", { name: "ปิด", exact: true }).click();
  await page.getByRole("button", { name: "เลือกทั้งหมด", exact: true }).click();
  await page.getByRole("button", { name: "✧ สร้างตาราง", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "ตารางการเล่น", exact: true }),
  ).toBeVisible();
  await check("schedule");
  for (const [label, screen] of [
    ["ปรับคู่", "adjust"],
    ["สรุป", "summary"],
    ["ส่งออก / แชร์", "share"],
  ]) {
    await page
      .locator(".block-toolbar")
      .getByRole("button", { name: label, exact: true })
      .click();
    if (screen === "share")
      await expect(page.locator(".export-image")).toBeVisible();
    await check(screen);
  }
});
