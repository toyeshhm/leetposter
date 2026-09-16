import { useId, type ReactElement } from "react";
import { hatch, ticks } from "@/components/art/hatch";
import { Plate, type ArtProps } from "@/components/art/Plate";

/*
 * Marks played at the reveal, catalog kind "emote", read at 48px. One gesture each, no scene:
 * a hand, a bell, a cup, two hands, a seal, a mask. Nothing animates; they sit on the record.
 */

/** Two fingers pinch a wick out. */
export function SnuffEmote(props: ArtProps): ReactElement {
  const id = useId();
  const hand = "M34 92 C26 80 26 66 32 58 L46 40 C50 34 58 38 55 45 L47 58 L62 44 C67 39 74 45 69 51 L58 64 C64 62 70 66 66 72 L58 82 C52 90 44 94 34 92 Z";
  return (
    <Plate name="Snuff: two fingers pinch a candle out" {...props}>
      <clipPath id={`${id}hand`}>
        <path d={hand} />
      </clipPath>
      <path className="fine" clipPath={`url(#${id}hand)`} d={hatch(26, 38, 48, 56, 4, 62)} strokeWidth={1.2} strokeLinecap="butt" />
      <path d={hand} strokeWidth={3.2} />
      {/* a stub of a candle, closed at the foot: an open bracket read as a corner, not as wax */}
      <path d="M26 36 H44 V58 H26 Z" strokeWidth={2.6} />
      <path className="fine" d="M30 38 V54 M38 38 V50" strokeWidth={1.4} />
      <path d="M34 36 V28" strokeWidth={2.2} />
      <path className="spot-line" d="M34 28 C30 22 36 18 34 10 M34 28 C40 22 34 18 38 8" strokeWidth={2.4} />
    </Plate>
  );
}

/** A small bell, rung once. */
export function BellEmote(props: ArtProps): ReactElement {
  const id = useId();
  const bell = "M28 68 C28 44 33 30 48 26 C63 30 68 44 68 68 L74 74 H22 Z";
  return (
    <Plate name="Bell: rung once" {...props}>
      <clipPath id={`${id}bell`}>
        <path d={bell} />
      </clipPath>
      <path className="fine" clipPath={`url(#${id}bell)`} d={hatch(52, 28, 16, 46, 3.4, 12)} strokeWidth={1.1} strokeLinecap="butt" />
      <path d={bell} strokeWidth={3.4} />
      <path d="M42 26 a6 6 0 0 1 12 0" strokeWidth={2.6} />
      <path d="M48 74 V80" strokeWidth={2.4} />
      <circle className="spot" cx={48} cy={86} r={6} />
      <circle cx={48} cy={86} r={6} strokeWidth={2.2} />
      <path d="M14 40 L6 34 M12 54 L4 56 M82 40 L90 34 M84 54 L92 56" strokeWidth={2.4} />
    </Plate>
  );
}

/** A cup lifted to whoever was right. */
export function RaisedCupEmote(props: ArtProps): ReactElement {
  const id = useId();
  const cup = "M26 26 H70 L64 62 C62 70 56 74 48 74 C40 74 34 70 32 62 Z";
  return (
    <Plate name="Raised Cup" {...props}>
      <clipPath id={`${id}cup`}>
        <path d={cup} />
      </clipPath>
      <path className="fine" clipPath={`url(#${id}cup)`} d={hatch(50, 26, 22, 48, 3.6, 78)} strokeWidth={1.1} strokeLinecap="butt" />
      <path className="spot" d="M28 34 H68 L66 44 C60 50 36 50 30 44 Z" />
      <path d={cup} strokeWidth={3.4} />
      <path d="M28 34 H68" strokeWidth={2.2} />
      <path d="M48 74 V84 M32 90 H64" strokeWidth={3} />
      <path d="M36 84 H60 L64 90 H32 Z" strokeWidth={2.4} />
      <path d="M70 32 C82 34 84 50 72 54" strokeWidth={2.6} />
      <path className="fine" d={ticks(48, 18, 8, 14, 5, -140, 100)} strokeWidth={1.4} strokeLinecap="butt" />
    </Plate>
  );
}

/** Three claps, none of them sincere. */
export function SlowClapEmote(props: ArtProps): ReactElement {
  const id = useId();
  const left = "M8 84 C4 68 8 52 18 42 L34 26 C39 21 46 27 41 33 L30 46 L44 40 C51 37 55 46 48 50 L34 58 C38 60 40 66 36 72 L30 82 C26 88 16 90 8 84 Z";
  return (
    <Plate name="Slow Clap: three claps, none sincere" {...props}>
      <clipPath id={`${id}l`}>
        <path d={left} />
      </clipPath>
      <path className="fine" clipPath={`url(#${id}l)`} d={hatch(4, 24, 52, 62, 4.2, 58)} strokeWidth={1.2} strokeLinecap="butt" />
      <path d={left} strokeWidth={3.2} />
      <g transform="translate(96 0) scale(-1 1)">
        <path d={left} strokeWidth={3.2} />
      </g>
      <path className="spot-line" d="M48 14 V4 M62 18 L70 10 M34 18 L26 10" strokeWidth={3} />
    </Plate>
  );
}

/** A wax seal cracks in half. */
export function BrokenSealEmote(props: ArtProps): ReactElement {
  const half = (): ReactElement => (
    <>
      <path className="spot" d="M48 14 L70 24 L76 48 L60 70 L36 70 L20 48 L26 24 Z" />
      <path d="M48 14 L70 24 L76 48 L60 70 L36 70 L20 48 L26 24 Z" strokeWidth={2.6} />
      <path d="M48 30 L53 42 L66 44 L56 52 L59 66" strokeWidth={2.2} />
    </>
  );
  const id = useId();
  return (
    <Plate name="Broken Seal: a wax seal cracked in two" {...props}>
      <clipPath id={`${id}l`}>
        <path d="M44 4 L52 30 L40 48 L52 64 L44 92 L0 92 L0 4 Z" />
      </clipPath>
      <clipPath id={`${id}r`}>
        <path d="M44 4 L52 30 L40 48 L52 64 L44 92 L96 92 L96 4 Z" />
      </clipPath>
      <g clipPath={`url(#${id}l)`} transform="translate(-7 4) rotate(-7 30 48)">
        {half()}
      </g>
      <g clipPath={`url(#${id}r)`} transform="translate(7 4) rotate(7 66 48)">
        {half()}
      </g>
    </Plate>
  );
}

/** A mask slides an inch and is pushed back up. */
export function MaskSlipEmote(props: ArtProps): ReactElement {
  const id = useId();
  // The mask sits low enough that the face's own eyes stay above it: at 48px that gap is the whole joke.
  const face = "M28 26 C28 16 36 10 48 10 C60 10 68 16 68 26 C68 42 60 52 48 52 C36 52 28 42 28 26 Z";
  const mask = "M22 54 C22 44 32 38 48 38 C64 38 74 44 74 54 C74 70 64 82 48 82 C32 82 22 70 22 54 Z";
  const holes = "M36 54 Q42 48 48 54 Q42 60 36 54 Z M52 54 Q58 48 64 54 Q58 60 52 54 Z";
  return (
    <Plate name="Mask Slip: a mask slides down an inch" {...props}>
      <path d={face} strokeWidth={2.6} />
      <path className="solid" d="M38 26 a3.6 3.6 0 1 0 0.1 0 M56 26 a3.6 3.6 0 1 0 0.1 0" />
      <clipPath id={`${id}mask`}>
        <path d={`${mask} ${holes}`} clipRule="evenodd" />
      </clipPath>
      <path className="fine" clipPath={`url(#${id}mask)`} d={hatch(22, 38, 52, 44, 3.4, 32)} strokeWidth={1.1} strokeLinecap="butt" />
      <path d={mask} strokeWidth={3.2} />
      <path d={holes} strokeWidth={2.2} />
      <path d="M38 70 Q48 78 58 70" strokeWidth={2.4} />
      <path className="spot-line" d="M84 76 V46 M84 46 L78 54 M84 46 L90 54" strokeWidth={3} />
    </Plate>
  );
}
