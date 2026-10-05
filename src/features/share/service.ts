import type {
  Session,
  ScheduleBlock,
  PlayerProfile,
} from "../../domain/models";
import { sessionProfiles, projectBlock } from "../schedule/service";
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
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("อุปกรณ์นี้ไม่รองรับการสร้างภาพ");
  const byId = new Map(
    sessionProfiles(session, profiles).map((p) => [p.id, p.name]),
  );
  const name = (id: string) => byId.get(id) ?? "ไม่พบผู้เล่น";
  const columns =
    block.courtCount === 2 ? [110, 330, 330, 246] : [110, 560, 346];
  const xPositions = columns.map(
    (_, i) => 32 + columns.slice(0, i).reduce((a, b) => a + b, 0),
  );
  const font = (size: number, bold = false) =>
    `${bold ? "bold " : ""}${size}px Tahoma, "Segoe UI", sans-serif`;
  ctx.font = font(31);
  const rows = block.rounds.map((round) => {
    const cells = Array.from({ length: block.courtCount }, (_, index) => {
      const match = round.matches.find((m) => m.court === index + 1);
      return match
        ? [
            ...wrap(
              ctx,
              match.teamA.playerIds.map(name).join(" + "),
              columns[index + 1] - 32,
            ),
            "VS",
            ...wrap(
              ctx,
              match.teamB.playerIds.map(name).join(" + "),
              columns[index + 1] - 32,
            ),
          ]
        : ["ไม่ใช้สนาม"];
    });
    cells.push(
      wrap(
        ctx,
        round.restingPlayerIds.map(name).join(", "),
        columns.at(-1)! - 32,
      ),
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
    270 +
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
  let y = 254;
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
      ctx.fillText(rest ? "พัก" : `สนาม ${index + 1}`, x + width / 2, y + 39);
      ctx.fillStyle = "#183249";
      ctx.font = font(31);
      lines.forEach((line, i) => {
        ctx.fillText(line, x + width / 2, y + 82 + i * 42);
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
  if (document.fonts) await document.fonts.ready;
  const canvas = renderShareCanvas(session, block, profiles);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) =>
        value ? resolve(value) : reject(new Error("สร้าง PNG ไม่สำเร็จ")),
      "image/png",
    ),
  );
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
