/* Pure time formatting, safe to import from a server component. The ticking hook that used to live
   here is in ./useServerNow, because importing it from the server graph fails the build. */

const pad = (n: number): string => String(n).padStart(2, "0");

/** mm:ss for a duration in milliseconds, rounded up to the second. */
export function mmss(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}
