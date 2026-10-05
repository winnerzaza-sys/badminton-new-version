import { ScheduleWorkspace } from "./features/schedule/ScheduleWorkspace";
import { History } from "./features/history/History";
import { Settings } from "./features/home/Settings";
import { useBadminton } from "./hooks/useBadminton";
const time = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("th-TH", {
        timeZone: "Asia/Bangkok",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(value))
    : "";
const date = (value: string) =>
  new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00+07:00`));
export function App() {
  const app = useBadminton();
  const {
    players,
    session,
    page,
    setPage,
    selected,
    setSelected,
    config,
    setConfig,
    loaded,
    error,
    setError,
    busy,
    roundIndex,
    setRoundIndex,
    editing,
    setEditing,
    playerName,
    setPlayerName,
    gender,
    setGender,
    online,
    active,
    unfinished,
    block,
    name,
    openPlayer,
    savePlayer,
    deactivate,
    reactivate,
    generate,
    resume,
    setField,
  } = app;
  const navigation = (
    <>
      {(
        [
          ["home", "⌂", "สร้างตาราง"],
          ["schedule", "▤", "ตารางเล่น"],
          ["adjust", "♢", "ปรับคู่"],
          ["summary", "▥", "สรุป"],
          ["history", "◷", "ประวัติ"],
          ["players", "♧", "ผู้เล่น"],
          ["settings", "⚙", "ตั้งค่า"],
        ] as const
      ).map(([id, icon, label]) => (
        <button
          key={id}
          className={page === id ? "nav-item selected" : "nav-item"}
          data-nav={id}
          aria-current={page === id ? "page" : undefined}
          onClick={() => setPage(id)}
        >
          <span aria-hidden="true">{icon}</span>
          {label}
        </button>
      ))}
    </>
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="shuttle">🏸</span>
          <div>
            <strong>แบดมินตัน</strong>
            <small>Pairing & Schedule</small>
          </div>
        </div>
        <nav aria-label="เมนูหลัก">{navigation}</nav>
        <div className="sidebar-context">
          <span className="status-dot" /> ข้อมูลอยู่ในเครื่อง
          <p>
            จัดตารางทั้งช่วงเวลา
            <br />
            พร้อมเล่นแม้ไม่มีอินเทอร์เน็ต
          </p>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="brand mobile-brand">
            <span className="shuttle">🏸</span>
            <div>
              <strong>แบดมินตัน</strong>
              <small>Pairing & Schedule</small>
            </div>
          </div>
          <div className="header-context">
            <strong>
              {date(
                page === "home" ? config.date : (session?.date ?? config.date),
              )}
            </strong>
            <small>
              {session && block
                ? `${time(block.startTime)} · ${block.durationMinutes} นาที`
                : "จัดคู่ให้ลงตัว เล่นให้สนุก"}
            </small>
          </div>
          <span className="connection">
            <span className={`status-dot ${online ? "" : "offline"}`} />
            {online ? "พร้อมใช้งาน" : "ออฟไลน์"}
          </span>
          <button
            className="mobile-settings secondary"
            aria-label="ตั้งค่า"
            onClick={() => setPage("settings")}
          >
            ⚙
          </button>
        </header>
        {error && editing === undefined && (
          <div className="error" role="alert">
            {error}
            <button aria-label="ปิดข้อความ" onClick={() => setError("")}>
              ×
            </button>
          </div>
        )}
        {app.notice && (
          <div className="notice" role="status">
            {app.notice}
          </div>
        )}
        {!loaded && !error && <p role="status">กำลังเปิดข้อมูลในเครื่อง…</p>}
        {loaded && page === "home" && (
          <main className="setup-layout">
            <section>
              <div className="page-title">
                <div>
                  <small className="eyebrow">LET’S PLAY</small>
                  <h1>สร้างตารางวันนี้</h1>
                  <p>เลือกเพื่อน ตั้งเวลา แล้วจัดครบทุกเกมในครั้งเดียว</p>
                </div>
                <img
                  className="courtside-illustration"
                  src="/courtside.svg"
                  alt=""
                  aria-hidden="true"
                />
              </div>
              {unfinished && (
                <article className="resume-card">
                  <div>
                    <strong>มีเซสชันที่ยังไม่จบ</strong>
                    <p>
                      {date(unfinished.date)} · {unfinished.playerIds.length} คน
                    </p>
                  </div>
                  <button
                    className="secondary"
                    onClick={() => resume(unfinished)}
                  >
                    เปิดเซสชันเดิม →
                  </button>
                </article>
              )}
              <form onSubmit={generate}>
                <section className="panel play-settings">
                  <div className="panel-title">
                    <h2>ตั้งค่าการเล่น</h2>
                    <span className="badge">
                      {config.durationMinutes / 60} ชั่วโมง
                    </span>
                  </div>
                  <div className="config-grid">
                    <label>
                      วันที่
                      <input
                        type="date"
                        required
                        value={config.date}
                        onChange={(e) => setField("date", e.target.value)}
                      />
                    </label>
                    <label>
                      เริ่มเล่น
                      <input
                        type="time"
                        required
                        value={config.startTime}
                        onChange={(e) => setField("startTime", e.target.value)}
                      />
                    </label>
                    <label>
                      ระยะเวลา
                      <select
                        value={config.durationMinutes}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            durationMinutes: +e.target.value,
                            plannedRounds: +e.target.value / 10,
                          }))
                        }
                      >
                        <option value={60}>1 ชั่วโมง</option>
                        <option value={90}>1.5 ชั่วโมง</option>
                        <option value={120}>2 ชั่วโมง</option>
                      </select>
                    </label>
                    <label>
                      สนาม
                      <select
                        value={config.courtCount}
                        onChange={(e) =>
                          setField("courtCount", +e.target.value as 1 | 2)
                        }
                      >
                        <option value={1}>1 สนาม</option>
                        <option value={2}>2 สนาม</option>
                      </select>
                    </label>
                    <label>
                      แต้ม / เกม
                      <input
                        type="number"
                        min={1}
                        max={99}
                        required
                        value={config.pointsPerGame}
                        onChange={(e) =>
                          setField("pointsPerGame", +e.target.value)
                        }
                      />
                    </label>
                    <label>
                      จำนวนรอบ
                      <input
                        type="number"
                        min={1}
                        max={30}
                        required
                        value={config.plannedRounds}
                        onChange={(e) =>
                          setField("plannedRounds", +e.target.value)
                        }
                      />
                    </label>
                  </div>
                </section>
                <section className="panel">
                  <div className="panel-title">
                    <h2>
                      ผู้เล่นวันนี้{" "}
                      <span className="count">{selected.length}</span>
                    </h2>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => openPlayer(null)}
                    >
                      ＋ เพิ่มผู้เล่น
                    </button>
                  </div>
                  <div className="selection-actions">
                    <button
                      type="button"
                      onClick={() => setSelected(active.map((p) => p.id))}
                    >
                      เลือกทั้งหมด
                    </button>
                    <button type="button" onClick={() => setSelected([])}>
                      ล้างการเลือก
                    </button>
                    <small>เริ่มจากรายชื่อที่เลือกล่าสุด</small>
                  </div>
                  {active.length ? (
                    <div className="player-selection">
                      {active.map((p) => (
                        <label
                          className={`player-option ${selected.includes(p.id) ? "checked" : ""}`}
                          key={p.id}
                        >
                          <input
                            type="checkbox"
                            checked={selected.includes(p.id)}
                            onChange={(e) =>
                              setSelected((prev) =>
                                e.target.checked
                                  ? [...prev, p.id]
                                  : prev.filter((id) => id !== p.id),
                              )
                            }
                          />
                          <span className="avatar small">
                            {p.name.slice(0, 1)}
                          </span>
                          <strong>{p.name}</strong>
                          <span className="gender">
                            {p.gender === "M" ? "ชาย" : "หญิง"}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="empty">
                      <span>🏸</span>
                      <h3>เริ่มจากเพื่อนร่วมสนาม</h3>
                      <p>เพิ่มรายชื่อผู้เล่นครั้งเดียว เก็บไว้ใช้ได้ทุกครั้ง</p>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => openPlayer(null)}
                      >
                        เพิ่มผู้เล่นคนแรก
                      </button>
                    </div>
                  )}
                </section>
                <div className="generate-footer">
                  <div>
                    <strong>
                      {selected.length} คน · {config.courtCount} สนาม ·{" "}
                      {config.plannedRounds} รอบ
                    </strong>
                    <small>ตารางทั้งช่วงเวลา ไม่ต้องกดจบทีละเกม</small>
                  </div>
                  <button
                    className="primary"
                    disabled={busy || selected.length < config.courtCount * 4}
                  >
                    {busy ? "กำลังจัดตาราง…" : "✧ สร้างตาราง"}
                  </button>
                </div>
              </form>
            </section>
            <aside className="setup-help panel">
              <span className="help-icon">🏸</span>
              <h2>พร้อมลงสนาม</h2>
              <p>
                เกมใกล้เคียงกัน
                <br />
                กระจายเวลาพัก
                <br />
                เปลี่ยนคู่ให้หลากหลาย
              </p>
              <hr />
              <h3>กฎการจัดคู่</h3>
              <p>
                ชายคู่ · คู่ผสม · หญิงคู่
                <br />
                คู่ผสมพบหญิงคู่ได้
              </p>
              <small>ไม่จัดชาย 3 หญิง 1 หรือชายคู่พบหญิงคู่</small>
              <div className="local-note">
                ◉ เก็บรายชื่อและตาราง
                <br />
                ไว้ในเครื่องของคุณ
              </div>
            </aside>
          </main>
        )}
        {loaded && page === "players" && (
          <main>
            <div className="page-title">
              <div>
                <small className="eyebrow">YOUR TEAM</small>
                <h1>รายชื่อผู้เล่น</h1>
                <p>รายชื่อจะอยู่ในเครื่องและพร้อมใช้ครั้งต่อไป</p>
              </div>
              <button className="primary" onClick={() => openPlayer(null)}>
                ＋ เพิ่มผู้เล่น
              </button>
            </div>
            <section className="panel directory">
              {players.length ? (
                players.map((p) => (
                  <article className="directory-row" key={p.id}>
                    <span className="avatar small">{p.name.slice(0, 1)}</span>
                    <div>
                      <strong>{p.name}</strong>
                      <small>
                        {p.gender === "M" ? "ชาย" : "หญิง"} ·{" "}
                        {p.active ? "ใช้งาน" : "ปิดใช้งาน"}
                      </small>
                    </div>
                    <button className="secondary" onClick={() => openPlayer(p)}>
                      แก้ไข
                    </button>
                    {p.active ? (
                      <button
                        className="text-button"
                        onClick={() => deactivate(p)}
                      >
                        ปิดใช้งาน
                      </button>
                    ) : (
                      <button
                        className="text-button"
                        onClick={() => reactivate(p)}
                      >
                        เปิดใช้งาน
                      </button>
                    )}
                  </article>
                ))
              ) : (
                <div className="empty">
                  <h2>ยังไม่มีรายชื่อผู้เล่น</h2>
                  <p>กดเพิ่มผู้เล่นเพื่อเริ่มต้น</p>
                </div>
              )}
            </section>
          </main>
        )}
        {loaded &&
          ["schedule", "adjust", "summary", "share"].includes(page) && (
            <ScheduleWorkspace app={app} />
          )}
        {loaded && page === "history" && <History app={app} />}
        {loaded && page === "settings" && <Settings app={app} />}
      </div>
      <nav className="bottom-nav" aria-label="เมนูมือถือ">
        {navigation}
      </nav>
      {editing !== undefined && (
        <div className="modal-backdrop">
          <section
            className="modal panel"
            role="dialog"
            onKeyDown={(event) => {
              if (event.key === "Escape") setEditing(undefined);
              if (event.key === "Tab") {
                const elements = Array.from(
                  event.currentTarget.querySelectorAll<HTMLElement>(
                    "button:not(:disabled),input,select",
                  ),
                );
                const first = elements[0],
                  last = elements.at(-1);
                if (event.shiftKey && document.activeElement === first) {
                  event.preventDefault();
                  last?.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                  event.preventDefault();
                  first?.focus();
                }
              }
            }}
            aria-modal="true"
            aria-labelledby="player-dialog-title"
          >
            <div className="panel-title">
              <h2 id="player-dialog-title">
                {editing ? "แก้ไขผู้เล่น" : "เพิ่มผู้เล่น"}
              </h2>
              <button
                className="secondary"
                aria-label="ปิด"
                onClick={() => setEditing(undefined)}
              >
                ×
              </button>
            </div>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            <form onSubmit={savePlayer}>
              <label>
                ชื่อผู้เล่น
                <input
                  autoFocus
                  required
                  maxLength={40}
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                />
              </label>
              <label>
                เพศ
                <select
                  aria-label="เพศ"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as "M" | "F")}
                >
                  <option value="M">ชาย</option>
                  <option value="F">หญิง</option>
                </select>
              </label>
              <button className="primary" disabled={busy || !playerName.trim()}>
                บันทึกผู้เล่น
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
