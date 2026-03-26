"use client";

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Plus,
  Trash2,
  Save,
  Check,
  ClipboardCheck,
  Flame,
  RotateCcw,
  BadgeCheck,
} from "lucide-react";
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
  "New",
  "Waiting IQC",
  "Received IQC",
  "IQC Inspect",
  "Scrap",
  "RTV",
  "Complete",
];
const STOCK_LEVEL = "M101";
const TAB_LABELS = {
  New: "New",
  "Waiting IQC": "Waiting IQC",
  "Received IQC": "Received IQC",
  "IQC Inspect": "IQC Inspect",
  Scrap: "Scrap",
  RTV: "RTV",
  Complete: "Complete",
};

const ReturnPartsPage = ({ sidebarVisible }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const empName =
    getAuthUserLocal()?.emp_name || getAuthUserLocal()?.name || null;

  const [highlightedRows, setHighlightedRows] = useState(new Set());
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") || "New";
  });

  const [tableData, setTableData] = useState([]);
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterSearchBy, setFilterSearchBy] = useState("part_code");
  const [filterKeyword, setFilterKeyword] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [remarks, setRemarks] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [moveModal, setMoveModal] = useState(null);

  const tableConfig = {
    New: {
      cols: [
        "3%",
        "3%",
        "8%",
        "12%",
        "7%",
        "11%",
        "8%",
        "8%",
        "11%",
        "27%",
        "8%",
      ],
      minWidth: "1060px",
    },
    "Waiting IQC": {
      cols: ["3%", "9%", "20%", "7%", "20%", "8%", "8%", "12%", "25%"],
      minWidth: "1200px",
    },
    "Received IQC": {
      cols: ["3%", "9%", "13%", "7%", "12%", "6%", "6%", "12%", "25%"],
      minWidth: "1000px",
    },
    "IQC Inspect": {
      cols: ["3%", "8%", "12%", "7%", "10%", "5%", "5%", "11%", "23%"],
      minWidth: "1060px",
    },
    Scrap: {
      cols: [
        "3%",
        "8%",
        "11%",
        "7%",
        "10%",
        "5%",
        "5%",
        "6%",
        "10%",
        "22%",
        "13%",
      ],
      minWidth: "1060px",
    },
    RTV: {
      cols: [
        "3%",
        "7%",
        "11%",
        "6%",
        "9%",
        "5%",
        "5%",
        "6%",
        "7%",
        "9%",
        "26%",
      ],
      minWidth: "1060px",
    },
    Complete: {
      cols: ["3%", "8%", "15%", "7%", "15%", "5%", "7%", "7%", "20%", "25%"],
      minWidth: "1060px",
    },
  };

  const totalPages = Math.ceil(tableData.length / itemsPerPage) || 1;

  const getCurrentPageData = () => {
    const start = (currentPage - 1) * itemsPerPage;
    return tableData.slice(start, start + itemsPerPage);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabFromUrl = params.get("tab");
    if (tabFromUrl) setActiveTab(tabFromUrl);
  }, [location.search]);

  useEffect(() => {
    setFilterSearchBy("part_code");
    setFilterKeyword("");
    setFilterDateFrom("");
    setFilterDateTo("");
    fetchData(activeTab);
    setSelectedIds(new Set());
    setSelectAll(false);
    setHighlightedRows(new Set());
  }, [activeTab]);

  const fetchData = async (tab) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: tab });
      if (filterDateFrom) params.append("date_from", filterDateFrom);
      if (filterDateTo) params.append("date_to", filterDateTo);
      const res = await fetch(
        `${API_BASE}/api/return-parts?${params.toString()}`,
      );
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
        setCurrentPage(1);
      } else {
        setRawData([]);
        setTableData([]);
      }
    } catch {
      setRawData([]);
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

  const patchStatus = async (id, newStatus) => {
    const res = await fetch(`${API_BASE}/api/return-parts/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: newStatus,
        return_by_name: newStatus === "Waiting IQC" ? empName : undefined,
        received_by_name: newStatus === "Received IQC" ? empName : undefined,
        inspected_by_name: newStatus === "IQC Inspect" ? empName : undefined,
      }),
    });
    return res.json();
  };

  const moveWithQty = async (id, qty, newStatus, condition) => {
    const res = await fetch(`${API_BASE}/api/return-parts/${id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        qty,
        new_status: newStatus,
        condition: condition ?? null,
        stock_level: STOCK_LEVEL,
        moved_by_name: empName,
      }),
    });
    return res.json();
  };

  const hardDelete = async (id) => {
    const res = await fetch(`${API_BASE}/api/return-parts/${id}`, {
      method: "DELETE",
    });
    return res.json();
  };

  const handleSearch = () => fetchData(activeTab);

  const toggleRowHighlight = (id) => {
    setHighlightedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleTabClick = (tab) => {
    if (activeTab === tab) {
      fetchData(tab);
    } else {
      setActiveTab(tab);
    }
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleRemarkChange = (rowId, value) => {
    setRemarks((prev) => ({ ...prev, [rowId]: value }));
  };

  const handleRemarkSave = async (rowId) => {
    const newRemark = remarks[rowId] ?? "";
    try {
      await fetch(`${API_BASE}/api/return-parts/${rowId}/remark`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remark: newRemark }),
      });
      setTableData((prev) =>
        prev.map((r) => (r.id === rowId ? { ...r, remark: newRemark } : r)),
      );
    } catch {
      alert("Server error. Failed to save remark.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this record permanently?")) return;
    try {
      const result = await hardDelete(id);
      if (result.success) {
        setTableData((prev) => prev.filter((row) => row.id !== id));
        setSelectedIds((prev) => {
          const n = new Set(prev);
          n.delete(id);
          return n;
        });
      } else alert("Failed to delete: " + result.message);
    } catch {
      alert("Server error. Failed to delete.");
    }
  };

  const handleSelectAll = () => {
    if (selectAll) setSelectedIds(new Set());
    else setSelectedIds(new Set(tableData.map((r) => r.id)));
    setSelectAll(!selectAll);
  };

  const handleSelectRow = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
    setSelectAll(next.size === tableData.length && tableData.length > 0);
  };

  const handleSendReturn = async () => {
    if (selectedIds.size === 0) {
      alert("Select at least one row before sending.");
      return;
    }
    if (
      !window.confirm(
        `Send ${selectedIds.size} selected row(s) to Waiting IQC?`,
      )
    )
      return;
    try {
      await Promise.all(
        Array.from(selectedIds)
          .filter((id) => remarks[id] !== undefined)
          .map((id) =>
            fetch(`${API_BASE}/api/return-parts/${id}/remark`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ remark: remarks[id] }),
            }),
          ),
      );
      const results = await Promise.all(
        Array.from(selectedIds).map((id) => patchStatus(id, "Waiting IQC")),
      );
      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) alert(`${failed.length} row(s) failed to update.`);
      else {
        setTableData((prev) => prev.filter((row) => !selectedIds.has(row.id)));
        setSelectedIds(new Set());
        setSelectAll(false);
        setActiveTab("Waiting IQC");
      }
    } catch {
      alert("Server error. Failed to send return.");
    }
  };

  const handleMoveFromInspect = (row, targetStatus) => {
    const conditionMap = { Scrap: "Scrap", RTV: "RTV", Complete: "Good" };
    setMoveModal({
      row,
      targetStatus,
      qtyInput: String(row.qty_return),
      condition: conditionMap[targetStatus] ?? null,
      sourceTab: "IQC Inspect",
    });
  };

  const handleMoveScrapToComplete = (row) => {
    setMoveModal({
      row,
      targetStatus: "Complete",
      qtyInput: String(row.qty_return),
      condition: "Scrap",
      sourceTab: "Scrap",
    });
  };

  const handleReturnToInspect = async (id) => {
    if (!window.confirm("Return this row to IQC Inspect?")) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/return-parts/${id}/return-to-inspect`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stock_level: STOCK_LEVEL,
            moved_by_name: empName,
          }),
        },
      );
      const result = await res.json();
      if (result.success) {
        setTableData((prev) => prev.filter((row) => row.id !== id));
        setActiveTab("IQC Inspect");
      } else {
        alert("Failed: " + result.message);
      }
    } catch {
      alert("Server error. Failed to return to inspect.");
    }
  };

  const handleMoveModalConfirm = async () => {
    const { row, targetStatus, qtyInput, condition } = moveModal;
    const qty = Number(qtyInput);
    if (!qty || qty <= 0 || qty > row.qty_return) {
      alert(`Invalid qty. Must be between 1 and ${row.qty_return}.`);
      return;
    }
    try {
      const result = await moveWithQty(
        row.id,
        qty,
        targetStatus,
        condition ?? null,
      );
      if (result.success) {
        setMoveModal(null);
        await fetchData(moveModal.sourceTab || "IQC Inspect");
        if (qty === Number(row.qty_return)) setActiveTab(targetStatus);
      } else {
        alert("Failed: " + result.message);
      }
    } catch {
      alert("Server error. Failed to move.");
    }
  };

  const handleMoveToInspect = async (id) => {
    if (!window.confirm("Move this row to IQC Inspect?")) return;
    try {
      const result = await patchStatus(id, "IQC Inspect");
      if (result.success) {
        setTableData((prev) => prev.filter((row) => row.id !== id));
        setActiveTab("IQC Inspect");
      } else alert("Failed: " + result.message);
    } catch {
      alert("Server error. Failed to update status.");
    }
  };

  const handleReceived = async (id) => {
    if (!window.confirm("Move this row to Received IQC?")) return;
    try {
      const result = await patchStatus(id, "Received IQC");
      if (result.success) {
        setTableData((prev) => prev.filter((row) => row.id !== id));
        setActiveTab("Received IQC");
      } else alert("Failed: " + result.message);
    } catch {
      alert("Server error. Failed to update status.");
    }
  };

  const formatReturnBy = (name, returnAt) => {
    if (!name && !returnAt) return "-";
    const formatted = returnAt
      ? returnAt.replace(/(\d{2}):(\d{2})$/, "$1.$2")
      : "";
    return `${name || "-"} | ${formatted}`;
  };

  const handleTabHover = (e, isHover, isActive) => {
    if (!isActive)
      e.target.style.color = isHover
        ? styles.tabButtonHover.color
        : styles.tabButton.color;
  };

  const handleButtonHover = (e, isHover) => {
    e.currentTarget.style.backgroundColor = isHover ? "#1d4ed8" : "#2563eb";
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
      gap: "8px",
      display: "flex",
      alignItems: "center",
      transition: "background-color 0.2s ease",
    },
    actionButtonsGroup: {
      display: "flex",
      gap: "8px",
      marginBottom: "15px",
      marginTop: "10px",
    },
    tabsContainer: {
      display: "flex",
      borderBottom: "2px solid #e5e7eb",
      marginBottom: "16px",
    },
    tabButton: {
      padding: "12px 24px",
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
      gap: "8px",
    },
    tabButtonActive: {
      color: "#2563eb",
      borderBottom: "2px solid #2563eb",
      fontWeight: "600",
    },
    tabButtonHover: { color: "#2563eb" },
    emptyColumn: {
      width: "auto",
      minWidth: "auto",
      maxWidth: "auto",
      padding: "0",
      textAlign: "center",
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
    saveConfiguration: {
      display: "flex",
      gap: "8px",
      marginTop: "10px",
      marginLeft: "13px",
    },
    deleteButton: {
      backgroundColor: "#e0e7ff",
      color: "black",
      padding: "4px 8px",
      fontSize: "12px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
    },
    receivedButton: {
      backgroundColor: "#e0e7ff",
      color: "black",
      padding: "4px 8px",
      fontSize: "12px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      marginRight: "4px",
    },
    scrapButton: {
      backgroundColor: "#fee2e2",
      color: "#dc2626",
      padding: "4px 8px",
      fontSize: "12px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
    },
    rtvButton: {
      backgroundColor: "#dbeafe",
      color: "#1d4ed8",
      padding: "4px 8px",
      fontSize: "12px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
    },
    completeButton: {
      backgroundColor: "#dcfce7",
      color: "#16a34a",
      padding: "4px 8px",
      fontSize: "12px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
    },
    returnInspectButton: {
      backgroundColor: "#e0e7ff",
      color: "#3730a3",
      padding: "4px 8px",
      fontSize: "12px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
    },
    statusBadge: {
      padding: "2px 8px",
      borderRadius: "4px",
      fontSize: "11px",
      fontWeight: "600",
      display: "inline-block",
    },
    badgeGood: { backgroundColor: "#dcfce7", color: "#166534" },
    tabStatusBadge: {
      backgroundColor: "#e0e7ff",
      color: "black",
      borderRadius: "10px",
      padding: "1px 6px",
      fontSize: "10px",
      fontWeight: "600",
    },
    badgeRTV: { backgroundColor: "#dbeafe", color: "#1d4ed8" },
    badgeScrap: { backgroundColor: "#fee2e2", color: "#991b1b" },
    overlay: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
    },
    modalBox: {
      backgroundColor: "white",
      borderRadius: "8px",
      padding: "28px 32px",
      width: "360px",
      boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
      fontFamily: "inherit",
    },
    modalTitle: {
      fontSize: "15px",
      fontWeight: "600",
      color: "#1f2937",
      marginBottom: "6px",
    },
    modalSub: { fontSize: "12px", color: "#6b7280", marginBottom: "18px" },
    modalLabel: {
      fontSize: "12px",
      fontWeight: "500",
      color: "#374151",
      marginBottom: "6px",
      display: "block",
    },
    modalInput: {
      width: "100%",
      height: "36px",
      border: "2px solid #d1d5db",
      borderRadius: "4px",
      padding: "0 12px",
      fontSize: "13px",
      fontFamily: "inherit",
      outline: "none",
      boxSizing: "border-box",
      marginBottom: "20px",
    },
    modalActions: { display: "flex", justifyContent: "flex-end", gap: "8px" },
    modalCancel: {
      padding: "7px 18px",
      borderRadius: "4px",
      border: "1px solid #d1d5db",
      backgroundColor: "white",
      fontSize: "12px",
      cursor: "pointer",
      fontFamily: "inherit",
      color: "#374151",
    },
    modalConfirm: {
      padding: "7px 18px",
      borderRadius: "4px",
      border: "none",
      fontSize: "12px",
      cursor: "pointer",
      fontFamily: "inherit",
      color: "white",
    },
    remarkInput: {
      display: "flex",
      height: "1rem",
      width: "90%",
      borderRadius: "6px",
      border: "1px solid #d1d5db",
      backgroundColor: "#f3f4f6",
      padding: "10px 14px",
      fontSize: "12px",
      color: "#374151",
      fontFamily: "inherit",
      margin: 0,
      outline: "none",
      boxSizing: "border-box",
    },
    remarkReadonly: {
      fontSize: "12px",
      color: "#374151",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      display: "block",
    },
  };

  const renderNewTab = () => {
    const pageData = getCurrentPageData();
    return (
      <div style={styles.tableContainer}>
        <div style={styles.tableBodyWrapper}>
          <table
            style={{
              ...styles.table,
              minWidth: tableConfig["New"].minWidth,
              tableLayout: "fixed",
            }}
          >
            <colgroup>
              {tableConfig["New"].cols.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.expandedTh}>No</th>
                <th style={styles.thWithLeftBorder}>
                  {tableData.length > 1 && (
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      style={{
                        cursor: "pointer",
                        width: "12px",
                        height: "12px",
                        margin: "0 auto",
                        display: "block",
                      }}
                    />
                  )}
                </th>
                <th style={styles.thWithLeftBorder}>Part Code</th>
                <th style={styles.thWithLeftBorder}>Part Name</th>
                <th style={styles.thWithLeftBorder}>Model</th>
                <th style={styles.thWithLeftBorder}>Vendor</th>
                <th style={styles.thWithLeftBorder}>Types</th>
                <th style={styles.thWithLeftBorder}>Qty Return</th>
                <th style={styles.thWithLeftBorder}>Remark</th>
                <th style={styles.thWithLeftBorder}>Return By</th>
                <th style={styles.thWithLeftBorder}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="11"
                    style={{
                      ...styles.tdWithLeftBorder,
                      textAlign: "center",
                      padding: "20px",
                    }}
                  >
                    Loading...
                  </td>
                </tr>
              ) : pageData.length === 0 ? (
                <tr>
                  <td colSpan="11" />
                </tr>
              ) : (
                pageData.map((row, index) => {
                  const globalIndex =
                    (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                    <tr
                      key={row.id}
                      style={{
                        backgroundColor: highlightedRows.has(row.id)
                          ? "#c7cde8"
                          : "transparent",
                        cursor: "pointer",
                      }}
                      onClick={(e) => {
                        if (
                          !e.target.closest("input") &&
                          !e.target.closest("button")
                        )
                          toggleRowHighlight(row.id);
                      }}
                      onMouseEnter={(e) => {
                        e.target.closest("tr").style.backgroundColor =
                          "#c7cde8";
                      }}
                      onMouseLeave={(e) => {
                        e.target.closest("tr").style.backgroundColor =
                          highlightedRows.has(row.id)
                            ? "#c7cde8"
                            : "transparent";
                      }}
                    >
                      <td
                        style={{
                          ...styles.expandedTd,
                          ...styles.expandedWithLeftBorder,
                          ...styles.emptyColumn,
                        }}
                        title={globalIndex}
                      >
                        {globalIndex}
                      </td>
                      <td
                        style={{
                          ...styles.tdWithLeftBorder,
                          textAlign: "center",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.id)}
                          onChange={() => handleSelectRow(row.id)}
                          style={{
                            cursor: "pointer",
                            width: "12px",
                            height: "12px",
                            margin: "0 auto",
                            display: "block",
                          }}
                        />
                      </td>
                      <td style={styles.tdWithLeftBorder} title={row.part_code}>
                        {row.part_code}
                      </td>
                      <td style={styles.tdWithLeftBorder} title={row.part_name}>
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
                        title={remarks[row.id] ?? row.remark ?? ""}
                      >
                        <input
                          type="text"
                          value={remarks[row.id] ?? row.remark ?? ""}
                          onChange={(e) =>
                            handleRemarkChange(row.id, e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRemarkSave(row.id);
                          }}
                          placeholder="-"
                          style={styles.remarkInput}
                        />
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                        title={formatReturnBy(
                          row.return_by_name,
                          row.return_at,
                        )}
                      >
                        {formatReturnBy(row.return_by_name, row.return_at)}
                      </td>
                      <td style={styles.tdWithLeftBorder}>
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
                })
              )}
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
      </div>
    );
  };

  const renderWaitingTab = () => {
    const pageData = getCurrentPageData();
    return (
      <div style={styles.tableContainer}>
        <div style={styles.tableBodyWrapper}>
          <table
            style={{
              ...styles.table,
              minWidth: tableConfig["Waiting IQC"].minWidth,
              tableLayout: "fixed",
            }}
          >
            <colgroup>
              {tableConfig["Waiting IQC"].cols.map((w, i) => (
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
                <th style={styles.thWithLeftBorder}>Qty Return</th>
                <th style={styles.thWithLeftBorder}>Remark</th>
                <th style={styles.thWithLeftBorder}>Return By</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="10"
                    style={{
                      ...styles.tdWithLeftBorder,
                      textAlign: "center",
                      padding: "20px",
                    }}
                  >
                    Loading...
                  </td>
                </tr>
              ) : pageData.length === 0 ? (
                <tr>
                  <td colSpan="9" />
                </tr>
              ) : (
                pageData.map((row, index) => {
                  const globalIndex =
                    (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                    <tr
                      key={row.id}
                      style={{
                        backgroundColor: highlightedRows.has(row.id)
                          ? "#c7cde8"
                          : "transparent",
                        cursor: "pointer",
                      }}
                      onClick={(e) => {
                        if (
                          !e.target.closest("input") &&
                          !e.target.closest("button")
                        )
                          toggleRowHighlight(row.id);
                      }}
                      onMouseEnter={(e) => {
                        e.target.closest("tr").style.backgroundColor =
                          "#c7cde8";
                      }}
                      onMouseLeave={(e) => {
                        e.target.closest("tr").style.backgroundColor =
                          highlightedRows.has(row.id)
                            ? "#c7cde8"
                            : "transparent";
                      }}
                    >
                      <td
                        style={{
                          ...styles.expandedTd,
                          ...styles.expandedWithLeftBorder,
                          ...styles.emptyColumn,
                        }}
                        title={globalIndex}
                      >
                        {globalIndex}
                      </td>
                      <td style={styles.tdWithLeftBorder} title={row.part_code}>
                        {row.part_code}
                      </td>
                      <td style={styles.tdWithLeftBorder} title={row.part_name}>
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
                        title={formatReturnBy(
                          row.return_by_name,
                          row.return_at,
                        )}
                      >
                        {formatReturnBy(row.return_by_name, row.return_at)}
                      </td>
                    </tr>
                  );
                })
              )}
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
      </div>
    );
  };

  const renderReceivedTab = () => {
    const pageData = getCurrentPageData();
    return (
      <div style={styles.tableContainer}>
        <div style={styles.tableBodyWrapper}>
          <table
            style={{
              ...styles.table,
              minWidth: tableConfig["Received IQC"].minWidth,
              tableLayout: "fixed",
            }}
          >
            <colgroup>
              {tableConfig["Received IQC"].cols.map((w, i) => (
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
                <th style={styles.thWithLeftBorder}>Qty Return</th>
                <th style={styles.thWithLeftBorder}>Remark</th>
                <th style={styles.thWithLeftBorder}>Received By</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="10"
                    style={{
                      ...styles.tdWithLeftBorder,
                      textAlign: "center",
                      padding: "20px",
                    }}
                  >
                    Loading...
                  </td>
                </tr>
              ) : pageData.length === 0 ? (
                <tr>
                  <td colSpan="9" />
                </tr>
              ) : (
                pageData.map((row, index) => {
                  const globalIndex =
                    (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                    <tr
                      key={row.id}
                      style={{
                        backgroundColor: highlightedRows.has(row.id)
                          ? "#c7cde8"
                          : "transparent",
                        cursor: "pointer",
                      }}
                      onClick={(e) => {
                        if (
                          !e.target.closest("input") &&
                          !e.target.closest("button")
                        )
                          toggleRowHighlight(row.id);
                      }}
                      onMouseEnter={(e) => {
                        e.target.closest("tr").style.backgroundColor =
                          "#c7cde8";
                      }}
                      onMouseLeave={(e) => {
                        e.target.closest("tr").style.backgroundColor =
                          highlightedRows.has(row.id)
                            ? "#c7cde8"
                            : "transparent";
                      }}
                    >
                      <td
                        style={{
                          ...styles.expandedTd,
                          ...styles.expandedWithLeftBorder,
                          ...styles.emptyColumn,
                        }}
                        title={globalIndex}
                      >
                        {globalIndex}
                      </td>
                      <td style={styles.tdWithLeftBorder} title={row.part_code}>
                        {row.part_code}
                      </td>
                      <td style={styles.tdWithLeftBorder} title={row.part_name}>
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
                        title={formatReturnBy(
                          row.received_by_name,
                          row.received_at,
                        )}
                      >
                        {formatReturnBy(row.received_by_name, row.received_at)}
                      </td>
                    </tr>
                  );
                })
              )}
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
      </div>
    );
  };

  const renderIQCInspectTab = () => {
    const pageData = getCurrentPageData();
    return (
      <div style={styles.tableContainer}>
        <div style={styles.tableBodyWrapper}>
          <table
            style={{
              ...styles.table,
              minWidth: tableConfig["IQC Inspect"].minWidth,
              tableLayout: "fixed",
            }}
          >
            <colgroup>
              {tableConfig["IQC Inspect"].cols.map((w, i) => (
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
                <th style={styles.thWithLeftBorder}>Qty Return</th>
                <th style={styles.thWithLeftBorder}>Remark</th>
                <th style={styles.thWithLeftBorder}>Inspected By</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="10"
                    style={{
                      ...styles.tdWithLeftBorder,
                      textAlign: "center",
                      padding: "20px",
                    }}
                  >
                    Loading...
                  </td>
                </tr>
              ) : pageData.length === 0 ? (
                <tr>
                  <td colSpan="9" />
                </tr>
              ) : (
                pageData.map((row, index) => {
                  const globalIndex =
                    (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                    <tr
                      key={row.id}
                      style={{
                        backgroundColor: highlightedRows.has(row.id)
                          ? "#c7cde8"
                          : "transparent",
                        cursor: "pointer",
                      }}
                      onClick={(e) => {
                        if (
                          !e.target.closest("input") &&
                          !e.target.closest("button")
                        )
                          toggleRowHighlight(row.id);
                      }}
                      onMouseEnter={(e) => {
                        e.target.closest("tr").style.backgroundColor =
                          "#c7cde8";
                      }}
                      onMouseLeave={(e) => {
                        e.target.closest("tr").style.backgroundColor =
                          highlightedRows.has(row.id)
                            ? "#c7cde8"
                            : "transparent";
                      }}
                    >
                      <td
                        style={{
                          ...styles.expandedTd,
                          ...styles.expandedWithLeftBorder,
                          ...styles.emptyColumn,
                        }}
                        title={globalIndex}
                      >
                        {globalIndex}
                      </td>
                      <td style={styles.tdWithLeftBorder} title={row.part_code}>
                        {row.part_code}
                      </td>
                      <td style={styles.tdWithLeftBorder} title={row.part_name}>
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
                        title={formatReturnBy(
                          row.inspected_by_name,
                          row.inspected_at,
                        )}
                      >
                        {formatReturnBy(
                          row.inspected_by_name,
                          row.inspected_at,
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
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
      </div>
    );
  };

  const STATUS_CONDITION_LABEL = {
    Scrap: "Scrap",
    RTV: "RTV",
    Complete: "Good",
  };

  const renderScrapTab = () => {
    const pageData = getCurrentPageData();
    return (
      <div style={styles.tableContainer}>
        <div style={styles.tableBodyWrapper}>
          <table
            style={{
              ...styles.table,
              minWidth: tableConfig["Scrap"].minWidth,
              tableLayout: "fixed",
            }}
          >
            <colgroup>
              {tableConfig["Scrap"].cols.map((w, i) => (
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
                <th style={styles.thWithLeftBorder}>Qty Return</th>
                <th style={styles.thWithLeftBorder}>Status</th>
                <th style={styles.thWithLeftBorder}>Remark</th>
                <th style={styles.thWithLeftBorder}>Scrap By</th>
                <th style={styles.thWithLeftBorder}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="12"
                    style={{
                      ...styles.tdWithLeftBorder,
                      textAlign: "center",
                      padding: "20px",
                    }}
                  >
                    Loading...
                  </td>
                </tr>
              ) : pageData.length === 0 ? (
                <tr>
                  <td colSpan="12" />
                </tr>
              ) : (
                pageData.map((row, index) => {
                  const globalIndex =
                    (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                    <tr
                      key={row.id}
                      style={{
                        backgroundColor: highlightedRows.has(row.id)
                          ? "#c7cde8"
                          : "transparent",
                        cursor: "pointer",
                      }}
                      onClick={(e) => {
                        if (
                          !e.target.closest("input") &&
                          !e.target.closest("button")
                        )
                          toggleRowHighlight(row.id);
                      }}
                      onMouseEnter={(e) => {
                        e.target.closest("tr").style.backgroundColor =
                          "#c7cde8";
                      }}
                      onMouseLeave={(e) => {
                        e.target.closest("tr").style.backgroundColor =
                          highlightedRows.has(row.id)
                            ? "#c7cde8"
                            : "transparent";
                      }}
                    >
                      <td
                        style={{
                          ...styles.expandedTd,
                          ...styles.expandedWithLeftBorder,
                          ...styles.emptyColumn,
                        }}
                        title={globalIndex}
                      >
                        {globalIndex}
                      </td>
                      <td style={styles.tdWithLeftBorder} title={row.part_code}>
                        {row.part_code}
                      </td>
                      <td style={styles.tdWithLeftBorder} title={row.part_name}>
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
                        style={{
                          ...styles.tdWithLeftBorder,
                          textAlign: "center",
                        }}
                        title="Scrap"
                      >
                        <span
                          style={{
                            ...styles.statusBadge,
                            ...styles.badgeScrap,
                          }}
                        >
                          Scrap
                        </span>
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
                        title={formatReturnBy(row.scrap_by_name, row.scrap_at)}
                      >
                        {formatReturnBy(row.scrap_by_name, row.scrap_at)}
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
                          onClick={() => handleMoveScrapToComplete(row)}
                        >
                          <BadgeCheck size={10} />
                        </button>
                        <button
                          style={styles.returnInspectButton}
                          title="Return to IQC Inspect"
                          onClick={() => handleReturnToInspect(row.id)}
                        >
                          <RotateCcw size={10} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
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
      </div>
    );
  };

  const renderRTVTab = () => {
    const pageData = getCurrentPageData();
    return (
      <div style={styles.tableContainer}>
        <div style={styles.tableBodyWrapper}>
          <table
            style={{
              ...styles.table,
              minWidth: tableConfig["RTV"].minWidth,
              tableLayout: "fixed",
            }}
          >
            <colgroup>
              {tableConfig["RTV"].cols.map((w, i) => (
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
                <th style={styles.thWithLeftBorder}>Qty Return</th>
                <th style={styles.thWithLeftBorder}>Status</th>
                <th style={styles.thWithLeftBorder}>Status Tab</th>
                <th style={styles.thWithLeftBorder}>Remark</th>
                <th style={styles.thWithLeftBorder}>RTV By</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="11"
                    style={{
                      ...styles.tdWithLeftBorder,
                      textAlign: "center",
                      padding: "20px",
                    }}
                  >
                    Loading...
                  </td>
                </tr>
              ) : pageData.length === 0 ? (
                <tr>
                  <td colSpan="11" />
                </tr>
              ) : (
                pageData.map((row, index) => {
                  const globalIndex =
                    (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                    <tr
                      key={row.id}
                      style={{
                        backgroundColor: highlightedRows.has(row.id)
                          ? "#c7cde8"
                          : "transparent",
                        cursor: "pointer",
                      }}
                      onClick={(e) => {
                        if (
                          !e.target.closest("input") &&
                          !e.target.closest("button")
                        )
                          toggleRowHighlight(row.id);
                      }}
                      onMouseEnter={(e) => {
                        e.target.closest("tr").style.backgroundColor =
                          "#c7cde8";
                      }}
                      onMouseLeave={(e) => {
                        e.target.closest("tr").style.backgroundColor =
                          highlightedRows.has(row.id)
                            ? "#c7cde8"
                            : "transparent";
                      }}
                    >
                      <td
                        style={{
                          ...styles.expandedTd,
                          ...styles.expandedWithLeftBorder,
                          ...styles.emptyColumn,
                        }}
                        title={globalIndex}
                      >
                        {globalIndex}
                      </td>
                      <td style={styles.tdWithLeftBorder} title={row.part_code}>
                        {row.part_code}
                      </td>
                      <td style={styles.tdWithLeftBorder} title={row.part_name}>
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
                        style={{
                          ...styles.tdWithLeftBorder,
                          textAlign: "center",
                        }}
                        title="RTV"
                      >
                        <span
                          style={{ ...styles.statusBadge, ...styles.badgeRTV }}
                        >
                          RTV
                        </span>
                      </td>
                      <td
                        style={{
                          ...styles.tdWithLeftBorder,
                          textAlign: "center",
                        }}
                        title={row.rtv_tab_status ? row.rtv_tab_status : "-"}
                      >
                        {row.rtv_tab_status === "Waiting LOG" ? (
                          <span style={styles.tabStatusBadge}>Waiting</span>
                        ) : row.rtv_tab_status === "Received LOG" ? (
                          <span style={styles.tabStatusBadge}>Received</span>
                        ) : row.rtv_tab_status === "RTV Progress" ? (
                          <span style={styles.tabStatusBadge}>Progress</span>
                        ) : row.rtv_tab_status === "Stock Replaced" ? (
                          <span style={styles.tabStatusBadge}>Replaced</span>
                        ) : (
                          <span style={{ color: "#9ca3af", fontSize: "11px" }}>
                            -
                          </span>
                        )}
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
                        title={formatReturnBy(row.rtv_by_name, row.rtv_at)}
                      >
                        {formatReturnBy(row.rtv_by_name, row.rtv_at)}
                      </td>
                    </tr>
                  );
                })
              )}
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
      </div>
    );
  };

  const renderCompleteTab = () => {
    const pageData = getCurrentPageData();
    return (
      <div style={styles.tableContainer}>
        <div style={styles.tableBodyWrapper}>
          <table
            style={{
              ...styles.table,
              minWidth: tableConfig["Complete"].minWidth,
              tableLayout: "fixed",
            }}
          >
            <colgroup>
              {tableConfig["Complete"].cols.map((w, i) => (
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
                <th style={styles.thWithLeftBorder}>Qty Return</th>
                <th style={styles.thWithLeftBorder}>Status</th>
                <th style={styles.thWithLeftBorder}>Remark</th>
                <th style={styles.thWithLeftBorder}>Complete By</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="11"
                    style={{
                      ...styles.tdWithLeftBorder,
                      textAlign: "center",
                      padding: "20px",
                    }}
                  >
                    Loading...
                  </td>
                </tr>
              ) : pageData.length === 0 ? (
                <tr>
                  <td colSpan="11" />
                </tr>
              ) : (
                pageData.map((row, index) => {
                  const globalIndex =
                    (currentPage - 1) * itemsPerPage + index + 1;
                  const conditionLabel = row.condition || "Good";
                  const badgeStyle =
                    conditionLabel === "Scrap"
                      ? styles.badgeScrap
                      : conditionLabel === "RTV"
                        ? styles.badgeRTV
                        : styles.badgeGood;
                  return (
                    <tr
                      key={row.id}
                      style={{
                        backgroundColor: highlightedRows.has(row.id)
                          ? "#c7cde8"
                          : "transparent",
                        cursor: "pointer",
                      }}
                      onClick={(e) => {
                        if (
                          !e.target.closest("input") &&
                          !e.target.closest("button")
                        )
                          toggleRowHighlight(row.id);
                      }}
                      onMouseEnter={(e) => {
                        e.target.closest("tr").style.backgroundColor =
                          "#c7cde8";
                      }}
                      onMouseLeave={(e) => {
                        e.target.closest("tr").style.backgroundColor =
                          highlightedRows.has(row.id)
                            ? "#c7cde8"
                            : "transparent";
                      }}
                    >
                      <td
                        style={{
                          ...styles.expandedTd,
                          ...styles.expandedWithLeftBorder,
                          ...styles.emptyColumn,
                        }}
                        title={globalIndex}
                      >
                        {globalIndex}
                      </td>
                      <td style={styles.tdWithLeftBorder} title={row.part_code}>
                        {row.part_code}
                      </td>
                      <td style={styles.tdWithLeftBorder} title={row.part_name}>
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
                        style={{
                          ...styles.tdWithLeftBorder,
                          textAlign: "center",
                        }}
                        title={conditionLabel}
                      >
                        <span style={{ ...styles.statusBadge, ...badgeStyle }}>
                          {conditionLabel}
                        </span>
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
                        title={formatReturnBy(
                          row.complete_by_name,
                          row.complete_at,
                        )}
                      >
                        {formatReturnBy(row.complete_by_name, row.complete_at)}
                      </td>
                    </tr>
                  );
                })
              )}
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
      </div>
    );
  };

  const renderGenericTab = () => {
    const pageData = getCurrentPageData();
    const showStatus = ["Scrap", "RTV", "Complete"].includes(activeTab);
    const isScrapTab = activeTab === "Scrap";
    const colSpanCount = showStatus ? "11" : "10";
    return (
      <div style={styles.tableContainer}>
        <div style={styles.tableBodyWrapper}>
          <table
            style={{
              ...styles.table,
              minWidth: showStatus ? "1060px" : "1000px",
              tableLayout: "fixed",
            }}
          >
            <colgroup>
              <col style={{ width: "3%" }} />
              <col style={{ width: showStatus ? "8%" : "9%" }} />
              <col style={{ width: showStatus ? "11%" : "13%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: showStatus ? "10%" : "12%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "6%" }} />
              {showStatus && <col style={{ width: "6%" }} />}
              <col style={{ width: showStatus ? "10%" : "12%" }} />
              <col style={{ width: showStatus ? "22%" : "26%" }} />
              <col style={{ width: isScrapTab ? "11%" : "6%" }} />
            </colgroup>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.expandedTh}>No</th>
                <th style={styles.thWithLeftBorder}>Part Code</th>
                <th style={styles.thWithLeftBorder}>Part Name</th>
                <th style={styles.thWithLeftBorder}>Model</th>
                <th style={styles.thWithLeftBorder}>Vendor</th>
                <th style={styles.thWithLeftBorder}>Types</th>
                <th style={styles.thWithLeftBorder}>Qty Return</th>
                {showStatus && <th style={styles.thWithLeftBorder}>Status</th>}
                <th style={styles.thWithLeftBorder}>Remark</th>
                <th style={styles.thWithLeftBorder}>Return By</th>
                <th style={styles.thWithLeftBorder}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={colSpanCount}
                    style={{
                      ...styles.tdWithLeftBorder,
                      textAlign: "center",
                      padding: "20px",
                    }}
                  >
                    Loading...
                  </td>
                </tr>
              ) : pageData.length === 0 ? (
                <tr>
                  <td colSpan={colSpanCount} />
                </tr>
              ) : (
                pageData.map((row, index) => {
                  const globalIndex =
                    (currentPage - 1) * itemsPerPage + index + 1;
                  const conditionLabel =
                    activeTab === "Complete"
                      ? row.condition || "Good"
                      : STATUS_CONDITION_LABEL[activeTab] || activeTab;
                  const badgeStyle =
                    conditionLabel === "Scrap"
                      ? styles.badgeScrap
                      : conditionLabel === "RTV"
                        ? styles.badgeRTV
                        : styles.badgeGood;
                  return (
                    <tr
                      key={row.id}
                      style={{
                        backgroundColor: highlightedRows.has(row.id)
                          ? "#c7cde8"
                          : "transparent",
                        cursor: "pointer",
                      }}
                      onClick={(e) => {
                        if (
                          !e.target.closest("input") &&
                          !e.target.closest("button")
                        )
                          toggleRowHighlight(row.id);
                      }}
                      onMouseEnter={(e) => {
                        e.target.closest("tr").style.backgroundColor =
                          "#c7cde8";
                      }}
                      onMouseLeave={(e) => {
                        e.target.closest("tr").style.backgroundColor =
                          highlightedRows.has(row.id)
                            ? "#c7cde8"
                            : "transparent";
                      }}
                    >
                      <td
                        style={{
                          ...styles.expandedTd,
                          ...styles.expandedWithLeftBorder,
                          ...styles.emptyColumn,
                        }}
                        title={globalIndex}
                      >
                        {globalIndex}
                      </td>
                      <td style={styles.tdWithLeftBorder} title={row.part_code}>
                        {row.part_code}
                      </td>
                      <td style={styles.tdWithLeftBorder} title={row.part_name}>
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
                      {showStatus && (
                        <td
                          style={{
                            ...styles.tdWithLeftBorder,
                            textAlign: "center",
                          }}
                          title={conditionLabel}
                        >
                          <span
                            style={{ ...styles.statusBadge, ...badgeStyle }}
                          >
                            {conditionLabel}
                          </span>
                        </td>
                      )}
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
                        title={formatReturnBy(
                          row.return_by_name,
                          row.return_at,
                        )}
                      >
                        {formatReturnBy(row.return_by_name, row.return_at)}
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
                        {isScrapTab && (
                          <>
                            <button
                              style={styles.completeButton}
                              title="Move to Complete"
                              onClick={() => handleMoveScrapToComplete(row)}
                            >
                              <BadgeCheck size={10} />
                            </button>
                            <button
                              style={styles.returnInspectButton}
                              title="Return to IQC Inspect"
                              onClick={() => handleReturnToInspect(row.id)}
                            >
                              <RotateCcw size={10} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
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
      </div>
    );
  };

  const renderActiveTab = () => {
    if (activeTab === "New") return renderNewTab();
    if (activeTab === "Waiting IQC") return renderWaitingTab();
    if (activeTab === "Received IQC") return renderReceivedTab();
    if (activeTab === "IQC Inspect") return renderIQCInspectTab();
    if (activeTab === "Scrap") return renderScrapTab();
    if (activeTab === "RTV") return renderRTVTab();
    if (activeTab === "Complete") return renderCompleteTab();
    return renderGenericTab();
  };

  return (
    <div style={styles.pageContainer}>
      <Helmet>
        <title>Return Parts</title>
      </Helmet>
      {moveModal && (
        <div style={styles.overlay} onClick={() => setMoveModal(null)}>
          <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalTitle}>
              Move to{" "}
              {moveModal.targetStatus === "Complete"
                ? "Complete (Good)"
                : moveModal.targetStatus}
            </div>
            <div style={styles.modalSub}>
              Part: <strong>{moveModal.row.part_code}</strong> — Total qty:{" "}
              <strong>{moveModal.row.qty_return}</strong>
            </div>
            <label style={styles.modalLabel}>Qty to move</label>
            <input
              type="number"
              min="1"
              max={moveModal.row.qty_return}
              style={styles.modalInput}
              value={moveModal.qtyInput}
              onChange={(e) =>
                setMoveModal((prev) => ({ ...prev, qtyInput: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") handleMoveModalConfirm();
                if (e.key === "Escape") setMoveModal(null);
              }}
              autoFocus
            />
            <div style={styles.modalActions}>
              <button
                style={styles.modalCancel}
                onClick={() => setMoveModal(null)}
              >
                Cancel
              </button>
              <button
                style={{
                  ...styles.modalConfirm,
                  backgroundColor:
                    moveModal.targetStatus === "Scrap"
                      ? "#dc2626"
                      : moveModal.targetStatus === "RTV"
                        ? "#d97706"
                        : "#16a34a",
                }}
                onClick={handleMoveModalConfirm}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={styles.welcomeCard}>
        <div style={styles.combinedHeaderFilter}>
          <div style={styles.headerRow}>
            <h1 style={styles.title}>Return Parts</h1>
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
                {activeTab === "New" && (
                  <option value="return_by_name">Return By</option>
                )}
                {activeTab === "Waiting IQC" && (
                  <option value="return_by_name">Return By</option>
                )}
                {activeTab === "Received IQC" && (
                  <option value="received_by_name">Received By</option>
                )}
                {activeTab === "IQC Inspect" && (
                  <option value="inspected_by_name">Inspected By</option>
                )}
                {activeTab === "Scrap" && (
                  <option value="scrap_by_name">Scrap By</option>
                )}
                {activeTab === "RTV" && (
                  <option value="rtv_by_name">RTV By</option>
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

        <div style={styles.actionButtonsGroup}>
          <button
            style={styles.button}
            onMouseEnter={(e) => handleButtonHover(e, true)}
            onMouseLeave={(e) => handleButtonHover(e, false)}
            onClick={() => {
              document.title = "Return Parts/Add Return Parts";
              navigate("/return-parts/add");
            }}
          >
            <Plus size={16} />
            Create
          </button>
        </div>

        <div style={styles.tabsContainer}>
          {TABS.map((tab) => (
            <button
              key={tab}
              style={{
                ...styles.tabButton,
                ...(activeTab === tab && styles.tabButtonActive),
              }}
              onClick={() => handleTabClick(tab)}
              onMouseEnter={(e) => handleTabHover(e, true, activeTab === tab)}
              onMouseLeave={(e) => handleTabHover(e, false, activeTab === tab)}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {renderActiveTab()}

        {activeTab === "New" && tableData.length > 0 && (
          <div style={styles.saveConfiguration}>
            <button
              style={{
                ...styles.button,
                cursor: selectedIds.size === 0 ? "not-allowed" : "pointer",
                opacity: selectedIds.size === 0 ? 0.6 : 1,
              }}
              disabled={selectedIds.size === 0}
              onClick={handleSendReturn}
            >
              <Save size={16} />
              Send Return
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReturnPartsPage;
