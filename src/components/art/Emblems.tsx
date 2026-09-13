import { useId, type ReactElement } from "react";
import { hatch, ticks } from "./hatch";
import { Plate, type ArtProps } from "./Plate";

const MASK = "M12 42 C18 26 34 20 48 26 C62 20 78 26 84 42 C88 52 80 64 66 64 C58 64 52 58 48 56 C44 58 38 64 30 64 C16 64 8 52 12 42 Z";
const EYES = "M23 44 Q33 33 43 44 Q33 53 23 44 Z M53 44 Q63 33 73 44 Q63 53 53 44 Z";

/** A smiling half-mask with a crack of light through it: the Changeling. */
export function ChangelingMask(props: ArtProps): ReactElement {
  const id = useId();
  return (
    <Plate name="The Changeling: a smiling half-mask with a crack" {...props}>
      <clipPath id={`${id}mask`}>
        <path d={`${MASK} ${EYES}`} clipRule="evenodd" />
      </clipPath>
      <path className="fine" clipPath={`url(#${id}mask)`} d={hatch(8, 18, 80, 50, 3.6, 28)} strokeWidth={1.1} strokeLinecap="butt" />
      <path d={MASK} strokeWidth={3.4} />
      <path d={EYES} strokeWidth={2.4} />
      <path d="M12 44 C4 42 2 34 8 28 M84 44 C92 42 94 34 88 28" strokeWidth={2.4} />
      <path className="spot-line" d="M60 22 L58 32 L65 40 L59 50 L64 62" strokeWidth={2.6} strokeLinejoin="bevel" />
      <path d="M30 76 Q48 92 66 76" strokeWidth={3.4} />
      <path d="M30 76 L27 72 M66 76 L69 72" strokeWidth={2.2} />
    </Plate>
  );
}

/** A candle behind an open book inside a rope ring: the Crew. */
export function CrewEmblem(props: ArtProps): ReactElement {
  return (
    <Plate name="The Crew: a candle behind an open book" {...props}>
      <circle cx={48} cy={48} r={43} strokeWidth={3.4} />
      <circle className="fine" cx={48} cy={48} r={37} strokeWidth={1.6} />
      <path className="fine" d={ticks(48, 48, 37.5, 42.5, 36)} strokeWidth={1.3} strokeLinecap="butt" />
      <path d="M22 74 C30 68 40 68 48 72 V52 C40 48 30 48 22 54 Z M74 74 C66 68 56 68 48 72 V52 C56 48 66 48 74 54 Z" strokeWidth={2.6} />
      <path d="M48 52 V72" strokeWidth={2} />
      <path className="fine" d="M28 58 L42 55 M28 63 L42 60 M28 68 L42 65 M68 58 L54 55 M68 63 L54 60 M68 68 L54 65" strokeWidth={1.4} />
      <path d="M44 50 V36 H52 V50" strokeWidth={2.6} />
      <path d="M48 36 V33" strokeWidth={1.8} />
      <path className="spot" d="M48 21 C51 25 52 28 51.5 31 C51 33 49.5 33.5 48 33.5 C46.5 33.5 45 33 44.5 31 C44 28 45 25 48 21 Z" />
      <path d="M48 16 C53 22 56 27 55 31 C54 34 51 35 48 35 C45 35 42 34 41 31 C40 27 43 22 48 16 Z" strokeWidth={2.4} />
      <path className="fine" d={ticks(48, 26, 12, 16, 5, -150, 120)} strokeWidth={1.4} strokeLinecap="butt" />
    </Plate>
  );
}
