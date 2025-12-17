"use client";

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Pencil, X } from "lucide-react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const VendorPartPlacementPage = ({ sidebarVisible }) => {
  const navigate = useNavigate();

  // State untuk data
  const [placementsData, setPlacementsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tooltip, setTooltip] = useState({
    visible: false,
    content: "",
    x: 0,
    y: 0,
  });

  // State untuk filter dan search
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchBy, setSearchBy] = useState("placement_name");
  const [keyword, setKeyword] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // State untuk popup edit
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [editingPlacement, setEditingPlacement] = useState(null);
  const [editFormData, setEditFormData] = useState({
    placement_name: "",
    length_cm: "",
    width_cm: "",
    height_cm: "",
    is_active: true,
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);

  // Fungsi untuk fetch data dari vendor-placements
  const fetchPlacementsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/api/vendor-placements`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setPlacementsData(result.data || []);
      } else {
        throw new Error(result.message || "Failed to fetch placements data");
      }
    } catch (err) {
      console.error("Error fetching placements data:", err);
      setError(err.message);
      setPlacementsData([]);
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk handle delete placement permanent tanpa confirm
  const handleDeletePlacement = async (placementId, placementName) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/vendor-placements/permanent/${placementId}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || `HTTP error! status: ${response.status}`
        );
      }

      if (result.success) {
        alert("Delete successfully");
        fetchPlacementsData();
      } else {
        throw new Error(result.message || "Failed to delete placement");
      }
    } catch (err) {
      console.error("Error deleting placement:", err);
      alert(`Failed to delete placement: ${err.message}`);
    }
  };

  // Fungsi untuk membuka popup edit
  const handleEditClick = (placement) => {
    setEditingPlacement(placement);
    setEditFormData({
      placement_name: placement.placement_name || "",
      length_cm: placement.length_cm || "",
      width_cm: placement.width_cm || "",
      height_cm: placement.height_cm || "",
      is_active: placement.is_active || true,
    });
    setEditError(null);
    setShowEditPopup(true);
  };

  // Fungsi untuk menutup popup edit
  const handleCloseEditPopup = () => {
    setShowEditPopup(false);
    setEditingPlacement(null);
    setEditFormData({
      placement_name: "",
      length_cm: "",
      width_cm: "",
      height_cm: "",
      is_active: true,
    });
    setEditError(null);
  };

  // Fungsi untuk menangani perubahan form edit
  const handleEditFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData({
      ...editFormData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // Fungsi untuk menyimpan perubahan
  const handleSaveEdit = async () => {
    if (!editingPlacement) return;

    // Validasi input
    if (!editFormData.placement_name.trim()) {
      setEditError("Placement name is required");
      return;
    }

    if (
      !editFormData.length_cm ||
      !editFormData.width_cm ||
      !editFormData.height_cm
    ) {
      setEditError("All dimensions (length, width, height) are required");
      return;
    }

    if (
      isNaN(parseFloat(editFormData.length_cm)) ||
      isNaN(parseFloat(editFormData.width_cm)) ||
      isNaN(parseFloat(editFormData.height_cm))
    ) {
      setEditError("Dimensions must be numeric values");
      return;
    }

    if (
      parseFloat(editFormData.length_cm) <= 0 ||
      parseFloat(editFormData.width_cm) <= 0 ||
      parseFloat(editFormData.height_cm) <= 0
    ) {
      setEditError("Dimensions must be greater than 0");
      return;
    }

    try {
      setEditLoading(true);
      setEditError(null);

      const response = await fetch(
        `${API_BASE}/api/vendor-placements/${editingPlacement.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            placement_name: editFormData.placement_name.trim(),
            length_cm: parseFloat(editFormData.length_cm),
            width_cm: parseFloat(editFormData.width_cm),
            height_cm: parseFloat(editFormData.height_cm),
            is_active: editFormData.is_active,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || `HTTP error! status: ${response.status}`
        );
      }

      if (result.success) {
        handleCloseEditPopup();
        fetchPlacementsData(); 
      } else {
        throw new Error(result.message || "Failed to update placement");
      }
    } catch (err) {
      console.error("Error updating placement:", err);
      setEditError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  // Fungsi untuk handle search
  const handleSearchClick = async () => {
    try {
      setLoading(true);

      // Untuk sekarang, kita filter di frontend
      const filtered = placementsData.filter((placement) => {
        if (!keyword) return true;

        const searchTerm = keyword.toLowerCase();
        switch (searchBy) {
          case "placement_name":
            return placement.placement_name?.toLowerCase().includes(searchTerm);
          case "created_by":
            return placement.created_by?.toLowerCase().includes(searchTerm);
          default:
            return true;
        }
      });

      // Simulate API call delay
      setTimeout(() => {
        setPlacementsData(filtered);
        setCurrentPage(1);
        setLoading(false);
      }, 300);
    } catch (err) {
      console.error("Error searching placements:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Format date untuk display sesuai format yang diminta
  const formatDateForDisplay = (dateString) => {
    try {
      if (!dateString) return "";

      // Handle format "DD/MM/YYYY HH24:MI" dari API
      if (dateString.includes("/")) {
        // Format: DD/MM/YYYY HH24:MI
        const [datePart, timePart] = dateString.split(" ");
        if (!datePart || !timePart) return "";

        // Ambil bagian waktu dan ganti : dengan .
        const formattedTime = timePart.replace(":", ".");
        return formattedTime;
      }

      // Handle ISO format
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";

      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${hours}.${minutes}`;
    } catch {
      return "";
    }
  };

  // Format tanggal saja (tanpa waktu) untuk date filter
  const formatDateOnly = (dateString) => {
    try {
      if (!dateString) return "";

      if (dateString.includes("/")) {
        // Format: DD/MM/YYYY HH24:MI
        const [datePart] = dateString.split(" ");
        return datePart; // Return DD/MM/YYYY
      }

      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";

      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return "";
    }
  };

  // Format dimensions untuk display
  const formatDimension = (dimension) => {
    if (!dimension) return "0.00 cm";
    return `${parseFloat(dimension).toFixed(2)} cm`;
  };

  // Format Created By sesuai permintaan: emp_name | tanggal/bulan/tahun jam.menit
  const formatCreatedBy = (placement) => {
    const createdByName = placement.created_by || "System";
    const dateString = placement.created_at_formatted || placement.created_at;
    const formattedDate = formatDateOnly(dateString);
    const formattedTime = formatDateForDisplay(dateString);

    if (!formattedDate || !formattedTime) {
      return createdByName;
    }

    return `${createdByName} | ${formattedDate} ${formattedTime}`;
  };

  // Filter data berdasarkan search
  const filteredData = useMemo(() => {
    if (!keyword) return placementsData;

    const searchTerm = keyword.toLowerCase();

    return placementsData.filter((placement) => {
      switch (searchBy) {
        case "placement_name":
          return placement.placement_name?.toLowerCase().includes(searchTerm);
        case "created_by":
          return placement.created_by?.toLowerCase().includes(searchTerm);
        default:
          return true;
      }
    });
  }, [placementsData, keyword, searchBy]);

  // Filter berdasarkan date
  const dateFilteredData = useMemo(() => {
    if (!dateFrom && !dateTo) return filteredData;

    return filteredData.filter((placement) => {
      const placementDate = new Date(placement.created_at);
      let fromValid = true;
      let toValid = true;

      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromValid = placementDate >= fromDate;
      }

      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        toValid = placementDate <= toDate;
      }

      return fromValid && toValid;
    });
  }, [filteredData, dateFrom, dateTo]);

  // Pagination
  const totalPages = Math.ceil(dateFilteredData.length / itemsPerPage);
  const currentData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return dateFilteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [dateFilteredData, currentPage, itemsPerPage]);

  // Fetch data saat komponen mount
  useEffect(() => {
    fetchPlacementsData();
  }, []);

  // Event Handlers
  const handleButtonHover = (e, isHover, type) => {
    if (!e || !e.target) return;

    if (type === "primary") {
      e.target.style.backgroundColor = isHover ? "#1d4ed8" : "#2563eb";
    } else if (type === "search") {
      e.target.style.backgroundColor = isHover ? "#1d4ed8" : "#2563eb";
    } else if (type === "pagination") {
      e.target.style.backgroundColor = isHover ? "#a5b4fc" : "transparent";
      e.target.style.color = isHover ? "#1f2937" : "#374151";
    }
  };

  const handleInputFocus = (e) => {
    e.target.style.borderColor = "#9fa8da";
  };

  const handleInputBlur = (e) => {
    e.target.style.borderColor = "#d1d5db";
  };

  const handleSearchByChange = (e) => {
    const value = e.target.value;
    setSearchBy(value);
    setKeyword("");

    // Jika placement_type dipilih, set keyword ke empty string
    if (value === "placement_type") {
      setKeyword("");
    }
  };

  const showTooltip = (e) => {
    let content = "";

    if (e.target.tagName === "BUTTON" || e.target.closest("button")) {
      const button =
        e.target.tagName === "BUTTON" ? e.target : e.target.closest("button");

      if (button.querySelector('svg[data-icon="plus"]')) {
        content = "Add New Placement";
      } else if (button.querySelector('svg[data-icon="trash-2"]')) {
        content = "Delete Placement";
      } else if (button.querySelector('svg[data-icon="pencil"]')) {
        content = "Edit Placement";
      } else if (button.title) {
        content = button.title;
      }
    } else if (e.target.type === "checkbox") {
      content = "Pilih baris ini";
    } else if (e.target.tagName === "TD" || e.target.tagName === "TH") {
      content = e.target.textContent.trim();
      if (!content) {
        content = "Informasi";
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
      position: "relative",
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
    tabButtonActive: {
      color: "#2563eb",
      borderBottom: "2px solid #2563eb",
      fontWeight: "600",
    },
    tabButtonHover: {
      color: "#2563eb",
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
    paginationButtonHover: {
      backgroundColor: "#a5b4fc",
      color: "#1f2937",
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

    // Styles untuk popup edit
    popupOverlay: {
      position: "fixed",
      top: 130,
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
      marginBottom: "20px",
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
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    formGroup: {
      marginBottom: "16px",
    },
    formLabel: {
      display: "block",
      fontSize: "12px",
      fontWeight: "500",
      color: "#374151",
      marginBottom: "6px",
    },
    formInput: {
      width: "100%",
      height: "36px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      padding: "0 12px",
      fontSize: "12px",
      backgroundColor: "white",
      fontFamily: "inherit",
      outline: "none",
      transition: "border-color 0.2s ease",
      boxSizing: "border-box",
    },
    checkboxGroup: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    checkboxLabel: {
      fontSize: "12px",
      color: "#374151",
    },
    checkboxInput: {
      width: "16px",
      height: "16px",
      cursor: "pointer",
    },
    errorMessage: {
      color: "#dc2626",
      fontSize: "12px",
      marginTop: "4px",
    },
    popupButtonGroup: {
      display: "flex",
      justifyContent: "flex-end",
      gap: "12px",
      marginTop: "24px",
      paddingTop: "16px",
      borderTop: "1px solid #e5e7eb",
    },
    cancelButton: {
      backgroundColor: "#f3f4f6",
      color: "#374151",
      padding: "8px 16px",
      border: "none",
      borderRadius: "4px",
      fontSize: "12px",
      fontWeight: "500",
      cursor: "pointer",
      fontFamily: "inherit",
    },
    saveButton: {
      backgroundColor: "#2563eb",
      color: "white",
      padding: "8px 16px",
      border: "none",
      borderRadius: "4px",
      fontSize: "12px",
      fontWeight: "500",
      cursor: "pointer",
      fontFamily: "inherit",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    saveButtonDisabled: {
      backgroundColor: "#93c5fd",
      color: "white",
      padding: "8px 16px",
      border: "none",
      borderRadius: "4px",
      fontSize: "12px",
      fontWeight: "500",
      cursor: "not-allowed",
      fontFamily: "inherit",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    loadingSpinner: {
      width: "16px",
      height: "16px",
      border: "2px solid rgba(255, 255, 255, 0.3)",
      borderRadius: "50%",
      borderTopColor: "white",
      animation: "spin 1s linear infinite",
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
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.tooltip}>{tooltip.content}</div>

      <div style={styles.welcomeCard}>
        <div style={styles.combinedHeaderFilter}>
          <div style={styles.headerRow}>
            <h1 style={styles.title}>Vendor Part Placement</h1>
          </div>

          <div style={styles.filterRow}>
            <div style={styles.inputGroup}>
              <span style={styles.label}>Date Filter</span>
              <select
                style={styles.select}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              >
                <option style={optionStyle}>Created Date</option>
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
                onChange={handleSearchByChange}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              >
                <option value="placement_name" style={optionStyle}>
                  Placement Name
                </option>
                <option value="created_by" style={optionStyle}>
                  Created By
                </option>
              </select>

              {searchBy === "placement_name" || searchBy === "created_by" ? (
                <input
                  type="text"
                  style={styles.input}
                  placeholder={`Input keyword`}
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
              ) : (
                <input
                  type="text"
                  style={styles.input}
                  placeholder="Input keyword"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
              )}

              <button
                style={styles.button}
                onClick={handleSearchClick}
                disabled={loading}
                onMouseEnter={(e) => {
                  handleButtonHover(e, true, "search");
                }}
                onMouseLeave={(e) => {
                  handleButtonHover(e, false, "search");
                }}
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: "#fee2e2",
              border: "1px solid #fecaca",
              color: "#dc2626",
              padding: "12px",
              borderRadius: "4px",
              marginBottom: "16px",
              fontSize: "12px",
            }}
          >
            Error: {error}
          </div>
        )}

        <div style={styles.actionButtonsGroup}>
          <button
            style={{ ...styles.button, ...styles.primaryButton }}
            onMouseEnter={(e) => {
              handleButtonHover(e, true, "search");
            }}
            onMouseLeave={(e) => {
              handleButtonHover(e, false, "search");
            }}
            onClick={() => navigate("/vendor-placement/add")}
          >
            <Plus size={16} />
            Create
          </button>
        </div>

        {loading && (
          <div
            style={{
              textAlign: "center",
              padding: "20px",
              fontSize: "14px",
              color: "#6b7280",
            }}
          >
            Loading placements data...
          </div>
        )}

        {!loading && (
          <div style={styles.tableContainer}>
            <div style={styles.tableBodyWrapper}>
              <table
                style={{
                  ...styles.table,
                  minWidth: "500px",
                  tableLayout: "fixed",
                }}
              >
                <colgroup>
                  <col style={{ width: "2.5%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "27%" }} />
                  <col style={{ width: "8%" }} />
                </colgroup>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.thWithLeftBorder}>No</th>
                    <th style={styles.thWithLeftBorder}>Placement Name</th>
                    <th style={styles.thWithLeftBorder}>Length</th>
                    <th style={styles.thWithLeftBorder}>Width</th>
                    <th style={styles.thWithLeftBorder}>Height</th>
                    <th style={styles.thWithLeftBorder}>Created By</th>
                    <th style={styles.thWithLeftBorder}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.length === 0 ? (
                    <tr></tr>
                  ) : (
                    currentData.map((placement, index) => (
                      <tr
                        key={placement.id}
                        onMouseEnter={(e) =>
                          (e.target.closest("tr").style.backgroundColor =
                            "#f3f4f6")
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
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={placement.placement_name}
                        >
                          {placement.placement_name}
                        </td>
                        <td
                          style={{
                            ...styles.tdWithLeftBorder,
                            textAlign: "right",
                          }}
                          title={`${formatDimension(placement.length_cm)}`}
                        >
                          {formatDimension(placement.length_cm)}
                        </td>
                        <td
                          style={{
                            ...styles.tdWithLeftBorder,
                            textAlign: "right",
                          }}
                          title={`${formatDimension(placement.width_cm)}`}
                        >
                          {formatDimension(placement.width_cm)}
                        </td>
                        <td
                          style={{
                            ...styles.tdWithLeftBorder,
                            textAlign: "right",
                          }}
                          title={`${formatDimension(placement.height_cm)}`}
                        >
                          {formatDimension(placement.height_cm)}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={formatCreatedBy(placement)}
                        >
                          {formatCreatedBy(placement)}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          <button
                            style={styles.editButton}
                            onClick={() => handleEditClick(placement)}
                            title="Edit"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            style={styles.deleteButton}
                            onClick={() =>
                              handleDeletePlacement(
                                placement.id,
                                placement.placement_name
                              )
                            }
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={styles.paginationBar}>
              <div style={styles.paginationControls}>
                <button
                  style={styles.paginationButton}
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1 || dateFilteredData.length === 0}
                  onMouseEnter={(e) => {
                    handleButtonHover(e, true, "pagination");
                    showTooltip(e);
                  }}
                  onMouseLeave={(e) => {
                    handleButtonHover(e, false, "pagination");
                    hideTooltip();
                  }}
                  title="First page"
                >
                  {"<<"}
                </button>
                <button
                  style={styles.paginationButton}
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1 || dateFilteredData.length === 0}
                  onMouseEnter={(e) => {
                    handleButtonHover(e, true, "pagination");
                    showTooltip(e);
                  }}
                  onMouseLeave={(e) => {
                    handleButtonHover(e, false, "pagination");
                    hideTooltip();
                  }}
                  title="Previous page"
                >
                  {"<"}
                </button>
                <span>Page</span>
                <input
                  type="text"
                  value={currentPage}
                  style={styles.paginationInput}
                  onChange={(e) => {
                    const page = parseInt(e.target.value);
                    if (page >= 1 && page <= totalPages) {
                      setCurrentPage(page);
                    }
                  }}
                  min="1"
                  max={totalPages}
                  disabled={dateFilteredData.length === 0}
                />
                <span>of {totalPages}</span>
                <button
                  style={styles.paginationButton}
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={
                    currentPage === totalPages || dateFilteredData.length === 0
                  }
                  onMouseEnter={(e) => {
                    handleButtonHover(e, true, "pagination");
                    showTooltip(e);
                  }}
                  onMouseLeave={(e) => {
                    handleButtonHover(e, false, "pagination");
                    hideTooltip();
                  }}
                  title="Next page"
                >
                  {">"}
                </button>
                <button
                  style={styles.paginationButton}
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={
                    currentPage === totalPages || dateFilteredData.length === 0
                  }
                  onMouseEnter={(e) => {
                    handleButtonHover(e, true, "pagination");
                    showTooltip(e);
                  }}
                  onMouseLeave={(e) => {
                    handleButtonHover(e, false, "pagination");
                    hideTooltip();
                  }}
                  title="Last page"
                >
                  {">>"}
                </button>
              </div>
              <div style={{ fontSize: "12px", color: "#374151" }}>
                Total Row : {dateFilteredData.length}
              </div>
            </div>
          </div>
        )}
      </div>

      {showEditPopup && (
        <div style={styles.popupOverlay}>
          <div style={styles.popupContainer}>
            <div style={styles.popupHeader}>
              <h2 style={styles.popupTitle}>Edit Vendor Placement</h2>
              <button
                style={styles.closeButton}
                onClick={handleCloseEditPopup}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Placement Name *</label>
              <input
                type="text"
                name="placement_name"
                value={editFormData.placement_name}
                onChange={handleEditFormChange}
                style={styles.formInput}
                placeholder="Enter placement name"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Length (cm) *</label>
              <input
                type="number"
                name="length_cm"
                value={editFormData.length_cm}
                onChange={handleEditFormChange}
                style={styles.formInput}
                placeholder="Enter length in cm"
                min="0.01"
                step="0.01"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Width (cm) *</label>
              <input
                type="number"
                name="width_cm"
                value={editFormData.width_cm}
                onChange={handleEditFormChange}
                style={styles.formInput}
                placeholder="Enter width in cm"
                min="0.01"
                step="0.01"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Height (cm) *</label>
              <input
                type="number"
                name="height_cm"
                value={editFormData.height_cm}
                onChange={handleEditFormChange}
                style={styles.formInput}
                placeholder="Enter height in cm"
                min="0.01"
                step="0.01"
              />
            </div>
            {editError && <div style={styles.errorMessage}>{editError}</div>}

            <div style={styles.popupButtonGroup}>
              <button
                style={styles.cancelButton}
                onClick={handleCloseEditPopup}
                disabled={editLoading}
              >
                Cancel
              </button>
              <button
                style={
                  editLoading ? styles.saveButtonDisabled : styles.saveButton
                }
                onClick={handleSaveEdit}
                disabled={editLoading}
              >
                {editLoading ? (
                  <>
                    <div style={styles.loadingSpinner}></div>
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorPartPlacementPage;
