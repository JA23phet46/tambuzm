# Security Specification & Threat Model (security_spec.md)

This document establishes the security invariants, malicious playground payloads, and test boundaries for the **tambu** database layer.

## 1. Data Invariants
- **Identity Bound**: A listing can only be created by an authenticated user whose UID matches `ownerId`.
- **Private Info Isolation**: High-risk PII (e.g. phone numbers or billing records) must only be readable and writable by the owner.
- **Immutability of Key Fields**: Once created, `createdAt` and relational keys like `ownerId` or `userId` are strictly frozen.
- **Strict Size Bounds**: All user-provided strings (e.g., property name, description, user phone, and custom IDs) are capped to prevent Denial of Wallet memory exhaustion.

---

## 2. The "Dirty Dozen" Payloads

### Payload 1: Identity Spoofing (Property ownerId hijacking)
- **Path**: `properties/malicious_prop`
- **Attempt**: Write a new listing where `ownerId` is set to a victim's `auth.uid` instead of the sender's actual UID.
- **Payload**:
  ```json
  {
    "id": "malicious_prop",
    "name": "Spoofed Villa",
    "location": "Leopards Hill, Lusaka",
    "province": "Lusaka",
    "price": 5000,
    "type": "House",
    "beds": 3,
    "baths": 2,
    "sqm": 250,
    "image": "https://example.com/image.png",
    "verified": false,
    "featured": false,
    "ownerId": "victim_uid_999",
    "ownerName": "Attacker"
  }
  ```

### Payload 2: Ghost Field Privilege Escalation (Shadow Update)
- **Path**: `properties/prop_123`
- **Attempt**: Update a listed property and inject an un-allowlisted key or try to check `verified` as a non-admin.
- **Payload**:
  ```json
  {
    "verified": true,
    "ghostField": "malicious_injection"
  }
  ```

### Payload 3: Creation Integrity Breach (Missing fields)
- **Path**: `properties/bad_prop`
- **Attempt**: Create a property missing crucial fields to compromise database health.
- **Payload**:
  ```json
  {
    "id": "bad_prop",
    "name": "Fragmented House"
  }
  ```

### Payload 4: Relationship Poisoning (Huge ID string)
- **Path**: `properties/property_WITH_EXTREMELY_LONG_JUNK_ID_CONTAINING_MORE_THAN_A_THOUSAND_CHARACTERS...`
- **Attempt**: Inject a monstrous document ID to balloon storage index costs.
- **Payload**:
  ```json
  {
    "id": "a".repeat(1000),
    "name": "Junk ID House"
  }
  ```

### Payload 5: Billing Hijacking (Forging invoices)
- **Path**: `users/victim_uid/billing_records/inv_hack`
- **Attempt**: Write a billing proof to a victim's subcollection.
- **Payload**:
  ```json
  {
    "id": "inv_hack",
    "userId": "victim_uid",
    "reference": "DPO-9999999",
    "amount": 100.00,
    "date": "May 22, 2026",
    "status": "SUCCESSFUL"
  }
  ```

### Payload 6: User Profile Embezzlement (Setting own admin role)
- **Path**: `users/attacker_uid`
- **Attempt**: Create user profile claiming arbitrary roles.
- **Payload**:
  ```json
  {
    "userId": "attacker_uid",
    "name": "Attacker",
    "email": "attacker@tambu.co.zm",
    "phone": "0977111111",
    "role": "admin"
  }
  ```

### Payload 7: Verification Spoofing (Unverified Email Write)
- **Path**: `properties/prop_some`
- **Attempt**: Create record while requesting user's `email_verified` claim is false.
- **Payload**: Authenticated with `request.auth.token.email_verified == false` attempting to write a property.

### Payload 8: History Espionage (Reading another's searches)
- **Path**: `users/victim_uid/searches/search_123`
- **Attempt**: Querying another user's private search history collection.

### Payload 9: Price Forgery
- **Path**: `properties/prop_123`
- **Attempt**: Non-owners attempting to write price updates to a property.

### Payload 10: Immutability Tamper (createdAt)
- **Path**: `properties/prop_123`
- **Attempt**: Overwriting the `createdAt` timestamp of an existing listing to look older.

### Payload 11: Value Poisoning (Invalid Type Injection)
- **Path**: `properties/prop_123`
- **Attempt**: Write an array representation to a primitive beds count (e.g. `beds: ["many"]`).

### Payload 12: Anonymous Listing (Auth Missing)
- **Path**: `properties/anonymous_prop`
- **Attempt**: Unauthenticated POST/setDoc to properties.

---

## 3. Test Runner Concept

The test runner below establishes standard verification of the 12 payloads described:

```typescript
// firestore.rules.test.ts
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'optimum-zephyr-qrwfn',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: 'localhost',
      port: 8080,
    }
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

test('Dirty Dozen Failures', async () => {
  const alice = testEnv.authenticatedContext('alice');
  const bob = testEnv.authenticatedContext('bob');
  
  // Test 1: Identity Spoofing
  await assertFails(alice.firestore().doc('properties/alice_prop').set({
    id: 'alice_prop',
    name: 'Spoofed House',
    ownerId: 'bob_uid', // Spoofing!
    price: 3000,
    location: 'Lusaka',
    province: 'Lusaka',
    type: 'House',
    beds: 1,
    baths: 1,
    sqm: 40,
    image: 'img.png',
    verified: false,
    featured: false
  }));
});
```
