"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MdArrowRight, MdArrowDropDown } from "react-icons/md";
import { Plus, Trash2, Pencil, Save, Check } from "lucide-react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const toDDMMYYYY = (iso) => {
  if (!iso) return "-";
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) {
      if (iso.includes("-")) {
        const [y, m, d] = iso.split("-");
        if (y && m && d) return `${d}/${m}/${y}`;
      }
      return iso;
    }
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return iso;
  }
};

const formatApprovedBy = (approvedBy, approvedAt) => {
  if (!approvedBy) return "-";
  
  let dateStr = "";
  if (approvedAt) {
    try {
      const date = new Date(approvedAt);
      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        dateStr = `${day}/${month}/${year} ${hours}.${minutes}`;
      }
    } catch {
      dateStr = "";
    }
  }
  
  return dateStr ? `${approvedBy} | ${dateStr}` : approvedBy;
};

const QCCheckPage = ({ sidebarVisible }) => {
  const navigate = useNavigate();
  const [productionSchedules, setProductionSchedules] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [addCustomerDetail, setAddCustomerDetail] = useState(false);
  const [addCustomerFormData, setAddCustomerFormData] = useState({
    partCode: "",
    partName: "",
    input: "",
    poNumber: "",
    description: "",
  });
  const [selectedHeaderIds, setSelectedHeaderIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("Current Check");
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState({});
  const [error, setError] = useState(null);
  const [detailCache, setDetailCache] = useState({});
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchBy, setSearchBy] = useState("Customer");
  const [keyword, setKeyword] = useState("");
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState(null);
  const [tooltip, setTooltip] = useState({
    visible: false,
    content: "",
    x: 0,
    y: 0,
  });

  // STATE FOR COMPLETE TAB
  const [completeQCChecks, setCompleteQCChecks] = useState([]);

  // Fetch Complete QC Checks when tab changes
  useEffect(() => {
    if (activeTab === "Complete") {
      fetchCompleteQCChecks();
    }
  }, [activeTab]);

  const fetchCompleteQCChecks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/qc-checks`);
      const result = await response.json();
      
      if (result.success) {
        setCompleteQCChecks(result.data || []);
      } else {
        setCompleteQCChecks([]);
      }
    } catch (error) {
      console.error("Error fetching QC checks:", error);
      setCompleteQCChecks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQCCheck = async (id) => {
    if (!window.confirm("Are you sure you want to delete this QC check?")) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/qc-checks/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setToastMessage("QC Check deleted successfully!");
        setToastType("success");
        setTimeout(() => setToastMessage(null), 3000);
        fetchCompleteQCChecks();
      } else {
        throw new Error(result.message || "Failed to delete QC check");
      }
    } catch (error) {
      setToastMessage(`Failed to delete: ${error.message}`);
      setToastType("error");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const filteredSchedules = productionSchedules.filter(
    (schedule) => activeTab === "All" || schedule.status === activeTab
  );

  const hasNewSchedules = productionSchedules.some(
    (schedule) => schedule.status === "New"
  );

  const toggleHeaderCheckbox = (headerId, checked) => {
    if (activeTab === "New") {
      setSelectedHeaderIds((prev) => {
        const next = new Set(prev);
        if (checked) {
          next.add(headerId);
        } else {
          next.delete(headerId);
        }
        if (checked && next.size === filteredSchedules.length) {
          setSelectAll(true);
        } else if (!checked) {
          setSelectAll(false);
        }
        return next;
      });
    }
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedHeaderIds(new Set());
    } else {
      if (activeTab === "New") {
        const newScheduleIds = filteredSchedules.map((schedule) => schedule.id);
        setSelectedHeaderIds(new Set(newScheduleIds));
      }
    }
    setSelectAll(!selectAll);
  };

  const toggleRowExpansion = (rowId) => {
    setExpandedRows((prev) => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  };

  const handleInputFocus = (e) => {
    e.target.style.borderColor = "#9fa8da";
  };

  const handleInputBlur = (e) => {
    e.target.style.borderColor = "#d1d5db";
  };

  const handleButtonHover = (e, isHover, type) => {
    if (type === "search") {
      e.target.style.backgroundColor = isHover ? "#1d4ed8" : "#2563eb";
    } else if (type === "pagination") {
      e.target.style.backgroundColor = isHover ? "#2563eb" : "transparent";
      e.target.style.color = isHover ? "white" : "#374151";
    }
  };

  const handleTabHover = (e, isHover, isActive) => {
    if (!isActive) {
      e.target.style.color = isHover ? "#2563eb" : "#6b7280";
    }
  };

  const showTooltip = (e) => {
    let content = "";
    if (e.target.tagName === "BUTTON" || e.target.closest("button")) {
      const button =
        e.target.tagName === "BUTTON" ? e.target : e.target.closest("button");
      if (button.title) {
        content = button.title;
      }
    } else if (e.target.type === "checkbox") {
      content = "Pilih baris ini";
    } else if (e.target.tagName === "TD" || e.target.tagName === "TH") {
      content = e.target.textContent.trim();
    }
    if (!content && e.target.textContent.trim()) {
      content = e.target.textContent.trim();
    }
    if (!content) {
      content = "Informasi";
    }
    const rect = e.target.getBoundingClientRect();
    setTooltip({
      visible: true,
      content,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
  };

  const hideTooltip = () => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  const handleAddCustomerInputChange = (field, value) => {
    setAddCustomerFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "partCode") {
        if (value === "EEB") {
          updated.partName = "B224401-1143";
        } else if (value === "EHC") {
          updated.partName = "B224401-1043";
        } else if (value === "ECC") {
          updated.partName = "B224401-1243";
        } else {
          updated.partName = "";
        }
      }
      return updated;
    });
  };

  const handleAddCustomerSubmit = (e) => {
    e.preventDefault();
    setAddCustomerDetail(false);
    setAddCustomerFormData({
      partCode: "",
      partName: "",
      quantity: "",
      poNumber: "",
      description: "",
    });
  };

  // Colgroup untuk Complete tab
  const getCompleteColgroup = () => {
    return (
      <colgroup>
        <col style={{ width: "4%" }} />
        <col style={{ width: "12%" }} />
        <col style={{ width: "12%" }} />
        <col style={{ width: "20%" }} />
        <col style={{ width: "8%" }} />
        <col style={{ width: "25%" }} />
        <col style={{ width: "8%" }} />
      </colgroup>
    );
  };

  const getColgroup = () => {
    if (activeTab === "Complete") {
      return getCompleteColgroup();
    }
    // Default colgroup untuk tab lainnya
    return (
      <colgroup>
        <col style={{ width: "25px" }} />
        <col style={{ width: "3.3%" }} />
        <col style={{ width: "23px" }} />
        <col style={{ width: "15%" }} />
        <col style={{ width: "15%" }} />
        <col style={{ width: "15%" }} />
        <col style={{ width: "12%" }} />
        <col style={{ width: "12%" }} />
        <col style={{ width: "12%" }} />
        <col style={{ width: "12%" }} />
        <col style={{ width: "15%" }} />
        <col style={{ width: "12%" }} />
      </colgroup>
    );
  };

  const getColSpanCount = () => {
    if (activeTab === "Complete") return 7;
    if (activeTab === "New") return 12;
    if (activeTab === "OnProgress") return 10;
    return 9;
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
      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
      border: "1px solid #e5e7eb",
      padding: "32px",
    },
    combinedHeaderFilter: {
      backgroundColor: "white",
      padding: "24px",
      borderRadius: "8px",
      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
      border: "1px solid #e5e7eb",
      marginBottom: "20px",
    },
    headerRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "24px",
    },
    title: {
      fontSize: "20px",
      fontWeight: "600",
      color: "#1f2937",
      margin: 0,
    },
    filterRow: {
      display: "grid",
      alignItems: "center",
      gap: "12px",
      marginBottom: "16px",
    },
    inputGroup: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    label: {
      fontSize: "12px",
      color: "#374151",
      fontWeight: "500",
    },
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
      transition: "border-color 0.2s ease",
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
      transition: "border-color 0.2s ease",
    },
    button: {
      padding: "8px 16px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: "500",
      transition: "background-color 0.2s ease, color 0.2s ease",
      fontFamily: "inherit",
      backgroundColor: "#2563eb",
      color: "white",
      gap: "8px",
      display: "flex",
    },
    actionButtonsGroup: {
      display: "flex",
      gap: "8px",
      marginBottom: "15px",
      marginTop: "10px",
      right: "10px",
    },
    primaryButton: {
      backgroundColor: "#2563eb",
      color: "white",
    },
    successButton: {
      backgroundColor: "#22c55e",
      color: "white",
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
      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
      border: "1.5px solid #e5e7eb",
      overflowX: "auto",
      width: "calc(100% - 10px)",
    },
    tableBodyWrapper: {
      overflowX: "auto",
      border: "1.5px solid #9fa8da",
      borderBottom: "none",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      tableLayout: "fixed",
    },
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
      textAlign: "center",
    },
    expandedTableContainer: {
      marginBottom: "1px",
      marginLeft: "71px",
      backgroundColor: "white",
      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
      overflowX: "auto",
      width: "calc(100% - 85px)",
    },
    expandedTable: {
      width: "100%",
      borderCollapse: "collapse",
      border: "1.5px solid #9fa8da",
      tableLayout: "fixed",
    },
    expandedTableHeader: {
      backgroundColor: "#e0e7ff",
      color: "#374151",
      fontWeight: "600",
      fontSize: "12px",
      textAlign: "center",
      height: "10px",
    },
    expandedWithLeftBorder: {
      border: "0.5px solid #9fa8da",
      whiteSpace: "nowrap",
      backgroundColor: "#e0e7ff",
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
    paginationBar: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: "#e0e7ff",
      padding: "8px 16px",
      border: "1.5px solid #9fa8da",
      borderTop: "none",
      borderRadius: "0 0 8px 8px",
    },
    paginationControls: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "12px",
      color: "#374151",
    },
    paginationButton: {
      padding: "4px 8px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      backgroundColor: "white",
      cursor: "pointer",
      fontSize: "12px",
      fontFamily: "inherit",
    },
    paginationInput: {
      width: "30px",
      height: "24px",
      textAlign: "center",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      fontSize: "12px",
      fontFamily: "inherit",
    },
    tooltip: {
      position: "fixed",
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      color: "white",
      padding: "5px 10px",
      borderRadius: "4px",
      fontSize: "11px",
      zIndex: 1000,
      whiteSpace: "nowrap",
      pointerEvents: "none",
      opacity: tooltip.visible ? 1 : 0,
      transition: "opacity 0.2s",
      left: `${tooltip.x}px`,
      top: `${tooltip.y}px`,
      transform: "translate(-50%, -100%)",
    },
    saveConfiguration: {
      display: "flex",
      gap: "8px",
      marginTop: "10px",
      marginLeft: "10px",
    },
    editButton: {
      backgroundColor: "#e0e7ff",
      color: "black",
      padding: "4px 8px",
      fontSize: "12px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      marginRight: "4px",
    },
    deleteButton: {
      backgroundColor: "#fee2e2",
      color: "#dc2626",
      padding: "4px 8px",
      fontSize: "12px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
    },
    dataFromBadge: {
      padding: "2px 8px",
      borderRadius: "4px",
      fontSize: "11px",
      fontWeight: "500",
    },
    dataFromCreate: {
      backgroundColor: "#dbeafe",
      color: "#1e40af",
    },
    dataFromSample: {
      backgroundColor: "#fef3c7",
      color: "#92400e",
    },
  };

  const customerDetailStyles = {
    popupOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
    },
    popupContainer: {
      backgroundColor: "white",
      borderRadius: "8px",
      padding: "24px",
      minWidth: "400px",
      maxWidth: "500px",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    },
    popupHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px",
    },
    popupTitle: {
      fontSize: "18px",
      fontWeight: "600",
      color: "#1f2937",
      margin: 0,
    },
    closeButton: {
      background: "none",
      border: "none",
      fontSize: "24px",
      cursor: "pointer",
      color: "#6b7280",
    },
    form: {
      display: "flex",
      flexDirection: "column",
      gap: "16px",
    },
    formGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "4px",
    },
    label: {
      fontSize: "12px",
      fontWeight: "500",
      color: "#374151",
    },
    input: {
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      fontSize: "12px",
    },
    select: {
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      fontSize: "12px",
      backgroundColor: "white",
    },
    buttonGroup: {
      display: "flex",
      justifyContent: "flex-end",
      gap: "8px",
      marginTop: "16px",
    },
    cancelButton: {
      padding: "8px 16px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      background: "white",
      cursor: "pointer",
    },
    submitButton: {
      padding: "8px 16px",
      border: "none",
      borderRadius: "4px",
      background: "#3b82f6",
      color: "white",
      cursor: "pointer",
    },
  };

  // Render Complete Tab Table
  const renderCompleteTable = () => {
    return (
      <div style={styles.tableContainer}>
        <div style={styles.tableBodyWrapper}>
          <table
            style={{
              ...styles.table,
              minWidth: "900px",
              tableLayout: "fixed",
            }}
          >
            {getCompleteColgroup()}
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.expandedTh}>No</th>
                <th style={styles.thWithLeftBorder}>Production Date</th>
                <th style={styles.thWithLeftBorder}>Part Code</th>
                <th style={styles.thWithLeftBorder}>Part Name</th>
                <th style={styles.thWithLeftBorder}>Data From</th>
                <th style={styles.thWithLeftBorder}>Approved By</th>
                <th style={styles.thWithLeftBorder}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      ...styles.tdWithLeftBorder,
                      textAlign: "center",
                      color: "#6b7280",
                      padding: "20px",
                    }}
                  >
                    Loading…
                  </td>
                </tr>
              )}
              {!loading &&
                completeQCChecks.map((item, index) => (
                  <tr
                    key={item.id}
                    onMouseEnter={(e) =>
                      (e.target.closest("tr").style.backgroundColor = "#c7cde8")
                    }
                    onMouseLeave={(e) =>
                      (e.target.closest("tr").style.backgroundColor =
                        "transparent")
                    }
                  >
                    <td style={styles.tdWithLeftBorder}>{index + 1}</td>
                    <td style={styles.tdWithLeftBorder}>
                      {toDDMMYYYY(item.production_date)}
                    </td>
                    <td style={styles.tdWithLeftBorder}>{item.part_code}</td>
                    <td style={styles.tdWithLeftBorder}>{item.part_name}</td>
                    <td style={styles.tdWithLeftBorder}>
                      <span
                        style={{
                          ...styles.dataFromBadge,
                          ...(item.data_from === "Create"
                            ? styles.dataFromCreate
                            : styles.dataFromSample),
                        }}
                      >
                        {item.data_from || "Create"}
                      </span>
                    </td>
                    <td style={styles.tdWithLeftBorder}>
                      {formatApprovedBy(item.approved_by, item.approved_at)}
                    </td>
                    <td style={styles.tdWithLeftBorder}>
                      <button
                        style={styles.deleteButton}
                        onClick={() => handleDeleteQCCheck(item.id)}
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div style={styles.paginationBar}>
          <div style={styles.paginationControls}>
            <button style={styles.paginationButton}>{"<<"}</button>
            <button style={styles.paginationButton}>{"<"}</button>
            <span>Page</span>
            <input
              type="text"
              value="1"
              style={styles.paginationInput}
              readOnly
            />
            <span>of 1</span>
            <button style={styles.paginationButton}>{">"}</button>
            <button style={styles.paginationButton}>{">>"}</button>
          </div>
        </div>
      </div>
    );
  };

  // Render default table untuk tab lainnya
  const renderDefaultTable = () => {
    return (
      <div style={styles.tableContainer}>
        <div style={styles.tableBodyWrapper}>
          <table
            style={{
              ...styles.table,
              minWidth: "1200px",
              tableLayout: "fixed",
            }}
          >
            {getColgroup()}
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.expandedTh}>No</th>
                {activeTab === "New" && (
                  <th style={styles.thWithLeftBorder}>
                    {filteredSchedules.length > 1 && (
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={toggleSelectAll}
                        style={{
                          margin: "0 auto",
                          display: "block",
                          cursor: "pointer",
                          width: "12px",
                          height: "12px",
                        }}
                      />
                    )}
                  </th>
                )}
                <th style={styles.thWithLeftBorder}></th>
                <th style={styles.thWithLeftBorder}>Date</th>
                <th style={styles.thWithLeftBorder}>Line</th>
                <th style={styles.thWithLeftBorder}>Shift Time</th>
                <th style={styles.thWithLeftBorder}>Total Input</th>
                <th style={styles.thWithLeftBorder}>Total Customer</th>
                <th style={styles.thWithLeftBorder}>Total Model</th>
                <th style={styles.thWithLeftBorder}>Total Pallet</th>
                <th style={styles.thWithLeftBorder}>Created By</th>
                {(activeTab === "New" || activeTab === "OnProgress") && (
                  <th style={styles.thWithLeftBorder}>Action</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={getColSpanCount()}
                    style={{
                      ...styles.tdWithLeftBorder,
                      textAlign: "center",
                      color: "#6b7280",
                    }}
                  >
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td
                    colSpan={getColSpanCount()}
                    style={{
                      ...styles.tdWithLeftBorder,
                      textAlign: "center",
                      color: "#ef4444",
                    }}
                  >
                    {error}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={styles.paginationBar}>
          <div style={styles.paginationControls}>
            <button style={styles.paginationButton}>{"<<"}</button>
            <button style={styles.paginationButton}>{"<"}</button>
            <span>Page</span>
            <input
              type="text"
              value="1"
              style={styles.paginationInput}
              readOnly
            />
            <span>of 1</span>
            <button style={styles.paginationButton}>{">"}</button>
            <button style={styles.paginationButton}>{">>"}</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.pageContainer}>
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
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          }}
        >
          {toastMessage}
        </div>
      )}

      <div style={styles.welcomeCard}>
        <div style={styles.combinedHeaderFilter}>
          <div style={styles.headerRow}>
            <h1 style={styles.title}>Quality Part</h1>
          </div>

          <div style={styles.filterRow}>
            <div style={styles.inputGroup}>
              <span style={styles.label}>Date Filter</span>
              <select
                style={styles.select}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              >
                <option style={optionStyle}>Search Date</option>
              </select>
              <input
                type="date"
                style={styles.input}
                placeholder="Date From"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
              <span style={styles.label}>To</span>
              <input
                type="date"
                style={styles.input}
                placeholder="Date To"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </div>
            <div style={styles.inputGroup}>
              <span style={styles.label}>Search By</span>
              <select
                style={styles.select}
                value={searchBy}
                onChange={(e) => setSearchBy(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              >
                <option style={optionStyle}>Customer</option>
                <option style={optionStyle}>Product Code</option>
                <option style={optionStyle}>Product Description</option>
              </select>
              <input
                type="text"
                style={styles.input}
                placeholder="Input Keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
              <button
                style={styles.button}
                onMouseEnter={(e) => handleButtonHover(e, true, "search")}
                onMouseLeave={(e) => handleButtonHover(e, false, "search")}
              >
                Search
              </button>
            </div>
          </div>
        </div>

        <div style={styles.actionButtonsGroup}>
          <button
            style={{ ...styles.button, ...styles.primaryButton }}
            onMouseEnter={(e) => handleButtonHover(e, true, "search")}
            onMouseLeave={(e) => handleButtonHover(e, false, "search")}
            onClick={() => navigate("/qc-part/add")}
          >
            <Plus size={16} />
            Create
          </button>

          {activeTab === "OnProgress" && selectedHeaderIds.size > 0 && (
            <button
              style={{
                ...styles.button,
                ...styles.successButton,
                ...(saveLoading && { opacity: 0.7, cursor: "not-allowed" }),
              }}
              onMouseEnter={(e) => handleButtonHover(e, true, "search")}
              onMouseLeave={(e) => handleButtonHover(e, false, "search")}
              disabled={saveLoading}
            >
              <Save size={16} />
              {saveLoading
                ? "Currently"
                : `Complete (${selectedHeaderIds.size})`}
            </button>
          )}
        </div>

        <div style={styles.tabsContainer}>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "Current Check" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("Current Check")}
            onMouseEnter={(e) =>
              handleTabHover(e, true, activeTab === "Current Check")
            }
            onMouseLeave={(e) =>
              handleTabHover(e, false, activeTab === "Current Check")
            }
          >
            Current Check
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "Complete" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("Complete")}
            onMouseEnter={(e) =>
              handleTabHover(e, true, activeTab === "Complete")
            }
            onMouseLeave={(e) =>
              handleTabHover(e, false, activeTab === "Complete")
            }
          >
            Complete
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "Reject" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("Reject")}
            onMouseEnter={(e) =>
              handleTabHover(e, true, activeTab === "Reject")
            }
            onMouseLeave={(e) =>
              handleTabHover(e, false, activeTab === "Reject")
            }
          >
            Reject
          </button>
        </div>

        {activeTab === "Complete" ? renderCompleteTable() : renderDefaultTable()}

        {activeTab === "New" && hasNewSchedules && (
          <div style={styles.saveConfiguration}>
            <button
              style={{
                ...styles.button,
                ...styles.primaryButton,
                ...(saveLoading && { opacity: 0.7, cursor: "not-allowed" }),
              }}
              onMouseEnter={(e) => handleButtonHover(e, true, "search")}
              onMouseLeave={(e) => handleButtonHover(e, false, "search")}
              disabled={saveLoading}
            >
              <Save size={16} />
              {saveLoading ? "Menyimpan..." : "Save Schedule"}
            </button>
          </div>
        )}

        {activeTab === "OnProgress" && selectedHeaderIds.size > 0 && (
          <div style={styles.saveConfiguration}>
            <button
              style={{
                ...styles.button,
                ...styles.successButton,
                ...(saveLoading && { opacity: 0.7, cursor: "not-allowed" }),
              }}
              onMouseEnter={(e) => handleButtonHover(e, true, "search")}
              onMouseLeave={(e) => handleButtonHover(e, false, "search")}
              disabled={saveLoading}
            >
              <Save size={16} />
              {saveLoading
                ? "Menyelesaikan..."
                : `Complete ${selectedHeaderIds.size} Schedule`}
            </button>
          </div>
        )}
      </div>

      {addCustomerDetail && (
        <div style={customerDetailStyles.popupOverlay}>
          <div style={customerDetailStyles.popupContainer}>
            <div style={customerDetailStyles.popupHeader}>
              <h3 style={customerDetailStyles.popupTitle}>
                Add Customer Detail
              </h3>
              <button
                style={customerDetailStyles.closeButton}
                onClick={() => setAddCustomerDetail(false)}
              >
                ×
              </button>
            </div>
            <form
              onSubmit={handleAddCustomerSubmit}
              style={customerDetailStyles.form}
            >
              <div style={customerDetailStyles.formGroup}>
                <label style={customerDetailStyles.label}>Customer:</label>
                <select
                  value={addCustomerFormData.partCode}
                  onChange={(e) =>
                    handleAddCustomerInputChange("partCode", e.target.value)
                  }
                  style={customerDetailStyles.select}
                  required
                >
                  <option value="">Select Customer</option>
                  <option value="EEB">EEB</option>
                  <option value="EHC">EHC</option>
                  <option value="ECC">ECC</option>
                </select>
              </div>

              <div style={customerDetailStyles.formGroup}>
                <label style={customerDetailStyles.label}>Material Code:</label>
                <input
                  type="text"
                  value={addCustomerFormData.partName}
                  onChange={(e) =>
                    handleAddCustomerInputChange("partName", e.target.value)
                  }
                  placeholder="Material code will be set automatically"
                  style={customerDetailStyles.input}
                />
              </div>

              <div style={customerDetailStyles.formGroup}>
                <label style={customerDetailStyles.label}>Input:</label>
                <input
                  type="number"
                  value={addCustomerFormData.quantity}
                  onChange={(e) =>
                    handleAddCustomerInputChange("input", e.target.value)
                  }
                  placeholder="Enter Input"
                  style={customerDetailStyles.input}
                  required
                />
              </div>

              <div style={customerDetailStyles.formGroup}>
                <label style={customerDetailStyles.label}>PO Number:</label>
                <input
                  type="text"
                  value={addCustomerFormData.poNumber || ""}
                  onChange={(e) =>
                    handleAddCustomerInputChange("poNumber", e.target.value)
                  }
                  placeholder="Enter PO number"
                  style={customerDetailStyles.input}
                />
              </div>

              <div style={customerDetailStyles.formGroup}>
                <label style={customerDetailStyles.label}>Description:</label>
                <input
                  type="text"
                  value={addCustomerFormData.description || ""}
                  onChange={(e) =>
                    handleAddCustomerInputChange("description", e.target.value)
                  }
                  placeholder="Enter description"
                  style={customerDetailStyles.input}
                />
              </div>

              <div style={customerDetailStyles.buttonGroup}>
                <button
                  type="button"
                  onClick={() => setAddCustomerDetail(false)}
                  style={customerDetailStyles.cancelButton}
                >
                  Cancel
                </button>
                <button type="submit" style={customerDetailStyles.submitButton}>
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={styles.tooltip}>{tooltip.content}</div>
    </div>
  );
};

const FragmentLike = ({ children }) => children;

export default QCCheckPage;