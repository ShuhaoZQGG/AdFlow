AdFlow Network Inspector
Product & Technical Specification  |  v1.0 Draft
Executive Summary
AdFlow Network Inspector is a browser extension that transforms the chaotic world of adtech network requests into a clear, understandable narrative. It intercepts, categorizes, and explains HTTP traffic in real-time—turning waterfall charts and HAR files into actionable insights that both engineers and non-technical stakeholders can understand.
Target Users: Ad Operations teams, Publisher engineers, SSP/DSP integration specialists, Adtech QA engineers, and Technical Account Managers debugging live campaigns.
Core Value Proposition: Reduce debugging time from hours to minutes by providing instant, contextual explanations of what's happening in the ad request chain—and what's going wrong.
Problem Statement
Debugging adtech implementations is notoriously painful. A single page load can trigger 50–200+ network requests across dozens of vendors: SSPs, DSPs, verification services, measurement providers, CDNs, and more. Current tools force users to:
Manually parse HAR files or Chrome DevTools waterfall charts
Cross-reference obscure domain names against mental vendor catalogs
Decode base64 payloads and URL-encoded parameters by hand
Reconstruct timing relationships to identify race conditions
Explain technical findings to non-technical stakeholders
This creates a high barrier to entry for debugging, long resolution times for revenue-impacting issues, and communication gaps between technical and business teams.
Competitive Landscape

Key Differentiator: No existing tool provides AI-powered, real-time explanation of adtech request chains with ordering analysis and plain-English summaries.
Product Features
MVP (v1.0) — 6-8 weeks
Goal: Validate core value proposition with adtech power users
Request Interception & Capture — Hook into chrome.webRequest and chrome.devtools.network APIs to capture all HTTP/HTTPS traffic with full headers, payloads, and timing data
Vendor Recognition Engine — Pattern-match domains against a curated taxonomy of 200+ adtech vendors (SSPs, DSPs, verification, measurement, CDNs). Display vendor name, logo, and category
Smart Grouping — Cluster requests by vendor ecosystem (e.g., "Prebid → SSP Bid Requests → Winning Bid → Creative Render → Impression Pixels → Viewability Beacons")
Parameter Decoder — Auto-decode common formats: URL-encoded params, base64 payloads, JSON, OpenRTB bid requests/responses. Display in readable tree view
Timing Waterfall — Visual timeline showing request sequence with vendor labels. Highlight gaps, parallel requests, and dependencies
Basic Issue Detection — Flag common problems: timeouts, failed requests, duplicate pixels, out-of-order beacons (e.g., viewability firing before impression)
DevTools Panel UI — Custom tab in Chrome DevTools with clean, scannable interface. Filter by vendor, status, type
v2.0 — AI-Powered Insights
Goal: Add intelligence layer that explains what's happening and why
AI Request Explainer — Send request context to LLM API, get plain-English explanation: "This is a bid request from Prebid.js to Rubicon Project. It's requesting a 300x250 banner ad with a floor price of $2.50 CPM."
Ordering Issue Analyzer — AI-powered detection of timing problems: "Warning: The MOAT viewability beacon fired 200ms before the impression pixel. This may cause discrepancy in viewability reporting."
Session Summary — Generate executive summary of entire page load: "12 bid requests sent, 8 responses received, winning bid from Index Exchange at $3.20 CPM. 3 potential issues detected."
Discrepancy Predictor — Flag patterns known to cause measurement discrepancies based on your domain expertise (impression/viewability timing, pixel deduplication issues)
Export & Share — Generate shareable reports (PDF, JSON) with AI summaries for stakeholder communication
v3.0 — Team & Enterprise
Custom Vendor Mappings — Teams can add proprietary internal systems, custom pixel endpoints, and private partner domains
Saved Sessions — Cloud storage for debugging sessions. Share links with teammates, attach to tickets
Monitoring Integration — Webhook alerts when specific patterns detected. Integration with Slack, PagerDuty, Datadog
Comparative Analysis — Compare two sessions side-by-side (e.g., before/after deployment, staging vs production)

Technical Architecture
High-Level Architecture
Extension Architecture (Manifest V3)
┌─────────────────────────────────────────────────────────────────┐
│                     Browser Extension                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────┐   │
│  │   Service   │   │   Content   │   │    DevTools Panel   │   │
│  │   Worker    │◄──┤   Script    │◄──┤    (React + UI)     │   │
│  │ (Background)│   │ (Injection) │   │                     │   │
│  └──────┬──────┘   └─────────────┘   └──────────┬──────────┘   │
│         │                                        │              │
│         ▼                                        ▼              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Shared State (IndexedDB + Memory)          │   │
│  │         Request Buffer │ Vendor Taxonomy │ Settings     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (v2.0+)
                    ┌─────────────────┐
                    │   Backend API   │
                    │  (AI Analysis)  │
                    └─────────────────┘
Component Breakdown
Service Worker (Background)
The persistent background process that intercepts all network traffic.
Uses chrome.webRequest.onBeforeRequest, onCompleted, onErrorOccurred
Captures full request/response headers and body
Runs vendor matching against domain patterns
Broadcasts enriched request objects to DevTools panel
Maintains circular buffer of last N requests per tab
Vendor Taxonomy Engine
A structured database of adtech vendors with matching rules.
{
  "vendors": [
    {
      "id": "rubicon",
      "name": "Magnite (Rubicon Project)",
      "category": "SSP",
      "patterns": [
        "*.rubiconproject.com/*",
        "fastlane.rubiconproject.com/*",
        "prebid-server.rubiconproject.com/*"
      ],
      "requestTypes": {
        "bid_request": { "pattern": "/openrtb2/auction", "decoder": "openrtb" },
        "impression": { "pattern": "/impression", "decoder": "url_params" },
        "sync": { "pattern": "/usync", "decoder": "cookie_sync" }
      },
      "relatedVendors": ["prebid", "gam"],
      "documentation": "https://docs.magnite.com/"
    }
  ]
}
DevTools Panel (React)
The primary user interface, rendered as a custom DevTools tab.
React 18 + TypeScript for type safety
TailwindCSS for styling (matches DevTools aesthetic)
Zustand for lightweight state management
Virtual scrolling for performance with 1000+ requests
Monaco Editor for JSON/payload inspection
AI Analysis Backend (v2.0)
Lightweight API for LLM-powered analysis.
Edge function (Cloudflare Workers or Vercel Edge) for low latency
Claude API or GPT-4 for analysis (configurable)
Structured prompts with adtech context injection
Response caching for common patterns (reduce API costs)
Data Flow
1. Page Load Initiated
   └─► Service Worker receives chrome.webRequest events

2. Request Interception
   └─► For each request:
       ├─► Extract URL, headers, body, timing
       ├─► Match against vendor taxonomy
       ├─► Decode payload (URL params, JSON, base64)
       └─► Enrich with vendor metadata

3. State Update
   └─► Broadcast to DevTools panel via chrome.runtime.sendMessage
   └─► Store in IndexedDB for session persistence

4. UI Render
   └─► React component receives enriched request
   └─► Group by vendor ecosystem
   └─► Render in timeline + list view

5. AI Analysis (v2.0, on-demand)
   └─► User clicks "Explain" on request/session
   └─► Send context to backend API
   └─► Stream response to UI
   └─► Cache result for future reference
Technology Stack

Business Model
Pricing Tiers

Revenue Projections (Conservative)
Assumptions: 5,000 free users → 5% Pro conversion → 250 paying users @ $19/mo = $4,750 MRR by month 12
With Team tier adoption and enterprise deals, target $15-25K MRR by month 18.
Go-to-Market Strategy
Phase 1: Developer Adoption (Months 1-3)
Launch on Product Hunt, Hacker News, Reddit r/adops
Create video tutorials: "Debug Prebid in 5 minutes" "Find your impression discrepancy"
Write technical blog posts on common adtech debugging scenarios
Engage in adtech Slack communities and LinkedIn groups
Phase 2: Industry Presence (Months 4-8)
Conference presence: Prebid Summit, AdMonsters, Programmatic I/O
Partnership with Prebid.org for recommended tooling
Case studies from early adopters (discrepancy reduction metrics)
Integration mentions in vendor documentation
Phase 3: Enterprise (Months 9-12)
Direct outreach to ad ops teams at top 50 publishers
Partnership program with SSPs (Magnite, Index, PubMatic) for co-marketing
SOC 2 compliance for enterprise requirements

Risks & Mitigations
Manifest V3 Limitations — MV3 restricts some network interception capabilities. Mitigation: Use declarativeNetRequest where needed, maintain both MV2 (Firefox) and MV3 (Chrome) builds.
Vendor Taxonomy Maintenance — Adtech vendors constantly change domains, get acquired, rebrand. Mitigation: Community contribution model (like adblockers), automated detection of unknown high-frequency domains.
AI Cost at Scale — LLM API costs could erode margins. Mitigation: Aggressive caching of common patterns, tiered limits, option for users to bring their own API key.
Privacy Concerns — Extension intercepts potentially sensitive data. Mitigation: All analysis local by default, explicit opt-in for cloud features, clear data handling policy, no PII storage.
Competition Response — Omnibug or Charles could add similar features. Mitigation: Move fast, build community, leverage AI differentiation which is harder for incumbents to add.
MVP Scope Definition
Minimum viable product for initial user testing (6-8 weeks):
In Scope
Chrome extension with DevTools panel
Request interception and basic enrichment
50 most common vendor patterns (major SSPs, GAM, Prebid, verification)
URL parameter and JSON payload decoding
Simple timeline visualization
Basic filtering (by vendor, status code, request type)
Out of Scope (v1.0)
AI analysis (v2.0)
Session export/sharing
Firefox support
User accounts / cloud storage
Custom vendor mappings
Success Metrics

Immediate Next Steps
Validate vendor taxonomy structure with 10 most critical vendors
Set up extension scaffolding with Plasmo/WXT
Build request interception proof-of-concept
Design DevTools panel wireframes
Identify 5-10 beta testers from adtech network