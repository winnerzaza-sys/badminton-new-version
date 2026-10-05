import { useEffect, useState } from "react";
import type { useBadminton } from "../../hooks/useBadminton";
import { downloadFile } from "../share/service";
export function Settings({ app }: { app: ReturnType<typeof useBadminton> }) {
  const [waiting, setWaiting] = useState<ServiceWorker>(),
    [message, setMessage] = useState("");
  useEffect(() => {
    let cancelled = false;
    const cleanup: Array<() => void> = [];
    const check = async () => {
      const registration = await navigator.serviceWorker?.getRegistration();
      if (!cancelled) setWaiting(registration?.waiting ?? undefined);
      if (registration && !cancelled) {
        const watch = () => {
          const installing = registration.installing;
          if (!installing) return;
          const changed = () => {
            if (installing.state === "installed")
              setTimeout(() => {
                if (!cancelled) setWaiting(registration.waiting ?? undefined);
              }, 0);
          };
          installing.addEventListener("statechange", changed);
          cleanup.push(() =>
            installing.removeEventListener("statechange", changed),
          );
        };
        registration.addEventListener("updatefound", watch);
        cleanup.push(() =>
          registration.removeEventListener("updatefound", watch),
        );
        watch();
      }
    };
    check();
    navigator.serviceWorker?.addEventListener("controllerchange", check);
    return () => {
      cancelled = true;
      navigator.serviceWorker?.removeEventListener("controllerchange", check);
      cleanup.forEach((remove) => remove());
    };
  }, []);
  return (
    <main>
      <div className="page-title">
        <div>
          <h1>ตั้งค่าและข้อมูลในเครื่อง</h1>
          <p>ใช้งานได้โดยไม่ต้องสมัครบัญชี</p>
        </div>
      </div>
      <section className="panel">
        <h2>ติดตั้งเป็นแอป</h2>
        <p className="muted">
          iPhone / iPad: เปิดด้วย Safari แล้วเลือกแชร์ → เพิ่มไปยังหน้าจอโฮม
          <br />
          Chrome: เลือกติดตั้งแอปจากเมนูของบราวเซอร์เมื่อมีตัวเลือก
        </p>
        <p className="muted">
          เปิดแอปออนไลน์ครั้งแรกและรอโหลดครบ จากนั้นรายชื่อ ตาราง ประวัติ
          และภาพแชร์ใช้งานออฟไลน์ได้
        </p>
      </section>
      <section className="panel">
        <h2>ข้อมูลของคุณ</h2>
        <p className="muted">
          {app.players.length} รายชื่อ · {app.sessions.length} เซสชัน ·
          ข้อมูลเก็บในบราวเซอร์เครื่องนี้
        </p>
        <div className="toolbar">
          <button
            className="secondary"
            onClick={() => {
              const blob = new Blob(
                [
                  JSON.stringify(
                    {
                      schemaVersion: 1,
                      players: app.players,
                      sessions: app.sessions,
                      setup: { selected: app.selected, config: app.config },
                    },
                    null,
                    2,
                  ),
                ],
                { type: "application/json" },
              );
              downloadFile(blob, "badminton-backup.json");
              setMessage("ดาวน์โหลดสำเนาข้อมูล JSON แล้ว");
            }}
          >
            ดาวน์โหลดสำเนาข้อมูล
          </button>
          {navigator.storage?.persist && (
            <button
              className="secondary"
              onClick={async () => {
                try {
                  setMessage(
                    (await navigator.storage.persist())
                      ? "บราวเซอร์อนุญาตให้เก็บข้อมูลถาวรแล้ว"
                      : "บราวเซอร์ยังใช้การเก็บข้อมูลแบบปกติ",
                  );
                } catch {
                  setMessage("อุปกรณ์นี้ไม่รองรับคำขอเก็บข้อมูลถาวร");
                }
              }}
            >
              ขอเก็บข้อมูลถาวร
            </button>
          )}
        </div>
        <p className="muted">
          การล้างข้อมูลเว็บไซต์จะลบข้อมูลในเครื่อง สำเนา JSON ใช้เก็บสำรองได้
          การนำเข้าข้อมูลยังไม่อยู่ในรุ่นนี้
        </p>
      </section>
      <section className="panel">
        <h2>เวอร์ชันแอป</h2>
        <div className="toolbar">
          <button
            className="secondary"
            disabled={!app.online}
            onClick={async () => {
              try {
                const registration =
                  await navigator.serviceWorker?.getRegistration();
                await registration?.update();
                setWaiting(registration?.waiting ?? undefined);
                setMessage(
                  registration?.waiting
                    ? "มีเวอร์ชันใหม่พร้อมใช้งาน"
                    : "ตรวจเวอร์ชันแล้ว หากมีอัปเดตปุ่มจะปรากฏเมื่อพร้อม",
                );
              } catch {
                setMessage(
                  "ตรวจอัปเดตไม่ได้ ลองอีกครั้งเมื่อเชื่อมต่ออินเทอร์เน็ต",
                );
              }
            }}
          >
            ตรวจอัปเดต
          </button>
          {waiting && (
            <button
              className="primary"
              disabled={app.busy}
              onClick={() => {
                navigator.serviceWorker.addEventListener(
                  "controllerchange",
                  () => window.location.reload(),
                  { once: true },
                );
                waiting.postMessage({ type: "SKIP_WAITING" });
              }}
            >
              เปิดเวอร์ชันใหม่
            </button>
          )}
        </div>
      </section>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
    </main>
  );
}
