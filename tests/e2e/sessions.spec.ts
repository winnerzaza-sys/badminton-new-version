import { expect, test } from "@playwright/test";
import { seedPlayers } from "./helpers";

async function createSession(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "เลือกทั้งหมด", exact: true }).click();
  await page.getByRole("button", { name: "✧ สร้างตาราง", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "ตารางการเล่น", exact: true }),
  ).toBeVisible();
}
const openSessions = (page: import("@playwright/test").Page) =>
  page
    .locator(".sidebar:visible, .bottom-nav:visible")
    .getByRole("button", { name: "Session", exact: true })
    .click();

test("delete sessions with confirm, undo and multi-select on every form factor", async ({
  page,
}, info) => {
  await seedPlayers(page);
  await createSession(page);
  await page.screenshot({
    path: `test-results/glass-${info.project.name}-schedule.png`,
    fullPage: false,
  });
  await page.getByRole("button", { name: "สร้างตารางใหม่" }).first().click();
  await createSession(page);
  await openSessions(page);
  await expect(page.getByRole("heading", { name: "Session" })).toBeVisible();
  await expect(page.getByText("2 รายการ · เก็บไว้ในเครื่องนี้")).toBeVisible();
  await page.screenshot({
    path: `test-results/glass-${info.project.name}-sessions.png`,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);

  // Single delete → confirm → toast → undo restores the record.
  // The newest card is the open session; deleting it would return home.
  await page
    .getByRole("button", { name: /^ลบ Session / })
    .last()
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("จะถูกลบออกจากเครื่อง");
  await expect(dialog).toContainText("มี Session ที่กำลังเล่นอยู่");
  await page.screenshot({
    path: `test-results/glass-${info.project.name}-confirm.png`,
  });
  await dialog.getByRole("button", { name: "ลบ Session", exact: true }).click();
  await expect(page.getByText("ลบ 1 Session แล้ว")).toBeVisible();
  await expect(page.getByText("1 รายการ · เก็บไว้ในเครื่องนี้")).toBeVisible();
  await page.getByRole("button", { name: "เลิกทำ", exact: true }).click();
  await expect(page.getByText("2 รายการ · เก็บไว้ในเครื่องนี้")).toBeVisible();
  await page.reload();
  await openSessions(page);
  await expect(page.getByText("2 รายการ · เก็บไว้ในเครื่องนี้")).toBeVisible();

  // Multi-select delete of everything returns to an empty list.
  if (info.project.name !== "desktop")
    await page.getByRole("button", { name: "เลือก", exact: true }).click();
  await page
    .getByRole("toolbar")
    .getByRole("button", { name: "เลือกทั้งหมด", exact: true })
    .or(page.getByRole("button", { name: "เลือกทั้งหมด", exact: true }))
    .first()
    .click();
  await expect(page.getByText("เลือกแล้ว 2 รายการ")).toBeVisible();
  await page.getByRole("button", { name: "ลบ (2)" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "ลบ 2 รายการ", exact: true })
    .click();
  await expect(page.getByText("ไม่มี Session")).toBeVisible();
  await page.reload();
  await openSessions(page);
  await expect(page.getByText("0 รายการ · เก็บไว้ในเครื่องนี้")).toBeVisible();
});
