"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MdArrowRight, MdArrowDropDown } from "react-icons/md";
import { Plus, Trash2, Pencil, Save, X } from "lucide-react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const PartDetailsPage = ({ sidebarVisible }) => {
  const navigate = useNavigate();

  // State untuk data
  const [partsData, setPartsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State lainnya yang sudah ada
  const [selectedStockLevel, setSelectedStockLevel] = useState("M101");
  const [selectedModel, setSelectedModel] = useState("Veronicas");
  const [selectedAnnexUpdate, setSelectedAnnexUpdate] =
    useState("ZAHRUL ROMADHON");

  const [customers, setCustomers] = useState([]);
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Fetch customers data
  const fetchCustomers = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/customers/active-minimal`);
      const data = await response.json();
      setCustomers(data);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  // Function untuk get customer name by ID (hanya cust_name) - DIPINDAHKAN KE ATAS
  const getCustomerName = useCallback(
    (customerSpecial) => {
      if (!customerSpecial) return null;

      try {
        const customerIds = Array.isArray(customerSpecial)
          ? customerSpecial
          : JSON.parse(customerSpecial);

        const customerNames = customerIds.map((id) => {
          const customer = customers.find(
            (c) => c.id.toString() === id.toString()
          );
          return customer ? customer.cust_name : `Customer ${id}`;
        });

        return customerNames.join(", ");
      } catch (error) {
        console.error("Error parsing customer_special:", error);
        return "Special Customer";
      }
    },
    [customers]
  );

  // Fungsi untuk fetch data dari kanban_master
  const fetchPartsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE}/api/kanban-master/with-details`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setPartsData(result.data || []);
      } else {
        throw new Error(result.message || "Failed to fetch parts data");
      }
    } catch (err) {
      console.error("Error fetching parts data:", err);
      setError(err.message);
      setPartsData([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data saat komponen mount
  useEffect(() => {
    fetchPartsData();
    fetchCustomers();
  }, []);

  // Fungsi untuk handle search
  const handleSearchClick = async () => {
    try {
      setLoading(true);

      let url = `${API_BASE}/api/kanban-master/with-details?`;
      const params = [];

      if (dateFrom) params.push(`date_from=${dateFrom}`);
      if (dateTo) params.push(`date_to=${dateTo}`);
      if (keyword) {
        switch (searchBy) {
          case "Vendor":
            params.push(`vendor_name=${encodeURIComponent(keyword)}`);
            break;
          case "Product Code":
            params.push(`part_code=${encodeURIComponent(keyword)}`);
            break;
          case "Product Description":
            params.push(`part_name=${encodeURIComponent(keyword)}`);
            break;
          case "Customers":
            // Untuk customer, kita akan filter di frontend karena backend belum support
            // Atau bisa implement backend filter nanti
            break;
          default:
            break;
        }
      }

      url += params.join("&");

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setPartsData(result.data || []);
        setCurrentPage(1);
      } else {
        throw new Error(result.message || "Search failed");
      }
    } catch (err) {
      console.error("Error searching parts:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter data berdasarkan search - DIUBAH MENGGUNAKAN useCallback
  const filteredData = useMemo(() => {
    if (!keyword) return partsData;

    const searchTerm = keyword.toLowerCase();

    switch (searchBy) {
      case "Vendor":
        return partsData.filter((part) =>
          part.vendor_name?.toLowerCase().includes(searchTerm)
        );
      case "Product Code":
        return partsData.filter((part) =>
          part.part_code?.toLowerCase().includes(searchTerm)
        );
      case "Product Description":
        return partsData.filter((part) =>
          part.part_name?.toLowerCase().includes(searchTerm)
        );
      case "Customers":
        return partsData.filter((part) => {
          // Filter untuk special customers
          if (part.part_types === "Special") {
            const customerName = getCustomerName(part.customer_special);
            return customerName?.toLowerCase().includes(searchTerm);
          }
          // Untuk regular parts, cek jika "All Customers" match dengan search
          return "all customers".includes(searchTerm);
        });
      default:
        return partsData;
    }
  }, [partsData, keyword, searchBy, getCustomerName]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  // Format date untuk display
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

  // Fungsi untuk handle delete part
  const handleDeletePart = async (partId, partCode) => {
    if (!window.confirm(`Are you sure you want to delete part ${partCode}?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/kanban-master/${partId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || `HTTP error! status: ${response.status}`
        );
      }

      if (result.success) {
        alert(`Part ${partCode} deleted successfully!`);
        // Refresh data setelah delete
        fetchPartsData();
      } else {
        throw new Error(result.message || "Failed to delete part");
      }
    } catch (err) {
      console.error("Error deleting part:", err);
      alert(`Failed to delete part: ${err.message}`);
    }
  };

  // Toggle row expansion (fungsi yang sudah ada)
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
            <h1 style={styles.title}>Part Details</h1>
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
                <option value="Customers" style={optionStyle}>
                  Customers
                </option>
              </select>

              {searchBy === "Vendor" ? (
                // Dropdown untuk Vendor
                <select
                  style={styles.input}
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                >
                  <option value="">Select Vendor</option>
                  {[
                    ...new Set(
                      partsData.map((part) => part.vendor_name).filter(Boolean)
                    ),
                  ].map((vendor) => (
                    <option key={vendor} value={vendor}>
                      {vendor}
                    </option>
                  ))}
                </select>
              ) : searchBy === "Customers" ? (
                // Dropdown untuk Customers
                <select
                  style={styles.input}
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                >
                  <option value="">Select Customer</option>
                  <option value="all customers">All Customers</option>
                  {/* Special Customers dari data yang ada */}
                  {[
                    ...new Set(
                      partsData
                        .filter((part) => part.part_types === "Special")
                        .map((part) => getCustomerName(part.customer_special))
                        .filter(Boolean)
                    ),
                  ].map((customer) => (
                    <option key={customer} value={customer}>
                      {customer}
                    </option>
                  ))}
                </select>
              ) : (
                // Input text untuk Product Code / Product Description
                <input
                  type="text"
                  style={styles.input}
                  placeholder={`Input ${searchBy} Keyword`}
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
                onMouseEnter={(e) => handleButtonHover(e, true, "search")}
                onMouseLeave={(e) => handleButtonHover(e, false, "search")}
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </div>
        </div>
        {/* Error Message */}
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
            onMouseEnter={(e) => handleButtonHover(e, true, "search")}
            onMouseLeave={(e) => handleButtonHover(e, false, "search")}
            onClick={() => navigate("/vendor-parts/add-parts")}
          >
            <Plus size={16} />
            New Part
          </button>
        </div>
        {/* Loading State */}
        {loading && (
          <div
            style={{
              textAlign: "center",
              padding: "20px",
              fontSize: "14px",
              color: "#6b7280",
            }}
          >
            Loading parts data...
          </div>
        )}

        {/* Table Data */}
        {!loading && (
          <div style={styles.tableContainer}>
            <div style={styles.tableBodyWrapper}>
              <table
                style={{
                  ...styles.table,
                  minWidth: "1800px",
                  tableLayout: "fixed",
                }}
              >
                <colgroup>
                  <col style={{ width: "3%" }} />
                  <col style={{ width: "10%" }} /> {/* Part Code */}
                  <col style={{ width: "20%" }} /> {/* Part Name */}
                  <col style={{ width: "8%" }} /> {/* Part Size */}
                  <col style={{ width: "8%" }} /> {/* QTY Per Box */}
                  <col style={{ width: "12%" }} /> {/* Part Material */}
                  <col style={{ width: "10%" }} /> {/* Part Types */}
                  <col style={{ width: "15%" }} /> {/* Customer */}
                  <col style={{ width: "10%" }} /> {/* Model */}
                  <col style={{ width: "15%" }} /> {/* Vendor */}
                  <col style={{ width: "12%" }} /> {/* Vendor Types */}
                  <col style={{ width: "12%" }} /> {/* Stock Level To */}
                  <col style={{ width: "15%" }} /> {/* Created By */}
                  <col style={{ width: "5%" }} /> {/* Action */}
                </colgroup>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.expandedTh}>No</th>
                    <th style={styles.thWithLeftBorder}>Part Code</th>
                    <th style={styles.thWithLeftBorder}>Part Name</th>
                    <th style={styles.thWithLeftBorder}>Part Size</th>
                    <th style={styles.thWithLeftBorder}>QTY Per Box</th>
                    <th style={styles.thWithLeftBorder}>Part Material</th>
                    <th style={styles.thWithLeftBorder}>Part Types</th>
                    <th style={styles.thWithLeftBorder}>Customer</th>
                    <th style={styles.thWithLeftBorder}>Model</th>
                    <th style={styles.thWithLeftBorder}>Vendor</th>
                    <th style={styles.thWithLeftBorder}>Vendor Types</th>
                    <th style={styles.thWithLeftBorder}>Stock Level To</th>
                    <th style={styles.thWithLeftBorder}>Created By</th>
                    <th style={styles.thWithLeftBorder}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.length === 0 ? (
                    <tr>
                      {/* <td
                        colSpan="16"
                        style={{
                          ...styles.tdWithLeftBorder,
                          textAlign: "center",
                          fontStyle: "italic",
                          color: "#6b7280",
                          padding: "20px",
                        }}
                      >
                        {partsData.length === 0
                          ? "No parts data available."
                          : "No parts match your search criteria."}
                      </td> */}
                    </tr>
                  ) : (
                    currentData.map((part, index) => (
                      <tr
                        key={part.id}
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
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {part.part_code}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {part.part_name}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {part.part_size}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {part.qty_per_box}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {part.part_material || "-"}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {part.part_types}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {part.part_types === "Special" ? (
                            <div
                              title={
                                getCustomerName(part.customer_special) ||
                                "Special Customer"
                              }
                            >
                              <div>
                                {getCustomerName(part.customer_special)
                                  ? getCustomerName(part.customer_special)
                                      .length > 25
                                    ? getCustomerName(
                                        part.customer_special
                                      ).substring(0, 25) + "..."
                                    : getCustomerName(part.customer_special)
                                  : "Special Customer"}
                              </div>
                            </div>
                          ) : (
                            <span>All Customers</span>
                          )}
                        </td>
                        <td style={styles.tdWithLeftBorder}>{part.model}</td>
                        <td style={styles.tdWithLeftBorder}>
                          {part.vendor_name || "-"}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {part.vendor_type || "-"}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {part.stock_level_to}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {part.created_by_name || "System"} |{" "}
                          {formatDateForDisplay(part.created_at)}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          <button
                            style={styles.deleteButton}
                            onClick={() =>
                              handleDeletePart(part.id, part.part_code)
                            }
                            title="Delete Part"
                          >
                            <Trash2 size={10} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination - SELALU TAMPIL walaupun tidak ada data */}
            <div style={styles.paginationBar}>
              <div style={styles.paginationControls}>
                <button
                  style={styles.paginationButton}
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1 || filteredData.length === 0}
                  onMouseEnter={(e) => handleButtonHover(e, true, "pagination")}
                  onMouseLeave={(e) =>
                    handleButtonHover(e, false, "pagination")
                  }
                >
                  {"<<"}
                </button>
                <button
                  style={styles.paginationButton}
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1 || filteredData.length === 0}
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
                  disabled={filteredData.length === 0}
                />
                <span>of {totalPages}</span>
                <button
                  style={styles.paginationButton}
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={
                    currentPage === totalPages || filteredData.length === 0
                  }
                  onMouseEnter={(e) => handleButtonHover(e, true, "pagination")}
                  onMouseLeave={(e) =>
                    handleButtonHover(e, false, "pagination")
                  }
                >
                  {">"}
                </button>
                <button
                  style={styles.paginationButton}
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={
                    currentPage === totalPages || filteredData.length === 0
                  }
                  onMouseEnter={(e) => handleButtonHover(e, true, "pagination")}
                  onMouseLeave={(e) =>
                    handleButtonHover(e, false, "pagination")
                  }
                >
                  {">>"}
                </button>
              </div>
              <div style={{ fontSize: "12px", color: "#374151" }}>
                Total Row : {filteredData.length} 
              </div>
            </div>
          </div>
        )}
        {addVendorDetail && (
          <div style={styles.popupOverlay}>
            {" "}
            <div style={styles.popupContainer}>
              {" "}
              <div style={styles.popupHeader}>
                {" "}
                <h3 style={styles.popupTitle}>Add Vendor Detail</h3>{" "}
                <button
                  style={styles.closeButton}
                  onClick={() => setAddVendorDetail(false)}
                >
                  {" "}
                  <X size={20} />{" "}
                </button>{" "}
              </div>{" "}
              <form onSubmit={handleAddVendorSubmit}>
                {" "}
                <div style={styles.formGroup}>
                  {" "}
                  <label style={styles.labelPopUp}>Trip</label>{" "}
                  <select
                    style={styles.inputPopUp}
                    value={addVendorFormData.partCode}
                    onChange={(e) =>
                      handleAddVendorInputChange("partCode", e.target.value)
                    }
                    required
                  >
                    {" "}
                    <option value="">Select Trip</option>{" "}
                    <option value="Trip-01">Trip-01</option>{" "}
                    <option value="Trip-02">Trip-02</option>{" "}
                    <option value="Trip-03">Trip-03</option>{" "}
                    <option value="Trip-04">Trip-04</option>{" "}
                    <option value="Trip-05">Trip-05</option>{" "}
                  </select>{" "}
                </div>{" "}
                <div style={styles.formGroup}>
                  {" "}
                  <label style={styles.labelPopUp}>Vendor Name</label>{" "}
                  <select
                    style={styles.inputPopUp}
                    value={addVendorFormData.partName}
                    onChange={(e) =>
                      handleAddVendorInputChange("partName", e.target.value)
                    }
                    required
                  >
                    {" "}
                    <option value="">Select Vendor</option>{" "}
                    <option value="188646 - PT. DAIHO INDONESIA">
                      {" "}
                      188646 - PT. DAIHO INDONESIA{" "}
                    </option>{" "}
                    <option value="188651 - PT SAT NUSAPERSADA TBK">
                      {" "}
                      188651 - PT SAT NUSAPERSADA TBK{" "}
                    </option>{" "}
                    <option value="199869 - PT PRIMA LABELING">
                      {" "}
                      199869 - PT PRIMA LABELING{" "}
                    </option>{" "}
                    <option value="192447 - SANSYU PRECISION SINGAPORE PTE LTD">
                      {" "}
                      192447 - SANSYU PRECISION SINGAPORE PTE LTD{" "}
                    </option>{" "}
                  </select>{" "}
                </div>{" "}
                <div style={styles.formGroup}>
                  {" "}
                  <label style={styles.labelPopUp}>DO Number</label>{" "}
                  <input
                    style={styles.inputPopUpDO}
                    onChange={(e) =>
                      handleAddVendorInputChange("", e.target.value)
                    }
                    placeholder=""
                    min="1"
                    required
                  />{" "}
                </div>{" "}
                <div style={styles.formGroup}>
                  {" "}
                  <label style={styles.labelPopUp}>Arrival Time</label>{" "}
                  <input
                    type="time"
                    style={styles.input}
                    value={addVendorFormData.quantity}
                    onChange={(e) =>
                      handleAddVendorInputChange("quantity", e.target.value)
                    }
                    placeholder=""
                  />{" "}
                </div>{" "}
                <div style={styles.buttonGroup}>
                  {" "}
                  <button
                    type="button"
                    style={styles.cancelButton}
                    onClick={() => setAddVendorDetail(false)}
                  >
                    {" "}
                    Cancel{" "}
                  </button>{" "}
                  <button type="submit" style={styles.submitButton}>
                    {" "}
                    Add{" "}
                  </button>{" "}
                </div>{" "}
              </form>{" "}
            </div>{" "}
          </div>
        )}
      </div>
    </div>
  );
};

export default PartDetailsPage;
