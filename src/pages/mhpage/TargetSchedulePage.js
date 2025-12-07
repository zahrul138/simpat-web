"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MdArrowRight, MdArrowDropDown } from "react-icons/md";
import { Plus, Trash2, Pencil, Save, Check } from "lucide-react";
import { Helmet } from "react-helmet";
import timerService from "../../utils/TimerService";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";
const API = {
  schedules: {
    list: (q) => `/api/production-schedules?${new URLSearchParams(q || {})}`,
    detail: (id) => `/api/production-schedules/${id}`,
    updateStatus: (id) => `/api/production-schedules/${id}/status`,
    delete: (id) => `/api/production-schedules/${id}`,
    deleteDetail: (id) => `/api/production-schedules/details/${id}`,
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

const TargetSchedulePage = ({ sidebarVisible }) => {
  const navigate = useNavigate();
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
  const [autoCompleteLoading, setAutoCompleteLoading] = useState(false);

  const [lastDataUpdate, setLastDataUpdate] = useState(Date.now());
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);

  const filteredSchedules = productionSchedules.filter(
    (schedule) => activeTab === "All" || schedule.status === activeTab
  );
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
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const expandedRowsRef = useRef({});
  const detailCacheRef = useRef({});
  const selectedHeaderIdsRef = useRef(new Set());

  const buildListQuery = useCallback(() => {
    const q = {};
    const resolvedStatus = ["New", "OnProgress", "Complete", "Reject"].includes(
      activeTab
    )
      ? activeTab
      : undefined;
    if (resolvedStatus) q.status = resolvedStatus;
    if (dateFrom) q.dateFrom = dateFrom;
    if (dateTo) q.dateTo = dateTo;
    if (keyword?.trim()) q.q = keyword.trim();
    q.limit = 50;
    q.page = 1;
    return q;
  }, [activeTab, dateFrom, dateTo, keyword]);

  const loadSchedulesFromServer = useCallback(
    async (backgroundRefresh = false) => {
      if (backgroundRefresh) {
        setIsBackgroundRefreshing(true);
      } else {
        setLoading(true);
      }

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
          status: r.status || "New",
        }));

        setProductionSchedules((prev) => {
          const newSelected = new Set(selectedHeaderIdsRef.current);
          const existingIds = new Set(prev.map((s) => s.id));
          const newIds = new Set(mapped.map((s) => s.id));
          newSelected.forEach((id) => {
            if (!newIds.has(id)) {
              newSelected.delete(id);
            }
          });

          selectedHeaderIdsRef.current = newSelected;
          setSelectedHeaderIds(newSelected);

          const currentFiltered = mapped.filter(
            (schedule) => activeTab === "All" || schedule.status === activeTab
          );
          setSelectAll(
            newSelected.size === currentFiltered.length &&
              currentFiltered.length > 0
          );

          return mapped;
        });

        setLastDataUpdate(Date.now());
      } catch (err) {
        console.error("Background refresh error:", err);
        if (!backgroundRefresh) {
          setError(err.message || "Gagal memuat data.");
          setProductionSchedules([]);
        }
      } finally {
        if (backgroundRefresh) {
          setIsBackgroundRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [buildListQuery, activeTab]
  );

  const performBackgroundRefresh = useCallback(async () => {
    if (isBackgroundRefreshing) return;

    try {
      expandedRowsRef.current = { ...expandedRows };
      detailCacheRef.current = { ...detailCache };
      selectedHeaderIdsRef.current = new Set(selectedHeaderIds);
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
        status: r.status || "New",
      }));
      setProductionSchedules((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(mapped)) {
          return prev;
        }
        return mapped;
      });

      const newExpandedRows = {};
      Object.keys(expandedRowsRef.current).forEach((id) => {
        if (mapped.some((s) => s.id.toString() === id)) {
          newExpandedRows[id] = expandedRowsRef.current[id];
        }
      });
      const newDetailCache = {};
      Object.keys(detailCacheRef.current).forEach((id) => {
        if (mapped.some((s) => s.id.toString() === id)) {
          newDetailCache[id] = detailCacheRef.current[id];
        }
      });
      const newSelected = new Set();
      selectedHeaderIdsRef.current.forEach((id) => {
        if (mapped.some((s) => s.id === id)) {
          newSelected.add(id);
        }
      });
      setTimeout(() => {
        if (Object.keys(newExpandedRows).length > 0) {
          setExpandedRows((prev) => ({ ...prev, ...newExpandedRows }));
        }

        if (Object.keys(newDetailCache).length > 0) {
          setDetailCache((prev) => ({ ...prev, ...newDetailCache }));
        }

        if (newSelected.size > 0) {
          setSelectedHeaderIds(newSelected);
        }
      }, 10);

      setLastDataUpdate(Date.now());
    } catch (err) {
      console.log(
        "Silent background refresh failed, will retry later:",
        err.message
      );
    }
  }, [
    buildListQuery,
    expandedRows,
    detailCache,
    selectedHeaderIds,
    isBackgroundRefreshing,
  ]);

  const autoCheckAndRefresh = useCallback(async () => {
    try {
      const now = timerService.getCurrentTime();
      const currentTimeStr = now.toLocaleTimeString();
      try {
        await http("/api/production-schedules/auto-progress", {
          method: "PATCH",
        });
      } catch (progressErr) {}

      try {
        await http("/api/production-schedules/auto-complete", {
          method: "PATCH",
        });
      } catch (completeErr) {}
      const timeSinceLastUpdate = Date.now() - lastDataUpdate;
      if (timeSinceLastUpdate > 2000) {
        console.log(
          `[SILENT-REFRESH] Performing transparent refresh for tab: ${activeTab} at ${currentTimeStr}`
        );
        performBackgroundRefresh();
      }
    } catch (err) {
      console.log("[SILENT-REFRESH] Error in background process:", err.message);
    }
  }, [performBackgroundRefresh, lastDataUpdate, activeTab]);

  useEffect(() => {
    loadSchedulesFromServer();
  }, [loadSchedulesFromServer]);

  useEffect(() => {
    const refreshInterval = setInterval(() => {
      autoCheckAndRefresh();
    }, 1000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setTimeout(() => {
          autoCheckAndRefresh();
        }, 1000);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [autoCheckAndRefresh]);

  const toggleHeaderCheckbox = (headerId, checked) => {
    if (activeTab === "New") {
      setSelectedHeaderIds((prev) => {
        const next = new Set(prev);
        if (checked) {
          next.add(headerId);
        } else {
          next.delete(headerId);
        }
        if (checked && next.size === filteredSchedules.length) {
          setSelectAll(true);
        } else if (!checked) {
          setSelectAll(false);
        }

        selectedHeaderIdsRef.current = next;

        return next;
      });
    }
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedHeaderIds(new Set());
      selectedHeaderIdsRef.current = new Set();
    } else {
      if (activeTab === "New") {
        const newScheduleIds = filteredSchedules.map((schedule) => schedule.id);
        const newSet = new Set(newScheduleIds);
        setSelectedHeaderIds(newSet);
        selectedHeaderIdsRef.current = newSet;
      }
    }
    setSelectAll(!selectAll);
  };

  const handleSaveSchedule = async () => {
    if (selectedHeaderIds.size === 0) {
      alert("Pilih minimal 1 schedule untuk disimpan!");
      return;
    }

    if (
      !window.confirm(
        `Apakah Anda yakin ingin menyimpan ${selectedHeaderIds.size} schedule ke OnProgress?`
      )
    ) {
      return;
    }

    setSaveLoading(true);
    try {
      const updatePromises = Array.from(selectedHeaderIds).map((id) =>
        http(API.schedules.updateStatus(id), {
          method: "PATCH",
          body: { status: "OnProgress" },
        })
      );

      await Promise.all(updatePromises);

      await loadSchedulesFromServer();
      setSelectedHeaderIds(new Set());
      selectedHeaderIdsRef.current = new Set();
      setSelectAll(false);

      setToastMessage(
        `${selectedHeaderIds.size} schedule berhasil dipindahkan ke OnProgress`
      );
      setToastType("success");
    } catch (err) {
      alert("Gagal menyimpan schedule: " + (err.message || "Unknown error"));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId, scheduleCode = "") => {
    if (!scheduleId) return;

    if (!window.confirm("Are you sure to delete this schedule?")) {
      return;
    }

    try {
      setLoadingDetail((prev) => ({ ...prev, [scheduleId]: true }));

      const result = await http(API.schedules.delete(scheduleId), {
        method: "DELETE",
      });

      if (result.success) {
        setToastMessage("Schedule successfully deleted");
        setToastType("success");
        setDetailCache((prev) => {
          const newCache = { ...prev };
          delete newCache[scheduleId];
          return newCache;
        });

        setExpandedRows((prev) => {
          const newExpanded = { ...prev };
          delete newExpanded[scheduleId];
          return newExpanded;
        });

        setSelectedHeaderIds((prev) => {
          const newSelected = new Set(prev);
          newSelected.delete(scheduleId);
          selectedHeaderIdsRef.current = newSelected;
          return newSelected;
        });

        await loadSchedulesFromServer();
      } else {
        throw new Error(result.message || "Failed to delete schedule");
      }
    } catch (err) {
      if (
        err.status === 400 &&
        err.data?.error === "Foreign key constraint violation"
      ) {
        alert(
          `Cannot delete schedule: ${err.data.message}\n\nSchedule still has relations with other data.`
        );
      } else if (err.status === 404) {
        alert("Schedule not found. Maybe already deleted.");
        await loadSchedulesFromServer();
      } else {
        alert(`Failed to delete schedule: ${err.message || "Unknown error"}`);
      }

      setToastMessage("Failed to delete schedule");
      setToastType("error");
    } finally {
      setLoadingDetail((prev) => ({ ...prev, [scheduleId]: false }));
    }
  };

  const handleDeleteDetail = async (detailId, scheduleId) => {
    if (!detailId || !scheduleId) {
      alert("Error: Detail ID atau Schedule ID tidak valid");
      return;
    }

    if (typeof detailId !== "number" || detailId <= 0) {
      alert("Error: Format Detail ID tidak valid. Harus berupa angka positif.");
      return;
    }

    if (typeof scheduleId !== "number" || scheduleId <= 0) {
      alert("Error: Format Schedule ID tidak valid.");
      return;
    }

    if (!window.confirm("Are you sure to delete this detail?")) {
      return;
    }

    try {
      const result = await http(API.schedules.deleteDetail(detailId), {
        method: "DELETE",
      });

      if (result.success) {
        setToastMessage("Detail successfully deleted");
        setToastType("success");

        const updatedDetails = await http(API.schedules.detail(scheduleId));
        setDetailCache((prev) => ({
          ...prev,
          [scheduleId]: updatedDetails.details || [],
        }));
        await loadSchedulesFromServer();
      } else {
        throw new Error(result.message || "Failed to delete detail");
      }
    } catch (err) {
      alert(`Failed to delete detail: ${err.message}`);
      setToastMessage("Failed to delete detail");
      setToastType("error");
    }
  };

  const handleCompleteSchedule = async (scheduleId) => {
    if (!scheduleId) return;

    if (!window.confirm("Are you sure to mark this schedule as Complete?")) {
      return;
    }

    try {
      setLoadingDetail((prev) => ({ ...prev, [scheduleId]: true }));

      const result = await http(API.schedules.updateStatus(scheduleId), {
        method: "PATCH",
        body: { status: "Complete" },
      });

      if (result) {
        setToastMessage("Schedule successfully marked as Complete");
        setToastType("success");
        setDetailCache((prev) => {
          const newCache = { ...prev };
          delete newCache[scheduleId];
          return newCache;
        });

        setExpandedRows((prev) => {
          const newExpanded = { ...prev };
          delete newExpanded[scheduleId];
          return newExpanded;
        });
        await loadSchedulesFromServer();
      } else {
        throw new Error("Failed to complete schedule");
      }
    } catch (err) {
      alert("Failed to complete schedule: " + (err.message || "Unknown error"));
      setToastMessage("Failed to complete schedule");
      setToastType("error");
    } finally {
      setLoadingDetail((prev) => ({ ...prev, [scheduleId]: false }));
    }
  };

  const handleCompleteMultipleSchedules = async () => {
    if (selectedHeaderIds.size === 0) {
      alert("Pilih minimal 1 schedule untuk diselesaikan!");
      return;
    }

    if (
      !window.confirm(
        `Apakah Anda yakin ingin menandai ${selectedHeaderIds.size} schedule sebagai Complete?`
      )
    ) {
      return;
    }

    setSaveLoading(true);
    try {
      const updatePromises = Array.from(selectedHeaderIds).map((id) =>
        http(API.schedules.updateStatus(id), {
          method: "PATCH",
          body: { status: "Complete" },
        })
      );

      await Promise.all(updatePromises);
      await loadSchedulesFromServer();
      setSelectedHeaderIds(new Set());
      selectedHeaderIdsRef.current = new Set();
      setSelectAll(false);

      setToastMessage(
        `${selectedHeaderIds.size} schedule berhasil ditandai sebagai Complete`
      );
      setToastType("success");
    } catch (err) {
      alert(
        "Gagal menyelesaikan schedule: " + (err.message || "Unknown error")
      );
    } finally {
      setSaveLoading(false);
    }
  };

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
      expandedRowsRef.current = newExpandedRows;

      return newExpandedRows;
    });

    if (!expandedRows[rowId] && !detailCache[rowId]) {
      try {
        setLoadingDetail((p) => ({ ...p, [rowId]: true }));
        const data = await http(API.schedules.detail(rowId));
        const details = (data?.details || []).map((d) => ({
          id: d.id,
          materialCode: d.material_code || "",
          customer: d.customer || "",
          model: d.model || "",
          description: d.description || "",
          input: d.input || 0,
          poNumber: d.po_number || "",
          palletType: d.pallet_type || "Pallet R",
          palletUse: d.pallet_use || 1,
        }));

        setDetailCache((p) => {
          const newCache = { ...p, [rowId]: details };
          detailCacheRef.current = newCache;
          return newCache;
        });
      } catch (err) {
      } finally {
        setLoadingDetail((p) => ({ ...p, [rowId]: false }));
      }
    }
  };

  const openThirdLevelPopup = () => {
    setAddCustomerDetail(true);
  };

  const handleSearchClick = () => {
    loadSchedulesFromServer();
  };

  useEffect(() => {
    setSelectedHeaderIds(new Set());
    selectedHeaderIdsRef.current = new Set();
    setSelectAll(false);
  }, [activeTab]);

  useEffect(() => {
    if (
      filteredSchedules.length > 0 &&
      selectedHeaderIds.size === filteredSchedules.length
    ) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [selectedHeaderIds, filteredSchedules]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
      setToastType(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const [tooltip, setTooltip] = useState({
    visible: false,
    content: "",
    x: 0,
    y: 0,
  });

  const handleAddCustomerSubmit = (e) => {
    e.preventDefault();
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

  const hasNewSchedules = productionSchedules.some(
    (schedule) => schedule.status === "New"
  );

  const optionStyle = {
    backgroundColor: "#d1d5db",
    color: "#374151",
    fontSize: "12px",
    padding: "4px 8px",
  };

  const getColgroup = () => {
    if (activeTab === "New") {
      return (
        <colgroup>
          <col style={{ width: "25px" }} />
          {/* KOLOM CHECKBOX SELALU ADA UNTUK TAB NEW */}
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
          {/* TIDAK ADA KOLOM CHECKBOX untuk OnProgress */}
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
      e.target.style.color = isHover ? "#2563eb" : "#6b7280";
    }
  };

  return (
    <div style={styles.pageContainer}>
      <div>
        <Helmet>
          <title>Production | Target Schedule</title>
        </Helmet>
      </div>

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

          {activeTab === "OnProgress" && selectedHeaderIds.size > 0 && (
            <button
              style={{
                ...styles.button,
                ...styles.successButton,
                ...(saveLoading && { opacity: 0.7, cursor: "not-allowed" }),
              }}
              onMouseEnter={(e) => handleButtonHover(e, true, "search")}
              onMouseLeave={(e) => handleButtonHover(e, false, "search")}
              onClick={handleCompleteMultipleSchedules}
              disabled={saveLoading}
            >
              <Save size={16} />
              {saveLoading
                ? "Currently"
                : `Complete (${selectedHeaderIds.size})`}
            </button>
          )}
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
                        {activeTab === "New" && (
                          <td style={styles.tdWithLeftBorder}>
                            <input
                              type="checkbox"
                              checked={selectedHeaderIds.has(h.id)}
                              onChange={(e) =>
                                toggleHeaderCheckbox(h.id, e.target.checked)
                              }
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
                          {h.shiftTime}
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
                        {(activeTab === "New" ||
                          activeTab === "OnProgress") && (
                          <td style={styles.tdWithLeftBorder}>
                            <button
                              style={styles.addButton}
                              onClick={openThirdLevelPopup}
                              onMouseEnter={showTooltip}
                              onMouseLeave={hideTooltip}
                              title="Add Detail"
                            >
                              <Plus size={10} />
                            </button>

                            {h.status === "OnProgress" && (
                              <button
                                style={styles.completeButton}
                                onMouseEnter={showTooltip}
                                onMouseLeave={hideTooltip}
                                onClick={() => handleCompleteSchedule(h.id)}
                                title="Mark as Complete"
                                disabled={loadingDetail[h.id]}
                              >
                                <Check size={10} />
                              </button>
                            )}

                            <button
                              style={styles.deleteButton}
                              onMouseEnter={showTooltip}
                              onMouseLeave={hideTooltip}
                              onClick={() => handleDeleteSchedule(h.id, h.code)}
                              title="Delete"
                              disabled={loadingDetail[h.id]}
                            >
                              <Trash2 size={10} />
                            </button>
                          </td>
                        )}
                      </tr>

                      {expandedRows[h.id] && (
                        <tr>
                          <td
                            colSpan={getColSpanCount()}
                            style={{ padding: 0, border: "none" }}
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
                                    <th style={styles.expandedTh}>
                                      Material Code
                                    </th>
                                    <th style={styles.expandedTh}>Customer</th>
                                    <th style={styles.expandedTh}>Model</th>
                                    <th style={styles.expandedTh}>
                                      Description
                                    </th>
                                    <th style={styles.expandedTh}>Input</th>
                                    <th style={styles.expandedTh}>PO Number</th>
                                    <th style={styles.expandedTh}>
                                      Pallet Type
                                    </th>
                                    <th style={styles.expandedTh}>
                                      Pallet Use
                                    </th>
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
                                    detailCache[h.id]?.map((d, i) => {
                                      return (
                                        <tr
                                          key={`${h.id}-${d.id || i}`}
                                          onMouseEnter={(e) =>
                                            (e.target.closest(
                                              "tr"
                                            ).style.backgroundColor = "#c7cde8")
                                          }
                                          onMouseLeave={(e) =>
                                            (e.target.closest(
                                              "tr"
                                            ).style.backgroundColor =
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

                                          <td
                                            style={styles.expandedTd}
                                            onMouseEnter={showTooltip}
                                            onMouseLeave={hideTooltip}
                                          >
                                            {d.materialCode}
                                          </td>
                                          <td
                                            style={styles.expandedTd}
                                            onMouseEnter={showTooltip}
                                            onMouseLeave={hideTooltip}
                                          >
                                            {d.customer}
                                          </td>
                                          <td
                                            style={styles.expandedTd}
                                            onMouseEnter={showTooltip}
                                            onMouseLeave={hideTooltip}
                                          >
                                            {d.model || ""}
                                          </td>
                                          <td
                                            style={styles.expandedTd}
                                            onMouseEnter={showTooltip}
                                            onMouseLeave={hideTooltip}
                                          >
                                            {d.description || ""}
                                          </td>
                                          <td
                                            style={styles.expandedTd}
                                            onMouseEnter={showTooltip}
                                            onMouseLeave={hideTooltip}
                                          >
                                            {d.input}
                                          </td>
                                          <td
                                            style={styles.expandedTd}
                                            onMouseEnter={showTooltip}
                                            onMouseLeave={hideTooltip}
                                          >
                                            {d.poNumber}
                                          </td>
                                          <td
                                            style={styles.expandedTd}
                                            onMouseEnter={showTooltip}
                                            onMouseLeave={hideTooltip}
                                          >
                                            {d.palletType}
                                          </td>
                                          <td
                                            style={styles.expandedTd}
                                            onMouseEnter={showTooltip}
                                            onMouseLeave={hideTooltip}
                                          >
                                            {d.palletUse}
                                          </td>

                                          <td
                                            style={styles.expandedTd}
                                            onMouseEnter={showTooltip}
                                            onMouseLeave={hideTooltip}
                                            title="Edit"
                                          >
                                            <button style={styles.editButton}>
                                              <Pencil size={10} />
                                            </button>
                                            <button
                                              style={styles.deleteButton}
                                              onMouseEnter={showTooltip}
                                              onMouseLeave={hideTooltip}
                                              title="Delete "
                                              onClick={() => {
                                                if (!d.id) {
                                                  alert(
                                                    "Error: Detail ID tidak valid. Tidak dapat menghapus."
                                                  );
                                                  return;
                                                }

                                                if (!h.id) {
                                                  alert(
                                                    "Error: Schedule ID tidak valid."
                                                  );
                                                  return;
                                                }
                                                handleDeleteDetail(d.id, h.id);
                                              }}
                                            >
                                              <Trash2 size={10} />
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
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

        {activeTab === "New" && hasNewSchedules && (
          <div style={styles.saveConfiguration}>
            <button
              style={{
                ...styles.button,
                ...styles.primaryButton,
                ...(saveLoading && { opacity: 0.7, cursor: "not-allowed" }),
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

        {activeTab === "OnProgress" && selectedHeaderIds.size > 0 && (
          <div style={styles.saveConfiguration}>
            <button
              style={{
                ...styles.button,
                ...styles.successButton,
                ...(saveLoading && { opacity: 0.7, cursor: "not-allowed" }),
              }}
              onMouseEnter={(e) => handleButtonHover(e, true, "search")}
              onMouseLeave={(e) => handleButtonHover(e, false, "search")}
              onClick={handleCompleteMultipleSchedules}
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

      {addCustomerDetail && (
        <div style={customerDetailStyles.popupOverlay}>
          <div style={customerDetailStyles.popupContainer}>
            <div style={customerDetailStyles.popupHeader}>
              <h3 style={customerDetailStyles.popupTitle}>
                Add Customer Detail
              </h3>
              <button
                style={customerDetailStyles.closeButton}
                onClick={() => setAddCustomerDetail(false)}
              >
                ×
              </button>
            </div>
            <form
              onSubmit={handleAddCustomerSubmit}
              style={customerDetailStyles.form}
            >
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

      <div style={styles.tooltip}>{tooltip.content}</div>
    </div>
  );
};

const FragmentLike = ({ children }) => children;

export default TargetSchedulePage;
