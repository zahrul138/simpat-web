"use client";

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import {
  Users,
  MessageSquare,
  Activity,
  RefreshCw,
  ClipboardList,
  ChevronRight,
  Shield,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { getToken, getUser } from "../../utils/auth";
import { getPageLabel } from "../../utils/pageLabels";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const ACTION_CONFIG = {
  LOGIN: { label: "Login", color: "#16a34a", bg: "#dcfce7" },
  LOGIN_FAILED: { label: "Login Failed", color: "#dc2626", bg: "#fee2e2" },
  CREATE_USER: { label: "Create", color: "#2563eb", bg: "#dbeafe" },
  UPDATE_USER: { label: "Update", color: "#d97706", bg: "#fef3c7" },
  DELETE_USER: { label: "Delete", color: "#dc2626", bg: "#fee2e2" },
  ACTIVATE_USER: { label: "Activate", color: "#16a34a", bg: "#dcfce7" },
  DEACTIVATE_USER: { label: "Deactivate", color: "#9333ea", bg: "#f3e8ff" },
  LOGOUT: { label: "Logout", color: "#6b7280", bg: "#f3f4f6" },
};

const DEPT_COLORS = {
  "SCN-MH": "#2563eb",
  "SCN-LOG": "#16a34a",
  "SCN-IQC": "#d97706",
  ADMIN: "#7c3aed",
};

const fmt = (dt) => {
  if (!dt) return "-";
  const d = new Date(dt);
  if (isNaN(d)) return dt;
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}.${p(d.getMinutes())}`;
};

const badge = (color, bg) => ({
  fontSize: "9px",
  fontWeight: "700",
  color,
  backgroundColor: bg,
  border: `1px solid ${color}44`,
  borderRadius: "3px",
  padding: "1px 5px",
  whiteSpace: "nowrap",
  flexShrink: 0,
  marginTop: "1px",
});

const statValue = (color) => ({
  fontSize: "24px",
  fontWeight: "800",
  color: color || "#1f2937",
  lineHeight: 1,
  marginBottom: "2px",
});

const refreshBtn = (loading) => ({
  display: "flex",
  alignItems: "center",
  gap: "5px",
  padding: "6px 12px",
  backgroundColor: loading ? "#f3f4f6" : "#2563eb",
  color: loading ? "#9ca3af" : "white",
  border: "none",
  borderRadius: "6px",
  fontSize: "11px",
  fontWeight: "500",
  cursor: loading ? "not-allowed" : "pointer",
  fontFamily: "inherit",
  transition: "background-color 0.2s ease",
});

const tabBtn = (isActive, color) => ({
  padding: "8px 12px",
  fontSize: "11px",
  fontWeight: isActive ? "700" : "500",
  color: isActive ? color : "#6b7280",
  backgroundColor: "transparent",
  border: "none",
  borderBottom: isActive ? `2px solid ${color}` : "2px solid transparent",
  cursor: "pointer",
  fontFamily: "inherit",
  display: "flex",
  alignItems: "center",
  gap: "5px",
  transition: "all 0.15s ease",
  marginBottom: "-1.5px",
});

const tabBadge = (isActive, color) => ({
  fontSize: "9px",
  fontWeight: "700",
  color: isActive ? "white" : color,
  backgroundColor: isActive ? color : color + "18",
  border: `1px solid ${color}44`,
  borderRadius: "10px",
  padding: "0 5px",
  minWidth: "16px",
  textAlign: "center",
});

const deptBadge = (color) => ({
  fontSize: "9px",
  fontWeight: "700",
  color,
  backgroundColor: color + "18",
  border: `1px solid ${color}44`,
  borderRadius: "3px",
  padding: "1px 5px",
  marginLeft: "6px",
});

const feedbackRow = (bg, color) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "7px 10px",
  backgroundColor: bg,
  border: `1px solid ${color}22`,
  borderRadius: "6px",
  cursor: "pointer",
  transition: "filter 0.15s ease",
});

const qaIcon = (bg) => ({
  width: 30,
  height: 30,
  borderRadius: "6px",
  backgroundColor: bg,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

const styles = {
  page: {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    paddingRight: "24px",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "14px 20px",
    marginBottom: "16px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  topBarLeft: { display: "flex", alignItems: "center", gap: "10px" },
  topBarIcon: {
    width: 34,
    height: 34,
    borderRadius: "7px",
    backgroundColor: "#e0e7ff",
    border: "1.5px solid #9fa8da",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#1f2937",
    margin: 0,
  },
  pageSub: { fontSize: "11px", color: "#9ca3af", margin: "2px 0 0" },
  statRow: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "10px",
    marginBottom: "14px",
  },
  statCard: {
    backgroundColor: "white",
    border: "1.5px solid #9fa8da",
    borderRadius: "8px",
    padding: "14px 16px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    cursor: "pointer",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
  },
  statLabel: {
    fontSize: "10px",
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "6px",
  },
  statSub: { fontSize: "10px", color: "#9ca3af" },
  middleGrid: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "12px",
    marginBottom: "12px",
  },
  bottomGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
  card: {
    backgroundColor: "white",
    borderRadius: "8px",
    border: "1.5px solid #9fa8da",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    overflow: "hidden",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    backgroundColor: "#e0e7ff",
    borderBottom: "1.5px solid #9fa8da",
    borderRadius: "6px 6px 0 0",
  },
  cardHeaderLeft: { display: "flex", alignItems: "center", gap: "7px" },
  cardHeaderTitle: { fontSize: "12px", fontWeight: "700", color: "#1f2937" },
  cardHeaderAction: {
    display: "flex",
    alignItems: "center",
    gap: "3px",
    fontSize: "11px",
    color: "#2563eb",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontWeight: "600",
    fontFamily: "inherit",
  },
  tabBar: {
    display: "flex",
    borderBottom: "1.5px solid #e0e7ff",
    backgroundColor: "white",
    padding: "0 14px",
  },
  onlineUserList: { maxHeight: "280px", overflowY: "auto" },
  onlineEmpty: {
    fontSize: "12px",
    color: "#9ca3af",
    textAlign: "center",
    padding: "24px 0",
  },
  onlineUserRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    alignItems: "center",
    gap: "8px",
    padding: "7px 14px",
    borderBottom: "1px solid #f3f4f6",
  },
  onlineUserName: { fontSize: "11px", fontWeight: "600", color: "#1f2937" },
  onlineLoginTime: { fontSize: "10px", color: "#9ca3af", marginTop: "1px" },
  onlinePageLabel: {
    fontSize: "10px",
    color: "#2563eb",
    marginTop: "2px",
    fontWeight: "500",
  },
  onlineRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
  },
  onlineBadge: {
    fontSize: "9px",
    fontWeight: "600",
    color: "#16a34a",
    backgroundColor: "#dcfce7",
    border: "1px solid #bbf7d0",
    borderRadius: "3px",
    padding: "1px 6px",
    whiteSpace: "nowrap",
  },
  onlineLastSeen: {
    fontSize: "9px",
    color: "#9ca3af",
    marginTop: "2px",
    whiteSpace: "nowrap",
  },
  feedbackBody: {
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  feedbackTotal: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 2px",
  },
  feedbackTotalLabel: { fontSize: "11px", color: "#6b7280", fontWeight: "600" },
  feedbackTotalValue: { fontSize: "16px", fontWeight: "800", color: "#1f2937" },
  divider: { height: "1px", backgroundColor: "#e0e7ff", margin: "8px 0" },
  activityBody: { padding: "4px 16px 10px" },
  activityEmpty: {
    fontSize: "12px",
    color: "#9ca3af",
    textAlign: "center",
    padding: "18px 0",
  },
  listRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    padding: "7px 0",
    borderBottom: "1px solid #f3f4f6",
  },
  listName: { fontSize: "11px", fontWeight: "600", color: "#374151" },
  listSub: { fontSize: "10px", color: "#9ca3af" },
  qaBody: { padding: "12px 14px" },
  qaRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "9px 10px",
    borderRadius: "6px",
    border: "1px solid #e5e7eb",
    cursor: "pointer",
    transition: "all 0.15s ease",
    marginBottom: "7px",
  },
  qaLabel: { fontSize: "12px", fontWeight: "600", color: "#1f2937" },
  qaSub: { fontSize: "10px", color: "#9ca3af" },
  qaItemText: { flex: 1, minWidth: 0 },
  qaSub2: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
};

const AdminDashboardPage = () => {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [onlineTab, setOnlineTab] = useState("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/admin-dashboard/stats`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await r.json();
      if (json.success) {
        setData(json);
        setLastUpdate(new Date());
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, [load]);

  const currentUserId = String(getUser()?.id || "");
  const val = (n) => (loading ? "—" : n);

  const u = data?.users || { total: 0, active: 0, inactive: 0 };
  const f = data?.feedback || {
    total: 0,
    newCount: 0,
    inProgress: 0,
    complete: 0,
  };
  const onlineUsers = data?.onlineUsers || {};
  const recentAct = data?.recentActivity || [];

  const filteredOnlineUsers = Object.entries(onlineUsers)
    .map(([dept, users]) => ({
      dept,
      users: users.filter((u) => String(u.userId) !== currentUserId),
    }))
    .filter(({ users }) => users.length > 0);

  const totalOnline = filteredOnlineUsers.reduce(
    (s, { users }) => s + users.length,
    0,
  );

  const statCards = [
    {
      label: "Total Users",
      value: val(u.total),
      sub: "accounts",
      color: "#2563eb",
      href: "/user-control",
    },
    {
      label: "Active",
      value: val(u.active),
      sub: "currently active",
      color: "#16a34a",
      href: "/user-control",
    },
    {
      label: "Inactive",
      value: val(u.inactive),
      sub: "deactivated",
      color: u.inactive > 0 ? "#dc2626" : "#6b7280",
      href: "/user-control",
      tabState: "In-Active",
    },
    {
      label: "Feedback",
      value: val(f.total),
      sub: `${val(f.newCount)} new`,
      color: "#0891b2",
      href: "/user-feedback",
    },
    {
      label: "Online Now",
      value: val(totalOnline),
      sub: "active sessions",
      color: "#7c3aed",
      href: null,
    },
  ];

  const quickAccess = [
    {
      label: "Manage User",
      sub: `${val(u.total)} users · ${val(u.active)} active`,
      href: "/user-control",
      icon: Users,
      color: "#2563eb",
      bg: "#dbeafe",
    },
    {
      label: "User Feedback",
      sub: `${val(f.newCount)} new · ${val(f.inProgress)} in progress`,
      href: "/user-feedback",
      icon: MessageSquare,
      color: "#0891b2",
      bg: "#ecfeff",
    },
    {
      label: "Activity Log",
      sub: "View all system activity",
      href: "/activity-log",
      icon: ClipboardList,
      color: "#7c3aed",
      bg: "#ede9fe",
    },
  ];

  const feedbackItems = [
    {
      label: "New",
      val: f.newCount,
      color: "#dc2626",
      bg: "#fee2e2",
      icon: AlertCircle,
    },
    {
      label: "In Progress",
      val: f.inProgress,
      color: "#d97706",
      bg: "#fef3c7",
      icon: Clock,
    },
    {
      label: "Complete",
      val: f.complete,
      color: "#16a34a",
      bg: "#dcfce7",
      icon: CheckCircle,
    },
  ];

  const onlineTabs = ["ALL", "ADMIN", "SCN-MH", "SCN-LOG", "SCN-IQC"];

  return (
    <div style={styles.page}>
      <Helmet>
        <title>System Dashboard | SIMPAT Admin</title>
      </Helmet>

      <div style={styles.topBar}>
        <div style={styles.topBarLeft}>
          <div style={styles.topBarIcon}>
            <Shield size={16} color="#2563eb" />
          </div>
          <div>
            <p style={styles.pageTitle}>System Management Dashboard</p>
            <p style={styles.pageSub}>
              {lastUpdate
                ? `Updated ${lastUpdate.toLocaleTimeString("id-ID")}`
                : "ADMIN · SIMPAT"}
            </p>
          </div>
        </div>
        <button
          style={refreshBtn(loading)}
          onClick={load}
          disabled={loading}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.backgroundColor = "#1d4ed8";
          }}
          onMouseLeave={(e) => {
            if (!loading) e.currentTarget.style.backgroundColor = "#2563eb";
          }}
        >
          <RefreshCw
            size={11}
            style={{ animation: loading ? "spin 1s linear infinite" : "none" }}
          />
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div style={styles.statRow}>
        {statCards.map((sc) => (
          <div
            key={sc.label}
            style={styles.statCard}
            onClick={() =>
              sc.href &&
              navigate(
                sc.href,
                sc.tabState ? { state: { tab: sc.tabState } } : undefined,
              )
            }
            onMouseEnter={(e) => {
              if (sc.href) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.1)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
            }}
          >
            <div style={styles.statLabel}>{sc.label}</div>
            <div style={statValue(sc.color)}>{sc.value}</div>
            <div style={styles.statSub}>{sc.sub}</div>
          </div>
        ))}
      </div>

      <div style={styles.middleGrid}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardHeaderLeft}>
              <Activity size={13} color="#2563eb" />
              <span style={styles.cardHeaderTitle}>Online Users</span>
            </div>
          </div>
          <div style={styles.tabBar}>
            {onlineTabs.map((tab) => {
              const count =
                tab === "ALL"
                  ? totalOnline
                  : filteredOnlineUsers.find((d) => d.dept === tab)?.users
                      .length || 0;
              const isActive = onlineTab === tab;
              const color =
                tab === "ALL" ? "#2563eb" : DEPT_COLORS[tab] || "#6b7280";
              return (
                <button
                  key={tab}
                  onClick={() => setOnlineTab(tab)}
                  style={tabBtn(isActive, color)}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.color = color;
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.color = "#6b7280";
                  }}
                >
                  {tab}
                  {count > 0 && (
                    <span style={tabBadge(isActive, color)}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
          <div style={styles.onlineUserList}>
            {(() => {
              const toShow =
                onlineTab === "ALL"
                  ? filteredOnlineUsers
                  : filteredOnlineUsers.filter((d) => d.dept === onlineTab);
              const allUsers = toShow.flatMap(({ users }) => users);
              if (allUsers.length === 0) {
                return (
                  <div style={styles.onlineEmpty}>
                    {loading
                      ? "Loading..."
                      : `No active users${onlineTab !== "ALL" ? ` in ${onlineTab}` : ""}`}
                  </div>
                );
              }
              return allUsers.map((u) => {
                const color = DEPT_COLORS[u.deptCode] || "#6b7280";
                return (
                  <div key={u.userId} style={styles.onlineUserRow}>
                    <div>
                      <div style={styles.onlineUserName}>
                        {u.empName}
                        <span style={deptBadge(color)}>{u.deptCode}</span>
                      </div>
                      <div style={styles.onlineLoginTime}>
                        Login: {fmt(u.loginTime)}
                      </div>
                      <div style={styles.onlinePageLabel}>
                        📄 {getPageLabel(u.currentPage)}
                      </div>
                    </div>
                    <div style={styles.onlineRight}>
                      <span style={styles.onlineBadge}>● Online</span>
                      <span style={styles.onlineLastSeen}>
                        {fmt(u.lastSeen)}
                      </span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardHeaderLeft}>
              <MessageSquare size={13} color="#2563eb" />
              <span style={styles.cardHeaderTitle}>Feedback Status</span>
            </div>
          </div>
          <div style={styles.feedbackBody}>
            {feedbackItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  onClick={() =>
                    navigate("/user-feedback", { state: { tab: item.label } })
                  }
                  style={feedbackRow(item.bg, item.color)}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.filter = "brightness(0.95)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.filter = "brightness(1)")
                  }
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Icon size={12} color={item.color} />
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        color: item.color,
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "16px",
                      fontWeight: "800",
                      color: item.color,
                    }}
                  >
                    {val(item.val)}
                  </span>
                </div>
              );
            })}
            <div style={styles.divider} />
            <div style={styles.feedbackTotal}>
              <span style={styles.feedbackTotalLabel}>Total :</span>
              <span style={styles.feedbackTotalValue}>{val(f.total)}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.bottomGrid}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardHeaderLeft}>
              <ClipboardList size={13} color="#2563eb" />
              <span style={styles.cardHeaderTitle}>Recent Activity</span>
            </div>
            <button
              style={styles.cardHeaderAction}
              onClick={() => navigate("/activity-log")}
            >
              View All <ChevronRight size={11} />
            </button>
          </div>
          <div style={styles.activityBody}>
            {recentAct.length === 0 ? (
              <div style={styles.activityEmpty}>
                {loading ? "Loading..." : "No activity yet"}
              </div>
            ) : (
              recentAct.map((log) => {
                const cfg = ACTION_CONFIG[log.action] || {
                  label: log.action,
                  color: "#374151",
                  bg: "#f3f4f6",
                };
                return (
                  <div key={log.id} style={styles.listRow}>
                    <span style={badge(cfg.color, cfg.bg)}>{cfg.label}</span>
                    <div>
                      <div style={styles.listName}>{log.emp_name || "-"}</div>
                      <div style={styles.listSub}>{fmt(log.created_at)}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardHeaderLeft}>
              <Shield size={13} color="#2563eb" />
              <span style={styles.cardHeaderTitle}>Quick Access</span>
            </div>
          </div>
          <div style={styles.qaBody}>
            {quickAccess.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.href}
                  style={styles.qaRow}
                  onClick={() => navigate(item.href)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = item.bg;
                    e.currentTarget.style.borderColor = item.color + "55";
                    e.currentTarget.style.transform = "translateX(2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.borderColor = "#e5e7eb";
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                >
                  <div style={qaIcon(item.bg)}>
                    <Icon size={14} color={item.color} />
                  </div>
                  <div style={styles.qaItemText}>
                    <div style={styles.qaLabel}>{item.label}</div>
                    <div style={{ ...styles.qaSub, ...styles.qaSub2 }}>
                      {item.sub}
                    </div>
                  </div>
                  <ChevronRight size={13} color="#9ca3af" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AdminDashboardPage;
