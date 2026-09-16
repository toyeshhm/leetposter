import { useId, type ReactElement } from "react";
import { d, hatch, ticks } from "@/components/art/hatch";
import { Plate, type ArtProps } from "@/components/art/Plate";

/*
 * Borders, 96 square, catalog kind "frame". A frame is drawn over a portrait of the same size
 * (see Portrait in the store), so the ornament sits on a square 10 units in from the edge and
 * the middle 76 units stay clear: at 32px on the roster the face is still the thing you see.
 * Banded frames (iron, parchment, stone, gilt) fill 3..13 instead, which crops like a matte.
 */

const RING = "M10 10 H86 V86 H10 Z";
const BAND_OUT = "M3 3 H93 V93 H3 Z";
const BAND_IN = "M13 13 H83 V83 H13 Z";

/** Points evenly around a square `inset` units in from the plate edge, clockwise from the top left. */
function around(n: number, inset: number): { x: number; y: number; i: number; edge: "h" | "v" }[] {
  const lo = inset;
  const hi = 96 - inset;
  const side = hi - lo;
  return Array.from({ length: n }, (_, i) => {
    const t = (4 * side * i) / n;
    const leg = Math.floor(t / side);
    const u = t - leg * side;
    if (leg === 0) return { x: lo + u, y: lo, i, edge: "h" as const };
    if (leg === 1) return { x: hi, y: lo + u, i, edge: "v" as const };
    if (leg === 2) return { x: hi - u, y: hi, i, edge: "h" as const };
    return { x: lo, y: hi - u, i, edge: "v" as const };
  });
}

/** Hatching over the band only, so the portrait underneath stays clear. */
function Band({ id, spacing, angle }: { id: string; spacing: number; angle: number }): ReactElement {
  return (
    <>
      <mask id={`${id}band`}>
        <path d={BAND_OUT} fill="#fff" stroke="none" />
        <path d={BAND_IN} fill="#000" stroke="none" />
      </mask>
      <path className="fine" mask={`url(#${id}band)`} d={hatch(3, 3, 90, 90, spacing, angle)} strokeWidth={1.1} strokeLinecap="butt" />
    </>
  );
}

/** A loop of hemp, tied once at the foot. */
export function RopeFrame(props: ArtProps): ReactElement {
  const twist = around(48, 10)
    .map(({ x, y, i, edge }) => {
      const lean = i % 2 === 0 ? 3.6 : -3.6;
      return edge === "h" ? d`M${x - 2.6} ${y - lean} L${x + 2.6} ${y + lean}` : d`M${x - lean} ${y - 2.6} L${x + lean} ${y + 2.6}`;
    })
    .join("");
  return (
    <Plate name="Plain Rope frame" {...props}>
      <path d="M6 12 C6 8 8 6 12 6 H84 C88 6 90 8 90 12 V84 C90 88 88 90 84 90 H12 C8 90 6 88 6 84 Z" strokeWidth={2.4} />
      <path d="M14 18 C14 15 15 14 18 14 H78 C81 14 82 15 82 18 V78 C82 81 81 82 78 82 H18 C15 82 14 81 14 78 Z" strokeWidth={2.4} />
      <path className="fine" d={twist} strokeWidth={1.4} strokeLinecap="butt" />
      <path d="M38 90 C42 96 54 96 58 90" strokeWidth={2.6} />
      <path d="M43 94 L36 96 M53 94 L60 96" strokeWidth={2.2} />
    </Plate>
  );
}

/** Riveted black iron. */
export function IronFrame(props: ArtProps): ReactElement {
  const id = useId();
  return (
    <Plate name="Iron frame" {...props}>
      <Band id={id} spacing={4} angle={22} />
      <path d={BAND_OUT} strokeWidth={3.4} />
      <path d={BAND_IN} strokeWidth={3} />
      <path d="M3 3 L13 13 M93 3 L83 13 M93 93 L83 83 M3 93 L13 83" strokeWidth={2.4} />
      <path className="solid" d={around(16, 8).map(({ x, y }) => d`M${x} ${y} m-2.4 0 a2.4 2.4 0 1 0 4.8 0 a2.4 2.4 0 1 0 -4.8 0`).join("")} />
    </Plate>
  );
}

const SEAL = ((): string => {
  const pt = (i: number): string => {
    const a = ((i % 12) / 12) * 2 * Math.PI;
    return d`${48 + 11 * Math.cos(a)} ${88 + 11 * Math.sin(a)}`;
  };
  return `M${pt(0)}${Array.from({ length: 12 }, (_, i) => ` A3.8 3.8 0 0 1 ${pt(i + 1)}`).join("")} Z`;
})();

/** Parchment with a red seal at the foot, unbroken. */
export function WaxSealFrame(props: ArtProps): ReactElement {
  const id = useId();
  return (
    <Plate name="Wax Seal frame: parchment with an unbroken seal" {...props}>
      <Band id={id} spacing={5} angle={78} />
      <path d="M3 8 L8 3 H88 L93 8 V88 L88 93 H8 L3 88 Z" strokeWidth={3} />
      <path d={BAND_IN} strokeWidth={2.4} />
      <path className="fine" d="M8 8 H88 M8 88 H62 M74 88 H88" strokeWidth={1.4} />
      <path className="spot" d={SEAL} />
      <path d={SEAL} strokeWidth={2.2} />
      <path d="M44 86 L48 92 L52 86" strokeWidth={1.8} />
    </Plate>
  );
}

/** Thorns the whole way round. */
export function BramblesFrame(props: ArtProps): ReactElement {
  const nodes = around(24, 10);
  const vine = nodes.map(({ x, y, i }, n) => (n === 0 ? d`M${x} ${y}` : d`Q${x + (i % 2 === 0 ? 3.5 : -3.5)} ${y + (i % 2 === 0 ? -3.5 : 3.5)} ${x} ${y}`)).join("");
  const thorns = nodes
    .filter(({ i }) => i % 2 === 0)
    .map(({ x, y }) => {
      const ox = x < 12 ? -7 : x > 84 ? 7 : 0;
      const oy = y < 12 ? -7 : y > 84 ? 7 : 0;
      return d`M${x} ${y} L${x + ox} ${y + oy}`;
    })
    .join("");
  return (
    <Plate name="Brambles frame: a ring of thorns" {...props}>
      <path d={`${vine} Z`} strokeWidth={2.8} />
      <path d={thorns} strokeWidth={2.2} />
      <path className="fine" d="M3 34 C8 32 10 36 7 40 C4 42 2 38 3 34 Z M93 60 C88 58 86 62 89 66 C92 68 94 64 93 60 Z M60 3 C58 8 62 10 66 7 C68 4 64 2 60 3 Z" strokeWidth={1.8} />
      <path className="spot" d="M30 92 a3.6 3.6 0 1 0 0.1 0 M40 95 a3.6 3.6 0 1 0 0.1 0 M22 95 a3.6 3.6 0 1 0 0.1 0" />
    </Plate>
  );
}

/* The mended link, counted round from the top left; it lands on the bottom edge where the eye ends up. */
const MEND = 12;

/** Links wide enough to overlap their neighbours, so the ring reads as chain and not as beads. One is mended. */
function link({ x, y, i, edge }: { x: number; y: number; i: number; edge: "h" | "v" }): string {
  const flat = edge === "h" ? i % 2 === 0 : i % 2 === 1;
  const rx = flat ? 8 : 5.5;
  const ry = flat ? 5.5 : 8;
  return d`M${x - rx} ${y} a${rx} ${ry} 0 1 0 ${2 * rx} 0 a${rx} ${ry} 0 1 0 ${-2 * rx} 0`;
}

/** Nine links, one of them mended. */
export function ChainFrame(props: ArtProps): ReactElement {
  const nodes = around(20, 10);
  return (
    <Plate name="Chain frame: linked iron, one link mended" {...props}>
      <path
        d={nodes
          .filter(({ i }) => i !== MEND)
          .map(link)
          .join("")}
        strokeWidth={2.6}
      />
      <path className="spot-line" d={nodes.filter(({ i }) => i === MEND).map(link).join("")} strokeWidth={3} />
      <path
        d={nodes
          .filter(({ i }) => i === MEND)
          .map(({ x, y }) => d`M${x - 5} ${y - 4} L${x + 5} ${y + 4} M${x + 5} ${y - 4} L${x - 5} ${y + 4}`)
          .join("")}
        strokeWidth={2.2}
      />
    </Plate>
  );
}

/** A ring of the north gate, with the crack the frost put in it. */
export function CrackedStoneFrame(props: ArtProps): ReactElement {
  const id = useId();
  return (
    <Plate name="Cracked Stone frame: gate masonry split by frost" {...props}>
      <Band id={id} spacing={5.5} angle={62} />
      <path
        mask={`url(#${id}band)`}
        d="M3 8 H93 M3 24 H93 M3 48 H93 M3 72 H93 M3 88 H93 M24 3 V13 M48 8 V24 M72 3 V13 M13 24 V48 M83 24 V48 M8 48 V72 M88 48 V72 M24 72 V93 M48 72 V88 M72 83 V93"
        strokeWidth={2}
      />
      <path d={BAND_OUT} strokeWidth={3.4} />
      <path d={BAND_IN} strokeWidth={3} />
      <path className="spot-line" d="M56 3 L52 11 L58 19 L51 27" strokeWidth={2.4} strokeLinejoin="bevel" />
      <path d="M6 58 L1 64 M6 58 L11 66 L4 74 L9 84" strokeWidth={2} strokeLinejoin="bevel" />
    </Plate>
  );
}

/** Gold leaf on oak. */
export function GildedFrame(props: ArtProps): ReactElement {
  const id = useId();
  return (
    <Plate name="Gilded frame: gold leaf on oak" {...props}>
      <mask id={`${id}band`}>
        <path d={BAND_OUT} fill="#fff" stroke="none" />
        <path d={BAND_IN} fill="#000" stroke="none" />
      </mask>
      <path className="spot" mask={`url(#${id}band)`} d={BAND_OUT} />
      {/* the leaf's tooling is cut back out of the gold, so it is all `fine`: at 32 the 5-unit stroke would gouge the band away */}
      <path className="cut fine" mask={`url(#${id}band)`} d={hatch(3, 3, 90, 90, 4.5, 45)} strokeWidth={1.3} strokeLinecap="butt" />
      <path d={BAND_OUT} strokeWidth={3.2} />
      <path d={BAND_IN} strokeWidth={3} />
      <path
        className="cut fine"
        d="M48 3 C43 7 43 9 48 13 C53 9 53 7 48 3 Z M48 93 C43 89 43 87 48 83 C53 87 53 89 48 93 Z M3 48 C7 43 9 43 13 48 C9 53 7 53 3 48 Z M93 48 C89 43 87 43 83 48 C87 53 89 53 93 48 Z"
        strokeWidth={2.2}
      />
      <path className="cut fine" d={ticks(48, 8, 12, 20, 4, -140, 100) + ticks(48, 88, 12, 20, 4, 40, 100)} strokeWidth={1.6} strokeLinecap="butt" />
      <path d="M3 3 L13 13 M93 3 L83 13 M93 93 L83 83 M3 93 L13 83" strokeWidth={2.2} />
    </Plate>
  );
}

const FLAME = (cx: number, cy: number): string =>
  d`M${cx} ${cy - 6} C${cx + 3.6} ${cy - 3} ${cx + 4.6} ${cy} ${cx + 3.4} ${cy + 1.8} C${cx + 2.2} ${cy + 3.6} ${cx - 2.2} ${cy + 3.6} ${cx - 3.4} ${cy + 1.8} C${cx - 4.6} ${cy} ${cx - 3.6} ${cy - 3} ${cx} ${cy - 6} Z`;

/**
 * Twelve candles in a circle, all still lit. Seated 16 in, not 10: a candle is 20 units of wax, wick and
 * flame, and at 12 in the top row's flames were cut off by the edge of the plate.
 */
export function CandleRingFrame(props: ArtProps): ReactElement {
  const seats = around(12, 16);
  const wax = seats.map(({ x, y }) => d`M${x - 4.5} ${y - 1} h9 v9 h-9 Z M${x} ${y - 4} v3`).join("");
  const flames = seats.map(({ x, y }) => FLAME(x, y - 7)).join("");
  return (
    <Plate name="Candle Ring frame: twelve lit candles" {...props}>
      <path className="spot" d={flames} />
      <path d={wax} strokeWidth={2.2} />
      <path d={flames} strokeWidth={1.8} />
      <path className="fine" d={seats.map(({ x, y }) => d`M${x - 4.5} ${y + 2} q2.5 4 0 6`).join("")} strokeWidth={1.3} />
      <path className="fine" d={RING} strokeWidth={1.4} />
    </Plate>
  );
}
