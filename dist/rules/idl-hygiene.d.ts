import type { Finding } from "../types.js";
export declare function fingerprintIdlJson(raw: string | Buffer): string;
export declare function checkIdlFingerprint(raw: string | Buffer, label?: string): Finding[];
export declare function checkDiscriminatorHygiene(source: string): Finding[];
export declare function expectedBuyAccountCount(): number;
