import { useId, type ReactElement } from "react";
import { d, hatch } from "./hatch";
import { Plate, type ArtProps } from "./Plate";

/*
 * White-line woodcut, 640x360. Ink is the light: the candle's reach is drawn as hatching that
 * thins with distance, figures are the places the hatching stops. Three light rings, one mask
 * each, share one set of occluders (bodies, shadows, candle, manuscript).
 */

const farFigure = (cx: number): string =>
  d`M${cx - 40} 200 V162 C${cx - 40} 140 ${cx - 26} 132 ${cx - 18} 126 C${cx - 22} 110 ${cx - 12} 92 ${cx} 88
    C${cx + 12} 92 ${cx + 22} 110 ${cx + 18} 126 C${cx + 26} 132 ${cx + 40} 140 ${cx + 40} 162 V200 Z`;

const farRim = (cx: number): string =>
  d`M${cx - 13} 132 C${cx - 15} 112 ${cx - 6} 100 ${cx} 98 C${cx + 6} 100 ${cx + 15} 112 ${cx + 13} 132
    M${cx - 40} 162 C${cx - 30} 146 ${cx - 22} 140 ${cx - 16} 134 M${cx + 40} 162 C${cx + 30} 146 ${cx + 22} 140 ${cx + 16} 134
    M${cx - 10} 150 V196 M${cx + 8} 152 V196`;

const shadowOf = (cx: number, dx: number, dy: number, k: number): string =>
  d`translate(${dx} ${dy}) translate(${cx} 200) scale(${k}) translate(${-cx} -200)`;

const LEFT_END = "M30 200 V166 C30 150 40 140 50 134 C42 120 50 96 68 94 C84 96 92 112 84 130 C94 138 100 150 100 166 V200 Z";
const NEAR = "M40 360 V330 C40 300 70 280 100 270 C96 250 110 222 140 218 C170 222 184 250 180 270 C210 280 236 300 236 330 V360 Z";
/* A profile with a hooked nose and an open grin, where a hood's shadow should be. */
const WRONG_SHADOW =
  "M522 200 V166 C524 158 528 152 528 150 L520 140 L534 134 L512 126 L536 122 L514 112 L538 108 L516 100 L500 90 L524 82 L522 70 L530 56 L548 34 L560 22 L582 34 L590 64 C600 90 610 140 612 200 Z";
const CANDLE = "M310 150 H330 V196 H310 Z";
const SHEET = "M268 214 L372 212 L382 236 L262 238 Z";

const COURSES = ((): string => {
  const rows = [0, 62, 106, 150];
  let out = "M0 62 H640 M0 106 H640 M0 150 H640";
  rows.forEach((y, i) => {
    const h = i === rows.length - 1 ? 46 : 44;
    for (let x = i % 2 === 0 ? 85 : 40; x < 640; x += 90) out += d` M${x} ${y} v${h}`;
  });
  return out;
})();

const FIGURES = [190, 335, 475];

/** The landing plate: a long table, five hooded figures, one candle. One shadow is wrong. */
export function HeroPlate(props: ArtProps): ReactElement {
  const id = useId();
  return (
    <Plate
      name="Five hooded figures at a long table lit by one candle. The shadow of the figure on the right does not match its body."
      viewBox="0 0 640 360"
      aspect={640 / 360}
      size={640}
      roughness={1.1}
      {...props}
    >
      <defs>
        <g id={`${id}dark`}>
          {FIGURES.map((cx) => (
            <path key={cx} d={farFigure(cx)} />
          ))}
          <path d={LEFT_END} />
          <path d={NEAR} />
          <path d={farFigure(190)} transform={shadowOf(190, -64, -6, 1.35)} />
          <path d={farFigure(335)} transform={shadowOf(335, 8, -26, 1.4)} />
          <path d={WRONG_SHADOW} />
          <path d={CANDLE} />
          <path d={SHEET} />
        </g>
        <mask id={`${id}l0`}>
          <ellipse cx={320} cy={140} rx={150} ry={118} fill="#fff" />
          <use href={`#${id}dark`} fill="#000" stroke="none" />
        </mask>
        <mask id={`${id}l1`}>
          <ellipse cx={320} cy={150} rx={300} ry={225} fill="#fff" />
          <use href={`#${id}dark`} fill="#000" stroke="none" />
        </mask>
        <mask id={`${id}l2`}>
          <ellipse cx={320} cy={160} rx={380} ry={250} fill="#fff" />
          <use href={`#${id}dark`} fill="#000" stroke="none" />
        </mask>
        <mask id={`${id}front`}>
          <rect width={640} height={360} fill="#fff" />
          <path d={NEAR} fill="#000" stroke="none" />
        </mask>
        <clipPath id={`${id}near`}>
          <path d={NEAR} />
        </clipPath>
      </defs>

      {/* light, as hatching: wall at 78 degrees, table at -2, crosshatch nearest the flame */}
      <g className="hero-light" strokeWidth={1.1} strokeLinecap="butt">
        <path mask={`url(#${id}l2)`} d={hatch(0, 0, 640, 196, 7.5, 78) + hatch(0, 196, 640, 52, 7.5, -2)} />
        <path mask={`url(#${id}l1)`} d={hatch(0, 0, 640, 196, 4.8, 78) + hatch(0, 196, 640, 52, 4.8, -2) + hatch(0, 248, 640, 18, 5, 90)} />
        <path mask={`url(#${id}l0)`} d={hatch(0, 0, 640, 196, 3.6, 168) + hatch(0, 196, 640, 52, 3.6, 88)} />
      </g>
      <path mask={`url(#${id}l1)`} d={COURSES} strokeWidth={1.6} />

      {/* the far side: three hoods, lit from the front */}
      {FIGURES.map((cx) => (
        <path key={cx} d={farRim(cx)} strokeWidth={2.4} />
      ))}
      <path className="solid" d={FIGURES.map((cx) => d`M${cx - 5} 116 a1.7 1.7 0 1 0 0.1 0 M${cx + 5} 116 a1.7 1.7 0 1 0 0.1 0`).join(" ")} />
      <path d="M469 127 Q475 132 481 127" strokeWidth={1.5} />

      {/* the left end, in profile */}
      <path d="M84 130 C94 138 100 150 100 166 M70 100 C82 104 86 118 82 130 M60 142 V196" strokeWidth={2.4} />

      {/* the table */}
      <path mask={`url(#${id}l2)`} d="M80 208 C200 206 400 210 560 206 M60 220 C220 217 420 223 600 219 M40 232 C240 229 440 235 620 231 M20 242 C220 240 440 245 640 241" strokeWidth={1.2} />
      <path mask={`url(#${id}front)`} d="M70 196 H570 M0 248 H640 M70 196 L20 248 M570 196 L620 248 M0 266 H640" strokeWidth={3} />

      {/* the manuscript, the brightest thing on the table */}
      <path className="solid" d={SHEET} />
      <path className="cut" d="M278 220 H366 M279 226 H360 M280 232 H352" strokeWidth={1.4} />

      {/* the candle */}
      <path d="M300 196 a20 5 0 0 0 40 0" strokeWidth={2.5} />
      <path d="M310 150 V196 M330 150 V196 M310 150 H330 M312 150 v12 c0 3 -3 3 -3 0 M327 150 v8 c0 2 2 2 2 0" strokeWidth={2.4} />
      <path d="M320 142 V150" strokeWidth={2} />
      <g className="hero-flame">
        <path className="spot" d="M320 106 C325 114 329 122 327 130 C326 135 323 137 320 137 C317 137 314 135 313 130 C311 122 315 114 320 106 Z" />
        <path d="M320 92 C329 105 336 118 333 130 C331 138 326 142 320 142 C314 142 309 138 307 130 C304 118 311 105 320 92 Z" strokeWidth={2.6} />
      </g>

      {/* the near figure, back to us, lit down its right flank */}
      <path clipPath={`url(#${id}near)`} d={hatch(150, 216, 90, 144, 5.5, 80)} strokeWidth={1.1} strokeLinecap="butt" />
      <path d="M140 218 C170 222 184 250 180 270 C210 280 236 300 236 330 M150 240 C160 250 166 262 168 274 M118 228 C110 242 108 256 110 268" strokeWidth={3} />
    </Plate>
  );
}
