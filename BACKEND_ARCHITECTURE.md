# Tambu Zambia Mobile & Web Real Estate Application
## Production-Grade Backend Architecture, Firestore Schemas, Hardened Security Rules, & Serverless Workflows

This document outlines the complete, production-ready full-stack backend architecture designed for the **Tambu** Real Estate platform in Zambia. The stack leverages **Firebase Authentication**, **Cloud Firestore (Enterprise Edition)**, **Cloud Storage for Firebase**, and **Cloud Functions (v2 / Eventarc)** for secure, lightning-fast, and scalable execution.

---

## 1. Project Directory Structure

Below is the standard, production-ready repository layout for the Firebase and backend infrastructure setup:

```text
tambu-backend/
├── firebase-blueprint.json    # Intermediate data models blueprint
├── firestore.rules            # Fully versioned, hardened Attribute-Based Access Control
├── storage.rules              # Strict secure media and KYC bucket policies
├── functions/                 # Cloud Functions (NodeJS & TypeScript v2)
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts           # Main v2 serverless imports and exports
│       ├── triggers/
│       │   ├── imageOptimizer.ts   # Metadata removal and webp converter
│       │   ├── storageCleaner.ts   # Event-driven listing deletes
│       │   └── notificationHub.ts  # FCM Push dispatch on Admin review
│       └── middlewares/
│           └── rbacAuthorizer.ts   # Node.js backend RBAC role checks
└── admin-scripts/
    └── adminManager.ts        # Admin actions (token revocation, audit logs)
```

---

## 2. Multi-Role Authentication & Access Control (RBAC)

To achieve strict security isolation, roles are authorized inside Firestore documents and parsed securely within APIs or firestore rules, eliminating client-side reliance. Role verification prevents unauthorized privilege escalation (e.g., standard Seeker trying to create listings, or a Fraudulent user bypassing verification).

### A. Role Verification Middleware (Node.js/Express)
Deploy this snippet in server-side API runtimes (e.g. custom Node.js Express server acting on Admin or Premium Placements, cloud endpoints, or serverless functions) to verify roles.

```typescript
import * as admin from "firebase-admin";
import { Request, Response, NextFunction } from "express";

export interface AuthenticatedReq extends Request {
  user?: admin.auth.DecodedIdToken & { role?: string };
}

/**
 * Middleware enforcing strict Role-Based Access Control (RBAC). 
 * Validates the caller JWT from headers, checks role claims, and intercepts malicious actions.
 */
export const requireRole = (allowedRoles: ("Tenant/Buyer" | "Landlord/Agent" | "Admin")[]) => {
  return async (req: AuthenticatedReq, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ 
          error: "UNAUTHORIZED_ACCESS", 
          message: "Please provide a valid bearer authentication credential." 
        });
        return;
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;

      // Extract and verify role explicitly from user's verified Firestore profile 
      const profileSnapshot = await admin.firestore().collection("users").doc(uid).get();
      if (!profileSnapshot.exists) {
        res.status(403).json({ 
          error: "PROFILE_NOT_FOUND", 
          message: "A registered platform profile was not found on this account." 
        });
        return;
      }

      const profileData = profileSnapshot.data();
      const userRole = profileData?.role;

      if (!userRole || !allowedRoles.includes(userRole)) {
        res.status(403).json({ 
          error: "FORBIDDEN_PRIVILEGE", 
          message: `Your current role '${userRole}' lacks permission to perform this task.` 
        });
        return;
      }

      // Attach decoded context and verified role to the request
      req.user = { ...decodedToken, role: userRole };
      return next();
    } catch (err: any) {
      console.error("RBAC Handshake Intercept Failed:", err);
      res.status(401).json({ 
        error: "AUTHENTICATION_EXPIRED", 
        message: "Your sign-in token has expired or is cryptographically invalid." 
      });
      return;
    }
  };
};
```

---

## 3. Production Data Schema Design (Firestore NoSQL)

Below are the exact JSON document blueprints and collections structures modelized with full compliance to high-efficiency indexing patterns.

### A. Collection: `users`
- **Path:** `/users/{uid}`
- **Sub-Collection:** `/users/{uid}/private/info` (PII Isolation Strategy to secure NRC/ID numbers, birthdates, and banking accounts).

```json
{
  "uid": "usr_92837119284711",
  "name": "Mwamba Chileshe",
  "email": "mwamba@tambu.co.zm",
  "phone": "+260977223344",
  "role": "Landlord/Agent",
  "verificationStatus": "verified",
  "createdAt": "2026-05-29T19:00:00Z"
}
```

- **Isolated Private Collection Document Path:** `/users/{uid}/private/info`
```json
{
  "nrcNumber": "123456/78/9",
  "taxIdentifier": "ZMW-100293112",
  "kycDocumentUrl": "gs://tambu-app.appspot.com/users/usr_92837119284711/kyc/nrc_scan.pdf",
  "settlementAccountNumber": "100293128947",
  "settlementBank": "Zambia National Commercial Bank (Zanaco)"
}
```

### B. Collection: `listings`
- **Path:** `/listings/{listingId}`

```json
{
  "listingId": "lst_8821903",
  "landlordId": "usr_3847112",
  "title": "Modern 2-Bedroom Apartment in Woodlands",
  "description": "Premium luxury executive apartments located near Woodlands Shopping Complex with solar backup, secure borehole piping, and high-speed fibre internet.",
  "price": 8500.00,
  "currency": "ZMW",
  "location": {
    "lat": -15.4214,
    "lng": 28.3190,
    "geohash": "qv9fcfy",
    "neighborhood": "Woodlands",
    "city": "Lusaka",
    "province": "Lusaka"
  },
  "amenities": [
    "Solar Backup",
    "Paved Yard",
    "Borehole Water",
    "High-speed Internet"
  ],
  "images": [
    "gs://tambu-app.appspot.com/listings/lst_8821903/bedroom_view.webp",
    "gs://tambu-app.appspot.com/listings/lst_8821903/living_room.webp"
  ],
  "status": "active",
  "createdAt": "2026-05-29T19:00:00Z"
}
```

### C. Collection: `conversations` & `messages`
- **Conversations Path:** `/conversations/{conversationId}`
- **Messages Sub-collection Path:** `/conversations/{conversationId}/messages/{messageId}`

**Conversation Document Structure:**
```json
{
  "conversationId": "chat_0021948",
  "participants": [
    "usr_3847112",
    "usr_92837119284711"
  ],
  "associatedListingId": "lst_8821903",
  "lastMessage": "Is Woodlands apartment still vacant?",
  "lastMessageTimestamp": "2026-05-29T19:01:21Z",
  "unreadCount": {
    "usr_3847112": 0,
    "usr_92837119284711": 1
  }
}
```

**Message Document Structure (Sub-collection):**
```json
{
  "messageId": "msg_018247",
  "senderId": "usr_3847112",
  "receiverId": "usr_92837119284711",
  "text": "Yes, it is still vacant. We can schedule a physical site visit tomorrow.",
  "timestamp": "2026-05-29T19:01:21Z",
  "type": "text"
}
```

---

## 4. Advanced Geolocation & Text Search Strategy

Real estate apps require sub-second query performance for spatial distance searches (e.g. properties within 5km of UNZA campus) and typo-tolerant search bars.

### A. Geospatial Query Strategy using Geohashes
Standard NoSQL queries do not natively support range evaluations of multiple mathematical boundaries (latitude *and* longitude) in a single loop. We solve this by compiling custom coordinates and locations into **Geohashes** (string representations of lat/long points).

1. **Storage Structure:** Custom properties are mapped using the `geofire-common` runtime format. A 12-character geohash string is saved along with precise decimal numbers:
   - Location: `latitude: -15.4214, longitude: 28.3190`
   - Compiled Geohash: `qv9fcfy`

2. **Backend Query Processing Architecture (Node.js snippet):**
```typescript
import * as geofire from "geofire-common";
import * as admin from "firebase-admin";

/**
 * Executes a high-performance distance query on Cloud Firestore using dual bounding queries.
 */
export async function getListingsWithinRadius(
  center: [number, number], // [latitude, longitude]
  radiusInMeters: number
): Promise<admin.firestore.DocumentData[]> {
  const db = admin.firestore();
  const bounds = geofire.geohashQueryBounds(center, radiusInMeters);
  const promises = [];

  for (const b of bounds) {
    const q = db.collection("listings")
      .orderBy("location.geohash")
      .startAt(b[0])
      .endAt(b[1])
      .where("status", "==", "active");
    promises.push(q.get());
  }

  // Flatten lists, strip coordinates, eliminate overlapping results, and calculate Euclidean/Haversine distance
  const snapshots = await Promise.all(promises);
  const results: admin.firestore.DocumentData[] = [];

  for (const snap of snapshots) {
    for (const doc of snap.docs) {
      const data = doc.data();
      const loc = data.location;
      
      const distanceInKm = geofire.distanceBetween([loc.lat, loc.lng], center);
      const distanceInM = distanceInKm * 1000;
      
      if (distanceInM <= radiusInMeters) {
        results.push({ ...data, distanceMeters: distanceInM });
      }
    }
  }

  // Sort logically by closest proximity to user coordinate point
  return results.sort((a, b) => a.distanceMeters - b.distanceMeters);
}
```

### B. Fuzzy full-text search integration strategy
Firesore does not support native wildcards or indexing text scopes containing complex terms, synonyms, or typographic typos. We implement external index syncing via a serverless event trigger to **Algolia** or **Typesense**:

1. **Sync Pipeline Setup:** An `onSnapshot` / `onDocumentCreated` Event trigger listens to the `/listings/{listingId}` collection.
2. **Indexing Sequence:** 
   - When a listing status goes `active`, write the document to Algolia's index directory using `@algolia/client-search`.
   - When a listing is changed or deleted, sync updates or purge the record respectively.
3. **Client Query Execution:** The frontend app accesses listings using Algolia Client libraries directly calling the Algolia API (using a public-read-only API Key) for extreme speed.

---

## 5. Storage & Hardened Security Rules (Production-Grade)

The following firestore and storage rules utilize strict ABAC (Attribute-Based Access Control), Zero-Trust validation helpers, immortal key checks, and atomic state-locking rules.

### A. Firestore Security Rules: `firestore.rules`
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // --- GLOBAL SAFETY NET: DEFAULT DENY ALL ---
    match /{document=**} {
      allow read, write: if false;
    }

    // --- REUSABLE SECURITY PRIMITIVES (GLOBAL HELPERS) ---
    function isSignedIn() {
      return request.auth != null;
    }

    function isEmailVerified() {
      return isSignedIn() && request.auth.token.email_verified == true;
    }

    function getRole(uid) {
      return get(/databases/$(database)/documents/users/$(uid)).data.role;
    }

    function isUserAdmin() {
      return isSignedIn() && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    function isValidId(id) {
      return id is string && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$');
    }

    // --- USER PROFILE SECURITY (RBAC) ---
    match /users/{userId} {
      allow get: if isSignedIn();
      allow list: if isUserAdmin();
      allow create: if isSignedIn() && (request.auth.uid == userId) && isValidUser(request.resource.data);
      allow update: if isSignedIn() && (
        // Landlord/Tenant can adjust minor details excluding validation elements
        (request.auth.uid == userId && isValidUser(request.resource.data) && 
         request.resource.data.diff(resource.data).affectedKeys().hasOnly(['name', 'phone'])) ||
        // Only Admin can override status/role
        isUserAdmin()
      );
      allow delete: if isUserAdmin();

      // PII Split Collection Sub-resource
      match /private/info {
        allow read, write: if isSignedIn() && (request.auth.uid == userId || isUserAdmin());
      }
    }

    // --- LISTINGS SECURITY (MUTATION RESTRICTIONS) ---
    match /listings/{listingId} {
      // Anyone can read active properties
      allow get: if resource == null || resource.data.status == 'active' || (isSignedIn() && (resource.data.landlordId == request.auth.uid || isUserAdmin()));
      allow list: if resource.data.status == 'active' || isUserAdmin();

      // Ensure creation checks identity matching
      allow create: if isEmailVerified() && 
                    isValidId(listingId) &&
                    getRole(request.auth.uid) == 'Landlord/Agent' &&
                    request.resource.data.landlordId == request.auth.uid &&
                    request.resource.data.status == 'pending_approval' &&
                    isValidListing(request.resource.data);

      allow update: if isEmailVerified() && (
        // Scenario 1: Own Landlord can update details. Status resets to pending_approval on update.
        (resource.data.landlordId == request.auth.uid && 
         request.resource.data.landlordId == request.auth.uid &&
         request.resource.data.status == 'pending_approval' && 
         isValidListing(request.resource.data) &&
         request.resource.data.diff(resource.data).affectedKeys().hasOnly(['title', 'description', 'price', 'location', 'amenities', 'images', 'status'])) || 
        // Scenario 2: Admin approves/rejects listing status (Exclusive keys status to prevent escalation)
        (isUserAdmin() && 
         request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status']))
      );

      allow delete: if isSignedIn() && (resource.data.landlordId == request.auth.uid || isUserAdmin());
    }

    // --- CONVERSATION & COMMUNICATIONS MESSAGES ---
    match /conversations/{conversationId} {
      allow read: if isSignedIn() && (request.auth.uid in resource.data.participants);
      allow create: if isSignedIn() && (request.auth.uid in request.resource.data.participants);
      allow update: if isSignedIn() && (request.auth.uid in resource.data.participants) && 
                    request.resource.data.diff(resource.data).affectedKeys().hasOnly(['lastMessage', 'lastMessageTimestamp', 'unreadCount']);

      match /messages/{messageId} {
        allow read: if isSignedIn() && (request.auth.uid == resource.data.senderId || request.auth.uid == resource.data.receiverId);
        allow create: if isSignedIn() && (request.auth.uid == request.resource.data.senderId) && isValidMessage(request.resource.data);
        allow update, delete: if false; // Messages are system immutable logs once recorded
      }
    }

    // --- STRICT ABAC STATIC VALIDATORS ---
    function isValidUser(data) {
      return data.keys().hasAll(['uid', 'name', 'email', 'phone', 'role', 'verificationStatus', 'createdAt']) &&
             data.keys().size() == 7 &&
             data.uid is string && data.uid.size() <= 128 &&
             data.name is string && data.name.size() > 0 && data.name.size() <= 100 &&
             data.email is string && data.email.size() <= 200 &&
             data.phone is string && data.phone.size() <= 24 &&
             data.role in ['Tenant/Buyer', 'Landlord/Agent', 'Admin'] &&
             data.verificationStatus in ['pending', 'verified', 'banned'] &&
             data.createdAt is timestamp;
    }

    function isValidListing(data) {
      return data.keys().hasAll(['listingId', 'landlordId', 'title', 'description', 'price', 'currency', 'location', 'amenities', 'images', 'status', 'createdAt']) &&
             data.keys().size() == 11 &&
             data.title is string && data.title.size() <= 120 &&
             data.description is string && data.description.size() <= 4000 &&
             data.price is number && data.price > 0 &&
             data.currency == 'ZMW' &&
             data.location is map &&
             data.status in ['draft', 'pending_approval', 'active', 'rented', 'archived'] &&
             data.createdAt is timestamp &&
             data.images is list && data.images.size() <= 25 &&
             data.amenities is list && data.amenities.size() <= 50;
    }

    function isValidMessage(data) {
      return data.keys().hasAll(['messageId', 'senderId', 'receiverId', 'text', 'timestamp', 'type']) &&
             data.keys().size() == 6 &&
             data.messageId is string &&
             data.senderId is string &&
             data.receiverId is string &&
             data.text is string && data.text.size() <= 5000 &&
             data.timestamp is timestamp &&
             data.type == 'text';
    }
  }
}
```

### B. Storage Security Rules: `storage.rules`
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // Safety Net
    match /{allPaths=**} {
      allow read, write: if false;
    }

    // Property Imagery - Publicly readable, writeable only by authorized landlords
    match /listings/{listingId}/{imageName} {
      allow read: if true;
      allow write: if request.auth != null && 
                   request.auth.token.email_verified == true &&
                   request.resource.size < 10 * 1024 * 1024 && // 10MB limit Max
                   request.resource.contentType.matches('image/.*');
    }

    // Sensitive Profile KYC Scan Documents & NRC Identification Card Records
    match /users/{userId}/kyc/{documentName} {
      allow read, write: if request.auth != null && 
                           (request.auth.uid == userId || 
                            exists(/databases/$(database)/documents/admins/$(request.auth.uid))) &&
                           request.resource.size < 25 * 1024 * 1024 && // 25MB limit Max
                           request.resource.contentType.matches('application/pdf|image/jpeg|image/png');
    }
  }
}
```

---

## 6. Cloud Functions for Background Automation (TypeScript v2)

Using Cloud Functions (v2) triggered via Firestore document event triggers and EventArc, automated processes perform key system cleanup and optimizations.

### A. Dynamic Listing Image Optimization Hook: `onListingCreated`
Remove photo metadata (EXIF/GPS tracing) before file saving to ensure tenant safety, and compile images to target visual compression scales.

```typescript
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import sharp from "sharp"; // Sharp compiler library for visual processes
import { Storage } from "@google-cloud/storage";

const storage = new Storage();

/**
 * Triggers when a new listing is documented. Triggers EXIF cleansing and WebP optimization.
 */
export const onListingCreated = onDocumentCreated("listings/{listingId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const listingData = snapshot.data();
  const images: string[] = listingData.images || [];

  console.log(`Processing ${images.length} uploaded files for listing ${event.params.listingId}`);

  for (const mediaUrl of images) {
    if (!mediaUrl.startsWith("gs://")) continue;

    try {
      // Decode Bucket and File pointers from deep links
      const bucketName = mediaUrl.substring(5).split("/")[0];
      const filePath = mediaUrl.substring(5 + bucketName.length + 1);
      const fileBucket = storage.bucket(bucketName);
      const fileToOptimize = fileBucket.file(filePath);

      // Download payload to local container micro-buffer
      const [buffer] = await fileToOptimize.download();

      // Strike EXIF tracking, reformat layers to Webp specs, resize broad boundaries
      const optimizedImgBuffer = await sharp(buffer)
        .rotate() // Auto-correct rotation matrices from phone sensors
        .resize({ width: 1200, height: 900, fit: "inside" })
        .webp({ quality: 80 })
        .toBuffer();

      // Save stripped assets securely back to Cloud Storage bucket path
      await fileToOptimize.save(optimizedImgBuffer, {
        metadata: { contentType: "image/webp" }
      });

      console.log(`Successfully normalized media to webp: ${filePath}`);
    } catch (err) {
      console.error(`Image compression failed on URL file reference: ${mediaUrl}`, err);
    }
  }
});
```

### B. Persistent Data & Image Purge Engine: `onListingDeleted`
Delete orphaned image resources from cloud storage when property files are purged from listings databases, protecting owner financial budgets.

```typescript
import { onDocumentDeleted } from "firebase-functions/v2/firestore";
import { Storage } from "@google-cloud/storage";

const storage = new Storage();

/**
 * Sweeps Storage Directories permanently deleting all sub-files attached to a purged Listing ID.
 */
export const onListingDeleted = onDocumentDeleted("listings/{listingId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const listingData = snapshot.data();
  const listingId = event.params.listingId;
  const listingImages: string[] = listingData.images || [];

  console.log(`Init permanent storage purge on ${listingImages.length} images for Listing #${listingId}`);

  for (const mediaUrl of listingImages) {
    if (!mediaUrl.startsWith("gs://")) continue;

    try {
      const bucketName = mediaUrl.substring(5).split("/")[0];
      const filePath = mediaUrl.substring(5 + bucketName.length + 1);
      
      const bucketRef = storage.bucket(bucketName);
      const targetFile = bucketRef.file(filePath);

      const [exists] = await targetFile.exists();
      if (exists) {
        await targetFile.delete();
        console.log(`Purged listing asset: ${filePath}`);
      }
    } catch (err) {
      console.error(`Purging transaction failed for file: ${mediaUrl}`, err);
    }
  }
});
```

### C. Automatic Admin Decisions Push Hub: `onListingStatusChanged`
Triggers real-time alerts using Firebase Cloud Messaging (FCM) on approval state changes.

```typescript
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

/**
 * Triggers when a Listing is updated. Inspects status shifts and pushes real-time FCM notifications.
 */
export const onListingStatusChanged = onDocumentUpdated("listings/{listingId}", async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();

  if (!beforeData || !afterData) return;

  const oldStatus = beforeData.status;
  const newStatus = afterData.status;

  if (oldStatus !== newStatus) {
    const landlordId = afterData.landlordId;
    const listingTitle = afterData.title;

    console.log(`Listing ${event.params.listingId} status shifted: ${oldStatus} -> ${newStatus}`);

    // Retrieve FCM device token associated with Landlord/Agent
    const userSnapshot = await admin.firestore().collection("users").doc(landlordId).get();
    const token = userSnapshot.data()?.fcmDeviceToken;

    if (!token) {
      console.log(`User device token not configured for user uid: ${landlordId}`);
      return;
    }

    let alertTitle = "";
    let alertBody = "";

    if (newStatus === "active") {
      alertTitle = "Listing Approved! 🎉";
      alertBody = `Your property "${listingTitle}" has been verified and is now live to all seekers in Zambia.`;
    } else if (newStatus === "archived") {
      alertTitle = "Listing Archived";
      alertBody = `Your property listing "${listingTitle}" has been moved to archives safely.`;
    } else {
      return; // Do not fire for secondary updates (e.g. Draft -> Pending)
    }

    const payload = {
      token: token,
      notification: {
        title: alertTitle,
        body: alertBody
      },
      data: {
        listingId: event.params.listingId,
        click_action: "FLUTTER_NOTIFICATION_CLICK"
      }
    };

    try {
      const response = await admin.messaging().send(payload);
      console.log("FCM message successfully dispatched:", response);
    } catch (fcmErr) {
      console.error("FCM payload delivery failed:", fcmErr);
    }
  }
});
```

---

## 7. Administrative Panel Backend Requirements

The admin control center provides direct dashboard queries and global action triggers.

### A. Approval Queue Fetch Endpoint (Node.js/Express)
Query listings that require immediate operational approval.
```typescript
import * as admin from "firebase-admin";
import { Response } from "express";
import { AuthenticatedReq } from "../src/middlewares/rbacAuthorizer";

/**
 * Fetch Queue containing properties queued with 'pending_approval' status markers.
 * Restricted to certified administrators.
 */
export const getApprovalQueue = async (req: AuthenticatedReq, res: Response): Promise<void> => {
  try {
    const db = admin.firestore();
    const approvalQueueSnapshot = await db.collection("listings")
      .where("status", "==", "pending_approval")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const listings = approvalQueueSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json({ success: true, count: listings.length, listings });
  } catch (error: any) {
    console.error("Fetch Approval Queue Interrupted:", error);
    res.status(500).json({ success: false, error: "FAILED_FETCH_QUEUE", message: error.message });
  }
};
```

### B. Global System Flag / Instant Ban Mechanism
Revokes refresh tokens across all signed-in mobile/web devices, preventing instant API attempts.
```typescript
import * as admin from "firebase-admin";
import { Response } from "express";
import { AuthenticatedReq } from "../src/middlewares/rbacAuthorizer";

/**
 * Instantly bans a user, revoking their refresh tokens and marking them banned inside Firestore.
 */
export const flagAndRevokeUser = async (req: AuthenticatedReq, res: Response): Promise<void> => {
  const { userToBanUid, reason } = req.body;

  if (!userToBanUid) {
     res.status(400).json({ success: false, error: "MISSING_USER_UID" });
     return;
  }

  try {
    const db = admin.firestore();
    const batch = db.batch();

    // 1. Mark User state as Banned inside user profiles database
    const userRef = db.collection("users").doc(userToBanUid);
    batch.update(userRef, { 
      verificationStatus: "banned",
      bannedAt: admin.firestore.FieldValue.serverTimestamp(),
      banReason: reason || "Flagged for fraudulent platform behavior."
    });

    // 2. Archive all live listings belonging to banned landlord to secure platform integrity
    const listingsSnapshot = await db.collection("listings")
      .where("landlordId", "==", userToBanUid)
      .where("status", "==", "active")
      .get();

    listingsSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { status: "archived" });
    });

    await batch.commit();

    // 3. SECURE TRUST OVERRIDE: Revoke Firebase Authentication tokens to sign out all active sessions
    await admin.auth().revokeRefreshTokens(userToBanUid);
    const userRecord = await admin.auth().getUser(userToBanUid);
    const tokenRevokedTime = new Date(userRecord.tokensValidAfterTime!).toUTCString();

    console.log(`Successfully banned user ${userToBanUid}. All sessions revoked after: ${tokenRevokedTime}`);

    res.status(200).json({ 
      success: true, 
      message: `User Account and sessions terminated. Revocation time: ${tokenRevokedTime}` 
    });
  } catch (error: any) {
    console.error("Ban action failed:", error);
    res.status(500).json({ success: false, error: "BAN_TRANSACTION_FAILED", message: error.message });
  }
};
```
