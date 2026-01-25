"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdArrowRight, MdArrowDropDown } from "react-icons/md";
import { Plus, Trash2, Pencil, Save, Check } from "lucide-react";
import { Helmet } from "react-helmet";

const StorageInventoryPage = ({ sidebarVisible }) => {
  const navigate = useNavigate();
  
  // State declarations
  const [productionSchedules, setProductionSchedules] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [expandedVendorRows, setExpandedVendorRows] = useState({});
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
  const [activeTab, setActiveTab] = useState("New");
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

  // Filtered schedules
  const filteredSchedules = productionSchedules.filter(
    (schedule) => activeTab === "All" || schedule.status === activeTab
  );

  const hasNewSchedules = productionSchedules.some(
    (schedule) => schedule.status === "New"
  );

  // Helper functions
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

  const getColgroup = () => {
    if (activeTab === "New") {
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
    } else if (activeTab === "OnProgress") {
      return (
        <colgroup>
          <col style={{ width: "25px" }} />
          <col style={{ width: "23px" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "15%" }} />
          <col style={{ width: "12%" }} />
        </colgroup>
      );
    } else {
      return (
        <colgroup>
          <col style={{ width: "25px" }} />
          <col style={{ width: "23px" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "18%" }} />
        </colgroup>
      );
    }
  };

  const getColSpanCount = () => {
    if (activeTab === "New") return 12;
    if (activeTab === "OnProgress") return 10;
    return 9;
  };

  // Option style
  const optionStyle = {
    backgroundColor: "#d1d5db",
    color: "#374151",
    fontSize: "12px",
    padding: "4px 8px",
  };

  // Main styles
  const styles = {
    pageContainer: {
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
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
    editButton: {
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
    completeButton: {
      backgroundColor: "#10b981",
      color: "white",
      padding: "4px 8px",
      fontSize: "12px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      marginLeft: "4px",
    },
    successButton: {
      backgroundColor: "#10b981",
      color: "white",
    },
  };

  // Customer detail popup styles
  const customerDetailStyles = {
    popupOverlay: {
      position: "fixed",
      top: 100,
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
      fontSize: "20px",
      cursor: "pointer",
      color: "#6b7280",
    },
    form: {
      marginTop: "16px",
    },
    formGroup: {
      marginBottom: "16px",
    },
    label: {
      display: "block",
      marginBottom: "4px",
      fontWeight: "500",
    },
    select: {
      width: "100%",
      padding: "8px",
      border: "1px solid #d1d5db",
      backgroundColor: "#f3f4f6",
      borderRadius: "4px",
    },
    input: {
      width: "97%",
      padding: "8px",
      border: "1px solid #d1d5db",
      backgroundColor: "#f3f4f6",
      borderRadius: "4px",
    },
    buttonGroup: {
      display: "flex",
      gap: "8px",
      justifyContent: "flex-end",
      marginTop: "20px",
    },
    cancelButton: {
      padding: "8px 16px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      background: "white",
      color: "#374151",
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

  return (
    <div style={styles.pageContainer}>
      <div>
        <Helmet>
          <title>Production | Target Schedule</title>
        </Helmet>
      </div>

      {/* Toast Message */}
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
        {/* Header and Filter Section */}
        <div style={styles.combinedHeaderFilter}>
          <div style={styles.headerRow}>
            <h1 style={styles.title}>Storage Inventory</h1>
          </div>

          <div style={styles.filterRow}>
            <div style={styles.inputGroup}>
              <span style={styles.label}>Date Filter</span>
              <select style={styles.select}>
                <option style={optionStyle}>Search Date</option>
              </select>
              <input
                type="date"
                style={styles.input}
                placeholder="Date From"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <span style={styles.label}>To</span>
              <input
                type="date"
                style={styles.input}
                placeholder="Date To"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div style={styles.inputGroup}>
              <span style={styles.label}>Search By</span>
              <select
                style={styles.select}
                value={searchBy}
                onChange={(e) => setSearchBy(e.target.value)}
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
              />
              <button style={styles.button}>Search</button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={styles.actionButtonsGroup}>
          <button
            style={{ ...styles.button, ...styles.primaryButton }}
            onClick={() => navigate("")}
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
              disabled={saveLoading}
            >
              <Save size={16} />
              {saveLoading ? "Currently" : `Complete (${selectedHeaderIds.size})`}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={styles.tabsContainer}>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "New" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("New")}
          >
            Off System
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "OnProgress" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("OnProgress")}
          >
            M136 System
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "Complete" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("Complete")}
          >
            Complete
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "Reject" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("Reject")}
          >
            Reject
          </button>
        </div>

        {/* Table */}
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
                          onChange={() => setSelectAll(!selectAll)}
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
                {!loading && !error && filteredSchedules.length === 0 && (
                  <tr>
                    <td
                      colSpan={getColSpanCount()}
                      style={{
                        ...styles.tdWithLeftBorder,
                        textAlign: "center",
                        color: "#6b7280",
                      }}
                    >
                      No data available
                    </td>
                  </tr>
                )}
                {!loading &&
                  !error &&
                  filteredSchedules.map((h, idx) => (
                    <FragmentLike key={h.id}>
                      <tr>
                        <td
                          style={{
                            ...styles.expandedTd,
                            ...styles.expandedWithLeftBorder,
                            ...styles.emptyColumn,
                          }}
                        >
                          {idx + 1}
                        </td>
                        {activeTab === "New" && (
                          <td style={styles.tdWithLeftBorder}>
                            <input
                              type="checkbox"
                              checked={selectedHeaderIds.has(h.id)}
                              onChange={() => {}}
                              style={{
                                margin: "0 auto",
                                display: "block",
                                cursor: "pointer",
                                width: "12px",
                                height: "12px",
                              }}
                            />
                          </td>
                        )}
                        <td
                          style={{
                            ...styles.tdWithLeftBorder,
                            ...styles.emptyColumn,
                          }}
                        >
                          <button style={styles.arrowButton}>
                            {expandedRows[h.id] ? (
                              <MdArrowDropDown style={styles.arrowIcon} />
                            ) : (
                              <MdArrowRight style={styles.arrowIcon} />
                            )}
                          </button>
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {toDDMMYYYY(h.date)}
                        </td>
                        <td style={styles.tdWithLeftBorder}>{h.line}</td>
                        <td style={styles.tdWithLeftBorder}>{h.shiftTime}</td>
                        <td style={styles.tdWithLeftBorder}>{h.total_input}</td>
                        <td style={styles.tdWithLeftBorder}>{h.total_customer}</td>
                        <td style={styles.tdWithLeftBorder}>{h.total_model}</td>
                        <td style={styles.tdWithLeftBorder}>{h.total_pallet}</td>
                        <td style={styles.tdWithLeftBorder}>{h.createdBy}</td>
                        {(activeTab === "New" || activeTab === "OnProgress") && (
                          <td style={styles.tdWithLeftBorder}>
                            <button style={styles.editButton}>
                              <Pencil size={10} />
                            </button>
                            <button style={styles.deleteButton}>
                              <Trash2 size={10} />
                            </button>
                            {activeTab === "OnProgress" && (
                              <button style={styles.completeButton}>
                                <Check size={10} />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>

                      {/* Expanded Row - Detail Table */}
                      {expandedRows[h.id] && (
                        <tr>
                          <td
                            colSpan={getColSpanCount()}
                            style={{ padding: "0", border: "none" }}
                          >
                            <div style={styles.expandedTableContainer}>
                              <table style={styles.expandedTable}>
                                <colgroup>
                                  <col style={{ width: "25px" }} />
                                  <col style={{ width: "15%" }} />
                                  <col style={{ width: "15%" }} />
                                  <col style={{ width: "15%" }} />
                                  <col style={{ width: "20%" }} />
                                  <col style={{ width: "10%" }} />
                                  <col style={{ width: "15%" }} />
                                  <col style={{ width: "15%" }} />
                                  <col style={{ width: "10%" }} />
                                  <col style={{ width: "10%" }} />
                                </colgroup>
                                <thead>
                                  <tr style={styles.expandedTableHeader}>
                                    <th style={styles.expandedTh}>No</th>
                                    <th style={styles.expandedTh}>Material Code</th>
                                    <th style={styles.expandedTh}>Customer</th>
                                    <th style={styles.expandedTh}>Model</th>
                                    <th style={styles.expandedTh}>Description</th>
                                    <th style={styles.expandedTh}>Input</th>
                                    <th style={styles.expandedTh}>PO Number</th>
                                    <th style={styles.expandedTh}>Pallet Type</th>
                                    <th style={styles.expandedTh}>Pallet Use</th>
                                    <th style={styles.expandedTh}>Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {loadingDetail[h.id] && (
                                    <tr>
                                      <td
                                        colSpan="10"
                                        style={{
                                          ...styles.expandedTd,
                                          textAlign: "center",
                                          color: "#6b7280",
                                        }}
                                      >
                                        Loading…
                                      </td>
                                    </tr>
                                  )}
                                  {!loadingDetail[h.id] &&
                                    (!detailCache[h.id] ||
                                      detailCache[h.id].length === 0) && (
                                      <tr>
                                        <td
                                          colSpan="10"
                                          style={{
                                            ...styles.expandedTd,
                                            textAlign: "center",
                                          }}
                                        >
                                          Details not yet added.
                                        </td>
                                      </tr>
                                    )}
                                  {!loadingDetail[h.id] &&
                                    detailCache[h.id]?.map((d, i) => (
                                      <tr key={`${h.id}-${d.id || i}`}>
                                        <td
                                          style={{
                                            ...styles.expandedTd,
                                            ...styles.expandedWithLeftBorder,
                                            ...styles.emptyColumn,
                                          }}
                                        >
                                          {i + 1}
                                        </td>
                                        <td style={styles.expandedTd}>
                                          {d.materialCode}
                                        </td>
                                        <td style={styles.expandedTd}>
                                          {d.customer}
                                        </td>
                                        <td style={styles.expandedTd}>
                                          {d.model || ""}
                                        </td>
                                        <td style={styles.expandedTd}>
                                          {d.description || ""}
                                        </td>
                                        <td style={styles.expandedTd}>{d.input}</td>
                                        <td style={styles.expandedTd}>
                                          {d.poNumber}
                                        </td>
                                        <td style={styles.expandedTd}>
                                          {d.palletType}
                                        </td>
                                        <td style={styles.expandedTd}>
                                          {d.palletUse}
                                        </td>
                                        <td style={styles.expandedTd}>
                                          <button style={styles.editButton}>
                                            <Pencil size={10} />
                                          </button>
                                          <button style={styles.deleteButton}>
                                            <Trash2 size={10} />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </FragmentLike>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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

        {/* Save Button for New Tab */}
        {activeTab === "New" && hasNewSchedules && (
          <div style={styles.saveConfiguration}>
            <button
              style={{
                ...styles.button,
                ...styles.primaryButton,
                ...(saveLoading && { opacity: 0.7, cursor: "not-allowed" }),
              }}
              disabled={saveLoading}
            >
              <Save size={16} />
              {saveLoading ? "Menyimpan..." : "Save Schedule"}
            </button>
          </div>
        )}

        {/* Complete Button for OnProgress Tab */}
        {activeTab === "OnProgress" && selectedHeaderIds.size > 0 && (
          <div style={styles.saveConfiguration}>
            <button
              style={{
                ...styles.button,
                ...styles.successButton,
                ...(saveLoading && { opacity: 0.7, cursor: "not-allowed" }),
              }}
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

      {/* Add Customer Detail Popup */}
      {addCustomerDetail && (
        <div style={customerDetailStyles.popupOverlay}>
          <div style={customerDetailStyles.popupContainer}>
            <div style={customerDetailStyles.popupHeader}>
              <h3 style={customerDetailStyles.popupTitle}>Add Customer Detail</h3>
              <button
                style={customerDetailStyles.closeButton}
                onClick={() => setAddCustomerDetail(false)}
              >
                ×
              </button>
            </div>
            <form style={customerDetailStyles.form}>
              <div style={customerDetailStyles.formGroup}>
                <label style={customerDetailStyles.label}>Customer:</label>
                <select
                  value={addCustomerFormData.partCode}
                  onChange={(e) =>
                    setAddCustomerFormData({
                      ...addCustomerFormData,
                      partCode: e.target.value,
                    })
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
                    setAddCustomerFormData({
                      ...addCustomerFormData,
                      partName: e.target.value,
                    })
                  }
                  placeholder="Material code will be set automatically"
                  style={customerDetailStyles.input}
                />
              </div>

              <div style={customerDetailStyles.formGroup}>
                <label style={customerDetailStyles.label}>Input:</label>
                <input
                  type="number"
                  value={addCustomerFormData.input}
                  onChange={(e) =>
                    setAddCustomerFormData({
                      ...addCustomerFormData,
                      input: e.target.value,
                    })
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
                    setAddCustomerFormData({
                      ...addCustomerFormData,
                      poNumber: e.target.value,
                    })
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
                    setAddCustomerFormData({
                      ...addCustomerFormData,
                      description: e.target.value,
                    })
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

      {/* Tooltip */}
      <div style={styles.tooltip}>{tooltip.content}</div>
    </div>
  );
};

const FragmentLike = ({ children }) => children;

export default StorageInventoryPage;