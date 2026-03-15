"use client";

import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Helmet } from "react-helmet";
import { BookOpen, CheckCircle, Clock, Eye, Trash2 } from "lucide-react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const TABS = ["New", "In Progress", "Complete"];

const TABLE_CONFIG = {
  New: {
    cols: ["2.5%", "10%", "9%", "20%", "5%", "5%", "30%", "7%"],
    minWidth: "900px",
  },
  "In Progress": {
   cols: ["2.5%", "10%", "9%", "20%", "5%", "5%", "30%", "7%"],
    minWidth: "900px",
  },
  Complete: {
   cols: ["2.5%", "10%", "9%", "20%", "5%", "5%", "30%", "7%"],
    minWidth: "900px",
  },
};

const getAuthUserLocal = () => {
  try {
    return JSON.parse(sessionStorage.getItem("auth_user") || "null");
  } catch {
    return null;
  }
};

const getToken = () => sessionStorage.getItem("auth_token");

const formatDateTime = (dt) => {
  if (!dt) return "-";
  const d = new Date(dt);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}.${pad(d.getMinutes())}`;
};

const getPageLabel = (value) => {
  const map = {
    "/target-schedule": "Target Schedule",
    "/target-scanning": "Target Scanning",
    "/production-monitoring": "Production Monitoring",
    "/mh-local-schedule": "Local Schedule (MH)",
    "/part-enquiry-non-id": "Request Parts",
    "/stock-overview-mh": "Stock Overview (MH)",
    "/return-parts": "Return Parts",
    "/local-schedule": "Local Schedule",
    "/oversea-schedule": "Oversea Schedule",
    "/storage-inventory": "Storage Inventory",
    "/stock-overview": "Stock Overview",
    "/part-details": "Part Details",
    "/vendor-details": "Vendor Details",
    "/vendor-placement": "Vendor Placement",
    "/receive-request": "Receive Request",
    "/rtv-part": "RTV Control",
    "/qc-local-schedule": "QC Local Schedule",
    "/qc-oversea-schedule": "QC Oversea Schedule",
    "/qc-part": "Quality Parts",
    "/qc-return-parts": "QC Return Parts",
    "/user-control": "Manage User",
    "/user-management": "User List",
  };
  return map[value] || value || "-";
};

const getPhotoUrls = (row) =>
  [row.photo_1, row.photo_2, row.photo_3, row.photo_4].filter(Boolean);

const UserFeedback = ({ sidebarVisible }) => {
  const location = useLocation();
  const empName =
    getAuthUserLocal()?.emp_name || getAuthUserLocal()?.name || null;

  const [activeTab, setActiveTab] = useState(() => {
    // Cek navigation state dulu (dari AdminDashboard), lalu query param
    const stateTab = window.history.state?.usr?.tab;
    const params   = new URLSearchParams(window.location.search);
    const t        = stateTab || params.get("tab") || "New";
    return TABS.includes(t) ? t : "New";
  });
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState(null);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterSearchBy, setFilterSearchBy] = useState("emp_name");
  const [filterKeyword, setFilterKeyword] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [descModal, setDescModal] = useState(null);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(tableData.length / itemsPerPage));
  const getCurrentPageData = () =>
    tableData.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage,
    );

  useEffect(() => {
    // Cek navigation state (dari AdminDashboard)
    const stateTab = location.state?.tab;
    if (stateTab && TABS.includes(stateTab)) {
      setActiveTab(stateTab);
      return;
    }
    // Fallback ke query param
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab") || "New";
    if (TABS.includes(t)) setActiveTab(t);
  }, [location.search, location.state]);

  useEffect(() => {
    fetchData();
    setCurrentPage(1);
  }, [activeTab]);

  const showToast = (msg, type = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE}/user-feedbacks?status=${encodeURIComponent(activeTab)}`;
      if (filterDateFrom) url += `&date_from=${filterDateFrom}`;
      if (filterDateTo) url += `&date_to=${filterDateTo}`;
      if (filterKeyword.trim())
        url += `&${filterSearchBy}=${encodeURIComponent(filterKeyword.trim())}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const result = await res.json();
      if (result.ok || Array.isArray(result.data)) {
        setTableData(result.data || []);
      } else {
        showToast(result.error || "Gagal mengambil data", "error");
      }
    } catch (err) {
      showToast("Error: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.pushState({}, "", url.toString());
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchData();
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/user-feedbacks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const result = await res.json();
      if (result.ok) {
        showToast("Feedback berhasil dihapus");
        fetchData();
      } else {
        showToast(result.error || "Gagal menghapus", "error");
      }
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/user-feedbacks/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ status: newStatus, updated_by: empName }),
      });
      const result = await res.json();
      if (result.ok) {
        fetchData();
      } else {
        showToast(result.error || "Gagal update status", "error");
      }
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  };

  const optionStyle = {
    backgroundColor: "#d1d5db",
    color: "#374151",
    fontSize: "12px",
    padding: "4px 8px",
  };

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
    filterRow: {
      display: "grid",
      alignItems: "center",
      gap: "12px",
      marginBottom: "16px",
    },
    inputGroup: { display: "flex", alignItems: "center", gap: "8px" },
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
      minWidth: "120px",
      outline: "none",
    },
    button: {
      padding: "8px 16px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: "500",
      fontFamily: "inherit",
      backgroundColor: "#2563eb",
      color: "white",
      display: "flex",
      gap: "8px",
    },
    tabsContainer: {
      display: "flex",
      borderBottom: "2px solid #e5e7eb",
      marginBottom: "16px",
    },
    tabButton: {
      padding: "10px 18px",
      backgroundColor: "transparent",
      border: "none",
      borderBottom: "2px solid transparent",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: "500",
      color: "#6b7280",
      transition: "all 0.2s ease",
      fontFamily: "inherit",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      marginBottom: "-2px",
    },
    tabButtonActive: {
      color: "#2563eb",
      borderBottom: "2px solid #2563eb",
      fontWeight: "600",
    },
    tableContainer: {
      marginBottom: "2px",
      marginLeft: "10px",
      borderRadius: "8px",
      backgroundColor: "white",
      boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)",
      border: "1.5px solid #e5e7eb",
      overflowX: "auto",
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
    tableRow: { transition: "background-color 0.15s ease" },
    expandedTh: {
      padding: "2px 4px",
      borderTop: "1.5px solid #9fa8da",
      borderBottom: "1.5px solid #9fa8da",
      borderRight: "0.5px solid #9fa8da",
      borderLeft: "0.5px solid #9fa8da",
      fontSize: "12px",
      color: "#374151",
      whiteSpace: "nowrap",
      height: "25px",
      lineHeight: "1",
      verticalAlign: "middle",
      overflow: "hidden",
    },
    thWithLeftBorder: {
      padding: "2px 4px",
      borderTop: "1.5px solid #9fa8da",
      borderBottom: "1.5px solid #9fa8da",
      borderRight: "0.5px solid #9fa8da",
      borderLeft: "0.5px solid #9fa8da",
      fontSize: "12px",
      color: "#374151",
      whiteSpace: "nowrap",
      height: "25px",
      lineHeight: "1",
      verticalAlign: "middle",
      overflow: "hidden",
    },
    tdWithLeftBorder: {
      padding: "2px 4px",
      border: "0.5px solid #9fa8da",
      fontSize: "12px",
      color: "#374151",
      whiteSpace: "nowrap",
      height: "25px",
      lineHeight: "1",
      verticalAlign: "middle",
      overflow: "hidden",
    },
    tdCenter: {
      padding: "2px 4px",
      border: "0.5px solid #9fa8da",
      fontSize: "12px",
      color: "#374151",
      whiteSpace: "nowrap",
      height: "25px",
      lineHeight: "1",
      verticalAlign: "middle",
      overflow: "hidden",
      textAlign: "center",
    },
    rowNumberTd: {
      padding: "0",
      border: "0.5px solid #9fa8da",
      fontSize: "12px",
      color: "#374151",
      whiteSpace: "nowrap",
      height: "25px",
      lineHeight: "1",
      verticalAlign: "middle",
      overflow: "hidden",
      textAlign: "center",
      backgroundColor: "#e0e7ff",
    },
    ellipsis: {
      display: "block",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    noDataText: { color: "#9ca3af" },
    loadingTd: {
      border: "0.5px solid #9fa8da",
      fontSize: "12px",
      color: "#6b7280",
      textAlign: "center",
      padding: "20px",
      verticalAlign: "middle",
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
    paginationControls: { display: "flex", alignItems: "center", gap: "8px" },
    paginationButton: {
      backgroundColor: "transparent",
      border: "0.5px solid #a5b4fc",
      borderRadius: "4px",
      padding: "4px 8px",
      cursor: "pointer",
      color: "#374151",
      fontSize: "10px",
      fontWeight: "1000",
      transition: "background-color 0.2s ease",
      fontFamily: "inherit",
    },
    paginationInput: {
      width: "20px",
      height: "20px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      padding: "0 8px",
      fontSize: "10px",
      textAlign: "center",
      fontFamily: "inherit",
    },
    actionButton: {
      backgroundColor: "#e0e7ff",
      color: "black",
      border: "1px solid #a5b4fc",
      borderRadius: "4px",
      padding: "4px 8px",
      cursor: "pointer",
      fontSize: "10px",
      display: "inline-flex",
      alignItems: "center",
      gap: "3px",
      fontFamily: "inherit",
    },
    deleteButton: {
      backgroundColor: "#e0e7ff",
      color: "black",
      border: "1px solid #a5b4fc",
      borderRadius: "4px",
      padding: "4px 8px",
      cursor: "pointer",
      fontSize: "10px",
      display: "inline-flex",
      alignItems: "center",
      gap: "3px",
      fontFamily: "inherit",
    },

    descButton: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#4b5563",
      padding: "2px",
      display: "inline-flex",
      alignItems: "center",
    },
    statusBadge: {
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: "10px",
      fontSize: "10px",
      fontWeight: "600",
    },
    toastBase: {
      position: "fixed",
      top: "20px",
      right: "20px",
      padding: "12px 20px",
      borderRadius: "6px",
      color: "white",
      zIndex: 10000,
      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
      fontSize: "12px",
    },
    modalOverlay: {
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    modalContainer: {
      backgroundColor: "white",
      borderRadius: "10px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
      width: "460px",
      maxWidth: "90vw",
      maxHeight: "80vh",
      display: "flex",
      flexDirection: "column",
      padding: "20px",
      fontFamily: "inherit",
    },
    modalHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "14px",
    },
    modalTitle: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "13px",
      fontWeight: "700",
      color: "#111827",
    },
    modalCloseButton: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#6b7280",
      fontSize: "16px",
      lineHeight: 1,
      display: "flex",
      alignItems: "center",
    },
    modalBody: {
      fontSize: "12px",
      color: "#374151",
      backgroundColor: "#f9fafb",
      borderRadius: "6px",
      padding: "12px 14px",
      lineHeight: "1.7",
      border: "1px solid #e5e7eb",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      overflowY: "auto",
      flex: 1,
    },
    lightboxOverlay: {
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(0,0,0,0.85)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    lightboxInner: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      maxWidth: "90vw",
      maxHeight: "90vh",
    },
    lightboxImageWrapper: {
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "zoom-in",
      maxWidth: "80vw",
      maxHeight: "80vh",
    },
    lightboxImage: {
      maxWidth: "80vw",
      maxHeight: "80vh",
      objectFit: "contain",
      borderRadius: "6px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    },
    lightboxArrowLeft: {
      position: "absolute",
      left: "-48px",
      background: "rgba(255,255,255,0.15)",
      border: "none",
      borderRadius: "50%",
      width: "38px",
      height: "38px",
      color: "white",
      fontSize: "18px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    lightboxArrowRight: {
      position: "absolute",
      right: "-48px",
      background: "rgba(255,255,255,0.15)",
      border: "none",
      borderRadius: "50%",
      width: "38px",
      height: "38px",
      color: "white",
      fontSize: "18px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    lightboxCloseButton: {
      position: "absolute",
      top: "-36px",
      right: "-36px",
      background: "rgba(255,255,255,0.15)",
      border: "none",
      borderRadius: "50%",
      width: "30px",
      height: "30px",
      color: "white",
      fontSize: "16px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    lightboxCounter: {
      position: "absolute",
      bottom: "-28px",
      left: "50%",
      transform: "translateX(-50%)",
      color: "white",
      fontSize: "12px",
      opacity: 0.8,
    },
  };

  const loadingRow = (colSpan) => (
    <tr>
      <td colSpan={colSpan} style={styles.loadingTd}>
        Loading...
      </td>
    </tr>
  );

  const trProps = {
    style: styles.tableRow,
    onMouseEnter: (e) => {
      e.currentTarget.style.backgroundColor = "#c7cde8";
    },
    onMouseLeave: (e) => {
      e.currentTarget.style.backgroundColor = "";
    },
  };

  const renderStatusBadge = (status) => {
    const color =
      status === "New"
        ? { bg: "#fee2e2", text: "#991b1b" }
        : status === "In Progress"
          ? { bg: "#fef9c3", text: "#854d0e" }
          : { bg: "#dcfce7", text: "#166534" };
    return (
      <span
        style={{
          ...styles.statusBadge,
          backgroundColor: color.bg,
          color: color.text,
        }}
      >
        {status}
      </span>
    );
  };

  const renderTabNew = () => {
    const cfg = TABLE_CONFIG["New"];
    const pageData = getCurrentPageData();
    return (
      <div style={styles.tableContainer}>
        <div style={styles.tableBodyWrapper}>
          <table style={{ ...styles.table, minWidth: cfg.minWidth }}>
            <colgroup>
              {cfg.cols.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.expandedTh}>No</th>
                <th style={styles.thWithLeftBorder}>Employee ID</th>
                <th style={styles.thWithLeftBorder}>Department</th>
                <th style={styles.thWithLeftBorder}>Page Location</th>
                <th style={styles.thWithLeftBorder}>Desc</th>
                <th style={styles.thWithLeftBorder}>Photos</th>
                <th style={styles.thWithLeftBorder}>Request By</th>
                <th style={styles.thWithLeftBorder}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? loadingRow(8)
                : pageData.map((row, index) => {
                    const photos = getPhotoUrls(row);
                    const rowNum = (currentPage - 1) * itemsPerPage + index + 1;
                    return (
                      <tr key={row.id} {...trProps}>
                        <td style={styles.rowNumberTd}>{rowNum}</td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={row.emp_id || "-"}
                        >
                          {row.emp_id || "-"}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={row.department || "-"}
                        >
                          {row.department || "-"}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={getPageLabel(row.problem_location)}
                        >
                          {getPageLabel(row.problem_location)}
                        </td>
                        <td style={styles.tdCenter}>
                          {row.description ? (
                            <button
                              style={styles.descButton}
                              onClick={() => setDescModal(row.description)}
                              title="View description"
                            >
                              <BookOpen size={14} />
                            </button>
                          ) : (
                            <span style={styles.noDataText}>-</span>
                          )}
                        </td>
                        <td style={styles.tdCenter}>
                          {photos.length > 0 ? (
                            <button
                              style={styles.descButton}
                              onClick={() => {
                                setLightbox(photos);
                                setLightboxIndex(0);
                                setLightboxZoom(1);
                              }}
                              title="View photos"
                            >
                              <Eye size={14} />
                            </button>
                          ) : (
                            <span style={styles.noDataText}>-</span>
                          )}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={
                            row.emp_name
                              ? `${row.emp_name} | ${formatDateTime(row.submitted_at)}`
                              : "-"
                          }
                        >
                          {row.emp_name
                            ? `${row.emp_name} | ${formatDateTime(row.submitted_at)}`
                            : "-"}
                        </td>
                        <td style={styles.tdCenter}>
                          <div
                            style={{
                              display: "flex",
                              gap: "4px",
                              justifyContent: "center",
                            }}
                          >
                            <button
                              style={styles.actionButton}
                              title="Move to In Progress"
                              onClick={() =>
                                handleStatusUpdate(row.id, "In Progress")
                              }
                            >
                              <Clock size={10} />
                            </button>
                            <button
                              style={styles.deleteButton}
                              title="Delete"
                              onClick={() => handleDelete(row.id)}
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
        <div style={styles.paginationBar}>
          <div style={styles.paginationControls}>
            <button
              style={styles.paginationButton}
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            >
              {"<<"}
            </button>
            <button
              style={styles.paginationButton}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              {"<"}
            </button>
            <span>Page</span>
            <input
              type="text"
              style={styles.paginationInput}
              value={currentPage}
              onChange={(e) => {
                const p = parseInt(e.target.value);
                if (!isNaN(p)) handlePageChange(p);
              }}
            />
            <span>of {totalPages}</span>
            <button
              style={styles.paginationButton}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              {">"}
            </button>
            <button
              style={styles.paginationButton}
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
            >
              {">>"}
            </button>
          </div>
          <span>Total Row: {tableData.length}</span>
        </div>
      </div>
    );
  };

  const renderTabInProgress = () => {
    const cfg = TABLE_CONFIG["In Progress"];
    const pageData = getCurrentPageData();
    return (
      <div style={styles.tableContainer}>
        <div style={styles.tableBodyWrapper}>
          <table style={{ ...styles.table, minWidth: cfg.minWidth }}>
            <colgroup>
              {cfg.cols.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.expandedTh}>No</th>
                <th style={styles.thWithLeftBorder}>Employee ID</th>
                <th style={styles.thWithLeftBorder}>Department</th>
                <th style={styles.thWithLeftBorder}>Page Location</th>
                <th style={styles.thWithLeftBorder}>Desc</th>
                <th style={styles.thWithLeftBorder}>Photos</th>
                <th style={styles.thWithLeftBorder}>Request By</th>
                <th style={styles.thWithLeftBorder}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? loadingRow(8)
                : pageData.map((row, index) => {
                    const photos = getPhotoUrls(row);
                    const rowNum = (currentPage - 1) * itemsPerPage + index + 1;
                    return (
                      <tr key={row.id} {...trProps}>
                        <td style={styles.rowNumberTd}>{rowNum}</td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={row.emp_id || "-"}
                        >
                          {row.emp_id || "-"}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={row.department || "-"}
                        >
                          {row.department || "-"}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={getPageLabel(row.problem_location)}
                        >
                          {getPageLabel(row.problem_location)}
                        </td>
                        <td style={styles.tdCenter}>
                          {row.description ? (
                            <button
                              style={styles.descButton}
                              onClick={() => setDescModal(row.description)}
                              title="View description"
                            >
                              <BookOpen size={14} />
                            </button>
                          ) : (
                            <span style={styles.noDataText}>-</span>
                          )}
                        </td>
                        <td style={styles.tdCenter}>
                          {photos.length > 0 ? (
                            <button
                              style={styles.descButton}
                              onClick={() => {
                                setLightbox(photos);
                                setLightboxIndex(0);
                                setLightboxZoom(1);
                              }}
                              title="View photos"
                            >
                              <Eye size={14} />
                            </button>
                          ) : (
                            <span style={styles.noDataText}>-</span>
                          )}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={
                            row.emp_name
                              ? `${row.emp_name} | ${formatDateTime(row.submitted_at)}`
                              : "-"
                          }
                        >
                          {row.emp_name
                            ? `${row.emp_name} | ${formatDateTime(row.submitted_at)}`
                            : "-"}
                        </td>
                        <td style={styles.tdCenter}>
                          <div
                            style={{
                              display: "flex",
                              gap: "4px",
                              justifyContent: "center",
                            }}
                          >
                            <button
                              style={styles.actionButton}
                              title="Mark as Complete"
                              onClick={() =>
                                handleStatusUpdate(row.id, "Complete")
                              }
                            >
                              <CheckCircle size={10} />
                            </button>
                            <button
                              style={styles.deleteButton}
                              title="Delete"
                              onClick={() => handleDelete(row.id)}
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
        <div style={styles.paginationBar}>
          <div style={styles.paginationControls}>
            <button
              style={styles.paginationButton}
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            >
              {"<<"}
            </button>
            <button
              style={styles.paginationButton}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              {"<"}
            </button>
            <span>Page</span>
            <input
              type="text"
              style={styles.paginationInput}
              value={currentPage}
              onChange={(e) => {
                const p = parseInt(e.target.value);
                if (!isNaN(p)) handlePageChange(p);
              }}
            />
            <span>of {totalPages}</span>
            <button
              style={styles.paginationButton}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              {">"}
            </button>
            <button
              style={styles.paginationButton}
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
            >
              {">>"}
            </button>
          </div>
          <span>Total Row: {tableData.length}</span>
        </div>
      </div>
    );
  };

  const renderTabComplete = () => {
    const cfg = TABLE_CONFIG["Complete"];
    const pageData = getCurrentPageData();
    return (
      <div style={styles.tableContainer}>
        <div style={styles.tableBodyWrapper}>
          <table style={{ ...styles.table, minWidth: cfg.minWidth }}>
            <colgroup>
              {cfg.cols.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.expandedTh}>No</th>
                <th style={styles.thWithLeftBorder}>Employee ID</th>
                <th style={styles.thWithLeftBorder}>Department</th>
                <th style={styles.thWithLeftBorder}>Page Location</th>
                <th style={styles.thWithLeftBorder}>Desc</th>
                <th style={styles.thWithLeftBorder}>Photos</th>
                <th style={styles.thWithLeftBorder}>Request By</th>
                <th style={styles.thWithLeftBorder}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? loadingRow(8)
                : pageData.map((row, index) => {
                    const photos = getPhotoUrls(row);
                    const rowNum = (currentPage - 1) * itemsPerPage + index + 1;
                    return (
                      <tr key={row.id} {...trProps}>
                        <td style={styles.rowNumberTd}>{rowNum}</td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={row.emp_id || "-"}
                        >
                          {row.emp_id || "-"}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={row.department || "-"}
                        >
                          {row.department || "-"}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={getPageLabel(row.problem_location)}
                        >
                          {getPageLabel(row.problem_location)}
                        </td>
                        <td style={styles.tdCenter}>
                          {row.description ? (
                            <button
                              style={styles.descButton}
                              onClick={() => setDescModal(row.description)}
                              title="View description"
                            >
                              <BookOpen size={14} />
                            </button>
                          ) : (
                            <span style={styles.noDataText}>-</span>
                          )}
                        </td>
                        <td style={styles.tdCenter}>
                          {photos.length > 0 ? (
                            <button
                              style={styles.descButton}
                              onClick={() => {
                                setLightbox(photos);
                                setLightboxIndex(0);
                                setLightboxZoom(1);
                              }}
                              title="View photos"
                            >
                              <Eye size={14} />
                            </button>
                          ) : (
                            <span style={styles.noDataText}>-</span>
                          )}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={
                            row.emp_name
                              ? `${row.emp_name} | ${formatDateTime(row.submitted_at)}`
                              : "-"
                          }
                        >
                          {row.emp_name
                            ? `${row.emp_name} | ${formatDateTime(row.submitted_at)}`
                            : "-"}
                        </td>
                        <td style={styles.tdCenter}>
                          <button
                            style={styles.deleteButton}
                            title="Delete"
                            onClick={() => handleDelete(row.id)}
                          >
                            <Trash2 size={10} />
                          </button>
                        </td>
                      
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
        <div style={styles.paginationBar}>
          <div style={styles.paginationControls}>
            <button
              style={styles.paginationButton}
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            >
              {"<<"}
            </button>
            <button
              style={styles.paginationButton}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              {"<"}
            </button>
            <span>Page</span>
            <input
              type="text"
              style={styles.paginationInput}
              value={currentPage}
              onChange={(e) => {
                const p = parseInt(e.target.value);
                if (!isNaN(p)) handlePageChange(p);
              }}
            />
            <span>of {totalPages}</span>
            <button
              style={styles.paginationButton}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              {">"}
            </button>
            <button
              style={styles.paginationButton}
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
            >
              {">>"}
            </button>
          </div>
          <span>Total Row: {tableData.length}</span>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.pageContainer}>
      <Helmet>
        <title>User Feedback</title>
      </Helmet>

      {toastMessage && (
        <div
          style={{
            ...styles.toastBase,
            backgroundColor: toastType === "success" ? "#22c55e" : "#ef4444",
          }}
        >
          {toastMessage}
        </div>
      )}

      {descModal && (
        <div style={styles.modalOverlay} onClick={() => setDescModal(null)}>
          <div
            style={styles.modalContainer}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>
                <BookOpen size={15} />
                Description
              </div>
              <button
                style={styles.modalCloseButton}
                onClick={() => setDescModal(null)}
              >
                &#x2715;
              </button>
            </div>
            <div style={styles.modalBody}>{descModal}</div>
          </div>
        </div>
      )}

      {lightbox && (
        <div style={styles.lightboxOverlay} onClick={() => setLightbox(null)}>
          <div
            style={styles.lightboxInner}
            onClick={(e) => e.stopPropagation()}
          >
            {lightbox.length > 1 && (
              <button
                style={styles.lightboxArrowLeft}
                onClick={() => {
                  setLightboxIndex(
                    (lightboxIndex - 1 + lightbox.length) % lightbox.length,
                  );
                  setLightboxZoom(1);
                }}
              >
                &#8249;
              </button>
            )}
            <div
              style={styles.lightboxImageWrapper}
              onWheel={(e) => {
                e.preventDefault();
                setLightboxZoom((z) =>
                  Math.min(5, Math.max(0.5, z - e.deltaY * 0.001)),
                );
              }}
            >
              <img
                src={lightbox[lightboxIndex]}
                alt={`photo-${lightboxIndex + 1}`}
                style={{
                  ...styles.lightboxImage,
                  transform: `scale(${lightboxZoom})`,
                  transition: "transform 0.1s ease",
                }}
              />
            </div>
            {lightbox.length > 1 && (
              <button
                style={styles.lightboxArrowRight}
                onClick={() => {
                  setLightboxIndex((lightboxIndex + 1) % lightbox.length);
                  setLightboxZoom(1);
                }}
              >
                &#8250;
              </button>
            )}
            <button
              style={styles.lightboxCloseButton}
              onClick={() => setLightbox(null)}
            >
              &#x2715;
            </button>
            {lightbox.length > 1 && (
              <div style={styles.lightboxCounter}>
                {lightboxIndex + 1} / {lightbox.length}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={styles.welcomeCard}>
        <div style={styles.combinedHeaderFilter}>
          <div style={styles.headerRow}>
            <h1 style={styles.title}>User Feedback</h1>
          </div>
          <div style={styles.filterRow}>
            <div style={styles.inputGroup}>
              <span style={styles.label}>Date Filter</span>
              <input
                type="date"
                style={styles.input}
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
              />
              <span style={styles.label}>To</span>
              <input
                type="date"
                style={styles.input}
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
              />
            </div>
            <div style={styles.inputGroup}>
              <span style={styles.label}>Search By</span>
              <select
                style={styles.select}
                value={filterSearchBy}
                onChange={(e) => setFilterSearchBy(e.target.value)}
              >
                <option style={optionStyle} value="emp_name">
                  Name
                </option>
                <option style={optionStyle} value="emp_id">
                  Emp ID
                </option>
                <option style={optionStyle} value="department">
                  Department
                </option>
              </select>
              <input
                type="text"
                style={styles.input}
                placeholder="Input Keyword"
                value={filterKeyword}
                onChange={(e) => setFilterKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
              />
              <button style={styles.button} onClick={handleSearch}>
                Search
              </button>
            </div>
          </div>
        </div>
        <div style={styles.tabsContainer}>
          {TABS.map((tab) => (
            <button
              key={tab}
              style={{
                ...styles.tabButton,
                ...(activeTab === tab ? styles.tabButtonActive : {}),
              }}
              onClick={() => handleTabChange(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        {activeTab === "New" && renderTabNew()}
        {activeTab === "In Progress" && renderTabInProgress()}
        {activeTab === "Complete" && renderTabComplete()}
      </div>
    </div>
  );
};

export default UserFeedback;