const DIGEST_ALGO = 'SHA-256';
const SALT_LENGTH = 16;
const INITIALIZATION_VECTOR_LENGTH = 12;
const ITERATIONS = 1000000

export const digest = async (message: string): Promise<Uint8Array> => {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest(DIGEST_ALGO, msgBuffer);
  return new Uint8Array(hashBuffer);
};

export const encrypt = async ({
  message,
  key,
}: {
  message: string;
  key: string;
}): Promise<string> => {
  const encoder = new TextEncoder();
  const messageUtf8 = encoder.encode(message);
  const keyUtf8 = encoder.encode(key);

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(INITIALIZATION_VECTOR_LENGTH));

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyUtf8,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    cryptoKey,
    {
      name: 'AES-GCM',
      length: 256
    },
    false,
    ['encrypt']
  );

  const encryptedMessage = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      tagLength: 128
    },
    aesKey,
    messageUtf8
  );

  const encrypted = new Uint8Array(salt.length + iv.length + encryptedMessage.byteLength)

  encrypted.set(salt)
  encrypted.set(iv, salt.length)
  encrypted.set(new Uint8Array(encryptedMessage), salt.length + iv.length)

  return btoa(String.fromCharCode(...encrypted))
};

export const decrypt = async ({
  encryptedMessage,
  key,
}: {
  encryptedMessage: string;
  key: string;
}): Promise<string> => {
  const encoder = new TextEncoder();
  const keyUtf8 = encoder.encode(key);

  const binaryString = atob(encryptedMessage);

  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const salt = bytes.slice(0, SALT_LENGTH);
  const iv = bytes.slice(SALT_LENGTH, SALT_LENGTH + INITIALIZATION_VECTOR_LENGTH);
  const encryptedData = bytes.slice(SALT_LENGTH + INITIALIZATION_VECTOR_LENGTH);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyUtf8,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    cryptoKey,
    {
      name: 'AES-GCM',
      length: 256
    },
    false,
    ['decrypt']
  );

  const message = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
      tagLength: 128
    },
    aesKey,
    encryptedData
  );  

  const decoder = new TextDecoder();
  return decoder.decode(message);
};
