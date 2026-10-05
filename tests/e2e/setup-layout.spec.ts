import { test, expect } from "@playwright/test";

test("play settings controls stay inside separate touch fields", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "ตั้งค่าการเล่น" }),
  ).toBeVisible();
  const sizes = info.project.name.startsWith("ipad")
    ? info.project.name === "ipad-portrait"
      ? [
          { width: 768, height: 1024 },
          { width: 820, height: 1180 },
        ]
      : [
          { width: 1024, height: 768 },
          { width: 1180, height: 820 },
        ]
    : [info.project.use.viewport!];
  for (const size of sizes) {
    await page.setViewportSize(size);
    const layout = await page.locator(".config-grid").evaluate((grid) => {
      const fields = [...grid.querySelectorAll("label")].map((label) => {
        const field = label.getBoundingClientRect();
        const control = label
          .querySelector("input,select")!
          .getBoundingClientRect();
        return {
          field: {
            left: field.left,
            right: field.right,
            top: field.top,
            bottom: field.bottom,
          },
          contained:
            control.left >= field.left && control.right <= field.right + 1,
          width: control.width,
          height: control.height,
        };
      });
      return {
        fields,
        columns: getComputedStyle(grid).gridTemplateColumns.split(" ").length,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    expect(layout.overflow).toBe(false);
    if (info.project.name.startsWith("ipad")) expect(layout.columns).toBe(2);
    for (const [i, field] of layout.fields.entries()) {
      expect(field.contained).toBe(true);
      expect(field.height).toBeGreaterThanOrEqual(44);
      if (info.project.name.startsWith("ipad"))
        expect(field.width).toBeGreaterThanOrEqual(170);
      for (const other of layout.fields.slice(i + 1)) {
        const a = field.field,
          b = other.field;
        expect(
          a.right <= b.left ||
            b.right <= a.left ||
            a.bottom <= b.top ||
            b.bottom <= a.top,
        ).toBe(true);
      }
    }
    await page.getByRole("combobox", { name: /ระยะเวลา/ }).selectOption("90");
    await expect(page.getByLabel("จำนวนรอบ", { exact: true })).toHaveValue("9");
    await page.getByRole("combobox", { name: /สนาม/ }).selectOption("1");
    await expect(page.getByRole("combobox", { name: /สนาม/ })).toHaveValue("1");
  }
  await page.screenshot({
    path: `test-results/${info.project.name}-setup.png`,
    fullPage: true,
  });
});
