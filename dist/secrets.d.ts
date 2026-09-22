/**
 * Refuse secret-looking inputs. Never request or accept seed/private keys.
 */
export declare function looksLikeSecret(input: string): string | null;
export declare function assertNoSecrets(...inputs: Array<string | undefined | null>): void;
/** Solana base58 pubkey/signature shape (public only). */
export declare function looksLikePublicBase58(s: string, min?: number, max?: number): boolean;
