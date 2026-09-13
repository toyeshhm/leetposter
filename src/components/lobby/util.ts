/**
 * Field's `error` is `error?: string`; under exactOptionalPropertyTypes an explicit `undefined`
 * is rejected, so callers spread this instead.
 */
export function errorProp(message: string | undefined): { error?: string } {
  return message === undefined ? {} : { error: message };
}
