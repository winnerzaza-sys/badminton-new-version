import { AppSelect } from "../../components/AppSelect";
import { Alert, Modal } from "antd";
import { CourtNameFields } from "../../components/CourtNameFields";
import { courtName, normalizeCourtNames } from "../../domain/models/courts";
import { useEffect, useState } from "react";
import type { RoundSchedule } from "../../domain/models";
import type { useBadminton } from "../../hooks/useBadminton";
import { blockBaseline, projectBlock } from "./service";
import { playingStreaks } from "../../domain/pairing/streaks";
import {
  PlayingStreak,
  PlayingStreakLegend,
} from "../../components/PlayingStreak";
import { SharePreview } from "../share/SharePreview";
import { formatTime } from "../../utils/format";
import { avatarStyle } from "../../utils/avatar";
type Controller = ReturnType<typeof useBadminton>;
export function SummaryPanel({ app }: { app: Controller }) {
  const { session, block, name } = app;
  if (!session || !block) return null;
  const result = projectBlock(session, block);
  const components = [
    ["เกมสมดุล", block.score.gameBalance],
    ["กระจายพัก", block.score.restFairness],
    ["คู่หลากหลาย", block.score.partnerDiversity],
    ["คู่แข่งหลากหลาย", block.score.opponentDiversity],
    ["การเล่นต่อเนื่อง", block.score.consecutive],
  ] as const;
  return (
    <section className="panel summary-panel">
      <h2>ภาพรวมตาราง</h2>
      <div className="summary-grid">
        <div>
          <div className="score-ring">
            <strong>
              {Math.round(block.score.total)}
              <small>/100</small>
            </strong>
          </div>
          <p className="score-caption">คะแนนตามเป้าหมายการจัดคู่</p>
          {result.metrics.fairnessRecovery && (
            <span className="badge">เน้นฟื้นความสมดุล</span>
          )}
        </div>
        <div>
          {components.map(([label, value]) => (
            <div className="metric" key={label}>
              <span>{label}</span>
              <strong>{Math.round(value)}</strong>
              <progress aria-label={label} max={100} value={value} />
            </div>
          ))}
        </div>
      </div>
      <div className="fairness-facts">
        <div>
          <strong>{result.metrics.gameCountSpread}</strong>
          <small>เกมมากสุด − น้อยสุด</small>
        </div>
        <div>
          <strong>
            {Math.round(result.metrics.participationRateSpread * 100)}%
          </strong>
          <small>ส่วนต่างอัตราลงเล่น</small>
        </div>
        <div>
          <strong>{result.metrics.maxRestStreak}</strong>
          <small>พักติดกันมากสุด</small>
        </div>
        <div>
          <strong>{result.metrics.maxPlayStreak}</strong>
          <small>เล่นติดกันมากสุด</small>
        </div>
      </div>
      <p className="muted">
        ผู้เข้าช้าวัดความสมดุลจากโอกาสที่พร้อมเล่น
        ช่วงพักเองไม่นับเป็นการถูกจัดพัก ไม่มีเพดานบังคับของการเล่นติดกัน
      </p>
      <h3>จำนวนเกมสะสมตามแผนถึงช่วงนี้</h3>
      <div className="summary-table">
        <table>
          <thead>
            <tr>
              <th>ผู้เล่น</th>
              <th>เกม</th>
              <th>พร้อมเล่น</th>
              <th>อัตราลงเล่น</th>
              <th>พัก</th>
            </tr>
          </thead>
          <tbody>
            {result.projectedPlayers.map((p) => (
              <tr key={p.playerId}>
                <th>{name(p.playerId)}</th>
                <td>{p.totalGames}</td>
                <td>{p.eligibleRounds}</td>
                <td>
                  {p.eligibleRounds
                    ? `${Math.round((p.totalGames / p.eligibleRounds) * 100)}%`
                    : "—"}
                </td>
                <td>{p.restRounds}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted">
        คู่เดิมซ้ำ {result.metrics.partnerRepeats} ครั้ง · คู่แข่งเดิมซ้ำ{" "}
        {result.metrics.opponentRepeats} ครั้ง · เป็นตารางล่วงหน้า
        ไม่ใช่ผลการแข่งขันจริง
      </p>
    </section>
  );
}
export function ScheduleWorkspace({ app }: { app: Controller }) {
  const {
    session,
    block,
    name,
    page,
    setPage,
    roundIndex,
    setRoundIndex,
    busy,
    blockIndex,
    setBlockIndex,
  } = app;
  const [picked, setPicked] = useState<string>(),
    [lateId, setLateId] = useState(""),
    [duration, setDuration] = useState(60),
    [courts, setCourts] = useState<1 | 2>(2),
    [rounds, setRounds] = useState(6);
  const [namingCourts, setNamingCourts] = useState(false),
    [courtNames, setCourtNames] = useState<string[]>([]);
  useEffect(() => {
    setPicked(undefined);
  }, [page, roundIndex, blockIndex, session?.id, block?.updatedAt]);
  if (!session || !block)
    return (
      <main>
        <section className="empty panel">
          <h1>ยังไม่ได้เปิดตาราง</h1>
          <p>สร้างตารางวันนี้ หรือเปิดเซสชันที่เก็บไว้</p>
          <button className="primary" onClick={() => setPage("home")}>
            ไปหน้าสร้างตาราง
          </button>
          {app.unfinished && (
            <button
              className="secondary"
              onClick={() => app.resume(app.unfinished!)}
            >
              เปิดเซสชันเดิม
            </button>
          )}
        </section>
      </main>
    );
  const editing = page === "adjust" && session.status !== "COMPLETED",
    readOnly = session.status === "COMPLETED";
  const current = block.rounds[Math.min(roundIndex, block.rounds.length - 1)];
  const streaks = playingStreaks(block.rounds, blockBaseline(session, block));
  const projected = projectBlock(session, block),
    lateOptions = app.active.filter((p) => !session.playerIds.includes(p.id));
  async function choose(id: string) {
    if (!editing || busy) return;
    if (!picked) {
      setPicked(id);
      return;
    }
    if (picked === id) {
      setPicked(undefined);
      return;
    }
    await app.swap(picked, id);
    setPicked(undefined);
  }
  function token(id: string, round: RoundSchedule) {
    const profile =
      session?.playerProfiles?.[id] ?? app.players.find((p) => p.id === id);
    const content = (
      <>
        <span className="avatar" style={avatarStyle(id)}>
          {name(id).slice(0, 1)}
        </span>
        <span className="scheduled-player-name">
          <strong>{name(id)}</strong>
          <PlayingStreak count={streaks[round.roundNumber]?.[id] ?? 0} />
        </span>
        <small>
          {profile?.gender === "M" ? "ชาย" : "หญิง"}
          {round.fixedPairs?.some((pair) => pair.includes(id))
            ? " · ล็อกคู่"
            : ""}
        </small>
      </>
    );
    if (!editing)
      return (
        <div className="court-player" key={id}>
          {content}
        </div>
      );
    return (
      <button
        className={`court-player player-token ${picked === id ? "picked" : ""}`}
        key={id}
        data-player-id={id}
        aria-label={`เลือก ${name(id)} เพื่อสลับ`}
        aria-pressed={picked === id}
        disabled={busy}
        draggable={window.matchMedia("(min-width:768px)").matches}
        onDragStart={(e) => {
          e.dataTransfer.setData("application/x-badminton-player", id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={async (e) => {
          e.preventDefault();
          const a = e.dataTransfer.getData("application/x-badminton-player");
          if (a && a !== id) await app.swap(a, id);
          setPicked(undefined);
        }}
        onClick={() => choose(id)}
      >
        {content}
      </button>
    );
  }
  function teamNames(ids: string[], round: RoundSchedule) {
    return ids.map((id, index) => (
      <span key={id}>
        {index > 0 && " + "}
        <span className="scheduled-player-name">
          <span>{name(id)}</span>
          <PlayingStreak count={streaks[round.roundNumber]?.[id] ?? 0} />
        </span>
      </span>
    ));
  }
  const cards = (
    <div className="court-grid">
      {current.matches.map((m) => (
        <article className={`court court-${m.court}`} key={m.court}>
          <h3>{courtName(block.courtNames, m.court)}</h3>
          {[m.teamA, m.teamB].map((team, i) => (
            <div className="team-wrap" key={i}>
              {i === 1 && <span className="versus">VS</span>}
              <div className="team">
                {team.playerIds.map((id) => token(id, current))}
              </div>
            </div>
          ))}
        </article>
      ))}
      <article className="court rest">
        <h3>พัก ({current.restingPlayerIds.length} คน)</h3>
        <div className="rest-players">
          {current.restingPlayerIds.map((id) => token(id, current))}
        </div>
        {!current.restingPlayerIds.length && <p>ทุกคนลงสนาม</p>}
      </article>
    </div>
  );
  return (
    <main className={editing ? "editing-workspace" : ""}>
      <div className="page-title">
        <div>
          <small className="eyebrow">
            {readOnly ? "COMPLETED SESSION" : "YOUR PLAY BLOCK"}
          </small>
          <h1>
            {page === "adjust"
              ? "ปรับคู่การเล่น"
              : page === "summary"
                ? "สรุปความสมดุล"
                : page === "share"
                  ? "ส่งออกและแชร์"
                  : "ตารางการเล่น"}
          </h1>
          <p>
            {session.playerIds.length} คน · {block.courtCount} สนาม ·{" "}
            {block.pointsPerGame} แต้ม · {block.plannedRounds} รอบ
            {readOnly ? " · จบเซสชันแล้ว" : ""}
          </p>
        </div>
        <button className="secondary" onClick={() => app.newSetup()}>
          ＋ สร้างตารางใหม่
        </button>
      </div>
      <div className="block-toolbar">
        <label>
          ช่วงเล่น
          <AppSelect
            value={blockIndex}
            onChange={(e) => {
              setBlockIndex(+e);
              setRoundIndex(0);
              setPicked(undefined);
            }}
          >
            {session.blocks.map((b, i) => (
              <option key={b.id} value={i}>
                ช่วง {i + 1} · {formatTime(b.startTime)}–
                {formatTime(b.rounds.at(-1)?.estimatedEnd)}
              </option>
            ))}
          </AppSelect>
        </label>
        <div className="toolbar">
          {!readOnly && (
            <button
              className="secondary"
              disabled={busy}
              onClick={() => {
                setCourtNames(normalizeCourtNames(block.courtNames));
                setNamingCourts(true);
              }}
            >
              แก้ไขชื่อสนาม
            </button>
          )}
          <button
            className={page === "schedule" ? "primary" : "secondary"}
            onClick={() => setPage("schedule")}
          >
            ตารางเล่น
          </button>
          {!readOnly && (
            <button
              className={editing ? "primary" : "secondary"}
              onClick={() => {
                setPage("adjust");
                setPicked(undefined);
              }}
            >
              ปรับคู่
            </button>
          )}
          <button
            className={page === "summary" ? "primary" : "secondary"}
            onClick={() => setPage("summary")}
          >
            สรุป
          </button>
          <button
            className={page === "share" ? "primary" : "secondary"}
            onClick={() => setPage("share")}
          >
            ส่งออก / แชร์
          </button>
        </div>
      </div>
      {!!block.warnings?.length && (
        <Alert
          className="app-feedback"
          type="warning"
          showIcon
          role="status"
          title={block.warnings.join(" · ")}
        />
      )}
      {page === "share" ? (
        <SharePreview session={session} block={block} profiles={app.players} />
      ) : page === "summary" ? (
        <SummaryPanel app={app} />
      ) : (
        <div className="schedule-layout">
          <section className="schedule-main">
            <section className="selected-round panel">
              <div className="panel-title">
                <div>
                  <h2>
                    รอบที่ {current.roundNumber}/
                    {block.rounds.at(-1)!.roundNumber}
                  </h2>
                  <small>
                    {formatTime(current.estimatedStart)}–
                    {formatTime(current.estimatedEnd)}
                  </small>
                </div>
                <div className="round-arrows">
                  <button
                    className="secondary"
                    aria-label="รอบก่อนหน้า"
                    disabled={roundIndex === 0 || busy}
                    onClick={() => {
                      setRoundIndex((i) => i - 1);
                      setPicked(undefined);
                    }}
                  >
                    ‹
                  </button>
                  <button
                    className="secondary"
                    aria-label="รอบถัดไป"
                    disabled={roundIndex === block.rounds.length - 1 || busy}
                    onClick={() => {
                      setRoundIndex((i) => i + 1);
                      setPicked(undefined);
                    }}
                  >
                    ›
                  </button>
                </div>
              </div>
              <div className="round-tabs" aria-label="เลือกรอบ">
                {block.rounds.map((r, i) => (
                  <button
                    key={r.roundNumber}
                    disabled={busy}
                    aria-pressed={roundIndex === i}
                    className={roundIndex === i ? "active" : ""}
                    onClick={() => {
                      setRoundIndex(i);
                      setPicked(undefined);
                    }}
                  >
                    รอบ {r.roundNumber}
                  </button>
                ))}
              </div>
              {editing && (
                <>
                  <p className="edit-instruction" role="status">
                    {picked
                      ? `เลือกคนที่สองเพื่อสลับกับ ${name(picked)}`
                      : "แตะผู้เล่นสองคนเพื่อสลับ หรือเลือกคนในสนามและคนพักเพื่อแทนกัน"}
                  </p>
                  <div className="toolbar edit-actions">
                    <button
                      className="secondary"
                      disabled={busy || !block.undoHistory?.length}
                      onClick={() => app.undo()}
                    >
                      ย้อนการแก้ไข
                    </button>
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() => app.reset(false)}
                    >
                      คืนค่ารอบนี้
                    </button>
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() => app.reset(true)}
                    >
                      คืนค่าทั้งตาราง
                    </button>
                    {picked && (
                      <button
                        className="text-button"
                        onClick={() => setPicked(undefined)}
                      >
                        ยกเลิกการเลือก
                      </button>
                    )}
                  </div>
                </>
              )}
              <PlayingStreakLegend />
              {cards}
            </section>
            <section className="panel full-schedule">
              <div className="panel-title">
                <h2>ตารางทั้งหมด {block.plannedRounds} รอบ</h2>
                <span className="badge">
                  {block.manuallyModified
                    ? "ปรับด้วยมือแล้ว"
                    : "บันทึกแล้วในเครื่อง"}
                </span>
              </div>
              <PlayingStreakLegend />
              <div className="schedule-table">
                <table>
                  <thead>
                    <tr>
                      <th>รอบ / เวลา</th>
                      {Array.from({ length: block.courtCount }, (_, i) => (
                        <th className={`heading-${i + 1}`} key={i}>
                          {courtName(block.courtNames, i + 1)}
                        </th>
                      ))}
                      <th className="heading-rest">พัก</th>
                    </tr>
                  </thead>
                  <tbody>
                    {block.rounds.map((r, i) => (
                      <tr
                        key={r.roundNumber}
                        className={roundIndex === i ? "current-row" : ""}
                      >
                        <th>
                          <button
                            className="round-link"
                            aria-label={`ดูรอบ ${r.roundNumber}`}
                            onClick={() => {
                              setRoundIndex(i);
                              setPicked(undefined);
                            }}
                          >
                            {r.roundNumber}
                          </button>
                          <small>
                            {formatTime(r.estimatedStart)}–
                            {formatTime(r.estimatedEnd)}
                          </small>
                        </th>
                        {Array.from(
                          { length: block.courtCount },
                          (_, court) => {
                            const m = r.matches.find(
                              (m) => m.court === court + 1,
                            );
                            return (
                              <td key={court}>
                                {m ? (
                                  <>
                                    {teamNames(m.teamA.playerIds, r)}
                                    <span className="table-vs">vs</span>
                                    {teamNames(m.teamB.playerIds, r)}
                                  </>
                                ) : (
                                  "ไม่ใช้สนาม"
                                )}
                              </td>
                            );
                          },
                        )}
                        <td>
                          {r.restingPlayerIds.map(name).join(", ") || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mobile-rounds">
                {block.rounds.map((r, i) => (
                  <article className="mobile-round" key={r.roundNumber}>
                    <h3>
                      <button
                        className="round-link"
                        onClick={() => {
                          setRoundIndex(i);
                          setPicked(undefined);
                          document
                            .querySelector(".selected-round")
                            ?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                        }}
                      >
                        รอบ {r.roundNumber}
                      </button>
                      <small>
                        {formatTime(r.estimatedStart)}–
                        {formatTime(r.estimatedEnd)}
                      </small>
                    </h3>
                    {r.matches.map((m) => (
                      <div
                        className={`mobile-match court-${m.court}`}
                        key={m.court}
                      >
                        <strong>{courtName(block.courtNames, m.court)}</strong>
                        <span>
                          {teamNames(m.teamA.playerIds, r)} <b>vs</b>{" "}
                          {teamNames(m.teamB.playerIds, r)}
                        </span>
                      </div>
                    ))}
                    <div className="mobile-match rest">
                      <strong>พัก</strong>
                      <span>
                        {r.restingPlayerIds.map(name).join(", ") || "ไม่มี"}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </section>
          <aside className="roster-panel panel">
            <div className="panel-title">
              <h2>ผู้เล่น ({session.playerIds.length})</h2>
              <span className="badge">
                คะแนน {Math.round(block.score.total)}
              </span>
            </div>
            <p className="muted">
              การเปลี่ยนสถานะและคู่ล็อกมีผลตั้งแต่รอบ {current.roundNumber}{" "}
              เป็นต้นไป และจัดรอบที่เหลือใหม่
            </p>
            {session.playerIds.map((id) => {
              const p = session.sessionPlayers[id],
                stats = projected.projectedPlayers.find(
                  (p) => p.playerId === id,
                );
              return (
                <div className="roster-row" key={id}>
                  <div className="roster-name">
                    <span className="avatar small" style={avatarStyle(id)}>
                      {name(id).slice(0, 1)}
                    </span>
                    <div>
                      <strong>{name(id)}</strong>
                      <small>
                        {session.playerProfiles?.[id]?.gender === "F"
                          ? "หญิง"
                          : "ชาย"}{" "}
                        · {stats?.totalGames ?? 0} เกม /{" "}
                        {stats?.eligibleRounds ?? 0} โอกาส
                      </small>
                    </div>
                  </div>
                  {!readOnly ? (
                    <div className="roster-controls">
                      <AppSelect
                        aria-label={`สถานะ ${name(id)}`}
                        value={p.status}
                        disabled={busy || p.status === "LEFT"}
                        onChange={(e) => app.status(id, e as typeof p.status)}
                      >
                        <option value="ACTIVE">พร้อมเล่น</option>
                        <option value="NOT_ARRIVED">ยังไม่ถึง</option>
                        <option value="PAUSED">พักเอง</option>
                        <option value="LEFT">ออกแล้ว</option>
                      </AppSelect>
                      <AppSelect
                        aria-label={`คู่ล็อก ${name(id)}`}
                        searchable={false}
                        value={p.fixedPartnerId ?? ""}
                        disabled={busy}
                        onChange={(e) => app.lock(id, e || undefined)}
                      >
                        <option value="">ไม่ล็อกคู่</option>
                        {session.playerIds
                          .filter((other) => other !== id)
                          .map((other) => (
                            <option key={other} value={other}>
                              {name(other)}
                            </option>
                          ))}
                      </AppSelect>
                    </div>
                  ) : (
                    <small>
                      {p.status === "ACTIVE"
                        ? "พร้อมเล่น"
                        : p.status === "LEFT"
                          ? "ออกแล้ว"
                          : p.status === "PAUSED"
                            ? "พักเอง"
                            : "ยังไม่ถึง"}
                    </small>
                  )}
                </div>
              );
            })}
            {!readOnly && (
              <>
                <hr />
                <label>
                  เพิ่มคนที่มาทีหลัง
                  <AppSelect
                    aria-label="ผู้เล่นที่มาทีหลัง"
                    value={lateId}
                    onChange={(e) => setLateId(e)}
                  >
                    <option value="">เลือกผู้เล่น</option>
                    {lateOptions.map((p) => (
                      <option value={p.id} key={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </AppSelect>
                </label>
                <button
                  className="secondary full-width"
                  disabled={busy || !lateId}
                  onClick={async () => {
                    await app.lateJoin(lateId);
                    setLateId("");
                  }}
                >
                  เพิ่มเข้ารอบที่เลือก
                </button>
                <button
                  className="text-button full-width"
                  onClick={() => app.openPlayer(null)}
                >
                  ＋ เพิ่มรายชื่อใหม่
                </button>
              </>
            )}
          </aside>
        </div>
      )}
      {!readOnly && (
        <section className="panel session-actions">
          <div className="panel-title">
            <h2>เล่นต่อ / จบเซสชัน</h2>
            {busy && <small role="status">กำลังบันทึกและจัดตาราง…</small>}
          </div>
          <div className="toolbar">
            <button
              className="secondary"
              disabled={busy}
              onClick={() => app.regenerate()}
            >
              จัดใหม่ตั้งแต่รอบที่เลือก
            </button>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => app.complete()}
            >
              จบเซสชัน
            </button>
          </div>
          <details>
            <summary>เพิ่มช่วงเล่นต่อ</summary>
            <div className="append-form">
              <label>
                ระยะเวลา
                <AppSelect
                  value={duration}
                  onChange={(e) => {
                    setDuration(+e);
                    setRounds(+e / 10);
                  }}
                >
                  <option value={60}>1 ชั่วโมง</option>
                  <option value={90}>1.5 ชั่วโมง</option>
                  <option value={120}>2 ชั่วโมง</option>
                </AppSelect>
              </label>
              <label>
                สนาม
                <AppSelect
                  value={courts}
                  onChange={(e) => setCourts(+e as 1 | 2)}
                >
                  <option value={1}>1 สนาม</option>
                  <option value={2}>2 สนาม</option>
                </AppSelect>
              </label>
              <label>
                รอบ
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={rounds}
                  onChange={(e) => setRounds(+e.target.value)}
                />
              </label>
              <button
                className="primary"
                disabled={busy || rounds < 1 || rounds > 30}
                onClick={() => app.appendBlock(duration, courts, rounds)}
              >
                เพิ่มช่วงเล่น
              </button>
            </div>
          </details>
        </section>
      )}
      <Modal
        title="แก้ไขชื่อสนาม"
        open={namingCourts}
        okText="บันทึกชื่อสนาม"
        cancelText="ยกเลิก"
        confirmLoading={busy}
        cancelButtonProps={{ disabled: busy }}
        closable={!busy}
        mask={{ closable: false }}
        onCancel={() => setNamingCourts(false)}
        onOk={async () => {
          if (await app.renameCourts(courtNames)) setNamingCourts(false);
        }}
      >
        <CourtNameFields
          courtCount={block.courtCount}
          names={courtNames}
          onChange={setCourtNames}
          disabled={busy}
        />
        <p className="muted">เว้นว่างเพื่อใช้ชื่อสนามเดิม เช่น สนาม 1</p>
      </Modal>
    </main>
  );
}
