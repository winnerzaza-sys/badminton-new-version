import type { useBadminton } from "../../hooks/useBadminton";
import { formatDate, formatTime } from "../../utils/format";
import { projectBlock } from "../schedule/service";
export function History({ app }: { app: ReturnType<typeof useBadminton> }) {
  return (
    <main>
      <div className="page-title">
        <div>
          <h1>ประวัติการเล่น</h1>
          <p>ตารางที่เก็บในเครื่อง · เปิดดูหรือเล่นต่อได้</p>
        </div>
      </div>
      <div className="history-grid">
        {app.sessions.length ? (
          app.sessions.map((session) => {
            const last = session.blocks.at(-1),
              stats = last ? projectBlock(session, last).projectedPlayers : [];
            return (
              <article className="panel history-card" key={session.id}>
                <div className="panel-title">
                  <h2>{formatDate(session.date)}</h2>
                  <span className="badge">
                    {session.status === "COMPLETED" ? "จบแล้ว" : "ยังไม่จบ"}
                  </span>
                </div>
                <p>
                  {session.playerIds.length} คน · {session.blocks.length} ช่วง ·{" "}
                  {session.blocks.reduce((s, b) => s + b.rounds.length, 0)} รอบ
                </p>
                {last && (
                  <small>
                    {formatTime(session.blocks[0].startTime)}–
                    {formatTime(last.rounds.at(-1)?.estimatedEnd)}
                  </small>
                )}
                <div className="history-roster">
                  {stats.map((p) => (
                    <span key={p.playerId}>
                      {session.playerProfiles?.[p.playerId]?.name ??
                        app.players.find((x) => x.id === p.playerId)?.name}{" "}
                      <b>{p.totalGames}</b>
                    </span>
                  ))}
                </div>
                <button
                  className="secondary"
                  onClick={() => app.resume(session)}
                >
                  {session.status === "COMPLETED"
                    ? "ดูตารางและแชร์"
                    : "เล่นต่อ"}{" "}
                  →
                </button>
              </article>
            );
          })
        ) : (
          <section className="panel empty">
            <h2>ยังไม่มีประวัติ</h2>
            <p>สร้างเซสชันแรกได้จากหน้าสร้างตาราง</p>
          </section>
        )}
      </div>
    </main>
  );
}
