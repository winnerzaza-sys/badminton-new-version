import { useEffect, useState } from "react";
import { Alert } from "antd";
import type {
  Session,
  ScheduleBlock,
  PlayerProfile,
} from "../../domain/models";
import { createShareImage, downloadFile, shareImage } from "./service";
export function SharePreview({
  session,
  block,
  profiles,
}: {
  session: Session;
  block: ScheduleBlock;
  profiles: PlayerProfile[];
}) {
  const [result, setResult] =
      useState<Awaited<ReturnType<typeof createShareImage>>>(),
    [url, setUrl] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    let cancelled = false,
      objectUrl = "";
    setResult(undefined);
    setUrl("");
    createShareImage(session, block, profiles)
      .then((image) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(image.blob);
        setResult(image);
        setUrl(objectUrl);
      })
      .catch((error) => {
        if (!cancelled) setMessage(error.message);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [session, block, profiles]);
  return (
    <section className="panel share-preview">
      <div className="panel-title">
        <div>
          <h2>ภาพสำหรับส่งให้เพื่อน</h2>
          <small>ภาพเดียวกันทุกขนาดหน้าจอ · รวมทุกรอบ</small>
        </div>
      </div>
      <div className="toolbar">
        <button
          className="primary"
          disabled={!result}
          onClick={async () => {
            try {
              const action = await shareImage(result!.file);
              setMessage(
                action === "downloaded"
                  ? "ดาวน์โหลดภาพแล้ว เปิด LINE แล้วเลือกส่งภาพนี้ได้"
                  : action === "shared"
                    ? "ส่งภาพผ่านเมนูแชร์แล้ว"
                    : "ยกเลิกการแชร์แล้ว",
              );
            } catch {
              setMessage("แชร์ไม่สำเร็จ กรุณาใช้ปุ่มบันทึก PNG");
            }
          }}
        >
          แชร์ภาพ / เลือก LINE
        </button>
        <button
          className="secondary"
          disabled={!result}
          onClick={() => downloadFile(result!.blob, result!.file.name)}
        >
          บันทึก PNG
        </button>
      </div>
      <p className="muted">
        เลือก LINE ในเมนูแชร์ของอุปกรณ์ หากไม่รองรับจะดาวน์โหลดภาพแทน
      </p>
      {message && (
        <Alert
          role="status"
          className="app-feedback"
          type="info"
          showIcon
          title={message}
        />
      )}
      {url ? (
        <>
          <img
            className="export-image"
            src={url}
            alt={`ตารางแบดมินตัน ${block.plannedRounds} รอบ พร้อมสนามและผู้พัก`}
            width={result?.width}
            height={result?.height}
          />
          <small>
            {result?.width} × {result?.height} px
          </small>
        </>
      ) : (
        <p role="status">กำลังสร้างภาพ…</p>
      )}
    </section>
  );
}
