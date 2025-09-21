// src/navigation/historyRouter.js
export function pushPage(pageId, meta = {}) {
  const state = { page: pageId, meta, ts: Date.now() };
  window.history.pushState(state, '', window.location.pathname); // SAME URL
  window.dispatchEvent(new CustomEvent('app:navigate', { detail: state }));
}

export function replacePage(pageId, meta = {}) {
  const state = { page: pageId, meta, ts: Date.now() };
  window.history.replaceState(state, '', window.location.pathname);
  window.dispatchEvent(new CustomEvent('app:navigate', { detail: state }));
}

export function onPopState(handler) {
  function pop(e) {
    handler(e.state);
  }
  window.addEventListener('popstate', pop);
  return () => window.removeEventListener('popstate', pop);
}
