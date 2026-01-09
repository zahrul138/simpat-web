"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MdArrowRight, MdArrowDropDown } from "react-icons/md";
import {
  Plus,
  Trash2,
  Pencil,
  Save,
  X,
  Check,
  CheckCircle,
} from "lucide-react";
import timerService from "../../utils/TimerService";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

// Helper untuk mendapatkan user dari localStorage
const getAuthUser = () => {
  try {
    return JSON.parse(localStorage.getItem("auth_user") || "null");
  } catch {
    return null;
  }
};

const QCLocalSchedulePage = ({ sidebarVisible }) => {
  const navbarTotalHeight = 164;
  const sidebarWidth = 288;
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());

  // QUALITY - View only, no edit permissions
  const canCreateSchedule = false;
  const canDeleteSchedule = false;
  const canEditSchedule = false;
  const canEditPartsInToday = false;

  // STATE UNTUK DATA DARI DATABASE
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  // State yang sudah ada
  const [selectedStockLevel, setSelectedStockLevel] = useState("M101");
  const [selectedModel, setSelectedModel] = useState("Veronicas");
  const [selectedAnnexUpdate, setSelectedAnnexUpdate] =
    useState("ZAHRUL ROMADHON");
  const [scheduleDate, setScheduleDate] = useState("");
  const [selectedScheduleIds, setSelectedScheduleIds] = useState(new Set());
  const [selectedVendorIds, setSelectedVendorIds] = useState(new Set()); // For Today tab vendor selection
  const [selectAll, setSelectAll] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [expandedVendorRows, setExpandedVendorRows] = useState({});
  const [addVendorDetail, setAddVendorDetail] = useState(false);
  const [addVendorFormData, setAddVendorFormData] = useState({
    partCode: "",
    partName: "",
    quantity: "",
  });

  const [activeTab, setActiveTab] = useState("Schedule");

  // STATE FOR EDITING
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [editScheduleData, setEditScheduleData] = useState({});
  const [editingPartId, setEditingPartId] = useState(null);
  const [editPartData, setEditPartData] = useState({});

  // FUNGSI UNTUK AMBIL DATA DARI DATABASE
  useEffect(() => {
    fetchSchedules();
  }, [activeTab]);

  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    vendorName: "",
    partCode: "",
    partName: "",
  });

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const tabToStatus = {
        New: "New",
        Schedule: "Schedule",
        Today: "Today",
        Received: "Received",
        "IQC Progress": "IQC Progress",
        Sample: "Sample",
        Complete: "Complete",
        History: "History",
      };

      const databaseStatusMapping = {
        New: "New",
        Schedule: "Scheduled",
        Today: "Today",
        Received: "Received",
        "IQC Progress": "IQC Progress",
        Sample: "Sample",
        Complete: "Complete",
        History: "History",
      };

      const statusForAPI = tabToStatus[activeTab] || "New";
      let url = `${API_BASE}/api/local-schedules?status=${statusForAPI}`;

      console.log("Fetching schedules:", {
        activeTab: activeTab,
        statusForAPI: statusForAPI,
        expectedDatabaseStatus: databaseStatusMapping[activeTab],
      });

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      console.log("Schedules data received:", {
        count: result.data?.length || 0,
        data: result.data,
      });

      if (result.success) {
        let filteredData = result.data || [];

        if (filteredData.length > 0) {
          console.log(
            "Sample schedule statuses:",
            filteredData.map((s) => ({
              id: s.id,
              status: s.status,
              date: s.schedule_date,
            }))
          );
        }

        // Untuk tab Today, filter tambahan berdasarkan tanggal
        if (activeTab === "Today") {
          const today = new Date().toISOString().split("T")[0];
          filteredData = filteredData.filter((schedule) => {
            try {
              const scheduleDate = new Date(schedule.schedule_date)
                .toISOString()
                .split("T")[0];
              return scheduleDate === today;
            } catch (e) {
              return false;
            }
          });
        }

        console.log(
          "[FETCH Schedules] Setting schedules:",
          filteredData.length
        );
        setSchedules(filteredData);

        // Reset selected checkbox ketika data berubah
        setSelectedScheduleIds(new Set());
        setSelectedVendorIds(new Set());
        setSelectAll(false);
      } else {
        throw new Error(result.message || "Failed to fetch schedules");
      }
    } catch (error) {
      console.error("Error fetching schedules:", error);
      setSchedules([]);
      setSelectedScheduleIds(new Set());
      setSelectedVendorIds(new Set());
      setSelectAll(false);
    } finally {
      setLoading(false);
      console.log("[FETCH Schedules] END");
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // ====== EDIT SCHEDULE FUNCTIONS ======
  const handleEditSchedule = (schedule) => {
    setEditingScheduleId(schedule.id);
    setEditScheduleData({
      schedule_date: schedule.schedule_date
        ? schedule.schedule_date.split("T")[0]
        : "",
      stock_level: schedule.stock_level || "",
      model_name: schedule.model_name || "",
    });
  };

  const handleCancelEditSchedule = () => {
    setEditingScheduleId(null);
    setEditScheduleData({});
  };

  const handleSaveEditSchedule = async (scheduleId) => {
    try {
      const authUser = getAuthUser();
      const uploadByName = authUser?.emp_name || authUser?.name || "System";

      const response = await fetch(
        `${API_BASE}/api/local-schedules/${scheduleId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            scheduleDate: editScheduleData.schedule_date,
            stockLevel: editScheduleData.stock_level,
            modelName: editScheduleData.model_name,
            uploadByName: uploadByName, // Update upload by dengan waktu baru
          }),
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        alert("Schedule updated successfully!");
        setEditingScheduleId(null);
        setEditScheduleData({});
        await fetchSchedules();
      } else {
        throw new Error(result.message || "Failed to update schedule");
      }
    } catch (error) {
      console.error("Error updating schedule:", error);
      alert("Failed to update schedule: " + error.message);
    }
  };

  // ====== EDIT PART FUNCTIONS (INLINE) ======
  const handleEditPart = (part, vendorId) => {
    setEditingPartId(part.id);
    setEditPartData({
      vendorId: vendorId,
      part_code: part.part_code || "",
      part_name: part.part_name || "",
      qty: part.qty || 0,
      qty_box: part.qty_box || 0,
      unit: part.unit || "PCS",
      remark: part.remark || "",
    });
  };

  const handleCancelEditPart = () => {
    setEditingPartId(null);
    setEditPartData({});
  };

  const handleSaveEditPart = async (partId) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/local-schedules/parts/${partId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            part_code: editPartData.part_code,
            part_name: editPartData.part_name,
            quantity: editPartData.qty,
            quantity_box: editPartData.qty_box,
            unit: editPartData.unit,
            remark: editPartData.remark,
          }),
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        alert("Part updated successfully!");
        setEditingPartId(null);
        setEditPartData({});
        await fetchSchedules();
      } else {
        throw new Error(result.message || "Failed to update part");
      }
    } catch (error) {
      console.error("Error updating part:", error);
      alert("Failed to update part: " + error.message);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    console.log("[DELETE Schedule] START - Schedule ID:", scheduleId);

    if (
      !window.confirm(
        "Are you sure you want to delete this schedule? This will also delete all vendors and parts."
      )
    ) {
      console.log("[DELETE Schedule] CANCELLED by user");
      return;
    }

    try {
      const deleteUrl = `${API_BASE}/api/local-schedules/${scheduleId}`;
      console.log("[DELETE Schedule] DELETE URL:", deleteUrl);

      const response = await fetch(deleteUrl, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("[DELETE Schedule] Response status:", response.status);

      const result = await response.json();
      console.log("[DELETE Schedule] Response data:", result);

      if (response.ok && result.success) {
        console.log(
          "[DELETE Schedule] Delete successful, now refreshing data..."
        );
        alert(`Schedule deleted successfully!`);

        setSelectedScheduleIds((prev) => {
          const next = new Set(prev);
          next.delete(scheduleId);
          return next;
        });

        setSelectAll(false);

        setExpandedRows((prev) => {
          const next = { ...prev };
          delete next[scheduleId];
          return next;
        });

        setExpandedVendorRows((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((key) => {
            if (key.startsWith(`vendor_${scheduleId}_`)) {
              delete next[key];
            }
          });
          return next;
        });

        await fetchSchedules();
      } else {
        console.error("[DELETE Schedule] Delete failed:", result.message);
        throw new Error(result.message || "Failed to delete schedule");
      }
    } catch (error) {
      console.error("[DELETE Schedule] ERROR:", error);
      alert("Failed to delete schedule: " + error.message);
    }
  };

  const handleDeleteVendor = async (vendorId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this vendor? This will also delete all parts."
      )
    ) {
      return;
    }

    try {
      console.log("[DELETE Vendor] Deleting vendor ID:", vendorId);

      const response = await fetch(
        `${API_BASE}/api/local-schedules/vendors/${vendorId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        alert(
          `Vendor deleted successfully! (${result.data.deletedParts} parts removed)`
        );
        await fetchSchedules();
      } else {
        throw new Error(result.message || "Failed to delete vendor");
      }
    } catch (error) {
      console.error("[DELETE Vendor] Error:", error);
      alert("Failed to delete vendor: " + error.message);
    }
  };

  const handleDeletePart = async (partId) => {
    if (!window.confirm("Are you sure you want to delete this part?")) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/local-schedules/parts/${partId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        alert("Part deleted successfully!");
        await fetchSchedules();
      } else {
        throw new Error(result.message || "Failed to delete part");
      }
    } catch (error) {
      console.error("[DELETE Part] Error:", error);
      alert("Failed to delete part: " + error.message);
    }
  };

  // ====== CHECKBOX FUNCTIONS ======
  const toggleScheduleCheckbox = (scheduleId, checked) => {
    setSelectedScheduleIds((prev) => {
      const next = new Set(prev);
      if (checked && !next.has(scheduleId)) {
        next.add(scheduleId);
      } else if (!checked && next.has(scheduleId)) {
        next.delete(scheduleId);
      }
      return next;
    });
  };

  const toggleVendorCheckbox = (vendorId, checked) => {
    setSelectedVendorIds((prev) => {
      const next = new Set(prev);
      if (checked && !next.has(vendorId)) {
        next.add(vendorId);
      } else if (!checked && next.has(vendorId)) {
        next.delete(vendorId);
      }
      return next;
    });
  };

  const handleSelectAllSchedules = (checked) => {
    if (checked) {
      const allIds = new Set(schedules.map((s) => s.id));
      setSelectedScheduleIds(allIds);
    } else {
      setSelectedScheduleIds(new Set());
    }
    setSelectAll(checked);
  };

  // ====== MOVE SINGLE VENDOR TO RECEIVED ======
  const handleMoveVendorToReceived = async (vendorId, scheduleId) => {
    if (!window.confirm("Move this vendor to Received?")) {
      return;
    }

    try {
      // Move single vendor - we need to check if all vendors in schedule are moved
      const response = await fetch(
        `${API_BASE}/api/local-schedules/vendors/${vendorId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "Received",
          }),
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        alert("Vendor moved to Received!");
        await fetchSchedules();
      } else {
        throw new Error(result.message || "Failed to move vendor");
      }
    } catch (error) {
      console.error("Error moving vendor:", error);
      alert("Failed to move vendor: " + error.message);
    }
  };

  // ====== BULK MOVE FUNCTIONS ======
  const handleMoveBetweenTabs = async (fromTab, toTab) => {
    if (
      !window.confirm(
        `Are you sure you want to move ${selectedScheduleIds.size} schedule(s) from ${fromTab} to ${toTab} tab?`
      )
    ) {
      return;
    }

    try {
      const scheduleIds = Array.from(selectedScheduleIds);

      const response = await fetch(
        `${API_BASE}/api/local-schedules/bulk/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            scheduleIds: scheduleIds,
            targetTab: toTab,
          }),
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        alert(
          `Successfully moved ${result.data.updatedCount} schedule(s) to ${toTab} tab`
        );

        setSelectedScheduleIds(new Set());
        setSelectAll(false);

        await fetchSchedules();
        setActiveTab(toTab);
      } else {
        throw new Error(result.message || "Failed to update schedule status");
      }
    } catch (error) {
      console.error(`[Move Schedules] Error:`, error);
      alert(`Failed to move schedules: ${error.message}`);
    }
  };

  // FORMAT DATE FUNCTIONS
  const formatDate = (dateString) => {
    try {
      if (!dateString) return "-";
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();

      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString) => {
    try {
      if (!dateString) return "-";
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

  // ROW EXPANSION FUNCTIONS
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

  // TIMER SERVICE SUBSCRIPTION
  useEffect(() => {
    setCurrentDate(new Date());

    const unsubscribe = timerService.subscribe((time) => {
      setCurrentDate(time);
    });

    if (!timerService.isRunning) {
      timerService.start();
    }

    return () => {
      unsubscribe();
    };
  }, []);

  // AUTO-MOVE SCHEDULES TO TODAY
  const autoMoveSchedulesToToday = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/local-schedules?status=Schedule`
      );

      if (!response.ok) return;

      const result = await response.json();

      if (!result.success || !result.data || result.data.length === 0) {
        return;
      }

      // Get today's date (YYYY-MM-DD format) using currentDate from timer
      const today = new Date(currentDate);
      const todayString = today.toISOString().split("T")[0];

      console.log(`[Auto Move] Current date from timer: ${todayString}`);

      // Filter schedules yang schedule_date <= today (hari ini atau sudah lewat)
      const schedulesToMove = result.data.filter((schedule) => {
        const scheduleDate = new Date(schedule.schedule_date)
          .toISOString()
          .split("T")[0];
        return scheduleDate <= todayString;
      });

      if (schedulesToMove.length === 0) {
        console.log(`[Auto Move] No schedules to move to Today`);
        return;
      }

      console.log(
        `[Auto Move] Found ${schedulesToMove.length} schedules to move to Today:`,
        schedulesToMove.map((s) => ({
          code: s.schedule_code,
          date: s.schedule_date,
        }))
      );

      const scheduleIds = schedulesToMove.map((s) => s.id);

      const moveResponse = await fetch(
        `${API_BASE}/api/local-schedules/bulk/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            scheduleIds: scheduleIds,
            targetTab: "Today",
          }),
        }
      );

      const moveResult = await moveResponse.json();

      if (moveResponse.ok && moveResult.success) {
        console.log(
          `[Auto Move] Successfully moved ${moveResult.data.updatedCount} schedule(s) to Today`
        );

        // Refresh data jika user sedang di tab Schedule atau Today
        if (activeTab === "Schedule" || activeTab === "Today") {
          await fetchSchedules();
        }
      }
    } catch (error) {
      console.error("[Auto Move] Error:", error);
    }
  }, [currentDate, activeTab]);

  // Run auto-move when date changes or component mounts
  useEffect(() => {
    // Run auto-move saat component mount
    autoMoveSchedulesToToday();

    // Set interval untuk cek setiap 30 detik
    const autoMoveInterval = setInterval(() => {
      autoMoveSchedulesToToday();
    }, 30000); // Check every 30 seconds

    return () => {
      clearInterval(autoMoveInterval);
    };
  }, [autoMoveSchedulesToToday]);

  // TOOLTIP STATE
  const [tooltip, setTooltip] = useState({
    visible: false,
    content: "",
    x: 0,
    y: 0,
  });

  const showTooltip = (e) => {
    let content = e.target.getAttribute("data-tooltip") || "";
    if (!content) return;

    const rect = e.target.getBoundingClientRect();
    setTooltip({
      visible: true,
      content,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
  };

  const hideTooltip = () => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  const handleInputFocus = (e) => {
    e.target.style.borderColor = "#9fa8da";
  };

  const handleInputBlur = (e) => {
    e.target.style.borderColor = "#d1d5db";
  };

  // ====== STYLES ======
  const styles = {
    pageContainer: {
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      paddingRight: "24px",
    },
    combinedHeaderFilter: {
      backgroundColor: "white",
      padding: "24px",
      borderRadius: "8px",
      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
      border: "1px solid #e5e7eb",
      marginBottom: "10px",
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
      marginBottom: "10px",
      marginTop: "15px",
      right: "10px",
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
    },
    button: {
      padding: "8px 16px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: "500",
      transition: "background-color 0.2s ease",
      fontFamily: "inherit",
      backgroundColor: "#2563eb",
      color: "white",
      gap: "8px",
      display: "flex",
      alignItems: "center",
    },
    primaryButton: {
      backgroundColor: "#2563eb",
      color: "white",
    },
    primaryButtonHover: {
      backgroundColor: "#1d4ed8",
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
    },
    paginationInput: {
      width: "20px",
      height: "20px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      padding: "0 8px",
      fontSize: "10px",
      textAlign: "center",
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
    editButton: {
      backgroundColor: "#fef3c7",
      color: "#92400e",
      padding: "4px 8px",
      fontSize: "12px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      marginLeft: "4px",
    },
    saveButton: {
      backgroundColor: "#d1fae5",
      color: "#065f46",
      padding: "4px 8px",
      fontSize: "12px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      marginLeft: "4px",
    },
    cancelButton: {
      backgroundColor: "#fee2e2",
      color: "#991b1b",
      padding: "4px 8px",
      fontSize: "12px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      marginLeft: "4px",
    },
    checkButton: {
      backgroundColor: "#d1fae5",
      color: "#065f46",
      padding: "4px 8px",
      fontSize: "12px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      marginLeft: "4px",
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
      transform: "translateX(-50%) translateY(-100%)",
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
    },
    inlineInput: {
      height: "22px",
      border: "1px solid #9fa8da",
      borderRadius: "3px",
      padding: "0 4px",
      fontSize: "11px",
      width: "90%",
      outline: "none",
    },
  };

  const handleButtonHover = (e, isHover, type) => {
    if (type === "primary") {
      e.target.style.backgroundColor = isHover
        ? styles.primaryButtonHover.backgroundColor
        : styles.primaryButton.backgroundColor;
    }
  };

  const handleTabHover = (e, isHover, isActive) => {
    if (!isActive) {
      e.target.style.color = isHover ? "#2563eb" : "#6b7280";
    }
  };

  // ====== RENDER TABLE BODY ======
  const renderTableBody = () => {
    if (loading) {
      return (
        <tr key="loading">
          <td
            colSpan="11"
            style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}
          >
            Loading data...
          </td>
        </tr>
      );
    }

    return schedules.map((schedule, index) => (
      <React.Fragment key={`schedule-${schedule.id}`}>
        {/* Schedule Row */}
        <tr key={`schedule-row-${schedule.id}`}>
          <td
            style={{
              ...styles.expandedTd,
              ...styles.expandedWithLeftBorder,
              ...styles.emptyColumn,
            }}
          >
            {index + 1}
          </td>

          {/* CHECKBOX COLUMN - Hidden for Schedule tab, shown for New tab */}
          {activeTab !== "Schedule" && activeTab !== "Today" && (
            <td style={styles.tdWithLeftBorder}>
              <input
                type="checkbox"
                checked={selectedScheduleIds.has(schedule.id)}
                onChange={(e) =>
                  toggleScheduleCheckbox(schedule.id, e.target.checked)
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
              onClick={() => toggleRowExpansion(schedule.id)}
            >
              {expandedRows[schedule.id] ? (
                <MdArrowDropDown style={styles.arrowIcon} />
              ) : (
                <MdArrowRight style={styles.arrowIcon} />
              )}
            </button>
          </td>

          {/* SCHEDULE DATE */}
          <td style={styles.tdWithLeftBorder}>
            {editingScheduleId === schedule.id ? (
              <input
                type="date"
                style={styles.inlineInput}
                value={editScheduleData.schedule_date || ""}
                onChange={(e) =>
                  setEditScheduleData((prev) => ({
                    ...prev,
                    schedule_date: e.target.value,
                  }))
                }
              />
            ) : (
              formatDate(schedule.schedule_date)
            )}
          </td>

          {/* STOCK LEVEL */}
          <td style={styles.tdWithLeftBorder}>
            {editingScheduleId === schedule.id ? (
              <input
                type="text"
                style={styles.inlineInput}
                value={editScheduleData.stock_level || ""}
                onChange={(e) =>
                  setEditScheduleData((prev) => ({
                    ...prev,
                    stock_level: e.target.value,
                  }))
                }
              />
            ) : (
              schedule.stock_level
            )}
          </td>

          {/* MODEL NAME */}
          <td style={styles.tdWithLeftBorder}>
            {editingScheduleId === schedule.id ? (
              <input
                type="text"
                style={styles.inlineInput}
                value={editScheduleData.model_name || ""}
                onChange={(e) =>
                  setEditScheduleData((prev) => ({
                    ...prev,
                    model_name: e.target.value,
                  }))
                }
              />
            ) : (
              schedule.model_name
            )}
          </td>

          <td style={styles.tdWithLeftBorder}>{schedule.total_vendor || 0}</td>
          <td style={styles.tdWithLeftBorder}>{schedule.total_pallet || 0}</td>
          <td style={styles.tdWithLeftBorder}>{schedule.total_item || 0}</td>
          <td style={styles.tdWithLeftBorder}>
            {schedule.upload_by_name} |{" "}
            {formatDateTime(schedule.updated_at || schedule.created_at)}
          </td>

          {/* ACTION COLUMN - Conditional based on tab and department */}
          {(activeTab === "Schedule" && canDeleteSchedule) ||
          activeTab !== "Schedule" ? (
            <td style={styles.tdWithLeftBorder}>
              {/* Hide actions for Schedule tab if not inventory */}
              {activeTab === "Schedule" && !canDeleteSchedule ? null : (
                <>
                  {editingScheduleId === schedule.id ? (
                    <>
                      <button
                        style={styles.saveButton}
                        onClick={() => handleSaveEditSchedule(schedule.id)}
                        data-tooltip="Save"
                        onMouseEnter={showTooltip}
                        onMouseLeave={hideTooltip}
                      >
                        <Save size={10} />
                      </button>
                      <button
                        style={styles.cancelButton}
                        onClick={handleCancelEditSchedule}
                        data-tooltip="Cancel"
                        onMouseEnter={showTooltip}
                        onMouseLeave={hideTooltip}
                      >
                        <X size={10} />
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Edit button - only for Schedule tab (inventory & system/admin) */}
                      {activeTab === "Schedule" && canEditSchedule && (
                        <button
                          style={styles.editButton}
                          onClick={() => handleEditSchedule(schedule)}
                          data-tooltip="Edit Schedule"
                          onMouseEnter={showTooltip}
                          onMouseLeave={hideTooltip}
                        >
                          <Pencil size={10} />
                        </button>
                      )}

                      {/* Delete button - inventory & system/admin */}
                      {canDeleteSchedule && (
                        <button
                          style={styles.deleteButton}
                          onClick={() => handleDeleteSchedule(schedule.id)}
                          data-tooltip="Delete Schedule"
                          onMouseEnter={showTooltip}
                          onMouseLeave={hideTooltip}
                        >
                          <Trash2 size={10} />
                        </button>
                      )}
                    </>
                  )}
                </>
              )}
            </td>
          ) : null}
        </tr>

        {/* EXPANDED VENDOR ROWS */}
        {expandedRows[schedule.id] && (
          <tr key={`expanded-${schedule.id}`}>
            <td colSpan="11" style={{ padding: 0, border: "none" }}>
              <div style={styles.expandedTableContainer}>
                <table style={styles.expandedTable}>
                  <colgroup>
                    {activeTab === "Today" && <col style={{ width: "25px" }} />}
                    <col style={{ width: "25px" }} />
                    <col style={{ width: "25px" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "40%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "10%" }} />
                    {activeTab === "Today" && <col style={{ width: "10%" }} />}
                  </colgroup>
                  <thead>
                    <tr style={styles.expandedTableHeader}>
                      {activeTab === "Today" && (
                        <th style={styles.expandedTh}></th>
                      )}
                      <th style={styles.expandedTh}>No</th>
                      <th style={styles.expandedTh}></th>
                      <th style={styles.expandedTh}>Trip</th>
                      <th style={styles.expandedTh}>Vendor Name</th>
                      <th style={styles.expandedTh}>DO Number</th>
                      <th style={styles.expandedTh}>Arrival Time</th>
                      <th style={styles.expandedTh}>Total Pallet</th>
                      <th style={styles.expandedTh}>Total Item</th>
                      {activeTab === "Today" && (
                        <th style={styles.expandedTh}>Action</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.vendors && schedule.vendors.length > 0 ? (
                      schedule.vendors.map((vendor, vendorIndex) => (
                        <React.Fragment key={vendor.id}>
                          <tr key={`vendor-row-${vendor.id}`}>
                            {/* CHECKBOX FOR TODAY TAB - on vendor row */}
                            {activeTab === "Today" && (
                              <td style={styles.expandedTd}>
                                <input
                                  type="checkbox"
                                  checked={selectedVendorIds.has(vendor.id)}
                                  onChange={(e) =>
                                    toggleVendorCheckbox(
                                      vendor.id,
                                      e.target.checked
                                    )
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
                                ...styles.expandedTd,
                                ...styles.expandedWithLeftBorder,
                                ...styles.emptyColumn,
                              }}
                            >
                              {vendorIndex + 1}
                            </td>
                            <td
                              style={{
                                ...styles.tdWithLeftBorder,
                                ...styles.emptyColumn,
                              }}
                            >
                              <button
                                style={styles.arrowButton}
                                onClick={() =>
                                  toggleVendorRowExpansion(
                                    `vendor_${schedule.id}_${vendorIndex}`
                                  )
                                }
                              >
                                {expandedVendorRows[
                                  `vendor_${schedule.id}_${vendorIndex}`
                                ] ? (
                                  <MdArrowDropDown style={styles.arrowIcon} />
                                ) : (
                                  <MdArrowRight style={styles.arrowIcon} />
                                )}
                              </button>
                            </td>
                            <td style={styles.expandedTd}>
                              {vendor.trip_no || "-"}
                            </td>
                            <td style={styles.expandedTd}>
                              {vendor.vendor_code
                                ? `${vendor.vendor_code} - ${vendor.vendor_name}`
                                : "-"}
                            </td>
                            <td style={styles.expandedTd}>
                              {vendor.do_numbers || "-"}
                            </td>
                            <td style={styles.expandedTd}>
                              {vendor.arrival_time || "-"}
                            </td>
                            <td style={styles.expandedTd}>
                              {vendor.total_pallet || 0}
                            </td>
                            <td style={styles.expandedTd}>
                              {vendor.total_item || 0}
                            </td>

                            {/* ACTION FOR TODAY TAB */}
                            {activeTab === "Today" && (
                              <td style={styles.expandedTd}>
                                <button
                                  style={styles.checkButton}
                                  onClick={() =>
                                    handleMoveVendorToReceived(
                                      vendor.id,
                                      schedule.id
                                    )
                                  }
                                  data-tooltip="Move to Received"
                                  onMouseEnter={showTooltip}
                                  onMouseLeave={hideTooltip}
                                >
                                  <CheckCircle size={10} />
                                </button>
                                {canDeleteSchedule && (
                                  <button
                                    style={styles.deleteButton}
                                    onClick={() =>
                                      handleDeleteVendor(vendor.id)
                                    }
                                    data-tooltip="Delete Vendor"
                                    onMouseEnter={showTooltip}
                                    onMouseLeave={hideTooltip}
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>

                          {/* THIRD LEVEL - PARTS */}
                          {expandedVendorRows[
                            `vendor_${schedule.id}_${vendorIndex}`
                          ] && (
                            <tr key={`parts-${vendor.id}`}>
                              <td
                                colSpan={activeTab === "Today" ? "10" : "9"}
                                style={{ padding: 0, border: "none" }}
                              >
                                <div style={styles.thirdLevelTableContainer}>
                                  <table style={styles.thirdLevelTable}>
                                    <colgroup>
                                      <col style={{ width: "1.5%" }} />
                                      <col style={{ width: "10%" }} />
                                      <col style={{ width: "20%" }} />
                                      <col style={{ width: "8%" }} />
                                      <col style={{ width: "8%" }} />
                                      <col style={{ width: "8%" }} />
                                      {activeTab === "Today" && (
                                        <col style={{ width: "15%" }} />
                                      )}
                                      <col style={{ width: "8%" }} />
                                    </colgroup>
                                    <thead>
                                      <tr style={styles.thirdLevelTableHeader}>
                                        <th style={styles.expandedTh}>No</th>
                                        <th style={styles.thirdLevelTh}>
                                          Part Code
                                        </th>
                                        <th style={styles.thirdLevelTh}>
                                          Part Name
                                        </th>
                                        <th style={styles.thirdLevelTh}>Qty</th>
                                        <th style={styles.thirdLevelTh}>
                                          Qty Box
                                        </th>
                                        <th style={styles.thirdLevelTh}>
                                          Unit
                                        </th>
                                        {activeTab === "Today" && (
                                          <th style={styles.thirdLevelTh}>
                                            Remark
                                          </th>
                                        )}
                                        <th style={styles.thirdLevelTh}>
                                          Action
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {vendor.parts &&
                                      vendor.parts.length > 0 ? (
                                        vendor.parts.map((part, partIndex) => (
                                          <tr key={part.id}>
                                            <td
                                              style={{
                                                ...styles.expandedTd,
                                                ...styles.expandedWithLeftBorder,
                                                ...styles.emptyColumn,
                                              }}
                                            >
                                              {partIndex + 1}
                                            </td>

                                            {/* PART CODE */}
                                            <td style={styles.thirdLevelTd}>
                                              {editingPartId === part.id ? (
                                                <input
                                                  type="text"
                                                  style={styles.inlineInput}
                                                  value={
                                                    editPartData.part_code || ""
                                                  }
                                                  onChange={(e) =>
                                                    setEditPartData((prev) => ({
                                                      ...prev,
                                                      part_code: e.target.value,
                                                    }))
                                                  }
                                                />
                                              ) : (
                                                part.part_code || "-"
                                              )}
                                            </td>

                                            {/* PART NAME */}
                                            <td style={styles.thirdLevelTd}>
                                              {editingPartId === part.id ? (
                                                <input
                                                  type="text"
                                                  style={styles.inlineInput}
                                                  value={
                                                    editPartData.part_name || ""
                                                  }
                                                  onChange={(e) =>
                                                    setEditPartData((prev) => ({
                                                      ...prev,
                                                      part_name: e.target.value,
                                                    }))
                                                  }
                                                />
                                              ) : (
                                                part.part_name || "-"
                                              )}
                                            </td>

                                            {/* QTY */}
                                            <td style={styles.thirdLevelTd}>
                                              {editingPartId === part.id ? (
                                                <input
                                                  type="number"
                                                  style={styles.inlineInput}
                                                  value={editPartData.qty || 0}
                                                  onChange={(e) =>
                                                    setEditPartData((prev) => ({
                                                      ...prev,
                                                      qty: e.target.value,
                                                    }))
                                                  }
                                                />
                                              ) : (
                                                part.qty || 0
                                              )}
                                            </td>

                                            {/* QTY BOX */}
                                            <td style={styles.thirdLevelTd}>
                                              {editingPartId === part.id ? (
                                                <input
                                                  type="number"
                                                  style={styles.inlineInput}
                                                  value={
                                                    editPartData.qty_box || 0
                                                  }
                                                  onChange={(e) =>
                                                    setEditPartData((prev) => ({
                                                      ...prev,
                                                      qty_box: e.target.value,
                                                    }))
                                                  }
                                                />
                                              ) : (
                                                part.qty_box || 0
                                              )}
                                            </td>

                                            {/* UNIT */}
                                            <td style={styles.thirdLevelTd}>
                                              {editingPartId === part.id ? (
                                                <input
                                                  type="text"
                                                  style={styles.inlineInput}
                                                  value={
                                                    editPartData.unit || "PCS"
                                                  }
                                                  onChange={(e) =>
                                                    setEditPartData((prev) => ({
                                                      ...prev,
                                                      unit: e.target.value,
                                                    }))
                                                  }
                                                />
                                              ) : (
                                                part.unit || "PCS"
                                              )}
                                            </td>

                                            {/* REMARK - Only for Today tab */}
                                            {activeTab === "Today" && (
                                              <td style={styles.thirdLevelTd}>
                                                {editingPartId === part.id ? (
                                                  <input
                                                    type="text"
                                                    style={styles.inlineInput}
                                                    value={
                                                      editPartData.remark || ""
                                                    }
                                                    onChange={(e) =>
                                                      setEditPartData(
                                                        (prev) => ({
                                                          ...prev,
                                                          remark:
                                                            e.target.value,
                                                        })
                                                      )
                                                    }
                                                    placeholder="Enter remark"
                                                  />
                                                ) : (
                                                  part.remark || "-"
                                                )}
                                              </td>
                                            )}

                                            {/* ACTION */}
                                            <td style={styles.thirdLevelTd}>
                                              {editingPartId === part.id ? (
                                                <>
                                                  <button
                                                    style={styles.saveButton}
                                                    onClick={() =>
                                                      handleSaveEditPart(
                                                        part.id
                                                      )
                                                    }
                                                    data-tooltip="Save"
                                                    onMouseEnter={showTooltip}
                                                    onMouseLeave={hideTooltip}
                                                  >
                                                    <Save size={10} />
                                                  </button>
                                                  <button
                                                    style={styles.cancelButton}
                                                    onClick={
                                                      handleCancelEditPart
                                                    }
                                                    data-tooltip="Cancel"
                                                    onMouseEnter={showTooltip}
                                                    onMouseLeave={hideTooltip}
                                                  >
                                                    <X size={10} />
                                                  </button>
                                                </>
                                              ) : (
                                                <>
                                                  {/* Edit button for Today tab - production & inventory only */}
                                                  {activeTab === "Today" &&
                                                    canEditPartsInToday && (
                                                      <button
                                                        style={
                                                          styles.editButton
                                                        }
                                                        onClick={() =>
                                                          handleEditPart(
                                                            part,
                                                            vendor.id
                                                          )
                                                        }
                                                        data-tooltip="Edit Part"
                                                        onMouseEnter={
                                                          showTooltip
                                                        }
                                                        onMouseLeave={
                                                          hideTooltip
                                                        }
                                                      >
                                                        <Pencil size={10} />
                                                      </button>
                                                    )}

                                                  {/* Delete button - inventory only */}
                                                  {canDeleteSchedule && (
                                                    <button
                                                      style={
                                                        styles.deleteButton
                                                      }
                                                      onClick={() =>
                                                        handleDeletePart(
                                                          part.id
                                                        )
                                                      }
                                                      data-tooltip="Delete Part"
                                                      onMouseEnter={showTooltip}
                                                      onMouseLeave={hideTooltip}
                                                    >
                                                      <Trash2 size={10} />
                                                    </button>
                                                  )}
                                                </>
                                              )}
                                            </td>
                                          </tr>
                                        ))
                                      ) : (
                                        <tr>
                                          <td
                                            colSpan={
                                              activeTab === "Today" ? "8" : "7"
                                            }
                                            style={{
                                              textAlign: "center",
                                              padding: "10px",
                                              color: "#6b7280",
                                            }}
                                          >
                                            No parts available
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={activeTab === "Today" ? "10" : "9"}
                          style={{
                            textAlign: "center",
                            padding: "10px",
                            color: "#6b7280",
                          }}
                        >
                          No vendors available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    ));
  };

  // ====== DETERMINE COLUMN COUNT BASED ON TAB ======
  const getColumnCount = () => {
    if (activeTab === "Schedule") {
      // No checkbox column in Schedule tab
      return canDeleteSchedule ? 10 : 9;
    }
    if (activeTab === "Today") {
      // No checkbox column in header for Today tab
      return 10;
    }
    return 11;
  };

  return (
    <div style={styles.pageContainer}>
      {/* Tooltip */}
      {tooltip.visible && <div style={styles.tooltip}>{tooltip.content}</div>}

      <div style={styles.combinedHeaderFilter}>
        <div style={styles.headerRow}>
          <h1 style={styles.title}>Local Schedule - Quality</h1>
        </div>

        <div style={styles.filterRow}>
          <div style={styles.inputGroup}>
            <span style={styles.label}>Date From</span>
            <input
              type="date"
              style={styles.input}
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
            <span style={styles.label}>Date To</span>
            <input
              type="date"
              style={styles.input}
              value={filters.dateTo}
              onChange={(e) => handleFilterChange("dateTo", e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
          </div>
          <div style={styles.inputGroup}>
            <span style={styles.label}>Search By</span>
            <input
              type="text"
              style={styles.input}
              placeholder="Vendor Name"
              value={filters.vendorName}
              onChange={(e) => handleFilterChange("vendorName", e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
            <input
              type="text"
              style={styles.input}
              placeholder="Part Code"
              value={filters.partCode}
              onChange={(e) => handleFilterChange("partCode", e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
            <button
              style={styles.button}
              onClick={fetchSchedules}
              onMouseEnter={(e) => handleButtonHover(e, true, "primary")}
              onMouseLeave={(e) => handleButtonHover(e, false, "primary")}
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* CREATE BUTTON - Only for inventory department */}
      {canCreateSchedule && (
        <div style={styles.actionButtonsGroup}>
          <button
            style={{ ...styles.button, ...styles.primaryButton }}
            onMouseEnter={(e) => handleButtonHover(e, true, "primary")}
            onMouseLeave={(e) => handleButtonHover(e, false, "primary")}
            onClick={() => navigate("/local-schedule/add")}
          >
            <Plus size={16} />
            Create
          </button>
        </div>
      )}

      {/* TABS */}
      <div style={styles.tabsContainer}>
        {["Schedule", "Today", "Received", "IQC Progress", "Sample", "Complete", "History"].map((tab) => (
          <button
            key={tab}
            style={{
              ...styles.tabButton,
              ...(activeTab === tab && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab(tab)}
            onMouseEnter={(e) => handleTabHover(e, true, activeTab === tab)}
            onMouseLeave={(e) => handleTabHover(e, false, activeTab === tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TABLE */}
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
              {activeTab !== "Schedule" && activeTab !== "Today" && (
                <col style={{ width: "2.5%" }} />
              )}
              <col style={{ width: "25px" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "25%" }} />
              {(activeTab !== "Schedule" || canDeleteSchedule) && (
                <col style={{ width: "8%" }} />
              )}
            </colgroup>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.expandedTh}>No</th>

                {/* CHECKBOX HEADER - Hidden for Schedule and Today tabs */}
                {activeTab !== "Schedule" && activeTab !== "Today" && (
                  <th style={styles.thWithLeftBorder}>
                    {schedules.length > 1 && (
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={(e) =>
                          handleSelectAllSchedules(e.target.checked)
                        }
                        style={{
                          margin: "0 auto",
                          display: "block",
                          cursor: "pointer",
                          width: "12px",
                          height: "12px",
                        }}
                        title="Select All"
                      />
                    )}
                  </th>
                )}

                <th style={styles.thWithLeftBorder}></th>
                <th style={styles.thWithLeftBorder}>Schedule Date</th>
                <th style={styles.thWithLeftBorder}>Stock Level</th>
                <th style={styles.thWithLeftBorder}>Model</th>
                <th style={styles.thWithLeftBorder}>Total Vendor</th>
                <th style={styles.thWithLeftBorder}>Total Pallet</th>
                <th style={styles.thWithLeftBorder}>Total Item</th>
                <th style={styles.thWithLeftBorder}>Upload By</th>

                {/* ACTION HEADER - Hidden for Schedule tab if not inventory */}
                {(activeTab !== "Schedule" || canDeleteSchedule) && (
                  <th style={styles.thWithLeftBorder}>Action</th>
                )}
              </tr>
            </thead>
            <tbody>{renderTableBody()}</tbody>
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

      {/* BOTTOM BUTTONS */}
      {schedules.length > 0 && (
        <div style={styles.saveConfiguration}>
          {activeTab === "New" && (
            <button
              style={{
                ...styles.button,
                ...styles.primaryButton,
                cursor:
                  selectedScheduleIds.size === 0 ? "not-allowed" : "pointer",
                opacity: selectedScheduleIds.size === 0 ? 0.6 : 1,
              }}
              onClick={() => {
                if (selectedScheduleIds.size === 0) {
                  alert("Please select at least one schedule");
                  return;
                }
                handleMoveBetweenTabs("New", "Schedule");
              }}
              disabled={selectedScheduleIds.size === 0}
            >
              <Save size={16} />
              Move to Schedule
            </button>
          )}

          {activeTab === "Received" && (
            <button
              style={{
                ...styles.button,
                ...styles.primaryButton,
                cursor:
                  selectedScheduleIds.size === 0 ? "not-allowed" : "pointer",
                opacity: selectedScheduleIds.size === 0 ? 0.6 : 1,
              }}
              onClick={() => {
                if (selectedScheduleIds.size === 0) {
                  alert("Please select at least one schedule");
                  return;
                }
                handleMoveBetweenTabs("Received", "IQC Progress");
              }}
              disabled={selectedScheduleIds.size === 0}
            >
              <Save size={16} />
              Move to IQC Progress
            </button>
          )}

          {activeTab === "IQC Progress" && (
            <button
              style={{
                ...styles.button,
                ...styles.primaryButton,
                cursor:
                  selectedScheduleIds.size === 0 ? "not-allowed" : "pointer",
                opacity: selectedScheduleIds.size === 0 ? 0.6 : 1,
              }}
              onClick={() => {
                if (selectedScheduleIds.size === 0) {
                  alert("Please select at least one schedule");
                  return;
                }
                handleMoveBetweenTabs("IQC Progress", "Sample");
              }}
              disabled={selectedScheduleIds.size === 0}
            >
              <Save size={16} />
              Move to Sample
            </button>
          )}

          {activeTab === "Sample" && (
            <button
              style={{
                ...styles.button,
                ...styles.primaryButton,
                cursor:
                  selectedScheduleIds.size === 0 ? "not-allowed" : "pointer",
                opacity: selectedScheduleIds.size === 0 ? 0.6 : 1,
              }}
              onClick={() => {
                if (selectedScheduleIds.size === 0) {
                  alert("Please select at least one schedule");
                  return;
                }
                handleMoveBetweenTabs("Sample", "Complete");
              }}
              disabled={selectedScheduleIds.size === 0}
            >
              <Save size={16} />
              Move to Complete
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default QCLocalSchedulePage;