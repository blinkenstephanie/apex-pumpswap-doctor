import { SOFT_CTA } from "./constants.js";

let emitted = false;

/** Reset between CLI invocations / tests. */
export function resetSoftCta(): void {
  emitted = false;
}

/** Return soft CTA once per process/run; empty string afterward. */
export function softCtaOnce(): string {
  if (emitted) return "";
  emitted = true;
  return SOFT_CTA;
}

export function alwaysSoftCta(): string {
  return SOFT_CTA;
}
