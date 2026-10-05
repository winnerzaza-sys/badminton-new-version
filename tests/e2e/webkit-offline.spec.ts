import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { seedPlayers } from "./helpers";
test("WebKit launches cached app and generates/exports with its origin stopped", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "mobile-webkit");
  test.setTimeout(60000);
  const root = resolve("dist"),
    types: Record<string, string> = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".png": "image/png",
      ".webmanifest": "application/manifest+json",
    };
  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
          new URL(req.url ?? "/", "http://localhost").pathname,
        ),
        path = resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
      if (!path.startsWith(root + sep)) {
        res.writeHead(403).end();
        return;
      }
      const bytes = await readFile(path);
      res.setHeader(
        "Content-Type",
        types[extname(path)] ?? "application/octet-stream",
      );
      res.end(bytes);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("No local test server");
  try {
    await seedPlayers(page, `http://127.0.0.1:${address.port}/`);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
      .toBe(true);
    // The origin is unreachable from this point, while browser networking remains
    // enabled so the known emulation bug cannot short-circuit the service worker.
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "สร้างตารางวันนี้" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "เลือกทั้งหมด", exact: true })
      .click();
    await page
      .getByRole("button", { name: "✧ สร้างตาราง", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "ตารางการเล่น", exact: true }),
    ).toBeVisible();
    await page
      .locator(".block-toolbar")
      .getByRole("button", { name: "ส่งออก / แชร์", exact: true })
      .click();
    await expect(page.locator(".export-image")).toBeVisible();
    const saving = page.waitForEvent("download");
    await page.getByRole("button", { name: "บันทึก PNG", exact: true }).click();
    expect((await saving).suggestedFilename()).toMatch(/\.png$/);
    await page.reload();
    await expect(
      page.getByRole("button", { name: "เปิดเซสชันเดิม →" }),
    ).toBeVisible();
  } finally {
    server.closeAllConnections();
    if (server.listening)
      await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
