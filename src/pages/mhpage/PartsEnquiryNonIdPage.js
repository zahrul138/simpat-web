"use client";

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MdArrowRight, MdArrowDropDown } from "react-icons/md";
import { Plus, Trash2, Pencil, Save, X, Search } from "lucide-react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const getAuthUserLocal = () => {
  try {
    return JSON.parse(sessionStorage.getItem("auth_user") || "null");
  } catch {
    return null;
  }
};

const PartsEnquiryNonIdPage = ({ sidebarVisible }) => {
  const navbarTotalHeight = 164;
  const sidebarWidth = 288;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [partsData, setPartsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const tableData = partsData;
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

  const [remarks, setRemarks] = useState({});
  const [activeTab, setActiveTab] = useState("New");
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  
  const [filterPartCode, setFilterPartCode] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const handleRemarkChange = (rowId, value) => {
    setRemarks((prev) => ({
      ...prev,
      [rowId]: value,
    }));
  };

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab.charAt(0).toUpperCase() + tab.slice(1));
    }
  }, [searchParams]);

  useEffect(() => {
    fetchPartsEnquiry();
  }, [activeTab]);

  const fetchPartsEnquiry = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/parts-enquiry-non-id?status=${activeTab}`
      );
      const result = await response.json();
      
      if (result.success) {
        setPartsData(result.data);
        
        const remarksObj = {};
        result.data.forEach(item => {
          remarksObj[item.id] = item.remark || "";
        });
        setRemarks(remarksObj);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemarkBlur = async (partId) => {
    try {
      await fetch(`${API_BASE}/api/parts-enquiry-non-id/${partId}/remark`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remark: remarks[partId] || "" })
      });
    } catch (error) {
      console.error("Update remark error:", error);
    }
  };

  const handleResetFilter = () => {
    setFilterPartCode("");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const handleCheckbox = (id) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(partsData.map(p => p.id)));
    }
    setSelectAll(!selectAll);
  };

  const handleInputRequest = async () => {
    if (selectedItems.size === 0) {
      alert("Please select at least one item");
      return;
    }

    if (!window.confirm(`Move ${selectedItems.size} item(s) to Waiting?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/parts-enquiry-non-id/move-to-waiting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedItems) })
      });

      const result = await response.json();
      if (result.success) {
        alert(result.message);
        setSelectedItems(new Set());
        setSelectAll(false);
        fetchPartsEnquiry();
      } else {
        alert("Failed: " + result.message);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error moving items");
    }
  };

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

  // Fungsi untuk menampilkan tooltip dengan konten dari elemen yang dihover
  const showTooltip = (e) => {
    // Dapatkan konten dari elemen yang dihover
    let content = "";

    // Jika elemen adalah tombol dengan ikon, gunakan title dari button
    if (e.target.tagName === "BUTTON" || e.target.closest("button")) {
      const button =
        e.target.tagName === "BUTTON" ? e.target : e.target.closest("button");

      // Cek apakah ini button Plus (Add)
      if (
        button.querySelector('svg[data-icon="plus"]') ||
        (button.querySelector("svg") &&
          button.querySelector("svg").parentElement.contains(e.target) &&
          button.querySelector('[size="10"]'))
      ) {
        content = "Add";
      }
      // Cek apakah ini button Trash (Delete)
      else if (
        button.querySelector('svg[data-icon="trash-2"]') ||
        (button.querySelector("svg") &&
          button.querySelector("svg").parentElement.contains(e.target) &&
          button.classList.contains("delete-button"))
      ) {
        content = "Delete";
      } else if (button.title) {
        content = button.title;
      } else if (button.querySelector("svg")) {
        // Jika button berisi ikon, tentukan konten berdasarkan ikonnya
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
    }
    // Jika elemen adalah checkbox
    else if (e.target.type === "checkbox") {
      content = "Pilih baris ini";
    }
    // Jika elemen adalah td atau th, ambil textContent
    else if (e.target.tagName === "TD" || e.target.tagName === "TH") {
      content = e.target.textContent.trim();

      // Jika konten kosong, beri penjelasan berdasarkan posisi/konteks
      if (!content) {
        // Coba tentukan berdasarkan class atau atribut lain
        if (e.target.cellIndex === 1) {
          // Kolom checkbox
          content = "Pilih baris ini";
        } else if (e.target.cellIndex === 2) {
          // Kolom expand/collapse
          content = "Perluas/sembunyikan detail";
        }
      }
    }

    // Jika masih tidak ada konten, coba ambil dari parent
    if (!content && e.target.textContent.trim()) {
      content = e.target.textContent.trim();
    }

    // Jika masih kosong, beri nilai default
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

  // Fungsi untuk menyembunyikan tooltip
  const hideTooltip = () => {
    setTooltip({
      ...tooltip,
      visible: false,
    });
  };

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
      marginBottom: "15px",
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

    //Style Add dan Delete Button dalam table
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

    // Style untuk memastikan teks tidak terpotong
    cellContent: {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    tripDisplayTable: {
      display: "flex",
      height: "0.40rem",
      width: "60%",
      borderRadius: "6px",
      border: "1px solid #d1d5db",
      backgroundColor: "#f3f4f6",
      padding: "8px 12px",
      fontSize: "12px",
      alignItems: "center",
      color: "#374151",
      fontFamily: "inherit",
      margin: 0,
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
      alignItems: "center",
      color: "#374151",
      fontFamily: "inherit",
      margin: 0,
      outline: "none",
      boxSizing: "border-box",
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
        ? styles.tabButtonHover.color
        : styles.tabButton.color;
    }
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
            <h1 style={styles.title}>Request Parts Enquiry Non-ID</h1>
          </div>

          <div style={styles.filterRow}>
            <div style={styles.inputGroup}>
              <span style={styles.label}>Part Code</span>
              <input
                type="text"
                value={filterPartCode}
                onChange={(e) => setFilterPartCode(e.target.value)}
                placeholder="Input Keyword"
                style={styles.input}
              />
            </div>
            <div style={styles.inputGroup}>
              <span style={styles.label}>Date Filter</span>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                style={styles.input}
              />
              <span style={styles.label}>To</span>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                style={styles.input}
              />
              <button
                style={styles.button}
                onClick={fetchPartsEnquiry}
              >
                Search
              </button>
              <button
                style={{ ...styles.button, backgroundColor: "#6b7280" }}
                onClick={handleResetFilter}
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <div style={styles.actionButtonsGroup}>
          {activeTab === "New" && selectedItems.size > 0 && (
            <button
              style={{ ...styles.button, backgroundColor: "#10b981", color: "white" }}
              onClick={handleInputRequest}
            >
              <MdArrowRight size={16} />
              Input Request ({selectedItems.size})
            </button>
          )}
          <button
            style={{ ...styles.button, ...styles.primaryButton }}
            onMouseEnter={(e) => handleButtonHover(e, true, "primary")}
            onMouseLeave={(e) => handleButtonHover(e, false, "primary")}
            onClick={() => navigate("/part-enquiry-non-id/add")}
          >
            <Plus size={16} />
            Add New Request
          </button>
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
            New
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "Waiting" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("Waiting")}
            onMouseEnter={(e) =>
              handleTabHover(e, true, activeTab === "Waiting")
            }
            onMouseLeave={(e) =>
              handleTabHover(e, false, activeTab === "Waiting")
            }
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
                minWidth: "900px",
                tableLayout: "fixed",
              }}
            >
              <colgroup>
                <col style={{ width: "2%" }} />
                <col style={{ width: "2%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "8.5%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "4%" }} />
              </colgroup>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.expandedTh}>No</th>
                  {partsData.length > 1 && activeTab === "New" && (
                    <th style={styles.thWithLeftBorder}>
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
                    </th>
                  )}
                  <th style={styles.thWithLeftBorder}>Label ID</th>
                  <th style={styles.thWithLeftBorder}>Part Code</th>
                  <th style={styles.thWithLeftBorder}>Part Name</th>
                  <th style={styles.thWithLeftBorder}>Model</th>
                  <th style={styles.thWithLeftBorder}>Qty Requested</th>
                  <th style={styles.thWithLeftBorder}>Remark</th>
                  <th style={styles.thWithLeftBorder}>Request By</th>
                  <th style={styles.thWithLeftBorder}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>
                      Loading...
                    </td>
                  </tr>
                ) : partsData.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>
                      No data available
                    </td>
                  </tr>
                ) : (
                  partsData.map((part, index) => (
                    <tr
                      key={part.id}
                      onMouseEnter={(e) =>
                        (e.target.closest("tr").style.backgroundColor = "#c7cde8")
                      }
                      onMouseLeave={(e) =>
                        (e.target.closest("tr").style.backgroundColor = "transparent")
                      }
                    >
                      <td style={{ ...styles.expandedTd, ...styles.expandedWithLeftBorder, ...styles.emptyColumn }}>
                        {index + 1}
                      </td>
                      {partsData.length > 1 && activeTab === "New" && (
                        <td style={styles.tdWithLeftBorder}>
                          <input
                            type="checkbox"
                            checked={selectedItems.has(part.id)}
                            onChange={() => handleCheckbox(part.id)}
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
                      <td style={styles.tdWithLeftBorder}>{part.label_id || "-"}</td>
                      <td style={styles.tdWithLeftBorder}>{part.part_code}</td>
                      <td style={styles.tdWithLeftBorder}>{part.part_name}</td>
                      <td style={styles.tdWithLeftBorder}>{part.model}</td>
                      <td style={styles.tdWithLeftBorder}>{part.qty_requested}</td>
                      <td style={styles.tdWithLeftBorder}>
                        {activeTab === "New" ? (
                          <input
                            type="text"
                            value={remarks[part.id] || ""}
                            onChange={(e) => handleRemarkChange(part.id, e.target.value)}
                            onBlur={() => handleRemarkBlur(part.id)}
                            placeholder="Enter remark..."
                            style={styles.remarkInput}
                          />
                        ) : (
                          part.remark || "-"
                        )}
                      </td>
                      <td style={styles.tdWithLeftBorder}>
                        {part.requested_by_name || "Unknown"} | {part.requested_at || "-"}
                      </td>
                      <td style={styles.tdWithLeftBorder}>
                        {activeTab === "New" && (
                          <button style={styles.deleteButton}>
                            <Trash2 size={10} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
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
        <div style={styles.saveConfiguration}>
          <button style={{ ...styles.button, ...styles.primaryButton }}>
            <Save size={16} />
            Input Request
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

export default PartsEnquiryNonIdPage;