"use client";

import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Check, Truck, PackageCheck, BadgeCheck } from "lucide-react";
import { Helmet } from "react-helmet";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const getAuthUserLocal = () => {
  try {
    return JSON.parse(sessionStorage.getItem("auth_user") || "null");
  } catch {
    return null;
  }
};

const TABS = [
  "Waiting LOG",
  "Received LOG",
  "RTV Progress",
  "Stock Replaced",
  "Complete",
];

const RTVPartPage = ({ sidebarVisible }) => {
  const location = useLocation();
  const empName =
    getAuthUserLocal()?.emp_name || getAuthUserLocal()?.name || null;

  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab") || "Waiting LOG";
    return TABS.includes(t) ? t : "Waiting LOG";
  });
  const [tableData, setTableData] = useState([]);
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState(null);

  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterSearchBy, setFilterSearchBy] = useState("part_code");
  const [filterKeyword, setFilterKeyword] = useState("");

  const [remarks, setRemarks] = useState({});

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(tableData.length / itemsPerPage));
  const getCurrentPageData = () =>
    tableData.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage,
    );

  const tableConfig = {
    "Waiting LOG": {
      cols: ["2.8%", "10%", "18%", "7%", "20%", "7%", "7%", "20%", "28%", "7%"],
      minWidth: "1080px",
    },
    "Received LOG": {
      cols: ["2.8%", "10%", "18%", "7%", "20%", "7%", "7%", "20%", "28%", "7%"],
      minWidth: "1080px",
    },
    "RTV Progress": {
      cols: ["2.8%", "10%", "18%", "7%", "20%", "7%", "7%", "20%", "28%", "7%"],
      minWidth: "1080px",
    },
    "Stock Replaced": {
      cols: [
        "3%",
        "12%",
        "15%",
        "20%",
        "8%",
        "20%",
        "8%",
        "8%",
        "20%",
        "25%",
        "7%",
      ],
      minWidth: "1140px",
    },
    Complete: {
      cols: [
        "2.7%",
        "10%",
        "13%",
        "20%",
        "8%",
        "20%",
        "8%",
        "8%",
        "20%",
        "31%",
      ],
      minWidth: "1140px",
    },
  };

  const showToast = (msg, type = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const formatBy = (name, datetime) => {
    if (!name) return "-";
    return `${name} | ${datetime || "-"}`;
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab") || "Waiting LOG";
    if (TABS.includes(t)) setActiveTab(t);
  }, [location.search]);

  useEffect(() => {
    setFilterSearchBy("part_code");
    setFilterKeyword("");
    setFilterDateFrom("");
    setFilterDateTo("");
    fetchData();
    setCurrentPage(1);
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE}/api/rtv-parts?status=${encodeURIComponent(activeTab)}`;
      if (filterDateFrom) url += `&date_from=${filterDateFrom}`;
      if (filterDateTo) url += `&date_to=${filterDateTo}`;
      const res = await fetch(url);
      const result = await res.json();
      if (result.success) {
        const data = result.data;
        setRawData(data);
        if (filterKeyword.trim()) {
          const kw = filterKeyword.trim().toLowerCase();
          setTableData(
            data.filter((r) =>
              (r[filterSearchBy] || "").toLowerCase().includes(kw),
            ),
          );
        } else {
          setTableData(data);
        }
        const rem = {};
        data.forEach((row) => {
          rem[row.id] = row.remark || "";
        });
        setRemarks(rem);
      } else {
        showToast(result.message || "Gagal mengambil data", "error");
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

  const handleTabClick = (tab) => {
    if (activeTab === tab) {
      fetchData();
    } else {
      handleTabChange(tab);
    }
  };

  const handleRemarkChange = (id, value) => {
    setRemarks((prev) => ({ ...prev, [id]: value }));
  };

  const handleRemarkSave = async (id) => {
    try {
      await fetch(`${API_BASE}/api/rtv-parts/${id}/remark`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remark: remarks[id] || "" }),
      });
    } catch (err) {
      console.error("Remark save error:", err);
    }
  };

  const callAction = async (id, endpoint, bodyKey, targetTab) => {
    try {
      const res = await fetch(`${API_BASE}/api/rtv-parts/${id}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [bodyKey]: empName }),
      });
      const result = await res.json();
      if (result.success) {
        handleTabChange(targetTab);
      } else {
        showToast(result.message || "Gagal", "error");
      }
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  };

  const handleReceive = (id) =>
    callAction(id, "receive", "received_by_name", "Received LOG");
  const handleProgress = (id) =>
    callAction(id, "progress", "progress_by_name", "RTV Progress");
  const handleReplace = (id) =>
    callAction(id, "replace", "replaced_by_name", "Stock Replaced");
  const handleComplete = (id) =>
    callAction(id, "complete", "complete_by_name", "Complete");

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
    expandedTd: {
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
    expandedWithLeftBorder: {
      border: "0.5px solid #9fa8da",
      whiteSpace: "nowrap",
      backgroundColor: "#e0e7ff",
    },
    emptyColumn: {
      width: "auto",
      minWidth: "auto",
      maxWidth: "auto",
      padding: "0",
      textAlign: "center",
    },
    remarkReadonly: {
      display: "block",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    remarkInput: {
      width: "95%",
      padding: "1px 4px",
      fontSize: "12px",
      border: "1px solid #d1d5db",
      borderRadius: "3px",
      fontFamily: "inherit",
      outline: "none",
      backgroundColor: "white",
      height: "20px",
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

    receivedButton: {
      backgroundColor: "#e0e7ff",
      color: "black",
      border: "none",
      borderRadius: "4px",
      padding: "4px 8px",
      cursor: "pointer",
      fontSize: "10px",
      display: "flex",
      alignItems: "center",
    },
    progressButton: {
      backgroundColor: "#e0e7ff",
      color: "black",
      border: "none",
      borderRadius: "4px",
      padding: "4px 8px",
      cursor: "pointer",
      fontSize: "10px",
      display: "flex",
      alignItems: "center",
    },
    replaceButton: {
      backgroundColor: "#e0e7ff",
      color: "black",
      border: "none",
      borderRadius: "4px",
      padding: "4px 8px",
      cursor: "pointer",
      fontSize: "10px",
      display: "flex",
      alignItems: "center",
    },
    completeButton: {
      backgroundColor: "#e0e7ff",
      color: "black",
      border: "none",
      borderRadius: "4px",
      padding: "4px 8px",
      cursor: "pointer",
      fontSize: "10px",
      display: "flex",
      alignItems: "center",
    },
  };

  const trProps = {
    onMouseEnter: (e) =>
      (e.target.closest("tr").style.backgroundColor = "#c7cde8"),
    onMouseLeave: (e) =>
      (e.target.closest("tr").style.backgroundColor = "transparent"),
  };

  const emptyRow = (colSpan) => (
    <tr>
      <td colSpan={colSpan} />
    </tr>
  );

  const loadingRow = (colSpan) => (
    <tr>
      <td
        colSpan={colSpan}
        style={{
          ...styles.tdWithLeftBorder,
          textAlign: "center",
          padding: "20px",
        }}
      >
        Loading...
      </td>
    </tr>
  );

  const renderPagination = () => (
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
          value={currentPage}
          style={styles.paginationInput}
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
      <span style={{ fontSize: "12px", color: "#374151" }}>
        Total Row: {tableData.length}
      </span>
    </div>
  );

  const renderBaseRow = (row, index, skipRemark = false) => {
    const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
    return (
      <>
        <td
          style={{
            ...styles.expandedTd,
            ...styles.expandedWithLeftBorder,
            ...styles.emptyColumn,
          }}
        >
          {globalIndex}
        </td>
        <td style={styles.tdWithLeftBorder} title={row.part_code}>
          {row.part_code}
        </td>
        <td style={styles.tdWithLeftBorder} title={row.part_name}>
          {row.part_name}
        </td>
        <td style={styles.tdWithLeftBorder} title={row.model || "-"}>
          {row.model || "-"}
        </td>
        <td style={styles.tdWithLeftBorder} title={row.vendor_name || "-"}>
          {row.vendor_name || "-"}
        </td>
        <td style={styles.tdWithLeftBorder} title={row.vendor_type || "-"}>
          {row.vendor_type || "-"}
        </td>
        <td style={styles.tdWithLeftBorder} title={String(row.qty_return)}>
          {row.qty_return}
        </td>
        {!skipRemark && (
          <td style={styles.tdWithLeftBorder} title={row.remark || "-"}>
            <span style={styles.remarkReadonly}>{row.remark || "-"}</span>
          </td>
        )}
      </>
    );
  };

  const renderWaitingTab = () => {
    const pageData = getCurrentPageData();
    const cfg = tableConfig["Waiting LOG"];
    return (
      <div style={styles.tableContainer}>
        <div style={styles.tableBodyWrapper}>
          <table
            style={{
              ...styles.table,
              minWidth: cfg.minWidth,
              tableLayout: "fixed",
            }}
          >
            <colgroup>
              {cfg.cols.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.expandedTh}>No</th>
                <th style={styles.thWithLeftBorder}>Part Code</th>
                <th style={styles.thWithLeftBorder}>Part Name</th>
                <th style={styles.thWithLeftBorder}>Model</th>
                <th style={styles.thWithLeftBorder}>Vendor</th>
                <th style={styles.thWithLeftBorder}>Types</th>
                <th style={styles.thWithLeftBorder}>Qty</th>
                <th style={styles.thWithLeftBorder}>Remark</th>
                <th style={styles.thWithLeftBorder}>RTV By</th>
                <th style={styles.thWithLeftBorder}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? loadingRow(10)
                : pageData.length === 0
                  ? emptyRow(10)
                  : pageData.map((row, index) => (
                      <tr key={row.id} {...trProps}>
                        {renderBaseRow(row, index)}
                        <td
                          style={styles.tdWithLeftBorder}
                          title={formatBy(row.rtv_by_name, row.rtv_at)}
                        >
                          {formatBy(row.rtv_by_name, row.rtv_at)}
                        </td>
                        <td
                          style={{
                            ...styles.tdWithLeftBorder,
                            display: "flex",
                            gap: "3px",
                            alignItems: "center",
                            height: "25px",
                          }}
                        >
                          <button
                            style={styles.receivedButton}
                            title="Move to Received LOG"
                            onClick={() => handleReceive(row.id)}
                          >
                            <Check size={10} />
                          </button>
                        </td>
                      </tr>
                    ))}
            </tbody>
          </table>
        </div>
        {renderPagination()}
      </div>
    );
  };

  const renderReceivedTab = () => {
    const pageData = getCurrentPageData();
    const cfg = tableConfig["Received LOG"];
    return (
      <div style={styles.tableContainer}>
        <div style={styles.tableBodyWrapper}>
          <table
            style={{
              ...styles.table,
              minWidth: cfg.minWidth,
              tableLayout: "fixed",
            }}
          >
            <colgroup>
              {cfg.cols.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.expandedTh}>No</th>
                <th style={styles.thWithLeftBorder}>Part Code</th>
                <th style={styles.thWithLeftBorder}>Part Name</th>
                <th style={styles.thWithLeftBorder}>Model</th>
                <th style={styles.thWithLeftBorder}>Vendor</th>
                <th style={styles.thWithLeftBorder}>Types</th>
                <th style={styles.thWithLeftBorder}>Qty</th>
                <th style={styles.thWithLeftBorder}>Remark</th>
                <th style={styles.thWithLeftBorder}>Received By</th>
                <th style={styles.thWithLeftBorder}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? loadingRow(10)
                : pageData.length === 0
                  ? emptyRow(10)
                  : pageData.map((row, index) => (
                      <tr key={row.id} {...trProps}>
                        {renderBaseRow(row, index, true)}
                        <td style={styles.tdWithLeftBorder}>
                          <input
                            type="text"
                            value={remarks[row.id] ?? row.remark ?? ""}
                            onChange={(e) =>
                              handleRemarkChange(row.id, e.target.value)
                            }
                            onBlur={() => handleRemarkSave(row.id)}
                            placeholder="Enter remark..."
                            style={styles.remarkInput}
                          />
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={formatBy(
                            row.received_by_name,
                            row.received_at,
                          )}
                        >
                          {formatBy(row.received_by_name, row.received_at)}
                        </td>
                        <td
                          style={{
                            ...styles.tdWithLeftBorder,
                            display: "flex",
                            gap: "3px",
                            alignItems: "center",
                            height: "25px",
                          }}
                        >
                          <button
                            style={styles.progressButton}
                            title="Move to RTV Progress"
                            onClick={() => handleProgress(row.id)}
                          >
                            <Truck size={10} />
                          </button>
                        </td>
                      </tr>
                    ))}
            </tbody>
          </table>
        </div>
        {renderPagination()}
      </div>
    );
  };

  const renderProgressTab = () => {
    const pageData = getCurrentPageData();
    const cfg = tableConfig["RTV Progress"];
    return (
      <div style={styles.tableContainer}>
        <div style={styles.tableBodyWrapper}>
          <table
            style={{
              ...styles.table,
              minWidth: cfg.minWidth,
              tableLayout: "fixed",
            }}
          >
            <colgroup>
              {cfg.cols.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.expandedTh}>No</th>
                <th style={styles.thWithLeftBorder}>Part Code</th>
                <th style={styles.thWithLeftBorder}>Part Name</th>
                <th style={styles.thWithLeftBorder}>Model</th>
                <th style={styles.thWithLeftBorder}>Vendor</th>
                <th style={styles.thWithLeftBorder}>Types</th>
                <th style={styles.thWithLeftBorder}>Qty</th>
                <th style={styles.thWithLeftBorder}>Remark</th>
                <th style={styles.thWithLeftBorder}>Progress By</th>
                <th style={styles.thWithLeftBorder}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? loadingRow(10)
                : pageData.length === 0
                  ? emptyRow(10)
                  : pageData.map((row, index) => (
                      <tr key={row.id} {...trProps}>
                        {renderBaseRow(row, index)}
                        <td
                          style={styles.tdWithLeftBorder}
                          title={formatBy(
                            row.progress_by_name,
                            row.progress_at,
                          )}
                        >
                          {formatBy(row.progress_by_name, row.progress_at)}
                        </td>
                        <td
                          style={{
                            ...styles.tdWithLeftBorder,
                            display: "flex",
                            gap: "3px",
                            alignItems: "center",
                            height: "25px",
                          }}
                        >
                          <button
                            style={styles.replaceButton}
                            title="Move to Stock Replaced"
                            onClick={() => handleReplace(row.id)}
                          >
                            <PackageCheck size={10} />
                          </button>
                        </td>
                      </tr>
                    ))}
            </tbody>
          </table>
        </div>
        {renderPagination()}
      </div>
    );
  };

  const renderReplacedTab = () => {
    const pageData = getCurrentPageData();
    const cfg = tableConfig["Stock Replaced"];
    return (
      <div style={styles.tableContainer}>
        <div style={styles.tableBodyWrapper}>
          <table
            style={{
              ...styles.table,
              minWidth: cfg.minWidth,
              tableLayout: "fixed",
            }}
          >
            <colgroup>
              {cfg.cols.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.expandedTh}>No</th>
                <th style={styles.thWithLeftBorder}>Part Code</th>
                <th style={styles.thWithLeftBorder}>Label ID</th>
                <th style={styles.thWithLeftBorder}>Part Name</th>
                <th style={styles.thWithLeftBorder}>Model</th>
                <th style={styles.thWithLeftBorder}>Vendor</th>
                <th style={styles.thWithLeftBorder}>Types</th>
                <th style={styles.thWithLeftBorder}>Qty</th>
                <th style={styles.thWithLeftBorder}>Remark</th>
                <th style={styles.thWithLeftBorder}>Replaced By</th>
                <th style={styles.thWithLeftBorder}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? loadingRow(11)
                : pageData.length === 0
                  ? emptyRow(11)
                  : pageData.map((row, index) => (
                      <tr key={row.id} {...trProps}>
                        <td
                          style={{
                            ...styles.expandedTd,
                            ...styles.expandedWithLeftBorder,
                            ...styles.emptyColumn,
                          }}
                        >
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={row.part_code}
                        >
                          {row.part_code}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={row.label_id || "-"}
                        >
                          {row.label_id || "-"}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={row.part_name}
                        >
                          {row.part_name}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={row.model || "-"}
                        >
                          {row.model || "-"}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={row.vendor_name || "-"}
                        >
                          {row.vendor_name || "-"}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={row.vendor_type || "-"}
                        >
                          {row.vendor_type || "-"}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={String(row.qty_return)}
                        >
                          {row.qty_return}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={row.remark || "-"}
                        >
                          <span style={styles.remarkReadonly}>
                            {row.remark || "-"}
                          </span>
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={formatBy(
                            row.replaced_by_name,
                            row.replaced_at,
                          )}
                        >
                          {formatBy(row.replaced_by_name, row.replaced_at)}
                        </td>
                        <td
                          style={{
                            ...styles.tdWithLeftBorder,
                            display: "flex",
                            gap: "3px",
                            alignItems: "center",
                            height: "25px",
                          }}
                        >
                          <button
                            style={styles.completeButton}
                            title="Move to Complete"
                            onClick={() => handleComplete(row.id)}
                          >
                            <BadgeCheck size={10} />
                          </button>
                        </td>
                      </tr>
                    ))}
            </tbody>
          </table>
        </div>
        {renderPagination()}
      </div>
    );
  };

  const renderCompleteTab = () => {
    const pageData = getCurrentPageData();
    const cfg = tableConfig["Complete"];
    return (
      <div style={styles.tableContainer}>
        <div style={styles.tableBodyWrapper}>
          <table
            style={{
              ...styles.table,
              minWidth: cfg.minWidth,
              tableLayout: "fixed",
            }}
          >
            <colgroup>
              {cfg.cols.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.expandedTh}>No</th>
                <th style={styles.thWithLeftBorder}>Part Code</th>
                <th style={styles.thWithLeftBorder}>Label ID</th>
                <th style={styles.thWithLeftBorder}>Part Name</th>
                <th style={styles.thWithLeftBorder}>Model</th>
                <th style={styles.thWithLeftBorder}>Vendor</th>
                <th style={styles.thWithLeftBorder}>Types</th>
                <th style={styles.thWithLeftBorder}>Qty</th>
                <th style={styles.thWithLeftBorder}>Remark</th>
                <th style={styles.thWithLeftBorder}>Complete By</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? loadingRow(10)
                : pageData.length === 0
                  ? emptyRow(10)
                  : pageData.map((row, index) => (
                      <tr key={row.id} {...trProps}>
                        <td
                          style={{
                            ...styles.expandedTd,
                            ...styles.expandedWithLeftBorder,
                            ...styles.emptyColumn,
                          }}
                        >
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={row.part_code}
                        >
                          {row.part_code}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={row.label_id || "-"}
                        >
                          {row.label_id || "-"}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={row.part_name}
                        >
                          {row.part_name}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={row.model || "-"}
                        >
                          {row.model || "-"}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={row.vendor_name || "-"}
                        >
                          {row.vendor_name || "-"}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={row.vendor_type || "-"}
                        >
                          {row.vendor_type || "-"}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={String(row.qty_return)}
                        >
                          {row.qty_return}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={row.remark || "-"}
                        >
                          <span style={styles.remarkReadonly}>
                            {row.remark || "-"}
                          </span>
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={formatBy(
                            row.complete_by_name,
                            row.complete_at,
                          )}
                        >
                          {formatBy(row.complete_by_name, row.complete_at)}
                        </td>
                      </tr>
                    ))}
            </tbody>
          </table>
        </div>
        {renderPagination()}
      </div>
    );
  };

  const renderActiveTab = () => {
    if (activeTab === "Waiting LOG") return renderWaitingTab();
    if (activeTab === "Received LOG") return renderReceivedTab();
    if (activeTab === "RTV Progress") return renderProgressTab();
    if (activeTab === "Stock Replaced") return renderReplacedTab();
    if (activeTab === "Complete") return renderCompleteTab();
    return renderWaitingTab();
  };

  return (
    <div style={styles.pageContainer}>
      <Helmet>
        <title>RTV Part</title>
      </Helmet>

      {toastMessage && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            padding: "12px 20px",
            borderRadius: "6px",
            backgroundColor: toastType === "success" ? "#22c55e" : "#ef4444",
            color: "white",
            zIndex: 1000,
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            fontSize: "12px",
          }}
        >
          {toastMessage}
        </div>
      )}

      <div style={styles.welcomeCard}>
        <div style={styles.combinedHeaderFilter}>
          <div style={styles.headerRow}>
            <h1 style={styles.title}>RTV Control</h1>
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
                <option value="part_code">Part Code</option>
                <option value="part_name">Part Name</option>
                <option value="vendor_name">Vendor</option>
                <option value="model">Model</option>
                <option value="vendor_type">Types</option>
                {activeTab === "Waiting LOG" && (
                  <option value="rtv_by_name">RTV By</option>
                )}
                {activeTab === "Received LOG" && (
                  <option value="received_by_name">Received By</option>
                )}
                {activeTab === "RTV Progress" && (
                  <option value="progress_by_name">Progress By</option>
                )}
                {activeTab === "Stock Replaced" && (
                  <option value="replaced_by_name">Replaced By</option>
                )}
                {activeTab === "Complete" && (
                  <option value="complete_by_name">Complete By</option>
                )}
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
              onClick={() => handleTabClick(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {renderActiveTab()}
      </div>
    </div>
  );
};

export default RTVPartPage;
