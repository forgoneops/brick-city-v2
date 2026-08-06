// Feature visibility flags — single place to flip modules on/off.
// Battles launched: server router, schema, battle creator and page are all
// live. Also surfaced in the Admin page feature-flags stub list.
export const FEATURES = {
  battles: true,
} as const;

export type FeatureName = keyof typeof FEATURES;
