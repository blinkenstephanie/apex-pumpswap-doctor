import type { Diagnosis } from "../types.js";
export interface PoolOptions {
    mint: string;
    rpcUrl?: string;
}
export declare function diagnosePool(opts: PoolOptions): Promise<Diagnosis>;
