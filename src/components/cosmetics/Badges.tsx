import { useId, type ReactElement } from "react";
import { d, hatch, ticks } from "@/components/art/hatch";
import { Plate, type ArtProps } from "@/components/art/Plate";

/*
 * Roster marks, catalog kind "badge". They are read at 20px next to a name, where globals.css
 * drops the .fine hatching and sets every stroke to 5 units: nothing here is finer than 10 units
 * apart, and each badge is one silhouette plus at most one inner mark.
 */

const SHIELD = "M20 14 H76 V58 C76 76 62 86 48 92 C34 86 20 76 20 58 Z";

/** One candle, first lit. */
export function FirstCandleBadge(props: ArtProps): ReactElement {
  const id = useId();
  return (
    <Plate name="First Candle" {...props}>
      <clipPath id={`${id}wax`}>
        <path d="M34 42 H62 V86 H34 Z" />
      </clipPath>
      <path className="fine" clipPath={`url(#${id}wax)`} d={hatch(50, 42, 14, 44, 4, 6)} strokeWidth={1.2} strokeLinecap="butt" />
      <path d="M34 42 H62 V86 H34 Z" strokeWidth={4} />
      <path d="M48 42 V34" strokeWidth={3} />
      <path className="spot" d="M48 8 C56 20 60 28 57 34 C55 38 52 40 48 40 C44 40 41 38 39 34 C36 28 40 20 48 8 Z" />
      <path d="M48 6 C58 20 62 28 59 35 C57 40 53 42 48 42 C43 42 39 40 37 35 C34 28 38 20 48 6 Z" strokeWidth={3.4} />
    </Plate>
  );
}

/** Five halls, cut as a tally. */
export function CompanyOfFiveBadge(props: ArtProps): ReactElement {
  return (
    <Plate name="Company of Five" {...props}>
      <path d="M16 20 V76 M34 20 V76 M52 20 V76 M70 20 V76" strokeWidth={5} />
      <path className="spot-line" d="M8 70 L80 26" strokeWidth={6} />
    </Plate>
  );
}

const LIFTED = "M26 16 C26 8 38 4 54 4 C70 4 82 8 82 16 C82 26 70 32 54 32 C38 32 26 26 26 16 Z";
const LIFTED_EYES = "M37 17 Q42 11 47 17 Q42 23 37 17 Z M61 17 Q66 11 71 17 Q66 23 61 17 Z";

/** A mask lifted off a face: the mask keeps its eyeholes, so at 20px it is a mask and not a smear. */
export function UnmaskedBadge(props: ArtProps): ReactElement {
  return (
    <Plate name="Unmasked" {...props}>
      <path d="M22 56 C22 38 32 28 46 28 C60 28 70 38 70 56 C70 76 60 88 46 88 C32 88 22 76 22 56 Z" strokeWidth={4} />
      <path className="solid" d="M35 56 a5 5 0 1 0 0.1 0 M55 56 a5 5 0 1 0 0.1 0" />
      <g transform="rotate(-13 54 18)">
        <path className="spot" fillRule="evenodd" d={`${LIFTED} ${LIFTED_EYES}`} />
        <path d={LIFTED} strokeWidth={3} />
      </g>
    </Plate>
  );
}

const TONGUE = "M35 90 C31 72 33 58 37 50 L27 14 L44 44 L48 46 L52 44 L69 14 L59 50 C63 58 65 72 61 90 Z";

/** A forked tongue, lit at the two tips. */
export function SilverTongueBadge(props: ArtProps): ReactElement {
  const id = useId();
  return (
    <Plate name="Silver Tongue" {...props}>
      <clipPath id={`${id}tongue`}>
        <path d={TONGUE} />
      </clipPath>
      <path className="fine" clipPath={`url(#${id}tongue)`} d={hatch(48, 44, 28, 48, 5, 74)} strokeWidth={1.3} strokeLinecap="butt" />
      <path className="spot" d="M27 14 L40 37 L34 40 Z M69 14 L56 37 L62 40 Z" />
      <path d={TONGUE} strokeWidth={4} />
      <path d="M48 52 V84" strokeWidth={3} />
    </Plate>
  );
}

/** An open palm, nothing on it. */
export function CleanHandsBadge(props: ArtProps): ReactElement {
  const id = useId();
  const palm = "M30 88 C22 74 22 60 26 48 L26 24 H36 V44 L40 22 H50 L48 44 L54 24 H64 L60 46 L68 32 L76 38 L68 66 C64 80 58 88 52 88 Z";
  return (
    <Plate name="Clean Hands" {...props}>
      <clipPath id={`${id}palm`}>
        <path d={palm} />
      </clipPath>
      <path className="fine" clipPath={`url(#${id}palm)`} d={hatch(26, 46, 50, 44, 5, 60)} strokeWidth={1.3} strokeLinecap="butt" />
      <path d={palm} strokeWidth={4} />
    </Plate>
  );
}

/** A gate, and a way out through it. */
export function CastOutBadge(props: ArtProps): ReactElement {
  return (
    <Plate name="Cast Out" {...props}>
      <path d="M14 88 V44 A34 34 0 0 1 82 44 V88" strokeWidth={5} />
      <path d="M14 88 H82" strokeWidth={4} />
      <path className="spot-line" d="M30 62 H74" strokeWidth={6} />
      <path d="M60 46 L78 62 L60 78" strokeWidth={5} strokeLinejoin="miter" />
    </Plate>
  );
}

/** A stub in a pool of wax. */
export function LongNightBadge(props: ArtProps): ReactElement {
  const id = useId();
  return (
    <Plate name="Long Night" {...props}>
      <clipPath id={`${id}pool`}>
        <path d="M12 74 C24 62 72 62 84 74 C74 86 22 86 12 74 Z" />
      </clipPath>
      <path className="fine" clipPath={`url(#${id}pool)`} d={hatch(12, 62, 72, 24, 4.5, -8)} strokeWidth={1.3} strokeLinecap="butt" />
      <path d="M12 74 C24 62 72 62 84 74 C74 86 22 86 12 74 Z" strokeWidth={4} />
      <path d="M34 70 V50 H62 V70" strokeWidth={4} />
      <path d="M48 50 V42" strokeWidth={3} />
      <path className="spot" d="M48 16 C57 28 61 36 58 42 C56 46 52 48 48 48 C44 48 40 46 38 42 C35 36 39 28 48 16 Z" />
      <path d="M48 14 C59 28 63 36 60 43 C58 48 54 50 48 50 C42 50 38 48 36 43 C33 36 37 28 48 14 Z" strokeWidth={3.4} />
    </Plate>
  );
}

/** Two masks, one over the other. */
export function TwoFacesBadge(props: ArtProps): ReactElement {
  const mask = "M0 22 C0 10 10 2 22 2 C34 2 44 10 44 22 C44 40 34 52 22 52 C10 52 0 40 0 22 Z";
  return (
    <Plate name="Two Faces" {...props}>
      <g transform="translate(6 12)">
        <path d={mask} strokeWidth={4} />
        <path className="solid" d="M12 22 a4.5 4.5 0 1 0 0.1 0 M28 22 a4.5 4.5 0 1 0 0.1 0" />
      </g>
      <g transform="translate(46 32)">
        <path className="spot" d={mask} />
        <path d={mask} strokeWidth={4} />
        <path className="cut" d="M12 22 a4.5 4.5 0 1 0 0.1 0 M28 22 a4.5 4.5 0 1 0 0.1 0" strokeWidth={2} />
      </g>
    </Plate>
  );
}

/** Season mark: a candle under a waning moon. */
export function SeasonLongNightBadge(props: ArtProps): ReactElement {
  const id = useId();
  return (
    <Plate name="The Long Night, first season" {...props}>
      <mask id={`${id}moon`}>
        <circle cx={48} cy={44} r={22} fill="#fff" />
        <circle cx={62} cy={38} r={20} fill="#000" />
      </mask>
      <path d={SHIELD} strokeWidth={4} />
      <circle className="spot" cx={48} cy={44} r={22} mask={`url(#${id}moon)`} />
      <path d="M48 22 A22 22 0 1 0 48 66 A26 26 0 0 1 48 22 Z" strokeWidth={3.4} />
      <path d="M40 78 H56" strokeWidth={5} />
    </Plate>
  );
}

/* Six spokes and a pair of barbs on each, computed rather than listed, so the star is actually symmetrical. */
const FROST = ((): string => {
  const barbs = Array.from({ length: 6 }, (_, k) => {
    const a = (k * Math.PI) / 3;
    const bx = 48 + 15 * Math.cos(a);
    const by = 48 + 15 * Math.sin(a);
    const arm = (turn: number): string => d`M${bx} ${by} L${bx + 9 * Math.cos(a + turn)} ${by + 9 * Math.sin(a + turn)}`;
    return arm(Math.PI / 3) + arm(-Math.PI / 3);
  }).join("");
  return ticks(48, 48, 0, 25, 6, 0, 360) + barbs;
})();

/** Season mark: a frost star. */
export function SeasonFrostWatchBadge(props: ArtProps): ReactElement {
  return (
    <Plate name="The Frost Watch, second season" {...props}>
      <path d={SHIELD} strokeWidth={4} />
      <path d={FROST} strokeWidth={4.5} strokeLinecap="butt" />
      <circle className="spot" cx={48} cy={48} r={6} />
    </Plate>
  );
}
