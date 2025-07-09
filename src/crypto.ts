const DIGEST_ALGO = 'SHA-256';

export const digest = async (message: string): Promise<Uint8Array> => {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest(DIGEST_ALGO, msgBuffer);
  return new Uint8Array(hashBuffer);
};

