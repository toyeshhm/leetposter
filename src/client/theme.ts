"use client";

import { useEffect, useState } from "react";
import { THEME_VARS } from "@/components/cosmetics/themes";
import { errorMessage, fetchStore, type StorePage } from "./api";
import { useSession } from "./session";

/** The default everyone owns. Its set is globals.css restated, so equipping it undoes another theme. */
const EMBER = "theme-ember";

/** Every custom property any theme sets, so switching themes clears the last one completely. */
const THEMED_PROPS: readonly string[] = [...new Set(Object.values(THEME_VARS).flatMap((vars) => Object.keys(vars)))];

/** Put one theme's tokens on <html>, clearing whatever the last one set. */
export function applyTheme(itemId: string | null): void {
  const style = document.documentElement.style;
  const vars = THEME_VARS[itemId ?? EMBER] ?? {};
  for (const prop of THEMED_PROPS) style.removeProperty(prop);
  for (const [prop, value] of Object.entries(vars)) style.setProperty(prop, value);
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

/**
 * Applies the equipped theme's tokens to <html>. Rendered once in the root layout; draws nothing.
 * A guest, and anyone between the first paint and the answer, sits in Ember.
 */
export function ThemeIsland(): null {
  const { page } = useEconomy();
  const theme = page?.loadout?.theme ?? null;
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  return null;
}
