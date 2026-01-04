// Injected script for AdFlow - runs in page context to access GAM/Prebid APIs
// This file is injected via chrome.runtime.getURL to bypass CSP restrictions

(function() {
  'use strict';

  var POLL_INTERVAL = 1000;
  var lastMappingsHash = '';
  var DEBUG = false; // Set to true to enable console logging during development

  function log() {
    if (DEBUG) console.log.apply(console, ['[AdFlow]'].concat(Array.prototype.slice.call(arguments)));
  }


  function collectSlotMappings() {
    var slots = [];

    // Collect from Google Ad Manager (googletag)
    try {
      var gt = window.googletag;
      if (gt && typeof gt.pubads === 'function') {
        var pubads = gt.pubads();
        if (pubads && typeof pubads.getSlots === 'function') {
          var gamSlots = pubads.getSlots() || [];
          log('Found', gamSlots.length, 'GAM slots');
          for (var i = 0; i < gamSlots.length; i++) {
            var slot = gamSlots[i];
            var elementId = slot.getSlotElementId ? slot.getSlotElementId() : null;
            var adUnitPath = slot.getAdUnitPath ? slot.getAdUnitPath() : null;

            if (elementId && adUnitPath) {
              var sizes = [];
              try {
                var slotSizes = slot.getSizes ? slot.getSizes() : null;
                if (slotSizes) {
                  for (var j = 0; j < slotSizes.length; j++) {
                    var size = slotSizes[j];
                    if (size && typeof size.getWidth === 'function' && typeof size.getHeight === 'function') {
                      sizes.push(size.getWidth() + 'x' + size.getHeight());
                    } else if (typeof size === 'string') {
                      sizes.push(size);
                    }
                  }
                }
              } catch (e) { log('Error getting sizes:', e); }

              slots.push({
                elementId: elementId,
                slotId: adUnitPath,
                type: 'gam',
                sizes: sizes.length > 0 ? sizes : undefined
              });
            }
          }
        }
      }
    } catch (e) { log('Error collecting GAM slots:', e); }

    // Collect from Prebid.js - check multiple possible globals
    try {
      var pbjsGlobals = [];

      // Check _pbjsGlobals array first
      if (window._pbjsGlobals && Array.isArray(window._pbjsGlobals)) {
        for (var g = 0; g < window._pbjsGlobals.length; g++) {
          pbjsGlobals.push(window._pbjsGlobals[g]);
        }
      }

      // Also check common Prebid global names
      var commonNames = ['pbjs', 'PREBID_TIMEOUT'];
      for (var k = 0; k < commonNames.length; k++) {
        var name = commonNames[k];
        if (window[name] && pbjsGlobals.indexOf(name) === -1) {
          pbjsGlobals.push(name);
        }
      }

      if (pbjsGlobals.length > 0) {
        log('Checking Prebid globals:', pbjsGlobals.join(', '));
      }

      for (var m = 0; m < pbjsGlobals.length; m++) {
        var globalName = pbjsGlobals[m];
        var pbjs = window[globalName];

        if (!pbjs) continue;

        // Try adUnits array
        if (pbjs.adUnits && Array.isArray(pbjs.adUnits)) {
          log('Found', pbjs.adUnits.length, 'Prebid ad units in', globalName);

          for (var n = 0; n < pbjs.adUnits.length; n++) {
            var unit = pbjs.adUnits[n];
            var code = unit.code;
            if (code) {
              var unitSizes = [];
              if (unit.mediaTypes && unit.mediaTypes.banner && unit.mediaTypes.banner.sizes) {
                var bannerSizes = unit.mediaTypes.banner.sizes;
                for (var p = 0; p < bannerSizes.length; p++) {
                  var s = bannerSizes[p];
                  if (Array.isArray(s) && s.length === 2) {
                    unitSizes.push(s[0] + 'x' + s[1]);
                  }
                }
              }

              // Also try legacy sizes format
              if (unitSizes.length === 0 && unit.sizes && Array.isArray(unit.sizes)) {
                for (var q = 0; q < unit.sizes.length; q++) {
                  var ls = unit.sizes[q];
                  if (Array.isArray(ls) && ls.length === 2) {
                    unitSizes.push(ls[0] + 'x' + ls[1]);
                  }
                }
              }

              // Avoid duplicates
              var exists = false;
              for (var r = 0; r < slots.length; r++) {
                if (slots[r].elementId === code) {
                  exists = true;
                  break;
                }
              }

              if (!exists) {
                slots.push({
                  elementId: code,
                  slotId: code,
                  type: 'prebid',
                  sizes: unitSizes.length > 0 ? unitSizes : undefined
                });
              }
            }
          }
        }

        // Also try to get ad units from getBidResponses
        if (typeof pbjs.getBidResponses === 'function') {
          try {
            var bidResponses = pbjs.getBidResponses();
            log('Got bid responses for', Object.keys(bidResponses).length, 'ad units');
            for (var adUnitCode in bidResponses) {
              if (bidResponses.hasOwnProperty(adUnitCode)) {
                var alreadyExists = false;
                for (var t = 0; t < slots.length; t++) {
                  if (slots[t].elementId === adUnitCode) {
                    alreadyExists = true;
                    break;
                  }
                }
                if (!alreadyExists) {
                  slots.push({
                    elementId: adUnitCode,
                    slotId: adUnitCode,
                    type: 'prebid',
                    sizes: undefined
                  });
                }
              }
            }
          } catch (e) { log('Error getting bid responses:', e); }
        }

        // Try getAdUnits if available (some Prebid versions)
        if (typeof pbjs.getAdUnits === 'function') {
          try {
            var adUnits = pbjs.getAdUnits();
            log('Got', adUnits.length, 'ad units from getAdUnits()');
            for (var u = 0; u < adUnits.length; u++) {
              var au = adUnits[u];
              if (au.code) {
                var auExists = false;
                for (var v = 0; v < slots.length; v++) {
                  if (slots[v].elementId === au.code) {
                    auExists = true;
                    break;
                  }
                }
                if (!auExists) {
                  slots.push({
                    elementId: au.code,
                    slotId: au.code,
                    type: 'prebid',
                    sizes: undefined
                  });
                }
              }
            }
          } catch (e) { log('Error getting ad units:', e); }
        }
      }
    } catch (e) { log('Error collecting Prebid slots:', e); }

    return { slots: slots, timestamp: Date.now() };
  }

  function sendMappings(mappings) {
    // Don't send empty slot arrays - they're not useful and can overwrite good data
    if (mappings.slots.length === 0) {
      return;
    }

    var slotIds = [];
    for (var i = 0; i < mappings.slots.length; i++) {
      slotIds.push(mappings.slots[i].elementId + ':' + mappings.slots[i].slotId);
    }
    slotIds.sort();
    var hash = JSON.stringify(slotIds);

    if (hash !== lastMappingsHash) {
      lastMappingsHash = hash;
      log('Sending', mappings.slots.length, 'slots to content script:', mappings.slots);
      window.postMessage({ type: 'ADFLOW_SLOT_DATA', payload: mappings }, '*');
    } else {
      log('Slots unchanged, not sending (count:', mappings.slots.length, ')');
    }
  }

  function pollForSlots() {
    var mappings = collectSlotMappings();
    sendMappings(mappings);
  }

  // Start polling immediately
  pollForSlots();

  // Continue polling
  setInterval(pollForSlots, POLL_INTERVAL);

  // Hook into googletag ready
  try {
    window.googletag = window.googletag || { cmd: [] };
    window.googletag.cmd.push(function() {
      log('googletag ready callback triggered');
      setTimeout(pollForSlots, 100);
      setTimeout(pollForSlots, 500);
      setTimeout(pollForSlots, 1000);
    });
  } catch (e) { log('Error hooking googletag:', e); }

  // Hook into Prebid events
  function hookPrebidEvents() {
    var pbjsGlobals = window._pbjsGlobals || [];
    if (window.pbjs && pbjsGlobals.indexOf('pbjs') === -1) {
      pbjsGlobals.push('pbjs');
    }

    for (var i = 0; i < pbjsGlobals.length; i++) {
      var pbjs = window[pbjsGlobals[i]];
      if (pbjs && typeof pbjs.onEvent === 'function') {
        log('Hooking into Prebid events on', pbjsGlobals[i]);
        try {
          pbjs.onEvent('auctionEnd', function() {
            log('Prebid auctionEnd event');
            setTimeout(pollForSlots, 100);
          });
          pbjs.onEvent('bidWon', function() {
            log('Prebid bidWon event');
            setTimeout(pollForSlots, 100);
          });
        } catch (e) { log('Error hooking Prebid events:', e); }
      }
    }
  }

  // Try to hook Prebid events after delays (Prebid might not be ready yet)
  setTimeout(hookPrebidEvents, 500);
  setTimeout(hookPrebidEvents, 1000);
  setTimeout(hookPrebidEvents, 2000);
  setTimeout(hookPrebidEvents, 5000);
})();
