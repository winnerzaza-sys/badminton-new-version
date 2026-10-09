import { test, expect } from "@playwright/test";
import { seedPlayers } from "./helpers";
test("file sharing, user cancellation and PNG download fallback", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  await seedPlayers(page);
  await page.getByRole("button", { name: "เลือกทั้งหมด", exact: true }).click();
  await page.getByRole("button", { name: "✧ สร้างตาราง", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "ตารางการเล่น", exact: true }),
  ).toBeVisible();
  await page
    .locator(".block-tabs")
    .getByRole("button", { name: "ส่งออก / แชร์", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "แชร์ภาพ / เลือก LINE" }),
  ).toBeEnabled();
  await page.evaluate(() => {
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => true,
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => {
        if (data.files?.[0].type !== "image/png" || !data.files[0].size)
          throw new Error("Missing PNG");
      },
    });
  });
  await page.getByRole("button", { name: "แชร์ภาพ / เลือก LINE" }).click();
  await expect(
    page.getByText("ส่งภาพผ่านเมนูแชร์แล้ว", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async () => {
        throw new DOMException("Cancel", "AbortError");
      },
    }),
  );
  await page.getByRole("button", { name: "แชร์ภาพ / เลือก LINE" }).click();
  await expect(
    page.getByText("ยกเลิกการแชร์แล้ว", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => false,
    }),
  );
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "แชร์ภาพ / เลือก LINE" }).click();
  expect((await downloading).suggestedFilename()).toMatch(/\.png$/);
  await expect(
    page.getByText("ดาวน์โหลดภาพแล้ว เปิด LINE แล้วเลือกส่งภาพนี้ได้", {
      exact: true,
    }),
  ).toBeVisible();
});
