// Flaticon UIcons Regular Rounded, bundled locally for offline use.
export type IconName =
  | "calendar-days"
  | "history"
  | "users"
  | "chart-column"
  | "settings"
  | "plus"
  | "trash-2"
  | "check"
  | "chevron-left"
  | "chevron-right"
  | "triangle-alert"
  | "panel-left"
  | "info"
  | "shuttlecock"
  | "sparkles"
  | "badminton"
  | "coffee";
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <i
      className={`icon flaticon-icon flaticon-${name}`}
      style={{ width: size, height: size, fontSize: size }}
      aria-hidden="true"
    />
  );
}
