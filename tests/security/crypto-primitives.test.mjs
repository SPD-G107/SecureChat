/**
 * Automated Cryptographic Primitives & E2EE Regression Tests
 * Uses Node.js built-in test runner and Web Crypto API (ECDH P-256 + HKDF-SHA256 + AES-256-GCM).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, webcrypto } from 'node:crypto';

const subtle = webcrypto.subtle;

function bytesToBase64Chunked(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return Buffer.from(binary, 'binary').toString('base64');
}

test('ECDH P-256 + HKDF-SHA256 derives identical AES-256-GCM keys and rejects 1-bit tampering', async () => {
  const alice = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey', 'deriveBits']);
  const bob = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey', 'deriveBits']);

  const deriveAesKey = async (priv, pub, usages) => {
    const bits = await subtle.deriveBits({ name: 'ECDH', public: pub }, priv, 256);
    const hkdfKey = await subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey']);
    return subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new TextEncoder().encode('SecureChat-E2EE-Salt-v1'),
        info: new TextEncoder().encode('SecureChat-AES-256-GCM'),
      },
      hkdfKey,
      { name: 'AES-GCM', length: 256 },
      false,
      usages
    );
  };

  const aliceKey = await deriveAesKey(alice.privateKey, bob.publicKey, ['encrypt']);
  const bobKey = await deriveAesKey(bob.privateKey, alice.publicKey, ['decrypt']);

  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode('Zero-plaintext verification payload');
  const ciphertext = await subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, aliceKey, plaintext);

  const decrypted = await subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, bobKey, ciphertext);
  assert.equal(new TextDecoder().decode(decrypted), 'Zero-plaintext verification payload');

  // Flip 1 bit in ciphertext and assert authentication tag rejects decryption
  const tampered = new Uint8Array(ciphertext);
  tampered[0] ^= 0x01;
  await assert.rejects(() => subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, bobKey, tampered));
});

test('Chunked Base64 encoder handles payloads larger than 128KB without call stack overflow', () => {
  const largeBuffer = new Uint8Array(randomBytes(150 * 1024));
  const encoded = bytesToBase64Chunked(largeBuffer);
  const decoded = new Uint8Array(Buffer.from(encoded, 'base64'));
  assert.equal(decoded.length, largeBuffer.length);
  assert.deepEqual(decoded, largeBuffer);
});
