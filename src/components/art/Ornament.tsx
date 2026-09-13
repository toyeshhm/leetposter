import type { ReactElement } from "react";
import { d } from "./hatch";
import { Plate, type ArtProps } from "./Plate";

export const CORNERS = ["tl", "tr", "br", "bl"] as const;
const ROTATION: Record<(typeof CORNERS)[number], number> = { tl: 0, tr: 90, br: 180, bl: 270 };

/** A nail and a curl for one corner of a Frame. Decorative unless given a title. */
export function FrameCorner({ corner = "tl", ...props }: ArtProps & { corner?: (typeof CORNERS)[number] }): ReactElement {
  return (
    <Plate name="frame corner" viewBox="0 0 24 24" size={24} roughness={0} decorative={props.title === undefined} {...props}>
      <g transform={d`rotate(${ROTATION[corner]} 12 12)`}>
        <path className="solid" d="M1 1 H8 V8 H1 Z" />
        <path className="spot" d="M3 3 H6 V6 H3 Z" />
        <path d="M8 4.5 C14 4.5 19.5 10 19.5 16 M4.5 8 C4.5 14 10 19.5 16 19.5" strokeWidth={1.6} />
        <path d="M19.5 16 L22.5 20.5 M16 19.5 L20.5 22.5" strokeWidth={1.6} />
        <circle className="solid" cx={11} cy={11} r={1.6} />
      </g>
    </Plate>
  );
}

/** Two tapered rules meeting at an amber lozenge. Decorative unless given a title. */
export function RuleOrnament(props: ArtProps): ReactElement {
  return (
    <Plate name="rule ornament" viewBox="0 0 120 16" aspect={7.5} size={120} roughness={0} decorative={props.title === undefined} {...props}>
      <path className="solid" d="M0 8 L46 6.4 L49 8 L46 9.6 Z M120 8 L74 6.4 L71 8 L74 9.6 Z" />
      <path className="spot" d="M60 2.5 L65.5 8 L60 13.5 L54.5 8 Z" />
      <path d="M60 2.5 L65.5 8 L60 13.5 L54.5 8 Z" strokeWidth={1.4} />
      <circle className="solid" cx={51} cy={8} r={1.4} />
      <circle className="solid" cx={69} cy={8} r={1.4} />
    </Plate>
  );
}
