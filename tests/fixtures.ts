import type { PlayerProfile } from "../src/domain/models";
export function profiles(genders: string): PlayerProfile[] {
  return [...genders].map((gender, i) => ({
    id: `p${i}`,
    name: `ผู้เล่น ${i + 1}`,
    gender: gender as "M" | "F",
    active: true,
    createdAt: "",
    updatedAt: "",
  }));
}
