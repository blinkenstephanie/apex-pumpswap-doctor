import type { Finding } from "../types.js";
export interface DepHit {
    name: string;
    version: string;
    where: string;
}
export declare function collectDepsFromPackageJson(pkg: Record<string, unknown>, where?: string): DepHit[];
/** Very light lockfile scan for package names + nearby versions. */
export declare function collectDepsFromLockText(lockText: string, where: string): DepHit[];
export declare function evaluateSdkHits(hits: DepHit[]): Finding[];
