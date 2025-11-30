"use client";

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MdArrowRight, MdArrowDropDown } from "react-icons/md";
import { Plus, Trash2, Pencil, Save, X } from "lucide-react";

const VendorDetailsPage = ({ sidebarVisible }) => {
  const navbarTotalHeight = 164;
  const sidebarWidth = 288;
  const navigate = useNavigate();

  const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

  // STATE MANAGEMENT
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchBy, setSearchBy] = useState("Vendor");
  const [keyword, setKeyword] = useState("");
  const [tooltip, setTooltip] = useState({
    visible: false,
    content: "",
    x: 0,
    y: 0,
  });

  // ==================== API FUNCTIONS ====================
  const fetchVendors = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(`${API_BASE}/api/vendors`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const result = await response.json();

      if (result.success) {
        setVendors(result.data || []);
      } else {
        throw new Error(result.message || "Failed to fetch vendors");
      }
    } catch (err) {
      console.error("Error fetching vendors:", err);
      setError(err.message);
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVendor = async (vendorId) => {
    if (
      !window.confirm(
        "Are you sure you want to PERMANENTLY delete this vendor? This action cannot be undone!"
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${API_BASE}/api/vendors/${vendorId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle foreign key constraint error
        if (errorData.error === "Foreign key constraint violation") {
          alert(
            `Cannot delete vendor: ${errorData.message}\n\nPlease remove all references to this vendor first.`
          );
          return;
        }

        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const result = await response.json();

      if (result.success) {
        alert(
          `Vendor "${result.deletedVendor.vendor_name}" has been permanently deleted!`
        );
        // Refresh data setelah delete
        fetchVendors();
      } else {
        throw new Error(result.message || "Failed to delete vendor");
      }
    } catch (err) {
      console.error("Error deleting vendor:", err);
      alert(`Failed to delete vendor: ${err.message}`);
    }
  };

  // ==================== HELPER FUNCTIONS ====================
  const formatDateForDisplay = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "-";
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${day}/${month}/${year} ${hours}.${minutes}`;
    } catch {
      return "-";
    }
  };

  const getCurrentUser = () => {
    try {
      const authUser = JSON.parse(localStorage.getItem("auth_user") || "null");
      return authUser
        ? authUser.emp_name ||
            authUser.employeeName ||
            authUser.fullname ||
            authUser.name ||
            authUser.username ||
            "System"
        : "System";
    } catch {
      return "System";
    }
  };

  // 🔥 UPDATE FUNGSI FILTERED VENDORS - TAMBAHKAN PAGINATION
  const filteredVendors = useMemo(() => {
    if (!keyword.trim()) return vendors;

    const searchTerm = keyword.toLowerCase().trim();

    return vendors.filter((vendor) => {
      switch (searchBy) {
        case "Vendor":
          return vendor.vendor_name?.toLowerCase().includes(searchTerm);
        case "Product Code":
          return vendor.vendor_code?.toLowerCase().includes(searchTerm);
        case "Product Description":
          return vendor.vendor_desc?.toLowerCase().includes(searchTerm);
        default:
          return true;
      }
    });
  }, [vendors, keyword, searchBy]);

  // 🔥 FUNGSI PAGINATION BARU
  const paginatedVendors = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    // Hitung total pages
    const totalItems = filteredVendors.length;
    const calculatedTotalPages = Math.ceil(totalItems / itemsPerPage);
    setTotalPages(calculatedTotalPages);

    return filteredVendors.slice(startIndex, endIndex);
  }, [filteredVendors, currentPage, itemsPerPage]);

  // 🔥 FUNGSI UNTUK PAGINATION CONTROLS
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleFirstPage = () => setCurrentPage(1);
  const handleLastPage = () => setCurrentPage(totalPages);
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  // 🔥 RESET KE PAGE 1 KETIKA SEARCH/FILTER BERUBAH
  useEffect(() => {
    setCurrentPage(1);
  }, [keyword, searchBy, dateFrom, dateTo]);

  const dateFilteredVendors = useMemo(() => {
    if (!dateFrom && !dateTo) return filteredVendors;

    return filteredVendors.filter((vendor) => {
      const vendorDate = new Date(vendor.created_at);
      let fromValid = true;
      let toValid = true;

      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromValid = vendorDate >= fromDate;
      }

      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        toValid = vendorDate <= toDate;
      }

      return fromValid && toValid;
    });
  }, [filteredVendors, dateFrom, dateTo]);

  // ==================== EVENT HANDLERS ====================
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
    if (!e || !e.target) return;

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
    if (!e || !e.target) return;

    if (!isActive) {
      e.target.style.color = isHover
        ? styles.tabButtonHover.color
        : styles.tabButton.color;
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
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return "0";
    return new Intl.NumberFormat().format(num);
  };

  // ==================== USE EFFECT ====================
  useEffect(() => {
    fetchVendors();
  }, []);

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
    labelIdInput: {
      width: "200px",
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
      backgroundColor: "#1d4ed8",
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

    cellContent: {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },

    paginationButtonDisabled: {
      backgroundColor: "transparent",
      border: "0.5px solid #d1d5db",
      borderRadius: "4px",
      padding: "4px 8px",
      cursor: "not-allowed",
      color: "#9ca3af",
      fontSize: "10px",
      fontWeight: "1000",
      fontFamily: "inherit",
    },
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.tooltip}>
        {tooltip.content}
        <div style={styles.tooltipArrow}></div>
      </div>

      {loading ? (
        <div style={styles.welcomeCard}>
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div style={{ fontSize: "16px", color: "#374151" }}>
              Loading vendors...
            </div>
          </div>
        </div>
      ) : error ? (
        <div style={styles.welcomeCard}>
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div
              style={{
                fontSize: "16px",
                color: "#ef4444",
                marginBottom: "16px",
              }}
            >
              Error: {error}
            </div>
            <button style={styles.button} onClick={fetchVendors}>
              Retry
            </button>
          </div>
        </div>
      ) : (
        <div style={styles.welcomeCard}>
          <div style={styles.combinedHeaderFilter}>
            <div style={styles.headerRow}>
              <h1 style={styles.title}>Vendor Details</h1>
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
                  onChange={handleSearchByChange}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                >
                  <option value="Vendor" style={optionStyle}>
                    Vendor
                  </option>
                  <option value="Product Code" style={optionStyle}>
                    Product Code
                  </option>
                  <option value="Product Description" style={optionStyle}>
                    Product Description
                  </option>
                </select>

                {searchBy === "Vendor" ? (
                  <select
                    style={styles.input}
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.vendor_name}>
                        {vendor.vendor_name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="Input Keyword"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  />
                )}

                <button
                  style={styles.button}
                  onClick={fetchVendors}
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
              onClick={() => navigate("/vendor-parts/add-vendor")}
            >
              <Plus size={16} />
              Create
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
                  <col style={{ width: "2.8%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "25%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "23%" }} />
                  <col style={{ width: "7.2%" }} />
                </colgroup>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.expandedTh}>No</th>
                    <th style={styles.thWithLeftBorder}>Vendor Code</th>
                    <th style={styles.thWithLeftBorder}>Vendor Name</th>
                    <th style={styles.thWithLeftBorder}>Total Parts</th>
                    <th style={styles.thWithLeftBorder}>Types</th>
                    <th style={styles.thWithLeftBorder}>Description</th>
                    <th style={styles.thWithLeftBorder}>Create By</th>
                    <th style={styles.thWithLeftBorder}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedVendors.length === 0 ? (
                    <tr>
                      <td
                        colSpan="8"
                        style={{
                          ...styles.tdWithLeftBorder,
                          textAlign: "center",
                          fontStyle: "italic",
                          color: "#6b7280",
                        }}
                      >
                        {vendors.length === 0
                          ? "No vendors found"
                          : "No vendors match your search criteria"}
                      </td>
                    </tr>
                  ) : (
                    paginatedVendors.map((vendor, index) => {
                      const globalIndex =
                        (currentPage - 1) * itemsPerPage + index + 1;
                      return (
                        <tr
                          key={vendor.id}
                          onMouseEnter={(e) =>
                            (e.target.closest("tr").style.backgroundColor =
                              "#c7cde8")
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
                            {globalIndex} {/* 🔥 GUNAKAN GLOBAL INDEX */}
                          </td>
                          <td style={styles.tdWithLeftBorder}>
                            {vendor.vendor_code}
                          </td>
                          <td style={styles.tdWithLeftBorder}>
                            {vendor.vendor_name}
                          </td>
                          <td style={styles.tdWithLeftBorder}>
                            {formatNumber(vendor.total_parts)}
                          </td>
                          <td style={styles.tdWithLeftBorder}>
                            {vendor.types}
                          </td>
                          <td style={styles.tdWithLeftBorder}>
                            {vendor.vendor_desc}
                          </td>
                          <td style={styles.tdWithLeftBorder}>
                            {vendor.created_by || getCurrentUser()} |{" "}
                            {formatDateForDisplay(vendor.created_at)}
                          </td>
                          <td style={styles.tdWithLeftBorder}>
                            <button
                              style={styles.editButton}
                              onMouseEnter={showTooltip}
                              onMouseLeave={hideTooltip}
                              onClick={() =>
                                navigate(
                                  `/vendor-parts/edit-vendor/${vendor.id}`
                                )
                              }
                              title="Edit Vendor"
                            >
                              <Pencil size={10} />
                            </button>
                            <button
                              style={styles.deleteButton}
                              onMouseEnter={showTooltip}
                              onMouseLeave={hideTooltip}
                              onClick={() => handleDeleteVendor(vendor.id)}
                              title="Delete Vendor"
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
                  onClick={handleFirstPage}
                  disabled={currentPage === 1}
                  onMouseEnter={(e) => handleButtonHover(e, true, "pagination")}
                  onMouseLeave={(e) =>
                    handleButtonHover(e, false, "pagination")
                  }
                >
                  {"<<"}
                </button>
                <button
                  style={styles.paginationButton}
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  onMouseEnter={(e) => handleButtonHover(e, true, "pagination")}
                  onMouseLeave={(e) =>
                    handleButtonHover(e, false, "pagination")
                  }
                >
                  {"<"}
                </button>
                <span>Page</span>
                <input
                  type="number"
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
                />
                <span>of {totalPages}</span>
                <button
                  style={styles.paginationButton}
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  onMouseEnter={(e) => handleButtonHover(e, true, "pagination")}
                  onMouseLeave={(e) =>
                    handleButtonHover(e, false, "pagination")
                  }
                >
                  {">"}
                </button>
                <button
                  style={styles.paginationButton}
                  onClick={handleLastPage}
                  disabled={currentPage === totalPages}
                  onMouseEnter={(e) => handleButtonHover(e, true, "pagination")}
                  onMouseLeave={(e) =>
                    handleButtonHover(e, false, "pagination")
                  }
                >
                  {">>"}
                </button>
              </div>

              {/* 🔥 TAMBAHKAN INFO JUMLAH DATA */}
              <div style={{ fontSize: "12px", color: "#374151" }}>
                Total Row : {filteredVendors.length}
              </div>
            </div>
          </div>
          {/* <div style={styles.saveConfiguration}>
            <button
              style={{ ...styles.button, ...styles.primaryButton }}
              onMouseEnter={(e) => handleButtonHover(e, true, "primary")}
              onMouseLeave={(e) => handleButtonHover(e, false, "primary")}
            >
              <Save size={16} />
              Input Schedule
            </button>
          </div> */}
        </div>
      )}
    </div>
  );
};

export default VendorDetailsPage;
