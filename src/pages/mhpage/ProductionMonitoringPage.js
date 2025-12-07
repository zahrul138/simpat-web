"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Trash2, Eye, Settings } from "lucide-react";
import timerService from "../../utils/TimerService";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";
const API = {
  schedules: {
    list: (q) => `/api/production-schedules?${new URLSearchParams(q || {})}`,
    detail: (id) => `/api/production-schedules/${id}`,
    updateStatus: (id) => `/api/production-schedules/${id}/status`,
    updateDetailStatus: (id) =>
      `/api/production-schedules/details/${id}/status`,
  },
  warningSettings: {
    list: () => `/api/warning-settings`,
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

  const loadWarningSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await http(API.warningSettings.list());

      if (data && data.length > 0) {
        setWarningSettings(data);
        setOriginalSettings(data);
        localStorage.setItem("warningSettings", JSON.stringify(data));
        console.log("Settings loaded from API");
      } else {
        const cached = localStorage.getItem("warningSettings");
        if (cached) {
          const parsed = JSON.parse(cached);
          setWarningSettings(parsed);
          setOriginalSettings(parsed);
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
          setOriginalSettings(defaultSettings);
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
        setOriginalSettings(parsed);
        console.log("Settings loaded from localStorage (API error)");
      }
      setError("Failed to load settings from server");
    } finally {
      setLoading(false);
    }
  }, []);

  const updateWarningSetting = useCallback((id, field, value) => {
    setWarningSettings((prev) =>
      prev.map((setting) =>
        setting.id === id ? { ...setting, [field]: value } : setting
      )
    );
  }, []);

  const addWarningSetting = useCallback(() => {
    setWarningSettings((prev) => {
      const tempId = Math.max(...prev.map((s) => s.id), 0) + 1;
      const newSetting = {
        id: tempId,
        start: "09:00",
        end: "09:30",
        reason: "New Break",
        enabled: true,
        isNew: true,
      };
      return [...prev, newSetting];
    });
  }, []);

  const deleteWarningSetting = useCallback((id) => {
    setWarningSettings((prev) => {
      if (prev.length <= 1) {
        alert("Minimal harus ada 1 setting warning");
        return prev;
      }

      const settingToDelete = prev.find((setting) => setting.id === id);

      if (settingToDelete?.isNew) {
        return prev.filter((setting) => setting.id !== id);
      }

      return prev.map((setting) =>
        setting.id === id ? { ...setting, markedForDeletion: true } : setting
      );
    });
  }, []);

  const restoreWarningSetting = useCallback((id) => {
    setWarningSettings((prev) =>
      prev.map((setting) =>
        setting.id === id ? { ...setting, markedForDeletion: false } : setting
      )
    );
  }, []);

  const saveAllSettings = useCallback(async () => {
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
  }, [warningSettings]);

  const resetToOriginalSettings = useCallback(() => {
    setWarningSettings(originalSettings);
    localStorage.setItem("warningSettings", JSON.stringify(originalSettings));
    console.log("Settings reset to original");
  }, [originalSettings]);

  const saveCurrentSettingsAsOriginal = useCallback(() => {
    setOriginalSettings([...warningSettings]);
    console.log("Current settings saved as original");
  }, [warningSettings]);

  useEffect(() => {
    localStorage.setItem("warningSettings", JSON.stringify(warningSettings));
  }, [warningSettings]);

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
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState(null);
  const [lastDataUpdate, setLastDataUpdate] = useState(Date.now());
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
  const [manualRefreshCount, setManualRefreshCount] = useState(0);

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

  const formatDuration = useCallback((ms) => {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds]
      .map((unit) => String(unit).padStart(2, "0"))
      .join(":");
  }, []);

  const timeToMinutes = useCallback((timeStr) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  }, []);

  const getCurrentWarningPeriod = useCallback(() => {
    if (!currentSchedule?.shiftTime) return null;

    const currentHours = currentTime.getHours();
    const currentMinutes = currentTime.getMinutes();
    const currentTotalMinutes = currentHours * 60 + currentMinutes;

    const activeWarning = activeWarningConfig.find((config) => {
      const configStart = timeToMinutes(config.start);
      const configEnd = timeToMinutes(config.end);
      if (configEnd < configStart) {
        return (
          currentTotalMinutes >= configStart || currentTotalMinutes <= configEnd
        );
      }

      return (
        currentTotalMinutes >= configStart && currentTotalMinutes <= configEnd
      );
    });

    return activeWarning ? activeWarning.reason : null;
  }, [currentSchedule, currentTime, activeWarningConfig, timeToMinutes]);

  const loadCurrentSchedule = useCallback(async (backgroundRefresh = false) => {
    if (backgroundRefresh) {
      setIsBackgroundRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);
    try {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTotalMinutes = currentHours * 60 + currentMinutes;
      const currentTimeStr = `${currentHours
        .toString()
        .padStart(2, "0")}:${currentMinutes.toString().padStart(2, "0")}`;

      // 1. Buat tanggal dalam format yang konsisten untuk perbandingan
      const today = now.toISOString().split("T")[0]; // Format: 2025-12-07

      // 2. Juga buat versi kemungkinan kemarin (untuk shift malam)
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      console.log(`[MONITORING] Checking at ${currentTimeStr}`);
      console.log(
        `[MONITORING] Today (client): ${today}, Yesterday: ${yesterdayStr}`
      );

      // Ambil semua schedule OnProgress
      const resp = await http(
        API.schedules.list({
          status: "OnProgress",
          limit: 100,
          page: 1,
        })
      );

      const items = resp?.items || [];
      console.log(`[MONITORING] Found ${items.length} OnProgress schedules`);

      let activeSchedule = null;

      for (const schedule of items) {
        console.log(`Checking schedule:`, {
          id: schedule.id,
          date: schedule.target_date,
          date_display: schedule.target_date_display, // Debug: lihat field baru
          today: today,
          shiftTime: schedule.shift_time,
          currentTime: currentTimeStr,
        });

        // 3. Gunakan target_date_display jika ada, jika tidak gunakan target_date
        const scheduleDateToCheck =
          schedule.target_date_display || schedule.target_date;

        // 4. Normalisasi tanggal schedule untuk perbandingan
        let scheduleDateNormalized;
        if (scheduleDateToCheck) {
          // Jika target_date sudah dalam format string ISO (dengan timezone)
          if (scheduleDateToCheck.includes("T")) {
            const dateObj = new Date(scheduleDateToCheck);
            scheduleDateNormalized = dateObj.toISOString().split("T")[0];
          } else {
            // Jika sudah dalam format YYYY-MM-DD
            scheduleDateNormalized = scheduleDateToCheck.split("T")[0];
          }
        }

        // 5. Cek apakah schedule untuk hari ini atau kemarin
        const isToday = scheduleDateNormalized === today;
        const isYesterday = scheduleDateNormalized === yesterdayStr;

        if (!isToday && !isYesterday) {
          console.log(`  Skipped: date mismatch (${scheduleDateNormalized})`);
          continue;
        }

        // 6. Cek apakah shift time-nya sedang berjalan
        if (!schedule.shift_time) {
          console.log(`  Skipped: no shift time`);
          continue;
        }

        const [startTime, endTime] = schedule.shift_time.split(" - ");
        if (!startTime || !endTime) {
          console.log(`  Skipped: invalid shift format`);
          continue;
        }

        // Convert time to minutes for comparison
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const [startHour, startMinute] = startTime.split(":").map(Number);
        const [endHour, endMinute] = endTime.split(":").map(Number);

        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;

        let isActive = false;

        // Shift normal (contoh: 08:00 - 16:00)
        if (endMinutes > startMinutes) {
          isActive =
            currentMinutes >= startMinutes && currentMinutes <= endMinutes;
        }
        // Shift malam (contoh: 22:00 - 06:00) - melewati midnight
        else {
          isActive =
            currentMinutes >= startMinutes || currentMinutes <= endMinutes;
        }

        console.log(
          `  Time check: ${currentMinutes} between ${startMinutes}-${endMinutes} = ${isActive}`
        );

        if (isActive) {
          activeSchedule = schedule;
          console.log(
            `  ✓ ACTIVE schedule found: ${schedule.id} (${scheduleDateNormalized})`
          );
          break;
        }
      }

      if (activeSchedule) {
        setCurrentSchedule({
          id: activeSchedule.id,
          date: activeSchedule.target_date,
          line: activeSchedule.line_code,
          shiftTime: activeSchedule.shift_time,
          total_input: activeSchedule.total_input || 0,
          total_customer: activeSchedule.total_customer || 0,
          total_model: activeSchedule.total_model || 0,
          total_pallet: activeSchedule.total_pallet || 0,
          createdBy:
            activeSchedule.created_by_name || activeSchedule.created_by || "-",
          status: activeSchedule.status || "OnProgress",
        });

        if (!backgroundRefresh) {
          try {
            const detailResp = await http(
              API.schedules.detail(activeSchedule.id)
            );
            setScheduleDetails(detailResp);
          } catch (detailErr) {
            console.warn(
              "[MONITORING] Failed to load schedule details:",
              detailErr
            );
            setScheduleDetails(null);
          }
        }
      } else {
        console.log("[MONITORING] No active schedule found");
        setCurrentSchedule(null);
        setScheduleDetails(null);
      }

      setLastDataUpdate(Date.now());
    } catch (err) {
      console.error("[MONITORING] Error loading schedule:", err);
      if (!backgroundRefresh) {
        setError(err.message || "Failed to load current schedule");
        setCurrentSchedule(null);
        setScheduleDetails(null);
      }
    } finally {
      if (backgroundRefresh) {
        setIsBackgroundRefreshing(false);
      } else {
        setLoading(false);
      }
      console.log("[MONITORING] loadCurrentSchedule completed");
    }
  }, []);

  const performBackgroundRefresh = useCallback(
    async (immediate = false) => {
      if (isBackgroundRefreshing) return;

      if (showDetailPopup || showSettingsPopup) {
        console.log("[MONITORING] Skipping refresh - popup is open");
        return;
      }

      try {
        console.log("[MONITORING] Performing background refresh");
        await loadCurrentSchedule(true);

        // Jika immediate refresh, juga panggil auto-complete
        if (immediate) {
          try {
            await http("/api/production-schedules/auto-complete", {
              method: "PATCH",
            });
          } catch (err) {
            console.log("[IMMEDIATE AUTO-COMPLETE] Error:", err.message);
          }
        }
      } catch (err) {
        console.log("[MONITORING] Background refresh failed:", err.message);
      }
    },
    [
      isBackgroundRefreshing,
      loadCurrentSchedule,
      showDetailPopup,
      showSettingsPopup,
    ]
  );

  const autoCheckAndRefresh = useCallback(async () => {
    try {
      const now = timerService.getCurrentTime();
      const currentTimeStr = now.toLocaleTimeString();

      try {
        await http("/api/production-schedules/auto-complete", {
          method: "PATCH",
        });
      } catch (completeErr) {}

      const timeSinceLastUpdate = Date.now() - lastDataUpdate;
      if (timeSinceLastUpdate > 5000) {
        console.log(
          `[MONITORING-REFRESH] Performing transparent refresh at ${currentTimeStr}`
        );
        performBackgroundRefresh();
      }
    } catch (err) {
      console.log(
        "[MONITORING-REFRESH] Error in background process:",
        err.message
      );
    }
  }, [performBackgroundRefresh, lastDataUpdate]);

  useEffect(() => {
    console.log("[MONITORING] Current schedule state:", {
      loading,
      hasSchedule: !!currentSchedule,
      schedule: currentSchedule,
      detailsCount: scheduleDetails?.details?.length,
      currentTime: new Date().toLocaleTimeString(),
    });
  }, [currentSchedule, scheduleDetails, loading]);

  const calculateShiftTimes = useCallback(() => {
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

    let shiftStartTime;
    let shiftEndTime;

    if (currentSchedule.date) {
      const scheduleDate = new Date(currentSchedule.date);
      shiftStartTime = new Date(scheduleDate);
      shiftEndTime = new Date(scheduleDate);

      shiftStartTime.setHours(startHours, startMinutes, 0, 0);
      shiftEndTime.setHours(endHours, endMinutes, 0, 0);

      if (shiftEndTime <= shiftStartTime) {
        shiftEndTime.setDate(shiftEndTime.getDate() + 1);
      }
    } else {
      shiftStartTime = new Date(currentTime);
      shiftStartTime.setHours(startHours, startMinutes, 0, 0);

      shiftEndTime = new Date(currentTime);
      shiftEndTime.setHours(endHours, endMinutes, 0, 0);

      if (shiftEndTime <= shiftStartTime) {
        shiftEndTime.setDate(shiftEndTime.getDate() + 1);
      }
    }

    const totalShiftDuration =
      shiftEndTime.getTime() - shiftStartTime.getTime();
    const elapsedShiftTime = currentTime.getTime() - shiftStartTime.getTime();
    const remainingShiftTime = shiftEndTime.getTime() - currentTime.getTime();

    return {
      totalShiftDuration: Math.max(0, totalShiftDuration),
      elapsedShiftTime: Math.max(
        0,
        Math.min(elapsedShiftTime, totalShiftDuration)
      ),
      remainingShiftTime: Math.max(0, remainingShiftTime),
    };
  }, [currentSchedule, currentTime]);

  const { remainingShiftTime } = calculateShiftTimes();
  const currentWarningReason = getCurrentWarningPeriod();
  const isWarning = !!currentWarningReason;
  const firstCustomer = scheduleDetails?.details?.[0];

  // 1. useEffect untuk inisialisasi
  useEffect(() => {
    console.log("[MONITORING] Initializing...");

    const unsubscribe = timerService.subscribe((newTime) => {
      setCurrentTime(newTime);
    });

    loadCurrentSchedule();

    // Refresh setiap 5 detik UNTUK DATA SAJA (bukan auto-complete)
    const refreshInterval = setInterval(() => {
      console.log("[MONITORING] 5-second background refresh");
      performBackgroundRefresh();
    }, 5000);

    // SETIAP DETIK, CEK APAKAH SHIFT SUDAH BERAKHIR
    const preciseCheckInterval = setInterval(() => {
      const now = new Date();

      if (currentSchedule?.shiftTime) {
        const [startTime, endTime] = currentSchedule.shiftTime.split(" - ");
        const [endHours, endMinutes] = endTime.split(":").map(Number);

        // Buat waktu end yang tepat
        const endDateTime = new Date();
        endDateTime.setHours(endHours, endMinutes, 0, 0);

        // Jika sekarang >= end time, panggil auto-complete
        if (now >= endDateTime) {
          console.log(
            `[PRECISE CHECK] Shift ended! Calling auto-complete at ${now.toLocaleTimeString()}`
          );

          http("/api/production-schedules/auto-complete", {
            method: "PATCH",
          })
            .then((data) => {
              if (data?.completed > 0) {
                console.log(
                  `[PRECISE CHECK] Completed ${data.completed} schedules`
                );
                // Refresh data
                loadCurrentSchedule();
              }
            })
            .catch((err) => {
              console.log("[PRECISE CHECK] Error:", err.message);
            });
        }
      }
    }, 1000); // Check setiap detik

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log("[MONITORING] Page became visible, refreshing...");
        setTimeout(() => {
          loadCurrentSchedule();
        }, 500);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      unsubscribe();
      clearInterval(refreshInterval);
      clearInterval(preciseCheckInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadCurrentSchedule, performBackgroundRefresh, currentSchedule]);

  // 2. useEffect untuk immediate check saat remaining time <= 0
  useEffect(() => {
    if (currentSchedule && remainingShiftTime <= 0 && !isBackgroundRefreshing) {
      console.log(
        "[IMMEDIATE CHECK] Remaining time is 0, calling auto-complete"
      );

      // Tambahkan timeout kecil untuk memastikan waktunya tepat
      setTimeout(() => {
        http("/api/production-schedules/auto-complete", {
          method: "PATCH",
        })
          .then((data) => {
            if (data?.completed > 0) {
              console.log(
                `[IMMEDIATE CHECK] Completed ${data.completed} schedules`
              );
              loadCurrentSchedule();
            }
          })
          .catch((err) => {
            console.log("[IMMEDIATE CHECK] Error:", err.message);
          });
      }, 100); // 100ms delay untuk memastikan waktunya tepat
    }
  }, [
    remainingShiftTime,
    currentSchedule,
    loadCurrentSchedule,
    isBackgroundRefreshing,
  ]);

  // useEffect untuk auto-complete presisi
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;

      if (currentSchedule?.shiftTime) {
        const [_, endTime] = currentSchedule.shiftTime.split(" - ");

        // Jika waktu saat ini >= end time, panggil auto-complete
        if (currentTime >= endTime) {
          console.log(
            `[PRECISE AUTO-COMPLETE] ${currentTime} >= ${endTime}, calling API`
          );

          http("/api/production-schedules/auto-complete", {
            method: "PATCH",
          })
            .then((data) => {
              if (data?.completed > 0) {
                console.log(`Completed ${data.completed} schedules`);
                loadCurrentSchedule(); // Refresh data
              }
            })
            .catch((err) => console.log("Auto-complete error:", err.message));
        }
      }
    }, 100); // Check setiap detik

    return () => clearInterval(interval);
  }, [currentSchedule, loadCurrentSchedule]);

  const formatDateDisplay = useCallback((dateString) => {
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
  }, []);

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
        setSaveStatus(null);
      }, 5000);
    } else {
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleOpenSettingsPopup = () => {
    saveCurrentSettingsAsOriginal();
    setShowSettingsPopup(true);
    console.log("[MONITORING] Settings popup opened, pausing auto-refresh");
  };

  const handleCancelSettings = () => {
    resetToOriginalSettings();
    setShowSettingsPopup(false);
    setSaveStatus(null);
    console.log("[MONITORING] Settings popup closed, resuming auto-refresh");
  };

  useEffect(() => {
    loadWarningSettings();
  }, [loadWarningSettings]);

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

  useEffect(() => {
    if (currentSchedule?.id && !isBackgroundRefreshing) {
      const loadDetails = async () => {
        try {
          const detailResp = await http(
            API.schedules.detail(currentSchedule.id)
          );
          setScheduleDetails(detailResp);
        } catch (err) {
          console.warn("[MONITORING] Failed to refresh schedule details:", err);
        }
      };

      loadDetails();
    }
  }, [currentSchedule, isBackgroundRefreshing]);

  useEffect(() => {
    console.log("[MONITORING] Current schedule state:", {
      loading,
      hasSchedule: !!currentSchedule,
      schedule: currentSchedule,
      detailsCount: scheduleDetails?.details?.length,
      currentTime: new Date().toLocaleTimeString(),
      lastUpdate: new Date(lastDataUpdate).toLocaleTimeString(),
      isBackgroundRefreshing,
    });
  }, [
    currentSchedule,
    scheduleDetails,
    loading,
    lastDataUpdate,
    isBackgroundRefreshing,
  ]);

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

  const handleManualRefresh = useCallback(() => {
    console.log(
      `[MANUAL REFRESH] Triggered at ${new Date().toLocaleTimeString()}`
    );
    loadCurrentSchedule();
    setManualRefreshCount((prev) => prev + 1);
  }, [loadCurrentSchedule]);

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
    metricValueWarning: {
      fontSize: "28px",
      fontWeight: "800",
      color: "#dc2626",
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
  };
  const PAGE_SIZE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  const parts = Array.from({ length: 30 }, (_, i) => {
    const usageOptions = [1, 2, 4, 8];
    const usagePerUnit = usageOptions[i % usageOptions.length];
    const coverageOptions = [75, 110, 180, 60, 95, 140, 155, 200];
    const coverage = coverageOptions[i % coverageOptions.length];
    const m1a1 = coverage * usagePerUnit;
    const m136 = Math.max(0, Math.floor(m1a1 * 0.3));

    return {
      code: `PART-${String(i + 1).padStart(3, "0")}`,
      name: `Dummy Part ${i + 1}`,
      type: i % 2 === 0 ? "REGULER" : "SPECIAL PART",
      vendorType: i % 2 === 0 ? "LOCAL" : "OVERSEA",
      vendorName: i % 2 === 0 ? "PT EXAMPLE SUPPLIER" : "ACME GLOBAL",
      m1a1,
      m136,
      usagePerUnit,
    };
  });

  const totalPages = Math.max(1, Math.ceil(parts.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pagedParts = parts.slice(startIndex, startIndex + PAGE_SIZE);

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

  return (
    <div style={styles.pageContainer}>
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
            zIndex: 2000,
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          }}
        >
          {toastMessage}
        </div>
      )}

      <div style={styles.welcomeCard}>
        <div style={styles.dailyProductionCard}>
          <div style={styles.cardHeader}>Production Monitoring</div>
          <div style={styles.metricBoxesWrapper}>
            <div style={styles.metricBox}>
              <span style={styles.metricLabel}>Daily Input Target</span>
              <span style={styles.metricValueLarge}>
                {currentSchedule?.total_input || 0}
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
                style={isWarning ? styles.timerValueWarning : styles.timerValue}
              >
                {currentSchedule
                  ? formatDuration(remainingShiftTime)
                  : "00:00:00"}
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
                opacity: currentSchedule ? 1 : 0.5,
                cursor: currentSchedule ? "pointer" : "not-allowed",
              }}
              onClick={() => currentSchedule && setShowDetailPopup(true)}
              onMouseEnter={() => setIsDetailHovered(true)}
              onMouseLeave={() => setIsDetailHovered(false)}
              title={
                currentSchedule
                  ? "View Schedule Details"
                  : "No schedule available"
              }
              disabled={!currentSchedule}
            >
              <Eye size={12} />
              Details
            </button>

            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Shift Time</span>
              <span style={styles.infoColon}>:</span>
              <span style={styles.infoValue}>
                {currentSchedule?.shiftTime || "-"}
              </span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Shift Status</span>
              <span style={styles.infoColon}>:</span>
              <span style={styles.infoValue}>
                {currentSchedule
                  ? remainingShiftTime > 0
                    ? "In Progress"
                    : "Completed"
                  : "-"}
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
                {firstCustomer?.material_code || "-"}
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
                {currentSchedule
                  ? formatDateDisplay(currentSchedule.date)
                  : "-"}
              </span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Line</span>
              <span style={styles.infoColon}>:</span>
              <span style={styles.infoValue}>
                {currentSchedule?.line || "-"}
              </span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Created By</span>
              <span style={styles.infoColon}>:</span>
              <span style={styles.infoValue}>
                {currentSchedule?.createdBy || "-"}
              </span>
            </div>
            {firstCustomer?.poNumber && (
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>PO Number</span>
                <span style={styles.infoColon}>:</span>
                <span style={styles.infoValue}>{firstCustomer.poNumber}</span>
              </div>
            )}
            {firstCustomer?.palletType && (
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Pallet Type</span>
                <span style={styles.infoColon}>:</span>
                <span style={styles.infoValue}>{firstCustomer.palletType}</span>
              </div>
            )}
          </div>
        </div>

        {showDetailPopup && (
          <div style={styles.popupOverlay}>
            <div style={styles.popupContainer}>
              <div style={styles.popupHeader}>
                <h3 style={styles.popupTitle}>
                  {currentSchedule ? "Schedule Details" : "No Active Schedule"}
                </h3>
                <button
                  style={styles.closeButton}
                  onClick={() => setShowDetailPopup(false)}
                >
                  ×
                </button>
              </div>

              <div style={styles.popupContent}>
                {currentSchedule ? (
                  <>
                    <div style={styles.popupSection}>
                      <h4 style={styles.popupSectionTitle}>
                        Schedule Information
                      </h4>
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
                        <span style={styles.popupInfoLabel}>
                          Total Customer:
                        </span>
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
                                    {detail.customer || "-"}
                                  </td>
                                  <td style={styles.detailsTd}>
                                    {detail.material_code || "-"}
                                  </td>
                                  <td style={styles.detailsTd}>
                                    {detail.model || "-"}
                                  </td>
                                  <td style={styles.detailsTd}>
                                    {detail.input || 0}
                                  </td>
                                  <td style={styles.detailsTd}>
                                    {detail.po_number || "-"}
                                  </td>
                                  <td style={styles.detailsTd}>
                                    {detail.pallet_type || "-"}
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
                  </>
                ) : (
                  <div style={styles.noScheduleMessage}>
                    <p>No active schedule is currently running.</p>
                    <p>
                      Please check the OnProgress tab in Target Schedule page.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Settings Popup */}
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

        {/* Search Bar */}
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
          {[
            "all",
            "subCr",
            "tpu1",
            "tpu2",
            "cr1",
            "cr2",
            "cradj",
            "m1",
            "m2",
            "ft",
            "acc",
            "packing",
          ].map((tab) => (
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
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Parts Table */}
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
                  <th style={styles.thWithLeftBorder}>No</th>
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
                        ...styles.tdWithLeftBorder,
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
