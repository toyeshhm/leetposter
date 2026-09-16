"use client";

import { useEffect, useState } from "react";
import { THEME_VARS, type Mode } from "@/components/cosmetics/themes";
import { errorMessage, fetchStore, type StorePage } from "./api";
import { useSession } from "./session";

/** The default everyone owns. Its set is globals.css restated, so equipping it undoes another theme. */
const EMBER = "theme-ember";

/** What the player chose. "system" follows the OS; the other two override it. */
export type ModeChoice = Mode | "system";

/** Per browser, not per account: a preference about this screen in this room, like the OS setting it follows. */
export const MODE_KEY = "leetposter.mode";

/** Every custom property any theme in any mode sets, so switching clears the last one completely. */
const THEMED_PROPS: readonly string[] = [
  ...new Set(Object.values(THEME_VARS).flatMap((byId) => Object.values(byId).flatMap((vars) => Object.keys(vars)))),
];

/** What "system" means right now. Defaults to dark: the game is played at night and the art is drawn for it. */
export function systemMode(): Mode {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function resolveMode(choice: ModeChoice): Mode {
  return choice === "system" ? systemMode() : choice;
}

/**
 * The saved choice, or "system" when there is none. A browser that refuses site storage (a private
 * window, blocked cookies) throws on read: the page follows the OS rather than failing, because a
 * colour preference is worth less than the page rendering at all. Storage that the game does need
 * is checked separately by `assertStorage` before a seat is taken.
 */
export function loadMode(): ModeChoice {
  try {
    const saved = window.localStorage.getItem(MODE_KEY);
    return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
  } catch (error: unknown) {
    // A private window or blocked site data throws a DOMException here. Storage the game actually
    // needs is checked by assertStorage before a seat is taken, so a colour preference falls back
    // to the OS rather than failing the render. Anything that is not an Error is not that, and goes up.
    if (!(error instanceof Error)) throw error;
    return "system";
  }
}

/** Remember the choice. Unwritable storage means this browser will ask the OS again next time. */
export function saveMode(choice: ModeChoice): void {
  try {
    window.localStorage.setItem(MODE_KEY, choice);
  } catch (error: unknown) {
    // Unwritable storage means this browser asks the OS again next time, which is the right failure.
    if (!(error instanceof Error)) throw error;
  }
}

/**
 * Put one theme's tokens on <html> in one mode, clearing whatever the last set left behind.
 * `color-scheme` goes with them so the browser's own chrome - form controls, scrollbars, the
 * canvas behind an overscroll - follows the page instead of fighting it.
 */
export function applyTheme(itemId: string | null, mode: Mode): void {
  const root = document.documentElement;
  const vars = THEME_VARS[mode][itemId ?? EMBER] ?? THEME_VARS[mode][EMBER] ?? {};
  for (const prop of THEMED_PROPS) root.style.removeProperty(prop);
  for (const [prop, value] of Object.entries(vars)) root.style.setProperty(prop, value);
  root.style.colorScheme = mode;
  root.dataset.mode = mode;
}

const MOVED = "leetposter.economy";

/**
 * Say that candles were spent or earned, or that the loadout changed. The header's count and the
 * theme on <html> are read by components that are not on the screen doing the spending, so the
 * screen that writes has to say so.
 */
export function economyChanged(): void {
  window.dispatchEvent(new Event(MOVED));
}

/**
 * The signed-in player's wallet, inventory and loadout; a guest gets an empty one. Re-reads on
 * `economyChanged()`, so the header's candles follow a claim and a theme equipped on the shelf
 * lands on the page it was bought from.
 * ponytail: every caller fetches for itself, so a page with the header, the theme island and a
 * roster makes three small GETs. Put it in a context if that ever shows up in a trace.
 */
export function useEconomy(): { page: StorePage | null; error: string | null } {
  const session = useSession();
  const token = session.accessToken;
  const status = session.status;
  const [state, setState] = useState<{ page: StorePage | null; error: string | null }>({ page: null, error: null });
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    const again = (): void => {
      setMoves((n) => n + 1);
    };
    window.addEventListener(MOVED, again);
    return () => {
      window.removeEventListener(MOVED, again);
    };
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    let live = true;
    fetchStore(token)
      .then((page) => {
        if (live) setState({ page, error: null });
      })
      .catch((failure: unknown) => {
        if (live) setState({ page: null, error: errorMessage(failure) });
      });
    return () => {
      live = false;
    };
  }, [token, status, moves]);

  return state;
}

/** Told when the mode is changed from the settings page, which is not on the screen doing the painting. */
const MODE_MOVED = "leetposter.mode-changed";

export function modeChanged(): void {
  window.dispatchEvent(new Event(MODE_MOVED));
}

/**
 * The player's light/dark choice, and the mode it resolves to now. Follows the OS while the choice
 * is "system", so a laptop switching at sunset switches the page with it.
 */
export function useMode(): { choice: ModeChoice; mode: Mode; setChoice: (next: ModeChoice) => void } {
  // Read on the first client render, not in an effect. ThemeIsland writes tokens from `mode` as soon
  // as it mounts, so a hardcoded starting value would overwrite what the pre-paint script in
  // layout.tsx already got right and flash the wrong mode before the effect corrected it.
  const [choice, setChoiceState] = useState<ModeChoice>(() => (typeof window === "undefined" ? "system" : loadMode()));
  const [mode, setMode] = useState<Mode>(() => (typeof window === "undefined" ? "dark" : resolveMode(loadMode())));

  useEffect(() => {
    const read = (): void => {
      const next = loadMode();
      setChoiceState(next);
      setMode(resolveMode(next));
    };
    read();
    const media = window.matchMedia("(prefers-color-scheme: light)");
    media.addEventListener("change", read);
    window.addEventListener(MODE_MOVED, read);
    return () => {
      media.removeEventListener("change", read);
      window.removeEventListener(MODE_MOVED, read);
    };
  }, []);

  const setChoice = (next: ModeChoice): void => {
    saveMode(next);
    setChoiceState(next);
    setMode(resolveMode(next));
    modeChanged();
  };
  return { choice, mode, setChoice };
}

/**
 * Applies the equipped theme's tokens to <html>, in the mode the player asked for. Rendered once in
 * the root layout; draws nothing. A guest, and anyone between the first paint and the answer, sits
 * in Ember. The inline script in layout.tsx has already put the right mode on the page, so this
 * only ever confirms it or swaps the theme in on top.
 */
export function ThemeIsland(): null {
  const { page } = useEconomy();
  const { mode } = useMode();
  const theme = page?.loadout?.theme ?? null;
  useEffect(() => {
    applyTheme(theme, mode);
  }, [theme, mode]);
  return null;
}
