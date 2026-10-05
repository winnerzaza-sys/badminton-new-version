import { choose, autoConfirm } from "./helpers";
import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { seedPlayers, savedSession } from "./helpers";
import { validateRound } from "../../src/domain/pairing/validator";
import { projectBlock } from "../../src/features/schedule/service";
test("adjust, dynamic roster, summary, PNG, history and resume on every form factor", async ({
  page,
  context,
}, info) => {
  test.setTimeout(90000);
  await autoConfirm(page);
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
  if (info.project.name !== "mobile-webkit") {
    await context.setOffline(true);
    await expect(page.getByText("ออฟไลน์", { exact: true })).toBeVisible();
  } else {
    // Playwright #42775: emulate offline before SW fulfilment fails internally.
    // The separate origin-stopped test verifies genuine cached WebKit navigation.
    info.annotations.push({
      type: "offline-method",
      description:
        "WebKit offline cache is tested with the origin stopped, not setOffline(true)",
    });
  }
  await page
    .locator(".block-toolbar")
    .getByRole("button", { name: "ปรับคู่", exact: true })
    .click();
  const original = await savedSession(page),
    r = original.blocks[0].rounds[0];
  const [a, b] = r.matches[0].teamA.playerIds;
  await page.locator(`[data-player-id="${a}"]`).click();
  await page.locator(`[data-player-id="${b}"]`).click();
  await expect(page.getByText(/สลับผู้เล่นแล้ว/)).toBeVisible();
  expect((await savedSession(page)).blocks[0].undoHistory).toHaveLength(1);
  await page.reload();
  await page.getByRole("button", { name: "เปิดเซสชันเดิม →" }).click();
  await page
    .locator(".block-toolbar")
    .getByRole("button", { name: "ปรับคู่", exact: true })
    .click();
  await page.getByRole("button", { name: "ย้อนการแก้ไข", exact: true }).click();
  await expect(
    page.getByText("ย้อนการแก้ไขแล้ว", { exact: true }),
  ).toBeVisible();
  expect((await savedSession(page)).blocks[0].rounds).toEqual(
    original.blocks[0].rounds,
  );
  const all = [
    ...r.matches.flatMap((m) => [...m.teamA.playerIds, ...m.teamB.playerIds]),
    ...r.restingPlayerIds,
  ];
  let invalid: [string, string] | undefined;
  for (const x of all)
    for (const y of all)
      if (x !== y && !invalid) {
        const round = structuredClone(r),
          exchange = (id: string) => (id === x ? y : id === y ? x : id);
        for (const m of round.matches)
          for (const t of [m.teamA, m.teamB])
            t.playerIds = t.playerIds.map(exchange) as [string, string];
        round.restingPlayerIds = round.restingPlayerIds.map(exchange);
        if (
          validateRound(
            round,
            Object.values(original.playerProfiles!),
            original.blocks[0].baselinePlayers!,
          ).length
        )
          invalid = [x, y];
      }
  expect(invalid).toBeDefined();
  await page.locator(`[data-player-id="${invalid![0]}"]`).click();
  await page.locator(`[data-player-id="${invalid![1]}"]`).click();
  await expect(page.getByRole("alert")).toContainText(/ไม่อนุญาต/);
  expect((await savedSession(page)).blocks[0].rounds).toEqual(
    original.blocks[0].rounds,
  );
  await page.getByRole("button", { name: "ปิดข้อความ" }).click();
  await page
    .locator(".round-tabs")
    .getByRole("button", { name: "รอบ 4", exact: true })
    .click();
  await choose(
    page,
    page.getByLabel("สถานะ ผู้เล่น 1", { exact: true }),
    "PAUSED",
  );
  await expect(
    page.getByText("ปรับสถานะและจัดรอบที่เหลือใหม่แล้ว", { exact: true }),
  ).toBeVisible();
  const paused = await savedSession(page);
  expect(paused.blocks[0].rounds.slice(0, 3)).toEqual(
    original.blocks[0].rounds.slice(0, 3),
  );
  await page
    .locator(".roster-panel")
    .getByRole("button", { name: "＋ เพิ่มรายชื่อใหม่" })
    .click();
  await page.getByLabel("ชื่อผู้เล่น").fill("ผู้เล่นเข้าช้าชื่อยาวทดสอบ");
  await page.getByRole("button", { name: "บันทึกผู้เล่น" }).click();
  await choose(page, page.getByLabel("ผู้เล่นที่มาทีหลัง"), {
    label: "ผู้เล่นเข้าช้าชื่อยาวทดสอบ",
  });
  await page.getByRole("button", { name: "เพิ่มเข้ารอบที่เลือก" }).click();
  await expect(
    page.getByText("เพิ่มผู้เล่นตั้งแต่รอบที่เลือกแล้ว", { exact: true }),
  ).toBeVisible();
  const joined = await savedSession(page),
    late = joined.playerIds.find((id) => !original.playerIds.includes(id))!;
  expect(
    projectBlock(joined, joined.blocks[0]).projectedPlayers.find(
      (p) => p.playerId === late,
    )?.eligibleRounds,
  ).toBe(3);
  await page
    .locator(".round-tabs")
    .getByRole("button", { name: "รอบ 6", exact: true })
    .click();
  await choose(
    page,
    page.getByLabel("สถานะ ผู้เล่น 1", { exact: true }),
    "ACTIVE",
  );
  await expect(
    page.getByText("ปรับสถานะและจัดรอบที่เหลือใหม่แล้ว", { exact: true }),
  ).toBeVisible();
  await page
    .locator(".block-toolbar")
    .getByRole("button", { name: "สรุป", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "สรุปความสมดุล", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".summary-table")).toContainText(
    "ผู้เล่นเข้าช้าชื่อยาวทดสอบ",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .locator(".block-toolbar")
    .getByRole("button", { name: "ส่งออก / แชร์", exact: true })
    .click();
  await expect(page.locator(".export-image")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "บันทึก PNG", exact: true }),
  ).toBeEnabled();
  const imageBefore = await page.locator(".export-image").getAttribute("src");
  const pngBefore = await page.evaluate(
    async (url) =>
      Array.from(new Uint8Array(await (await fetch(url!)).arrayBuffer())),
    imageBefore,
  );
  await page.setViewportSize({ width: 700, height: 900 });
  await page
    .locator(".block-toolbar")
    .getByRole("button", { name: "ตารางเล่น", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "ตารางการเล่น", exact: true }),
  ).toBeVisible();
  await page
    .locator(".block-toolbar")
    .getByRole("button", { name: "ส่งออก / แชร์", exact: true })
    .click();
  await expect(page.locator(".export-image")).toBeVisible();
  const pngAfter = await page.evaluate(
    async (url) =>
      Array.from(new Uint8Array(await (await fetch(url!)).arrayBuffer())),
    await page.locator(".export-image").getAttribute("src"),
  );
  expect(pngAfter).toEqual(pngBefore);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "บันทึก PNG", exact: true }).click();
  const download = await downloadPromise,
    file = await readFile((await download.path())!);
  expect([...file.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(file.readUInt32BE(16)).toBe(1080);
  expect(file.readUInt32BE(20)).toBeGreaterThan(1200);
  await download.saveAs(`test-results/${info.project.name}-share.png`);
  await page.getByRole("button", { name: "จบเซสชัน", exact: true }).click();
  await expect(
    page.getByText("เก็บเซสชันในประวัติแล้ว", { exact: true }),
  ).toBeVisible();
  await page.reload();
  const historyNav = page
    .locator("nav:visible")
    .getByRole("button", { name: "ประวัติ", exact: true });
  await historyNav.click();
  await page.getByRole("button", { name: "ดูตารางและแชร์ →" }).click();
  await expect(page.getByText(/จบเซสชันแล้ว/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "จบเซสชัน", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "＋ สร้างตารางใหม่" }).click();
  await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(11);
});
test("desktop dragging, locked pair control and full-block reset", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  await autoConfirm(page);
  await seedPlayers(page);
  await page.getByRole("button", { name: "เลือกทั้งหมด", exact: true }).click();
  await page.getByRole("button", { name: "✧ สร้างตาราง", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "ตารางการเล่น", exact: true }),
  ).toBeVisible();
  await page
    .locator(".block-toolbar")
    .getByRole("button", { name: "ปรับคู่", exact: true })
    .click();
  const s = await savedSession(page),
    [a, b] = s.blocks[0].rounds[0].matches[0].teamA.playerIds;
  await page
    .locator(`[data-player-id="${a}"]`)
    .dragTo(page.locator(`[data-player-id="${b}"]`));
  await expect(page.getByText(/สลับผู้เล่นแล้ว/)).toBeVisible();
  await page.getByRole("button", { name: "คืนค่าทั้งตาราง" }).click();
  await expect(
    page.getByText("คืนค่าตารางแล้ว", { exact: true }),
  ).toBeVisible();
  expect((await savedSession(page)).blocks[0].rounds).toEqual(
    s.blocks[0].rounds,
  );
  const nameA = s.playerProfiles![a].name,
    nameB = s.playerProfiles![b].name;
  await choose(page, page.getByLabel(`คู่ล็อก ${nameA}`, { exact: true }), b);
  await expect(
    page.getByText("ล็อกคู่และจัดรอบที่เหลือใหม่แล้ว", { exact: true }),
  ).toBeVisible();
  expect((await savedSession(page)).sessionPlayers[a].fixedPartnerId).toBe(b);
  await choose(page, page.getByLabel(`คู่ล็อก ${nameA}`, { exact: true }), "");
  await expect(page.getByText("ปลดล็อกคู่แล้ว", { exact: true })).toBeVisible();
  await page.getByText("เพิ่มช่วงเล่นต่อ", { exact: true }).click();
  await page
    .getByRole("button", { name: "เพิ่มช่วงเล่น", exact: true })
    .click();
  await expect(
    page.getByText("เพิ่มช่วงเล่นต่อแล้ว", { exact: true }),
  ).toBeVisible();
  expect((await savedSession(page)).blocks).toHaveLength(2);
  await expect(page.locator(".block-toolbar .ant-select")).toContainText(
    "ช่วง 2",
  );
});
