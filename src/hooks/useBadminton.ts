import { App as AntApp } from "antd";
import { useEffect, useState } from "react";
import { hydrateSession } from "../features/session/hydrate";
import type {
  PlayerProfile,
  Session,
  SessionPlayerStatus,
  ScheduleBlock,
} from "../domain/models";
import {
  projectBlock,
  archiveSession,
  sessionProfiles,
  swapPlayers,
  undoEdit,
  resetGenerated,
  regenerateRemaining,
  changeAvailability,
  addLatePlayer,
  setFixedPair,
} from "../features/schedule/service";
import { repo } from "../data/repositories";
import {
  createSession,
  defaultConfig,
  generateBlock,
  previousRoster,
  type SessionConfig,
} from "../features/session/service";
type Page =
  | "home"
  | "schedule"
  | "players"
  | "adjust"
  | "summary"
  | "history"
  | "share"
  | "settings";
export function useBadminton() {
  const { modal, message } = AntApp.useApp();
  const confirm = async (content: string) =>
    await modal.confirm({
      title: "ยืนยันการเปลี่ยนแปลง",
      content,
      okText: "ยืนยัน",
      cancelText: "ยกเลิก",
      autoFocusButton: "cancel",
      mask: { closable: false },
    });
  const [players, setPlayers] = useState<PlayerProfile[]>([]),
    [sessions, setSessions] = useState<Session[]>([]),
    [session, setSession] = useState<Session>(),
    [page, setPage] = useState<Page>("home");
  const [selected, setSelected] = useState<string[]>([]),
    [config, setConfig] = useState<SessionConfig>(defaultConfig),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [roundIndex, setRoundIndex] = useState(0);
  const [blockIndex, setBlockIndex] = useState(0),
    [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<PlayerProfile | null | undefined>(),
    [playerName, setPlayerName] = useState(""),
    [gender, setGender] = useState<"M" | "F">("M");
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const change = () => setOnline(navigator.onLine);
    window.addEventListener("online", change);
    window.addEventListener("offline", change);
    return () => {
      window.removeEventListener("online", change);
      window.removeEventListener("offline", change);
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      repo.players.list(),
      repo.sessions.list(),
      repo.settings.get("setupDraft"),
    ])
      .then(([ps, ss, draft]) => {
        if (cancelled) return;
        setPlayers(ps);
        setSessions(ss.map((s) => hydrateSession(s, ps)));
        const saved = draft as
          { selected: string[]; config: SessionConfig } | undefined;
        setSelected(
          saved?.selected.filter((id) =>
            ps.some((p) => p.id === id && p.active),
          ) ?? previousRoster(ss, ps),
        );
        if (saved?.config) setConfig(saved.config);
        setLoaded(true);
      })
      .catch(() =>
        setError(
          "เปิดข้อมูลในเครื่องไม่ได้ โปรดตรวจสอบว่าบราวเซอร์อนุญาตให้เก็บข้อมูล",
        ),
      );
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (loaded)
      repo.settings
        .set("setupDraft", { selected, config })
        .catch(() =>
          setError("บันทึกแบบร่างไม่ได้ โปรดตรวจสอบพื้นที่ในเครื่อง"),
        );
  }, [selected, config, loaded]);
  const active = players.filter((p) => p.active),
    unfinished = sessions.find((s) => s.status !== "COMPLETED"),
    block = session?.blocks[blockIndex];
  const name = (id: string) =>
    (page !== "home" && page !== "players"
      ? session?.playerProfiles?.[id]?.name
      : undefined) ??
    players.find((p) => p.id === id)?.name ??
    "ไม่พบผู้เล่น";
  function openPlayer(player: PlayerProfile | null) {
    setError("");
    setEditing(player);
    setPlayerName(player?.name ?? "");
    setGender(player?.gender ?? "M");
  }
  async function savePlayer(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = playerName.trim();
    if (!trimmed) return;
    setBusy(true);
    setError("");
    try {
      const now = new Date().toISOString(),
        profile: PlayerProfile = {
          id: editing?.id ?? crypto.randomUUID(),
          name: trimmed,
          gender,
          active: editing?.active ?? true,
          createdAt: editing?.createdAt ?? now,
          updatedAt: now,
        };
      await repo.players.save(profile);
      setPlayers(await repo.players.list());
      if (!editing) {
        const nextSelection = [...selected, profile.id];
        await repo.settings.set("setupDraft", {
          selected: nextSelection,
          config,
        });
        setSelected(nextSelection);
      }
      setEditing(undefined);
      void message.success("บันทึกรายชื่อเรียบร้อย");
    } catch {
      setError("บันทึกผู้เล่นไม่ได้ กรุณาลองอีกครั้ง");
    } finally {
      setBusy(false);
    }
  }
  async function deactivate(player: PlayerProfile) {
    if (
      !(await confirm(
        `ปิดใช้งาน ${player.name}? ข้อมูลในเซสชันเดิมจะยังเก็บไว้`,
      ))
    )
      return;
    try {
      await repo.players.deactivate(player.id);
      setPlayers(await repo.players.list());
      setSelected((prev) => prev.filter((id) => id !== player.id));
    } catch {
      setError("บันทึกการเปลี่ยนแปลงไม่ได้");
    }
  }
  async function generate(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError("");
    // Yield so the busy state is painted before the bounded domain search starts.
    await new Promise((resolve) => setTimeout(resolve, 30));
    try {
      const next = createSession(selected, config);
      next.playerProfiles = Object.fromEntries(
        players
          .filter((p) => selected.includes(p.id))
          .map((p) => [p.id, structuredClone(p)]),
      );
      const generated = generateBlock(
        next,
        players,
        config,
        crypto.getRandomValues(new Uint32Array(1))[0],
      );
      next.blocks = [generated];
      next.status = "ACTIVE";
      await repo.sessions.save(next);
      setSession(next);
      setSessions(await repo.sessions.list());
      setRoundIndex(0);
      setBlockIndex(0);
      setPage("schedule");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "สร้างตารางไม่ได้ กรุณาลองอีกครั้ง",
      );
    } finally {
      setBusy(false);
    }
  }
  function resume(value: Session) {
    setSession(value);
    setRoundIndex(0);
    setBlockIndex(Math.max(0, value.blocks.length - 1));
    setNotice("");
    setError("");
    setPage(value.blocks.length ? "schedule" : "home");
  }
  function setField<K extends keyof SessionConfig>(
    key: K,
    value: SessionConfig[K],
  ) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }
  async function reactivate(player: PlayerProfile) {
    try {
      await repo.players.save({
        ...player,
        active: true,
        updatedAt: new Date().toISOString(),
      });
      setPlayers(await repo.players.list());
    } catch {
      setError("บันทึกการเปลี่ยนแปลงไม่ได้");
    }
  }
  const seed = () => crypto.getRandomValues(new Uint32Array(1))[0];
  async function persistSession(next: Session) {
    for (let i = blockIndex + 1; i < next.blocks.length; i++) {
      const prior = projectBlock(next, next.blocks[i - 1]).projectedPlayers;
      const existing =
        next.blocks[i].baselinePlayers ?? Object.values(next.sessionPlayers);
      next.blocks[i].baselinePlayers = existing.map((p) => ({
        ...p,
        ...prior.find((x) => x.playerId === p.playerId),
        status: p.status,
        joinedAtRound: p.joinedAtRound,
        leftAtRound: p.leftAtRound,
        fixedPartnerId: p.fixedPartnerId,
      }));
      next.blocks[i].score = projectBlock(next, next.blocks[i]).score;
    }
    next.updatedAt = new Date().toISOString();
    await repo.sessions.save(next);
    setSession(next);
    setSessions(
      (await repo.sessions.list()).map((s) => hydrateSession(s, players)),
    );
  }
  async function mutate(action: (source: Session) => Session, success: string) {
    if (!session || busy) return;
    if (session.status === "COMPLETED") {
      setError("เซสชันนี้จบแล้ว เปิดดูได้อย่างเดียว");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    await new Promise((resolve) => setTimeout(resolve, 30));
    try {
      await persistSession(action(structuredClone(session)));
      setNotice(success);
      return true;
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "บันทึกการเปลี่ยนแปลงไม่ได้",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  function changeBlock(
    action: (source: Session, current: ScheduleBlock) => ScheduleBlock,
    success: string,
  ) {
    return mutate((next) => {
      next.blocks[blockIndex] = action(next, next.blocks[blockIndex]);
      return next;
    }, success);
  }
  async function swap(a: string, b: string) {
    if (!session || !block || busy) return;
    try {
      const proposal = swapPlayers(session, block, players, roundIndex, a, b),
        delta = proposal.score.total - block.score.total;
      if (
        delta < -0.05 &&
        !(await confirm(
          `คะแนนตารางเปลี่ยน ${delta.toFixed(1)} คะแนน จาก ${block.score.total.toFixed(1)} เป็น ${proposal.score.total.toFixed(1)} ยืนยันการสลับ?`,
        ))
      )
        return;
      await changeBlock(
        () => proposal,
        `สลับผู้เล่นแล้ว · คะแนน ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}`,
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "ไม่สามารถสลับผู้เล่นได้",
      );
    }
  }
  const undo = () =>
    changeBlock((s, b) => undoEdit(s, b, players), "ย้อนการแก้ไขแล้ว");
  async function reset(all: boolean) {
    if (
      !(await confirm(
        all
          ? "คืนค่าตารางทั้งช่วงเป็นฉบับที่จัดไว้?"
          : "คืนค่ารอบที่เลือกเป็นฉบับที่จัดไว้?",
      ))
    )
      return;
    return changeBlock(
      (s, b) => resetGenerated(s, b, players, all ? undefined : roundIndex),
      "คืนค่าตารางแล้ว",
    );
  }
  async function regenerate() {
    if (
      !(await confirm(
        `จัดใหม่ตั้งแต่รอบ ${block?.rounds[roundIndex].roundNumber} เป็นต้นไป? รอบก่อนหน้าจะคงเดิม`,
      ))
    )
      return;
    return changeBlock(
      (s, b) => regenerateRemaining(s, b, players, roundIndex, seed()),
      "จัดตารางรอบที่เหลือใหม่แล้ว",
    );
  }
  const status = async (id: string, value: SessionPlayerStatus) => {
    if (
      value === "LEFT" &&
      !(await confirm(
        `${name(id)} ออกจากเซสชันตั้งแต่รอบ ${block?.rounds[roundIndex].roundNumber}? จะไม่ถูกจัดในรอบที่เหลือ`,
      ))
    )
      return;
    return mutate(
      (s) =>
        changeAvailability(
          s,
          players,
          blockIndex,
          roundIndex,
          id,
          value,
          seed(),
        ),
      "ปรับสถานะและจัดรอบที่เหลือใหม่แล้ว",
    );
  };
  const lateJoin = (id: string) =>
    mutate(
      (s) => addLatePlayer(s, players, blockIndex, roundIndex, id, seed()),
      "เพิ่มผู้เล่นตั้งแต่รอบที่เลือกแล้ว",
    );
  const lock = (id: string, partner: string | undefined) =>
    mutate(
      (s) =>
        setFixedPair(s, players, blockIndex, roundIndex, id, partner, seed()),
      partner ? "ล็อกคู่และจัดรอบที่เหลือใหม่แล้ว" : "ปลดล็อกคู่แล้ว",
    );
  async function complete() {
    if (
      !(await confirm(
        "จบเซสชันและเก็บในประวัติ? ตารางนี้จะเปิดดูได้อย่างเดียว",
      ))
    )
      return;
    await mutate((s) => archiveSession(s), "เก็บเซสชันในประวัติแล้ว");
  }
  async function appendBlock(duration: number, courts: 1 | 2, rounds: number) {
    if (!session || !block) return;
    const last = session.blocks.at(-1)!,
      end = last.rounds.at(-1)?.estimatedEnd ?? last.startTime,
      startRound = last.rounds.at(-1)!.roundNumber + 1;
    const saved = await mutate((s) => {
      const projected = projectBlock(s, last).projectedPlayers;
      const current = Object.fromEntries(
        projected.map((p) => [
          p.playerId,
          {
            ...p,
            status: s.sessionPlayers[p.playerId].status,
            fixedPartnerId: s.sessionPlayers[p.playerId].fixedPartnerId,
            joinedAtRound: s.sessionPlayers[p.playerId].joinedAtRound,
            leftAtRound: s.sessionPlayers[p.playerId].leftAtRound,
          },
        ]),
      );
      const startTime = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Bangkok",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(end));
      const blockDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(end));
      const generated = generateBlock(
        { ...s, sessionPlayers: current },
        sessionProfiles(s, players),
        {
          date: blockDate,
          startTime,
          durationMinutes: duration,
          courtCount: courts,
          pointsPerGame: last.pointsPerGame,
          plannedRounds: rounds,
        },
        seed(),
        startRound,
      );
      s.blocks.push(generated);
      s.sessionPlayers = current;
      return s;
    }, "เพิ่มช่วงเล่นต่อแล้ว");
    if (saved) {
      setBlockIndex(session.blocks.length);
      setRoundIndex(0);
    }
  }
  function newSetup() {
    setSelected(previousRoster(sessions, players));
    setConfig((value) => ({ ...value, date: defaultConfig().date }));
    setPage("home");
    setNotice("");
    setError("");
  }
  return {
    newSetup,
    sessions,
    blockIndex,
    setBlockIndex,
    notice,
    setNotice,
    swap,
    undo,
    reset,
    regenerate,
    status,
    lateJoin,
    lock,
    complete,
    appendBlock,
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
  };
}
