import type { ReactElement } from "react";
import { itemById } from "@/economy/catalog";
import "./cosmetics.css";

/*
 * Titles, catalog kind "title", are text and not art: a line set under a name on the roster,
 * the reveal and the profile. The display face at 1.125rem, which is the smallest size DESIGN.md
 * allows it, with the divider's lozenge in front so the line is marked as ornament, not a name.
 */

/** The line under a name. Renders nothing when the player has no title equipped. */
export function TitleLine({ itemId }: { itemId: string | null }): ReactElement | null {
  if (itemId === null) return null;
  return <span className="title-line">{itemById(itemId).name}</span>;
}
