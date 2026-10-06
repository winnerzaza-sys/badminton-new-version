import { Modal } from "antd";
import { useEffect } from "react";
import type { Session } from "../../domain/models";
import type { useBadminton } from "../../hooks/useBadminton";
import { Icon } from "../../components/Icon";
import { avatarStyle } from "../../utils/avatar";
import { formatDate, formatTime } from "../../utils/format";
type Controller = ReturnType<typeof useBadminton>;
const bangkok = (options: Intl.DateTimeFormatOptions, value: string) =>
  new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", ...options })
    .format(new Date(`${value}T12:00:00+07:00`));
const today = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(
    new Date(),
  );
const filters = [
  ["all", "ทั้งหมด"],
  ["open", "ยังไม่จบ"],
  ["done", "จบแล้ว"],
] as const;
function details(session: Session, players: Controller["players"]) {
  const first = session.blocks[0],
    last = session.blocks.at(-1);
  const name = (id: string) =>
    session.playerProfiles?.[id]?.name ??
    players.find((p) => p.id === id)?.name ??
    "?";
  const status =
    session.status === "COMPLETED"
      ? { key: "done", label: "จบแล้ว" }
      : session.status === "ACTIVE" && session.date === today()
        ? { key: "live", label: "กำลังเล่น" }
        : { key: "open", label: "ยังไม่จบ" };
  return {
    date: `${bangkok({ weekday: "narrow" }, session.date).replace(/\.?$/, ".")} ${formatDate(session.date)}`,
    day: bangkok({ day: "numeric" }, session.date),
    month: bangkok({ month: "short" }, session.date),
    time:
      first && last
        ? `${formatTime(first.startTime)} – ${formatTime(last.rounds.at(-1)?.estimatedEnd)}`
        : "ยังไม่มีตาราง",
    courts: Math.max(0, ...session.blocks.map((b) => b.courtCount)),
    rounds: session.blocks.reduce((sum, b) => sum + b.rounds.length, 0),
    players: session.playerIds.length,
    avatars: session.playerIds
      .slice(0, 4)
      .map((id) => ({ id, initial: name(id).slice(0, 1) })),
    status,
  };
}
type Details = ReturnType<typeof details>;
function Avatars({ info }: { info: Details }) {
  return (
    <span className="avatar-stack">
      {info.avatars.map((a) => (
        <span className="avatar mini" key={a.id} style={avatarStyle(a.id)}>
          {a.initial}
        </span>
      ))}
    </span>
  );
}
function Check({ checked }: { checked: boolean }) {
  return (
    <span className={`select-check ${checked ? "checked" : ""}`}>
      {checked && <Icon name="check" size={16} />}
    </span>
  );
}
export function History({ app }: { app: Controller }) {
  const {
    sessions,
    selectMode,
    setSelectMode,
    selectedSessionIds: picked,
    setSelectedSessionIds: setPicked,
    sessionFilter,
    setSessionFilter,
    pendingDelete,
    setPendingDelete,
    requestDelete,
    deleteSessions,
  } = app;
  useEffect(
    () => () => {
      setSelectMode(false);
      setPicked([]);
    },
    [setSelectMode, setPicked],
  );
  const visible = sessions.filter((s) =>
    sessionFilter === "all"
      ? true
      : sessionFilter === "done"
        ? s.status === "COMPLETED"
        : s.status !== "COMPLETED",
  );
  const allPicked =
    visible.length > 0 && visible.every((s) => picked.includes(s.id));
  const toggle = (id: string) =>
    setPicked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const toggleAll = () => setPicked(allPicked ? [] : visible.map((s) => s.id));
  const single =
    pendingDelete?.ids.length === 1
      ? sessions.find((s) => s.id === pendingDelete.ids[0])
      : undefined;
  const singleInfo = single && details(single, app.players);
  return (
    <main className="sessions-page">
      <div className="page-title sessions-title">
        <div>
          <h1>Session</h1>
          <p>{sessions.length} รายการ · เก็บไว้ในเครื่องนี้</p>
        </div>
        <div className="sessions-tools">
          <div className="segmented" role="group" aria-label="กรอง Session">
            {filters.map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={sessionFilter === id ? "selected" : ""}
                aria-pressed={sessionFilter === id}
                onClick={() => setSessionFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {sessions.length > 0 && (
            <button
              type="button"
              className="secondary select-toggle"
              aria-pressed={selectMode}
              onClick={() => {
                setSelectMode(!selectMode);
                setPicked([]);
              }}
            >
              {selectMode ? "เสร็จ" : "เลือก"}
            </button>
          )}
        </div>
      </div>
      {visible.length ? (
        <>
          <div
            className={`session-list ${selectMode ? "selecting" : ""}`}
            role="list"
          >
            {visible.map((session) => {
              const info = details(session, app.players),
                checked = picked.includes(session.id);
              return (
                <article
                  role="listitem"
                  className={`session-card ${checked ? "checked" : ""}`}
                  key={session.id}
                >
                  <button
                    type="button"
                    className="session-open"
                    aria-label={
                      selectMode
                        ? `เลือก Session ${info.date}`
                        : `เปิด Session ${info.date}`
                    }
                    aria-pressed={selectMode ? checked : undefined}
                    onClick={() =>
                      selectMode ? toggle(session.id) : app.resume(session)
                    }
                  >
                    {selectMode && <Check checked={checked} />}
                    <span className="date-tile">
                      <strong>{info.day}</strong>
                      <small>{info.month}</small>
                    </span>
                    <span className="session-info">
                      <span className="session-heading">
                        <strong>{info.date}</strong>
                        <span className={`status-badge ${info.status.key}`}>
                          {info.status.label}
                        </span>
                      </span>
                      <span className="session-meta">
                        {info.time} · {info.players} คน · {info.courts} สนาม ·{" "}
                        {info.rounds} รอบ
                      </span>
                      <span className="session-people">
                        <Avatars info={info} />
                        {info.players > 4 && <small>+{info.players - 4}</small>}
                      </span>
                    </span>
                  </button>
                  {!selectMode && (
                    <button
                      type="button"
                      className="delete-button"
                      aria-label={`ลบ Session ${info.date}`}
                      onClick={() => requestDelete([session.id])}
                    >
                      <Icon name="trash-2" />
                    </button>
                  )}
                </article>
              );
            })}
          </div>
          <div className="panel session-table" role="table">
            <div className="session-row session-head" role="row">
              <span role="columnheader">
                <button
                  type="button"
                  className="check-button"
                  aria-label={allPicked ? "ไม่เลือกทั้งหมด" : "เลือกทั้งหมด"}
                  aria-pressed={allPicked}
                  onClick={toggleAll}
                >
                  <Check checked={allPicked} />
                </button>
              </span>
              {["วันที่", "เวลา", "ผู้เล่น", "สนาม", "รอบ", "สถานะ"].map(
                (h) => (
                  <span role="columnheader" key={h}>
                    {h}
                  </span>
                ),
              )}
              <span role="columnheader" aria-label="การทำงาน" />
            </div>
            {visible.map((session) => {
              const info = details(session, app.players),
                checked = picked.includes(session.id);
              return (
                <div
                  role="row"
                  className={`session-row ${checked ? "checked" : ""}`}
                  key={session.id}
                >
                  <span role="cell">
                    <button
                      type="button"
                      className="check-button"
                      aria-label={`เลือก Session ${info.date}`}
                      aria-pressed={checked}
                      onClick={() => toggle(session.id)}
                    >
                      <Check checked={checked} />
                    </button>
                  </span>
                  <span role="cell" className="session-date">
                    <span className="date-tile">
                      <strong>{info.day}</strong>
                      <small>{info.month}</small>
                    </span>
                    <strong>{info.date}</strong>
                  </span>
                  <span role="cell">{info.time}</span>
                  <span role="cell" className="session-people">
                    <Avatars info={info} />
                    {info.players} คน
                  </span>
                  <span role="cell">{info.courts}</span>
                  <span role="cell">{info.rounds}</span>
                  <span role="cell">
                    <span className={`status-badge ${info.status.key}`}>
                      {info.status.label}
                    </span>
                  </span>
                  <span role="cell" className="row-actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => app.resume(session)}
                    >
                      เปิด
                    </button>
                    <button
                      type="button"
                      className="delete-button"
                      aria-label={`ลบ Session ${info.date}`}
                      onClick={() => requestDelete([session.id])}
                    >
                      <Icon name="trash-2" />
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <section className="panel empty">
          <h2>ไม่มี Session</h2>
          <p>สร้าง Session แรกได้จากปุ่มสร้างตารางใหม่</p>
        </section>
      )}
      {(selectMode || picked.length > 0) && (
        <div
          className={`glass-bar select-bar ${selectMode ? "" : "desktop-only"}`}
          role="toolbar"
          aria-label="จัดการ Session ที่เลือก"
        >
          <button type="button" className="text-button" onClick={toggleAll}>
            {allPicked ? "ไม่เลือกทั้งหมด" : "เลือกทั้งหมด"}
          </button>
          <span role="status">เลือกแล้ว {picked.length} รายการ</span>
          {!selectMode && (
            <button
              type="button"
              className="text-button"
              onClick={() => setPicked([])}
            >
              ยกเลิกการเลือก
            </button>
          )}
          <button
            type="button"
            className="danger"
            disabled={!picked.length}
            onClick={() => requestDelete(picked)}
          >
            <Icon name="trash-2" size={18} /> ลบ ({picked.length})
          </button>
        </div>
      )}
      <Modal
        open={!!pendingDelete}
        rootClassName="glass-confirm"
        centered
        width={420}
        footer={null}
        closable={false}
        mask={{ closable: true }}
        onCancel={() => setPendingDelete(null)}
        title={null}
        aria-labelledby="delete-title"
      >
        {pendingDelete && (
          <div className="confirm-body">
            <span className="confirm-icon">
              <Icon name="trash-2" size={26} />
            </span>
            <h2 id="delete-title">
              {singleInfo
                ? `ลบ Session ${singleInfo.date}?`
                : `ลบ ${pendingDelete.ids.length} Session?`}
            </h2>
            <p>
              {singleInfo
                ? `ตาราง ${singleInfo.rounds} รอบ และสถิติของผู้เล่น ${singleInfo.players} คนใน Session นี้จะถูกลบออกจากเครื่อง`
                : "ตารางและสถิติทั้งหมดของ Session ที่เลือกจะถูกลบออกจากเครื่อง"}
            </p>
            {pendingDelete.hasActive && (
              <p className="confirm-warning">
                <Icon name="triangle-alert" size={18} />
                มี Session ที่กำลังเล่นอยู่ ตารางที่ยังไม่จบจะหายไปด้วย
              </p>
            )}
            <div className="confirm-actions">
              <button
                type="button"
                className="secondary"
                autoFocus
                onClick={() => setPendingDelete(null)}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => deleteSessions(pendingDelete.ids)}
              >
                {pendingDelete.ids.length === 1
                  ? "ลบ Session"
                  : `ลบ ${pendingDelete.ids.length} รายการ`}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}
