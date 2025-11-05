"use client";

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MdArrowRight, MdArrowDropDown } from "react-icons/md";
import { Plus, Trash2, Pencil, Save } from "lucide-react";
import { Helmet } from "react-helmet";

// === FE CONFIG ===
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";
const API = {
  schedules: {
    list: (q) => `/api/production-schedules?${new URLSearchParams(q || {})}`,
    detail: (id) => `/api/production-schedules/${id}`,
    updateStatus: (id) => `/api/production-schedules/${id}/status`,
  },
};

const http = async (path, { method = "GET", body, headers } = {}) => {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {}
  if (!res.ok) {
    const msg = data?.message || text || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
};

const toDDMMYYYY = (iso) => {
  if (!iso) return "-";
  
  try {
    // Coba parse sebagai Date object
    const date = new Date(iso);
    if (isNaN(date.getTime())) {
      // Jika parsing gagal, coba manual split
      if (iso.includes('-')) {
        const [y, m, d] = iso.split('-');
        if (y && m && d) return `${d}/${m}/${y}`;
      }
      return iso;
    }
    
    // Format sebagai DD/MM/YYYY
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return iso;
  }
};

const TargetSchedulePage = ({ sidebarVisible }) => {
  const navigate = useNavigate();

  // === STATE UTAMA ===
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

  // === STATE BARU: Selection & Actions ===
  const [selectedHeaderIds, setSelectedHeaderIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // === STATE API ===
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState({});
  const [error, setError] = useState(null);
  const [detailCache, setDetailCache] = useState({});

  // Filter/search
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchBy, setSearchBy] = useState("Customer");
  const [keyword, setKeyword] = useState("");

  // === STATE TAB AKTIF ===
  const [activeTab, setActiveTab] = useState("New");

  // === FUNGSI SELECTION ===
  const toggleHeaderCheckbox = (headerId, checked) => {
    setSelectedHeaderIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(headerId);
      } else {
        next.delete(headerId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedHeaderIds(new Set());
    } else {
      const newScheduleIds = productionSchedules
        .filter(schedule => schedule.status === "New")
        .map(schedule => schedule.id);
      setSelectedHeaderIds(new Set(newScheduleIds));
    }
    setSelectAll(!selectAll);
  };

  // === FUNGSI SAVE SCHEDULE (Pindah ke OnProgress) ===
  const handleSaveSchedule = async () => {
    if (selectedHeaderIds.size === 0) {
      alert("Pilih minimal 1 schedule untuk disimpan!");
      return;
    }

    if (!window.confirm(`Apakah Anda yakin ingin menyimpan ${selectedHeaderIds.size} schedule ke OnProgress?`)) {
      return;
    }

    setSaveLoading(true);
    try {
      const updatePromises = Array.from(selectedHeaderIds).map(id =>
        http(API.schedules.updateStatus(id), {
          method: "PATCH",
          body: { status: "OnProgress" }
        })
      );

      await Promise.all(updatePromises);
      
      // Refresh data setelah update berhasil
      await loadSchedulesFromServer();
      setSelectedHeaderIds(new Set());
      setSelectAll(false);
      
      setToastMessage(`${selectedHeaderIds.size} schedule berhasil dipindahkan ke OnProgress`);
      setToastType("success");
    } catch (err) {
      console.error("Error saving schedules:", err);
      alert("Gagal menyimpan schedule: " + (err.message || "Unknown error"));
    } finally {
      setSaveLoading(false);
    }
  };

  // === TOAST NOTIFICATION ===
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
      setToastType(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Fungsi toggle row expansion (tetap sama)
  const toggleRowExpansion = async (rowId) => {
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

    // load detail saat expand pertama
    if (!expandedRows[rowId] && !detailCache[rowId]) {
      try {
        setLoadingDetail((p) => ({ ...p, [rowId]: true }));
        const data = await http(API.schedules.detail(rowId));
        const details = (data?.details || []).map((d) => ({
          materialCode: d.material_code || "",
          customer: d.customer || "",
          model: d.model || "",
          description: d.description || "",
          input: d.input || 0,
          poNumber: d.po_number || "",
          palletType: d.pallet_type || "Pallet R",
          palletUse: d.pallet_use || 1,
        }));
        setDetailCache((p) => ({ ...p, [rowId]: details }));
      } catch (err) {
        console.warn("load details failed", err);
      } finally {
        setLoadingDetail((p) => ({ ...p, [rowId]: false }));
      }
    }
  };

  const openThirdLevelPopup = () => {
    setAddCustomerDetail(true);
  };

  const toggleVendorRowExpansion = (vendorRowId) => {
    setExpandedVendorRows((prev) => ({
      ...prev,
      [vendorRowId]: !prev[vendorRowId],
    }));
  };

  // === LOAD DATA DARI SERVER ===
  const resolvedStatus = useMemo(() => {
    return ["New", "OnProgress", "Complete", "Reject"].includes(activeTab)
      ? activeTab
      : undefined;
  }, [activeTab]);

  const buildListQuery = () => {
    const q = {};
    if (resolvedStatus) q.status = resolvedStatus;
    if (dateFrom) q.dateFrom = dateFrom;
    if (dateTo) q.dateTo = dateTo;
    if (keyword?.trim()) q.q = keyword.trim();
    q.limit = 50;
    q.page = 1;
    return q;
  };

  const loadSchedulesFromServer = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await http(API.schedules.list(buildListQuery()));
      const items = resp?.items || [];
      const mapped = items.map((r) => ({
        id: r.id,
        date: r.target_date,
        line: r.line_code,
        shiftTime: r.shift_time,
        total_input: r.total_input || 0,
        total_customer: r.total_customer || 0,
        total_model: r.total_model || 0,
        total_pallet: r.total_pallet || 0,
        createdBy: r.created_by_name || r.created_by || "-",
        status: r.status || "New", // Pastikan status ada
      }));
      setProductionSchedules(mapped);
    } catch (err) {
      setError(err.message || "Gagal memuat data.");
      setProductionSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedulesFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleSearchClick = () => {
    loadSchedulesFromServer();
  };

  // Reset selection ketika tab berubah
  useEffect(() => {
    setSelectedHeaderIds(new Set());
    setSelectAll(false);
  }, [activeTab]);

  // ===== Tooltip (tetap) =====
  const [tooltip, setTooltip] = useState({
    visible: false,
    content: "",
    x: 0,
    y: 0,
  });

  const handleAddCustomerSubmit = (e) => {
    e.preventDefault();
    console.log("Customer Detail Form Data:", addCustomerFormData);
    setAddCustomerDetail(false);
    setAddCustomerFormData({
      partCode: "",
      partName: "",
      quantity: "",
      poNumber: "",
      description: "",
    });
  };

  const handleAddCustomerInputChange = (field, value) => {
    setAddCustomerFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-fill Material Code based on Customer selection
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

  // Filter schedules berdasarkan tab aktif
  const filteredSchedules = productionSchedules.filter(schedule => 
    activeTab === "All" || schedule.status === activeTab
  );

  // Cek apakah ada data di tab New untuk menampilkan button Save Schedule
  const hasNewSchedules = productionSchedules.some(schedule => schedule.status === "New");

  const optionStyle = {
    backgroundColor: "#d1d5db",
    color: "#374151",
    fontSize: "12px",
    padding: "4px 8px",
  };

  // (Semua styles di bawah ini PERSIS dari file kamu — tidak diubah)
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
      e.target.style.color = isHover
        ? styles.tabButtonHover?.color || "#2563eb"
        : styles.tabButton?.color || "#6b7280";
    }
  };

    return (
    <div style={styles.pageContainer}>
      <div>
        <Helmet>
          <title>Production | Target Schedule</title>
        </Helmet>
      </div>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          padding: "12px 20px",
          borderRadius: "6px",
          backgroundColor: toastType === "success" ? "#22c55e" : "#ef4444",
          color: "white",
          zIndex: 1000,
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}>
          {toastMessage}
        </div>
      )}

      <div style={styles.welcomeCard}>
        <div style={styles.combinedHeaderFilter}>
          <div style={styles.headerRow}>
            <h1 style={styles.title}>Target Production Schedules</h1>
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
                onClick={handleSearchClick}
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
            onClick={() => navigate("/target-schedule/add")}
          >
            <Plus size={16} />
            Create
          </button>
        </div>

        <div style={styles.tabsContainer}>
          {/* <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "All" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("All")}
            onMouseEnter={(e) => handleTabHover(e, true, activeTab === "All")}
            onMouseLeave={(e) => handleTabHover(e, false, activeTab === "All")}
          >
            All
          </button> */}
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
              ...(activeTab === "OnProgress" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("OnProgress")}
            onMouseEnter={(e) =>
              handleTabHover(e, true, activeTab === "OnProgress")
            }
            onMouseLeave={(e) =>
              handleTabHover(e, false, activeTab === "OnProgress")
            }
          >
            OnProgress
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
                <col style={{ width: "3.3%" }} />
                <col style={{ width: "23px" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "25%" }} />
                <col style={{ width: "11%" }} />
              </colgroup>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.expandedTh}>No</th>
                  <th style={styles.thWithLeftBorder}>
                    {/* Checkbox Select All - hanya tampil di tab New */}
                    {activeTab === "New" && filteredSchedules.length > 0 && (
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
                  <th style={styles.thWithLeftBorder}></th>
                  <th style={styles.thWithLeftBorder}>Date</th>
                  <th style={styles.thWithLeftBorder}>Line</th>
                  <th style={styles.thWithLeftBorder}>Total Input</th>
                  <th style={styles.thWithLeftBorder}>Total Customer</th>
                  <th style={styles.thWithLeftBorder}>Total Model</th>
                  <th style={styles.thWithLeftBorder}>Total Pallet</th>
                  <th style={styles.thWithLeftBorder}>Created By</th>
                  <th style={styles.thWithLeftBorder}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan="11" style={{ ...styles.tdWithLeftBorder, textAlign: "center", color: "#6b7280" }}>
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && error && (
                  <tr>
                    <td colSpan="11" style={{ ...styles.tdWithLeftBorder, textAlign: "center", color: "#ef4444" }}>
                      {error}
                    </td>
                  </tr>
                )}
                {!loading && !error && filteredSchedules.length === 0 && (
                  <tr>
                    <td colSpan="11" style={{ ...styles.tdWithLeftBorder, textAlign: "center", color: "#9ca3af" }}>
                      {activeTab === "New" ? "Data belum dibuat" : "No data"}
                    </td>
                  </tr>
                )}

                {!loading &&
                  !error &&
                  filteredSchedules.map((h, idx) => (
                    <FragmentLike key={h.id}>
                      <tr
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
                          {idx + 1}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {/* Checkbox per row - hanya tampil di tab New */}
                          {activeTab === "New" && (
                            <input
                              type="checkbox"
                              checked={selectedHeaderIds.has(h.id)}
                              onChange={(e) => toggleHeaderCheckbox(h.id, e.target.checked)}
                              style={{
                                margin: "0 auto",
                                display: "block",
                                cursor: "pointer",
                                width: "12px",
                                height: "12px",
                              }}
                            />
                          )}
                        </td>
                        <td
                          style={{
                            ...styles.tdWithLeftBorder,
                            ...styles.emptyColumn,
                          }}
                        >
                          <button
                            style={styles.arrowButton}
                            onClick={() => toggleRowExpansion(h.id)}
                          >
                            {expandedRows[h.id] ? (
                              <MdArrowDropDown style={styles.arrowIcon} />
                            ) : (
                              <MdArrowRight style={styles.arrowIcon} />
                            )}
                          </button>
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          onMouseEnter={showTooltip}
                          onMouseLeave={hideTooltip}
                        >
                          {toDDMMYYYY(h.date)}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          onMouseEnter={showTooltip}
                          onMouseLeave={hideTooltip}
                        >
                          {h.line}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          onMouseEnter={showTooltip}
                          onMouseLeave={hideTooltip}
                        >
                          {h.total_input || 0}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          onMouseEnter={showTooltip}
                          onMouseLeave={hideTooltip}
                        >
                          {h.total_customer || 0}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          onMouseEnter={showTooltip}
                          onMouseLeave={hideTooltip}
                        >
                          {h.total_model || 0}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          onMouseEnter={showTooltip}
                          onMouseLeave={hideTooltip}
                        >
                          {h.total_pallet || 0}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          onMouseEnter={showTooltip}
                          onMouseLeave={hideTooltip}
                        >
                          {String(h.createdBy).toUpperCase()}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          <button
                            style={styles.addButton}
                            onClick={openThirdLevelPopup}
                            onMouseEnter={showTooltip}
                            onMouseLeave={hideTooltip}
                          >
                            <Plus size={10} />
                          </button>
                          <button
                            style={styles.deleteButton}
                            onMouseEnter={showTooltip}
                            onMouseLeave={hideTooltip}
                          >
                            <Trash2 size={10} />
                          </button>
                        </td>
                      </tr>

                      {expandedRows[h.id] && (
                        <tr>
                          <td colSpan="11" style={{ padding: 0, border: "none" }}>
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
                                      <tr
                                        key={`${h.id}-${i}`}
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
                                        <td style={styles.expandedTd}>
                                          {d.input}
                                        </td>
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
          <div style={styles.paginationBar}>
            <div style={styles.paginationControls}>
              <button style={styles.paginationButton}>{"<<"}</button>
              <button style={styles.paginationButton}>{"<"}</button>
              <span>Page</span>
              <input type="text" value="1" style={styles.paginationInput} readOnly />
              <span>of 1</span>
              <button style={styles.paginationButton}>{">"}</button>
              <button style={styles.paginationButton}>{">>"}</button>
            </div>
          </div>
        </div>

        {/* Button Save Schedule - hanya tampil di tab New dan ada data */}
        {activeTab === "New" && hasNewSchedules && (
          <div style={styles.saveConfiguration}>
            <button
              style={{ 
                ...styles.button, 
                ...styles.primaryButton,
                ...(saveLoading && { opacity: 0.7, cursor: 'not-allowed' })
              }}
              onMouseEnter={(e) => handleButtonHover(e, true, "search")}
              onMouseLeave={(e) => handleButtonHover(e, false, "search")}
              onClick={handleSaveSchedule}
              disabled={saveLoading}
            >
              <Save size={16} />
              {saveLoading ? "Menyimpan..." : "Save Schedule"}
            </button>
          </div>
        )}
      </div>

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
            <form onSubmit={handleAddCustomerSubmit} style={customerDetailStyles.form}>
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

      {/* Tooltip */}
      <div style={styles.tooltip}>{tooltip.content}</div>
    </div>
  );
};

const FragmentLike = ({ children }) => children;

export default TargetSchedulePage;