import type { ReactElement } from "react";
import { Plate, type ArtProps } from "@/components/art/Plate";
import "./store.css";

/* The currency mark. Its own file: the header draws candles on every page and must not pull in the art registry. */

const FLAME = "M48 12 C56 24 60 32 58 38 C56 43 52 46 48 46 C44 46 40 43 38 38 C36 32 40 24 48 12 Z";

/** A lit candle in a dish, small enough to sit in a line of text. */
export function CandleMark(props: ArtProps): ReactElement {
  return (
    <Plate name="Candles" roughness={0} {...props}>
      <path d="M30 88 H66" strokeWidth={4} />
      <path d="M38 88 V52 H58 V88" strokeWidth={4} />
      <path d="M48 52 V46" strokeWidth={3} />
      <path className="spot" d={FLAME} />
      <path d={FLAME} strokeWidth={3} />
    </Plate>
  );
}

/** An amount of candles: the mark, the number, and the word for anyone who cannot see the mark. */
export function Candles({ n }: { n: number }): ReactElement {
  return (
    <span className="candles tabular">
      <CandleMark size={16} decorative />
      {String(n)}
      <span className="sr-only"> candles</span>
    </span>
  );
}
