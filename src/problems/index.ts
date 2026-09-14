import { BANK_RAW } from "./bank/index";
import { bankProblem, type BankProblem } from "./schema";

/** Every bank problem, validated once at import. A malformed file fails the build loudly. */
export const BANK: readonly BankProblem[] = BANK_RAW.map((raw) => bankProblem.parse(raw));

export function bankById(id: string): BankProblem | null {
  return BANK.find((p) => p.id === id) ?? null;
}
