"use client";

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarCheck, Ship, ShieldCheck, RotateCcw, Clock, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const http = async (path) => {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const text = await res.text();
  try { return text ? JSON.parse(text) : null; } catch { return null; }
};

const QCDashboardPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    localSchedule: { total: 0, pending: 0, done: 0 },
    overseaSchedule: { total: 0, pending: 0, done: 0 },
    qcParts: { total: 0, passed: 0, failed: 0 },
    returnParts: { total: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const [localResp, overseaResp, qcResp, returnResp] = await Promise.allSettled([
        http("/api/local-schedule?limit=1000&page=1"),
        http("/api/oversea-schedule?limit=1000&page=1"),
        http("/api/qc-check?limit=1000&page=1"),
        http("/api/return-parts?limit=1000&page=1"),
      ]);

      const localData  = localResp.status  === "fulfilled" ? localResp.value  : null;
      const overseaData= overseaResp.status=== "fulfilled" ? overseaResp.value: null;
      const qcData     = qcResp.status     === "fulfilled" ? qcResp.value     : null;
      const returnData = returnResp.status === "fulfilled" ? returnResp.value : null;

      const localItems   = localData?.items   || localData?.data   || [];
      const overseaItems = overseaData?.items || overseaData?.data || [];
      const qcItems      = qcData?.items      || qcData?.data      || [];
      const returnItems  = returnData?.items  || returnData?.data  || [];

      setStats({
        localSchedule: {
          total:   localItems.length,
          pending: localItems.filter((i) => i.status === "Pending" || i.status === "OnProgress").length,
          done:    localItems.filter((i) => i.status === "Complete" || i.status === "Done").length,
        },
        overseaSchedule: {
          total:   overseaItems.length,
          pending: overseaItems.filter((i) => i.status === "Pending" || i.status === "OnProgress").length,
          done:    overseaItems.filter((i) => i.status === "Complete" || i.status === "Done").length,
        },
        qcParts: {
          total:  qcItems.length,
          passed: qcItems.filter((i) => i.result === "Pass" || i.status === "Pass").length,
          failed: qcItems.filter((i) => i.result === "Fail" || i.status === "Fail").length,
        },
        returnParts: {
          total: returnItems.length,
        },
      });
      setLastUpdate(new Date());
    } catch (err) {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const menuCards = [
    {
      title: "Local Schedule",
      description: "Monitor QC inspections for local deliveries",
      href: "/qc-local-schedule",
      icon: CalendarCheck,
      color: "#2563eb",
      bg: "#eff6ff",
      border: "#bfdbfe",
      stat: `${stats.localSchedule.total} records`,
    },
    {
      title: "Oversea Schedule",
      description: "Track quality checks for oversea shipments",
      href: "/qc-oversea-schedule",
      icon: Ship,
      color: "#0891b2",
      bg: "#ecfeff",
      border: "#a5f3fc",
      stat: `${stats.overseaSchedule.total} records`,
    },
    {
      title: "Quality Parts",
      description: "Inspect and approve incoming parts",
      href: "/qc-part",
      icon: ShieldCheck,
      color: "#16a34a",
      bg: "#f0fdf4",
      border: "#bbf7d0",
      stat: `${stats.qcParts.total} records`,
    },
    {
      title: "Return Parts",
      description: "Manage parts returned from QC inspection",
      href: "/qc-return-parts",
      icon: RotateCcw,
      color: "#d97706",
      bg: "#fffbeb",
      border: "#fde68a",
      stat: `${stats.returnParts.total} records`,
    },
  ];

  const styles = {
    page: {
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      paddingRight: "24px",
    },
    header: {
      backgroundColor: "white",
      borderRadius: "8px",
      border: "1px solid #e5e7eb",
      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      padding: "24px 28px",
      marginBottom: "20px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    headerLeft: {},
    headerTitle: {
      fontSize: "20px",
      fontWeight: "700",
      color: "#111827",
      margin: 0,
      marginBottom: "4px",
    },
    headerSub: {
      fontSize: "12px",
      color: "#6b7280",
      margin: 0,
    },
    refreshBtn: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "7px 14px",
      backgroundColor: "#f3f4f6",
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
      fontSize: "12px",
      color: "#374151",
      cursor: "pointer",
      fontFamily: "inherit",
    },
    statsRow: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: "16px",
      marginBottom: "20px",
    },
    statCard: {
      backgroundColor: "white",
      borderRadius: "8px",
      border: "1px solid #e5e7eb",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      padding: "20px",
    },
    statLabel: {
      fontSize: "11px",
      fontWeight: "600",
      color: "#6b7280",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      marginBottom: "8px",
    },
    statValue: {
      fontSize: "28px",
      fontWeight: "800",
      color: "#111827",
      lineHeight: 1,
      marginBottom: "4px",
    },
    statSub: {
      fontSize: "11px",
      color: "#9ca3af",
    },
    sectionTitle: {
      fontSize: "14px",
      fontWeight: "600",
      color: "#374151",
      marginBottom: "14px",
    },
    cardsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: "16px",
    },
    menuCard: {
      backgroundColor: "white",
      borderRadius: "8px",
      border: "1px solid #e5e7eb",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      padding: "20px",
      cursor: "pointer",
      transition: "box-shadow 0.2s ease, transform 0.15s ease",
      display: "flex",
      alignItems: "flex-start",
      gap: "16px",
    },
    iconBox: (color, bg, border) => ({
      width: "44px",
      height: "44px",
      borderRadius: "8px",
      backgroundColor: bg,
      border: `1px solid ${border}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }),
    cardTitle: {
      fontSize: "14px",
      fontWeight: "600",
      color: "#111827",
      margin: 0,
      marginBottom: "4px",
    },
    cardDesc: {
      fontSize: "11px",
      color: "#6b7280",
      margin: 0,
      marginBottom: "8px",
      lineHeight: "1.5",
    },
    cardStat: {
      fontSize: "11px",
      fontWeight: "600",
      color: "#374151",
      backgroundColor: "#f3f4f6",
      padding: "2px 8px",
      borderRadius: "10px",
      display: "inline-block",
    },
  };

  const totalPending = stats.localSchedule.pending + stats.overseaSchedule.pending;
  const totalPassed  = stats.qcParts.passed;
  const totalFailed  = stats.qcParts.failed;
  const totalReturns = stats.returnParts.total;

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.headerTitle}>Quality Control Dashboard</h1>
          <p style={styles.headerSub}>
            {lastUpdate
              ? `Last updated: ${lastUpdate.toLocaleTimeString("id-ID")}`
              : "SCN-IQC Overview"}
          </p>
        </div>
        <button style={styles.refreshBtn} onClick={loadStats} disabled={loading}>
          <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      {/* Stats Row */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Pending Inspections</div>
          <div style={{ ...styles.statValue, color: totalPending > 0 ? "#d97706" : "#111827" }}>
            {loading ? "—" : totalPending}
          </div>
          <div style={styles.statSub}>local + oversea</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Parts Passed</div>
          <div style={{ ...styles.statValue, color: "#16a34a" }}>
            {loading ? "—" : totalPassed}
          </div>
          <div style={styles.statSub}>QC approved</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Parts Failed</div>
          <div style={{ ...styles.statValue, color: totalFailed > 0 ? "#dc2626" : "#111827" }}>
            {loading ? "—" : totalFailed}
          </div>
          <div style={styles.statSub}>QC rejected</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Return Parts</div>
          <div style={{ ...styles.statValue, color: totalReturns > 0 ? "#dc2626" : "#111827" }}>
            {loading ? "—" : totalReturns}
          </div>
          <div style={styles.statSub}>returned to vendor</div>
        </div>
      </div>

      {/* Quick Access */}
      <div style={styles.sectionTitle}>Quick Access</div>
      <div style={styles.cardsGrid}>
        {menuCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.href}
              style={styles.menuCard}
              onClick={() => navigate(card.href)}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={styles.iconBox(card.color, card.bg, card.border)}>
                <Icon size={20} color={card.color} />
              </div>
              <div>
                <p style={styles.cardTitle}>{card.title}</p>
                <p style={styles.cardDesc}>{card.description}</p>
                <span style={styles.cardStat}>{card.stat}</span>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default QCDashboardPage;