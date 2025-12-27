import type { Vendor } from '../types';

export const vendors: Vendor[] = [
  // === SSPs (Supply-Side Platforms) ===
  {
    id: 'google-ad-manager',
    name: 'Google Ad Manager',
    category: 'SSP',
    patterns: [
      'securepubads.g.doubleclick.net/**',
      'pagead2.googlesyndication.com/**',
      'tpc.googlesyndication.com/**',
      '*.doubleclick.net/**',
      '*.googlesyndication.com/**',
    ],
    requestTypes: {
      bid_request: { pattern: '/gampad/ads', decoder: 'urlParams' },
      impression: { pattern: '/pagead/adview', decoder: 'urlParams' },
    },
  },
  {
    id: 'rubicon',
    name: 'Magnite (Rubicon)',
    category: 'SSP',
    patterns: [
      'fastlane.rubiconproject.com/**',
      'prebid-server.rubiconproject.com/**',
      '*.rubiconproject.com/**',
      '*.magnite.com/**',
    ],
    requestTypes: {
      bid_request: { pattern: '/openrtb2/auction', decoder: 'openrtb' },
      impression: { pattern: '/impression', decoder: 'urlParams' },
      sync: { pattern: '/usync', decoder: 'urlParams' },
    },
  },
  {
    id: 'index-exchange',
    name: 'Index Exchange',
    category: 'SSP',
    patterns: [
      'htlb.casalemedia.com/**',
      '*.indexexchange.com/**',
      '*.casalemedia.com/**',
    ],
    requestTypes: {
      bid_request: { pattern: '/openrtb/2.5', decoder: 'openrtb' },
    },
  },
  {
    id: 'pubmatic',
    name: 'PubMatic',
    category: 'SSP',
    patterns: [
      'hbopenbid.pubmatic.com/**',
      'ads.pubmatic.com/**',
      '*.pubmatic.com/**',
    ],
    requestTypes: {
      bid_request: { pattern: '/openrtb2', decoder: 'openrtb' },
      impression: { pattern: '/AdServer/AdDisplayTrackerServlet', decoder: 'urlParams' },
    },
  },
  {
    id: 'openx',
    name: 'OpenX',
    category: 'SSP',
    patterns: [
      '*.openx.net/**',
      '*.servedbyopenx.com/**',
    ],
    requestTypes: {
      bid_request: { pattern: '/openrtb/2.5/auction', decoder: 'openrtb' },
    },
  },
  {
    id: 'xandr',
    name: 'Xandr (AppNexus)',
    category: 'SSP',
    patterns: [
      'ib.adnxs.com/**',
      'acdn.adnxs.com/**',
      '*.adnxs.com/**',
      '*.appnexus.com/**',
    ],
    requestTypes: {
      bid_request: { pattern: '/ut/v3/prebid', decoder: 'json' },
      impression: { pattern: '/it', decoder: 'urlParams' },
    },
  },
  {
    id: 'sovrn',
    name: 'Sovrn',
    category: 'SSP',
    patterns: [
      'ap.lijit.com/**',
      '*.lijit.com/**',
      '*.sovrn.com/**',
    ],
    requestTypes: {
      bid_request: { pattern: '/rtb/bid', decoder: 'openrtb' },
    },
  },
  {
    id: 'triplelift',
    name: 'TripleLift',
    category: 'SSP',
    patterns: [
      'tlx.3lift.com/**',
      'eb2.3lift.com/**',
      '*.triplelift.com/**',
    ],
  },
  {
    id: 'amazon-tam',
    name: 'Amazon TAM/UAM',
    category: 'SSP',
    patterns: [
      'aax.amazon-adsystem.com/**',
      'c.amazon-adsystem.com/**',
      '*.amazon-adsystem.com/**',
    ],
    requestTypes: {
      bid_request: { pattern: '/e/dtb', decoder: 'json' },
    },
  },
  {
    id: '33across',
    name: '33Across',
    category: 'SSP',
    patterns: [
      'ssc.33across.com/**',
      '*.33across.com/**',
    ],
  },
  {
    id: 'sharethrough',
    name: 'Sharethrough',
    category: 'SSP',
    patterns: [
      'btlr.sharethrough.com/**',
      '*.sharethrough.com/**',
    ],
  },
  {
    id: 'gumgum',
    name: 'GumGum',
    category: 'SSP',
    patterns: [
      'g2.gumgum.com/**',
      '*.gumgum.com/**',
    ],
  },
  {
    id: 'medianet',
    name: 'Media.net',
    category: 'SSP',
    patterns: [
      'contextual.media.net/**',
      '*.media.net/**',
    ],
  },
  {
    id: 'smartadserver',
    name: 'Smart AdServer',
    category: 'SSP',
    patterns: [
      'www8.smartadserver.com/**',
      '*.smartadserver.com/**',
    ],
  },
  {
    id: 'yieldmo',
    name: 'Yieldmo',
    category: 'SSP',
    patterns: [
      'ads.yieldmo.com/**',
      '*.yieldmo.com/**',
    ],
  },

  // === DSPs (Demand-Side Platforms) ===
  {
    id: 'thetradedesk',
    name: 'The Trade Desk',
    category: 'DSP',
    patterns: [
      'insight.adsrvr.org/**',
      '*.thetradedesk.com/**',
      '*.adsrvr.org/**',
    ],
  },
  {
    id: 'dv360',
    name: 'Display & Video 360',
    category: 'DSP',
    patterns: [
      '*.doubleclick.net/ddm/**',
      'ad.doubleclick.net/**',
      'cm.g.doubleclick.net/**',
    ],
  },
  {
    id: 'amazon-dsp',
    name: 'Amazon DSP',
    category: 'DSP',
    patterns: [
      '*.amazon-adsystem.com/aax2/**',
      's.amazon-adsystem.com/**',
    ],
  },
  {
    id: 'criteo',
    name: 'Criteo',
    category: 'DSP',
    patterns: [
      'static.criteo.net/**',
      'bidder.criteo.com/**',
      '*.criteo.com/**',
      '*.criteo.net/**',
    ],
    requestTypes: {
      bid_request: { pattern: '/cdb', decoder: 'json' },
    },
  },
  {
    id: 'mediamath',
    name: 'MediaMath',
    category: 'DSP',
    patterns: [
      'pixel.mathtag.com/**',
      '*.mathtag.com/**',
    ],
  },
  {
    id: 'yahoo-dsp',
    name: 'Yahoo DSP',
    category: 'DSP',
    patterns: [
      'noa.yahoo.com/**',
      '*.advertising.com/**',
      '*.oath.com/**',
      '*.yahoo.com/ads/**',
      '*.yahooinc.com/**',
    ],
  },

  // === Verification ===
  {
    id: 'ias',
    name: 'Integral Ad Science (IAS)',
    category: 'Verification',
    patterns: [
      'pixel.adsafeprotected.com/**',
      'static.adsafeprotected.com/**',
      '*.adsafeprotected.com/**',
    ],
    requestTypes: {
      viewability: { pattern: '/jload', decoder: 'urlParams' },
    },
  },
  {
    id: 'doubleverify',
    name: 'DoubleVerify',
    category: 'Verification',
    patterns: [
      'cdn.doubleverify.com/**',
      'tps.doubleverify.com/**',
      '*.doubleverify.com/**',
    ],
  },
  {
    id: 'moat',
    name: 'MOAT (Oracle)',
    category: 'Verification',
    patterns: [
      'z.moatads.com/**',
      'px.moatads.com/**',
      '*.moatads.com/**',
      '*.moatpixel.com/**',
    ],
    requestTypes: {
      viewability: { pattern: '/pixel', decoder: 'urlParams' },
    },
  },
  {
    id: 'comscore',
    name: 'Comscore',
    category: 'Verification',
    patterns: [
      'sb.scorecardresearch.com/**',
      '*.scorecardresearch.com/**',
      '*.comscore.com/**',
    ],
  },
  {
    id: 'grapeshot',
    name: 'Grapeshot (Oracle)',
    category: 'Verification',
    patterns: [
      '*.grapeshot.co.uk/**',
      '*.gscontxt.net/**',
    ],
  },
  {
    id: 'human',
    name: 'HUMAN (White Ops)',
    category: 'Verification',
    patterns: [
      '*.whiteops.com/**',
      '*.humansecurity.com/**',
    ],
  },

  // === Measurement ===
  {
    id: 'nielsen',
    name: 'Nielsen',
    category: 'Measurement',
    patterns: [
      'secure-us.imrworldwide.com/**',
      '*.nielsen.com/**',
      '*.imrworldwide.com/**',
    ],
  },
  {
    id: 'flashtalking',
    name: 'Flashtalking',
    category: 'Measurement',
    patterns: [
      'servedby.flashtalking.com/**',
      '*.flashtalking.com/**',
    ],
  },
  {
    id: 'innovid',
    name: 'Innovid',
    category: 'Measurement',
    patterns: [
      's.innovid.com/**',
      '*.innovid.com/**',
    ],
  },
  {
    id: 'sizmek',
    name: 'Sizmek',
    category: 'Measurement',
    patterns: [
      'bs.serving-sys.com/**',
      '*.sizmek.com/**',
    ],
  },
  {
    id: 'quantcast',
    name: 'Quantcast',
    category: 'Measurement',
    patterns: [
      'pixel.quantserve.com/**',
      '*.quantserve.com/**',
      '*.quantcount.com/**',
    ],
  },

  // === Prebid ===
  {
    id: 'prebid',
    name: 'Prebid.js',
    category: 'Prebid',
    patterns: [
      '**/prebid*.js**',
    ],
  },
  {
    id: 'prebid-server',
    name: 'Prebid Server',
    category: 'Prebid',
    patterns: [
      '**/openrtb2/auction**',
      '**/pbs/v1/openrtb2/auction**',
    ],
    requestTypes: {
      bid_request: { pattern: '/openrtb2/auction', decoder: 'openrtb' },
    },
  },

  // === Identity ===
  {
    id: 'liveramp',
    name: 'LiveRamp',
    category: 'Identity',
    patterns: [
      'idsync.rlcdn.com/**',
      '*.rlcdn.com/**',
      '*.liveramp.com/**',
    ],
    requestTypes: {
      sync: { pattern: '/idsync', decoder: 'urlParams' },
    },
  },
  {
    id: 'id5',
    name: 'ID5',
    category: 'Identity',
    patterns: [
      '*.id5-sync.com/**',
      'id5-sync.com/**',
    ],
  },
  {
    id: 'uid2',
    name: 'Unified ID 2.0',
    category: 'Identity',
    patterns: [
      'prod.uidapi.com/**',
      '*.uidapi.com/**',
    ],
  },
  {
    id: 'lotame',
    name: 'Lotame',
    category: 'Identity',
    patterns: [
      'tags.crwdcntrl.net/**',
      '*.crwdcntrl.net/**',
      '*.lotame.com/**',
    ],
  },
  {
    id: 'tapad',
    name: 'Tapad',
    category: 'Identity',
    patterns: [
      'pixel.tapad.com/**',
      '*.tapad.com/**',
    ],
  },

  // === CDNs ===
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    category: 'CDN',
    patterns: [
      '*.cloudflare.com/**',
      '*.cloudflareinsights.com/**',
    ],
  },
  {
    id: 'akamai',
    name: 'Akamai',
    category: 'CDN',
    patterns: [
      '*.akamaized.net/**',
      '*.akamaihd.net/**',
      '*.akamaitechnologies.com/**',
    ],
  },
  {
    id: 'fastly',
    name: 'Fastly',
    category: 'CDN',
    patterns: [
      '*.fastly.net/**',
      '*.fastlylabs.com/**',
    ],
  },
  {
    id: 'cloudfront',
    name: 'AWS CloudFront',
    category: 'CDN',
    patterns: [
      '*.cloudfront.net/**',
    ],
  },

  // === Ad Servers ===
  {
    id: 'celtra',
    name: 'Celtra',
    category: 'AdServer',
    patterns: [
      'ads.celtra.com/**',
      '*.celtra.com/**',
    ],
  },
  {
    id: 'adform',
    name: 'Adform',
    category: 'AdServer',
    patterns: [
      'track.adform.net/**',
      '*.adform.net/**',
    ],
  },
  {
    id: 'eyeota',
    name: 'Eyeota',
    category: 'Other',
    patterns: [
      'ps.eyeota.net/**',
      '*.eyeota.net/**',
    ],
  },
  {
    id: 'bluekai',
    name: 'BlueKai (Oracle)',
    category: 'Other',
    patterns: [
      'tags.bluekai.com/**',
      '*.bluekai.com/**',
    ],
  },
  // === Native Advertising / Content Discovery ===
  {
    id: 'outbrain',
    name: 'Outbrain',
    category: 'Native',
    patterns: [
      '*.outbrain.com/**',
      '*.outbrainstatic.com/**',
    ],
  },
  {
    id: 'taboola',
    name: 'Taboola',
    category: 'Native',
    patterns: [
      '*.taboola.com/**',
      '*.taboolasyndication.com/**',
    ],
  },
];

// Create a map for quick vendor lookup by ID
export const vendorMap = new Map(vendors.map(v => [v.id, v]));
