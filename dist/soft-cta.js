import { SOFT_CTA } from "./constants.js";
let emitted = false;
/** Reset between CLI invocations / tests. */
export function resetSoftCta() {
    emitted = false;
}
/** Return soft CTA once per process/run; empty string afterward. */
export function softCtaOnce() {
    if (emitted)
        return "";
    emitted = true;
    return SOFT_CTA;
}
export function alwaysSoftCta() {
    return SOFT_CTA;
}
