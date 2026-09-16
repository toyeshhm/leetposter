import { useId, type ReactElement, type ReactNode } from "react";
import { hatch, ticks } from "@/components/art/hatch";
import { Plate, type ArtProps } from "@/components/art/Plate";

/*
 * Portraits, 96 square, catalog kind "avatar". Hood silhouettes, faces mostly in the dark of the
 * hood, one object each. At 32px the .fine hatching hides and every stroke thickens (globals.css),
 * so the silhouette, the face rim and the object are the only bold lines.
 */

const HOOD = "M6 96 V82 C6 68 22 62 34 58 C26 46 28 22 48 12 C68 22 70 46 62 58 C74 62 90 68 90 82 V96";
const FACE = "M35 50 C33 34 40 24 48 22 C56 24 63 34 61 50 C58 57 38 57 35 50 Z";
const SMILE = "M43 51 Q48 55 53 51";

interface BustProps {
  hood?: string;
  face?: string;
  /** Regions the hatching must not cross: objects held in front of the cloth. */
  occlude?: string;
  /** Which side the candle is on. */
  light?: "left" | "right";
  children?: ReactNode;
}

/** Shoulders and a hood lit from one side; the face is the dark inside the hood. */
function Bust({ hood = HOOD, face = FACE, occlude = "", light = "left", children }: BustProps): ReactElement {
  const id = useId();
  const dense = hatch(light === "left" ? 4 : 48, 10, 44, 86, 3.4, 75);
  const sparse = hatch(light === "left" ? 48 : 4, 10, 44, 86, 6.5, 75);
  return (
    <>
      <mask id={`${id}cloth`}>
        <path d={`${hood} Z`} fill="#fff" stroke="none" />
        <path d={`${face} ${occlude}`} fill="#000" stroke="none" />
      </mask>
      <path className="fine" mask={`url(#${id}cloth)`} d={dense + sparse} strokeWidth={1.1} strokeLinecap="butt" />
      <path d={hood} strokeWidth={3.2} />
      <path d={face} strokeWidth={2.4} />
      {children}
    </>
  );
}

const QUILL = "M84 26 C92 32 90 48 84 60 L74 66 C70 54 74 36 84 26 Z";

/** A hood with a quill held nib-down at the shoulder. */
export function ScribeAvatar(props: ArtProps): ReactElement {
  return (
    <Plate name="The Scribe: a hood and a quill" {...props}>
      <Bust occlude={QUILL}>
        <path d={SMILE} strokeWidth={2} />
        <path d={QUILL} strokeWidth={2.6} />
        <path className="fine" d="M82 32 L78 44 M84 38 L79 50 M85 46 L80 56" strokeWidth={1.4} />
        <path d="M74 66 L64 90" strokeWidth={2.6} />
        <circle className="spot" cx={63} cy={92} r={2.6} />
      </Bust>
    </Plate>
  );
}

/** The issued hood, patched once at the shoulder. Also the guest default. */
export function PlainHoodAvatar(props: ArtProps): ReactElement {
  return (
    <Plate name="Plain Hood" {...props}>
      <Bust>
        <path d={SMILE} strokeWidth={2} />
        <path className="fine" d="M14 78 H26 V90 H14 Z M16 80 L24 88 M24 80 L16 88" strokeWidth={1.4} />
      </Bust>
    </Plate>
  );
}

const HOOD_DEEP = "M6 96 V82 C6 68 22 62 34 60 C24 50 22 24 40 12 C50 6 62 12 64 26 C66 40 68 52 62 60 C74 64 90 70 90 82 V96";
const FACE_DEEP = "M36 58 C36 50 42 46 48 45 C54 46 60 50 60 58 C56 62 40 62 36 58 Z";

/** A hood pulled so low the candle finds only a chin. */
export function DeepHoodAvatar(props: ArtProps): ReactElement {
  const id = useId();
  return (
    <Plate name="Deep Hood: pulled low, only a chin in the light" {...props}>
      <Bust hood={HOOD_DEEP} face={FACE_DEEP}>
        <clipPath id={`${id}chin`}>
          <path d="M41 55 C43 51 53 51 55 55 C54 60 42 60 41 55 Z" />
        </clipPath>
        <path className="fine" clipPath={`url(#${id}chin)`} d={hatch(40, 50, 16, 12, 2.6, 0)} strokeWidth={1.1} strokeLinecap="butt" />
        <path d="M44 54 Q48 56 52 54" strokeWidth={2} />
        <path className="fine" d="M30 44 C34 38 40 34 46 34 M34 52 C38 46 44 42 50 42" strokeWidth={1.4} />
      </Bust>
    </Plate>
  );
}

/** A veil over the hood: the face is a curtain of fine lines. */
export function VeiledAvatar(props: ArtProps): ReactElement {
  const id = useId();
  return (
    <Plate name="The Veiled: a veil hangs over the hood" {...props}>
      <Bust>
        <clipPath id={`${id}veil`}>
          <path d="M31 27 H65 V62 Q61 67 57 62 Q53 67 48 62 Q43 67 39 62 Q35 67 31 62 Z" />
        </clipPath>
        <path className="fine" clipPath={`url(#${id}veil)`} d={hatch(31, 27, 34, 40, 2.6, 90)} strokeWidth={1.1} strokeLinecap="butt" />
        <path d="M31 27 H65" strokeWidth={2.4} />
        <path d="M31 62 Q35 67 39 62 Q43 67 48 62 Q53 67 57 62 Q61 67 65 62" strokeWidth={2.2} />
      </Bust>
    </Plate>
  );
}

const CLOAK = "M6 96 V84 C6 72 24 66 38 62 M58 62 C72 66 90 72 90 84 V96";
const JAW = "M37 46 C37 58 41 64 48 64 C55 64 59 58 59 46";

/** A brim wide enough to hide a hint under. */
export function WideHatAvatar(props: ArtProps): ReactElement {
  const id = useId();
  return (
    <Plate name="Wide Hat: a broad brim and a shadowed face" {...props}>
      <clipPath id={`${id}crown`}>
        <path d="M30 42 C30 26 36 18 48 18 C60 18 66 26 66 42 Z" />
      </clipPath>
      <path className="fine" clipPath={`url(#${id}crown)`} d={hatch(30, 18, 20, 24, 3.2, 70)} strokeWidth={1.1} strokeLinecap="butt" />
      <path className="fine" d={hatch(6, 62, 40, 34, 4, 75)} strokeWidth={1.1} strokeLinecap="butt" />
      <path d={CLOAK} strokeWidth={3.2} />
      <path d={JAW} strokeWidth={2.4} />
      <path d="M44 57 Q48 60 52 57" strokeWidth={2} />
      <path d="M30 42 C30 26 36 18 48 18 C60 18 66 26 66 42" strokeWidth={3} />
      <path className="fine" d="M32 36 C40 33 56 33 64 36" strokeWidth={1.6} />
      <path d="M6 42 C20 36 76 36 90 42 C76 48 20 48 6 42 Z" strokeWidth={3.2} />
    </Plate>
  );
}

/** A capotain, for those who read the bounds twice. */
export function TallHatAvatar(props: ArtProps): ReactElement {
  const id = useId();
  return (
    <Plate name="Tall Hat: a capotain with a buckled band" {...props}>
      <clipPath id={`${id}crown`}>
        <path d="M34 44 L38 8 H58 L62 44 Z" />
      </clipPath>
      <path className="fine" clipPath={`url(#${id}crown)`} d={hatch(34, 8, 14, 36, 3.2, 100)} strokeWidth={1.1} strokeLinecap="butt" />
      <path className="fine" d={hatch(6, 62, 40, 34, 4, 75)} strokeWidth={1.1} strokeLinecap="butt" />
      <path d={CLOAK} strokeWidth={3.2} />
      <path d={JAW} strokeWidth={2.4} />
      <path d="M44 58 Q48 61 52 58" strokeWidth={2} />
      <path d="M34 44 L38 8 H58 L62 44" strokeWidth={3} />
      <path d="M35 36 H61" strokeWidth={2} />
      <path className="spot" d="M45 33 H51 V39 H45 Z" />
      <path d="M45 33 H51 V39 H45 Z" strokeWidth={1.6} />
      <path d="M18 46 C30 40 66 40 78 46" strokeWidth={3.2} />
    </Plate>
  );
}

const DOMINO = "M31 36 C38 29 44 34 48 34 C52 34 58 29 65 36 C66 43 62 49 55 49 C51 49 49 44 48 44 C47 44 45 49 41 49 C34 49 30 43 31 36 Z";
const EYEHOLES = "M36 39 Q42 33 47 39 Q42 45 36 39 Z M49 39 Q54 33 60 39 Q54 45 49 39 Z";

/** A half-mask over exactly the half that would give it away. */
export function HalfMaskAvatar(props: ArtProps): ReactElement {
  return (
    <Plate name="Half Mask: a domino over the eyes" {...props}>
      <Bust>
        {/* solid rather than hatched: at 32 the hatching goes and a band of ink across the eyes is what is left */}
        <path className="solid" fillRule="evenodd" d={`${DOMINO} ${EYEHOLES}`} />
        <path d={SMILE} strokeWidth={2} />
      </Bust>
    </Plate>
  );
}

const HOOD_PROFILE = "M6 96 V82 C6 68 20 62 32 60 C22 46 26 18 46 12 C60 10 68 22 66 36 L62 52 C74 58 90 66 90 82 V96";
const BEAK = "M56 40 C68 40 82 46 88 60 C78 56 66 54 58 52 Z";

/** The Company physician, in profile: one glass eye and a long beak. */
export function BeakedMaskAvatar(props: ArtProps): ReactElement {
  return (
    <Plate name="Beaked Mask: a physician's mask in profile" {...props}>
      <Bust hood={HOOD_PROFILE} face="" occlude={BEAK}>
        <path d="M50 24 C58 22 64 30 62 44 C60 52 56 56 50 56 C46 50 46 30 50 24 Z" strokeWidth={2.4} />
        <circle cx={56} cy={33} r={6} strokeWidth={2.6} />
        <circle className="fine" cx={56} cy={33} r={3} strokeWidth={1.4} />
        <path d={BEAK} strokeWidth={2.6} />
        <path className="fine" d="M60 46 C70 46 80 50 86 58" strokeWidth={1.4} />
        <path className="fine" d="M50 32 C42 30 36 30 30 34 M50 36 C42 36 36 38 30 42" strokeWidth={1.4} />
      </Bust>
    </Plate>
  );
}

const RAVEN = "M26 84 C22 70 26 52 40 44 C44 32 54 24 64 26 L70 30 L88 36 L72 40 C74 50 68 60 62 68 C62 76 64 80 68 84 Z";

/** The raven that sat at the table one night. */
export function RavenAvatar(props: ArtProps): ReactElement {
  const id = useId();
  return (
    <Plate name="The Raven: a raven on a rail" {...props}>
      <clipPath id={`${id}body`}>
        <path d={RAVEN} />
      </clipPath>
      <path className="fine" clipPath={`url(#${id}body)`} d={hatch(26, 24, 40, 60, 3.4, 60)} strokeWidth={1.1} strokeLinecap="butt" />
      <path d={RAVEN} strokeWidth={3.2} />
      <path className="solid" d="M70 30 L90 36 L72 41 Z" />
      <path className="fine" d="M44 54 C50 52 56 52 60 56 M42 62 C48 60 54 60 58 64 M40 70 C46 68 52 68 56 72" strokeWidth={1.4} />
      <circle className="spot" cx={64} cy={33} r={2.6} />
      <circle cx={64} cy={33} r={2.6} strokeWidth={1.6} />
      <path d="M26 84 L12 92 L30 87" strokeWidth={2.4} />
      <path d="M4 84 H92" strokeWidth={3.2} />
      <path d="M38 84 L34 90 M44 84 L44 90 M62 84 L60 90 M68 84 L70 90" strokeWidth={2} />
    </Plate>
  );
}

const CANDLE = "M74 44 H84 V72 H74 Z";

/** Holds the light for the others. */
export function CandleBearerAvatar(props: ArtProps): ReactElement {
  return (
    <Plate name="Candle-Bearer: a hood holding up a candle" {...props}>
      <Bust light="right" occlude={`${CANDLE} M70 68 C70 78 88 78 88 68 Z`}>
        <path d={SMILE} strokeWidth={2} />
        <path d={CANDLE} strokeWidth={2.6} />
        <path className="fine" d="M76 44 v10 c0 3 -3 3 -3 0 M82 44 v6" strokeWidth={1.4} />
        <path d="M70 68 C70 78 88 78 88 68" strokeWidth={2.6} />
        <path className="fine" d="M74 72 V78 M79 73 V79 M84 72 V78" strokeWidth={1.4} />
        <path d="M79 44 V39" strokeWidth={2} />
        <path className="spot" d="M79 22 C83 28 85 33 84 37 C83 40 81 41 79 41 C77 41 75 40 74 37 C73 33 75 28 79 22 Z" />
        <path d="M79 16 C86 26 89 33 87 39 C86 43 83 45 79 45 C75 45 72 43 71 39 C69 33 72 26 79 16 Z" strokeWidth={2.4} />
      </Bust>
    </Plate>
  );
}

/** A hood lit from inside. */
export function LanternHoodAvatar(props: ArtProps): ReactElement {
  return (
    <Plate name="Lantern Hood: a hood glowing from within" {...props}>
      <Bust>
        <path className="spot" d={FACE} />
        <path className="cut" d="M40 40 L45 42 M56 40 L51 42" strokeWidth={2.6} />
        <path className="fine" d={ticks(48, 40, 17, 22, 9, -160, 140)} strokeWidth={1.4} strokeLinecap="butt" />
      </Bust>
    </Plate>
  );
}

const LEDGER = "M28 66 H68 V94 H28 Z";

/** Keeps the ledger of every hall. */
export function WardenAvatar(props: ArtProps): ReactElement {
  return (
    <Plate name="The Warden: a hood holding a clasped ledger" {...props}>
      <Bust occlude={LEDGER}>
        <path d="M43 50 H53" strokeWidth={2} />
        <path d={LEDGER} strokeWidth={2.8} />
        <path d="M33 66 V94" strokeWidth={2} />
        <path className="fine" d="M65 69 V91 M40 74 H60 M40 79 H56" strokeWidth={1.4} />
        <path className="spot" d="M63 76 H71 V84 H63 Z" />
        <path d="M63 76 H71 V84 H63 Z" strokeWidth={1.8} />
        <path className="fine" d="M36 62 a3 2 0 1 0 6 0 a3 2 0 1 0 -6 0 M54 62 a3 2 0 1 0 6 0 a3 2 0 1 0 -6 0" strokeWidth={1.4} />
      </Bust>
    </Plate>
  );
}

const FACE_OPEN = "M33 52 C31 32 39 20 48 18 C57 20 65 32 63 52 C60 60 36 60 33 52 Z";
/* Three links, wide enough that they survive the 5-unit stroke a 32px plate gets, and a fourth snapped open. */
const COLLAR = "M27 67 a7 5 0 1 0 14 0 a7 5 0 1 0 -14 0 M39 67 a7 5 0 1 0 14 0 a7 5 0 1 0 -14 0 M51 67 a7 5 0 1 0 14 0 a7 5 0 1 0 -14 0";

/** Cast out with a chain still on; the chain broke first. */
export function DovAvatar(props: ArtProps): ReactElement {
  const id = useId();
  return (
    <Plate name="Dov: a hood pushed back, a broken chain at the neck" {...props}>
      <Bust face={FACE_OPEN}>
        <clipPath id={`${id}chin`}>
          <path d="M38 48 C40 42 56 42 58 48 C57 56 39 56 38 48 Z" />
        </clipPath>
        <path className="fine" clipPath={`url(#${id}chin)`} d={hatch(36, 42, 24, 14, 2.6, 0)} strokeWidth={1.1} strokeLinecap="butt" />
        <path d="M43 51 Q48 49 53 51" strokeWidth={2} />
        <path d="M40 36 L44 46" strokeWidth={2.2} />
        <circle className="solid" cx={54} cy={38} r={2.4} />
        <path d={COLLAR} strokeWidth={2.4} />
        <path d="M64 71 L70 82" strokeWidth={2.6} />
        {/* the link that broke: the one amber mark, and the thing that names him */}
        <path className="spot-line" d="M67 84 a6 6 0 1 0 9 5" strokeWidth={3} />
      </Bust>
    </Plate>
  );
}

const CAT = "M30 78 C26 64 32 54 40 52 C36 46 36 36 40 30 L36 12 L50 24 H56 L70 12 L66 30 C70 36 70 46 66 52 C74 54 78 64 74 78 Z";

/** Sits on the manuscript at the worst moment. */
export function CatAvatar(props: ArtProps): ReactElement {
  const id = useId();
  return (
    <Plate name="The Cat: a cat sitting on a manuscript" {...props}>
      <clipPath id={`${id}fur`}>
        <path d={CAT} />
      </clipPath>
      <path className="fine" clipPath={`url(#${id}fur)`} d={hatch(26, 12, 26, 66, 3.4, 70) + hatch(52, 12, 26, 66, 6, 70)} strokeWidth={1.1} strokeLinecap="butt" />
      <path d="M6 80 L90 76 L94 92 L2 94 Z" strokeWidth={2.6} />
      <path className="fine" d="M12 85 H26 M80 82 H88 M10 89 H24" strokeWidth={1.4} />
      <path d={CAT} strokeWidth={3.2} />
      <path d="M74 78 C86 76 92 68 84 60" strokeWidth={2.4} />
      <path className="spot" d="M40 41 Q45 37 50 41 Q45 45 40 41 Z M56 41 Q61 37 66 41 Q61 45 56 41 Z" />
      <path className="cut" d="M45 38 V44 M61 38 V44" strokeWidth={1.6} />
      <path className="solid" d="M50 48 L56 48 L53 51 Z" />
      <path className="fine" d="M46 50 L30 48 M46 52 L32 56 M60 50 L76 48 M60 52 L74 56" strokeWidth={1.2} />
      <path d="M53 51 V55 M50 55 Q53 57 56 55" strokeWidth={1.6} />
    </Plate>
  );
}
