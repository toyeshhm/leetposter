import { useId, type ReactElement, type ReactNode } from "react";

/** Props every plate accepts. `size` is the rendered width in px; height follows the plate's aspect. */
export interface ArtProps {
  size?: number;
  /** Accessible name. Each plate ships a default. */
  title?: string;
  /** Hide from assistive tech when adjacent text already names the image. Ornaments default to true. */
  decorative?: boolean;
}

interface PlateProps extends ArtProps {
  name: string;
  viewBox?: string;
  /** width / height of the viewBox. */
  aspect?: number;
  /** Displacement of the ink-rough filter in viewBox units; 0 disables it. */
  roughness?: number;
  children: ReactNode;
}

/**
 * The block every drawing is cut into: ink is currentColor, the spot is `.spot`, edges are
 * roughened by an feTurbulence displacement at 48px and up so the line looks cut, not rendered.
 */
export function Plate({
  size = 96,
  title,
  name,
  viewBox = "0 0 96 96",
  aspect = 1,
  roughness = 1.6,
  decorative = false,
  children,
}: PlateProps): ReactElement {
  // Ids are per instance: a page holds many plates and `url(#...)` resolves to the first match.
  const id = useId();
  const rough = roughness > 0 && size >= 48;
  const a11y = decorative ? { "aria-hidden": true as const } : { role: "img" };
  return (
    <svg className={size <= 32 ? "plate plate-small" : "plate"} width={size} height={Math.round(size / aspect)} viewBox={viewBox} {...a11y}>
      {decorative ? null : <title>{title ?? name}</title>}
      {rough ? (
        <defs>
          <filter id={`${id}rough`} x="-4%" y="-4%" width="108%" height="108%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="3" seed="3" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={roughness} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      ) : null}
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="square"
        strokeLinejoin="miter"
        filter={rough ? `url(#${id}rough)` : undefined}
      >
        {children}
      </g>
    </svg>
  );
}
