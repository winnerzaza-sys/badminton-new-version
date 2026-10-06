// Court numbers remain stable for pairing; names are presentation metadata.
export function courtName(courtNames: string[] | undefined, court: number) {
  return courtNames?.[court - 1]?.trim() || `สนาม ${court}`;
}

export function normalizeCourtNames(courtNames?: string[]) {
  return [1, 2].map((court) => courtName(courtNames, court));
}
