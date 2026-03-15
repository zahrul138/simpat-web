"use client";

import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { RefreshCw } from "lucide-react";
import { getToken } from "../../utils/auth";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";
const PAGE_SIZE = 10;

const ACTION_CONFIG = {
  LOGIN: { label: "Login", color: "#16a34a", bg: "#dcfce7" },
  LOGIN_FAILED: { label: "Login Failed", color: "#dc2626", bg: "#fee2e2" },
  CREATE_USER: { label: "Create User", color: "#2563eb", bg: "#dbeafe" },
  UPDATE_USER: { label: "Update User", color: "#d97706", bg: "#fef3c7" },
  DELETE_USER: { label: "Delete User", color: "#dc2626", bg: "#fee2e2" },
  ACTIVATE_USER: { label: "Activate User", color: "#16a34a", bg: "#dcfce7" },
  DEACTIVATE_USER: {
    label: "Deactivate User",
    color: "#9333ea",
    bg: "#f3e8ff",
  },
};

const ActionBadge = ({ action }) => {
  const cfg = ACTION_CONFIG[action] || {
    label: action,
    color: "#374151",
    bg: "#f3f4f6",
  };
  return (
    <span
      style={{
        fontSize: "10px",
        fontWeight: "700",
        color: cfg.color,
        backgroundColor: cfg.bg,
        border: `1px solid ${cfg.color}`,
        borderRadius: "4px",
        padding: "1px 7px",
        whiteSpace: "nowrap",
      }}
    >
      {cfg.label}
    </span>
  );
};

const ActivityLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [actionFilter, setActionFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const formatDateTime = (dt) => {
    if (!dt) return "-";
    const d = new Date(dt);
    if (isNaN(d.getTime())) return dt;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${day} ${hh}.${mm}`;
  };

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 500 });
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);

      const r = await fetch(`${API_BASE}/api/activity-logs?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await r.json();
      if (!r.ok) {
        alert(data?.error || "Failed to load activity logs");
        return;
      }
      setLogs(Array.isArray(data.data) ? data.data : []);
      setCurrentPage(1);
    } catch {
      alert("Network error, please try again");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      const kw = keyword.toLowerCase();
      const matchKw =
        !keyword ||
        l.emp_name?.toLowerCase().includes(kw) ||
        l.description?.toLowerCase().includes(kw) ||
        l.target_name?.toLowerCase().includes(kw);
      const matchAction = actionFilter === "All" || l.action === actionFilter;
      return matchKw && matchAction;
    });
  }, [logs, keyword, actionFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [keyword, actionFilter]);
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const disabledStyle = { opacity: 0.5, cursor: "not-allowed" };

  const styles = {
    pageContainer: {
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      paddingRight: "24px",
    },
    welcomeCard: {
      backgroundColor: "white",
      borderRadius: "8px",
      boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)",
      border: "1px solid #e5e7eb",
      padding: "32px",
    },
    combinedHeaderFilter: {
      backgroundColor: "white",
      padding: "24px",
      borderRadius: "8px",
      boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)",
      border: "1px solid #e5e7eb",
      marginBottom: "20px",
    },
    headerRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "24px",
    },
    title: { fontSize: "20px", fontWeight: "600", color: "#1f2937", margin: 0 },
    inputGroup: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      flexWrap: "wrap",
    },
    label: { fontSize: "12px", color: "#374151", fontWeight: "500" },
    input: {
      height: "32px",
      border: "2px solid #d1d5db",
      borderRadius: "4px",
      padding: "0 12px",
      fontSize: "12px",
      backgroundColor: "white",
      fontFamily: "inherit",
      minWidth: "120px",
      outline: "none",
    },
    select: {
      height: "32px",
      border: "2px solid #d1d5db",
      borderRadius: "4px",
      padding: "0 8px",
      fontSize: "12px",
      backgroundColor: "#e0e7ff",
      cursor: "pointer",
      fontFamily: "inherit",
      minWidth: "140px",
      outline: "none",
    },
    button: {
      padding: "6px 14px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: "500",
      fontFamily: "inherit",
      backgroundColor: "#2563eb",
      color: "white",
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    tableContainer: {
      marginLeft: "10px",
      borderRadius: "8px",
      backgroundColor: "white",
      boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)",
      border: "1.5px solid #e5e7eb",
      width: "calc(100% - 10px)",
    },
    tableBodyWrapper: {
      overflowX: "auto",
      border: "1.5px solid #9fa8da",
      borderBottom: "none",
    },
    table: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" },
    tableHeader: {
      backgroundColor: "#e0e7ff",
      color: "#374151",
      fontWeight: "600",
      fontSize: "12px",
      textAlign: "center",
    },
    th: {
      padding: "2px 6px",
      borderTop: "1.5px solid #9fa8da",
      borderBottom: "1.5px solid #9fa8da",
      borderRight: "0.5px solid #9fa8da",
      borderLeft: "0.5px solid #9fa8da",
      fontSize: "12px",
      color: "#374151",
      whiteSpace: "nowrap",
      height: "26px",
      lineHeight: "1",
      verticalAlign: "middle",
    },
    td: {
      padding: "2px 6px",
      border: "0.5px solid #9fa8da",
      fontSize: "12px",
      color: "#374151",
      whiteSpace: "nowrap",
      height: "26px",
      lineHeight: "1",
      verticalAlign: "middle",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    tdNo: {
      padding: "2px 4px",
      border: "0.5px solid #9fa8da",
      fontSize: "12px",
      color: "#374151",
      textAlign: "center",
      height: "26px",
      lineHeight: "1",
      verticalAlign: "middle",
      backgroundColor: "#e0e7ff",
    },
    paginationBar: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: "#e0e7ff",
      padding: "8px 16px",
      border: "1.5px solid #9fa8da",
      borderTop: "none",
      borderRadius: "0 0 8px 8px",
      fontSize: "12px",
      color: "#374151",
      height: "20px",
    },
    paginationButton: {
      backgroundColor: "transparent",
      border: "0.5px solid #a5b4fc",
      borderRadius: "4px",
      padding: "4px 8px",
      cursor: "pointer",
      color: "#374151",
      fontSize: "10px",
      fontWeight: "bold",
      fontFamily: "inherit",
    },
    paginationInput: {
      width: "24px",
      height: "20px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      padding: "0 4px",
      fontSize: "10px",
      textAlign: "center",
      fontFamily: "inherit",
    },
  };

  return (
    <div style={styles.pageContainer}>
      <Helmet>
        <title>Management Control | Activity Log</title>
      </Helmet>

      <div style={styles.welcomeCard}>
        <div style={styles.combinedHeaderFilter}>
          <div style={styles.headerRow}>
            <h1 style={styles.title}>Activity Log</h1>
          </div>
          <div style={styles.inputGroup}>
            <span style={styles.label}>Action</span>
            <select
              style={styles.select}
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="All">All Actions</option>
              {Object.entries(ACTION_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.label}
                </option>
              ))}
            </select>

            <span style={styles.label}>Date</span>
            <input
              type="date"
              style={styles.input}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <span style={styles.label}>to</span>
            <input
              type="date"
              style={styles.input}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />

            <input
              type="text"
              style={{ ...styles.input, minWidth: "200px" }}
              placeholder="Search by name or description..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />

            <button
              style={styles.button}
              onClick={loadLogs}
              disabled={loading}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#1d4ed8")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#2563eb")
              }
            >
              <RefreshCw size={13} />
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        <div style={styles.tableContainer}>
          <div style={styles.tableBodyWrapper}>
            <table style={{ ...styles.table, minWidth: "900px" }}>
              <colgroup>
                <col style={{ width: "27px" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "25%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "37%" }} />
              </colgroup>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>No</th>
                  <th style={styles.th}>Date & Time</th>
                  <th style={styles.th}>User</th>
                  <th style={styles.th}>Action</th>
                  <th style={styles.th}>Target</th>
                  <th style={styles.th}>Description</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan="6"
                      style={{
                        ...styles.td,
                        textAlign: "center",
                        color: "#9ca3af",
                      }}
                    >
                      Loading...
                    </td>
                  </tr>
                ) : pageData.length > 0 ? (
                  pageData.map((log, index) => (
                    <tr
                      key={log.id}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#c7cde8")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      <td style={styles.tdNo}>
                        {(currentPage - 1) * PAGE_SIZE + index + 1}
                      </td>
                      <td
                        style={styles.td}
                        title={formatDateTime(log.created_at)}
                      >
                        {formatDateTime(log.created_at)}
                      </td>
                      <td style={styles.td} title={log.emp_name || "-"}>
                        {log.emp_name || "-"}
                      </td>
                      <td style={{ ...styles.td, textAlign: "center" }}>
                        <ActionBadge action={log.action} />
                      </td>
                      <td style={styles.td} title={log.target_name || "-"}>
                        {log.target_name || "-"}
                      </td>
                      <td style={styles.td} title={log.description || "-"}>
                        {log.description || "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="6"
                      style={{
                        ...styles.td,
                        textAlign: "center",
                        color: "#9ca3af",
                      }}
                    >
                      No activity logs found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={styles.paginationBar}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                style={{
                  ...styles.paginationButton,
                  ...(currentPage === 1 ? disabledStyle : {}),
                }}
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                {"<<"}
              </button>
              <button
                style={{
                  ...styles.paginationButton,
                  ...(currentPage === 1 ? disabledStyle : {}),
                }}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                {"<"}
              </button>
              <span>Page</span>
              <input
                type="text"
                value={String(currentPage)}
                onChange={(e) => {
                  const n = parseInt(
                    e.target.value.replace(/\D/g, "") || "1",
                    10,
                  );
                  setCurrentPage(Math.min(Math.max(1, n), totalPages));
                }}
                style={styles.paginationInput}
              />
              <span>of {totalPages}</span>
              <button
                style={{
                  ...styles.paginationButton,
                  ...(currentPage === totalPages ? disabledStyle : {}),
                }}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
              >
                {">"}
              </button>
              <button
                style={{
                  ...styles.paginationButton,
                  ...(currentPage === totalPages ? disabledStyle : {}),
                }}
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                {">>"}
              </button>
            </div>
            <span>Total: {filtered.length} records</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogPage;
