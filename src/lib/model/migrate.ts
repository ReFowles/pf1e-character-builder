type Plain = Record<string, unknown>;

/**
 * Upgrade steps keyed by the version they upgrade *from*. Each step receives
 * data at version N and returns data at version N + 1.
 */
const STEPS: Record<number, (d: Plain) => Plain> = {};

export function migrate(data: Plain): Plain {
  let version = typeof data.schemaVersion === 'number' ? data.schemaVersion : 1;
  let out = data;
  while (STEPS[version]) {
    out = STEPS[version](out);
    version += 1;
  }
  return { ...out, schemaVersion: version };
}
