import { useId, type ReactElement } from "react";
import { hatch, ticks } from "./hatch";
import { Plate, type ArtProps } from "./Plate";

const BELL = "M30 64 C30 42 34 30 48 26 C62 30 66 42 66 64 L72 70 H24 Z";

/** The bell that calls a freeze. */
export function FreezeBell(props: ArtProps): ReactElement {
  const id = useId();
  return (
    <Plate name="Freeze bell" {...props}>
      <clipPath id={`${id}bell`}>
        <path d={BELL} />
      </clipPath>
      <path className="fine" clipPath={`url(#${id}bell)`} d={hatch(54, 30, 14, 42, 3.4, 15)} strokeWidth={1.1} strokeLinecap="butt" />
      <path d={BELL} strokeWidth={3.4} />
      <path d="M43 26 a5 5 0 0 1 10 0" strokeWidth={2.6} />
      <path d="M48 70 V73" strokeWidth={2.4} />
      <circle className="spot" cx={48} cy={79} r={5.5} />
      <circle cx={48} cy={79} r={5.5} strokeWidth={2} />
      <path d="M47 34 L44 44 L50 53 L46 62" strokeWidth={2} strokeLinejoin="bevel" />
      <path d="M18 42 L11 38 M17 54 L9 55 M78 42 L85 38 M79 54 L87 55" strokeWidth={2.2} />
    </Plate>
  );
}

const URN = "M28 40 C24 56 25 74 30 88 H66 C71 74 72 56 68 40 Z";

/** A folded ballot half-way into the urn. */
export function BallotIcon(props: ArtProps): ReactElement {
  const id = useId();
  return (
    <Plate name="Ballot" {...props}>
      <clipPath id={`${id}urn`}>
        <path d={URN} />
      </clipPath>
      <path className="fine" clipPath={`url(#${id}urn)`} d={hatch(52, 40, 20, 48, 3.4, 5)} strokeWidth={1.1} strokeLinecap="butt" />
      <path d={URN} strokeWidth={3.4} />
      <path d="M22 34 H74 V40 H22 Z" strokeWidth={3} />
      <path d="M27 64 H69" strokeWidth={1.8} />
      <path d="M42 36 L40 8 L58 6 L56 36 Z" strokeWidth={2.6} />
      <path className="fine" d="M43 16 L55 15 M44 22 L52 21" strokeWidth={1.4} />
      <circle className="spot" cx={51} cy={28} r={3.2} />
      <path d="M38 34 H60" strokeWidth={2.2} />
    </Plate>
  );
}

const GLASS = "M34 12 H62 C62 32 50 40 50 48 C50 56 62 64 62 84 H34 C34 64 46 56 46 48 C46 40 34 32 34 12 Z";

/** Sand running. Also the loading glyph. */
export function HourglassIcon(props: ArtProps): ReactElement {
  const id = useId();
  return (
    <Plate name="Hourglass" {...props}>
      <clipPath id={`${id}glass`}>
        <path d={GLASS} />
      </clipPath>
      <path className="fine" clipPath={`url(#${id}glass)`} d={hatch(52, 12, 10, 72, 3.2, 0)} strokeWidth={1} strokeLinecap="butt" />
      <path d="M24 8 H72 M24 88 H72" strokeWidth={4} />
      <path d="M29 8 V88 M67 8 V88" strokeWidth={2.4} />
      <path className="spot" d="M39 28 C41 35 46 40 48 44 C50 40 55 35 57 28 Z" />
      <path className="spot-line" d="M48 47 V70" strokeWidth={2} strokeLinecap="butt" />
      <path className="spot" d="M37 84 C40 76 46 72 48 66 C50 72 56 76 59 84 Z" />
      <path d={GLASS} strokeWidth={2.8} />
    </Plate>
  );
}

const CHECK = "M18 52 L30 42 L42 58 L74 20 L84 28 L44 80 Z";

/** Accepted: a cut check inside a stamped ring. Set `--art-spot: var(--success)` on the parent. */
export function AcceptedMark(props: ArtProps): ReactElement {
  return (
    <Plate name="Accepted" {...props}>
      <circle cx={48} cy={48} r={40} strokeWidth={3} />
      <path className="fine" d={ticks(48, 48, 34, 38, 24)} strokeWidth={1.4} strokeLinecap="butt" />
      <path className="spot" d={CHECK} />
      <path d={CHECK} strokeWidth={2.6} />
    </Plate>
  );
}

function scallop(cx: number, cy: number, r: number, n: number): string {
  const pt = (i: number): string => {
    const a = ((i % n) / n) * 2 * Math.PI;
    return `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
  };
  const bump = (2 * r * Math.sin(Math.PI / n) * 0.62).toFixed(1);
  let d = `M${pt(0)}`;
  for (let i = 1; i <= n; i += 1) d += ` A${bump} ${bump} 0 0 1 ${pt(i)}`;
  return `${d} Z`;
}

const SEAL = scallop(48, 50, 33, 14);
const CRACK = "M44 14 L50 30 L40 46 L52 58 L44 74 L50 88";

function SealFace(): ReactElement {
  return (
    <>
      <path className="spot" d={SEAL} />
      <path d={SEAL} strokeWidth={2.4} />
      <circle className="fine" cx={48} cy={50} r={24} strokeWidth={1.8} />
      <path d="M48 40 L51 47 L58 50 L51 53 L48 60 L45 53 L38 50 L45 47 Z" strokeWidth={2} />
    </>
  );
}

/** Rejected: a wax seal cracked in two. Set `--art-spot: var(--danger)` on the parent. */
export function RejectedSeal(props: ArtProps): ReactElement {
  const id = useId();
  return (
    <Plate name="Rejected" {...props}>
      <clipPath id={`${id}l`}>
        <path d={`${CRACK} L0 96 L0 0 Z`} />
      </clipPath>
      <clipPath id={`${id}r`}>
        <path d={`${CRACK} L96 96 L96 0 Z`} />
      </clipPath>
      <g clipPath={`url(#${id}l)`}>
        <SealFace />
      </g>
      <g clipPath={`url(#${id}r)`} transform="translate(5 3) rotate(6 70 50)">
        <SealFace />
      </g>
    </Plate>
  );
}
