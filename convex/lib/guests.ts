const MAX_NAME_LENGTH = 120;
const MAX_NOTES_LENGTH = 500;
export const MAX_GUEST_PARTIES = 500;

export function normalizeGuest(input: { name: string; partySize: number; notes?: string }) {
  const name = input.name.trim();
  const notes = input.notes?.trim();

  if (name.length === 0) throw new Error("Guest name is required");
  if (name.length > MAX_NAME_LENGTH) throw new Error("Guest name is too long");
  if (!Number.isSafeInteger(input.partySize) || input.partySize < 1 || input.partySize > 100) {
    throw new Error("Party size must be a whole number between 1 and 100");
  }
  if (notes && notes.length > MAX_NOTES_LENGTH) throw new Error("Notes are too long");

  return { name, partySize: input.partySize, notes: notes || undefined };
}

export function totalHeadcount(parties: ReadonlyArray<{ partySize: number }>) {
  return parties.reduce((total, party) => total + party.partySize, 0);
}
