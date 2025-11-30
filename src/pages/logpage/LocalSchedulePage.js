"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MdArrowRight, MdArrowDropDown } from "react-icons/md";
import { Plus, Trash2, Pencil, Save, X } from "lucide-react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const LocalSchedulePage = ({ sidebarVisible }) => {
  const navbarTotalHeight = 164;
  const sidebarWidth = 288;
  const navigate = useNavigate();
  
  // STATE UNTUK DATA DARI DATABASE
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State yang sudah ada
  const [selectedStockLevel, setSelectedStockLevel] = useState("M101");
  const [selectedModel, setSelectedModel] = useState("Veronicas");
  const [selectedAnnexUpdate, setSelectedAnnexUpdate] = useState("ZAHRUL ROMADHON");
  const [scheduleDate, setScheduleDate] = useState("");
  const [expandedRows, setExpandedRows] = useState({});
  const [expandedVendorRows, setExpandedVendorRows] = useState({});
  const [addVendorDetail, setAddVendorDetail] = useState(false);
  const [addVendorFormData, setAddVendorFormData] = useState({
    partCode: "",
    partName: "",
    quantity: "",
  });

  const [activeTab, setActiveTab] = useState("New");

  // FUNGSI UNTUK AMBIL DATA DARI DATABASE
  useEffect(() => {
    fetchSchedules();
  }, [activeTab]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/local-schedules?status=${activeTab}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setSchedules(result.data || []);
      } else {
        throw new Error(result.message || "Failed to fetch schedules");
      }
    } catch (error) {
      console.error("Error fetching schedules:", error);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  // FUNGSI FORMAT TANGGAL
  const formatDate = (dateString) => {
    try {
      if (!dateString) return "-";
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString) => {
    try {
      if (!dateString) return "-";
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return dateString;
    }
  };

  // FUNGSI YANG SUDAH ADA (TETAP SAMA)
  const toggleRowExpansion = (rowId) => {
    setExpandedRows((prev) => {
      const newExpandedRows = {
        ...prev,
        [rowId]: !prev[rowId],
      };

      if (prev[rowId]) {
        setExpandedVendorRows((prevVendor) => {
          const newVendorRows = { ...prevVendor };
          Object.keys(newVendorRows).forEach((key) => {
            if (
              key.startsWith(`vendor_${rowId}_`) ||
              key === `vendor_${rowId}` ||
              key.includes("vendor_")
            ) {
              delete newVendorRows[key];
            }
          });
          return newVendorRows;
        });
      }
      return newExpandedRows;
    });
  };

  const toggleVendorRowExpansion = (vendorRowId) => {
    setExpandedVendorRows((prev) => ({
      ...prev,
      [vendorRowId]: !prev[vendorRowId],
    }));
  };

  const handleAddVendorSubmit = (e) => {
    e.preventDefault();
    console.log("Third Level Form Data:", addVendorFormData);
    setAddVendorDetail(false);
    setAddVendorFormData({
      partCode: "",
      partName: "",
      quantity: "",
    });
  };

  const handleAddVendorInputChange = (field, value) => {
    setAddVendorFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const openThirdLevelPopup = () => {
    setAddVendorDetail(true);
  };

  const [tooltip, setTooltip] = useState({
    visible: false,
    content: "",
    x: 0,
    y: 0,
  });

  const showTooltip = (e) => {
    let content = "";

    if (e.target.tagName === "BUTTON" || e.target.closest("button")) {
      const button =
        e.target.tagName === "BUTTON" ? e.target : e.target.closest("button");
      if (
        button.querySelector('svg[data-icon="plus"]') ||
        (button.querySelector("svg") &&
          button.querySelector("svg").parentElement.contains(e.target) &&
          button.querySelector('[size="10"]'))
      ) {
        content = "Add";
      } else if (
        button.querySelector('svg[data-icon="trash-2"]') ||
        (button.querySelector("svg") &&
          button.querySelector("svg").parentElement.contains(e.target) &&
          button.classList.contains("delete-button"))
      ) {
        content = "Delete";
      } else if (button.title) {
        content = button.title;
      } else if (button.querySelector("svg")) {
        const icon = button.querySelector("svg").parentElement;
        if (icon) {
          if (icon.contains(e.target)) {
            if (button.querySelector('[size="10"]')) {
              content = "Add";
            } else {
              content = "Perluas/sembunyikan detail";
            }
          }
        }
      }
    } else if (e.target.type === "checkbox") {
      content = "Pilih baris ini";
    } else if (e.target.tagName === "TD" || e.target.tagName === "TH") {
      content = e.target.textContent.trim();
      if (!content) {
        if (e.target.cellIndex === 1) {
          content = "Pilih baris ini";
        } else if (e.target.cellIndex === 2) {
          content = "Perluas/sembunyikan detail";
        }
      }
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
    setTooltip({
      ...tooltip,
      visible: false,
    });
  };

  const handleInputFocus = (e) => {
    e.target.style.borderColor = "#9fa8da";
  };

  const handleInputBlur = (e) => {
    e.target.style.borderColor = "#d1d5db";
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
      marginBottom: "10px",
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
    actionButtonsGroup: {
      display: "flex",
      gap: "8px",
      marginBottom: "24px",
      marginTop: "10px",
      right: "10px",
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
    inputFocus: {
      border: "2px solid #9fa8da",
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
    selectFocus: {
      border: "2px solid #9fa8da",
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
    labelIdInput: {
      height: "32px",
      border: "2px solid #d1d5db",
      borderRadius: "4px",
      padding: "0 12px",
      fontSize: "12px",
      backgroundColor: "white",
      fontFamily: "inherit",
      minWidth: "200px",
      outline: "none",
      transition: "border-color 0.2s ease",
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

    primaryButton: {
      backgroundColor: "#2563eb",
      color: "white",
    },
    primaryButtonHover: {
      backgroundColor: "#1d4ed8",
    },
    searchButton: {
      backgroundColor: "#2563eb",
      color: "white",
    },
    searchButtonHover: {
      backgroundColor: "#1d4ed8",
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
    },
    expandedTableContainer: {
      marginBottom: "1px",
      marginLeft: "77px",
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
    expandedTdWtihTopBorder: {
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
    thirdLevelTableContainer: {
      marginLeft: "49px",
      backgroundColor: "white",
      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
      overflowX: "auto",
      width: "calc(100% - 85px)",
    },
    thirdLevelTable: {
      width: "100%",
      borderCollapse: "collapse",
      border: "1.5px solid #9fa8da",
      tableLayout: "fixed",
    },
    thirdLevelTableHeader: {
      backgroundColor: "#e0e7ff",
      color: "#374151",
      fontWeight: "600",
      fontSize: "12px",
      textAlign: "center",
    },
    thirdLeveWithLeftBorder: {
      border: "0.5px solid #9fa8da",
      whiteSpace: "nowrap",
      backgroundColor: "#e0e7ff",
    },
    thirdLevelTh: {
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
    thirdLevelTd: {
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
      fontSize: "12px",
      color: "#374151",
      height: "20px",
    },
    paginationControls: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    paginationButton: {
      backgroundColor: "transparent",
      border: "0.5px solid #a5b4fc",
      borderRadius: "4px",
      padding: "4px 8px",
      cursor: "pointer",
      color: "#374151",
      fontSize: "10px",
      fontWeight: "1000",
      transition: "background-color 0.2s ease, color 0.2s ease",
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
    popupOverlay: {
      position: "fixed",
      top: 150,
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
      width: "500px",
      maxWidth: "90vw",
      maxHeight: "90vh",
      overflow: "auto",
      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
    },
    popupHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: "1px solid #e5e7eb",
      paddingBottom: "12px",
    },
    popupTitle: {
      fontSize: "18px",
      fontWeight: "600",
      color: "#374151",
      margin: 0,
    },
    closeButton: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "4px",
      borderRadius: "4px",
      color: "#6b7280",
    },
    buttonGroup: {
      display: "flex",
      gap: "12px",
      justifyContent: "flex-end",
      marginTop: "24px",
      paddingTop: "16px",
      borderTop: "1px solid #e5e7eb",
    },
    submitButton: {
      backgroundColor: "#2563eb",
      color: "white",
      padding: "8px 16px",
      border: "none",
      borderRadius: "4px",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
    },
    cancelButton: {
      backgroundColor: "#f3f4f6",
      color: "#374151",
      padding: "8px 16px",
      border: "none",
      borderRadius: "4px",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
    },
    labelPopUp: {
      fontSize: "12px",
      fontWeight: "500",
      color: "#4b5563",
      marginTop: "5px",
      display: "block",
    },
    inputPopUp: {
      display: "flex",
      height: "51px",
      width: "70%",
      borderRadius: "8px",
      border: "2px solid #e5e7eb",
      backgroundColor: "#ffffff",
      padding: "16px 20px",
      fontSize: "12px",
      outline: "none",
      boxShadow:
        "0 1px 3px 0 rgba(0, 0, 0, 0.1), inset 0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      transition: "all 0.3s ease",
      fontFamily: "inherit",
      fontWeight: "500",
    },
    inputPopUpDO: {
      display: "flex",
      height: "13px",
      width: "62%",
      borderRadius: "8px",
      border: "2px solid #e5e7eb",
      backgroundColor: "#ffffff",
      padding: "16px 20px",
      fontSize: "14px",
      outline: "none",
      boxShadow:
        "0 1px 3px 0 rgba(0, 0, 0, 0.1), inset 0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      transition: "all 0.3s ease",
      fontFamily: "inherit",
      fontWeight: "500",
    },
    addButton: {
      backgroundColor: "#e0e7ff",
      color: "black",
      padding: "4px 8px",
      fontSize: "12px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      marginLeft: "4px",
    },
    deleteButton: {
      backgroundColor: "#e0e7ff",
      color: "black",
      padding: "4px 8px",
      fontSize: "12px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      marginLeft: "6px",
    },
    arrowButton: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "0px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      height: "5px",
    },
    arrowIcon: {
      fontSize: "25px",
      color: "#9fa8da",
    },
    emptyColumn: {
      width: "auto",
      minWidth: "auto",
      maxWidth: "auto",
      padding: "0",
      textAlign: "center",
    },
    saveConfiguration: {
      display: "flex",
      gap: "8px",
      marginTop: "10px",
      marginLeft: "13px",
    },
    tooltip: {
      position: "fixed",
      top: tooltip.y,
      left: tooltip.x,

      backgroundColor: "rgba(0, 0, 0, 0.8)",
      color: "white",
      padding: "6px 10px",
      borderRadius: "4px",
      fontSize: "12px",
      fontWeight: "500",
      whiteSpace: "nowrap",
      pointerEvents: "none",
      zIndex: 1000,
      opacity: tooltip.visible ? 1 : 0,
      transition: "opacity 0.2s ease",
      maxWidth: "300px",
      boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
    },

    cellContent: {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
  };

  const handleButtonHover = (e, isHover, type) => {
    if (type === "primary") {
      e.target.style.backgroundColor = isHover
        ? styles.primaryButtonHover.backgroundColor
        : styles.primaryButton.backgroundColor;
    } else if (type === "search") {
      e.target.style.backgroundColor = isHover
        ? styles.searchButtonHover.backgroundColor
        : styles.searchButton.backgroundColor;
    } else if (type === "pagination") {
      e.target.style.backgroundColor = isHover
        ? styles.paginationButtonHover.backgroundColor
        : styles.paginationButton.backgroundColor;
      e.target.style.color = isHover
        ? styles.paginationButtonHover.color
        : styles.paginationButton.color;
    }
  };

  const handleTabHover = (e, isHover, isActive) => {
    if (!isActive) {
      e.target.style.color = isHover
        ? styles.tabButtonHover?.color || "#2563eb"
        : styles.tabButton?.color || "#6b7280";
    }
  };

  // FUNGSI RENDER TABLE BODY DENGAN DATA DINAMIS
  const renderTableBody = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan="11" style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}>
            Loading data...
          </td>
        </tr>
      );
    }

    if (schedules.length === 0) {
      return (
        <tr>
          <td colSpan="11" style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}>
            No schedules found for {activeTab} tab
          </td>
        </tr>
      );
    }

    return schedules.map((schedule, index) => (
      <>
        {/* Schedule Row */}
        <tr
          key={schedule.id}
          onMouseEnter={(e) =>
            (e.target.closest("tr").style.backgroundColor = "#c7cde8")
          }
          onMouseLeave={(e) =>
            (e.target.closest("tr").style.backgroundColor = "transparent")
          }
        >
          <td
            style={{
              ...styles.expandedTd,
              ...styles.expandedWithLeftBorder,
              ...styles.emptyColumn,
            }}
          >
            {index + 1}
          </td>
          <td style={styles.tdWithLeftBorder}>
            <input
              type="checkbox"
              style={{
                margin: "0 auto",
                display: "block",
                cursor: "pointer",
                width: "12px",
                height: "12px",
              }}
            />
          </td>
          <td
            style={{
              ...styles.tdWithLeftBorder,
              ...styles.emptyColumn,
            }}
          >
            <button
              style={styles.arrowButton}
              onClick={() => toggleRowExpansion(schedule.id)}
            >
              {expandedRows[schedule.id] ? (
                <MdArrowDropDown style={styles.arrowIcon} />
              ) : (
                <MdArrowRight style={styles.arrowIcon} />
              )}
            </button>
          </td>
          <td style={styles.tdWithLeftBorder}>
            {formatDate(schedule.schedule_date)}
          </td>
          <td style={styles.tdWithLeftBorder}>{schedule.stock_level}</td>
          <td style={styles.tdWithLeftBorder}>{schedule.model_name}</td>
          <td style={styles.tdWithLeftBorder}>{schedule.total_vendor || 0}</td>
          <td style={styles.tdWithLeftBorder}>{schedule.total_pallet || 0}</td>
          <td style={styles.tdWithLeftBorder}>{schedule.total_item || 0}</td>
          <td style={styles.tdWithLeftBorder}>
            {schedule.upload_by_name} | {formatDateTime(schedule.created_at)}
          </td>
          <td style={styles.tdWithLeftBorder}>
            <button style={styles.deleteButton}>
              <Trash2 size={10} />
            </button>
          </td>
        </tr>

        {/* Expanded Vendor Rows */}
        {expandedRows[schedule.id] && (
          <tr key={`expanded-${schedule.id}`}>
            <td colSpan="11" style={{ padding: 0, border: "none" }}>
              <div style={styles.expandedTableContainer}>
                <table style={styles.expandedTable}>
                  <colgroup>
                    <col style={{ width: "25px" }} />
                    <col style={{ width: "25px" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "50%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "10%" }} />
                  </colgroup>
                  <thead>
                    <tr style={styles.expandedTableHeader}>
                      <th style={styles.expandedTh}>No</th>
                      <th style={styles.expandedTh}></th>
                      <th style={styles.expandedTh}>Trip</th>
                      <th style={styles.expandedTh}>Vendor Name</th>
                      <th style={styles.expandedTh}>DO Number</th>
                      <th style={styles.expandedTh}>Arrival Time</th>
                      <th style={styles.expandedTh}>Total Pallet</th>
                      <th style={styles.expandedTh}>Total Item</th>
                      <th style={styles.expandedTh}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.vendors && schedule.vendors.length > 0 ? (
                      schedule.vendors.map((vendor, vendorIndex) => (
                        <>
                          <tr
                            key={vendor.id}
                            onMouseEnter={(e) =>
                              (e.target.closest("tr").style.backgroundColor = "#c7cde8")
                            }
                            onMouseLeave={(e) =>
                              (e.target.closest("tr").style.backgroundColor = "transparent")
                            }
                          >
                            <td
                              style={{
                                ...styles.expandedTd,
                                ...styles.expandedWithLeftBorder,
                                ...styles.emptyColumn,
                              }}
                            >
                              {vendorIndex + 1}
                            </td>
                            <td
                              style={{
                                ...styles.tdWithLeftBorder,
                                ...styles.emptyColumn,
                              }}
                            >
                              <button
                                style={styles.arrowButton}
                                onClick={() => toggleVendorRowExpansion(`vendor_${schedule.id}_${vendorIndex}`)}
                              >
                                {expandedVendorRows[`vendor_${schedule.id}_${vendorIndex}`] ? (
                                  <MdArrowDropDown style={styles.arrowIcon} />
                                ) : (
                                  <MdArrowRight style={styles.arrowIcon} />
                                )}
                              </button>
                            </td>
                            <td style={styles.expandedTd}>{vendor.trip_no || "-"}</td>
                            <td style={styles.expandedTd}>
                              {vendor.vendor_code ? `${vendor.vendor_code} - ${vendor.vendor_name}` : "-"}
                            </td>
                            <td style={styles.expandedTd}>{vendor.do_numbers || "-"}</td>
                            <td style={styles.expandedTd}>{vendor.arrival_time || "-"}</td>
                            <td style={styles.expandedTd}>{vendor.total_pallet || 0}</td>
                            <td style={styles.expandedTd}>{vendor.total_item || 0}</td>
                            <td style={styles.expandedTd}>
                              <button style={styles.deleteButton}>
                                <Trash2 size={10} />
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Parts Rows */}
                          {expandedVendorRows[`vendor_${schedule.id}_${vendorIndex}`] && (
                            <tr key={`parts-${vendor.id}`}>
                              <td colSpan="9" style={{ padding: 0, border: "none" }}>
                                <div style={styles.thirdLevelTableContainer}>
                                  <table style={styles.thirdLevelTable}>
                                    <colgroup>
                                      <col style={{ width: "1.5%" }} />
                                      <col style={{ width: "10%" }} />
                                      <col style={{ width: "20%" }} />
                                      <col style={{ width: "8%" }} />
                                      <col style={{ width: "8%" }} />
                                      <col style={{ width: "8%" }} />
                                      <col style={{ width: "5%" }} />
                                    </colgroup>
                                    <thead>
                                      <tr style={styles.thirdLevelTableHeader}>
                                        <th style={styles.expandedTh}>No</th>
                                        <th style={styles.thirdLevelTh}>Part Code</th>
                                        <th style={styles.thirdLevelTh}>Part Name</th>
                                        <th style={styles.thirdLevelTh}>Qty</th>
                                        <th style={styles.thirdLevelTh}>Qty Box</th>
                                        <th style={styles.thirdLevelTh}>Unit</th>
                                        <th style={styles.thirdLevelTh}>Action</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {vendor.parts && vendor.parts.length > 0 ? (
                                        vendor.parts.map((part, partIndex) => (
                                          <tr
                                            key={part.id}
                                            onMouseEnter={(e) =>
                                              (e.target.closest("tr").style.backgroundColor = "#c7cde8")
                                            }
                                            onMouseLeave={(e) =>
                                              (e.target.closest("tr").style.backgroundColor = "transparent")
                                            }
                                          >
                                            <td
                                              style={{
                                                ...styles.expandedTd,
                                                ...styles.expandedWithLeftBorder,
                                                ...styles.emptyColumn,
                                              }}
                                            >
                                              {partIndex + 1}
                                            </td>
                                            <td style={styles.thirdLevelTd}>{part.part_code || "-"}</td>
                                            <td style={styles.thirdLevelTd}>{part.part_name || "-"}</td>
                                            <td style={styles.thirdLevelTd}>{part.qty || 0}</td>
                                            <td style={styles.thirdLevelTd}>{part.qty_box || 0}</td>
                                            <td style={styles.thirdLevelTd}>{part.unit || "PCS"}</td>
                                            <td style={styles.thirdLevelTd}>
                                              <button style={styles.deleteButton}>
                                                <Trash2 size={10} />
                                              </button>
                                            </td>
                                          </tr>
                                        ))
                                      ) : (
                                        <tr>
                                          <td colSpan="7" style={{ ...styles.thirdLevelTd, textAlign: "center" }}>
                                            No parts found for this vendor
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="9" style={{ ...styles.expandedTd, textAlign: "center" }}>
                          No vendors found for this schedule
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        )}
      </>
    ));
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.tooltip}>
        {tooltip.content}
        <div style={styles.tooltipArrow}></div>
      </div>
      <div style={styles.welcomeCard}>
        <div style={styles.combinedHeaderFilter}>
          <div style={styles.headerRow}>
            <h1 style={styles.title}>Schedule Local Part</h1>
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
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
              <span style={styles.label}>To</span>
              <input
                type="date"
                style={styles.input}
                placeholder="Date To"
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </div>
            <div style={styles.inputGroup}>
              <span style={styles.label}>Search By</span>
              <select
                style={styles.select}
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
          <div style={styles.inputGroup}>
            <span style={styles.label}>Label ID</span>
            <input
              type="text"
              style={styles.labelIdInput}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
          </div>
        </div>

        <div style={styles.actionButtonsGroup}>
          <button
            style={{ ...styles.button, ...styles.primaryButton }}
            onMouseEnter={(e) => handleButtonHover(e, true, "primary")}
            onMouseLeave={(e) => handleButtonHover(e, false, "primary")}
            onClick={() => navigate("/local-schedule/add")}
          >
            <Plus size={16} />
            Create
          </button>
        </div>

        <div style={styles.tabsContainer}>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "New" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("New")}
            onMouseEnter={(e) =>
              handleTabHover(e, true, activeTab === "New")
            }
            onMouseLeave={(e) =>
              handleTabHover(e, false, activeTab === "New")
            }
          >
            New
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "Schedule" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("Schedule")}
            onMouseEnter={(e) =>
              handleTabHover(e, true, activeTab === "Schedule")
            }
            onMouseLeave={(e) =>
              handleTabHover(e, false, activeTab === "Schedule")
            }
          >
            Schedule
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "Today" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("Today")}
            onMouseEnter={(e) => handleTabHover(e, true, activeTab === "Today")}
            onMouseLeave={(e) =>
              handleTabHover(e, false, activeTab === "Today")
            }
          >
            Today
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "Received" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("Received")}
            onMouseEnter={(e) =>
              handleTabHover(e, true, activeTab === "Received")
            }
            onMouseLeave={(e) =>
              handleTabHover(e, false, activeTab === "Received")
            }
          >
            Received
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "IQC Progress" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("IQC Progress")}
            onMouseEnter={(e) =>
              handleTabHover(e, true, activeTab === "IQC Progress")
            }
            onMouseLeave={(e) =>
              handleTabHover(e, false, activeTab === "IQC Progress")
            }
          >
            IQC Progress
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "Sample" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("Sample")}
            onMouseEnter={(e) =>
              handleTabHover(e, true, activeTab === "Sample")
            }
            onMouseLeave={(e) =>
              handleTabHover(e, false, activeTab === "Sample")
            }
          >
            Sample
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
              ...(activeTab === "History" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("History")}
            onMouseEnter={(e) =>
              handleTabHover(e, true, activeTab === "History")
            }
            onMouseLeave={(e) =>
              handleTabHover(e, false, activeTab === "History")
            }
          >
            History
          </button>
        </div>

        <div style={styles.tableContainer}>
          <div style={styles.tableBodyWrapper}>
            <table
              style={{
                ...styles.table,
                minWidth: "1200px",
                tableLayout: "fixed",
              }}
            >
              <colgroup>
                <col style={{ width: "25px" }} />
                <col style={{ width: "2.5%" }} />
                <col style={{ width: "25px" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "25%" }} />
                <col style={{ width: "5%" }} />
              </colgroup>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.expandedTh}>No</th>
                  <th style={styles.thWithLeftBorder}></th>
                  <th style={styles.thWithLeftBorder}></th>
                  <th style={styles.thWithLeftBorder}>Schedule Date</th>
                  <th style={styles.thWithLeftBorder}>Stock Level</th>
                  <th style={styles.thWithLeftBorder}>Model</th>
                  <th style={styles.thWithLeftBorder}>Total Vendor</th>
                  <th style={styles.thWithLeftBorder}>Total Pallet</th>
                  <th style={styles.thWithLeftBorder}>Total Item</th>
                  <th style={styles.thWithLeftBorder}>Upload By</th>
                  <th style={styles.thWithLeftBorder}>Action</th>
                </tr>
              </thead>
              <tbody>
                {renderTableBody()}
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

        <div style={styles.saveConfiguration}>
          <button style={{ ...styles.button, ...styles.primaryButton }}>
            <Save size={16} />
            Save Schedule
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocalSchedulePage;