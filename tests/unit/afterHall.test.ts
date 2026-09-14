import { describe, expect, it, vi } from "vitest";
import { afterHall, HOOKS } from "@/server/afterHall";
import { lobby } from "./fixtures";

describe("afterHall", () => {
  it("runs every hook and keeps going when one throws", async () => {
    const seen: string[] = [];
    HOOKS.splice(0, HOOKS.length);
    HOOKS.push(async function first(state) {
      seen.push(`first:${state.code}`);
      await Promise.resolve();
    });
    HOOKS.push(async function broken() {
      await Promise.resolve();
      throw new Error("no candles left");
    });
    HOOKS.push(async function third() {
      await Promise.resolve();
      // a rejection that is not an Error instance, to cover the String(error) branch
      throw { message: "a plain object" } as unknown as Error;
    });
    HOOKS.push(async function last(state) {
      seen.push(`last:${state.code}`);
      await Promise.resolve();
    });
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const state = lobby(4);
    await afterHall(state);
    expect(seen).toEqual([`first:${state.code}`, `last:${state.code}`]);
    expect(errors).toHaveBeenCalledTimes(2);
    errors.mockRestore();
    HOOKS.splice(0, HOOKS.length);
  });
});
