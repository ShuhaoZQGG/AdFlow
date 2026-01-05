# Permissions Justification for AdFlow Network Inspector

This document explains why AdFlow Network Inspector requires each permission. This information should be provided to Chrome Web Store reviewers during the submission process.

## Extension Purpose

**AdFlow Network Inspector** is a developer tool for debugging and analyzing advertising technology (adtech) network requests. It helps ad operations teams, publisher engineers, and technical professionals troubleshoot header bidding implementations, identify discrepancies, and optimize ad performance.

**Target Audience:** Professional developers, ad operations specialists, and technical teams working with programmatic advertising.

---

## Required Permissions

### 1. `webRequest` Permission

**Why Required:**  
Core functionality. This permission allows the extension to intercept and inspect HTTP/HTTPS network requests made by web pages.

**How We Use It:**
- Capture network requests to identify adtech-related traffic (SSPs, DSPs, verification pixels, etc.)
- Read request/response headers to extract metadata (timing, status codes, content types)
- Access request bodies to decode bid requests, impression pixels, and viewability beacons
- Monitor request completion and timing for waterfall analysis

**What We DON'T Do:**
- We do NOT modify, block, or redirect any requests
- We do NOT capture requests outside of the active debugging session
- We do NOT send captured data to external servers (unless user explicitly enables AI features)

**Code Reference:**  
`src/entrypoints/background.ts` lines 216-410 - Request interception listeners

---

### 2. `<all_urls>` Host Permission

**Why Required:**  
Advertising requests can originate from hundreds of different domains. Adtech vendors include:
- SSPs (Supply-Side Platforms): Rubicon, Index Exchange, PubMatic, OpenX, etc.
- DSPs (Demand-Side Platforms): The Trade Desk, DV360, Amazon DSP, Criteo, etc.
- Verification Services: IAS, DoubleVerify, MOAT, Comscore, etc.
- Identity Providers: LiveRamp, ID5, UID 2.0, Tapad, etc.
- Ad Servers: Google Ad Manager, Sizmek, Flashtalking, etc.
- CDNs: Cloudflare, Akamai, Fastly, CloudFront, etc.

**Specific Use Case:**  
A single page load can trigger 50-200+ requests across 20-50 different vendors. Without broad host access, we cannot:
1. Capture bid requests sent to multiple SSPs
2. Track impression pixels firing to various measurement providers
3. Monitor creative delivery from CDNs
4. Analyze cookie sync traffic to identity providers

**Alternative Considered:**  
We considered limiting to specific domains, but:
- Publishers use different SSP/DSP combinations
- New vendors emerge regularly
- Many vendors use multiple domains (cdn.vendor.com, api.vendor.com, etc.)
- Custom implementations use proprietary domains

**Protection Measures:**
- Extension only processes requests when DevTools panel is open
- Data stored locally in browser memory only
- No data transmission without explicit user consent (AI features)
- Users can clear captured data at any time

**Code Reference:**  
`src/lib/vendors/taxonomy.ts` - Comprehensive vendor domain patterns (200+ vendors)

---

### 3. `storage` Permission

**Why Required:**  
Store user preferences and optional AI API keys locally on the user's device.

**What We Store:**
- User interface preferences (theme, dark mode variant)
- Optional AI settings (mode: direct/backend/disabled)
- Optional user-provided API key (for AI features, stored encrypted in chrome.storage.local)
- Filter and search preferences

**What We DON'T Store:**
- Browsing history
- Captured network request data (kept in memory only)
- Personal information
- Cookies or authentication tokens

**Data Retention:**  
- Settings persist until user clears them or uninstalls extension
- Network request data is cleared when tab closes or user navigates away
- API keys can be deleted by user at any time from settings

**Code Reference:**  
`src/lib/ai/index.ts` lines 60-111 - Secure API key storage
`src/contexts/ThemeContext.tsx` - User preferences

---

### 4. `tabs` Permission

**Why Required:**  
Track which browser tab each network request belongs to for proper organization and display.

**How We Use It:**
- Associate captured requests with the correct tab
- Display tab-specific debugging information
- Clear request data when tab closes
- Inject content scripts into active tabs for element picker feature

**What We DON'T Do:**
- We do NOT track browsing history
- We do NOT access tab content unrelated to adtech requests
- We do NOT share tab information externally

**Code Reference:**  
`src/entrypoints/background.ts` lines 33-34, 191-196 - Tab-based request storage

---

### 5. `webNavigation` Permission

**Why Required:**  
Detect when users navigate to new pages to reset request capture and inject content scripts.

**How We Use It:**
- Clear previous page's request data when navigation occurs
- Re-inject content scripts after page load
- Track frame hierarchy for iframe-based ads
- Synchronize request capture with page lifecycle

**Code Reference:**  
`src/entrypoints/background.ts` lines 157-188 - Navigation listeners

---

### 6. `scripting` Permission

**Why Required:**  
Inject content scripts to enable the element picker feature and detect ad slots on pages.

**How We Use It:**
- Inject element picker script when user activates the feature
- Detect ad slot IDs from Prebid.js and Google Ad Manager on the page
- Allow users to click on ad slots to see related network requests
- Highlight ad containers for debugging

**User Control:**  
Element picker only activates when user explicitly clicks the "Pick Element" button.

**Code Reference:**  
`src/entrypoints/content.ts` - Element picker and slot detection
`src/entrypoints/background.ts` lines 47-69 - Content script injection

---

### 7. `alarms` Permission

**Why Required:**  
Manifest V3 service workers automatically terminate after 30 seconds of inactivity. We use alarms to keep the background service worker responsive.

**How We Use It:**
- Create periodic alarm (every 30 seconds) to prevent service worker termination
- Ensure continuous request monitoring while DevTools panel is open
- No user-facing functionality - purely technical requirement

**Code Reference:**  
`src/entrypoints/background.ts` lines 17-30 - Keep-alive mechanism

---

### 8. `sidePanel` Permission

**Why Required:**  
Display the extension's debugging interface in Chrome's side panel (new in Chrome 114+).

**How We Use It:**
- Provide non-intrusive debugging interface alongside the webpage
- Allow users to analyze requests without switching tabs
- Integrate with Chrome DevTools workflow

**User Control:**  
Users can close the side panel at any time. Extension works equally well in DevTools panel.

**Code Reference:**  
`wxt.config.ts` line 30-32 - Side panel configuration

---

## Optional Host Permissions (AI Features Only)

These permissions are declared for transparency but are only used when users explicitly enable AI features:

### `https://api.anthropic.com/*`

**Why Declared:**  
Users can optionally enable AI-powered request analysis using their own Anthropic Claude API key.

**When Used:**
- Only when user provides their own API key (Direct Mode)
- Only when user clicks "Explain with AI" button
- Never used automatically

**Data Sent:**
- Request URL and decoded payload
- Vendor and request type metadata
- HTTP headers (sanitized)

**User Control:**
- Completely optional feature
- User can remove API key at any time
- Clear consent required in settings

**Code Reference:**  
`src/lib/ai/index.ts` lines 117-163 - Direct API mode

### `https://adflow-api.adflow.workers.dev/*`

**Why Declared:**  
Alternative AI mode where requests are proxied through our backend (users don't need their own API key).

**When Used:**
- Only when user selects "Backend Mode" in settings
- Only when user clicks "Explain with AI" button
- Never used automatically

**Privacy:**
- Our backend does not log or retain any data
- Requests processed in-memory only
- No persistent storage of user data
- See Privacy Policy for full details

**User Control:**
- Completely optional feature
- Can switch to Direct Mode or disable AI entirely
- Clear consent required in settings

**Code Reference:**  
`src/lib/ai/index.ts` lines 200-259 - Backend proxy mode

---

## Web Accessible Resources

### `/injected.js`

**Why Required:**  
Detect Prebid.js and Google Ad Manager configurations directly from the page context (not accessible from content script context due to isolated worlds).

**How We Use It:**
- Read Prebid.js auction configuration
- Extract GAM ad slot information
- Map ad slots to DOM elements
- No modification of page behavior

**Code Reference:**  
`public/injected.js` - Page context script

---

## Data Handling Summary

**Local by Default:**
- All network request data stored in browser memory only
- No transmission to external servers unless AI features enabled
- Data cleared when tab closes or user navigates

**Optional Cloud Features:**
- AI analysis requires explicit user action
- Users choose between own API key or our backend
- Full transparency in Privacy Policy

**No Tracking:**
- No analytics or telemetry
- No user behavior tracking
- No monetization of user data
- No third-party advertising

---

## Security Measures

1. **Content Security Policy:** MV3 built-in protections
2. **HTTPS Only:** All external requests use encrypted connections
3. **Minimal Data Retention:** Memory-only storage, cleared on navigation
4. **API Key Protection:** Stored in chrome.storage.local (more secure than localStorage)
5. **User Consent:** AI features require explicit opt-in
6. **No eval():** No dynamic code execution
7. **Sandboxed Content Scripts:** Isolated from page context

---

## Target Use Cases

This extension is designed for professional use by:

1. **Ad Operations Teams** debugging discrepancies between ad servers
2. **Publisher Engineers** implementing header bidding (Prebid.js, Amazon TAM)
3. **SSP/DSP Integration Specialists** testing new vendor connections
4. **Technical Account Managers** diagnosing client issues
5. **QA Engineers** verifying ad implementations

**Not Intended For:**
- General consumers
- Ad blocking (we don't block anything)
- Privacy protection (this is a debugging tool)
- Children under 13

---

## Comparison to Similar Extensions

**Why More Permissive Than DevTools Network Tab:**
- Automatic vendor recognition (200+ vendors)
- Payload decoding (base64, OpenRTB, JSON)
- Cross-request issue detection
- Ad flow visualization
- Optional AI explanations

**Why <all_urls> Instead of Specific Domains:**
- Chrome DevTools Network Inspector uses similar broad access
- Omnibug (popular ad debugging tool) uses similar permissions
- Charles Proxy and Fiddler (desktop tools) have unlimited access
- No way to predict which domains publishers use

---

## Compliance

- ✅ Single Purpose: Debug adtech network requests
- ✅ Privacy Policy: Comprehensive policy hosted publicly
- ✅ User Control: Can disable features, clear data, uninstall anytime
- ✅ Transparency: All code available for review
- ✅ Minimal Permissions: Only request what's necessary for functionality
- ✅ GDPR Compliant: Clear consent, data minimization, right to deletion
- ✅ No Deceptive Behavior: Clear descriptions, honest marketing

---

## Contact Information

**For Chrome Web Store Review Team:**

- Developer Email: privacy@adflow-inspector.dev
- GitHub Repository: [Add your repo URL]
- Privacy Policy: https://yourusername.github.io/AdFlow/privacy-policy.html
- Documentation: [Add docs URL]

**For Questions or Clarifications:**

We are happy to provide:
- Code walkthrough
- Additional documentation
- Screen recording of functionality
- Answers to specific concerns

---

## Testing Instructions for Reviewers

To verify the extension's functionality:

1. **Install Extension:**
   - Load unpacked from `/output/chrome-mv3/`
   - Or install from Chrome Web Store once published

2. **Basic Request Capture:**
   - Visit any website (e.g., cnn.com, nytimes.com)
   - Open Chrome DevTools → "AdFlow" panel
   - Refresh the page
   - Observe captured adtech requests with vendor labels

3. **Verify No Background Activity:**
   - Close DevTools panel
   - Check background service worker logs (no continuous activity)
   - Verify no network requests made by extension itself

4. **Test AI Features (Optional):**
   - Open Settings
   - Select "Backend Mode" (no API key needed for testing)
   - Click "Explain with AI" on any request
   - Verify request sent to adflow-api.adflow.workers.dev only when clicked

5. **Verify Data Isolation:**
   - Capture requests on one tab
   - Switch to another tab
   - Verify requests are tab-specific
   - Close original tab
   - Verify data cleared for that tab

---

**Last Updated:** January 4, 2026  
**Extension Version:** 1.0.0  
**Manifest Version:** 3

