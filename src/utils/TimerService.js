const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";
const HEARTBEAT_INTERVAL = 30_000;

class TimerService {
  constructor() {
    this.subscribers       = new Set();
    this.interval          = null;
    this.currentTime       = new Date();
    this.isRunning         = false;
    this.heartbeatInterval = null;
    this._userId              = null;
    this._lastPage            = null;
    this._navUnlisten         = null;
    this._beforeUnloadHandler = null;
  }

  start() {
    if (!this._userId) {
      try {
        const user = JSON.parse(sessionStorage.getItem("auth_user") || "null");
        if (user?.id) this._userId = user.id;
      } catch { /* silent */ }
    }

    if (this.isRunning) return;
    this.isRunning = true;

    // Clock — update setiap detik
    this.interval = setInterval(() => {
      this.currentTime = new Date();
      this.notifySubscribers();
    }, 1000);

    this._startHeartbeat();
    this._startNavListener();
    this._startBeaconListener();
  }

  stop() {
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
    this.isRunning = false;
    this._stopHeartbeat();
    this._stopNavListener();
    this._stopBeaconListener();
    this._userId   = null;
    this._lastPage = null;
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.unsubscribe(callback);
  }

  unsubscribe(callback) { this.subscribers.delete(callback); }
  notifySubscribers()   { this.subscribers.forEach((cb) => cb(this.currentTime)); }
  getCurrentTime()      { return this.currentTime; }

  // ── Private ─────────────────────────────────────────────────────

  _getUserId() {
    if (this._userId) return this._userId;
    try {
      const user = JSON.parse(sessionStorage.getItem("auth_user") || "null");
      if (user?.id) { this._userId = user.id; }
    } catch { /* silent */ }
    return this._userId;
  }

  _getToken() { return sessionStorage.getItem("auth_token"); }

  async _sendHeartbeat() {
    const userId = this._getUserId();
    const token  = this._getToken();
    if (!userId || !token) return;

    const currentPage = window.location.pathname || "/";

    try {
      await fetch(`${API_BASE}/api/active-sessions/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, currentPage }),
      });
    } catch { /* silent */ }
  }

  _startHeartbeat() {
    if (this.heartbeatInterval) return;
    this._sendHeartbeat();
    this.heartbeatInterval = setInterval(
      () => this._sendHeartbeat(),
      HEARTBEAT_INTERVAL
    );
  }

  _stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    const userId = this._userId;
    if (userId) {
      fetch(`${API_BASE}/api/active-sessions/logout`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      }).catch(() => {});
    }
  }

  // ── Beacon — hapus dari active sessions saat tab ditutup ──────────
  // Pakai sendBeacon karena fetch di-cancel browser saat beforeunload
  // Hanya hapus session, TIDAK catat activity log (itu hanya dari Navbar)
  _startBeaconListener() {
    if (this._beforeUnloadHandler) return;

    this._beforeUnloadHandler = () => {
      const userId = this._userId;
      if (!userId) return;

      const data = new Blob([JSON.stringify({ userId })], { type: "application/json" });

      // 1. Tandai session isClosing — fallback 90 detik kalau beacon DELETE gagal
      navigator.sendBeacon(`${API_BASE}/api/active-sessions/mark-closing`, data);

      // 2. Hapus session + catat activity log
      navigator.sendBeacon(`${API_BASE}/api/active-sessions/logout-with-log`, data);
    };

    window.addEventListener("beforeunload", this._beforeUnloadHandler);
  }

  _stopBeaconListener() {
    if (this._beforeUnloadHandler) {
      window.removeEventListener("beforeunload", this._beforeUnloadHandler);
      this._beforeUnloadHandler = null;
    }
  }

  // ── Navigation listener — kirim heartbeat segera saat pindah halaman ──
  _startNavListener() {
    if (this._navUnlisten) return;

    this._lastPage = window.location.pathname;

    // Override pushState
    const originalPushState = window.history.pushState.bind(window.history);
    window.history.pushState = (...args) => {
      originalPushState(...args);
      this._onNavigate();
    };

    // Override replaceState
    const originalReplaceState = window.history.replaceState.bind(window.history);
    window.history.replaceState = (...args) => {
      originalReplaceState(...args);
      this._onNavigate();
    };

    // Tombol back/forward browser
    const popHandler = () => this._onNavigate();
    window.addEventListener("popstate", popHandler);

    // Simpan cleanup function
    this._navUnlisten = () => {
      window.history.pushState    = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener("popstate", popHandler);
    };
  }

  _stopNavListener() {
    if (this._navUnlisten) {
      this._navUnlisten();
      this._navUnlisten = null;
    }
  }

  _onNavigate() {
    const newPage = window.location.pathname;
    // Hanya kirim kalau halaman benar-benar berubah
    if (newPage !== this._lastPage) {
      this._lastPage = newPage;
      this._sendHeartbeat();
    }
  }
}

const timerService = new TimerService();
export default timerService;