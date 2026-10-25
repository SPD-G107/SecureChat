/**
 * SecureChat Web Crypto Engine
 * Client-Side End-to-End Encryption (E2EE)
 * Curve: ECDH P-256 | Symmetric: AES-256-GCM | Derivation: HKDF-SHA256
 */

export class CryptoEngine {
  /**
   * Generates a persistent ECDH P-256 identity key pair in the browser
   */
  static async generateIdentityKeyPair(): Promise<CryptoKeyPair> {
    return window.crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey', 'deriveBits']
    );
  }

  /**
   * Generates an ephemeral ECDH P-256 key pair for per-message forward secrecy
   */
  static async generateEphemeralKeyPair(): Promise<CryptoKeyPair> {
    return window.crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey', 'deriveBits']
    );
  }

  /**
   * Exports a public key to Base64 (spki format)
   */
  static async exportPublicKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey('spki', key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
  }

  /**
   * Imports a public key from Base64 (spki format)
   */
  static async importPublicKey(base64: string): Promise<CryptoKey> {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return window.crypto.subtle.importKey(
      'spki',
      bytes.buffer,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      []
    );
  }

  /**
   * Computes a SHA-256 fingerprint for public key verification / safety numbers
   */
  static async computeFingerprint(publicKeyBase64: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(publicKeyBase64);
    const hash = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hash));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Derives an AES-256-GCM symmetric key from an ECDH exchange using HKDF
   */
  static async deriveSymmetricKey(
    privateKey: CryptoKey,
    peerPublicKey: CryptoKey,
    salt = new Uint8Array(32)
  ): Promise<CryptoKey> {
    // 1. Compute shared secret bits
    const sharedBits = await window.crypto.subtle.deriveBits(
      { name: 'ECDH', public: peerPublicKey },
      privateKey,
      256
    );

    // 2. Import shared bits into HKDF master key
    const hkdfMaster = await window.crypto.subtle.importKey(
      'raw',
      sharedBits,
      { name: 'HKDF' },
      false,
      ['deriveKey']
    );

    // 3. Derive 256-bit AES-GCM encryption key
    return window.crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt,
        info: new TextEncoder().encode('SecureChat_E2EE_v1'),
      },
      hkdfMaster,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypts plaintext string using AES-256-GCM with a 96-bit CSPRNG IV
   */
  static async encrypt(
    plaintext: string,
    key: CryptoKey
  ): Promise<{ ciphertext: string; iv: string; macTag: string }> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit unique nonce
    const encoded = new TextEncoder().encode(plaintext);

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      key,
      encoded
    );

    const fullCipher = new Uint8Array(encryptedBuffer);
    const payloadBytes = fullCipher.slice(0, fullCipher.length - 16);
    const macBytes = fullCipher.slice(fullCipher.length - 16);

    return {
      ciphertext: btoa(String.fromCharCode(...payloadBytes)),
      iv: btoa(String.fromCharCode(...iv)),
      macTag: btoa(String.fromCharCode(...macBytes)),
    };
  }

  /**
   * Authenticates and decrypts AES-256-GCM ciphertext. Rejects tampered payloads.
   */
  static async decrypt(
    ciphertextBase64: string,
    ivBase64: string,
    macTagBase64: string,
    key: CryptoKey
  ): Promise<string> {
    const rawCipher = atob(ciphertextBase64);
    const rawIv = atob(ivBase64);
    const rawMac = atob(macTagBase64);

    const cipherBytes = new Uint8Array(rawCipher.length);
    for (let i = 0; i < rawCipher.length; i++) cipherBytes[i] = rawCipher.charCodeAt(i);

    const ivBytes = new Uint8Array(rawIv.length);
    for (let i = 0; i < rawIv.length; i++) ivBytes[i] = rawIv.charCodeAt(i);

    const macBytes = new Uint8Array(rawMac.length);
    for (let i = 0; i < rawMac.length; i++) macBytes[i] = rawMac.charCodeAt(i);

    // Recombine ciphertext and 16-byte MAC tag
    const fullBuffer = new Uint8Array(cipherBytes.length + macBytes.length);
    fullBuffer.set(cipherBytes, 0);
    fullBuffer.set(macBytes, cipherBytes.length);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes, tagLength: 128 },
      key,
      fullBuffer
    );

    return new TextDecoder().decode(decryptedBuffer);
  }
}
