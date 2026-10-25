# End-to-End Encryption (E2EE) Specification

## 1. Cryptographic Standards

SecureChat implements authenticated client-side encryption using the native **Web Crypto API**:

- **Key Agreement**: ECDH (Elliptic Curve Diffie-Hellman) using the P-256 (secp256r1) curve.
- **Key Derivation**: HKDF (HMAC-based Extract-and-Expand Key Derivation Function) with SHA-256.
- **Symmetric Encryption**: AES-256-GCM (Galois/Counter Mode) with 128-bit authentication tags and unique 96-bit Initialization Vectors (IV).
- **Public Key Fingerprint**: SHA-256 digest formatted as a 60-digit verifiable security number or hex fingerprint.

---

## 2. Key Lifecycle & Agreement

```
Alice (Sender)                                   Bob (Recipient)
  |                                                     |
  | 1. Retrieve Bob's Public Key (via server)          |
  | 2. Generate Ephemeral Keypair (ECDH)               |
  | 3. Compute Shared Secret (Alice Private + Bob Pub)  |
  | 4. Derive AES-256-GCM Key (HKDF-SHA256)             |
  | 5. Encrypt Plaintext -> Ciphertext + IV + MAC Tag   |
  | 6. Transmit Encrypted Envelope (via Blind Server)   |
  |---------------------------------------------------->|
  |                                                     | 7. Derive Same Shared Secret (Bob Private + Alice Ephemeral Pub)
  |                                                     | 8. Authenticate & Decrypt Payload
```

---

## 3. Public-Key Verification & Key-Change Warnings

1. **Fingerprint Verification**:
   - Both users compute:
     $$\text{Fingerprint} = \text{SHA-256}(\text{Sort}(\text{PubKey}_A \parallel \text{PubKey}_B))$$
   - Users compare the fingerprint out-of-band to confirm no Man-in-the-Middle (MITM) exists.

2. **Key-Change Detection**:
   - When user Bob updates his public key (e.g., new device), the server increments his key `version`.
   - Alice's client detects the version change and displays an explicit **Key-Change Warning**:
     > *"Security Warning: Bob's identity key has changed. Verify your contact before sending confidential messages."*
