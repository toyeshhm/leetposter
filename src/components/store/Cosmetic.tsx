import { createElement, type CSSProperties, type ReactElement } from "react";
import { cosmeticArt, GUEST_AVATAR, GUEST_FRAME, TitleLine as CosmeticTitleLine } from "@/components/cosmetics";
import { CARET_COLORS } from "@/components/cosmetics/carets";
import { CATALOG, THEME_TOKENS, type Item } from "@/economy/catalog";
import type { EquippedLook } from "@/game/types";
import "./store.css";

/* What a cosmetic looks like on a page. The store, the pass, the ledger, the roster and the reveal all draw from here. */

/** One catalog row, or undefined for an id no catalog knows. Display never throws over a stale id. */
export function findItem(id: string | null): Item | undefined {
  return id === null ? undefined : CATALOG.find((item) => item.id === id);
}

/** A theme is a set of colours, so it shows them: page, surface and flame, from the tokens it would set. */
export function Swatches({ id }: { id: string }): ReactElement {
  const tokens = THEME_TOKENS[id] ?? {};
  const chips: readonly string[] = [tokens["--bg"] ?? "var(--bg)", tokens["--surface"] ?? "var(--surface)", tokens["--accent"] ?? "var(--accent)"];
  return (
    <span className="store-swatches" aria-hidden>
      {chips.map((color, i) => (
        <span key={`${String(i)}-${color}`} className="store-swatch" style={{ background: color }} />
      ))}
    </span>
  );
}

/** A caret is a colour, so it shows as a cursor sitting in a line of code. */
export function CaretChip({ id }: { id: string }): ReactElement {
  const style = { "--caret": CARET_COLORS[id] ?? "var(--ink)" } as CSSProperties;
  return (
    <span className="caret-chip" aria-hidden>
      <span className="caret" data-caret={id} style={style} />
    </span>
  );
}

/**
 * The face of one item, whatever kind it is. Avatars, frames, badges and emotes are drawings;
 * a theme is its colours, a caret is its cursor, and a title is its own words.
 */
export function ItemFace({ item, size }: { item: Item; size: number }): ReactElement {
  // createElement, not JSX: the drawing is looked up by id, and a capitalised local would read as a component declared in render.
  const art = cosmeticArt(item.art);
  if (art !== null) return createElement(art, { size, decorative: true });
  if (item.kind === "theme") return <Swatches id={item.id} />;
  if (item.kind === "caret") return <CaretChip id={item.id} />;
  return <CosmeticTitleLine itemId={item.id} />;
}

/**
 * The avatar a player wears, inside the frame they wear. Everyone gets a portrait: a guest, and
 * anyone who has equipped nothing, wears the hood the Company issues in a plain rope ring.
 */
export function Portrait({ look, size }: { look: EquippedLook | null; size: number }): ReactElement {
  const avatar = findItem(look?.avatar ?? null);
  const frame = findItem(look?.frame ?? null);
  const face = (avatar === undefined ? null : cosmeticArt(avatar.art)) ?? GUEST_AVATAR;
  const ring = (frame === undefined ? null : cosmeticArt(frame.art)) ?? GUEST_FRAME;
  const box = `${String(size)}px`;
  return (
    <span className="portrait" style={{ width: box, height: box }}>
      {createElement(face, { size, decorative: true })}
      <span className="portrait-frame">{createElement(ring, { size, decorative: true })}</span>
    </span>
  );
}

/** The badge mark a player wears beside their name. Nothing equipped, nothing drawn. */
export function BadgeMark({ look, size }: { look: EquippedLook | null; size: number }): ReactElement | null {
  const badge = findItem(look?.badge ?? null);
  if (badge === undefined) return null;
  const art = cosmeticArt(badge.art);
  return art === null ? null : createElement(art, { size, title: badge.name });
}

/** The title line under a name. Nothing equipped, nothing drawn. */
export function TitleLine({ look }: { look: EquippedLook | null }): ReactElement | null {
  const title = findItem(look?.title ?? null);
  return title === undefined ? null : <CosmeticTitleLine itemId={title.id} />;
}
