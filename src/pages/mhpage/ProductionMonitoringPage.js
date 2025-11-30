"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Eye, Settings, RefreshCw } from "lucide-react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";
const API = {
  schedules: {
    list: (q) => `/api/production-schedules?${new URLSearchParams(q || {})}`,
    detail: (id) => `/api/production-schedules/${id}`,
  },
  warningSettings: {
    list: () => `/api/warning-settings`,
    update: (id) => `/api/warning-settings/${id}`,
    create: () => `/api/warning-settings`,
    delete: (id) => `/api/warning-settings/${id}`,
    bulkUpdate: () => `/api/warning-settings/bulk`,
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

const useWarningSettings = () => {
  const [warningSettings, setWarningSettings] = useState([]);
  const [originalSettings, setOriginalSettings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadWarningSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await http(API.warningSettings.list());

      if (data && data.length > 0) {
        setWarningSettings(data);
        setOriginalSettings(data); // Simpan settings asli
        localStorage.setItem("warningSettings", JSON.stringify(data));
        console.log("Settings loaded from API");
      } else {
        const cached = localStorage.getItem("warningSettings");
        if (cached) {
          const parsed = JSON.parse(cached);
          setWarningSettings(parsed);
          setOriginalSettings(parsed); // Simpan settings asli
          console.log("Settings loaded from localStorage (API empty)");
        } else {
          const defaultSettings = [
            {
              id: 1,
              start: "06:00",
              end: "07:00",
              reason: "Meeting Time",
              enabled: true,
            },
            {
              id: 2,
              start: "08:30",
              end: "09:00",
              reason: "Break Time",
              enabled: true,
            },
            {
              id: 3,
              start: "11:30",
              end: "13:00",
              reason: "Lunch Time",
              enabled: true,
            },
            {
              id: 4,
              start: "15:30",
              end: "16:00",
              reason: "Overtime Break",
              enabled: true,
            },
          ];
          setWarningSettings(defaultSettings);
          setOriginalSettings(defaultSettings); // Simpan settings asli
          localStorage.setItem(
            "warningSettings",
            JSON.stringify(defaultSettings)
          );
          console.log("Default settings created");
        }
      }
    } catch (err) {
      console.warn("API failed, using cached settings:", err);
      const cached = localStorage.getItem("warningSettings");
      if (cached) {
        const parsed = JSON.parse(cached);
        setWarningSettings(parsed);
        setOriginalSettings(parsed); // Simpan settings asli
        console.log("Settings loaded from localStorage (API error)");
      }
      setError("Failed to load settings from server");
    } finally {
      setLoading(false);
    }
  };

  const updateWarningSetting = (id, field, value) => {
    const updatedSettings = warningSettings.map((setting) =>
      setting.id === id ? { ...setting, [field]: value } : setting
    );

    setWarningSettings(updatedSettings);
    localStorage.setItem("warningSettings", JSON.stringify(updatedSettings));

    console.log("Setting updated locally (not synced to API yet)");
  };

  const addWarningSetting = () => {
    const tempId = Math.max(...warningSettings.map((s) => s.id), 0) + 1;
    const newSetting = {
      id: tempId,
      start: "09:00",
      end: "09:30",
      reason: "New Break",
      enabled: true,
      isNew: true,
    };

    const updatedSettings = [...warningSettings, newSetting];
    setWarningSettings(updatedSettings);
    localStorage.setItem("warningSettings", JSON.stringify(updatedSettings));

    console.log("New setting added locally (not saved to API yet)");
  };

  const deleteWarningSetting = (id) => {
    if (warningSettings.length <= 1) {
      alert("Minimal harus ada 1 setting warning");
      return;
    }

    const settingToDelete = warningSettings.find(
      (setting) => setting.id === id
    );

    if (settingToDelete?.isNew) {
      const updatedSettings = warningSettings.filter(
        (setting) => setting.id !== id
      );
      setWarningSettings(updatedSettings);
      localStorage.setItem("warningSettings", JSON.stringify(updatedSettings));
      console.log("New setting deleted locally");
      return;
    }

    const updatedSettings = warningSettings.map((setting) =>
      setting.id === id ? { ...setting, markedForDeletion: true } : setting
    );

    setWarningSettings(updatedSettings);
    localStorage.setItem("warningSettings", JSON.stringify(updatedSettings));

    console.log("Setting marked for deletion (not deleted from API yet)");
  };

  const restoreWarningSetting = (id) => {
    const updatedSettings = warningSettings.map((setting) =>
      setting.id === id ? { ...setting, markedForDeletion: false } : setting
    );

    setWarningSettings(updatedSettings);
    localStorage.setItem("warningSettings", JSON.stringify(updatedSettings));

    console.log("Setting restoration cancelled");
  };

  const saveAllSettings = async () => {
    try {
      const settingsToSave = warningSettings
        .filter((setting) => !setting.markedForDeletion)
        .map((setting) => {
          const { isNew, markedForDeletion, ...settingData } = setting;
          return settingData;
        });

      const result = await http(API.warningSettings.bulkUpdate(), {
        method: "PUT",
        body: { settings: settingsToSave },
      });

      if (result.settings) {
        const cleanedSettings = result.settings.map((setting) => ({
          ...setting,
          isNew: undefined,
          markedForDeletion: undefined,
        }));
        setWarningSettings(cleanedSettings);
        localStorage.setItem(
          "warningSettings",
          JSON.stringify(cleanedSettings)
        );
      }

      console.log("All settings saved to API");
      return { success: true, message: "Settings saved successfully!" };
    } catch (err) {
      console.warn("Failed to save settings to API:", err);
      return {
        success: false,
        message:
          "Failed to save settings to server, but changes are saved locally",
      };
    }
  };

  const resetToOriginalSettings = () => {
    setWarningSettings(originalSettings);
    localStorage.setItem("warningSettings", JSON.stringify(originalSettings));
    console.log("Settings reset to original");
  };

  const saveCurrentSettingsAsOriginal = () => {
    setOriginalSettings([...warningSettings]);
    console.log("Current settings saved as original");
  };

  return {
    warningSettings,
    loading,
    error,
    loadWarningSettings,
    updateWarningSetting,
    addWarningSetting,
    deleteWarningSetting,
    restoreWarningSetting,
    saveAllSettings,
    resetToOriginalSettings,
    saveCurrentSettingsAsOriginal,
  };
};

const ProductionMonitoringPage = ({ sidebarVisible }) => {
  const [currentSchedule, setCurrentSchedule] = useState(null);
  const [scheduleDetails, setScheduleDetails] = useState(null);
  const [showDetailPopup, setShowDetailPopup] = useState(false);
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSettingsHovered, setIsSettingsHovered] = useState(false);
  const [isDetailHovered, setIsDetailHovered] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [isSettingsPopupOpen, setIsSettingsPopupOpen] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);


  const {
    warningSettings,
    loading: settingsLoading,
    error: settingsError,
    loadWarningSettings,
    updateWarningSetting,
    addWarningSetting,
    deleteWarningSetting,
    restoreWarningSetting,
    saveAllSettings,
    resetToOriginalSettings,
    saveCurrentSettingsAsOriginal,
  } = useWarningSettings();

  const activeWarningConfig = warningSettings.filter(
    (setting) => setting.enabled
  );

  useEffect(() => {
    loadWarningSettings();
  }, []);

  useEffect(() => {
    if (showDetailPopup || showSettingsPopup) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showDetailPopup, showSettingsPopup]);

  const formatDuration = (ms) => {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds]
      .map((unit) => String(unit).padStart(2, "0"))
      .join(":");
  };

  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const getCurrentWarningPeriod = () => {
    if (!currentSchedule?.shiftTime) return null;

    const currentHours = currentTime.getHours();
    const currentMinutes = currentTime.getMinutes();
    const currentTotalMinutes = currentHours * 60 + currentMinutes;

    const activeWarning = activeWarningConfig.find((config) => {
      const configStart = timeToMinutes(config.start);
      const configEnd = timeToMinutes(config.end);

      return (
        currentTotalMinutes >= configStart && currentTotalMinutes <= configEnd
      );
    });

    return activeWarning ? activeWarning.reason : null;
  };

  const loadCurrentSchedule = async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().split("T")[0];
      const resp = await http(
        API.schedules.list({
          status: "OnProgress",
          dateFrom: today,
          dateTo: today,
          limit: 10,
          page: 1,
        })
      );

      const items = resp?.items || [];

      if (items.length > 0) {
        const sortedItems = items.sort((a, b) => {
          const dateCompare = new Date(a.target_date) - new Date(b.target_date);
          if (dateCompare !== 0) return dateCompare;

          const getShiftStart = (shiftTime) => {
            const [start] = (shiftTime || "").split(" - ");
            const [hours, minutes] = (start || "00:00").split(":").map(Number);
            return hours * 60 + minutes;
          };

          return getShiftStart(a.shift_time) - getShiftStart(b.shift_time);
        });

        const schedule = sortedItems[0];

        setCurrentSchedule({
          id: schedule.id,
          date: schedule.target_date,
          line: schedule.line_code,
          shiftTime: schedule.shift_time,
          total_input: schedule.total_input || 0,
          total_customer: schedule.total_customer || 0,
          total_model: schedule.total_model || 0,
          total_pallet: schedule.total_pallet || 0,
          createdBy: schedule.created_by_name || schedule.created_by || "-",
          status: schedule.status || "OnProgress",
        });

        try {
          const detailResp = await http(API.schedules.detail(schedule.id));
          setScheduleDetails(detailResp);
        } catch (detailErr) {
          console.warn("Failed to load schedule details:", detailErr);
          setScheduleDetails(null);
        }
      } else {
        console.log("No OnProgress schedules found for today");
        setCurrentSchedule(null);
        setScheduleDetails(null);
      }
    } catch (err) {
      console.error("Error loading schedule:", err);
      setError(err.message || "Failed to load current schedule");
      setCurrentSchedule(null);
      setScheduleDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const calculateShiftTimes = () => {
    if (!currentSchedule?.shiftTime) {
      return {
        totalShiftDuration: 0,
        elapsedShiftTime: 0,
        remainingShiftTime: 0,
      };
    }

    const [startTime, endTime] = currentSchedule.shiftTime.split(" - ");
    if (!startTime || !endTime) {
      return {
        totalShiftDuration: 0,
        elapsedShiftTime: 0,
        remainingShiftTime: 0,
      };
    }

    const [startHours, startMinutes] = startTime.split(":").map(Number);
    const [endHours, endMinutes] = endTime.split(":").map(Number);

    const shiftStartTime = new Date(currentTime);
    shiftStartTime.setHours(startHours, startMinutes, 0, 0);

    const shiftEndTime = new Date(currentTime);
    shiftEndTime.setHours(endHours, endMinutes, 0, 0);

    if (shiftEndTime < shiftStartTime) {
      shiftEndTime.setDate(shiftEndTime.getDate() + 1);
    }

    const totalShiftDuration =
      shiftEndTime.getTime() - shiftStartTime.getTime();
    const elapsedShiftTime = currentTime.getTime() - shiftStartTime.getTime();
    const remainingShiftTime = shiftEndTime.getTime() - currentTime.getTime();

    return {
      totalShiftDuration: Math.max(0, totalShiftDuration),
      elapsedShiftTime: Math.max(0, elapsedShiftTime),
      remainingShiftTime: Math.max(0, remainingShiftTime),
    };
  };

  const formatDateDisplay = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const handleSaveSettings = async () => {
    setSaveStatus({ loading: true, message: "Saving..." });
    const result = await saveAllSettings();
    setSaveStatus({
      loading: false,
      success: result.success,
      message: result.message,
    });

    if (result.success) {
      setTimeout(() => {
        setShowSettingsPopup(false);
        setIsSettingsPopupOpen(false);
        setSaveStatus(null);
      }, 1500);
    } else {
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleOpenSettingsPopup = () => {
    saveCurrentSettingsAsOriginal(); // Simpan settings saat ini sebagai original
    setShowSettingsPopup(true);
    setIsSettingsPopupOpen(true);
  };

  const handleCancelSettings = () => {
    resetToOriginalSettings(); // Reset ke settings asli
    setShowSettingsPopup(false);
    setIsSettingsPopupOpen(false);
    setSaveStatus(null);
  };

  useEffect(() => {
  const timer = setInterval(() => {
    setCurrentTime(new Date());
  }, 1000);
  return () => clearInterval(timer);
}, []);

  useEffect(() => {
    loadCurrentSchedule();
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
  const interval = setInterval(() => {
    loadCurrentSchedule();
  }, 30000);
  
  setRefreshInterval(interval);
  
  return () => {
    if (interval) clearInterval(interval);
  };
}, []);

useEffect(() => {
  const checkScheduleCompletion = () => {
    if (!currentSchedule?.shiftTime) return;
    
    const [_, endTime] = currentSchedule.shiftTime.split(' - ');
    if (!endTime) return;
    
    const currentHours = currentTime.getHours();
    const currentMinutes = currentTime.getMinutes();
    const currentTotalMinutes = currentHours * 60 + currentMinutes;
    
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    const endTotalMinutes = endHours * 60 + endMinutes;
    
    // Jika waktu saat ini sudah melewati end time + 1 menit (buffer)
    if (currentTotalMinutes > endTotalMinutes + 1) {
      console.log('Schedule should be auto-completed');
      // Trigger reload untuk mengambil data terbaru
      loadCurrentSchedule();
    }
  };
  
  checkScheduleCompletion();
}, [currentTime, currentSchedule]);

// Tambahkan useEffect untuk auto-complete
useEffect(() => {
  const autoCompleteCheck = async () => {
    try {
      await http('/api/production-schedules/auto-complete', {
        method: 'PATCH'
      });
    } catch (err) {
      console.error('Auto-complete check failed:', err);
    }
  };

  // Check setiap 30 detik
  const interval = setInterval(autoCompleteCheck, 30000);
  return () => clearInterval(interval);
}, []);

  const { totalShiftDuration, elapsedShiftTime, remainingShiftTime } =
    calculateShiftTimes();

  const currentWarningReason = getCurrentWarningPeriod();
  const isWarning = !!currentWarningReason;

  const firstCustomer = scheduleDetails?.details?.[0];

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

  const handleInputFocus = (e) => {
    e.target.style.borderColor = "#9fa8da";
  };

  const handleInputBlur = (e) => {
    e.target.style.borderColor = "#d1d5db";
  };

  const [activeTab, setActiveTab] = useState("all");

  const optionStyle = {
    backgroundColor: "#d1d5db",
    color: "#374151",
    fontSize: "12px",
    padding: "4px 8px",
  };

  const styles = {
    pageContainer: {
      transition: "margin-left 0.3s ease",
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
      boxShadow: "0 1px 10px 0 rgba(0, 0, 0, 0.1)",
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
      marginBottom: "24px",
    },
    actionButtonsGroup: {
      display: "flex",
      gap: "8px",
      marginBottom: "24px",
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
      color: "#374151",
      fontWeight: "500",
    },
    input: {
      height: "32px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      padding: "0 12px",
      fontSize: "12px",
      backgroundColor: "white",
      fontFamily: "inherit",
      minWidth: "120px",
    },
    select: {
      height: "32px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      padding: "0 8px",
      fontSize: "12px",
      backgroundColor: "white",
      cursor: "pointer",
      fontFamily: "inherit",
      minWidth: "120px",
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
    dailyProductionCard: {
      backgroundColor: "#ffffff",
      padding: "28px",
      borderRadius: "8px",
      boxShadow: "0 1px 10px 0 rgba(0, 0, 0, 0.1)",
      border: "1px solid #e0e7ff",
      marginBottom: "15px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "24px",
    },
    cardHeader: {
      width: "100%",
      fontSize: "18px",
      fontWeight: "700",
      color: "#1f2937",
      marginBottom: "16px",
      borderBottom: "2px solid #e0e7ff",
      paddingBottom: "12px",
      textAlign: "center",
    },
    metricBoxesWrapper: {
      display: "flex",
      justifyContent: "center",
      gap: "24px",
      flexWrap: "wrap",
      width: "100%",
    },
    metricBox: {
      backgroundColor: "#f8faff",
      width: "200px",
      padding: "20px",
      borderRadius: "8px",
      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)",
      border: "1px solid #d1d9e0",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
    },
    metricLabel: {
      fontSize: "12px",
      color: "#6b7280",
      fontWeight: "500",
      marginBottom: "8px",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
    },
    metricValueLarge: {
      fontSize: "28px",
      fontWeight: "800",
      color: "#2563eb",
    },
    metricValueMedium: {
      fontSize: "12px",
      fontWeight: "700",
      color: "#1f2937",
    },
    infoBlock: {
      width: "98%",
      backgroundColor: "#f8faff",
      padding: "20px",
      borderRadius: "8px",
      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)",
      border: "1px solid #d1d9e0",
      display: "flex",
      flexDirection: "column",
      gap: "15px",
    },
    infoRow: {
      display: "grid",
      gridTemplateColumns: "160px 10px 1fr",
      alignItems: "baseline",
      paddingBottom: "5px",
      borderBottom: "1px dashed #e0e7ff",
    },
    infoLabel: {
      fontSize: "12px",
      color: "#4b5563",
      fontWeight: "600",
    },
    infoColon: {
      fontSize: "12px",
      color: "#4b5563",
      fontWeight: "600",
      textAlign: "center",
    },
    infoValue: {
      fontSize: "12px",
      color: "#1f2937",
      fontWeight: "500",
    },
    timerValue: {
      fontSize: "28px",
      fontWeight: "800",
      color: "#2563eb",
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
    paginationButtonHover: {
      backgroundColor: "#c7d2fe",
      color: "#111827",
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
    emptyColumn: {
      width: "auto",
      minWidth: "auto",
      maxWidth: "auto",
      padding: "0",
      textAlign: "center",
    },

    pageContainer: {
      transition: "margin-left 0.3s ease",
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
    dailyProductionCard: {
      backgroundColor: "#ffffff",
      padding: "28px",
      borderRadius: "8px",
      boxShadow: "0 1px 10px 0 rgba(0, 0, 0, 0.1)",
      border: "1px solid #e0e7ff",
      marginBottom: "15px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "24px",
    },
    cardHeader: {
      width: "100%",
      fontSize: "18px",
      fontWeight: "700",
      color: "#1f2937",
      marginBottom: "16px",
      borderBottom: "2px solid #e0e7ff",
      paddingBottom: "12px",
      textAlign: "center",
    },
    metricBoxesWrapper: {
      display: "flex",
      justifyContent: "center",
      gap: "24px",
      flexWrap: "wrap",
      width: "100%",
    },
    metricBox: {
      backgroundColor: "#f8faff",
      width: "200px",
      padding: "20px",
      borderRadius: "8px",
      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)",
      border: "1px solid #d1d9e0",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
    },
    metricLabel: {
      fontSize: "12px",
      color: "#6b7280",
      fontWeight: "500",
      marginBottom: "8px",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
    },
    metricValueLarge: {
      fontSize: "28px",
      fontWeight: "800",
      color: "#2563eb",
    },
    metricValueWarning: {
      fontSize: "28px",
      fontWeight: "800",
      color: "#dc2626",
    },
    metricValueMedium: {
      fontSize: "12px",
      fontWeight: "700",
      color: "#1f2937",
    },
    infoBlock: {
      width: "98%",
      backgroundColor: "#f8faff",
      padding: "20px",
      borderRadius: "8px",
      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)",
      border: "1px solid #d1d9e0",
      display: "flex",
      flexDirection: "column",
      gap: "15px",
      position: "relative",
    },
    infoRow: {
      display: "grid",
      gridTemplateColumns: "160px 10px 1fr",
      alignItems: "baseline",
      paddingBottom: "5px",
      borderBottom: "1px dashed #e0e7ff",
    },
    infoLabel: {
      fontSize: "12px",
      color: "#4b5563",
      fontWeight: "600",
    },
    infoColon: {
      fontSize: "12px",
      color: "#4b5563",
      fontWeight: "600",
      textAlign: "center",
    },
    infoValue: {
      fontSize: "12px",
      color: "#1f2937",
      fontWeight: "500",
    },
    timerValue: {
      fontSize: "28px",
      fontWeight: "800",
      color: "#2563eb",
    },
    timerValueWarning: {
      fontSize: "28px",
      fontWeight: "800",
      color: "#dc2626",
    },
    detailButton: {
      position: "absolute",
      top: "15px",
      right: "15px",
      backgroundColor: "#e0e7ff",
      color: "#374151",
      border: "none",
      borderRadius: "4px",
      padding: "6px 12px",
      fontSize: "11px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      transition: "background-color 0.2s ease",
    },
    popupOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "flex-start",
      zIndex: 1000,
      overflowY: "auto",
      padding: "20px 0",
    },
    popupContainer: {
      backgroundColor: "white",
      marginTop: "150px",
      borderRadius: "8px",
      padding: "24px",
      width: "800px",
      maxWidth: "90vw",
      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
    },
    popupHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: "1px solid #e5e7eb",
      paddingBottom: "12px",
      marginBottom: "16px",
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
    popupContent: {
      display: "flex",
      flexDirection: "column",
      gap: "16px",
    },
    popupSection: {
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
      padding: "16px",
    },
    popupSectionTitle: {
      fontSize: "14px",
      fontWeight: "600",
      color: "#374151",
      marginBottom: "12px",
    },
    popupInfoRow: {
      display: "grid",
      gridTemplateColumns: "140px 1fr",
      alignItems: "center",
      padding: "4px 0",
      borderBottom: "1px solid #f3f4f6",
    },
    popupInfoLabel: {
      fontSize: "12px",
      color: "#6b7280",
      fontWeight: "500",
    },
    popupInfoValue: {
      fontSize: "12px",
      color: "#374151",
      fontWeight: "400",
    },
    detailsTable: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: "11px",
    },
    detailsTh: {
      border: "1px solid #e5e7eb",
      padding: "6px 8px",
      backgroundColor: "#f8faff",
      textAlign: "left",
      fontWeight: "600",
    },
    detailsTd: {
      border: "1px solid #e5e7eb",
      padding: "6px 8px",
    },
    loadingMessage: {
      textAlign: "center",
      color: "#6b7280",
      fontSize: "14px",
      padding: "20px",
    },
    errorMessage: {
      textAlign: "center",
      color: "#dc2626",
      fontSize: "14px",
      padding: "20px",
    },
    noScheduleMessage: {
      textAlign: "center",
      color: "#6b7280",
      fontSize: "14px",
      padding: "20px",
      fontStyle: "italic",
    },

    settingsSection: {
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
      padding: "16px",
      marginBottom: "16px",
    },
    settingsHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "12px",
    },
    settingsList: {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    },
    settingItem: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px",
      border: "1px solid #f3f4f6",
      borderRadius: "4px",
    },
    checkbox: {
      width: "16px",
      height: "16px",
    },
    timeInput: {
      padding: "4px 8px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      fontSize: "12px",
    },
    timeSeparator: {
      fontSize: "12px",
      color: "#6b7280",
    },
    reasonInput: {
      flex: 1,
      padding: "4px 8px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      fontSize: "12px",
    },
    deleteSettingButton: {
      padding: "4px 8px",
      border: "1px solid #ef4444",
      backgroundColor: "#fef2f2",
      color: "#dc2626",
      borderRadius: "4px",
      cursor: "pointer",
    },
    metricHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      width: "100%",
      marginBottom: "8px",
      position: "relative",
    },
    settingsIconButton: {
      backgroundColor: "transparent",
      border: "none",
      cursor: "pointer",
      padding: "4px",
      borderRadius: "4px",
      color: "#6b7280",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.2s ease",
      position: "absolute",
      top: "-8px",
      right: "-8px",
    },
    buttonGroup: {
      display: "flex",
      gap: "8px",
      justifyContent: "flex-end",
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
    settingsTableContainer: {
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
      overflow: "hidden",
      marginTop: "12px",
    },
    settingsTable: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: "12px",
    },
    settingsTableHeader: {
      backgroundColor: "#f8faff",
      padding: "8px 12px",
      textAlign: "left",
      fontWeight: "600",
      color: "#374151",
      borderBottom: "1px solid #e5e7eb",
    },
    settingsTableRow: {
      borderBottom: "1px solid #f3f4f6",
      "&:hover": {
        backgroundColor: "#f9fafb",
      },
    },
    settingsTableCell: {
      padding: "8px 12px",
      borderBottom: "1px solid #f3f4f6",
      verticalAlign: "middle",
    },
    settingsActionButtons: {
      display: "flex",
      gap: "8px",
    },
    refreshButton: {
      backgroundColor: "#e0e7ff",
      color: "#374151",
      border: "none",
      padding: "6px 12px",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "12px",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      transition: "background-color 0.2s ease",
    },
    saveStatus: {
      padding: "8px 12px",
      borderRadius: "4px",
      fontSize: "12px",
      fontWeight: "500",
      textAlign: "center",
    },
    saveStatusSuccess: {
      backgroundColor: "#dcfce7",
      color: "#166534",
      border: "1px solid #bbf7d0",
    },
    saveStatusError: {
      backgroundColor: "#fef2f2",
      color: "#dc2626",
      border: "1px solid #fecaca",
    },
    saveStatusLoading: {
      backgroundColor: "#f0f9ff",
      color: "#0369a1",
      border: "1px solid #bae6fd",
    },
  };

  const unitsCoverage = (stock, usagePerUnit) => {
    if (!usagePerUnit || usagePerUnit <= 0) return Number.POSITIVE_INFINITY;
    return Math.floor((stock ?? 0) / usagePerUnit);
  };

  const m1a1TextColor = (stock, usagePerUnit) => {
    const cov = unitsCoverage(stock, usagePerUnit);
    if (cov < 90) return "#dc2626";
    if (cov < 150) return "#ca8a04";
    return "#16a34a";
  };

  const PAGE_SIZE = 20;

  const parts = Array.from({ length: 30 }, (_, i) => {
    const usageOptions = [1, 2, 4, 8];
    const usagePerUnit = usageOptions[i % usageOptions.length];

    const coverageOptions = [75, 110, 180, 60, 95, 140, 155, 200];
    const coverage = coverageOptions[i % coverageOptions.length];
    const m1a1 = coverage * usagePerUnit;
    const m136 = Math.max(0, Math.floor(m1a1 * 0.3));
    const real = m1a1 + m136;

    return {
      code: `PART-${String(i + 1).padStart(3, "0")}`,
      name: `Dummy Part ${i + 1}`,
      type: i % 2 === 0 ? "REGULER" : "SPECIAL PART",
      vendorType: i % 2 === 0 ? "LOCAL" : "OVERSEA",
      vendorName: i % 2 === 0 ? "PT EXAMPLE SUPPLIER" : "ACME GLOBAL",
      m1a1,
      m136,
      real,
      usagePerUnit,
    };
  });

  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(parts.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pagedParts = parts.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div style={styles.pageContainer}>
      <div style={styles.welcomeCard}>
        <div style={styles.dailyProductionCard}>
          <div style={styles.cardHeader}>Production Monitoring</div>

          {loading && (
            <div style={styles.loadingMessage}>Loading current schedule...</div>
          )}

          {error && <div style={styles.errorMessage}>Error: {error}</div>}

          {!loading && !error && !currentSchedule && (
            <div style={styles.noScheduleMessage}>
              No active schedule found. Please check OnProgress schedules.
            </div>
          )}

          {!loading && !error && currentSchedule && (
            <>
              <div style={styles.metricBoxesWrapper}>
                <div style={styles.metricBox}>
                  <span style={styles.metricLabel}>Daily Input Target</span>
                  <span style={styles.metricValueLarge}>
                    {currentSchedule.total_input || 0}
                  </span>
                </div>
                <div style={styles.metricBox}>
                  <span style={styles.metricLabel}>Current Target</span>
                  <span style={styles.metricValueLarge}>0</span>
                </div>
                <div style={styles.metricBox}>
                  <div style={styles.metricHeader}>
                    <span
                      style={{
                        ...styles.metricLabel,
                        marginLeft: "40px",
                      }}
                    >
                      Shift Remaining
                    </span>
                    <button
                      style={{
                        ...styles.settingsIconButton,
                        color: isSettingsHovered ? "#2563eb" : "#6b7280",
                        backgroundColor: isSettingsHovered
                          ? "#f3f4f6"
                          : "transparent",
                      }}
                      onClick={handleOpenSettingsPopup}
                      onMouseEnter={() => setIsSettingsHovered(true)}
                      onMouseLeave={() => setIsSettingsHovered(false)}
                      title="Configure Warning Times"
                    >
                      <Settings size={16} />
                    </button>
                  </div>
                  <span
                    style={
                      isWarning ? styles.timerValueWarning : styles.timerValue
                    }
                  >
                    {formatDuration(remainingShiftTime)}
                  </span>
                  {currentWarningReason && (
                    <div
                      style={{
                        fontSize: "10px",
                        color: "#dc2626",
                        marginTop: "4px",
                        fontWeight: "600",
                      }}
                    >
                      {currentWarningReason}
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.infoBlock}>
                <button
                  style={{
                    ...styles.detailButton,
                    color: isDetailHovered ? "#2563eb" : "#374151",
                  }}
                  onClick={() => setShowDetailPopup(true)}
                  onMouseEnter={() => setIsDetailHovered(true)}
                  onMouseLeave={() => setIsDetailHovered(false)}
                  title="View Schedule Details"
                >
                  <Eye size={12} />
                  Details
                </button>

                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Shift Time</span>
                  <span style={styles.infoColon}>:</span>
                  <span style={styles.infoValue}>
                    {currentSchedule.shiftTime || "-"}
                  </span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Shift Status</span>
                  <span style={styles.infoColon}>:</span>
                  <span style={styles.infoValue}>
                    {elapsedShiftTime > 0 && remainingShiftTime > 0
                      ? "In Progress"
                      : elapsedShiftTime <= 0
                      ? "Not Started"
                      : "Completed"}
                  </span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Current Customer</span>
                  <span style={styles.infoColon}>:</span>
                  <span style={styles.infoValue}>
                    {firstCustomer?.customer || "-"}
                  </span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Product Code</span>
                  <span style={styles.infoColon}>:</span>
                  <span style={styles.infoValue}>
                    {firstCustomer?.material_code ||
                      firstCustomer?.materialCode ||
                      "-"}
                  </span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Model</span>
                  <span style={styles.infoColon}>:</span>
                  <span style={styles.infoValue}>
                    {firstCustomer?.model || "-"}
                  </span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Description</span>
                  <span style={styles.infoColon}>:</span>
                  <span style={styles.infoValue}>
                    {firstCustomer?.description || "-"}
                  </span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Target Date</span>
                  <span style={styles.infoColon}>:</span>
                  <span style={styles.infoValue}>
                    {formatDateDisplay(currentSchedule.date)}
                  </span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Line</span>
                  <span style={styles.infoColon}>:</span>
                  <span style={styles.infoValue}>
                    {currentSchedule.line || "-"}
                  </span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Created By</span>
                  <span style={styles.infoColon}>:</span>
                  <span style={styles.infoValue}>
                    {currentSchedule.createdBy || "-"}
                  </span>
                </div>
                {firstCustomer?.poNumber && (
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>PO Number</span>
                    <span style={styles.infoColon}>:</span>
                    <span style={styles.infoValue}>
                      {firstCustomer.poNumber}
                    </span>
                  </div>
                )}
                {firstCustomer?.palletType && (
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Pallet Type</span>
                    <span style={styles.infoColon}>:</span>
                    <span style={styles.infoValue}>
                      {firstCustomer.palletType}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        {showDetailPopup && currentSchedule && (
          <div style={styles.popupOverlay}>
            <div style={styles.popupContainer}>
              <div style={styles.popupHeader}>
                <h3 style={styles.popupTitle}>Schedule Details</h3>
                <button
                  style={styles.closeButton}
                  onClick={() => setShowDetailPopup(false)}
                >
                  ×
                </button>
              </div>

              <div style={styles.popupContent}>
                <div style={styles.popupSection}>
                  <h4 style={styles.popupSectionTitle}>Schedule Information</h4>
                  <div style={styles.popupInfoRow}>
                    <span style={styles.popupInfoLabel}>Target Date:</span>
                    <span style={styles.popupInfoValue}>
                      {formatDateDisplay(currentSchedule.date)}
                    </span>
                  </div>
                  <div style={styles.popupInfoRow}>
                    <span style={styles.popupInfoLabel}>Line:</span>
                    <span style={styles.popupInfoValue}>
                      {currentSchedule.line}
                    </span>
                  </div>
                  <div style={styles.popupInfoRow}>
                    <span style={styles.popupInfoLabel}>Shift Time:</span>
                    <span style={styles.popupInfoValue}>
                      {currentSchedule.shiftTime}
                    </span>
                  </div>
                  <div style={styles.popupInfoRow}>
                    <span style={styles.popupInfoLabel}>Total Input:</span>
                    <span style={styles.popupInfoValue}>
                      {currentSchedule.total_input}
                    </span>
                  </div>
                  <div style={styles.popupInfoRow}>
                    <span style={styles.popupInfoLabel}>Total Customer:</span>
                    <span style={styles.popupInfoValue}>
                      {currentSchedule.total_customer}
                    </span>
                  </div>
                  <div style={styles.popupInfoRow}>
                    <span style={styles.popupInfoLabel}>Total Model:</span>
                    <span style={styles.popupInfoValue}>
                      {currentSchedule.total_model}
                    </span>
                  </div>
                  <div style={styles.popupInfoRow}>
                    <span style={styles.popupInfoLabel}>Total Pallet:</span>
                    <span style={styles.popupInfoValue}>
                      {currentSchedule.total_pallet}
                    </span>
                  </div>
                  <div style={styles.popupInfoRow}>
                    <span style={styles.popupInfoLabel}>Created By:</span>
                    <span style={styles.popupInfoValue}>
                      {currentSchedule.createdBy}
                    </span>
                  </div>
                </div>

                {scheduleDetails?.details &&
                  scheduleDetails.details.length > 0 && (
                    <div style={styles.popupSection}>
                      <h4 style={styles.popupSectionTitle}>
                        Production Details
                      </h4>
                      <table style={styles.detailsTable}>
                        <thead>
                          <tr>
                            <th style={styles.detailsTh}>No</th>
                            <th style={styles.detailsTh}>Customer</th>
                            <th style={styles.detailsTh}>Material Code</th>
                            <th style={styles.detailsTh}>Model</th>
                            <th style={styles.detailsTh}>Input</th>
                            <th style={styles.detailsTh}>PO Number</th>
                            <th style={styles.detailsTh}>Pallet Type</th>
                            <th style={styles.detailsTh}>Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scheduleDetails.details.map((detail, index) => (
                            <tr key={index}>
                              <td style={styles.detailsTd}>{index + 1}</td>
                              <td style={styles.detailsTd}>
                                {detail.customer || detail.cust_name || "-"}
                              </td>
                              <td style={styles.detailsTd}>
                                {detail.material_code ||
                                  detail.materialCode ||
                                  "-"}
                              </td>
                              <td style={styles.detailsTd}>
                                {detail.model || "-"}
                              </td>
                              <td style={styles.detailsTd}>
                                {detail.input || detail.input_quantity || 0}
                              </td>
                              <td style={styles.detailsTd}>
                                {detail.po_number || detail.poNumber || "-"}
                              </td>
                              <td style={styles.detailsTd}>
                                {detail.pallet_type || detail.palletType || "-"}
                              </td>
                              <td style={styles.detailsTd}>
                                {detail.description || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}

        {showSettingsPopup && (
          <div style={styles.popupOverlay}>
            <div
              style={{
                ...styles.popupContainer,
                width: "700px",
                maxHeight: "none",
                height: "auto",
                marginTop: "130px",
              }}
            >
              <div style={styles.popupHeader}>
                <h3 style={styles.popupTitle}>Warning Time Settings</h3>
                <button
                  style={styles.closeButton}
                  onClick={handleCancelSettings}
                >
                  ×
                </button>
              </div>

              <div style={styles.popupContent}>
                {settingsLoading && (
                  <div style={styles.loadingMessage}>Loading settings...</div>
                )}

                {settingsError && (
                  <div style={styles.errorMessage}>
                    {settingsError} (Using cached settings)
                  </div>
                )}

                {saveStatus && (
                  <div
                    style={{
                      ...styles.saveStatus,
                      ...(saveStatus.loading && styles.saveStatusLoading),
                      ...(saveStatus.success && styles.saveStatusSuccess),
                      ...(saveStatus.success === false &&
                        styles.saveStatusError),
                    }}
                  >
                    {saveStatus.message}
                  </div>
                )}

                <div style={styles.settingsSection}>
                  <div style={styles.settingsHeader}>
                    <h4 style={styles.popupSectionTitle}>
                      Configure Warning Periods
                    </h4>
                    <div style={styles.settingsActionButtons}>
                      <button
                        style={styles.addButton}
                        onClick={addWarningSetting}
                      >
                        <Plus size={14} />
                        Add New
                      </button>
                    </div>
                  </div>

                  <div style={styles.settingsTableContainer}>
                    <table style={styles.settingsTable}>
                      <thead>
                        <tr>
                          <th style={styles.settingsTableHeader}>Status</th>
                          <th style={styles.settingsTableHeader}>Start Time</th>
                          <th style={styles.settingsTableHeader}>End Time</th>
                          <th style={styles.settingsTableHeader}>Reason</th>
                          <th style={styles.settingsTableHeader}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {warningSettings.map((setting) => (
                          <tr
                            key={setting.id}
                            style={{
                              ...styles.settingsTableRow,
                              ...(setting.markedForDeletion && {
                                backgroundColor: "#fef2f2",
                                opacity: 0.6,
                              }),
                              ...(setting.isNew && {
                                backgroundColor: "#f0f9ff",
                              }),
                            }}
                          >
                            <td style={styles.settingsTableCell}>
                              <input
                                type="checkbox"
                                checked={
                                  setting.enabled && !setting.markedForDeletion
                                }
                                onChange={(e) =>
                                  updateWarningSetting(
                                    setting.id,
                                    "enabled",
                                    e.target.checked
                                  )
                                }
                                style={styles.checkbox}
                                disabled={setting.markedForDeletion}
                              />
                            </td>
                            <td style={styles.settingsTableCell}>
                              <input
                                type="time"
                                value={setting.start}
                                onChange={(e) =>
                                  updateWarningSetting(
                                    setting.id,
                                    "start",
                                    e.target.value
                                  )
                                }
                                style={{
                                  ...styles.timeInput,
                                  ...(setting.markedForDeletion && {
                                    backgroundColor: "#fecaca",
                                  }),
                                }}
                                disabled={setting.markedForDeletion}
                              />
                            </td>
                            <td style={styles.settingsTableCell}>
                              <input
                                type="time"
                                value={setting.end}
                                onChange={(e) =>
                                  updateWarningSetting(
                                    setting.id,
                                    "end",
                                    e.target.value
                                  )
                                }
                                style={{
                                  ...styles.timeInput,
                                  ...(setting.markedForDeletion && {
                                    backgroundColor: "#fecaca",
                                  }),
                                }}
                                disabled={setting.markedForDeletion}
                              />
                            </td>
                            <td style={styles.settingsTableCell}>
                              <input
                                type="text"
                                value={setting.reason}
                                onChange={(e) =>
                                  updateWarningSetting(
                                    setting.id,
                                    "reason",
                                    e.target.value
                                  )
                                }
                                placeholder="Enter reason"
                                style={{
                                  ...styles.reasonInput,
                                  ...(setting.markedForDeletion && {
                                    backgroundColor: "#fecaca",
                                  }),
                                }}
                                disabled={setting.markedForDeletion}
                              />
                            </td>
                            <td style={styles.settingsTableCell}>
                              {setting.markedForDeletion ? (
                                <button
                                  style={{
                                    ...styles.deleteSettingButton,
                                    backgroundColor: "#dcfce7",
                                    color: "#166534",
                                    border: "1px solid #bbf7d0",
                                  }}
                                  onClick={() =>
                                    restoreWarningSetting(setting.id)
                                  }
                                  title="Restore setting"
                                >
                                  Restore
                                </button>
                              ) : (
                                <button
                                  style={styles.deleteSettingButton}
                                  onClick={() =>
                                    deleteWarningSetting(setting.id)
                                  }
                                  disabled={warningSettings.length <= 1}
                                  title="Delete setting"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={styles.buttonGroup}>
                  <button
                    style={styles.cancelButton}
                    onClick={handleCancelSettings}
                  >
                    Cancel
                  </button>
                  <button
                    style={{
                      ...styles.submitButton,
                      ...(saveStatus?.loading && {
                        opacity: 0.7,
                        cursor: "not-allowed",
                      }),
                    }}
                    onClick={handleSaveSettings}
                    disabled={saveStatus?.loading}
                  >
                    {saveStatus?.loading ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        <div style={styles.combinedHeaderFilter}>
          <div style={styles.headerRow}>
            <h1 style={styles.title}>Search Bar</h1>
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
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
              <span style={styles.label}>To</span>
              <input
                type="date"
                style={styles.input}
                placeholder="Date To"
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </div>
            <div style={styles.inputGroup}>
              <span style={styles.label}>Search By</span>
              <select
                style={styles.select}
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
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
              <button
                style={styles.button}
                onMouseEnter={(e) => handleButtonHover(e, true, "search")}
                onMouseLeave={(e) => handleButtonHover(e, false, "search")}
              >
                Search
              </button>
            </div>
          </div>
        </div>
        <div style={styles.tabsContainer}>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "all" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("all")}
            onMouseEnter={(e) => handleTabHover(e, true, activeTab === "all")}
            onMouseLeave={(e) => handleTabHover(e, false, activeTab === "all")}
          >
            ALL
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "subCr" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("subCr")}
            onMouseEnter={(e) => handleTabHover(e, true, activeTab === "subCr")}
            onMouseLeave={(e) =>
              handleTabHover(e, false, activeTab === "subCr")
            }
          >
            SUB CR
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "tpu1" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("tpu1")}
            onMouseEnter={(e) => handleTabHover(e, true, activeTab === "tpu1")}
            onMouseLeave={(e) => handleTabHover(e, false, activeTab === "tpu1")}
          >
            TPU 1
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "tpu2" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("tpu2")}
            onMouseEnter={(e) => handleTabHover(e, true, activeTab === "tpu2")}
            onMouseLeave={(e) => handleTabHover(e, false, activeTab === "tpu2")}
          >
            TPU 2
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "cr1" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("cr1")}
            onMouseEnter={(e) => handleTabHover(e, true, activeTab === "cr1")}
            onMouseLeave={(e) => handleTabHover(e, false, activeTab === "cr1")}
          >
            CR 1
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "cr2" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("cr2")}
            onMouseEnter={(e) => handleTabHover(e, true, activeTab === "cr2")}
            onMouseLeave={(e) => handleTabHover(e, false, activeTab === "cr")}
          >
            CR 2
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "cradj" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("cradj")}
            onMouseEnter={(e) => handleTabHover(e, true, activeTab === "cradj")}
            onMouseLeave={(e) =>
              handleTabHover(e, false, activeTab === "cradj")
            }
          >
            CR ADJ
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "m1" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("m1")}
            onMouseEnter={(e) => handleTabHover(e, true, activeTab === "m1")}
            onMouseLeave={(e) => handleTabHover(e, false, activeTab === "m1")}
          >
            M 1
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "m2" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("m2")}
            onMouseEnter={(e) => handleTabHover(e, true, activeTab === "m2")}
            onMouseLeave={(e) => handleTabHover(e, false, activeTab === "m2")}
          >
            M 2
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "ft" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("ft")}
            onMouseEnter={(e) => handleTabHover(e, true, activeTab === "ft")}
            onMouseLeave={(e) => handleTabHover(e, false, activeTab === "ft")}
          >
            FT
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "acc" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("ft")}
            onMouseEnter={(e) => handleTabHover(e, true, activeTab === "acc")}
            onMouseLeave={(e) => handleTabHover(e, false, activeTab === "acc")}
          >
            ACC
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "packing" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("packing")}
            onMouseEnter={(e) =>
              handleTabHover(e, true, activeTab === "packing")
            }
            onMouseLeave={(e) =>
              handleTabHover(e, false, activeTab === "packing")
            }
          >
            PACKING
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
                <col style={{ width: "28px" }} />
                <col style={{ width: "25%" }} />
                <col style={{ width: "25%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "25%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "15%" }} />
              </colgroup>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.expandedTh}>No</th>
                  <th style={styles.thWithLeftBorder}>Part Code</th>
                  <th style={styles.thWithLeftBorder}>Part Name</th>
                  <th style={styles.thWithLeftBorder}>Part Type</th>
                  <th style={styles.thWithLeftBorder}>Vendor Type</th>
                  <th style={styles.thWithLeftBorder}>Vendor Name</th>
                  <th style={styles.thWithLeftBorder}>Station</th>
                  <th style={styles.thWithLeftBorder}>Used</th>
                  <th style={styles.thWithLeftBorder}>Stock M1A1</th>
                  <th style={styles.thWithLeftBorder}>Stock M136</th>
                  <th style={styles.thWithLeftBorder}>Status</th>
                </tr>
              </thead>
              <tbody>
                {pagedParts.map((p, idx) => (
                  <tr
                    key={p.code}
                    onMouseEnter={(e) =>
                      (e.target.closest("tr").style.backgroundColor = "#c7cde8")
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
                      {startIndex + idx + 1}
                    </td>

                    <td
                      style={styles.tdWithLeftBorder}
                      onMouseEnter={showTooltip}
                      onMouseLeave={hideTooltip}
                    >
                      {p.code}
                    </td>

                    <td
                      style={styles.tdWithLeftBorder}
                      onMouseEnter={showTooltip}
                      onMouseLeave={hideTooltip}
                    >
                      {p.name}
                    </td>

                    <td
                      style={styles.tdWithLeftBorder}
                      onMouseEnter={showTooltip}
                      onMouseLeave={hideTooltip}
                    >
                      {p.type}
                    </td>

                    <td
                      style={styles.tdWithLeftBorder}
                      onMouseEnter={showTooltip}
                      onMouseLeave={hideTooltip}
                    >
                      {p.vendorType}
                    </td>

                    <td
                      style={styles.tdWithLeftBorder}
                      onMouseEnter={showTooltip}
                      onMouseLeave={hideTooltip}
                    >
                      {p.vendorName}
                    </td>

                    <td
                      style={styles.tdWithLeftBorder}
                      onMouseEnter={showTooltip}
                      onMouseLeave={hideTooltip}
                    ></td>

                    <td
                      style={styles.tdWithLeftBorder}
                      onMouseEnter={showTooltip}
                      onMouseLeave={hideTooltip}
                    ></td>

                    <td
                      style={styles.tdWithLeftBorder}
                      onMouseEnter={showTooltip}
                      onMouseLeave={hideTooltip}
                    >
                      <span
                        style={{
                          color: m1a1TextColor(p.m1a1, p.usagePerUnit),
                          fontWeight: 700,
                        }}
                        title={`Coverage: ${unitsCoverage(
                          p.m1a1,
                          p.usagePerUnit
                        )} units (usage: ${p.usagePerUnit}/unit)`}
                      >
                        {p.m1a1} pcs
                      </span>
                    </td>

                    <td
                      style={styles.tdWithLeftBorder}
                      onMouseEnter={showTooltip}
                      onMouseLeave={hideTooltip}
                    >
                      {p.m136} pcs
                    </td>

                    <td style={styles.tdWithLeftBorder}></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={styles.paginationBar}>
            <div style={styles.paginationControls}>
              <button
                style={styles.paginationButton}
                disabled={currentPage === 1}
                onMouseEnter={(e) => handleButtonHover(e, true, "pagination")}
                onMouseLeave={(e) => handleButtonHover(e, false, "pagination")}
                onClick={() => setCurrentPage(1)}
                title="First page"
              >
                {"<<"}
              </button>
              <button
                style={styles.paginationButton}
                disabled={currentPage === 1}
                onMouseEnter={(e) => handleButtonHover(e, true, "pagination")}
                onMouseLeave={(e) => handleButtonHover(e, false, "pagination")}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                title="Previous page"
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
              <span>of {totalPages}</span>
              <button
                style={styles.paginationButton}
                disabled={currentPage === totalPages}
                onMouseEnter={(e) => handleButtonHover(e, true, "pagination")}
                onMouseLeave={(e) => handleButtonHover(e, false, "pagination")}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                title="Next page"
              >
                {">"}
              </button>
              <button
                style={styles.paginationButton}
                disabled={currentPage === totalPages}
                onMouseEnter={(e) => handleButtonHover(e, true, "pagination")}
                onMouseLeave={(e) => handleButtonHover(e, false, "pagination")}
                onClick={() => setCurrentPage(totalPages)}
                title="Last page"
              >
                {">>"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionMonitoringPage;
