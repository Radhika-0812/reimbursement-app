// A tiny lazy event bus that auto-destroys after 5 minutes of inactivity.

let bus = null;
let idleTimer = null;
const IDLE_MS = 5 * 60 * 1000; // 5 minutes

class SimpleBus {
  constructor() {
    this.listeners = new Map(); // event -> Set<fn>
  }
  on(event, handler) {
    let set = this.listeners.get(event);
    if (!set) { set = new Set(); this.listeners.set(event, set); }
    set.add(handler);
    return () => this.off(event, handler);
  }
  off(event, handler) {
    const set = this.listeners.get(event);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) this.listeners.delete(event);
  }
  emit(event, payload) {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of Array.from(set)) {
      try { fn(payload); } catch (e) { console.error("event handler error:", e); }
    }
  }
  clear() { this.listeners.clear(); }
}

function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { try { bus?.clear(); } catch {} bus = null; }, IDLE_MS);
}
function ensureBus() { if (!bus) bus = new SimpleBus(); resetIdleTimer(); return bus; }

export function on(event, handler) {
  const b = ensureBus();
  const off = b.on(event, handler);
  resetIdleTimer();
  return () => { off(); resetIdleTimer(); };
}
export function emit(event, payload) { const b = ensureBus(); b.emit(event, payload); resetIdleTimer(); }
export function off(event, handler) { if (!bus) return; bus.off(event, handler); resetIdleTimer(); }
export function isActive() { return !!bus; }
