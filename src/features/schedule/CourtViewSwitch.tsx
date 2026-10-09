import { Select } from "antd";

// One mutually exclusive control for how the current round's courts render.
// Replaces separate "3D" / "WebGL" toggles that could both be on at once.
export type CourtView = "cards" | "court" | "orbit";

const STORAGE_KEY = "court-view";
// Undefined means "not chosen yet": the dropdown shows its placeholder and
// the courts render as cards.
export function loadCourtView(): CourtView | undefined {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "cards" || saved === "court" || saved === "orbit")
      return saved;
    // Migrate the earlier prototype toggles.
    if (localStorage.getItem("court-view-webgl") === "1") return "orbit";
    if (localStorage.getItem("court-view-3d") === "1") return "court";
  } catch {
    // Storage can be unavailable (private mode); treat as not chosen.
  }
  return undefined;
}
export function saveCourtView(view: CourtView) {
  try {
    localStorage.setItem(STORAGE_KEY, view);
  } catch {
    // The choice still applies for this visit.
  }
}

const OPTIONS: Array<{ value: CourtView; label: string; hint: string }> = [
  { value: "cards", label: "การ์ด", hint: "รายชื่อแบบการ์ด อ่านง่ายที่สุด" },
  { value: "court", label: "สนาม", hint: "การ์ดบนพื้นสนามแบบมีมิติ" },
  { value: "orbit", label: "3D", hint: "สนามจำลอง 3D ลากเพื่อหมุนได้" },
];

function ViewIcon({ view }: { view: CourtView }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (view === "cards")
    return (
      <svg {...common}>
        <rect x="3" y="4" width="8" height="16" rx="2" />
        <rect x="13" y="4" width="8" height="16" rx="2" />
      </svg>
    );
  if (view === "court")
    return (
      <svg {...common}>
        <path d="M7 5h10l4 14H3z" />
        <path d="M4.7 12h14.6M12 5v14" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
    </svg>
  );
}

export function CourtViewSwitch({
  value,
  onChange,
}: {
  value?: CourtView;
  onChange: (view: CourtView) => void;
}) {
  return (
    <div className="court-view-select">
      <Select
        aria-label="มุมมองสนาม"
        className="app-select"
        value={value}
        placeholder="มุมมอง"
        onChange={onChange}
        virtual={false}
        popupMatchSelectWidth={false}
        placement="bottomRight"
        options={OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        // Closed state: icon + short name. Open list: icon, name and hint.
        labelRender={({ value: v, label }) => (
          <span className="court-view-value">
            <ViewIcon view={v as CourtView} />
            {label}
          </span>
        )}
        optionRender={(option) => {
          const o = OPTIONS.find((item) => item.value === option.value)!;
          return (
            <span className="court-view-option" data-option-value={o.value}>
              <ViewIcon view={o.value} />
              <span>
                <strong>{o.label}</strong>
                <small>{o.hint}</small>
              </span>
            </span>
          );
        }}
        styles={{ popup: { root: { maxWidth: "calc(100vw - 24px)" } } }}
      />
    </div>
  );
}
