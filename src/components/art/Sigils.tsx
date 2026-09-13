import { useId, type ReactElement } from "react";
import type { Seat } from "@/game/types";
import { d, hatch, ticks } from "./hatch";
import { Plate, type ArtProps } from "./Plate";

/** In-world seat names. */
export const SEAT_TITLES: Record<Seat, string> = {
  tagger: "Cartographer",
  oracle: "Oracle",
  bounds: "Warden",
  runner: "Herald",
};

const MAP = "M12 24 L30 14 L50 20 L68 12 L86 22 L82 44 L88 66 L74 84 L52 78 L32 86 L14 72 L20 50 Z";

/** A compass rose over a torn map fragment: the seat that sees the topic tags. */
export function CartographerSigil(props: ArtProps): ReactElement {
  const id = useId();
  return (
    <Plate name="Cartographer: a compass rose over a torn map" {...props}>
      <clipPath id={`${id}map`}>
        <path d={MAP} />
      </clipPath>
      <path d={MAP} strokeWidth={3.2} />
      <path className="fine" d="M14 46 C22 42 26 52 34 48 C40 45 44 54 50 52 C56 50 58 60 66 58 C72 56 76 64 84 62" strokeWidth={1.8} />
      <path className="fine" clipPath={`url(#${id}map)`} d={hatch(12, 54, 30, 34, 4, 45)} strokeWidth={1.2} strokeLinecap="butt" />
      <path className="fine" d={ticks(48, 46, 27, 31, 24)} strokeWidth={1.4} strokeLinecap="butt" />
      <path d="M48 46 L64 30 M48 46 L32 30 M48 46 L64 62 M48 46 L32 62" strokeWidth={2} />
      <path className="spot" d="M48 10 L54 44 L48 48 L42 44 Z" />
      <path d="M48 10 L54 44 L48 48 L42 44 Z" strokeWidth={2} />
      <path className="solid" d="M48 82 L54 48 L48 44 Z M84 46 L52 40 L48 46 Z M12 46 L44 52 L48 46 Z" />
      <path d="M48 82 L42 48 L48 44 L54 48 Z M84 46 L52 52 L48 46 L52 40 Z M12 46 L44 40 L48 46 L44 52 Z" strokeWidth={2} />
      <circle cx={48} cy={46} r={5} strokeWidth={2.5} />
    </Plate>
  );
}

/** An eye inside a candle flame: the seat that reads the hints. */
export function OracleSigil(props: ArtProps): ReactElement {
  return (
    <Plate name="Oracle: an eye within a candle flame" {...props}>
      <path className="fine" d={ticks(48, 38, 30, 37, 7, -160, 140)} strokeWidth={1.6} strokeLinecap="butt" />
      <path d="M37 62 H59 V88 H37 Z" strokeWidth={3} />
      <path className="fine" d="M40 62 V72 Q40 76 43 75 M56 62 V68 Q56 71 53 70" strokeWidth={1.8} />
      <path className="fine" d={hatch(50, 64, 8, 22, 3.2, 0)} strokeWidth={1.1} strokeLinecap="butt" />
      <path d="M48 62 V57" strokeWidth={2} />
      <path className="spot" d="M48 24 C53 32 58 39 56 48 C55 54 51 57 48 57 C45 57 41 54 40 48 C38 39 43 32 48 24 Z" />
      <path d="M48 10 C58 22 66 33 62 47 C60 55 54 59 48 59 C42 59 36 55 34 47 C30 33 38 22 48 10 Z" strokeWidth={3.2} />
      <path d="M38 44 Q48 33 58 44 Q48 55 38 44 Z" strokeWidth={2.2} />
      <circle className="solid" cx={48} cy={44} r={4.2} />
      <path className="fine" d="M48 33 V30 M40 36 L38 34 M56 36 L58 34" strokeWidth={1.6} />
    </Plate>
  );
}

const CHAIN = Array.from({ length: 9 }, (_, i) => {
  const x = 16 + i * 8;
  const rx = i % 2 === 0 ? 4.5 : 2.6;
  const ry = i % 2 === 0 ? 3 : 4.6;
  return d`M${x - rx} 10 a${rx} ${ry} 0 1 0 ${2 * rx} 0 a${rx} ${ry} 0 1 0 ${-2 * rx} 0`;
}).join("");

/** A portcullis under a chain, with a measuring rule: the seat that holds the constraints. */
export function WardenSigil(props: ArtProps): ReactElement {
  return (
    <Plate name="Warden: a chained portcullis over a measuring rule" {...props}>
      <path d={CHAIN} strokeWidth={2} />
      <path d="M14 82 V44 A34 34 0 0 1 82 44 V82" strokeWidth={4} />
      <path d="M24 82 V46 A24 24 0 0 1 72 46 V82" strokeWidth={2.2} />
      <path className="fine" d={ticks(48, 46, 24, 34, 9, 180, 180)} strokeWidth={1.6} strokeLinecap="butt" />
      <path className="fine" d="M14 56 H24 M14 68 H24 M72 56 H82 M72 68 H82 M14 62 H19 M77 62 H82" strokeWidth={1.4} />
      <path d="M32 32 V72 M40 27 V72 M48 25 V72 M56 27 V72 M64 32 V72" strokeWidth={2.4} />
      <path d="M26 38 H70 M26 50 H70 M26 62 H70" strokeWidth={2.4} />
      <path className="solid" d="M30 72 L32 79 L34 72 Z M38 72 L40 79 L42 72 Z M46 72 L48 79 L50 72 Z M54 72 L56 79 L58 72 Z M62 72 L64 79 L66 72 Z" />
      <path className="spot" d="M8 86 H88 V94 H8 Z" />
      <path d="M8 86 H88 V94 H8 Z" strokeWidth={2} />
      <path className="fine" d="M16 86 V90 M24 86 V92 M32 86 V90 M40 86 V92 M48 86 V90 M56 86 V92 M64 86 V90 M72 86 V92 M80 86 V90" strokeWidth={1.4} strokeLinecap="butt" />
    </Plate>
  );
}

/** A sealed scroll with a raven perched on it: the seat that carries the title and submits. */
export function HeraldSigil(props: ArtProps): ReactElement {
  return (
    <Plate name="Herald: a sealed scroll with a raven" {...props}>
      <path d="M20 34 H76 M20 44 H76 M20 34 a5 5 0 1 0 0 10 M76 34 a5 5 0 1 1 0 10" strokeWidth={2.6} />
      <path d="M24 44 V74 M72 44 V74" strokeWidth={2.6} />
      <path d="M20 74 H76 M20 84 H76 M20 74 a5 5 0 1 0 0 10 M76 74 a5 5 0 1 1 0 10" strokeWidth={2.6} />
      <path className="fine" d="M32 53 H64 M32 60 H64 M32 67 H54" strokeWidth={2} />
      <circle className="spot" cx={66} cy={76} r={8.5} />
      <circle cx={66} cy={76} r={8.5} strokeWidth={2.2} />
      <path className="fine" d="M62 76 H70 M66 72 V80" strokeWidth={1.6} />
      <path
        className="solid"
        fillRule="evenodd"
        d="M34 36 C42 24 54 14 66 13 L82 9 L71 17 C77 21 74 29 63 32 L48 34 Z M66 16.5 a2 2 0 1 0 0.1 0 Z"
      />
      <path className="fine" d="M57 32 V35 M62 31 V35" strokeWidth={1.8} />
    </Plate>
  );
}

/** The sigil for a seat. */
export function SeatSigil({ seat, ...props }: ArtProps & { seat: Seat }): ReactElement {
  switch (seat) {
    case "tagger":
      return <CartographerSigil {...props} />;
    case "oracle":
      return <OracleSigil {...props} />;
    case "bounds":
      return <WardenSigil {...props} />;
    case "runner":
      return <HeraldSigil {...props} />;
  }
}
