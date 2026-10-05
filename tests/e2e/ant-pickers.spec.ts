import { test, expect } from "@playwright/test";

test("Ant calendar and native time input fit the viewport and persist local values", async ({
  page,
}, info) => {
  await page.goto("/");
  const date = page.getByLabel("วันที่", { exact: true });
  await expect(date).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const [, month, year] = (await date.inputValue()).split("/");
  await date.click();
  const popup = page.locator(".ant-picker-dropdown:visible");
  await expect(popup).toBeVisible();
  const bounds = await popup.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(
    page.viewportSize()!.width + 1,
  );
  await page.screenshot({
    path: `test-results/${info.project.name}-calendar.png`,
  });
  await popup.locator(`td[title="${year}-${month}-15"]`).click();
  await expect(date).toHaveValue(`15/${month}/${year}`);
  await expect(popup).toBeHidden();
  const time = page.getByLabel("เริ่มเล่น", { exact: true });
  await expect(time).toHaveAttribute("type", "time");
  await time.fill("18:30");
  await page
    .getByRole("heading", { name: "ตั้งค่าการเล่น", exact: true })
    .click();
  await expect(time).toHaveValue("18:30");
  await expect(popup).toBeHidden();
  await page.reload();
  await expect(date).toHaveValue(`15/${month}/${year}`);
  await expect(time).toHaveValue("18:30");
});
