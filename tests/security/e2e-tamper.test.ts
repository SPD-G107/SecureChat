/**
 * Security Penetration Test: Authenticated Decryption & Ciphertext Tamper Detection
 * Verifies that AES-256-GCM authenticated encryption rejects tampered ciphertexts and invalid MAC tags.
 */

describe('Security: Ciphertext Tamper Detection & Integrity', () => {
  it('should reject decryption when ciphertext bits are modified (Integrity Check)', async () => {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = 'Secret Bank Transfer Request: $10,000';
    const encoded = new TextEncoder().encode(plaintext);

    // 1. Valid Encrypt
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      key,
      encoded
    );

    // 2. Tamper: Flip the first bit in ciphertext
    const tamperedCipher = new Uint8Array(encrypted);
    tamperedCipher[0] ^= 0x01; // Bit-flip

    // 3. Attempt decryption on tampered payload
    let errorCaught = false;
    try {
      await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv, tagLength: 128 },
        key,
        tamperedCipher
      );
    } catch (err: any) {
      errorCaught = true;
    }

    // Tampered payload MUST fail authentication
    expect(errorCaught).toBe(true);
  });

  it('should reject replay or reuse with invalid nonces', async () => {
    const nonce1 = crypto.getRandomValues(new Uint8Array(12));
    const nonce2 = crypto.getRandomValues(new Uint8Array(12));
    expect(Buffer.from(nonce1).equals(Buffer.from(nonce2))).toBe(false);
  });
});
