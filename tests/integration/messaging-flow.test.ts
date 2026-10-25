/**
 * End-to-End Integration Test: Cryptographic Messaging Flow
 * Simulates client-side ECDH key generation, shared secret derivation,
 * AES-GCM envelope serialization, and recipient authenticated decryption.
 */

describe('E2EE Messaging Flow', () => {
  it('should establish an ECDH shared secret between Alice and Bob and exchange encrypted messages', async () => {
    // 1. Alice and Bob generate ECDH P-256 keypairs on client devices
    const aliceKeypair = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey', 'deriveBits']
    );

    const bobKeypair = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey', 'deriveBits']
    );

    // 2. Both derive symmetric key via HKDF
    const aliceSharedBits = await crypto.subtle.deriveBits(
      { name: 'ECDH', public: bobKeypair.publicKey },
      aliceKeypair.privateKey,
      256
    );

    const bobSharedBits = await crypto.subtle.deriveBits(
      { name: 'ECDH', public: aliceKeypair.publicKey },
      bobKeypair.privateKey,
      256
    );

    // Both parties must derive identical shared secret bits
    expect(Buffer.from(aliceSharedBits).equals(Buffer.from(bobSharedBits))).toBe(true);

    const hkdfMaster = await crypto.subtle.importKey(
      'raw',
      aliceSharedBits,
      { name: 'HKDF' },
      false,
      ['deriveKey']
    );

    const aliceSymKey = await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new Uint8Array(32),
        info: new TextEncoder().encode('SecureChat_E2EE_v1'),
      },
      hkdfMaster,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    // 3. Alice encrypts payload
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = 'Hello Bob, this message is strictly private!';
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      aliceSymKey,
      new TextEncoder().encode(plaintext)
    );

    // 4. Bob derives same key and decrypts
    const bobHkdf = await crypto.subtle.importKey(
      'raw',
      bobSharedBits,
      { name: 'HKDF' },
      false,
      ['deriveKey']
    );

    const bobSymKey = await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new Uint8Array(32),
        info: new TextEncoder().encode('SecureChat_E2EE_v1'),
      },
      bobHkdf,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      bobSymKey,
      ciphertext
    );

    const decryptedText = new TextDecoder().decode(decrypted);
    expect(decryptedText).toBe(plaintext);
  });
});
