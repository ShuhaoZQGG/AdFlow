import type { Vendor } from '../types';

export const vendors: Vendor[] = [
  // === SSPs (Supply-Side Platforms) ===
  {
    id: 'google-ad-manager',
    name: 'Google Ad Manager',
    category: 'SSP',
    patterns: [
      '*.doubleclick.net/*',
      '*.googlesyndication.com/*',
      'securepubads.g.doubleclick.net/*',
      'pagead2.googlesyndication.com/*',
      'tpc.googlesyndication.com/*',
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
      '*.rubiconproject.com/*',
      'fastlane.rubiconproject.com/*',
      'prebid-server.rubiconproject.com/*',
      '*.magnite.com/*',
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
      '*.indexexchange.com/*',
      '*.casalemedia.com/*',
      'htlb.casalemedia.com/*',
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
      '*.pubmatic.com/*',
      'hbopenbid.pubmatic.com/*',
      'ads.pubmatic.com/*',
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
      '*.openx.net/*',
      '*.servedbyopenx.com/*',
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
      '*.adnxs.com/*',
      '*.appnexus.com/*',
      'ib.adnxs.com/*',
      'acdn.adnxs.com/*',
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
      '*.lijit.com/*',
      '*.sovrn.com/*',
      'ap.lijit.com/*',
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
      '*.triplelift.com/*',
      'tlx.3lift.com/*',
      'eb2.3lift.com/*',
    ],
  },
  {
    id: 'amazon-tam',
    name: 'Amazon TAM/UAM',
    category: 'SSP',
    patterns: [
      '*.amazon-adsystem.com/*',
      'aax.amazon-adsystem.com/*',
      'c.amazon-adsystem.com/*',
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
      '*.33across.com/*',
      'ssc.33across.com/*',
    ],
  },
  {
    id: 'sharethrough',
    name: 'Sharethrough',
    category: 'SSP',
    patterns: [
      '*.sharethrough.com/*',
      'btlr.sharethrough.com/*',
    ],
  },
  {
    id: 'gumgum',
    name: 'GumGum',
    category: 'SSP',
    patterns: [
      '*.gumgum.com/*',
      'g2.gumgum.com/*',
    ],
  },
  {
    id: 'medianet',
    name: 'Media.net',
    category: 'SSP',
    patterns: [
      '*.media.net/*',
      'contextual.media.net/*',
    ],
  },
  {
    id: 'smartadserver',
    name: 'Smart AdServer',
    category: 'SSP',
    patterns: [
      '*.smartadserver.com/*',
      'www8.smartadserver.com/*',
    ],
  },
  {
    id: 'yieldmo',
    name: 'Yieldmo',
    category: 'SSP',
    patterns: [
      '*.yieldmo.com/*',
      'ads.yieldmo.com/*',
    ],
  },

  // === DSPs (Demand-Side Platforms) ===
  {
    id: 'thetradedesk',
    name: 'The Trade Desk',
    category: 'DSP',
    patterns: [
      '*.thetradedesk.com/*',
      '*.adsrvr.org/*',
      'insight.adsrvr.org/*',
    ],
  },
  {
    id: 'dv360',
    name: 'Display & Video 360',
    category: 'DSP',
    patterns: [
      '*.doubleclick.net/ddm/*',
      'ad.doubleclick.net/*',
      'cm.g.doubleclick.net/*',
    ],
  },
  {
    id: 'amazon-dsp',
    name: 'Amazon DSP',
    category: 'DSP',
    patterns: [
      '*.amazon-adsystem.com/aax2/*',
      's.amazon-adsystem.com/*',
    ],
  },
  {
    id: 'criteo',
    name: 'Criteo',
    category: 'DSP',
    patterns: [
      '*.criteo.com/*',
      '*.criteo.net/*',
      'static.criteo.net/*',
      'bidder.criteo.com/*',
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
      '*.mathtag.com/*',
      'pixel.mathtag.com/*',
    ],
  },
  {
    id: 'yahoo-dsp',
    name: 'Yahoo DSP',
    category: 'DSP',
    patterns: [
      '*.advertising.com/*',
      '*.oath.com/*',
      '*.yahoo.com/ads/*',
    ],
  },

  // === Verification ===
  {
    id: 'ias',
    name: 'Integral Ad Science (IAS)',
    category: 'Verification',
    patterns: [
      '*.adsafeprotected.com/*',
      'pixel.adsafeprotected.com/*',
      'static.adsafeprotected.com/*',
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
      '*.doubleverify.com/*',
      'cdn.doubleverify.com/*',
      'tps.doubleverify.com/*',
    ],
  },
  {
    id: 'moat',
    name: 'MOAT (Oracle)',
    category: 'Verification',
    patterns: [
      '*.moatads.com/*',
      '*.moatpixel.com/*',
      'z.moatads.com/*',
      'px.moatads.com/*',
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
      '*.scorecardresearch.com/*',
      '*.comscore.com/*',
      'sb.scorecardresearch.com/*',
    ],
  },
  {
    id: 'grapeshot',
    name: 'Grapeshot (Oracle)',
    category: 'Verification',
    patterns: [
      '*.grapeshot.co.uk/*',
      '*.gscontxt.net/*',
    ],
  },
  {
    id: 'human',
    name: 'HUMAN (White Ops)',
    category: 'Verification',
    patterns: [
      '*.whiteops.com/*',
      '*.humansecurity.com/*',
    ],
  },

  // === Measurement ===
  {
    id: 'nielsen',
    name: 'Nielsen',
    category: 'Measurement',
    patterns: [
      '*.nielsen.com/*',
      '*.imrworldwide.com/*',
      'secure-us.imrworldwide.com/*',
    ],
  },
  {
    id: 'flashtalking',
    name: 'Flashtalking',
    category: 'Measurement',
    patterns: [
      '*.flashtalking.com/*',
      'servedby.flashtalking.com/*',
    ],
  },
  {
    id: 'innovid',
    name: 'Innovid',
    category: 'Measurement',
    patterns: [
      '*.innovid.com/*',
      's.innovid.com/*',
    ],
  },
  {
    id: 'sizmek',
    name: 'Sizmek',
    category: 'Measurement',
    patterns: [
      '*.sizmek.com/*',
      'bs.serving-sys.com/*',
    ],
  },
  {
    id: 'quantcast',
    name: 'Quantcast',
    category: 'Measurement',
    patterns: [
      '*.quantserve.com/*',
      '*.quantcount.com/*',
      'pixel.quantserve.com/*',
    ],
  },

  // === Prebid ===
  {
    id: 'prebid',
    name: 'Prebid.js',
    category: 'Prebid',
    patterns: [
      '*/prebid*.js*',
    ],
  },
  {
    id: 'prebid-server',
    name: 'Prebid Server',
    category: 'Prebid',
    patterns: [
      '*/openrtb2/auction*',
      '*/pbs/v1/openrtb2/auction*',
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
      '*.rlcdn.com/*',
      '*.liveramp.com/*',
      'idsync.rlcdn.com/*',
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
      '*.id5-sync.com/*',
      'id5-sync.com/*',
    ],
  },
  {
    id: 'uid2',
    name: 'Unified ID 2.0',
    category: 'Identity',
    patterns: [
      '*.uidapi.com/*',
      'prod.uidapi.com/*',
    ],
  },
  {
    id: 'lotame',
    name: 'Lotame',
    category: 'Identity',
    patterns: [
      '*.crwdcntrl.net/*',
      '*.lotame.com/*',
      'tags.crwdcntrl.net/*',
    ],
  },
  {
    id: 'tapad',
    name: 'Tapad',
    category: 'Identity',
    patterns: [
      '*.tapad.com/*',
      'pixel.tapad.com/*',
    ],
  },

  // === CDNs ===
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    category: 'CDN',
    patterns: [
      '*.cloudflare.com/*',
      '*.cloudflareinsights.com/*',
    ],
  },
  {
    id: 'akamai',
    name: 'Akamai',
    category: 'CDN',
    patterns: [
      '*.akamaized.net/*',
      '*.akamaihd.net/*',
      '*.akamaitechnologies.com/*',
    ],
  },
  {
    id: 'fastly',
    name: 'Fastly',
    category: 'CDN',
    patterns: [
      '*.fastly.net/*',
      '*.fastlylabs.com/*',
    ],
  },
  {
    id: 'cloudfront',
    name: 'AWS CloudFront',
    category: 'CDN',
    patterns: [
      '*.cloudfront.net/*',
    ],
  },

  // === Ad Servers ===
  {
    id: 'celtra',
    name: 'Celtra',
    category: 'AdServer',
    patterns: [
      '*.celtra.com/*',
      'ads.celtra.com/*',
    ],
  },
  {
    id: 'adform',
    name: 'Adform',
    category: 'AdServer',
    patterns: [
      '*.adform.net/*',
      'track.adform.net/*',
    ],
  },
  {
    id: 'eyeota',
    name: 'Eyeota',
    category: 'Other',
    patterns: [
      '*.eyeota.net/*',
      'ps.eyeota.net/*',
    ],
  },
  {
    id: 'bluekai',
    name: 'BlueKai (Oracle)',
    category: 'Other',
    patterns: [
      '*.bluekai.com/*',
      'tags.bluekai.com/*',
    ],
  },
  {
    id: 'outbrain',
    name: 'Outbrain',
    category: 'Other',
    patterns: [
      '*.outbrain.com/*',
      '*.outbrainstatic.com/*',
    ],
  },
  {
    id: 'taboola',
    name: 'Taboola',
    category: 'Other',
    patterns: [
      '*.taboola.com/*',
      '*.taboolasyndication.com/*',
    ],
  },
];

// Create a map for quick vendor lookup by ID
export const vendorMap = new Map(vendors.map(v => [v.id, v]));
