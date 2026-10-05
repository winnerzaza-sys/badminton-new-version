import { Alert, Button, Form, Input, Modal } from "antd";
import { PlaySettings } from "./features/session/PlaySettings";
import { AppSelect } from "./components/AppSelect";
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
          <Alert
            className="app-feedback"
            type="error"
            title={error}
            role="alert"
            showIcon
            closable={{ closeIcon: <span aria-label="ปิดข้อความ">×</span> }}
            onClose={() => setError("")}
          />
        )}
        {app.notice && (
          <Alert
            className="app-feedback"
            type="success"
            title={app.notice}
            role="status"
            showIcon
          />
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
              <PlaySettings
                config={config}
                setConfig={setConfig}
                generate={generate}
                busy={busy}
                selectedCount={selected.length}
              >
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
              </PlaySettings>
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
      <Modal
        open={editing !== undefined}
        title={
          <h2 id="player-dialog-title">
            {editing ? "แก้ไขผู้เล่น" : "เพิ่มผู้เล่น"}
          </h2>
        }
        footer={null}
        onCancel={() => setEditing(undefined)}
        destroyOnHidden
        closable={{ "aria-label": "ปิด" }}
        mask={{ closable: false }}
        width={440}
      >
        {error && <Alert type="error" title={error} showIcon role="alert" />}
        {editing !== undefined && (
          <Form
            key={editing?.id ?? "new"}
            layout="vertical"
            initialValues={{ name: playerName, gender }}
            onFinish={() => savePlayer()}
          >
            <Form.Item
              label="ชื่อผู้เล่น"
              name="name"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: "กรุณาระบุชื่อผู้เล่น",
                },
              ]}
            >
              <Input
                autoFocus
                maxLength={40}
                aria-label="ชื่อผู้เล่น"
                onChange={(e) => setPlayerName(e.target.value)}
              />
            </Form.Item>
            <Form.Item
              label="เพศ"
              name="gender"
              rules={[{ required: true, message: "กรุณาเลือกเพศ" }]}
            >
              <AppSelect
                value={gender}
                aria-label="เพศ"
                onChange={(value) => setGender(value as "M" | "F")}
              >
                <option value="M">ชาย</option>
                <option value="F">หญิง</option>
              </AppSelect>
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={busy}>
              บันทึกผู้เล่น
            </Button>
          </Form>
        )}
      </Modal>
    </div>
  );
}
