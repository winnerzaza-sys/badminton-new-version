import { Input } from "antd";
import { normalizeCourtNames } from "../domain/models/courts";

export function CourtNameFields({
  courtCount,
  names,
  onChange,
  disabled = false,
}: {
  courtCount: 1 | 2;
  names?: string[];
  onChange: (names: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="court-name-fields">
      {Array.from({ length: courtCount }, (_, index) => (
        <label key={index}>
          ชื่อสนาม {index + 1}
          <Input
            aria-label={`ชื่อสนาม ${index + 1}`}
            value={names?.[index] ?? `สนาม ${index + 1}`}
            placeholder={`สนาม ${index + 1}`}
            maxLength={24}
            disabled={disabled}
            onChange={(event) => {
              const next = [...(names ?? normalizeCourtNames())];
              next[index] = event.target.value;
              onChange(next);
            }}
          />
        </label>
      ))}
    </div>
  );
}
