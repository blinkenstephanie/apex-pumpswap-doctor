import type { Diagnosis } from "../types.js";
export interface TxOptions {
    signature: string;
    logsFile?: string;
    rpcUrl?: string;
}
export declare function diagnoseTx(opts: TxOptions): Promise<Diagnosis>;
