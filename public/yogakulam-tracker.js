(function () {
  'use strict';
  var script = document.currentScript;
  if (!script) return;
  var endpoint = script.dataset.endpoint || '/api/tracking/collect';
  var site = script.dataset.site || location.hostname;
  var consentMode = script.dataset.consentMode || 'required';
  var cookieDays = Number(script.dataset.cookieDays || '90');
  var storageOK = true;
  try { localStorage.setItem('__yk_test','1'); localStorage.removeItem('__yk_test'); } catch(e) { storageOK = false; }

  function uid(prefix) {
    var id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2));
    return prefix + '_' + id;
  }
  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }
  function setCookie(name, value) {
    var maxAge = cookieDays * 86400;
    document.cookie = name + '=' + encodeURIComponent(value) + '; path=/; max-age=' + maxAge + '; samesite=lax';
  }
  function deleteCookie(name) { document.cookie = name + '=; path=/; max-age=0; samesite=lax'; }
  function params() { return new URLSearchParams(location.search); }
  function referrerSource() {
    if (!document.referrer) return { source: 'direct', medium: 'none' };
    try {
      var host = new URL(document.referrer).hostname.replace(/^www\./,'');
      if (host === location.hostname.replace(/^www\./,'')) return { source: 'direct', medium: 'internal' };
      if (/google\./i.test(host)) return { source: 'google', medium: 'organic' };
      if (/instagram\.com|facebook\.com|fb\.com/i.test(host)) return { source: 'meta', medium: 'organic_social' };
      if (/youtube\.com|youtu\.be/i.test(host)) return { source: 'youtube', medium: 'organic_video' };
      return { source: host, medium: 'referral' };
    } catch(e) { return { source: 'referral', medium: 'referral' }; }
  }
  function touchFromUrl() {
    var p = params();
    var fallback = referrerSource();
    var hasGoogle = p.get('gclid') || p.get('gbraid') || p.get('wbraid');
    var hasMeta = p.get('fbclid');
    return {
      source: p.get('utm_source') || (hasGoogle ? 'google' : hasMeta ? 'meta' : fallback.source),
      medium: p.get('utm_medium') || (hasGoogle ? 'cpc' : hasMeta ? 'paid_social' : fallback.medium),
      campaign: p.get('utm_campaign'), content: p.get('utm_content'), term: p.get('utm_term'), utmId: p.get('utm_id'),
      gclid: p.get('gclid'), gbraid: p.get('gbraid'), wbraid: p.get('wbraid'), fbclid: p.get('fbclid'),
      campaignId: p.get('campaign_id') || p.get('campaignid'), adsetId: p.get('adset_id'),
      adId: p.get('ad_id'), adgroupId: p.get('adgroup_id') || p.get('adgroupid'), creativeId: p.get('creative')
    };
  }
  function meaningful(t) { return t && ((t.source && t.source !== 'direct') || t.gclid || t.gbraid || t.wbraid || t.fbclid || t.campaign); }

  var consentGranted = consentMode === 'none' || consentMode === 'granted' || getCookie('yk_analytics_consent') === '1';
  var sessionTouch = touchFromUrl();
  var firstTouch = sessionTouch;
  if (consentGranted && storageOK) {
    try {
      var storedFirst = JSON.parse(localStorage.getItem('yk_first_touch_v1') || 'null');
      if (storedFirst) firstTouch = storedFirst;
      else if (meaningful(sessionTouch)) localStorage.setItem('yk_first_touch_v1', JSON.stringify(sessionTouch));
    } catch(e) {}
  }

  var visitorId = consentGranted ? (getCookie('yk_vid') || uid('vis')) : uid('vis');
  if (consentGranted) setCookie('yk_vid', visitorId);
  var sessionKey = null;
  if (consentGranted) { try { sessionKey = sessionStorage.getItem('yk_sid'); } catch(e) {} }
  if (!sessionKey) sessionKey = uid('ses');
  if (consentGranted) { try { sessionStorage.setItem('yk_sid', sessionKey); } catch(e) {} }

  function send(eventType, metadata) {
    if (!consentGranted) return Promise.resolve({ skipped: true });
    var body = {
      eventId: uid('evt'), eventType: eventType, occurredAt: new Date().toISOString(), anonymousVisitorId: visitorId,
      sessionKey: sessionKey, site: site, pageUrl: location.href, pagePath: location.pathname + location.search,
      pageTitle: document.title, referrer: document.referrer || null, firstTouch: firstTouch, sessionTouch: sessionTouch,
      metadata: metadata || {}
    };
    try {
      if (navigator.sendBeacon && eventType === 'page_exit') {
        navigator.sendBeacon(endpoint, new Blob([JSON.stringify(body)], { type: 'application/json' }));
        return Promise.resolve({ ok: true });
      }
    } catch(e) {}
    return fetch(endpoint, { method: 'POST', mode: 'cors', credentials: 'omit', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(function(){ return null; });
  }

  function decorateForm(form) {
    if (!consentGranted || !form || !form.appendChild) return;
    var fields = {
      yk_visitor_id: visitorId,
      yk_session_id: sessionKey,
      yk_first_touch: JSON.stringify(firstTouch || {}),
      yk_session_touch: JSON.stringify(sessionTouch || {})
    };
    Object.keys(fields).forEach(function (name) {
      var input = form.querySelector('input[name="' + name + '"]');
      if (!input) { input = document.createElement('input'); input.type = 'hidden'; input.name = name; form.appendChild(input); }
      input.value = fields[name];
    });
  }

  function pushReady() {
    if (!consentGranted) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'yk_tracking_ready', yk_visitor_id: visitorId, yk_session_id: sessionKey, yk_source: sessionTouch.source, yk_medium: sessionTouch.medium, yk_campaign: sessionTouch.campaign });
  }

  window.YKTracking = {
    track: send,
    context: function () { return consentGranted ? { anonymousVisitorId: visitorId, sessionKey: sessionKey, firstTouch: firstTouch, sessionTouch: sessionTouch } : null; },
    decorateForm: decorateForm,
    grantConsent: function () {
      if (consentGranted) return;
      consentGranted = true;
      setCookie('yk_analytics_consent','1'); setCookie('yk_vid', visitorId);
      try { sessionStorage.setItem('yk_sid', sessionKey); } catch(e) {}
      if (storageOK && meaningful(firstTouch)) { try { localStorage.setItem('yk_first_touch_v1', JSON.stringify(firstTouch)); } catch(e) {} }
      document.querySelectorAll('form[data-yk-lead-form]').forEach(decorateForm);
      pushReady();
      send('page_view', { consent_granted_now: true });
    },
    revokeConsent: function () {
      consentGranted = false;
      setCookie('yk_analytics_consent','0'); deleteCookie('yk_vid');
      if (storageOK) { try { localStorage.removeItem('yk_first_touch_v1'); } catch(e) {} }
      try { sessionStorage.removeItem('yk_sid'); } catch(e) {}
    }
  };

  document.addEventListener('click', function (event) {
    var target = event.target && event.target.closest ? event.target.closest('[data-yk-event]') : null;
    if (!target) return;
    send(target.getAttribute('data-yk-event') || 'cta_click', {
      label: target.getAttribute('data-yk-label') || (target.textContent || '').trim().slice(0,120),
      destination: target.getAttribute('href') || null,
      contact_channel: target.getAttribute('data-yk-channel') || null
    });
  }, true);

  document.querySelectorAll('form[data-yk-lead-form]').forEach(decorateForm);
  document.addEventListener('submit', function (event) {
    var form = event.target && event.target.matches && event.target.matches('form[data-yk-lead-form]') ? event.target : null;
    if (!form) return;
    decorateForm(form);
    send('lead_form_submit', { form_id: form.id || null, form_name: form.getAttribute('name') || null });
  }, true);

  window.addEventListener('yk:consent', function (event) {
    var detail = event && event.detail ? event.detail : {};
    if (detail.analytics === true) window.YKTracking.grantConsent();
    if (detail.analytics === false) window.YKTracking.revokeConsent();
  });

  if (consentGranted) { pushReady(); send('page_view', { initial: true }); }
})();
