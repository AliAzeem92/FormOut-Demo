# ShipLink — Social Commerce Courier Bridge

A fast, clean, demo-ready proof-of-concept designed for Pakistani social-commerce sellers (Instagram, Facebook, and WhatsApp merchants). 

Pakistani social sellers spend hours daily manually copying customer names, phone numbers, and addresses from chat threads into courier booking portals (like PostEx). **ShipLink** solves this with a streamlined, single-page workflow: save the customer order once with product imagery, and dispatch it to the courier with a single click.

---

## Architecture & Data Flow

```text
[ Browser / Single-Page UI at "/" ]
                │
                ├── 1. Upload Product Image (JPEG, PNG, WebP <= 5MB)
                │      │
                │      ▼
                │   [ POST /api/upload ] ───────► [ Cloudinary CDN ]
                │                                    (Stored & delivered as WebP)
                │                                                │
                │   ◄── Returns WebP Delivery URL ───────────────┘
                │
                ├── 2. Save Order Details (Zod validated, Pakistani phone format)
                │      │
                │      ▼
                │   [ POST /api/orders ] ───────► [ MongoDB Atlas (Replica Set) ]
                │                                    (State: UNBOOKED / "Pending")
                │
                └── 3. One-Click Courier Dispatch
                       │
                       ▼
                    [ POST /api/orders/[id]/dispatch ]
                       │
                       ├── Atomic Lock (`prisma.order.updateMany`)
                       │   (Moves UNBOOKED/FAILED -> BOOKING_IN_PROGRESS; rejects duplicates with 409)
                       │
                       ▼
                    [ lib/postex.ts ]
                       │
                       ├── MOCK MODE (MOCK_COURIER=true):
                       │   - Simulates 1.5s courier latency
                       │   - Generates MOCK- tracking number
                       │   - Supports "[fail]" note trigger for demoing errors & retries
                       │
                       └── REAL MODE (Safe Stub):
                           - Reverts to UNBOOKED if token is missing
                           - Throws descriptive integration checklist error
                       │
                       ▼
                    [ Database Update ]
                       ├── Success -> Status: BOOKED ("Sent to PostEx") + Tracking Number
                       └── Failure -> Status: FAILED ("Failed") + Error Message & Retry CTA
```

### Order Status Lifecycle & Atomic Safety
1. **`UNBOOKED` ("Pending" - Amber):** Order is recorded in MongoDB. Ready to dispatch.
2. **`BOOKING_IN_PROGRESS` ("Sending..." - Blue):** The server acquires an atomic conditional update lock (`updateMany`). If two requests hit the endpoint simultaneously, exactly one acquires the lock; all others return `HTTP 409 Conflict`. Stale locks older than 2 minutes are automatically reclaimed.
3. **`BOOKED` ("Sent to PostEx" - Green):** Courier booking succeeded. Tracking number and booking timestamp are stored. Action button is removed.
4. **`FAILED` ("Failed" - Red):** Courier booking was rejected. A readable error message is stored and a "Retry" button is enabled.

---

## Tech Stack

- **Framework:** Next.js 16.3.7 (App Router, Turbopack, React 19.2.8)
- **Styling:** Vanilla Tailwind CSS v4 (`@import "tailwindcss";`) + `lucide-react` icons
- **Database & ORM:** MongoDB Atlas (Replica Set) + Prisma ORM 6.19.3 pinned (`prisma-client-js` generator with MongoDB connector)
- **Media Storage:** Cloudinary (server-side upload buffer, forced conversion and delivery as WebP)
- **Validation:** Zod 4 for input schema validation (Pakistani phone format, operational cities, numeric boundaries)

---

## Project Setup (Fresh Clone)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the project root containing the following environment variable names:

- `DATABASE_URL`: MongoDB Atlas replica set connection string. Obtain this from the MongoDB Atlas Console (**Database > Connect > Drivers > Node.js**). Format: `mongodb+srv://<username>:<password>@<cluster-host>/shiplink?appName=Cluster0`.
- `CLOUDINARY_CLOUD_NAME`: Cloud name from Cloudinary Console Dashboard.
- `CLOUDINARY_API_KEY`: API Key from Cloudinary Console (**Settings > Access Keys**).
- `CLOUDINARY_API_SECRET`: API Secret from Cloudinary Console (**Settings > Access Keys**).
- `MOCK_COURIER`: Set to `"true"` to enable simulated courier mode with MOCK- tracking numbers. Set to `"false"` to enable real live PostEx dispatch.
- `POSTEX_API_TOKEN`: Merchant API token provided by PostEx (required when `MOCK_COURIER="false"`).
- `POSTEX_PICKUP_ADDRESS_CODE`: (Optional) Merchant pickup warehouse code (obtained via `npm run postex:check`). If omitted, PostEx uses the default registered merchant warehouse.

> **Important Setup Notes:**
> - **MongoDB Atlas:** Ensure your IP address is whitelisted in Atlas (**Network Access** -> Add IP Address / Allow access from anywhere `0.0.0.0/0` for demo purposes).
> - **Cloudinary API Keys:** In the Cloudinary Console (**Settings > Access Keys**), make sure the API key used has the **Media Management (Upload)** role assigned, or use the account's Master API key.
> - **PostEx Operational Cities Casing:** The official PostEx v4.1.9 guide specifies `operationalCityType=Delivery`, but PostEx's live Java Spring Boot backend defines the enum in lowercase (`delivery`). Querying `Delivery` returns HTTP 400 (`No enum constant com.postex.enums.OperationalCityTypeOptions.Delivery`), while `delivery` returns all 900 delivery cities (verified on 2026-10-01). The sync script handles this automatically.

### 3. Push Schema to Database
```bash
npm run prisma:push
```

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available NPM Scripts

- `npm run dev`: Starts the Next.js dev server with Turbopack.
- `npm run build`: Compiles production build and runs TypeScript type checking.
- `npm run start`: Runs the built production application.
- `npm run lint`: Runs ESLint 9 across all project files.
- `npm run prisma:push`: Pushes schema definitions directly to MongoDB Atlas.
- `npm run prisma:generate`: Re-generates the local Prisma Client types.
- `npm run postex:check`: Verifies PostEx credentials and queries operational delivery cities count and registered pickup addresses without revealing tokens or phone numbers.
- `npm run sync:cities`: Fetches operational delivery cities for Pakistan from PostEx, deduplicates case-insensitively, and regenerates `lib/cities.ts` (900 cities).

---

## API Routes & Usage

| Route | Method | Purpose | Used by UI? |
|---|---|---|---|
| `/api/orders` | `GET` | Fetches all orders (newest first, `no-store`) | Yes (Table load & refresh) |
| `/api/orders` | `POST` | Validates & creates a new order (`UNBOOKED`) | Yes (Create Order Modal) |
| `/api/upload` | `POST` | Validates file (max 5MB, JPEG/PNG/WebP) & uploads to Cloudinary | Yes (Create Order Modal) |
| `/api/orders/[id]/dispatch` | `POST` | Atomically locks order and calls courier client | Yes ("Send to PostEx" & "Retry") |

*Note: The unauthenticated `DELETE /api/orders/[id]` route was removed to maintain a strict, secure API boundary.*

---

## Mock Mode vs. Real Mode

### Switching Between Modes
- Set `MOCK_COURIER="true"` in `.env.local` to run in simulated mode (displays amber **"Sandbox mode"** badge).
- Set `MOCK_COURIER="false"` in `.env.local` and configure `POSTEX_API_TOKEN` to run with the live PostEx API (displays green **"Live mode"** badge).

### Mock Mode Details (`MOCK_COURIER="true"`)
- Simulates realistic ~1.5s courier latency.
- Generates `MOCK-` tracking numbers (e.g. `MOCK-75569301`) and courier references (`PX-...`).
- **Triggering Failure for Demos:** Add `[fail]` anywhere in the order's **Order Notes** field. The mock courier will intentionally reject the booking with an error message, allowing you to demonstrate the `FAILED` status and the **Retry** workflow.

### Real PostEx Integration (`MOCK_COURIER="false"`)
- Dispatches live bookings to PostEx Merchant API `POST https://api.postex.pk/services/integration/api/order/v3/create-order`.
- Authenticates using the `token: <POSTEX_API_TOKEN>` header.
- Enforces an internal 12-second `AbortController` timeout guard (shorter than the route's 15-second atomic lock guard).
- Successfully books orders with status `BOOKED` and stores the official tracking number (`CX-...`).
- Canonicalizes city names case-insensitively against official operational delivery cities before dispatching. If an order specifies a city not serviced by PostEx, the dispatch fails before making any outbound network call with a clear notification: *"City '<city>' is not in the PostEx city list. Create a new order with a valid city."*

---

## 5-Minute Classroom Presentation Demo Script

1. **The Problem (30 seconds):**
   - *"Pakistani social sellers on Instagram and WhatsApp receive orders via chat. They manually open courier portals, copy-paste addresses, and make frequent typos. ShipLink bridges this gap in a single screen."*
2. **The Interface (30 seconds):**
   - Show `http://localhost:3000`. Point out the clean UI, responsive layout, and the **Sandbox mode** badge (explaining that live couriers require active merchant agreements).
3. **Order Creation & Cloudinary WebP (1 minute):**
   - Click **"+ Create New Order"**.
   - Pick a product image: point out the instant preview.
   - Enter: Product Title (`Silk Kurti`), Price (`3500`), Quantity (`1`).
   - Enter Customer: `Ayesha Khan`, Phone (`0300-1234567` — show that dashes/spaces are accepted), Address (`House 12, Street 4`), City (`Lahore`).
   - Click **"Place Order"**: show the loading spinner preventing double submissions, the auto-close, the green success toast, and the new order at the top with a **"Pending"** badge.
4. **One-Click Courier Dispatch (1 minute):**
   - Click **"Send to PostEx"**.
   - Notice the button immediately changes to **"Sending..."** with a spinner (concurrency lock).
   - After ~1.5s, the badge turns green: **"Sent to PostEx"** with tracking number `MOCK-XXXXXXXX`.
5. **Handling Courier Failures & Retries (1 minute):**
   - Create another order, but in Order Notes type `Urgent [fail] test`.
   - Click **"Send to PostEx"**.
   - Show the transition to the red **"Failed"** badge with the message: *"Mock courier rejected this order"*.
   - Point out the **"Retry"** button, explaining how transient network or courier errors are safely recoverable.
6. **Persistence Proof (30 seconds):**
   - Refresh the browser (`F5`). Show that all orders, statuses, and tracking numbers are persisted in MongoDB Atlas, and images load fast from Cloudinary via WebP.

---

## Likely Teacher Questions & Answers

1. **Q: Why use Mock mode instead of live PostEx credentials?**
   - *A: Live courier APIs create actual pickup tickets in courier warehouses and trigger driver assignments. Mock mode allows safe, repeatable university demonstrations and integration testing without creating fake physical courier pickups.*
2. **Q: How does the application prevent duplicate courier bookings if the user clicks twice?**
   - *A: We use a two-layer defense. On the client, the button immediately disables with an optimistic loading state. On the server, `POST /api/orders/[id]/dispatch` runs an atomic conditional update (`updateMany`) in MongoDB. If two concurrent requests hit the server, only one can transition the state from `UNBOOKED` to `BOOKING_IN_PROGRESS`; the second fails with HTTP 409 Conflict.*
3. **Q: How would multiple sellers use this system?**
   - *A: In this proof-of-concept, credentials live in `.env.local` for a single seller. In a multi-tenant production version, we would add NextAuth / Clerk authentication, a `Seller` model, and store courier API tokens encrypted in the database (AES-256-GCM) per seller.*
4. **Q: What happens if the courier API takes too long or goes down?**
   - *A: The dispatch route is protected by a 15-second `Promise.race` timeout guard. If the courier fails to respond within 15 seconds, the request aborts, the atomic lock is released, and the order is marked `FAILED` with an actionable error so the seller can retry.*
5. **Q: Why MongoDB Atlas instead of PostgreSQL?**
   - *A: Social commerce order metadata is semi-structured (varying product attributes, optional customer notes, and nested courier payload responses). MongoDB document storage combined with Prisma ORM provides strict schema validation while remaining flexible for diverse courier payloads.*

---

## Known Limitations

- **Single Seller:** Configured for one merchant; credentials reside in server environment variables.
- **No Authentication:** Single-tenant demo without user login screens.
- **Operational City List:** [lib/cities.ts](lib/cities.ts) is synchronized directly from PostEx's operational delivery cities via `npm run sync:cities` (900 active delivery cities).
- **PostEx State Post-Creation:** After order creation, PostEx reports the order as `"UnBooked"`. Generating load sheets, downloading airway bills, and booking courier pickup arrangements are out of scope for this demo and are not built.
- **No Automated Webhook Sync:** Tracking statuses (In Transit, Delivered, Returned) do not auto-sync without courier webhook listeners.
- **No Order Editing:** Orders cannot be edited once placed (must be created fresh).

---

## Roadmap

- [ ] Multi-tenant merchant accounts with encrypted per-seller API credentials.
- [ ] Multi-courier support (PostEx, Leopards, Trax, TCS).
- [ ] Shareable one-time checkout links sent to WhatsApp buyers to self-fill delivery addresses.
- [ ] Courier webhook integration for real-time tracking updates (Out for Delivery, Delivered, COD Remittance).
