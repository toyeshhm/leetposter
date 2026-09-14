import { useId, type ReactElement } from "react";
import { hatch, ticks } from "@/components/art/hatch";
import { Plate, type ArtProps } from "@/components/art/Plate";
import type { Achievement } from "@/server/achievements";

/* Achievement marks, cut in the same white-line style as the seat sigils: ink is currentColor, one amber spot. */

const FLAME = "M48 18 C53 26 56 32 55 38 C54 42 51 44 48 44 C45 44 42 42 41 38 C40 32 43 26 48 18 Z";

/** A single candle in a dish, newly lit. */
export function FirstCandleMark(props: ArtProps): ReactElement {
  return (
    <Plate name="First Candle: one candle in a dish" {...props}>
      <path className="fine" d={ticks(48, 34, 20, 26, 7, -150, 120)} strokeWidth={1.6} strokeLinecap="butt" />
      <path d="M22 76 H74 L68 88 H28 Z" strokeWidth={3} />
      <path className="fine" d={hatch(24, 78, 48, 8, 3.2, 0)} strokeWidth={1.1} strokeLinecap="butt" />
      <path d="M40 76 V50 H56 V76" strokeWidth={3} />
      <path className="fine" d="M43 50 V60 Q43 64 46 63 M53 50 V56 Q53 59 50 58" strokeWidth={1.8} />
      <path d="M48 50 V44" strokeWidth={2} />
      <path className="spot" d={FLAME} />
      <path d={FLAME} strokeWidth={2.4} />
    </Plate>
  );
}

const ROW = [16, 32, 48, 64, 80];
const HEIGHTS = [58, 50, 44, 52, 60];

/** Five candles in a row, the middle one lit. */
export function CompanyOfFiveMark(props: ArtProps): ReactElement {
  return (
    <Plate name="Company of Five: five candles in a row" {...props}>
      <path d="M8 86 H88" strokeWidth={3.4} />
      {ROW.map((x, i) => {
        const top = HEIGHTS[i] ?? 50;
        const lit = i === 2;
        const flame = `M${String(x)} ${String(top - 20)} C${String(x + 4)} ${String(top - 14)} ${String(x + 5)} ${String(top - 10)} ${String(x)} ${String(top - 4)} C${String(x - 5)} ${String(top - 10)} ${String(x - 4)} ${String(top - 14)} ${String(x)} ${String(top - 20)} Z`;
        return (
          <g key={x}>
            <path d={`M${String(x - 5)} 86 V${String(top)} H${String(x + 5)} V86`} strokeWidth={2.4} />
            <path d={`M${String(x)} ${String(top)} V${String(top - 4)}`} strokeWidth={1.8} />
            {lit ? <path className="spot" d={flame} /> : null}
            <path className={lit ? "" : "fine"} d={flame} strokeWidth={lit ? 2.2 : 1.4} />
          </g>
        );
      })}
    </Plate>
  );
}

const MASK = "M18 26 C24 14 40 10 48 14 C56 10 72 14 78 26 C81 34 75 42 64 42 C57 42 52 38 48 37 C44 38 39 42 32 42 C21 42 15 34 18 26 Z";
const EYES = "M27 27 Q35 19 43 27 Q35 34 27 27 Z M53 27 Q61 19 69 27 Q61 34 53 27 Z";

/** A mask hung on a nail, the face beneath it shown. */
export function UnmaskedMark(props: ArtProps): ReactElement {
  const id = useId();
  return (
    <Plate name="Unmasked: a mask on a nail above a bare face" {...props}>
      <clipPath id={`${id}mask`}>
        <path d={`${MASK} ${EYES}`} clipRule="evenodd" />
      </clipPath>
      <circle className="spot" cx={48} cy={8} r={3} />
      <path d="M48 10 V14" strokeWidth={2} />
      <path className="fine" clipPath={`url(#${id}mask)`} d={hatch(14, 8, 68, 36, 3.4, 28)} strokeWidth={1.1} strokeLinecap="butt" />
      <path d={MASK} strokeWidth={3} />
      <path d={EYES} strokeWidth={2} />
      <circle cx={48} cy={68} r={18} strokeWidth={3} />
      <circle className="solid" cx={41} cy={65} r={2.2} />
      <circle className="solid" cx={55} cy={65} r={2.2} />
      <path d="M40 75 Q48 81 56 75" strokeWidth={2.2} />
      <path className="fine" d="M30 88 Q48 92 66 88" strokeWidth={1.6} />
    </Plate>
  );
}

/** A quill over a ribbon of words. */
export function SilverTongueMark(props: ArtProps): ReactElement {
  return (
    <Plate name="Silver Tongue: a quill over a ribbon of words" {...props}>
      <path d="M26 72 C30 50 46 30 76 14 C70 40 56 58 34 72 Z" strokeWidth={3} />
      <path className="fine" d="M34 62 L58 30 M40 54 L66 24 M46 46 L72 18 M30 68 L50 40" strokeWidth={1.4} />
      <path d="M26 72 L18 84" strokeWidth={2.6} />
      <path className="solid" d="M18 84 L22 78 L24 82 Z" />
      <path className="spot" d="M10 84 C24 76 36 92 48 84 C60 76 72 92 86 84 V90 C72 98 60 82 48 90 C36 98 24 82 10 90 Z" />
      <path d="M10 84 C24 76 36 92 48 84 C60 76 72 92 86 84 M10 90 C24 82 36 98 48 90 C60 82 72 98 86 90" strokeWidth={2} />
      <path className="fine" d={ticks(78, 14, 6, 11, 5, 200, 120)} strokeWidth={1.4} strokeLinecap="butt" />
    </Plate>
  );
}

const PALM = "M30 88 V50 C30 44 34 40 40 40 H58 C64 40 68 44 68 52 V88 Z";

/** An open hand, nothing hidden in it. */
export function CleanHandsMark(props: ArtProps): ReactElement {
  const id = useId();
  return (
    <Plate name="Clean Hands: an open palm" {...props}>
      <clipPath id={`${id}palm`}>
        <path d={PALM} />
      </clipPath>
      <path className="fine" clipPath={`url(#${id}palm)`} d={hatch(30, 40, 38, 48, 3.6, 60)} strokeWidth={1.1} strokeLinecap="butt" />
      <path d={PALM} strokeWidth={3} />
      <path d="M36 42 V14 a4 4 0 0 1 8 0 V40 M46 40 V8 a4 4 0 0 1 8 0 V40 M56 42 V16 a4 4 0 0 1 8 0 V46" strokeWidth={2.6} />
      <path d="M30 56 L14 40 a4 4 0 0 1 6 -6 L34 48" strokeWidth={2.6} />
      <circle className="spot" cx={49} cy={62} r={5} />
      <circle cx={49} cy={62} r={5} strokeWidth={2} />
      <path className="fine" d={ticks(49, 62, 8, 12, 8)} strokeWidth={1.3} strokeLinecap="butt" />
    </Plate>
  );
}

/** A door left open, the light beyond it. */
export function CastOutMark(props: ArtProps): ReactElement {
  return (
    <Plate name="Cast Out: an open door" {...props}>
      <path className="spot" d="M52 24 H72 V86 H52 Z" />
      <path className="fine" d={hatch(52, 24, 20, 62, 3.2, 90)} strokeWidth={1} strokeLinecap="butt" />
      <path d="M20 90 V12 H76 V90" strokeWidth={3.4} />
      <path d="M26 12 V90 M70 12 V90" strokeWidth={1.8} />
      <path d="M26 16 L52 24 V86 L26 90 Z" strokeWidth={3} />
      <path className="fine" d="M30 24 V80 M34 26 V78 M38 27 V78 M42 28 V78 M46 29 V78" strokeWidth={1.2} />
      <circle className="solid" cx={47} cy={56} r={2.4} />
      <path d="M12 90 H84" strokeWidth={3.4} />
      <path className="solid" d="M78 88 L84 80 L88 88 Z M84 84 L90 76 L94 84 Z" />
    </Plate>
  );
}

const MOON = "M56 10 A38 38 0 1 0 56 86 A29 29 0 1 1 56 10 Z";

/** A crescent moon over a candle burned to a stub. */
export function LongNightMark(props: ArtProps): ReactElement {
  const id = useId();
  return (
    <Plate name="Long Night: a crescent moon over a candle stub" {...props}>
      <clipPath id={`${id}moon`}>
        <path d={MOON} />
      </clipPath>
      <path className="fine" clipPath={`url(#${id}moon)`} d={hatch(10, 8, 50, 80, 3.6, 30)} strokeWidth={1.1} strokeLinecap="butt" />
      <path d={MOON} strokeWidth={3} />
      <path className="fine" d="M70 20 L72 26 M66 24 L76 22 M80 44 L82 50 M76 48 L86 46" strokeWidth={1.6} />
      <path d="M62 90 V74 H78 V90" strokeWidth={2.6} />
      <path className="fine" d="M66 74 V82 Q66 85 69 84" strokeWidth={1.6} />
      <path d="M70 74 V70" strokeWidth={1.8} />
      <path className="spot" d="M70 58 C73 62 74 65 73 68 C72 70 71 70 70 70 C69 70 68 70 67 68 C66 65 67 62 70 58 Z" />
      <path d="M56 90 H84" strokeWidth={2.6} />
    </Plate>
  );
}

const HALF = "M14 40 C18 26 32 20 46 26 V70 C34 72 26 68 22 62 C12 54 10 48 14 40 Z";
const HALF_EYE = "M22 42 Q30 34 38 42 Q30 50 22 42 Z";

/** Two half-masks back to back, one hatched, one bare. */
export function TwoFacesMark(props: ArtProps): ReactElement {
  const id = useId();
  return (
    <Plate name="Two Faces: two half-masks back to back" {...props}>
      <clipPath id={`${id}half`}>
        <path d={`${HALF} ${HALF_EYE}`} clipRule="evenodd" />
      </clipPath>
      <path className="fine" clipPath={`url(#${id}half)`} d={hatch(10, 20, 40, 54, 3.4, 28)} strokeWidth={1.1} strokeLinecap="butt" />
      <path d={HALF} strokeWidth={3} />
      <path d={HALF_EYE} strokeWidth={2} />
      <g transform="translate(96 0) scale(-1 1)">
        <path d={HALF} strokeWidth={3} />
        <path className="spot" d={HALF_EYE} />
        <path d={HALF_EYE} strokeWidth={2} />
        <path className="spot-line" d="M30 24 L28 34 L34 42 L29 52 L33 64" strokeWidth={2.2} strokeLinejoin="bevel" />
      </g>
      <path d="M48 20 V76" strokeWidth={2} strokeDasharray="4 4" />
      <path d="M30 82 Q48 92 66 82" strokeWidth={2.6} />
    </Plate>
  );
}

export const MARKS: Record<Achievement["id"], (props: ArtProps) => ReactElement> = {
  "first-candle": FirstCandleMark,
  "company-of-five": CompanyOfFiveMark,
  unmasked: UnmaskedMark,
  "silver-tongue": SilverTongueMark,
  "clean-hands": CleanHandsMark,
  "cast-out": CastOutMark,
  "long-night": LongNightMark,
  "two-faces": TwoFacesMark,
};
