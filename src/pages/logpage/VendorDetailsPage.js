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

  // ==================== EDIT VENDOR STATES ====================
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editVendorData, setEditVendorData] = useState({
    id: null,
    vendor_code: "",
    vendor_name: "",
    vendor_desc: "",
    vendor_type_id: "",
    types: "",
    vendor_country: "",
    vendor_city: "",
    is_active: true,
  });
  const [editLoading, setEditLoading] = useState(false);
  const [vendorTypes, setVendorTypes] = useState([]);

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
        // 🔥 HAPUS SORTING TAMBAHAN - Biarkan sesuai dari backend
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

  // Tambahkan function ini setelah fetchVendors
  const getRowNumber = (vendor, index) => {
    // Jika backend sudah menyediakan row_num, gunakan itu
    if (vendor.row_num !== undefined) {
      return vendor.row_num;
    }

    // Fallback: hitung berdasarkan posisi di seluruh data
    const allVendors = filteredVendors; // atau vendors jika tidak ada filter
    const actualIndex = allVendors.findIndex((v) => v.id === vendor.id);
    return actualIndex + 1;
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

  // ==================== EDIT VENDOR FUNCTIONS ====================
  const fetchVendorTypes = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${API_BASE}/api/vendor-types`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setVendorTypes(result.data || []);
        }
      }
    } catch (err) {
      console.error("Error fetching vendor types:", err);
    }
  };

  const handleOpenEditModal = (vendor) => {
    setEditVendorData({
      id: vendor.id,
      vendor_code: vendor.vendor_code || "",
      vendor_name: vendor.vendor_name || "",
      vendor_desc: vendor.vendor_desc || "",
      vendor_type_id: vendor.vendor_type_id || "",
      types: vendor.types || "",
      vendor_country: vendor.vendor_country || "",
      vendor_city: vendor.vendor_city || "",
      is_active: vendor.is_active !== undefined ? vendor.is_active : true,
    });
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditVendorData({
      id: null,
      vendor_code: "",
      vendor_name: "",
      vendor_desc: "",
      vendor_type_id: "",
      types: "",
      vendor_country: "",
      vendor_city: "",
      is_active: true,
    });
  };

  const handleEditInputChange = (field, value) => {
    setEditVendorData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Auto update types when vendor_type_id changes
    if (field === "vendor_type_id") {
      const selectedType = vendorTypes.find((t) => t.id === parseInt(value));
      if (selectedType) {
        setEditVendorData((prev) => ({
          ...prev,
          vendor_type_id: value,
          types: selectedType.type_name || selectedType.name || "",
        }));
      }
    }
  };

  const handleUpdateVendor = async (e) => {
    e.preventDefault();

    if (!editVendorData.vendor_name || !editVendorData.vendor_desc) {
      alert("Vendor Name and Description are required!");
      return;
    }

    setEditLoading(true);

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `${API_BASE}/api/vendors/${editVendorData.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            vendor_name: editVendorData.vendor_name,
            vendor_desc: editVendorData.vendor_desc,
            vendor_type_id: editVendorData.vendor_type_id || null,
            types: editVendorData.types,
            vendor_country: editVendorData.vendor_country,
            vendor_city: editVendorData.vendor_city,
            is_active: editVendorData.is_active,
            created_by: getCurrentUser(),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const result = await response.json();

      if (result.success) {
        alert(`Updated vendor detail successfully!`);
        handleCloseEditModal();
        fetchVendors();
      } else {
        throw new Error(result.message || "Failed to update vendor");
      }
    } catch (err) {
      console.error("Error updating vendor:", err);
      alert(`Failed to update vendor: ${err.message}`);
    } finally {
      setEditLoading(false);
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

  // Perbaiki filteredVendors untuk lebih stabil
  const filteredVendors = useMemo(() => {
    if (!keyword.trim() && !dateFrom && !dateTo) return vendors;

    const searchTerm = keyword.toLowerCase().trim();

    return vendors.filter((vendor) => {
      // Filter by keyword
      let matchesKeyword = true;
      if (keyword.trim()) {
        switch (searchBy) {
          case "Vendor":
            matchesKeyword = vendor.vendor_name
              ?.toLowerCase()
              .includes(searchTerm);
            break;
          case "Product Code":
            matchesKeyword = vendor.vendor_code
              ?.toLowerCase()
              .includes(searchTerm);
            break;
          case "Product Description":
            matchesKeyword = vendor.vendor_desc
              ?.toLowerCase()
              .includes(searchTerm);
            break;
          default:
            matchesKeyword = true;
        }
      }

      // Filter by date
      let matchesDate = true;
      if (dateFrom || dateTo) {
        const vendorDate = new Date(vendor.created_at);

        if (dateFrom) {
          const fromDate = new Date(dateFrom);
          matchesDate = matchesDate && vendorDate >= fromDate;
        }

        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && vendorDate <= toDate;
        }
      }

      return matchesKeyword && matchesDate;
    });
  }, [vendors, keyword, searchBy, dateFrom, dateTo]);

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
    fetchVendorTypes();
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

    // ==================== EDIT MODAL STYLES ====================
    editModalOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
    },
    editModalContainer: {
      backgroundColor: "white",
      borderRadius: "8px",
      padding: "24px",
      width: "550px",
      maxWidth: "90vw",
      maxHeight: "90vh",
      overflow: "auto",
      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
    },
    editModalHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: "1px solid #e5e7eb",
      paddingBottom: "12px",
      marginBottom: "20px",
    },
    editModalTitle: {
      fontSize: "18px",
      fontWeight: "600",
      color: "#374151",
      margin: 0,
    },
    editModalCloseButton: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "4px",
      borderRadius: "4px",
      color: "#6b7280",
    },
    editFormGroup: {
      marginBottom: "16px",
    },
    editFormLabel: {
      display: "block",
      fontSize: "13px",
      fontWeight: "500",
      color: "#374151",
      marginBottom: "6px",
    },
    editFormInput: {
      width: "100%",
      height: "38px",
      borderRadius: "6px",
      border: "2px solid #e5e7eb",
      padding: "0 12px",
      fontSize: "13px",
      outline: "none",
      transition: "border-color 0.2s ease",
      boxSizing: "border-box",
    },
    editFormSelect: {
      width: "100%",
      height: "38px",
      borderRadius: "6px",
      border: "2px solid #e5e7eb",
      padding: "0 12px",
      fontSize: "13px",
      outline: "none",
      transition: "border-color 0.2s ease",
      backgroundColor: "white",
      cursor: "pointer",
      boxSizing: "border-box",
    },
    editFormTextarea: {
      width: "100%",
      minHeight: "80px",
      borderRadius: "6px",
      border: "2px solid #e5e7eb",
      padding: "10px 12px",
      fontSize: "13px",
      outline: "none",
      transition: "border-color 0.2s ease",
      resize: "vertical",
      fontFamily: "inherit",
      boxSizing: "border-box",
    },
    editFormRow: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "16px",
    },
    editRequiredStar: {
      color: "#ef4444",
      marginLeft: "2px",
    },
    editVendorCodeDisplay: {
      padding: "10px 12px",
      backgroundColor: "#f3f4f6",
      borderRadius: "6px",
      fontSize: "13px",
      color: "#6b7280",
      border: "2px solid #e5e7eb",
    },
    editButtonGroup: {
      display: "flex",
      gap: "12px",
      justifyContent: "flex-end",
      marginTop: "24px",
      paddingTop: "16px",
      borderTop: "1px solid #e5e7eb",
    },
    editSubmitButton: {
      backgroundColor: "#1d4ed8",
      color: "white",
      padding: "8px 16px",
      border: "none",
      borderRadius: "4px",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    editCancelButton: {
      backgroundColor: "#f3f4f6",
      color: "#374151",
      padding: "8px 16px",
      border: "none",
      borderRadius: "4px",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.tooltip}>
        {tooltip.content}
        <div style={styles.tooltipArrow}></div>
      </div>

      {/* ==================== EDIT VENDOR MODAL ==================== */}
      {editModalOpen && (
        <div style={styles.editModalOverlay}>
          <div style={styles.editModalContainer}>
            <div style={styles.editModalHeader}>
              <h3 style={styles.editModalTitle}>Edit Vendor</h3>
              <button
                style={styles.editModalCloseButton}
                onClick={handleCloseEditModal}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateVendor}>
              {/* Vendor Code (Read-only) */}
              <div style={styles.editFormGroup}>
                <label style={styles.editFormLabel}>Vendor Code</label>
                <div style={styles.editVendorCodeDisplay}>
                  {editVendorData.vendor_code}
                </div>
              </div>

              {/* Vendor Name */}
              <div style={styles.editFormGroup}>
                <label style={styles.editFormLabel}>
                  Vendor Name<span style={styles.editRequiredStar}>*</span>
                </label>
                <input
                  type="text"
                  style={styles.editFormInput}
                  value={editVendorData.vendor_name}
                  onChange={(e) =>
                    handleEditInputChange("vendor_name", e.target.value)
                  }
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  placeholder="Enter vendor name"
                  required
                />
              </div>

              {/* Vendor Description */}
              <div style={styles.editFormGroup}>
                <label style={styles.editFormLabel}>
                  Description<span style={styles.editRequiredStar}>*</span>
                </label>
                <textarea
                  style={styles.editFormTextarea}
                  value={editVendorData.vendor_desc}
                  onChange={(e) =>
                    handleEditInputChange("vendor_desc", e.target.value)
                  }
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  placeholder="Enter vendor description"
                  required
                />
              </div>

              {/* Vendor Type */}
              <div style={styles.editFormGroup}>
                <label style={styles.editFormLabel}>Vendor Type</label>
                <select
                  style={styles.editFormSelect}
                  value={editVendorData.vendor_type_id}
                  onChange={(e) =>
                    handleEditInputChange("vendor_type_id", e.target.value)
                  }
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                >
                  <option value="">Select Vendor Type</option>
                  {vendorTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.type_name || type.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Types */}
              <div style={styles.editFormGroup}>
                <label style={styles.editFormLabel}>Types</label>
                <input
                  type="text"
                  style={styles.editFormInput}
                  value={editVendorData.types}
                  onChange={(e) =>
                    handleEditInputChange("types", e.target.value)
                  }
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  placeholder="Enter types (e.g., Supplier, Manufacturer)"
                />
              </div>

              {/* Country & City Row */}
              <div style={styles.editFormRow}>
                <div style={styles.editFormGroup}>
                  <label style={styles.editFormLabel}>Country</label>
                  <input
                    type="text"
                    style={styles.editFormInput}
                    value={editVendorData.vendor_country}
                    onChange={(e) =>
                      handleEditInputChange("vendor_country", e.target.value)
                    }
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    placeholder="Enter country"
                  />
                </div>
                <div style={styles.editFormGroup}>
                  <label style={styles.editFormLabel}>City</label>
                  <input
                    type="text"
                    style={styles.editFormInput}
                    value={editVendorData.vendor_city}
                    onChange={(e) =>
                      handleEditInputChange("vendor_city", e.target.value)
                    }
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    placeholder="Enter city"
                  />
                </div>
              </div>

              {/* Status */}
              <div style={styles.editFormGroup}>
                <label style={styles.editFormLabel}>Status</label>
                <select
                  style={styles.editFormSelect}
                  value={editVendorData.is_active}
                  onChange={(e) =>
                    handleEditInputChange(
                      "is_active",
                      e.target.value === "true"
                    )
                  }
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                >
                  <option value={true}>Active</option>
                  <option value={false}>Inactive</option>
                </select>
              </div>

              {/* Button Group */}
              <div style={styles.editButtonGroup}>
                <button
                  type="button"
                  style={styles.editCancelButton}
                  onClick={handleCloseEditModal}
                >
                  <X size={16} />
                  Cancel
                </button>
                <button
                  type="submit"
                  style={styles.editSubmitButton}
                  disabled={editLoading}
                >
                  <Save size={16} />
                  {editLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              onClick={() => navigate("/vendor-details/add")}
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
                    // 🔥 PERBAIKAN: Hapus kurung kurawal ganda yang tidak perlu
                    paginatedVendors.map((vendor, index) => {
                      // 🔥 GUNAKAN ID atau row_num dari backend
                      const displayNumber =
                        vendor.row_num ||
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
                            {displayNumber}
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
                              onClick={() => handleOpenEditModal(vendor)}
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