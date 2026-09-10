// errors.jsx — nothing fails silently.
//
// Three jobs:
//   1. reportError()  — one funnel for every failure in the app.
//   2. a rolling local log the user can read and send from the account panel.
//   3. saveTracker    — the state of the last write, so the UI can say
//                       "saved" / "waiting for a connection" / "failed".

const ERROR_LOG_KEY = 'maites.errors';
const ERROR_LOG_MAX = 40;

function readErrorLog() {
  try { return JSON.parse(localStorage.getItem(ERROR_LOG_KEY) || '[]'); }
  catch { return []; }
}

function writeErrorLog(entries) {
  try { localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(entries.slice(0, ERROR_LOG_MAX))); }
  catch {}
}

function clearErrorLog() {
  try { localStorage.removeItem(ERROR_LOG_KEY); } catch {}
  errorListeners.forEach(fn => fn([]));
}

const errorListeners = new Set();
function onErrorLogChange(fn) { errorListeners.add(fn); return () => errorListeners.delete(fn); }

// Records a failure. `context` says where it happened ('save-recipe',
// 'load-recipes', 'pdf-export'…) so the log is readable later.
function reportError(context, error, extra) {
  const entry = {
    at: new Date().toISOString(),
    context: String(context || 'unknown'),
    message: (error && (error.message || error.code)) ? String(error.message || error.code) : String(error),
    stack: error && error.stack ? String(error.stack).split('\n').slice(0, 4).join('\n') : '',
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    extra: extra ? String(extra).slice(0, 200) : '',
  };
  // eslint-disable-next-line no-console
  console.warn('[maites]', entry.context, entry.message);
  const next = [entry, ...readErrorLog()];
  writeErrorLog(next);
  errorListeners.forEach(fn => fn(next.slice(0, ERROR_LOG_MAX)));
  // Best effort remote copy — never let reporting throw.
  try {
    if (typeof db_logError === 'function' && navigator.onLine) db_logError(entry);
  } catch {}
  return entry;
}

// Anything React did not catch still reaches the log.
window.addEventListener('error', (e) => {
  if (e && e.message) reportError('window', e.error || new Error(e.message), e.filename);
});
window.addEventListener('unhandledrejection', (e) => {
  reportError('promise', e && e.reason ? e.reason : new Error('unhandled rejection'));
});

// ───────────────────────────────────────────────────────────
// saveTracker — what happened to the last write.
// state: idle | saving | saved | offline | error
// ───────────────────────────────────────────────────────────
const saveTracker = {
  state: 'idle',
  pending: 0,
  lastError: null,
  _listeners: new Set(),
  _savedTimer: 0,

  subscribe(fn) { this._listeners.add(fn); fn(this.snapshot()); return () => this._listeners.delete(fn); },
  snapshot() { return { state: this.state, pending: this.pending, lastError: this.lastError }; },
  _emit() { const s = this.snapshot(); this._listeners.forEach(fn => fn(s)); },

  _set(state) {
    clearTimeout(this._savedTimer);
    this.state = state;
    this._emit();
    if (state === 'saved') {
      this._savedTimer = setTimeout(() => {
        if (this.state === 'saved' && this.pending === 0) { this.state = 'idle'; this._emit(); }
      }, 1800);
    }
  },

  // Wraps a write promise and reports what happened to it.
  async track(label, promise) {
    this.pending++;
    this._set(navigator.onLine ? 'saving' : 'offline');
    try {
      await promise;
      this.pending = Math.max(0, this.pending - 1);
      this.lastError = null;
      this._set(this.pending > 0 ? 'saving' : 'saved');
      return true;
    } catch (err) {
      this.pending = Math.max(0, this.pending - 1);
      // Offline is not a failure: Firestore keeps the write queued locally
      // and replays it when the connection is back.
      if (!navigator.onLine || (err && /unavailable|network|offline/i.test(err.code || err.message || ''))) {
        this._set('offline');
        return false;
      }
      this.lastError = err;
      reportError(label, err);
      this._set('error');
      return false;
    }
  },
};

window.addEventListener('online', () => {
  if (saveTracker.state === 'offline') saveTracker._set(saveTracker.pending ? 'saving' : 'saved');
});
window.addEventListener('offline', () => {
  if (saveTracker.pending > 0) saveTracker._set('offline');
});

function useSaveState() {
  const [s, setS] = React.useState(saveTracker.snapshot());
  React.useEffect(() => saveTracker.subscribe(setS), []);
  return s;
}

// ───────────────────────────────────────────────────────────
// AppErrorBoundary — a render crash shows a way out, not a
// white screen.
// ───────────────────────────────────────────────────────────
class AppErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { reportError('render', error, info && info.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{
        position: 'fixed', inset: 0, display: 'grid', placeItems: 'center',
        background: 'var(--bg)', color: 'var(--ink)', padding: 24, textAlign: 'center',
        fontFamily: 'var(--font-body)',
      }}>
        <div style={{ maxWidth: 340 }}>
          <div style={{ fontSize: 52, marginBottom: 12 }} aria-hidden="true">🍳</div>
          <h1 style={{ margin: '0 0 8px', fontSize: 'var(--t-title)', fontFamily: 'var(--font-display)' }}>
            משהו נשבר כאן
          </h1>
          <p style={{ margin: '0 0 20px', fontSize: 'var(--t-small)', color: 'var(--ink-soft)', lineHeight: 1.6 }}>
            המתכונים שלך בטוחים. אפשר לטעון מחדש ולנסות שוב —
            התקלה נרשמה ואפשר לראות אותה במסך החשבון.
          </p>
          <button type="button" onClick={() => window.location.reload()} style={{
            width: '100%', border: 'none', borderRadius: 'var(--r-md)', padding: '15px 0',
            background: 'var(--ink)', color: 'var(--bg)', fontFamily: 'inherit',
            fontWeight: 700, fontSize: 'var(--t-body)', cursor: 'pointer',
          }}>טעינה מחדש</button>
        </div>
      </div>
    );
  }
}

Object.assign(window, {
  reportError, readErrorLog, clearErrorLog, onErrorLogChange,
  saveTracker, useSaveState, AppErrorBoundary,
});
