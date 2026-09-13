/** The one structured logger. One JSON line per event; the only sanctioned console sink. */
export const log = {
  error(event: string, fields: Record<string, unknown>): void {
    // eslint-disable-next-line no-console -- this is the single console sink the README allows
    console.error(JSON.stringify({ level: "error", at: new Date().toISOString(), event, ...fields }, replacer));
  },
};

function replacer(_key: string, value: unknown): unknown {
  return value instanceof Error ? { name: value.name, message: value.message, stack: value.stack } : value;
}
