"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MdArrowRight, MdArrowDropDown } from "react-icons/md";
import { Plus, Trash2, Pencil, Save, Check, X } from "lucide-react";
import { Helmet } from "react-helmet";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const getAuthUserLocal = () => {
  try {
    return JSON.parse(sessionStorage.getItem("auth_user") || "null");
  } catch {
    return null;
  }
};

const StorageInventoryPage = ({ sidebarVisible }) => {
  const navigate = useNavigate();

  // ========== STATE ==========
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [error, setError] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const [activeTab, setActiveTab] = useState("Off System");
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // State untuk checkbox
  const [selectedItemIds, setSelectedItemIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [moveLoading, setMoveLoading] = useState(false);

  // State untuk edit M136 System
  const [editingM136Id, setEditingM136Id] = useState(null);
  const [editM136Data, setEditM136Data] = useState({ qty: '', status_part: 'OK' });
  const [updateM136Loading, setUpdateM136Loading] = useState(false);

  // ========== PAGINATION (dihitung dari state) ==========
  const totalItems = inventoryItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = inventoryItems.slice(startIndex, endIndex);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // ========== TABLE CONFIGURATION PER TAB ==========
  const tableConfig = {
    "Off System": {
      cols: [
        "25px", // No
        "25px", // Checkbox
        "15%",  // Label ID
        "10%",  // Part Code
        "25%",  // Part Name
        "8%",   // Model
        "8%",   // Qty
        "25%",  // Vendor Name
        "10%",   // Stock Level
        "12%",   // Schedule Date
        "25%",  // Received By
        "9%",   // Action
      ],
    },
    "M136 System": {
      cols: [
        "25px", // No
        "25px", // Checkbox
        "15%",  // Label ID
        "10%",  // Part Code
        "25%",  // Part Name
        "8%",   // Model
        "8%",   // Qty
        "25%",  // Vendor Name
        "10%",   // Stock Level
        "10%",   // Stock Level
        "12%",   // Schedule Date
        "25%",  // Received By
        "9%",   // Action
      ],
    },
    "Out System": {
      cols: [
        "25px", // No
        "25px", // Checkbox
        // "25px", // Arrow
        "12%",  // Label ID
        "10%",  // Part Code
        "25%",  // Part Name
        "8%",   // Model
        "5%",   // Qty
        "25%",  // Vendor Name
        "8%",   // Stock Level
        "12%",   // Schedule Date
        "25%",  // Moved By
        // No Action column
      ],
    },
  };

  // ========== HELPER FUNCTIONS ==========
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

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return dateString;
    }
  };

  const renderColgroup = (cols) => (
    <colgroup>
      {cols.map((width, index) => (
        <col key={index} style={{ width }} />
      ))}
    </colgroup>
  );

  const toggleRowExpansion = (id) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectItem = (id) => {
    console.log('Checkbox clicked, id:', id, 'typeof id:', typeof id);
    const newSelected = new Set(selectedItemIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItemIds(newSelected);
    setSelectAll(newSelected.size === currentItems.length && currentItems.length > 0);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItemIds(new Set());
    } else {
      const allIds = new Set(currentItems.map(item => item.id));
      setSelectedItemIds(allIds);
    }
    setSelectAll(!selectAll);
  };

  useEffect(() => {
    setSelectedItemIds(new Set());
    setSelectAll(false);
  }, [inventoryItems, currentPage]);

  const handleMoveToM136 = async () => {
    if (selectedItemIds.size === 0) {
      setToastMessage("Please select at least one item");
      setToastType("error");
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    if (!window.confirm(`Move ${selectedItemIds.size} item(s) to M136 System?`)) {
      return;
    }

    setMoveLoading(true);
    try {
      const user = getAuthUserLocal();
      const movedByName = user?.emp_name || user?.name || "Unknown";

      const response = await fetch(`${API_BASE}/api/storage-inventory/move-to-m136`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedItemIds),
          moved_by_name: movedByName
        }),
      });
      const result = await response.json();
      if (result.success) {
        setToastMessage(result.message);
        setToastType("success");
        await fetchInventory();
        setSelectedItemIds(new Set());
        setSelectAll(false);
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      setToastMessage("Error: " + err.message);
      setToastType("error");
    } finally {
      setMoveLoading(false);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // ========== FUNCTIONS FOR M136 SYSTEM EDIT ==========
  const handleEditM136Item = (item) => {
    setEditingM136Id(item.id);
    setEditM136Data({
      qty: item.qty || 0,
      status_part: item.status_part || 'OK'
    });
  };

  const handleCancelEditM136 = () => {
    setEditingM136Id(null);
    setEditM136Data({ qty: '', status_part: 'OK' });
  };

  const handleSaveM136Item = async (id) => {
    if (!editM136Data.qty || editM136Data.qty <= 0) {
      setToastMessage("Qty must be greater than 0");
      setToastType("error");
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    setUpdateM136Loading(true);
    try {
      const user = getAuthUserLocal();
      const movedByName = user?.emp_name || user?.name || "Unknown";

      const response = await fetch(`${API_BASE}/api/storage-inventory/${id}/update-m136`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qty: parseInt(editM136Data.qty),
          status_part: editM136Data.status_part,
          moved_by_name: movedByName
        }),
      });

      const result = await response.json();
      if (result.success) {
        setToastMessage("Item updated successfully");
        setToastType("success");
        await fetchInventory();
        setEditingM136Id(null);
        setEditM136Data({ qty: '', status_part: 'OK' });
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      setToastMessage("Error: " + err.message);
      setToastType("error");
    } finally {
      setUpdateM136Loading(false);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // ========== FETCH DATA ==========
  const fetchInventory = useCallback(async () => {
    setLoadingInventory(true);
    setError(null);
    try {
      let statusParam = activeTab;

      let url = `${API_BASE}/api/storage-inventory?status_tab=${encodeURIComponent(statusParam)}`;
      if (dateFrom) url += `&date_from=${dateFrom}`;
      if (dateTo) url += `&date_to=${dateTo}`;
      if (keyword) {
        if (searchBy === "Customer")
          url += `&vendor_name=${encodeURIComponent(keyword)}`;
        else if (searchBy === "Product Code")
          url += `&part_code=${encodeURIComponent(keyword)}`;
        else if (searchBy === "Product Description")
          url += `&part_name=${encodeURIComponent(keyword)}`;
      }

      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        setInventoryItems(result.data);
        setCurrentPage(1);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingInventory(false);
    }
  }, [activeTab, dateFrom, dateTo, searchBy, keyword]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const getColSpanCount = () => {
    if (activeTab === "Off System") {
      return 12; // No, checkbox, label_id, part_code, part_name, model, qty, vendor, stock_level, schedule_date, received_by, action
    } else if (activeTab === "M136 System") {
      return 13; // termasuk arrow
    } else if (activeTab === "Out System") {
      return 12; // tanpa action
    }
    return 12;
  };



  // Option style
  const optionStyle = {
    backgroundColor: "#d1d5db",
    color: "#374151",
    fontSize: "12px",
    padding: "4px 8px",
  };

  // Main styles (sama seperti sebelumnya, tidak diubah)
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

  // Customer detail popup styles (tidak digunakan)
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

  // ========== RENDER FUNCTIONS FOR EACH TAB ==========
  const renderOffSystemTab = () => {
    if (loadingInventory) {
      return (
        <tr>
          <td colSpan="13" style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}>
            Loading...
          </td>
        </tr>
      );
    }
    if (error) {
      return (
        <tr>
          <td colSpan="13" style={{ textAlign: "center", padding: "20px", color: "#ef4444" }}>
            {error}
          </td>
        </tr>
      );
    }

    return currentItems.map((item, idx) => (
      <React.Fragment key={item.id}>
        <tr>
          <td style={{
            ...styles.expandedTd,
            ...styles.expandedWithLeftBorder,
            ...styles.emptyColumn,
          }}>{startIndex + idx + 1}</td>
          <td style={styles.tdWithLeftBorder}>
            <input
              type="checkbox"
              checked={selectedItemIds.has(item.id)}
              onChange={() => handleSelectItem(item.id)}
              style={{
                margin: "0 auto",
                display: "block",
                cursor: "pointer",
                width: "12px",
                height: "12px",
              }}
            />
          </td>
          {/* <td style={{ ...styles.tdWithLeftBorder, ...styles.emptyColumn }}>
            <button
              style={styles.arrowButton}
              onClick={() => toggleRowExpansion(item.id)}
            >
              {expandedRows[item.id] ? (
                <MdArrowDropDown style={styles.arrowIcon} />
              ) : (
                <MdArrowRight style={styles.arrowIcon} />
              )}
            </button>
          </td> */}
          <td style={styles.tdWithLeftBorder} title={item.label_id}>
            {item.label_id}
          </td>
          <td style={styles.tdWithLeftBorder} title={item.part_code}>
            {item.part_code}
          </td>
          <td style={styles.tdWithLeftBorder} title={item.part_name}>
            {item.part_name}
          </td>
          <td style={styles.tdWithLeftBorder} title={item.model || "-"}>
            {item.model || "-"}
          </td>
          <td style={styles.tdWithLeftBorder} title={item.qty}>{item.qty}</td>
          <td style={styles.tdWithLeftBorder} title={item.vendor_name || "-"}>
            {item.vendor_name || "-"}
          </td>
          <td style={styles.tdWithLeftBorder} title={item.stock_level || "-"}>{item.stock_level || "-"}</td>
          <td style={styles.tdWithLeftBorder} title={toDDMMYYYY(item.schedule_date)}>
            {toDDMMYYYY(item.schedule_date)}
          </td>
          <td style={styles.tdWithLeftBorder} title={item.received_by_name
            ? `${item.received_by_name} | ${formatDateTime(item.received_at)}`
            : "-"}>
            {item.received_by_name
              ? `${item.received_by_name} | ${formatDateTime(item.received_at)}`
              : "-"}
          </td>
          <td style={styles.tdWithLeftBorder}>
            <button style={styles.editButton} title="Edit">
              <Pencil size={10} />
            </button>
            <button style={styles.deleteButton} title="Delete">
              <Trash2 size={10} />
            </button>
          </td>
        </tr>
        {expandedRows[item.id] && (
          <tr>
            <td colSpan="13" style={{ padding: 0, border: "none" }}>
              <div style={styles.expandedTableContainer}>
                <div
                  style={{
                    padding: "10px",
                    textAlign: "center",
                    color: "#6b7280",
                  }}
                >
                  Detail for {item.label_id} (to be implemented)
                </div>
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    ));
  };

  const renderM136SystemTab = () => {
    if (loadingInventory) {
      return (
        <tr>
          <td colSpan="13" style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}>
            Loading...
          </td>
        </tr>
      );
    }
    if (error) {
      return (
        <tr>
          <td colSpan="13" style={{ textAlign: "center", padding: "20px", color: "#ef4444" }}>
            {error}
          </td>
        </tr>
      );
    }

    return currentItems.map((item, idx) => {
      const isEditing = editingM136Id === item.id;
      const isHold = item.status_part === 'HOLD';

      // Row style with red background for HOLD status
      const rowStyle = isHold ? {
        backgroundColor: '#fee2e2', // Very light red
      } : {};

      return (
        <React.Fragment key={item.id}>
          <tr style={rowStyle}>
            <td style={{
              ...styles.expandedTd,
              ...styles.expandedWithLeftBorder,
              ...styles.emptyColumn,
            }}>{startIndex + idx + 1}</td>
            <td style={styles.tdWithLeftBorder}>
              <input
                type="checkbox"
                checked={selectedItemIds.has(item.id)}
                onChange={() => handleSelectItem(item.id)}
                style={{
                  margin: "0 auto",
                  display: "block",
                  cursor: "pointer",
                  width: "12px",
                  height: "12px",
                }}
              />
            </td>
            <td style={styles.tdWithLeftBorder} title={item.label_id}>
              {item.label_id}
            </td>
            <td style={styles.tdWithLeftBorder} title={item.part_code}>
              {item.part_code}
            </td>
            <td style={styles.tdWithLeftBorder} title={item.part_name}>
              {item.part_name}
            </td>
            <td style={styles.tdWithLeftBorder} title={item.model || "-"}>
              {item.model || "-"}
            </td>

            {/* QTY - Editable saat mode edit */}
            <td style={styles.tdWithLeftBorder}>
              {isEditing ? (
                <input
                  type="number"
                  value={editM136Data.qty}
                  onChange={(e) => setEditM136Data({ ...editM136Data, qty: e.target.value })}
                  style={{
                    width: "60px",
                    padding: "2px 4px",
                    fontSize: "12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "3px",
                    textAlign: "center"
                  }}
                  min="1"
                />
              ) : (
                item.qty
              )}
            </td>

            <td style={styles.tdWithLeftBorder} title={item.vendor_name || "-"}>
              {item.vendor_name || "-"}
            </td>
            <td style={styles.tdWithLeftBorder}>{item.stock_level || "-"}</td>

            {/* STATUS - Editable saat mode edit */}
            <td style={styles.tdWithLeftBorder}>
              {isEditing ? (
                <select
                  value={editM136Data.status_part}
                  onChange={(e) => setEditM136Data({ ...editM136Data, status_part: e.target.value })}
                  style={{
                    width: "70px",
                    padding: "2px",
                    fontSize: "12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "3px",
                    backgroundColor: "white",
                    cursor: "pointer"
                  }}
                >
                  <option value="OK">OK</option>
                  <option value="HOLD">HOLD</option>
                </select>
              ) : (
                <span style={{
                  color: item.status_part === 'HOLD' ? '#dc2626' : '#16a34a',
                  fontWeight: '500'
                }}>
                  {item.status_part || 'OK'}
                </span>
              )}
            </td>

            <td style={styles.tdWithLeftBorder}>
              {toDDMMYYYY(item.schedule_date)}
            </td>
            <td style={styles.tdWithLeftBorder}>
              {item.received_by_name
                ? `${item.received_by_name} | ${formatDateTime(item.received_at)}`
                : "-"}
            </td>

            {/* ACTION BUTTONS */}
            <td style={styles.tdWithLeftBorder}>
              {isEditing ? (
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                  <button
                    onClick={() => handleSaveM136Item(item.id)}
                    disabled={updateM136Loading}
                    style={{
                      ...styles.editButton,
                      backgroundColor: '#16a34a',
                      color: 'white'
                    }}
                    title="Save"
                  >
                    <Save size={10} />
                  </button>
                  <button
                    onClick={handleCancelEditM136}
                    disabled={updateM136Loading}
                    style={{
                      ...styles.deleteButton,
                      backgroundColor: '#6b7280',
                      color: 'white'
                    }}
                    title="Cancel"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleEditM136Item(item)}
                  style={styles.editButton}
                  title="Edit"
                >
                  <Pencil size={10} />
                </button>
              )}
            </td>
          </tr>
        </React.Fragment>
      );
    });
  };

  const renderOutSystemTab = () => {
    if (loadingInventory) {
      return (
        <tr>
          <td colSpan="12" style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}>
            Loading...
          </td>
        </tr>
      );
    }
    if (error) {
      return (
        <tr>
          <td colSpan="12" style={{ textAlign: "center", padding: "20px", color: "#ef4444" }}>
            {error}
          </td>
        </tr>
      );
    }

    return currentItems.map((item, idx) => (
      <React.Fragment key={item.id}>
        <tr>
          <td style={{
            ...styles.expandedTd,
            ...styles.expandedWithLeftBorder,
            ...styles.emptyColumn,
          }}>{startIndex + idx + 1}</td>
          <td style={styles.tdWithLeftBorder}>
            <input
              type="checkbox"
              checked={selectedItemIds.has(item.id)}
              onChange={() => handleSelectItem(item.id)}
              style={{
                margin: "0 auto",
                display: "block",
                cursor: "pointer",
                width: "12px",
                height: "12px",
              }}
            />
          </td>
          {/* <td style={styles.tdWithLeftBorder}>
            <button
              style={styles.arrowButton}
              onClick={() => toggleRowExpansion(item.id)}
            >
              {expandedRows[item.id] ? (
                <MdArrowDropDown style={styles.arrowIcon} />
              ) : (
                <MdArrowRight style={styles.arrowIcon} />
              )}
            </button>
          </td> */}
          <td style={styles.tdWithLeftBorder} title={item.label_id}>
            {item.label_id}
          </td>
          <td style={styles.tdWithLeftBorder} title={item.part_code}>
            {item.part_code}
          </td>
          <td style={styles.tdWithLeftBorder} title={item.part_name}>
            {item.part_name}
          </td>
          <td style={styles.tdWithLeftBorder} title={item.model || "-"}>
            {item.model || "-"}
          </td>
          <td style={styles.tdWithLeftBorder}>{item.qty}</td>
          <td style={styles.tdWithLeftBorder} title={item.vendor_name || "-"}>
            {item.vendor_name || "-"}
          </td>
          <td style={styles.tdWithLeftBorder}>M136</td>
          <td style={styles.tdWithLeftBorder}>
            {toDDMMYYYY(item.schedule_date)}
          </td>
          <td style={styles.tdWithLeftBorder}>
            {item.moved_by_name
              ? `${item.moved_by_name} | ${formatDateTime(item.moved_at)}`
              : "-"}
          </td>
        </tr>
        {expandedRows[item.id] && (
          <tr>
            <td colSpan="12" style={{ padding: 0, border: "none" }}>
              <div style={styles.expandedTableContainer}>
                <div
                  style={{
                    padding: "10px",
                    textAlign: "center",
                    color: "#6b7280",
                  }}
                >
                  Detail for {item.label_id} (to be implemented)
                </div>
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    ));
  };

  // ========== RENDER ==========
  return (
    <div style={styles.pageContainer}>
      <Helmet>
        <title>Storage Inventory</title>
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
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          }}
        >
          {toastMessage}
        </div>
      )}

      <div style={styles.welcomeCard}>
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
              <button style={styles.button} onClick={fetchInventory}>
                Search
              </button>
            </div>
          </div>
        </div>

        <div style={styles.tabsContainer}>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "Off System" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("Off System")}
          >
            Off System
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "M136 System" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("M136 System")}
          >
            M136 System
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "Out System" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("Out System")}
          >
            Out System
          </button>
        </div>

        <div style={styles.tableContainer}>
          <div style={styles.tableBodyWrapper}>
            {activeTab === "Off System" && (
              <table
                style={{
                  ...styles.table,
                  minWidth: "1200px",
                  tableLayout: "fixed",
                }}
              >
                {renderColgroup(tableConfig["Off System"].cols)}
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.expandedTh}>No</th>
                    <th style={styles.thWithLeftBorder}>
                      {currentItems.length > 1 && (
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={handleSelectAll}
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
                    {/* <th style={styles.thWithLeftBorder}></th> */}
                    <th style={styles.thWithLeftBorder}>Label ID</th>
                    <th style={styles.thWithLeftBorder}>Part Code</th>
                    <th style={styles.thWithLeftBorder}>Part Name</th>
                    <th style={styles.thWithLeftBorder}>Model</th>
                    <th style={styles.thWithLeftBorder}>Qty</th>
                    <th style={styles.thWithLeftBorder}>Vendor Name</th>
                    <th style={styles.thWithLeftBorder}>Stock Level</th>
                    <th style={styles.thWithLeftBorder}>Schedule Date</th>
                    <th style={styles.thWithLeftBorder}>Received By</th>
                    <th style={styles.thWithLeftBorder}>Action</th>
                  </tr>
                </thead>
                <tbody>{renderOffSystemTab()}</tbody>
              </table>
            )}
            {activeTab === "M136 System" && (
              <table
                style={{
                  ...styles.table,
                  minWidth: "1200px",
                  tableLayout: "fixed",
                }}
              >
                {renderColgroup(tableConfig["M136 System"].cols)}
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.expandedTh}>No</th>
                    <th style={styles.thWithLeftBorder}>
                      {currentItems.length > 1 && (
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={handleSelectAll}
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
                    {/* <th style={styles.thWithLeftBorder}></th> */}
                    <th style={styles.thWithLeftBorder}>Label ID</th>
                    <th style={styles.thWithLeftBorder}>Part Code</th>
                    <th style={styles.thWithLeftBorder}>Part Name</th>
                    <th style={styles.thWithLeftBorder}>Model</th>
                    <th style={styles.thWithLeftBorder}>Qty</th>
                    <th style={styles.thWithLeftBorder}>Vendor Name</th>
                    <th style={styles.thWithLeftBorder}>Stock Level</th>
                    <th style={styles.thWithLeftBorder}>Status</th>
                    <th style={styles.thWithLeftBorder}>Schedule Date</th>
                    <th style={styles.thWithLeftBorder}>Received By</th>
                    <th style={styles.thWithLeftBorder}>Action</th>
                  </tr>
                </thead>
                <tbody>{renderM136SystemTab()}</tbody>
              </table>
            )}
            {activeTab === "Out System" && (
              <table
                style={{
                  ...styles.table,
                  minWidth: "1250px",
                  tableLayout: "fixed",
                }}
              >
                {renderColgroup(tableConfig["Out System"].cols)}
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.expandedTh}>No</th>
                    <th style={styles.thWithLeftBorder}>
                      {currentItems.length > 1 && (
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={handleSelectAll}
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
                    {/* <th style={styles.thWithLeftBorder}></th> */}
                    <th style={styles.thWithLeftBorder}>Label ID</th>
                    <th style={styles.thWithLeftBorder}>Part Code</th>
                    <th style={styles.thWithLeftBorder}>Part Name</th>
                    <th style={styles.thWithLeftBorder}>Model</th>
                    <th style={styles.thWithLeftBorder}>Qty</th>
                    <th style={styles.thWithLeftBorder}>Vendor Name</th>
                    <th style={styles.thWithLeftBorder}>Stock Level</th>
                    <th style={styles.thWithLeftBorder}>Schedule Date</th>
                    <th style={styles.thWithLeftBorder}>Moved By</th>
                  </tr>
                </thead>
                <tbody>{renderOutSystemTab()}</tbody>
              </table>
            )}
          </div>

          <div style={styles.paginationBar}>
            <div style={styles.paginationControls}>
              <button
                style={styles.paginationButton}
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
              >
                {"<<"}
              </button>
              <button
                style={styles.paginationButton}
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                {"<"}
              </button>
              <span>Page</span>
              <input
                type="text"
                value={currentPage}
                style={styles.paginationInput}
                readOnly
              />
              <span>of {totalPages || 1}</span>
              <button
                style={styles.paginationButton}
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                {">"}
              </button>
              <button
                style={styles.paginationButton}
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                {">>"}
              </button>
            </div>
            <div>Total Row: {totalItems}</div>
          </div>
        </div>
        {activeTab === "Off System" && selectedItemIds.size > 0 && (
          <div style={{ marginTop: "10px", marginBottom: "10px", marginLeft: "12px", display: "flex", justifyContent: "flex-start" }}>
            <button
              style={{
                ...styles.button,
                ...styles.primaryButton,
                opacity: moveLoading ? 0.6 : 1,
                cursor: moveLoading ? "not-allowed" : "pointer"
              }}
              onClick={handleMoveToM136}
              disabled={moveLoading}
            >
              <Save size={16} />
              {moveLoading ? "Moving..." : "Move to M136 System"}
            </button>
          </div>
        )}
      </div>

      <div style={styles.tooltip}>{tooltip.content}</div>
    </div>
  );
};

export default StorageInventoryPage;