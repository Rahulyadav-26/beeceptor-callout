# 🐝 Beeceptor HTTP Callout — E2E Test Suite

![Tests](https://github.com/Rahulyadav-26/beeceptor-callout/actions/workflows/playwright.yml/badge.svg)
![Last Commit](https://img.shields.io/github/last-commit/Rahulyadav-26/beeceptor-callout)
![License](https://img.shields.io/badge/license-MIT-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript)
![Playwright](https://img.shields.io/badge/Playwright-1.45-green?logo=playwright)

> A production-grade Playwright test suite that validates Beeceptor's **HTTP Callout Rule** feature — both synchronous (response forwarding) and asynchronous (fire-and-forget) scenarios — with schema validation, realistic test data, and CI/CD.

---

## 🎯 What is HTTP Callout?

Beeceptor's **HTTP Callout Rule** transforms a mock endpoint from a passive responder into an **active integration participant**. When a request arrives, Beeceptor can trigger an outbound HTTP request to another service — either synchronously (forwarding the response) or asynchronously (fire-and-forget).

```mermaid
sequenceDiagram
    participant C as Client
    participant BM as Beeceptor Main<br/>(rahul-callout-main)
    participant BR as Beeceptor Receiver<br/>(rahul-callout-recv)
    participant WH as webhook.site<br/>(async receiver)

    Note over C,WH: 🔄 Scenario 1 — Synchronous Callout
    C->>BM: POST /api/orders {payload}
    activate BM
    BM->>BR: HTTP Callout (sync)
    activate BR
    BR-->>BM: 200 {status: "received"}
    deactivate BR
    BM-->>C: 200 {status: "received"} ← forwarded
    deactivate BM
    Note over C,BM: Client waits; gets receiver's response

    Note over C,WH: 🔥 Scenario 2 — Asynchronous Callout (Fire & Forget)
    C->>BM: POST /api/notifications {payload}
    activate BM
    BM-->>C: 202 {status: "queued"} ← immediate
    deactivate BM
    BM-)WH: HTTP Callout (background, non-blocking)
    Note over C,WH: Client unblocked; callout fires later
```

---

## 🧪 Test Suite Overview

| ID | Test | Type | Validates |
|----|------|------|-----------|
| T01 | Sync callout: receiver response forwarded | Sync | Response forwarding works |
| T02 | Sync callout: unique payload preserved | Sync | Payload is actually forwarded, not mocked |
| T03 | Sync callout: X-Correlation-ID header forwarded | Sync | Header propagation |
| T04 | Async callout: immediate 202 response | Async | Client not blocked |
| T05 | Async callout: background callout arrives | Async | Callout actually fires |
| T06 ⭐ | Async callout: timing proof | Async | Response before callout (mathematical proof) |
| T07 | Async callout: 3 requests = 3 callouts | Async | No deduplication/dropping |
| T08 | Invalid callout target URL | Negative | Graceful error handling |
| T09 | Unconfigured route fallback | Negative | Default Beeceptor behavior |
| T10 | Oversized payload (~60KB) | Negative | Size limit behavior documented |
| T11 | Missing Content-Type header | Negative | Header resilience |
| T12 | 5 concurrent requests | Edge | No race conditions |
| T13 | Empty body POST | Edge | Bodyless callouts work |
| T14 | Special chars (emoji, unicode, HTML) | Edge | Encoding integrity |

**Total: 14 tests across 4 suites**

---

## 🏗️ Project Architecture

```
beeceptor-callout/
├── src/
│   ├── api/
│   │   └── WebhookSiteClient.ts    ← Async receiver (queryable HTTP bin)
│   ├── factories/
│   │   └── payload.factory.ts      ← Faker.js: realistic test data
│   ├── fixtures/
│   │   └── beeceptor.fixture.ts    ← Custom Playwright fixtures
│   ├── schemas/
│   │   ├── response.schemas.ts     ← AJV JSON Schema definitions
│   │   └── validator.ts            ← assertSchema() utility
│   ├── types/
│   │   ├── callout.types.ts        ← TypeScript interfaces
│   │   └── webhook-site.types.ts
│   ├── utils/
│   │   ├── polling.ts              ← poll() for async verification
│   │   └── retry.ts                ← withRetry() exponential backoff
│   └── config.ts                   ← Env-based type-safe config
├── tests/
│   ├── sync-callout.spec.ts        ← T01–T03
│   ├── async-callout.spec.ts       ← T04–T07
│   ├── negative.spec.ts            ← T08–T11
│   └── edge-cases.spec.ts          ← T12–T14
├── .github/workflows/playwright.yml
├── playwright.config.ts
└── README.md
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+
- A Beeceptor account (free) at https://beeceptor.com
- Two Beeceptor endpoints configured (see setup below)

### 1. Clone & Install
```bash
git clone https://github.com/Rahulyadav-26/beeceptor-callout.git
cd beeceptor-callout
npm install
npx playwright install chromium
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your endpoint names
```

### 3. Set Up Beeceptor Rules
> See **[Beeceptor Setup Guide](#beeceptor-setup-guide)** below.

### 4. Run Tests
```bash
npm test                    # Run all tests
npm run test:sync           # Sync callout tests only
npm run test:async          # Async callout tests only
npm run report              # Open HTML report
```

---

## 🔧 Beeceptor Setup Guide

> ⚠️ Beeceptor's Management API requires a paid plan. These rules are configured via the UI once.

### Step 1: Set Up Receiver Endpoint (`rahul-callout-recv`)

1. Go to https://app.beeceptor.com → click `rahul-callout-recv`
2. Click **"Add Rule"**
3. Configure:
   - **Match:** Any method, path contains `/receiver`
   - **Response:** Status `200`, Body:
     ```json
     {
       "status": "received",
       "receivedAt": "{{now}}",
       "receiverId": "recv-001"
     }
     ```

### Step 2: Set Up Sync Callout Rule (`rahul-callout-main`)

1. Go to `rahul-callout-main` → **"Add Rule"**
2. Configure:
   - **Match:** `POST`, path = `/api/orders`
   - **Action:** HTTP Callout (Synchronous)
   - **Target URL:** `https://rahul-callout-recv.free.beeceptor.com/receiver`

### Step 3: Set Up Async Callout Rule (`rahul-callout-main`)

1. Add another rule on `rahul-callout-main`
2. Configure:
   - **Match:** `POST`, path = `/api/notifications`
   - **Action:** HTTP Callout (Asynchronous / Fire & Forget)
   - **Target URL:** `https://webhook.site/<your-token>` ← from test output
   - **Immediate Response:** Status `202`, Body:
     ```json
     {
       "status": "queued",
       "message": "Notification queued for delivery",
       "requestId": "{{guid}}"
     }
     ```

> 💡 **Tip for async tests:** Run `npm run test:async` once — it prints the webhook.site URL in the console. Update the Beeceptor async rule target to that URL.

---

## 🔑 Why webhook.site for Async Tests?

During development, I discovered that **Beeceptor's request history API requires a Team/Enterprise plan**. Rather than stopping at "can't verify async callouts," I adapted:

| Approach | Issue |
|----------|-------|
| Beeceptor History API | ❌ Paid plan required |
| Beeceptor UI scraping | ❌ Fragile, login required |
| **webhook.site** | ✅ Free, REST API, no auth needed |

webhook.site provides a unique URL that logs all incoming requests. Its free REST API lets tests query received requests programmatically — perfect for verifying fire-and-forget callouts.

---

## 📊 Key Design Decisions

### 1. Polling over `setTimeout`
Instead of `await sleep(5000)` (naive), the `poll()` utility retries until the condition is true or times out. This makes tests faster (stop polling as soon as callout arrives) and more reliable.

### 2. AJV Schema Validation
Every API response is validated against a JSON Schema before assertions. This catches shape changes early — if Beeceptor changes its response format, the schema error pinpoints the exact field.

### 3. Faker.js — No Hardcoded IDs
Each test run uses unique `orderId`, `notificationId`, etc. This proves that payloads are actually forwarded (not served from cache) and makes tests independent.

### 4. Custom Fixture with Per-Test Tokens
The `webhookToken` fixture creates a fresh webhook.site token per test and cleans up after. This guarantees complete test isolation — no cross-contamination in request history.

---

## ⭐ Highlight: T06 Timing Proof

The most interesting test in the suite. Rather than just asserting "async callout works," T06 **mathematically proves** non-blocking behavior:

```
t0: POST request sent
t1: 202 response received    ← client unblocked
t2: callout detected         ← background callout arrived

Assertion: t1 ≤ t2
```

If `t1 > t2`, it would mean the response arrived AFTER the callout — proving the callout was actually synchronous, not async. This is a behavior proof, not just a smoke test.

---

## 🤖 CI/CD

Tests run automatically on every push and daily at 11:30 AM IST.

- **Artifacts:** HTML report uploaded as GitHub artifact (30-day retention)
- **Pages:** Latest report deployed to GitHub Pages
- **PR Comments:** Test report URL posted automatically on pull requests
- **Retries:** Flaky tests retry up to 2 times in CI (network-dependent)

---

## ⚠️ Known Limitations

1. **Async test URL** — webhook.site token is dynamic; the Beeceptor async callout target URL must be updated when the token changes. In a Team plan, this would be managed via the Management API.

2. **Free plan rate limit** — Beeceptor free plan allows ~50 requests/day per endpoint. The concurrent test (T12) uses 5 requests at once.

3. **Timing sensitivity (T06)** — If both Beeceptor and webhook.site are under heavy load, the timing assertion may have a very small margin. The test uses UTC timestamps from webhook.site API which adds ~1-2s of clock skew tolerance.

4. **Management API** — Beeceptor's programmatic rule management requires a paid plan. Rules are pre-configured via UI and documented above.

---

## 🚀 Future Improvements

- [ ] Pact.js consumer contracts for Beeceptor Management API (when paid plan available)
- [ ] Payload transformation verification (Handlebars templates in callout body)
- [ ] OAuth callout testing (API Connections feature)
- [ ] Performance benchmarking: callout latency distribution
- [ ] Automatic webhook.site URL injection via Beeceptor API (paid plan)

---

## 📄 License

MIT © [Rahul Yadav](https://github.com/Rahulyadav-26)
