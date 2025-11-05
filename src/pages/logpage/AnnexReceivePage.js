"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdArrowRight, MdArrowDropDown } from "react-icons/md";
import { Plus, Trash2, Pencil, Save, X } from "lucide-react";

const AnnexReceivePage = ({ sidebarVisible }) => {
  const navbarTotalHeight = 164;
  const sidebarWidth = 288;
  const navigate = useNavigate();
  const tableData = [];
  const [selectedStockLevel, setSelectedStockLevel] = useState("M101");
  const [selectedModel, setSelectedModel] = useState("Veronicas");
  const [selectedAnnexUpdate, setSelectedAnnexUpdate] =
    useState("ZAHRUL ROMADHON");
  const [scheduleDate, setScheduleDate] = useState("");
  const [expandedRows, setExpandedRows] = useState({});
  const [expandedVendorRows, setExpandedVendorRows] = useState({});
  const [addVendorDetail, setAddVendorDetail] = useState(false);
  const [addVendorFormData, setAddVendorFormData] = useState({
    partCode: "",
    partName: "",
    quantity: "",
  });

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
        ? styles.tabButtonHover.color
        : styles.tabButton.color;
    }
  };

  const [activeTab, setActiveTab] = useState("Veronica");

  const styles = {
    pageContainer: {
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'",
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
      marginBottom: "24px",
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
    button: {
      padding: "8px 16px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: "500",
      transition: "background-color 0.2s ease, color 0.2s ease",
      fontFamily: "inherit",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    primaryButton: {
      backgroundColor: "#2563eb",
      color: "white",
    },
    primaryButtonHover: {
      backgroundColor: "#1d4ed8",
    },
    filterRow: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
      marginBottom: "16px",
      flexWrap: "wrap",
    },
    inputGroup: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    label: {
      fontSize: "12px",
      fontWeight: "500",
      color: "#4b5563",
      marginBottom: "3px",
      display: "block",
    },
    input: {
      display: "flex",
      height: "20px",
      width: "25%",
      borderRadius: "6px",
      border: "1px solid #d1d5db",
      backgroundColor: "#ffffff",
      padding: "8px 12px",
      fontSize: "12px",
      outline: "none",
      boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    },
    select: {
      display: "flex",
      height: "35px",
      width: "40%",
      borderRadius: "6px",
      border: "1px solid #d1d5db",
      backgroundColor: "#ffffff",
      padding: "8px 12px",
      fontSize: "14px",
      outline: "none",
      boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
      cursor: "pointer",
    },
    searchButton: {
      backgroundColor: "#2563eb",
      color: "white",
    },
    searchButtonHover: {
      backgroundColor: "#1d4ed8",
    },
    labelIdInput: {
      width: "200px",
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
    tableRowHover: {
      "&:hover": {
        backgroundColor: "#f3f4f6",
        cursor: "pointer",
      },
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
    tabButtonHover: {
      color: "#2563eb",
    },
    formGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      minWidth: "200px",
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

  return (
    <div style={styles.pageContainer}>
      <div style={styles.tooltip}>
        {tooltip.content}
        <div style={styles.tooltipArrow}></div>
      </div>
      <div style={styles.welcomeCard}>
        <div style={styles.combinedHeaderFilter}>
          <div style={styles.headerRow}>
            <h1 style={styles.title}>Receive Request</h1>
          </div>

          <div style={styles.filterRow}>
            <div style={styles.inputGroup}>
              <span style={styles.label}>Date Filter</span>
              <select style={styles.select}>
                <option>Search Date</option>
              </select>
              <input type="date" style={styles.input} placeholder="Date From" />
              <span style={styles.label}>To</span>
              <input type="date" style={styles.input} placeholder="Date To" />
            </div>
            <div
              style={{ borderLeft: "1px solid #e5e7eb", height: "32px" }}
            ></div>
            <div style={styles.inputGroup}>
              <span style={styles.label}>Search By</span>
              <select style={styles.select}>
                <option>Search By</option>
              </select>
              <input
                type="text"
                style={styles.input}
                placeholder="Input Keyword"
              />
              <button
                style={{ ...styles.button, ...styles.searchButton }}
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
              style={{ ...styles.input, ...styles.labelIdInput }}
            />
          </div>
        </div>

        <div style={styles.tabsContainer}>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "New" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("New")}
            onMouseEnter={(e) => handleTabHover(e, true, activeTab === "New")}
            onMouseLeave={(e) => handleTabHover(e, false, activeTab === "New")}
          >
            Waiting
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
              ...(activeTab === "InTransit" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("InTransit")}
            onMouseEnter={(e) =>
              handleTabHover(e, true, activeTab === "InTransit")
            }
            onMouseLeave={(e) =>
              handleTabHover(e, false, activeTab === "InTransit")
            }
          >
            InTransit
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
              ...(activeTab === "Rejected" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("Rejected")}
            onMouseEnter={(e) =>
              handleTabHover(e, true, activeTab === "Rejected")
            }
            onMouseLeave={(e) =>
              handleTabHover(e, false, activeTab === "Rejected")
            }
          >
            Rejected
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
                <col
                  style={{
                    width: "25px",
                    minWidth: "25px",
                    maxWidth: "25px",
                  }}
                />
                <col
                  style={{
                    width: "25px",
                    minWidth: "25px",
                    maxWidth: "25px",
                  }}
                />
                <col style={{ width: "25%" }} />
                <col style={{ width: "25%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "25%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "15%" }} />
              </colgroup>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.expandedTh}>No</th>
                  <th style={styles.thWithLeftBorder}></th>
                  <th style={styles.thWithLeftBorder}>Stock Level</th>
                  <th style={styles.thWithLeftBorder}>Model</th>
                  <th style={styles.thWithLeftBorder}>Total Vendor</th>
                  <th style={styles.thWithLeftBorder}>Total Pallet</th>
                  <th style={styles.thWithLeftBorder}>Total Item</th>
                  <th style={styles.thWithLeftBorder}>Annex Update</th>
                  <th style={styles.thWithLeftBorder}>Schedule Date</th>
                  <th style={styles.thWithLeftBorder}>Last Update</th>
                  <th style={styles.thWithLeftBorder}>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  onMouseEnter={(e) =>
                    (e.target.closest("tr").style.backgroundColor = "#c7cde8")
                  }
                  onMouseLeave={(e) =>
                    (e.target.closest("tr").style.backgroundColor =
                      "transparent")
                  }
                >
                  <td
                    style={{
                      ...styles.expandedTd,
                      ...styles.expandedWithLeftBorder,
                      ...styles.emptyColumn,
                    }}
                  >
                    1
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
                    style={styles.tdWithLeftBorder}
                    onMouseEnter={showTooltip}
                    onMouseLeave={hideTooltip}
                  >
                    M101 | SCN-MH
                  </td>
                  <td
                    style={styles.tdWithLeftBorder}
                    onMouseEnter={showTooltip}
                    onMouseLeave={hideTooltip}
                  >
                    Veronicas
                  </td>
                  <td
                    style={styles.tdWithLeftBorder}
                    onMouseEnter={showTooltip}
                    onMouseLeave={hideTooltip}
                  >
                    2
                  </td>
                  <td
                    style={styles.tdWithLeftBorder}
                    onMouseEnter={showTooltip}
                    onMouseLeave={hideTooltip}
                  >
                    4
                  </td>
                  <td
                    style={styles.tdWithLeftBorder}
                    onMouseEnter={showTooltip}
                    onMouseLeave={hideTooltip}
                  >
                    12
                  </td>
                  <td
                    style={styles.tdWithLeftBorder}
                    onMouseEnter={showTooltip}
                    onMouseLeave={hideTooltip}
                  >
                    ZAHRUL ROMADHON
                  </td>
                  <td
                    style={styles.tdWithLeftBorder}
                    onMouseEnter={showTooltip}
                    onMouseLeave={hideTooltip}
                  >
                    18/08/2025
                  </td>
                  <td
                    style={styles.tdWithLeftBorder}
                    onMouseEnter={showTooltip}
                    onMouseLeave={hideTooltip}
                  >
                    15/08/2025
                  </td>
                  <td style={styles.tdWithLeftBorder}>
                    <button
                      style={styles.deleteButton}
                      onMouseEnter={showTooltip}
                      onMouseLeave={hideTooltip}
                    >
                      <Trash2 size={10} />
                      Reject
                    </button>
                  </td>
                </tr>

                <tr
                  onMouseEnter={(e) =>
                    (e.target.closest("tr").style.backgroundColor = "#c7cde8")
                  }
                  onMouseLeave={(e) =>
                    (e.target.closest("tr").style.backgroundColor =
                      "transparent")
                  }
                >
                  <td
                    style={{
                      ...styles.expandedTd,
                      ...styles.expandedWithLeftBorder,
                      ...styles.emptyColumn,
                    }}
                  >
                    2
                  </td>
                  <td style={styles.tdWithLeftBorder}>
                    {" "}
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
                  <td style={styles.tdWithLeftBorder}>M101 | SCN-MH</td>
                  <td style={styles.tdWithLeftBorder}>Veronicas</td>
                  <td style={styles.tdWithLeftBorder}>3</td>
                  <td style={styles.tdWithLeftBorder}>6</td>
                  <td style={styles.tdWithLeftBorder}>18</td>
                  <td style={styles.tdWithLeftBorder}>ZAHRUL ROMADHON</td>
                  <td style={styles.tdWithLeftBorder}>19/08/2025</td>
                  <td style={styles.tdWithLeftBorder}>15/08/2025</td>
                  <td style={styles.tdWithLeftBorder}>
                    <button style={styles.deleteButton}>
                      <Trash2 size={10} />
                      Reject
                    </button>
                  </td>
                </tr>
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
            Input Schedule
          </button>
        </div>
      </div>

      {addVendorDetail && (
        <div style={styles.popupOverlay}>
          <div style={styles.popupContainer}>
            <div style={styles.popupHeader}>
              <h3 style={styles.popupTitle}>Add Vendor Detail</h3>
              <button
                style={styles.closeButton}
                onClick={() => setAddVendorDetail(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddVendorSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.labelPopUp}>Trip</label>
                <select
                  style={styles.inputPopUp}
                  value={addVendorFormData.partCode}
                  onChange={(e) =>
                    handleAddVendorInputChange("partCode", e.target.value)
                  }
                  required
                >
                  <option value="">Select Trip</option>
                  <option value="Trip-01">Trip-01</option>
                  <option value="Trip-02">Trip-02</option>
                  <option value="Trip-03">Trip-03</option>
                  <option value="Trip-04">Trip-04</option>
                  <option value="Trip-05">Trip-05</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.labelPopUp}>Vendor Name</label>
                <select
                  style={styles.inputPopUp}
                  value={addVendorFormData.partName}
                  onChange={(e) =>
                    handleAddVendorInputChange("partName", e.target.value)
                  }
                  required
                >
                  <option value="">Select Vendor</option>
                  <option value="188646 - PT. DAIHO INDONESIA">
                    188646 - PT. DAIHO INDONESIA
                  </option>
                  <option value="188651 - PT SAT NUSAPERSADA TBK">
                    188651 - PT SAT NUSAPERSADA TBK
                  </option>
                  <option value="199869 - PT PRIMA LABELING">
                    199869 - PT PRIMA LABELING
                  </option>
                  <option value="192447 - SANSYU PRECISION SINGAPORE PTE LTD">
                    192447 - SANSYU PRECISION SINGAPORE PTE LTD
                  </option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.labelPopUp}>DO Number</label>
                <input
                  style={styles.inputPopUpDO}
                  onChange={(e) =>
                    handleAddVendorInputChange("", e.target.value)
                  }
                  placeholder=""
                  min="1"
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.labelPopUp}>Arrival Time</label>
                <input
                  type="time"
                  style={styles.input}
                  value={addVendorFormData.quantity}
                  onChange={(e) =>
                    handleAddVendorInputChange("quantity", e.target.value)
                  }
                  placeholder=""
                />
              </div>

              <div style={styles.buttonGroup}>
                <button
                  type="button"
                  style={styles.cancelButton}
                  onClick={() => setAddVendorDetail(false)}
                >
                  Cancel
                </button>
                <button type="submit" style={styles.submitButton}>
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnexReceivePage;
