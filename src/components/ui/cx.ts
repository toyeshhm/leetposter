/** Join class names, dropping falsy parts. */
export function cx(...parts: (string | false | undefined)[]): string {
  return parts.filter((p): p is string => typeof p === "string" && p !== "").join(" ");
}
