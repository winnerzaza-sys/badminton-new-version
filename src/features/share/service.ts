import type {
  Session,
  ScheduleBlock,
  PlayerProfile,
} from "../../domain/models";
import {
  sessionProfiles,
  projectBlock,
  blockBaseline,
} from "../schedule/service";
import { courtName } from "../../domain/models/courts";
import { playingStreaks } from "../../domain/pairing/streaks";
import { REPLAY_PATH } from "../../utils/replay";
export const EXPORT_WIDTH = 1080;
const clock = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("th-TH", {
        timeZone: "Asia/Bangkok",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(value))
    : "";
function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
): string[] {
  const lines: string[] = [];
  let line = "";
  const characters =
    typeof Intl.Segmenter === "function"
      ? Array.from(
          new Intl.Segmenter("th", { granularity: "grapheme" }).segment(text),
          (item) => item.segment,
        )
      : Array.from(text);
  for (const character of characters) {
    if (line && ctx.measureText(line + character).width > width) {
      lines.push(line);
      line = character;
    } else line += character;
  }
  if (line) lines.push(line);
  return lines.length ? lines : ["—"];
}
export function renderShareCanvas(
  session: Session,
  block: ScheduleBlock,
  profiles: PlayerProfile[],
) {
  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_WIDTH;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("อุปกรณ์นี้ไม่รองรับการสร้างภาพ");
  const ctx = context;
  const byId = new Map(
    sessionProfiles(session, profiles).map((p) => [p.id, p.name]),
  );
  const name = (id: string) => byId.get(id) ?? "ไม่พบผู้เล่น";
  const streaks = playingStreaks(block.rounds, blockBaseline(session, block));
  const columns =
    block.courtCount === 2 ? [110, 330, 330, 246] : [110, 560, 346];
  const xPositions = columns.map(
    (_, i) => 32 + columns.slice(0, i).reduce((a, b) => a + b, 0),
  );
  const font = (size: number, bold = false) =>
    `${bold ? "700 " : "400 "}${size}px "${bold ? "Prompt" : "Sarabun"}", sans-serif`;
  type Part = { text: string; streak?: number };
  type Line = Part[];
  const badgeWidth = (count: number) => {
    ctx.font = font(26);
    return 40 + ctx.measureText(String(count)).width;
  };
  const partWidth = (part: Part): number => {
    if (part.streak) return badgeWidth(part.streak);
    ctx.font = font(31);
    return ctx.measureText(part.text).width;
  };
  const lineWidth = (line: Line) =>
    line.reduce((total, part) => total + partWidth(part), 0);
  function teamLines(
    ids: string[],
    roundNumber: number,
    width: number,
  ): Line[] {
    const lines: Line[] = [];
    ids.forEach((id, index) => {
      const count = streaks[roundNumber]?.[id] ?? 0;
      const badge = count >= 2 ? { text: "", streak: count } : undefined;
      ctx.font = font(31);
      const available = width - (badge ? badgeWidth(count) + 8 : 0);
      ctx.font = font(31);
      const chunks = wrap(ctx, name(id), available);
      const playerLines: Line[] = chunks.map((text, i) => [
        { text },
        ...(i === chunks.length - 1 && badge ? [{ text: " " }, badge] : []),
      ]);
      const last = lines.at(-1);
      const separator = { text: " + " };
      if (
        last &&
        playerLines.length === 1 &&
        lineWidth([...last, separator, ...playerLines[0]]) <= width
      )
        last.push(separator, ...playerLines[0]);
      else {
        // Keep the team separator on the next player's line when two names
        // cannot fit together; reserve its width rather than shrinking text.
        if (index > 0) {
          ctx.font = font(31);
          const prefixed = wrap(ctx, `+ ${name(id)}`, available);
          playerLines.splice(
            0,
            playerLines.length,
            ...prefixed.map((text, i) => [
              { text },
              ...(i === prefixed.length - 1 && badge
                ? [{ text: " " }, badge]
                : []),
            ]),
          );
        }
        lines.push(...playerLines);
      }
    });
    return lines;
  }
  const replay = new Path2D(REPLAY_PATH);
  function drawBadge(count: number, x: number, baseline: number) {
    const width = badgeWidth(count);
    ctx.fillStyle = "#fff0cf";
    ctx.strokeStyle = "#e8c27a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, baseline - 29, width, 36, 7);
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.translate(x + 7, baseline - 23);
    ctx.scale(22 / 24, 22 / 24);
    ctx.strokeStyle = "#80500b";
    ctx.lineWidth = 2.3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke(replay);
    ctx.restore();
    ctx.font = font(26);
    ctx.fillStyle = "#80500b";
    ctx.textAlign = "left";
    ctx.fillText(String(count), x + 33, baseline);
  }
  ctx.font = font(31);
  const rows = block.rounds.map((round) => {
    const cells = Array.from({ length: block.courtCount }, (_, index) => {
      const match = round.matches.find((m) => m.court === index + 1);
      return match
        ? [
            ...teamLines(
              match.teamA.playerIds,
              round.roundNumber,
              columns[index + 1] - 32,
            ),
            [{ text: "VS" }],
            ...teamLines(
              match.teamB.playerIds,
              round.roundNumber,
              columns[index + 1] - 32,
            ),
          ]
        : [[{ text: "ไม่ใช้สนาม" }]];
    });
    ctx.font = font(31);
    cells.push(
      wrap(
        ctx,
        round.restingPlayerIds.map(name).join(", "),
        columns.at(-1)! - 32,
      ).map((text) => [{ text }]),
    );
    const height = Math.max(
      176,
      Math.max(...cells.map((lines) => lines.length)) * 42 + 82,
    );
    return { round, cells, height };
  });
  const stats = projectBlock(session, block).projectedPlayers;
  ctx.font = font(25);
  const summary = stats.map((p) => ({
    lines: wrap(ctx, `${name(p.playerId)} · ${p.totalGames} เกม`, 310),
  }));
  const summaryRows: Array<{ items: typeof summary; height: number }> = [];
  for (let i = 0; i < summary.length; i += 3) {
    const items = summary.slice(i, i + 3);
    summaryRows.push({
      items,
      height: Math.max(...items.map((s) => s.lines.length)) * 34 + 18,
    });
  }
  canvas.height =
    334 +
    rows.reduce((s, row) => s + row.height + 14, 0) +
    110 +
    summaryRows.reduce((s, row) => s + row.height, 0) +
    90;
  ctx.fillStyle = "#f4f8fc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#123c50";
  ctx.fillRect(0, 0, canvas.width, 230);
  ctx.fillStyle = "#fff";
  ctx.font = font(46, true);
  ctx.textAlign = "center";
  ctx.fillText("BADMINTON NIGHT", 540, 76);
  ctx.font = font(29);
  const date = new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${session.date}T12:00:00+07:00`));
  ctx.fillText(
    `${date} · ${clock(block.startTime)}–${clock(block.rounds.at(-1)?.estimatedEnd)}`,
    540,
    130,
  );
  ctx.font = font(26);
  ctx.fillText(
    `${session.playerIds.length} คน  ·  ${block.courtCount} สนาม  ·  ${block.plannedRounds} รอบ  ·  ${block.pointsPerGame} แต้ม`,
    540,
    180,
  );
  const colors = ["#ddf5e5", "#ffe3ea", "#e4efff"];
  ctx.fillStyle = "#fff8e9";
  ctx.fillRect(32, 244, 1016, 54);
  drawBadge(3, 56, 280);
  ctx.font = font(25);
  ctx.fillStyle = "#80500b";
  ctx.textAlign = "left";
  ctx.fillText("= เล่นติดกัน 3 รอบ รวมรอบนั้น · แสดงตั้งแต่ 2 รอบ", 126, 280);
  let y = 318;
  for (const { round, cells, height } of rows) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(32, y, 1016, height);
    ctx.fillStyle = "#183249";
    ctx.font = font(30, true);
    ctx.textAlign = "center";
    ctx.fillText(`รอบ ${round.roundNumber}`, xPositions[0] + 55, y + 62);
    ctx.font = font(19);
    ctx.fillText(clock(round.estimatedStart), xPositions[0] + 55, y + 105);
    ctx.fillText(clock(round.estimatedEnd), xPositions[0] + 55, y + 134);
    cells.forEach((lines, index) => {
      const x = xPositions[index + 1],
        width = columns[index + 1],
        rest = index === cells.length - 1;
      ctx.fillStyle = colors[rest ? 2 : index];
      ctx.fillRect(x + 3, y + 4, width - 6, height - 8);
      ctx.fillStyle = rest ? "#255bab" : index === 0 ? "#17663e" : "#a72c4d";
      ctx.font = font(26, true);
      ctx.textAlign = "center";
      ctx.fillText(
        rest ? "พัก" : courtName(block.courtNames, index + 1),
        x + width / 2,
        y + 39,
        width - 24,
      );
      ctx.fillStyle = "#183249";
      ctx.font = font(31);
      lines.forEach((line, i) => {
        let left = x + (width - lineWidth(line)) / 2;
        for (const part of line) {
          const baseline = y + 82 + i * 42;
          if (part.streak) drawBadge(part.streak, left, baseline);
          else {
            ctx.fillStyle = "#183249";
            ctx.font = font(31);
            ctx.textAlign = "left";
            ctx.fillText(part.text, left, baseline);
          }
          left += partWidth(part);
        }
      });
    });
    y += height + 14;
  }
  ctx.fillStyle = "#183249";
  ctx.font = font(30, true);
  ctx.textAlign = "left";
  ctx.fillText("จำนวนเกมตามแผน", 40, y + 44);
  y += 82;
  for (const row of summaryRows) {
    row.items.forEach((s, index) => {
      ctx.fillStyle = "#fff";
      ctx.fillRect(32 + index * 340, y, 326, row.height - 8);
      ctx.fillStyle = "#284564";
      ctx.font = font(25);
      s.lines.forEach((line, i) =>
        ctx.fillText(line, 44 + index * 340, y + 30 + i * 34),
      );
    });
    y += row.height;
  }
  ctx.font = font(23);
  ctx.textAlign = "center";
  ctx.fillStyle = "#577088";
  ctx.fillText(
    "เล่นให้สนุก พักให้พอดี · ตารางการเล่นล่วงหน้า",
    540,
    canvas.height - 40,
  );
  return canvas;
}
export async function createShareImage(
  session: Session,
  block: ScheduleBlock,
  profiles: PlayerProfile[],
) {
  if (document.fonts) {
    // Canvas-only weights may not have been requested by the current UI yet.
    await Promise.all([
      document.fonts.load('400 31px "Sarabun"', "ตาราง BADMINTON"),
      document.fonts.load('700 46px "Prompt"', "ตาราง BADMINTON"),
    ]);
  }
  const canvas = renderShareCanvas(session, block, profiles);
  const blob = await new Promise<Blob>((resolve, reject) => {
    // Some browsers defer the asynchronous encoder for detached canvases.
    // Keep exporting usable when its callback never arrives, including offline.
    const fallback = setTimeout(() => {
      try {
        const encoded = canvas.toDataURL("image/png").split(",")[1];
        if (!encoded) throw new Error("สร้าง PNG ไม่สำเร็จ");
        const bytes = Uint8Array.from(atob(encoded), (char) =>
          char.charCodeAt(0),
        );
        resolve(new Blob([bytes], { type: "image/png" }));
      } catch (error) {
        reject(error);
      }
    }, 1500);
    canvas.toBlob((value) => {
      clearTimeout(fallback);
      value ? resolve(value) : reject(new Error("สร้าง PNG ไม่สำเร็จ"));
    }, "image/png");
  });
  return {
    blob,
    width: canvas.width,
    height: canvas.height,
    file: new File([blob], `badminton-${session.date}-block.png`, {
      type: "image/png",
    }),
  };
}
export function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob),
    anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function shareImage(
  file: File,
): Promise<"shared" | "cancelled" | "downloaded"> {
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "ตารางแบดมินตัน" });
      return "shared";
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError")
        return "cancelled";
    }
  }
  downloadFile(file, file.name);
  return "downloaded";
}
