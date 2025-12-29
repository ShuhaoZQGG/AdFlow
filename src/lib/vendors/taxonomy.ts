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
  {
    id: 'sonobi',
    name: 'Sonobi',
    category: 'SSP',
    patterns: [
      'apex.go.sonobi.com/**',
      '*.sonobi.com/**',
    ],
    requestTypes: {
      bid_request: { pattern: '/apex', decoder: 'openrtb' },
    },
  },
  {
    id: 'freewheel',
    name: 'FreeWheel',
    category: 'SSP',
    patterns: [
      '*.freewheel.com/**',
      '*.freewheel.tv/**',
    ],
  },
  {
    id: 'teads',
    name: 'Teads',
    category: 'SSP',
    patterns: [
      'a.teads.tv/**',
      '*.teads.tv/**',
      '*.teads.com/**',
    ],
    requestTypes: {
      bid_request: { pattern: '/hb', decoder: 'openrtb' },
    },
  },
  {
    id: 'spotx',
    name: 'SpotX (Magnite)',
    category: 'SSP',
    patterns: [
      'search.spotxchange.com/**',
      '*.spotxchange.com/**',
      '*.spotx.tv/**',
    ],
  },
  {
    id: 'improvedigital',
    name: 'Improve Digital',
    category: 'SSP',
    patterns: [
      'ad.360yield.com/**',
      '*.360yield.com/**',
      '*.improvedigital.com/**',
    ],
  },
  {
    id: 'adcolony',
    name: 'AdColony',
    category: 'SSP',
    patterns: [
      '*.adcolony.com/**',
      '*.adc-adcolony.com/**',
    ],
  },
  {
    id: 'unruly',
    name: 'Unruly',
    category: 'SSP',
    patterns: [
      '*.unruly.co/**',
      '*.unrulymedia.com/**',
    ],
  },
  {
    id: 'adsrvr',
    name: 'AdSrvr',
    category: 'SSP',
    patterns: [
      '*.adsrvr.org/**',
    ],
  },
  {
    id: 'rhythmone',
    name: 'RhythmOne',
    category: 'SSP',
    patterns: [
      '*.rhythmone.com/**',
      '*.1rx.io/**',
    ],
  },
  {
    id: 'conversant',
    name: 'Conversant',
    category: 'SSP',
    patterns: [
      '*.conversantmedia.com/**',
      '*.cj.com/**',
    ],
  },
  {
    id: 'adsquare',
    name: 'adSquare',
    category: 'SSP',
    patterns: [
      '*.adsquare.net/**',
    ],
  },
  {
    id: 'adtech',
    name: 'AdTech (AOL)',
    category: 'SSP',
    patterns: [
      '*.adtechus.com/**',
      '*.adtech.de/**',
    ],
  },
  {
    id: 'districtm',
    name: 'District M',
    category: 'SSP',
    patterns: [
      '*.districtm.io/**',
    ],
  },
  {
    id: 'emx',
    name: 'EMX Digital',
    category: 'SSP',
    patterns: [
      '*.emxdgt.com/**',
    ],
  },
  {
    id: 'kargo',
    name: 'Kargo',
    category: 'SSP',
    patterns: [
      '*.kargo.com/**',
    ],
  },
  {
    id: 'onebyaol',
    name: 'One by AOL',
    category: 'SSP',
    patterns: [
      '*.onebyaol.com/**',
    ],
  },
  {
    id: 'pulsepoint',
    name: 'PulsePoint',
    category: 'SSP',
    patterns: [
      '*.pulsepoint.com/**',
    ],
  },
  {
    id: 'smaato',
    name: 'Smaato',
    category: 'SSP',
    patterns: [
      '*.smaato.com/**',
      '*.smtad.net/**',
    ],
  },
  {
    id: 'undertone',
    name: 'Undertone',
    category: 'SSP',
    patterns: [
      '*.undertone.com/**',
    ],
  },
  {
    id: 'verizon-media',
    name: 'Verizon Media',
    category: 'SSP',
    patterns: [
      '*.verizonmedia.com/**',
      '*.aol.com/ads/**',
    ],
  },
  {
    id: 'videoheroes',
    name: 'VideoHeroes',
    category: 'SSP',
    patterns: [
      '*.videoheroes.tv/**',
    ],
  },
  {
    id: 'yieldone',
    name: 'YieldOne',
    category: 'SSP',
    patterns: [
      '*.yieldone.com/**',
    ],
  },
  {
    id: 'seedtag',
    name: 'Seedtag',
    category: 'SSP',
    patterns: [
      '*.seedtag.com/**',
      'api.seedtag.com/**',
    ],
    requestTypes: {
      bid_request: { pattern: '/openrtb', decoder: 'openrtb' },
    },
  },
  {
    id: 'rakuten',
    name: 'Rakuten Advertising',
    category: 'SSP',
    patterns: [
      '*.rakuten.com/**',
      '*.rakutenadvertising.com/**',
      '*.linksynergy.com/**',
    ],
  },
  {
    id: 'bidmachine',
    name: 'BidMachine',
    category: 'SSP',
    patterns: [
      '*.bidmachine.io/**',
      '*.bidmachine.com/**',
    ],
    requestTypes: {
      bid_request: { pattern: '/openrtb', decoder: 'openrtb' },
    },
  },
  {
    id: 'adagio',
    name: 'Adagio',
    category: 'SSP',
    patterns: [
      '*.adagio.io/**',
      '*.adagio.com/**',
    ],
    requestTypes: {
      bid_request: { pattern: '/openrtb', decoder: 'openrtb' },
    },
  },
  {
    id: 'adverty',
    name: 'Adverty',
    category: 'SSP',
    patterns: [
      '*.adverty.com/**',
      '*.adverty.net/**',
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
  {
    id: 'adobe-advertising-cloud',
    name: 'Adobe Advertising Cloud',
    category: 'DSP',
    patterns: [
      '*.advertising.com/**',
      '*.adobe.com/ads/**',
    ],
  },
  {
    id: 'stackadapt',
    name: 'StackAdapt',
    category: 'DSP',
    patterns: [
      '*.stackadapt.com/**',
    ],
  },
  {
    id: 'basis',
    name: 'Centro Basis',
    category: 'DSP',
    patterns: [
      '*.centro.net/**',
    ],
  },
  {
    id: 'dataxu',
    name: 'DataXu (Roku)',
    category: 'DSP',
    patterns: [
      '*.dataxu.com/**',
      '*.roku.com/ads/**',
    ],
  },
  {
    id: 'adroll',
    name: 'AdRoll',
    category: 'DSP',
    patterns: [
      '*.adroll.com/**',
    ],
  },
  {
    id: 'quantcast-choice',
    name: 'Quantcast Choice',
    category: 'DSP',
    patterns: [
      '*.quantcast.com/**',
      '*.quantcast2.com/**',
    ],
  },
  {
    id: 'simpli-fi',
    name: 'Simpli.fi',
    category: 'DSP',
    patterns: [
      '*.simpli.fi/**',
    ],
  },
  {
    id: 'choozle',
    name: 'Choozle',
    category: 'DSP',
    patterns: [
      '*.choozle.com/**',
    ],
  },
  {
    id: 'adform-dsp',
    name: 'Adform DSP',
    category: 'DSP',
    patterns: [
      '*.adform.net/dsp/**',
    ],
  },
  {
    id: 'amobee',
    name: 'Amobee',
    category: 'DSP',
    patterns: [
      '*.amobee.com/**',
    ],
  },
  {
    id: 'neustar',
    name: 'Neustar',
    category: 'DSP',
    patterns: [
      '*.neustar.biz/**',
    ],
  },
  {
    id: 'turn',
    name: 'Turn (Amobee)',
    category: 'DSP',
    patterns: [
      '*.turn.com/**',
    ],
  },
  {
    id: 'vistar',
    name: 'Vistar Media',
    category: 'DSP',
    patterns: [
      '*.vistarmedia.com/**',
    ],
  },
  {
    id: 'adloox',
    name: 'Adloox',
    category: 'DSP',
    patterns: [
      '*.adloox.com/**',
    ],
  },
  {
    id: 'bidmachine-dsp',
    name: 'BidMachine DSP',
    category: 'DSP',
    patterns: [
      '*.bidmachine.io/dsp/**',
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
  {
    id: 'pixalate',
    name: 'Pixalate',
    category: 'Verification',
    patterns: [
      '*.pixalate.com/**',
      '*.pixanalytics.com/**',
    ],
  },
  {
    id: 'geoedge',
    name: 'GeoEdge',
    category: 'Verification',
    patterns: [
      '*.geoedge.com/**',
    ],
  },
  {
    id: 'confiant',
    name: 'Confiant',
    category: 'Verification',
    patterns: [
      '*.confiant.com/**',
    ],
  },
  {
    id: 'themediatrust',
    name: 'The Media Trust',
    category: 'Verification',
    patterns: [
      '*.themediatrust.com/**',
    ],
  },
  {
    id: 'adsafeprotected',
    name: 'AdSafe',
    category: 'Verification',
    patterns: [
      '*.adsafeprotected.com/**',
    ],
  },
  {
    id: 'adverification',
    name: 'Ad Verification',
    category: 'Verification',
    patterns: [
      '*.adverification.com/**',
    ],
  },
  {
    id: 'adloox-verification',
    name: 'Adloox Verification',
    category: 'Verification',
    patterns: [
      '*.adloox.com/**',
    ],
  },
  {
    id: 'adsystem',
    name: 'AdSystem',
    category: 'Verification',
    patterns: [
      '*.adsystem.com/**',
    ],
  },
  {
    id: 'adxpose',
    name: 'AdXpose',
    category: 'Verification',
    patterns: [
      '*.adxpose.com/**',
    ],
  },
  {
    id: 'adometry',
    name: 'Adometry',
    category: 'Verification',
    patterns: [
      '*.adometry.com/**',
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
  {
    id: 'appsflyer',
    name: 'AppsFlyer',
    category: 'Measurement',
    patterns: [
      '*.appsflyer.com/**',
      'api2.appsflyer.com/**',
    ],
  },
  {
    id: 'adjust',
    name: 'Adjust',
    category: 'Measurement',
    patterns: [
      '*.adjust.com/**',
      '*.adjust.io/**',
    ],
  },
  {
    id: 'branch',
    name: 'Branch',
    category: 'Measurement',
    patterns: [
      '*.branch.io/**',
    ],
  },
  {
    id: 'kochava',
    name: 'Kochava',
    category: 'Measurement',
    patterns: [
      '*.kochava.com/**',
    ],
  },
  {
    id: 'singular',
    name: 'Singular',
    category: 'Measurement',
    patterns: [
      '*.singular.net/**',
    ],
  },
  {
    id: 'tune',
    name: 'Tune (Branch)',
    category: 'Measurement',
    patterns: [
      '*.tune.com/**',
    ],
  },
  {
    id: 'adobe-analytics',
    name: 'Adobe Analytics',
    category: 'Measurement',
    patterns: [
      '*.omniture.com/**',
      '*.2o7.net/**',
      '*.sc.omtrdc.net/**',
    ],
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    category: 'Measurement',
    patterns: [
      '*.google-analytics.com/**',
      '*.googletagmanager.com/**',
      '*.analytics.google.com/**',
    ],
  },
  {
    id: 'facebook-pixel',
    name: 'Facebook Pixel',
    category: 'Measurement',
    patterns: [
      '*.facebook.com/tr/**',
      '*.facebook.net/**',
    ],
  },
  {
    id: 'twitter-analytics',
    name: 'Twitter Analytics',
    category: 'Measurement',
    patterns: [
      '*.twimg.com/ads/**',
      'analytics.twitter.com/**',
    ],
  },
  {
    id: 'linkedin-insight',
    name: 'LinkedIn Insight Tag',
    category: 'Measurement',
    patterns: [
      '*.linkedin.com/px/**',
      'snap.licdn.com/**',
    ],
  },
  {
    id: 'pinterest-tag',
    name: 'Pinterest Tag',
    category: 'Measurement',
    patterns: [
      '*.pinterest.com/ct/**',
    ],
  },
  {
    id: 'snapchat-pixel',
    name: 'Snapchat Pixel',
    category: 'Measurement',
    patterns: [
      '*.snapchat.com/**',
      '*.sc-static.net/**',
    ],
  },
  {
    id: 'tiktok-pixel',
    name: 'TikTok Pixel',
    category: 'Measurement',
    patterns: [
      '*.tiktok.com/**',
      'analytics.tiktok.com/**',
    ],
  },
  {
    id: 'reddit-pixel',
    name: 'Reddit Pixel',
    category: 'Measurement',
    patterns: [
      '*.reddit.com/**',
      '*.redditstatic.com/**',
    ],
  },
  {
    id: 'mixpanel',
    name: 'Mixpanel',
    category: 'Measurement',
    patterns: [
      '*.mixpanel.com/**',
    ],
  },
  {
    id: 'segment',
    name: 'Segment',
    category: 'Measurement',
    patterns: [
      '*.segment.io/**',
      '*.segment.com/**',
    ],
  },
  {
    id: 'amplitude',
    name: 'Amplitude',
    category: 'Measurement',
    patterns: [
      '*.amplitude.com/**',
    ],
  },
  {
    id: 'hotjar',
    name: 'Hotjar',
    category: 'Measurement',
    patterns: [
      '*.hotjar.com/**',
    ],
  },
  {
    id: 'fullstory',
    name: 'FullStory',
    category: 'Measurement',
    patterns: [
      '*.fullstory.com/**',
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
  {
    id: 'adagio-prebid',
    name: 'Adagio (Prebid)',
    category: 'Prebid',
    patterns: [
      '**/adagio/**',
      '*.adagio.io/prebid/**',
    ],
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
  {
    id: 'meridian',
    name: 'Meridian',
    category: 'Identity',
    patterns: [
      '*.meridianads.com/**',
    ],
  },
  {
    id: 'zeotap',
    name: 'Zeotap',
    category: 'Identity',
    patterns: [
      '*.zeotap.com/**',
    ],
  },
  {
    id: 'neustar-identity',
    name: 'Neustar Identity',
    category: 'Identity',
    patterns: [
      '*.neustar.biz/**',
    ],
  },
  {
    id: 'transunion',
    name: 'TransUnion',
    category: 'Identity',
    patterns: [
      '*.transunion.com/**',
    ],
  },
  {
    id: 'acxiom',
    name: 'Acxiom',
    category: 'Identity',
    patterns: [
      '*.acxiom.com/**',
    ],
  },
  {
    id: 'oracle-id-graph',
    name: 'Oracle ID Graph',
    category: 'Identity',
    patterns: [
      '*.oracle.com/identity/**',
    ],
  },
  {
    id: 'britepool',
    name: 'BritePool',
    category: 'Identity',
    patterns: [
      '*.britepool.com/**',
    ],
  },
  {
    id: 'fabrick',
    name: 'Fabrick',
    category: 'Identity',
    patterns: [
      '*.fabrick.io/**',
    ],
  },
  {
    id: 'parrable',
    name: 'Parrable',
    category: 'Identity',
    patterns: [
      '*.parrable.com/**',
    ],
  },
  {
    id: 'netid',
    name: 'NetID',
    category: 'Identity',
    patterns: [
      '*.netid.de/**',
    ],
  },
  {
    id: 'pubcommon',
    name: 'PubCommon',
    category: 'Identity',
    patterns: [
      '*.pubcommon.com/**',
    ],
  },
  {
    id: 'sharedid',
    name: 'SharedID',
    category: 'Identity',
    patterns: [
      '*.sharedid.org/**',
    ],
  },
  {
    id: 'connectid',
    name: 'ConnectID',
    category: 'Identity',
    patterns: [
      '*.connectid.io/**',
    ],
  },
  {
    id: 'criteo-id',
    name: 'Criteo ID',
    category: 'Identity',
    patterns: [
      '*.criteo.com/identity/**',
    ],
  },
  {
    id: 'trade-desk-unified-id',
    name: 'The Trade Desk Unified ID',
    category: 'Identity',
    patterns: [
      '*.adsrvr.org/uid/**',
    ],
  },
  {
    id: 'roko',
    name: 'Rokko',
    category: 'Identity',
    patterns: [
      '*.roko.mobi/**',
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
  {
    id: 'maxcdn',
    name: 'MaxCDN',
    category: 'CDN',
    patterns: [
      '*.maxcdn.com/**',
    ],
  },
  {
    id: 'keycdn',
    name: 'KeyCDN',
    category: 'CDN',
    patterns: [
      '*.keycdn.com/**',
    ],
  },
  {
    id: 'bunnycdn',
    name: 'BunnyCDN',
    category: 'CDN',
    patterns: [
      '*.bunnycdn.com/**',
    ],
  },
  {
    id: 'cdn77',
    name: 'CDN77',
    category: 'CDN',
    patterns: [
      '*.cdn77.com/**',
    ],
  },
  {
    id: 'stackpath',
    name: 'StackPath',
    category: 'CDN',
    patterns: [
      '*.stackpath.com/**',
      '*.stackpathcdn.com/**',
    ],
  },
  {
    id: 'limelight',
    name: 'Limelight Networks',
    category: 'CDN',
    patterns: [
      '*.llnwd.net/**',
      '*.limelight.com/**',
    ],
  },
  {
    id: 'level3',
    name: 'Level 3 CDN',
    category: 'CDN',
    patterns: [
      '*.l3cdn.com/**',
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
    id: 'thunder',
    name: 'Thunder',
    category: 'AdServer',
    patterns: [
      '*.thunder.com/**',
      '*.thunderhead.com/**',
      '*.thunderad.com/**',
    ],
  },
  {
    id: 'freewheel-adserver',
    name: 'FreeWheel Ad Server',
    category: 'AdServer',
    patterns: [
      '*.freewheel.com/**',
      '*.freewheel.tv/**',
    ],
  },
  {
    id: 'springserve',
    name: 'SpringServe',
    category: 'AdServer',
    patterns: [
      '*.springserve.com/**',
    ],
  },
  {
    id: 'spotx-adserver',
    name: 'SpotX Ad Server',
    category: 'AdServer',
    patterns: [
      '*.spotxchange.com/**',
      '*.spotx.tv/**',
    ],
  },
  {
    id: 'jwplayer',
    name: 'JW Player',
    category: 'AdServer',
    patterns: [
      '*.jwplayer.com/**',
      '*.jwplatform.com/**',
    ],
  },
  {
    id: 'brightcove',
    name: 'Brightcove',
    category: 'AdServer',
    patterns: [
      '*.brightcove.com/**',
      '*.brightcove.net/**',
    ],
  },
  {
    id: 'kaltura',
    name: 'Kaltura',
    category: 'AdServer',
    patterns: [
      '*.kaltura.com/**',
    ],
  },
  {
    id: 'ooyala',
    name: 'Ooyala',
    category: 'AdServer',
    patterns: [
      '*.ooyala.com/**',
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
  {
    id: 'oracle-data-cloud',
    name: 'Oracle Data Cloud',
    category: 'Other',
    patterns: [
      '*.oracle.com/data/**',
    ],
  },
  {
    id: 'salesforce-dmp',
    name: 'Salesforce DMP',
    category: 'Other',
    patterns: [
      '*.salesforce.com/dmp/**',
    ],
  },
  {
    id: 'adobe-audience-manager',
    name: 'Adobe Audience Manager',
    category: 'Other',
    patterns: [
      '*.demdex.net/**',
      '*.omtrdc.net/**',
    ],
  },
  {
    id: 'neustar-dmp',
    name: 'Neustar DMP',
    category: 'Other',
    patterns: [
      '*.neustar.biz/dmp/**',
    ],
  },
  {
    id: 'krux',
    name: 'Krux (Salesforce)',
    category: 'Other',
    patterns: [
      '*.krux.com/**',
    ],
  },
  {
    id: 'aggregate-knowledge',
    name: 'Aggregate Knowledge',
    category: 'Other',
    patterns: [
      '*.aggregateknowledge.com/**',
    ],
  },
  {
    id: 'exelate',
    name: 'eXelate (Nielsen)',
    category: 'Other',
    patterns: [
      '*.exelate.com/**',
    ],
  },
  {
    id: 'audiencescience',
    name: 'AudienceScience',
    category: 'Other',
    patterns: [
      '*.audiencescience.com/**',
    ],
  },
  {
    id: 'turn-dmp',
    name: 'Turn DMP',
    category: 'Other',
    patterns: [
      '*.turn.com/dmp/**',
    ],
  },
  {
    id: 'adobe-media-optimizer',
    name: 'Adobe Media Optimizer',
    category: 'Other',
    patterns: [
      '*.adobe.com/media/**',
    ],
  },
  {
    id: 'adobe-primetime',
    name: 'Adobe Primetime',
    category: 'Other',
    patterns: [
      '*.primetime.adobe.com/**',
    ],
  },
  {
    id: 'adobe-advertising-cloud-server',
    name: 'Adobe Advertising Cloud Server',
    category: 'Other',
    patterns: [
      '*.advertising.com/server/**',
    ],
  },
  {
    id: 'opera',
    name: 'Opera Ads',
    category: 'Other',
    patterns: [
      '*.opera.com/ads/**',
      '*.operaads.com/**',
      'ads.opera.com/**',
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
  {
    id: 'revcontent',
    name: 'Revcontent',
    category: 'Native',
    patterns: [
      '*.revcontent.com/**',
    ],
  },
  {
    id: 'content-ad',
    name: 'Content.ad',
    category: 'Native',
    patterns: [
      '*.content.ad/**',
    ],
  },
  {
    id: 'content-recommend',
    name: 'Content Recommend',
    category: 'Native',
    patterns: [
      '*.contentrecommend.net/**',
    ],
  },
  {
    id: 'zemanta',
    name: 'Zemanta',
    category: 'Native',
    patterns: [
      '*.zemanta.com/**',
    ],
  },
  {
    id: 'gravity',
    name: 'Gravity',
    category: 'Native',
    patterns: [
      '*.gravity.com/**',
    ],
  },
  {
    id: 'nativo',
    name: 'Nativo',
    category: 'Native',
    patterns: [
      '*.nativo.com/**',
    ],
  },
  {
    id: 'triplelift-native',
    name: 'TripleLift Native',
    category: 'Native',
    patterns: [
      '*.triplelift.com/native/**',
    ],
  },
  {
    id: 'sharethrough-native',
    name: 'Sharethrough Native',
    category: 'Native',
    patterns: [
      '*.sharethrough.com/native/**',
    ],
  },
  {
    id: 'adsnative',
    name: 'AdsNative',
    category: 'Native',
    patterns: [
      '*.adsnative.com/**',
    ],
  },
  {
    id: 'plista',
    name: 'Plista',
    category: 'Native',
    patterns: [
      '*.plista.com/**',
    ],
  },
  {
    id: 'mgid',
    name: 'MGID',
    category: 'Native',
    patterns: [
      '*.mgid.com/**',
    ],
  },
  {
    id: 'adnow',
    name: 'AdNow',
    category: 'Native',
    patterns: [
      '*.adnow.com/**',
    ],
  },
  {
    id: 'contentiq',
    name: 'ContentIQ',
    category: 'Native',
    patterns: [
      '*.contentiq.com/**',
    ],
  },
  {
    id: 'adblade',
    name: 'AdBlade',
    category: 'Native',
    patterns: [
      '*.adblade.com/**',
    ],
  },
  {
    id: 'adnium',
    name: 'AdNium',
    category: 'Native',
    patterns: [
      '*.adnium.com/**',
    ],
  },
  {
    id: 'adup-tech',
    name: 'Adup Tech',
    category: 'Native',
    patterns: [
      '*.adup-tech.com/**',
    ],
  },
  {
    id: 'adzerk',
    name: 'Adzerk',
    category: 'Native',
    patterns: [
      '*.adzerk.com/**',
    ],
  },
  {
    id: 'adzerk-native',
    name: 'Adzerk Native',
    category: 'Native',
    patterns: [
      '*.adzerk.com/native/**',
    ],
  },
];

// Create a map for quick vendor lookup by ID
export const vendorMap = new Map(vendors.map(v => [v.id, v]));
