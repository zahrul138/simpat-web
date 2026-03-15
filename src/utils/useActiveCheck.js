import { useEffect } from "react";
import { getToken, clearAuth } from "./auth";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";
const POLL_INTERVAL = 10_000; // cek setiap 10 detik

const useActiveCheck = () => {
  useEffect(() => {
    const check = async () => {
      const token = getToken();
      if (!token) return;

      try {
        const r = await fetch(`${API_BASE}/auth/check`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (r.status === 401) {
          clearAuth();
          window.location.replace("/login");
        }
      } catch {
        // network error — skip, jangan kick out
      }
    };

    check();
    const interval = setInterval(check, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);
};

export default useActiveCheck;