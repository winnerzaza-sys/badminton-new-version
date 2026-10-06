import { test, expect } from "@playwright/test";

test("Ant date/time pickers fit the viewport and persist local values", async ({
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
  await time.click();
  await expect(popup).toBeVisible();
  const timeBounds = await popup.boundingBox();
  expect(timeBounds!.x).toBeGreaterThanOrEqual(0);
  expect(timeBounds!.x + timeBounds!.width).toBeLessThanOrEqual(
    page.viewportSize()!.width + 1,
  );
  await popup
    .locator(".ant-picker-time-panel-column")
    .nth(0)
    .getByText("18", { exact: true })
    .click();
  await expect(popup).toBeVisible();
  await popup
    .locator(".ant-picker-time-panel-column")
    .nth(1)
    .getByText("30", { exact: true })
    .click();
  await page.screenshot({
    path: `test-results/${info.project.name}-timepicker.png`,
  });
  await popup.getByRole("button", { name: "ตกลง", exact: true }).click();
  await expect(time).toHaveValue("18:30");
  await expect(popup).toBeHidden();
  await page.reload();
  await expect(date).toHaveValue(`15/${month}/${year}`);
  await expect(time).toHaveValue("18:30");
});
