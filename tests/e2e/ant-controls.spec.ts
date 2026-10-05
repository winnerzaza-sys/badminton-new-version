import { test, expect } from "@playwright/test";
import { seedPlayers, savedSession, choose } from "./helpers";

test("Ant player validation and cancel/confirm preserve the correct session state", async ({
  page,
}) => {
  test.setTimeout(60000);
  await seedPlayers(page);
  const playerChoice = page.locator(".player-option").first();
  const checkboxSize = await playerChoice
    .locator('input[type="checkbox"]')
    .boundingBox();
  expect(checkboxSize!.width).toBeCloseTo(9.5, 0);
  expect(checkboxSize!.height).toBeCloseTo(9.5, 0);
  expect(
    await playerChoice
      .locator("strong")
      .evaluate((el) => getComputedStyle(el).fontSize),
  ).toBe("16px");
  await page
    .getByRole("button", { name: "＋ เพิ่มผู้เล่น", exact: true })
    .click();
  const playerDialog = page.getByRole("dialog");
  await playerDialog.getByLabel("ชื่อผู้เล่น", { exact: true }).fill("   ");
  await playerDialog.getByRole("button", { name: "บันทึกผู้เล่น" }).click();
  await expect(
    page.getByText("กรุณาระบุชื่อผู้เล่น", { exact: true }),
  ).toBeVisible();
  await choose(page, playerDialog.getByLabel("เพศ", { exact: true }), "F");
  await playerDialog.getByRole("button", { name: "ปิด", exact: true }).click();
  await expect(playerDialog).toBeHidden();
  await expect(page.getByRole("checkbox")).toHaveCount(10);
  await page.getByRole("button", { name: "เลือกทั้งหมด", exact: true }).click();
  await page.getByRole("button", { name: "✧ สร้างตาราง", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "ตารางการเล่น", exact: true }),
  ).toBeVisible();
  const before = await savedSession(page);
  await expect(
    page.getByRole("combobox", { name: "คู่ล็อก ผู้เล่น 1", exact: true }),
  ).toHaveAttribute("readonly");
  await page.getByRole("button", { name: "จบเซสชัน", exact: true }).click();
  const confirmation = page
    .getByRole("dialog")
    .filter({ hasText: "ยืนยันการเปลี่ยนแปลง" });
  await expect(confirmation).toContainText("จบเซสชันและเก็บในประวัติ");
  expect((await savedSession(page)).status).toBe("ACTIVE");
  await confirmation
    .getByRole("button", { name: "ยกเลิก", exact: true })
    .click();
  await expect(confirmation).toBeHidden();
  await expect(page.locator(".ant-modal-confirm")).toHaveCount(0);
  expect(await savedSession(page)).toEqual(before);
  await page.getByRole("button", { name: "จบเซสชัน", exact: true }).click();
  await expect(confirmation).toBeVisible();
  await confirmation
    .getByRole("button", { name: "ยืนยัน", exact: true })
    .click();
  await expect(
    page.getByText("เก็บเซสชันในประวัติแล้ว", { exact: true }),
  ).toBeVisible();
  expect((await savedSession(page)).status).toBe("COMPLETED");
});
