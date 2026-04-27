/**
 * tabVisibility — inactive tab protection.
 * Use isTabActive() before running expensive operations.
 * Subscribe with onTabActive(fn) to resume work when tab regains focus.
 */

let _active = !document.hidden;
const _listeners = new Set();

document.addEventListener("visibilitychange", () => {
  _active = !document.hidden;
  if (_active) {
    _listeners.forEach(fn => { try { fn(); } catch (_) {} });
  }
});

export function isTabActive() {
  return _active;
}

export function onTabActive(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

/**
 * runWhenActive — runs fn immediately if tab is active,
 * otherwise queues it to run the next time the tab becomes active.
 */
export function runWhenActive(fn) {
  if (_active) {
    fn();
  } else {
    const unsub = onTabActive(() => {
      unsub();
      fn();
    });
  }
}