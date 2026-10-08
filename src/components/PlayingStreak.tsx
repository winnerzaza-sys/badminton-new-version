import { REPLAY_PATH } from "../utils/replay";

export function ReplayIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={REPLAY_PATH}
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlayingStreak({ count }: { count: number }) {
  if (count < 2) return null;
  return (
    <span
      className="playing-streak"
      role="img"
      aria-label={`เล่นติดกัน ${count} รอบ รวมรอบนี้`}
    >
      <ReplayIcon />
      {count}
    </span>
  );
}

export function PlayingStreakLegend() {
  return (
    <p className="playing-streak-legend">
      <PlayingStreak count={3} />
      <span>= เล่นติดกัน 3 รอบ รวมรอบนั้น · แสดงตั้งแต่ 2 รอบ</span>
    </p>
  );
}
