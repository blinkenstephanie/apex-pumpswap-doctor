/**
 * Refuse secret-looking inputs. Never request or accept seed/private keys.
 */

const SECRET_PATTERNS: { name: string; re: RegExp }[] = [
  {
    name: "bip39-ish seed phrase",
    re: /\b(?:[a-z]+(?:\s+[a-z]+){11,23})\b/i,
  },
  {
    name: "solana/base58 private key blob",
    // Long base58 strings that look like exported secret keys (64+ bytes encoded)
    re: /\b[1-9A-HJ-NP-Za-km-z]{80,}\b/,
  },
  {
    name: "byte-array secret key",
    re: /\[\s*\d{1,3}\s*(?:,\s*\d{1,3}\s*){31,}\]/,
  },
  {
    name: "pem / hex private key",
    re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:0x)?[0-9a-f]{128,}\b/i,
  },
  {
    name: "env-style secret",
    re: /\b(?:PRIVATE_KEY|SECRET_KEY|SEED_PHRASE|MNEMONIC|WALLET_SECRET)\s*[=:]\s*\S+/i,
  },
];

export function looksLikeSecret(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  for (const { name, re } of SECRET_PATTERNS) {
    if (re.test(trimmed)) return name;
  }
  return null;
}

export function assertNoSecrets(...inputs: Array<string | undefined | null>): void {
  for (const input of inputs) {
    if (input == null || input === "") continue;
    const hit = looksLikeSecret(input);
    if (hit) {
      throw new Error(
        `Refused: input looks like a secret (${hit}). ` +
          "Never provide a seed phrase, private key, or funded wallet to this tool. " +
          "Pass only public signatures, mint addresses, log files, or repo paths.",
      );
    }
  }
}

/** Solana base58 pubkey/signature shape (public only). */
export function looksLikePublicBase58(s: string, min = 32, max = 88): boolean {
  return new RegExp(`^[1-9A-HJ-NP-Za-km-z]{${min},${max}}$`).test(s.trim());
}
