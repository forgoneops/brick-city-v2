// Feature visibility flags — single place to flip modules on/off.
// Battles stays fully implemented (server router, schema, page component)
// but is hidden from the frontend: flip to `true` to re-enable.
// Also surfaced in the Admin page feature-flags stub list.
export const FEATURES = {
  battles: false,
} as const;

export type FeatureName = keyof typeof FEATURES;
