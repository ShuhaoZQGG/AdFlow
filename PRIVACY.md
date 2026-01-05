# Privacy Policy - AdFlow Network Inspector

**Last Updated:** January 4, 2026

## Overview

AdFlow Network Inspector is a browser extension designed for developers, ad operations teams, and technical professionals to debug and analyze advertising technology (adtech) network requests.

**Core Privacy Principle:** Your data stays on your device by default. We do not collect, store, or transmit any of your browsing data to our servers unless you explicitly enable optional AI-powered features.

## 1. Data Collection and Usage

### 1.1 What Data the Extension Accesses

To provide debugging functionality, AdFlow Network Inspector intercepts and analyzes network requests:

- **URLs and domains** of network requests
- **HTTP headers** (both request and response)
- **Request and response payloads** (body content)
- **Timing information** (when requests started, duration, etc.)
- **Page DOM elements** (when using the element picker feature)

### 1.2 How Data is Stored

**All captured data is stored locally in your browser:**

- Network request data is stored in browser memory (RAM) while active
- User preferences stored in `chrome.storage.local`
- Data is cleared when you close the tab or navigate away
- No data persists across browser sessions unless you export it

**We do not have access to your locally stored data. It never leaves your device unless you explicitly use AI features.**

### 1.3 Data We Do NOT Collect

- Personal browsing history
- Passwords or authentication credentials
- Credit card or payment information
- Personal identification information (PII)
- Analytics or usage telemetry
- Cookies from websites you visit

## 2. AI-Powered Features (Optional)

AI features are **opt-in and disabled by default**.

### 2.1 Two Operation Modes

#### Direct Mode (Bring Your Own API Key)
- You provide your own Anthropic Claude API key
- Extension sends data directly from your browser to `https://api.anthropic.com`
- Your API key is stored locally on your device
- We never see your API key or data
- Subject to [Anthropic's Privacy Policy](https://www.anthropic.com/legal/privacy)

#### Backend Mode (Our Proxy Server)
- Data sent to our backend: `https://adflow-api.adflow.workers.dev`
- Our server forwards to Anthropic's API using our key
- **We do not log, store, or retain** any data sent to our backend
- Data processed in-memory only and discarded immediately
- Hosted on Cloudflare Workers ([Privacy Policy](https://www.cloudflare.com/privacypolicy/))

### Data Sent to AI Services

When using AI features, the following may be sent to Anthropic:
- Request URLs and domains
- Decoded request/response payloads
- HTTP headers (sanitized of sensitive tokens when possible)
- Vendor and request type metadata

**⚠️ This data may contain advertising IDs, bid prices, or other ad-related information.** Do not use AI features if analyzing sensitive data.

### 2.2 Disabling AI Features

Disable AI at any time by:
- Opening extension settings
- Removing your API key (Direct Mode)
- Switching AI mode to "Disabled"

## 3. Permissions Explanation

| Permission | Why We Need It |
|------------|----------------|
| `webRequest` | Intercept and inspect network requests (core functionality) |
| `<all_urls>` | Capture requests from any domain (ads come from hundreds of sources) |
| `storage` | Save preferences and settings locally |
| `tabs` & `webNavigation` | Track which tab owns each request, reset on navigation |
| `scripting` | Enable element picker to select ad slots on pages |
| `sidePanel` | Display debugging interface in Chrome's side panel |

## 4. Data Sharing and Third Parties

### 4.1 Third-Party Services

Only when AI features are enabled:
- **Anthropic Claude API** - AI analysis ([Privacy Policy](https://www.anthropic.com/legal/privacy))
- **Cloudflare Workers** - Backend proxy hosting ([Privacy Policy](https://www.cloudflare.com/privacypolicy/))

### 4.2 No Data Selling

**We do not sell, rent, or trade your data.** We do not monetize user data.

### 4.3 No Analytics or Tracking

AdFlow Network Inspector includes **no analytics, tracking, or telemetry**.

## 5. User Control and Data Deletion

### Viewing Your Data
All captured data is visible in the extension's interface.

### Deleting Your Data
- **Clear session:** Click "Clear" button to remove captured requests
- **Close tab:** Data automatically cleared when tab closes
- **Uninstall:** Removes all settings and data from browser
- **Remove API key:** Delete from settings panel anytime

### Exporting Your Data
Export requests as JSON or PDF to your local device.

## 6. Security

### API Key Storage
- Stored in Chrome's secure `chrome.storage.local`
- Never transmitted to our servers
- We recommend using keys with minimal permissions

### Secure Connections
All external communications use HTTPS encryption.

### No Backend Data Retention
Our proxy server:
- Processes requests in-memory only
- Does not write to disk or databases
- Does not retain logs of request content
- Discards all data immediately after responses

## 7. Children's Privacy

AdFlow Network Inspector is a developer tool not intended for children under 13. We do not knowingly collect information from children.

## 8. Changes to This Policy

We may update this privacy policy. Changes reflected by updating the "Last Updated" date. Material changes will be announced through the extension or Chrome Web Store listing.

## 9. Legal Basis (GDPR)

For EEA users:
- **Legitimate Interest:** Providing debugging functionality
- **Consent:** For optional AI features (explicit consent when enabled)

You may withdraw consent anytime by disabling AI or uninstalling.

## 10. Contact Information

**Email:** privacy@adflow-inspector.dev  
**GitHub Issues:** [GitHub Repository](https://github.com/yourusername/adflow-inspector/issues)

**Data Protection Rights:** You have the right to lodge a complaint with your local data protection authority.

---

© 2026 AdFlow Network Inspector. All rights reserved.

