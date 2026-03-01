"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Plus,
  Trash2,
  Eye,
  Settings,
  SlidersHorizontal,
  AlertTriangle,
} from "lucide-react";
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
      if (Array.isArray(data)) {
        setWarningSettings(data);
        setOriginalSettings(data);
      }
    } catch (err) {
      setError("Failed to load settings from server");
    } finally {
      setLoading(false);
    }
  }, []);

  const updateWarningSetting = useCallback((id, field, value) => {
    setWarningSettings((prev) =>
      prev.map((setting) =>
        setting.id === id ? { ...setting, [field]: value } : setting,
      ),
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
        setting.id === id ? { ...setting, markedForDeletion: true } : setting,
      );
    });
  }, []);

  const restoreWarningSetting = useCallback((id) => {
    setWarningSettings((prev) =>
      prev.map((setting) =>
        setting.id === id ? { ...setting, markedForDeletion: false } : setting,
      ),
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
        const cleanedSettings = result.settings.map(
          ({ isNew, markedForDeletion, ...s }) => s,
        );
        setWarningSettings(cleanedSettings);
        setOriginalSettings(cleanedSettings);
      }
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
  }, [originalSettings]);

  const saveCurrentSettingsAsOriginal = useCallback(() => {
    setOriginalSettings([...warningSettings]);
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
  const partsRefreshTimerRef = useRef(null);

  // ── Shortage state ────────────────────────────────────────
  const [targetUnits, setTargetUnits] = useState(() => {
    const s = localStorage.getItem("pm_target_units");
    return s ? parseInt(s) || 0 : 0;
  });
  const [targetUnitsInput, setTargetUnitsInput] = useState("");
  const [showShortagePopup, setShowShortagePopup] = useState(false);
  const [shortageThresholds, setShortageThresholds] = useState(() => {
    const s = localStorage.getItem("pm_shortage_thresholds");
    return s ? JSON.parse(s) : { green: 50, yellow: 30, red: 10 };
  });
  const [thresholdInput, setThresholdInput] = useState({
    green: 50,
    yellow: 30,
    red: 10,
  });
  const currentScheduleRef = useRef(null);
  const isBackgroundRefreshingRef = useRef(false);
  const showDetailPopupRef = useRef(false);
  const showSettingsPopupRef = useRef(false);
  const shiftEndTriggeredRef = useRef(false);
  const fetchPartsRef = useRef(null);

  // Sync refs — agar interval tidak perlu di-recreate setiap render
  useEffect(() => {
    currentScheduleRef.current = currentSchedule;
  }, [currentSchedule]);
  useEffect(() => {
    showDetailPopupRef.current = showDetailPopup;
  }, [showDetailPopup]);
  useEffect(() => {
    showSettingsPopupRef.current = showSettingsPopup;
  }, [showSettingsPopup]);
  useEffect(() => {
    isBackgroundRefreshingRef.current = isBackgroundRefreshing;
  }, [isBackgroundRefreshing]);

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
    (setting) => setting.enabled,
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

      const toLocalYMD = (d) => {
        const y = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${mo}-${day}`;
      };
      const today = toLocalYMD(now);

      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = toLocalYMD(yesterday);

      const resp = await http(
        API.schedules.list({
          status: "OnProgress",
          limit: 100,
          page: 1,
        }),
      );

      const items = resp?.items || [];

      let activeSchedule = null;

      for (const schedule of items) {
        // 3. Gunakan target_date_display jika ada, jika tidak gunakan target_date
        const scheduleDateToCheck =
          schedule.target_date_display || schedule.target_date;

        // 4. Normalisasi tanggal schedule untuk perbandingan
        let scheduleDateNormalized;
        if (scheduleDateToCheck) {
          // Jika target_date sudah dalam format string ISO (dengan timezone)
          scheduleDateNormalized = toLocalYMD(new Date(scheduleDateToCheck));
        }

        // 5. Cek apakah schedule untuk hari ini atau kemarin
        const isToday = scheduleDateNormalized === today;
        const isYesterday = scheduleDateNormalized === yesterdayStr;

        if (!isToday && !isYesterday) {
          continue;
        }

        // 6. Cek apakah shift time-nya sedang berjalan
        if (!schedule.shift_time) {
          continue;
        }

        const [startTime, endTime] = schedule.shift_time.split(" - ");
        if (!startTime || !endTime) {
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

        if (isActive) {
          activeSchedule = schedule;

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
          actual_input: activeSchedule.actual_input || 0,
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
              API.schedules.detail(activeSchedule.id),
            );
            setScheduleDetails(detailResp);
          } catch (detailErr) {
            console.warn(
              "[MONITORING] Failed to load schedule details:",
              detailErr,
            );
            setScheduleDetails(null);
          }
        }
      } else {
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
    }
  }, []);

  const performBackgroundRefresh = useCallback(
    async (immediate = false) => {
      if (isBackgroundRefreshingRef.current) return;
      if (showDetailPopupRef.current || showSettingsPopupRef.current) return;
      try {
        await loadCurrentSchedule(true);
        if (immediate) {
          await http("/api/production-schedules/auto-complete", {
            method: "PATCH",
          }).catch(() => {});
        }
      } catch (err) {}
    },
    [loadCurrentSchedule],
  );

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
        Math.min(elapsedShiftTime, totalShiftDuration),
      ),
      remainingShiftTime: Math.max(0, remainingShiftTime),
    };
  }, [currentSchedule, currentTime]);

  // ── Expected Output Calculation ─────────────────────────────
  // Menghitung berapa unit seharusnya sudah diproduksi sampai saat ini,
  // dengan memperhitungkan waktu istirahat (warning periods).
  const calculateCurrentTarget = useCallback(() => {
    if (!currentSchedule?.shiftTime || !currentSchedule?.total_input) return 0;

    const [startStr, endStr] = currentSchedule.shiftTime.split(" - ");
    if (!startStr || !endStr) return 0;

    const [startH, startM] = startStr.split(":").map(Number);
    const [endH, endM] = endStr.split(":").map(Number);

    const shiftStartMins = startH * 60 + startM;
    let shiftEndMins = endH * 60 + endM;
    if (shiftEndMins <= shiftStartMins) shiftEndMins += 24 * 60; // overnight

    const shiftDuration = shiftEndMins - shiftStartMins;

    // Total break minutes within shift hours
    let totalBreakMins = 0;
    for (const ws of activeWarningConfig) {
      const [wsH, wsM] = ws.start.split(":").map(Number);
      const [weH, weM] = ws.end.split(":").map(Number);
      const wsStart = wsH * 60 + wsM;
      let wsEnd = weH * 60 + weM;
      if (wsEnd <= wsStart) wsEnd += 24 * 60;
      const overlapStart = Math.max(wsStart, shiftStartMins);
      const overlapEnd = Math.min(wsEnd, shiftEndMins);
      if (overlapEnd > overlapStart)
        totalBreakMins += overlapEnd - overlapStart;
    }

    const effectiveWorkMins = Math.max(1, shiftDuration - totalBreakMins);

    // Elapsed minutes since shift start (capped at shift duration)
    const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();
    let elapsed = nowMins - shiftStartMins;
    if (elapsed < 0) elapsed += 24 * 60;
    elapsed = Math.min(elapsed, shiftDuration);

    // How many break minutes have already passed within elapsed time
    let elapsedBreakMins = 0;
    for (const ws of activeWarningConfig) {
      const [wsH, wsM] = ws.start.split(":").map(Number);
      const [weH, weM] = ws.end.split(":").map(Number);
      const wsStart = wsH * 60 + wsM;
      let wsEnd = weH * 60 + weM;
      if (wsEnd <= wsStart) wsEnd += 24 * 60;
      const overlapStart = Math.max(wsStart, shiftStartMins);
      const overlapEnd = Math.min(wsEnd, shiftEndMins);
      if (overlapEnd <= overlapStart) continue;
      const relStart = overlapStart - shiftStartMins;
      const relEnd = overlapEnd - shiftStartMins;
      const passedEnd = Math.min(relEnd, elapsed);
      if (passedEnd > relStart) elapsedBreakMins += passedEnd - relStart;
    }

    const elapsedProductiveMins = Math.max(0, elapsed - elapsedBreakMins);
    const ratio = elapsedProductiveMins / effectiveWorkMins;
    return Math.min(
      Math.floor(ratio * currentSchedule.total_input),
      currentSchedule.total_input,
    );
  }, [currentSchedule, currentTime, activeWarningConfig]);

  const expectedOutput = calculateCurrentTarget();

  const { remainingShiftTime } = calculateShiftTimes();
  const currentWarningReason = getCurrentWarningPeriod();
  const isWarning = !!currentWarningReason;
  // currentCustomer: berdasarkan unit BERIKUTNYA yang akan diapprove
  // actual_input=21 (EHC 21 unit habis) → checkUnit=22 → langsung tampil EAL
  const currentCustomer = useMemo(() => {
    const details = scheduleDetails?.details;
    if (!details || details.length === 0) return null;
    const actualInput = currentSchedule?.actual_input || 0;
    // Gunakan unit berikutnya — kalau sudah semua approve, tetap tunjukkan customer terakhir
    const checkUnit = actualInput + 1;
    let cumulative = 0;
    for (const d of details) {
      cumulative += Number(d.input || 0);
      if (checkUnit <= cumulative) return d;
    }
    // Semua unit sudah approve → tunjukkan customer terakhir
    return details[details.length - 1];
  }, [scheduleDetails, currentSchedule]);

  // 1. useEffect untuk inisialisasi
  useEffect(() => {
    const unsubscribe = timerService.subscribe((newTime) => {
      setCurrentTime(newTime);
    });

    loadCurrentSchedule();

    // Refresh setiap 30 detik — ringan, cukup untuk data real-time
    const refreshInterval = setInterval(() => {
      performBackgroundRefresh();
    }, 30000);

    // Setiap detik, cek shift end — gunakan ref agar tidak perlu re-create
    const preciseCheckInterval = setInterval(() => {
      const sched = currentScheduleRef.current;
      if (!sched?.shiftTime) return;
      const now = new Date();
      const [, endTime] = sched.shiftTime.split(" - ");
      if (!endTime) return;
      const [endHours, endMinutes] = endTime.split(":").map(Number);
      const endDateTime = new Date();
      endDateTime.setHours(endHours, endMinutes, 0, 0);
      if (now >= endDateTime) {
        http("/api/production-schedules/auto-complete", { method: "PATCH" })
          .then((data) => {
            if (data?.completed > 0) loadCurrentSchedule();
          })
          .catch(() => {});
      }
    }, 1000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setTimeout(() => {
          loadCurrentSchedule();
          if (fetchPartsRef.current) fetchPartsRef.current(true);
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
  }, [loadCurrentSchedule, performBackgroundRefresh]);
  // currentSchedule tidak ada di deps — akses via currentScheduleRef di dalam interval

  // 2. shift berakhir → trigger SEKALI (bukan tiap detik!)
  useEffect(() => {
    if (
      currentSchedule &&
      remainingShiftTime <= 0 &&
      !isBackgroundRefreshingRef.current
    ) {
      if (!shiftEndTriggeredRef.current) {
        shiftEndTriggeredRef.current = true;
        setTimeout(() => {
          http("/api/production-schedules/auto-complete", { method: "PATCH" })
            .then((data) => {
              if (data?.completed > 0) loadCurrentSchedule();
            })
            .catch(() => {});
        }, 200);
      }
    } else if (currentSchedule && remainingShiftTime > 0) {
      shiftEndTriggeredRef.current = false;
    }
  }, [remainingShiftTime, currentSchedule, loadCurrentSchedule]);

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
  };

  const handleCancelSettings = () => {
    resetToOriginalSettings();
    setShowSettingsPopup(false);
    setSaveStatus(null);
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
            API.schedules.detail(currentSchedule.id),
          );
          setScheduleDetails(detailResp);
        } catch (err) {
          console.warn("[MONITORING] Failed to refresh schedule details:", err);
        }
      };

      loadDetails();
    }
  }, [currentSchedule, isBackgroundRefreshing]);

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
    loadCurrentSchedule();
    if (fetchPartsRef.current) fetchPartsRef.current(true);
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

  // Reset page saat ganti tab
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

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
      border: "1px solid #9fa8da",
      padding: "6px 8px",
      backgroundColor: "#e0e7ff",
      textAlign: "left",
      fontWeight: "600",
      color: "#374151",
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
  // ── Parts state ──────────────────────────────────────────────
  const [parts, setParts] = useState([]);
  const [partsLoading, setPartsLoading] = useState(false);

  const fetchParts = useCallback(async (silent = false) => {
    if (!silent) setPartsLoading(true);
    try {
      const data = await http(`/api/kanban-master/with-details`);
      if (data?.success && Array.isArray(data.data)) {
        const mapped = data.data.map((p) => ({
          id: p.id,
          code: p.part_code || "",
          name: p.part_name || "",
          type: p.part_types || "-",
          vendorType: p.vendor_type || "-",
          vendorName: p.vendor_name || "-",
          assembly_station: p.assembly_station || null,
          qty_per_assembly: p.qty_per_assembly || 1,
          m101: p.stock_m101 ?? 0,
          m136: p.stock_m136 ?? 0,
          usagePerUnit: p.qty_per_assembly || 1,
        }));
        setParts(mapped);
      }
    } catch (err) {
      // silent — halaman tetap bisa dipakai meski parts gagal fetch
    } finally {
      if (!silent) setPartsLoading(false);
    }
  }, []);

  // Sync fetchPartsRef + initial load + auto-refresh stock setiap 60 detik
  useEffect(() => {
    fetchPartsRef.current = fetchParts;
  }, [fetchParts]);

  useEffect(() => {
    fetchParts();
    partsRefreshTimerRef.current = setInterval(() => {
      if (fetchPartsRef.current) fetchPartsRef.current(true);
    }, 60000);
    return () => clearInterval(partsRefreshTimerRef.current);
  }, [fetchParts]);

  // ── Search state ─────────────────────────────────────────────
  const [searchBy, setSearchBy] = useState("Part Code");
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [appliedSearchBy, setAppliedSearchBy] = useState("Part Code");

  const handleSearch = () => {
    setAppliedKeyword(keyword.trim());
    setAppliedSearchBy(searchBy);
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setKeyword("");
    setAppliedKeyword("");
    setCurrentPage(1);
  };

  // ── Shortage helpers ─────────────────────────────────────────
  const getRequiredQty = (qtyPerAssembly) =>
    targetUnits * (qtyPerAssembly || 1);

  const getSurplus = (stock, qtyPerAssembly) => {
    if (!targetUnits) return Infinity; // no target set → no shortage
    return stock - getRequiredQty(qtyPerAssembly);
  };

  const getStockColor = (stock, qtyPerAssembly) => {
    const surplus = getSurplus(stock, qtyPerAssembly);
    if (surplus === Infinity) return "#16a34a";
    if (surplus > shortageThresholds.green) return "#16a34a";
    if (surplus > shortageThresholds.yellow) return "#ca8a04";
    return "#dc2626";
  };

  const getShortageStatus = (m101, m136, qtyPerAssembly) => {
    const s101 = getSurplus(m101, qtyPerAssembly);
    const s136 = getSurplus(m136, qtyPerAssembly);
    const worst = Math.min(s101, s136);
    if (worst === Infinity) return null;
    if (worst > shortageThresholds.green) return "OK";
    if (worst > shortageThresholds.yellow) return "Warning";
    return "Shortage";
  };

  const getSortScore = (p) => {
    if (!targetUnits) return 0;
    const s101 = getSurplus(p.m101, p.qty_per_assembly);
    const s136 = getSurplus(p.m136, p.qty_per_assembly);
    return Math.min(s101, s136); // lowest surplus first
  };

  // ── Filtered parts (tab + search) ────────────────────────────
  const filteredParts = parts.filter((p) => {
    // Tab filter
    if (activeTab !== "all" && p.assembly_station !== activeTab) return false;
    // Search filter
    if (!appliedKeyword) return true;
    const kw = appliedKeyword.toLowerCase();
    switch (appliedSearchBy) {
      case "Part Code":
        return p.code.toLowerCase().includes(kw);
      case "Part Name":
        return p.name.toLowerCase().includes(kw);
      case "Vendor":
        return p.vendorName.toLowerCase().includes(kw);
      case "Part Type":
        return p.type.toLowerCase().includes(kw);
      case "Vendor Type":
        return p.vendorType.toLowerCase().includes(kw);
      default:
        return true;
    }
  });

  // Sort: parts with most critical shortage go to top
  const sortedFilteredParts =
    targetUnits > 0
      ? [...filteredParts].sort((a, b) => getSortScore(a) - getSortScore(b))
      : filteredParts;

  // ── Pagination ───────────────────────────────────────────────
  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(
    1,
    Math.ceil(sortedFilteredParts.length / PAGE_SIZE),
  );
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pagedParts = sortedFilteredParts.slice(
    startIndex,
    startIndex + PAGE_SIZE,
  );

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
              <span style={styles.metricLabel}>Actual Output</span>
              <span
                style={{
                  ...styles.metricValueLarge,
                  color: currentSchedule
                    ? currentSchedule.actual_input >=
                      (currentSchedule.total_input || 0)
                      ? "#16a34a"
                      : currentSchedule.actual_input > 0
                        ? "#2563eb"
                        : "#9ca3af"
                    : "#2563eb",
                }}
              >
                {currentSchedule ? currentSchedule.actual_input || 0 : 0}
              </span>
              {currentSchedule && (
                <span
                  style={{
                    fontSize: "10px",
                    color: "#6b7280",
                    marginTop: "4px",
                  }}
                >
                  of {currentSchedule.total_input} units
                </span>
              )}
            </div>
            <div style={styles.metricBox}>
              <span style={styles.metricLabel}>Expected Output</span>
              <span
                style={{
                  ...styles.metricValueLarge,
                  color: currentSchedule
                    ? expectedOutput >= (currentSchedule?.total_input || 0)
                      ? "#16a34a"
                      : "#2563eb"
                    : "#2563eb",
                }}
              >
                {currentSchedule ? expectedOutput : 0}
              </span>
              {currentSchedule && (
                <span
                  style={{
                    fontSize: "10px",
                    color: "#6b7280",
                    marginTop: "4px",
                  }}
                >
                  of {currentSchedule.total_input} units
                </span>
              )}
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
                {currentCustomer?.customer || "-"}
              </span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Product Code</span>
              <span style={styles.infoColon}>:</span>
              <span style={styles.infoValue}>
                {currentCustomer?.material_code || "-"}
              </span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Model</span>
              <span style={styles.infoColon}>:</span>
              <span style={styles.infoValue}>
                {currentCustomer?.model || "-"}
              </span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Description</span>
              <span style={styles.infoColon}>:</span>
              <span style={styles.infoValue}>
                {currentCustomer?.description || "-"}
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
            {currentCustomer?.poNumber && (
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>PO Number</span>
                <span style={styles.infoColon}>:</span>
                <span style={styles.infoValue}>{currentCustomer.poNumber}</span>
              </div>
            )}
            {currentCustomer?.palletType && (
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Pallet Type</span>
                <span style={styles.infoColon}>:</span>
                <span style={styles.infoValue}>{currentCustomer.palletType}</span>
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
                                    e.target.checked,
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
                                    e.target.value,
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
                                    e.target.value,
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
                                    e.target.value,
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
            <h1 style={styles.title}>Parts List</h1>
            <span style={{ fontSize: "11px", color: "#6b7280" }}>
              {partsLoading
                ? "Loading..."
                : `${sortedFilteredParts.length} parts`}
              {appliedKeyword && (
                <span style={{ marginLeft: "6px", color: "#2563eb" }}>
                  — filtered by "{appliedKeyword}"
                </span>
              )}
            </span>
          </div>

          <div style={styles.filterRow}>
            <div style={styles.inputGroup}>
              <span style={styles.label}>Search By</span>
              <select
                style={styles.select}
                value={searchBy}
                onChange={(e) => setSearchBy(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              >
                <option value="Part Code" style={optionStyle}>
                  Part Code
                </option>
                <option value="Part Name" style={optionStyle}>
                  Part Name
                </option>
                <option value="Vendor" style={optionStyle}>
                  Vendor
                </option>
                <option value="Part Type" style={optionStyle}>
                  Part Type
                </option>
                <option value="Vendor Type" style={optionStyle}>
                  Vendor Type
                </option>
              </select>
              <input
                type="text"
                style={styles.input}
                placeholder={`Search ${searchBy}...`}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
              <button
                style={{ ...styles.button, ...styles.searchButton }}
                onClick={handleSearch}
                onMouseEnter={(e) => handleButtonHover(e, true, "search")}
                onMouseLeave={(e) => handleButtonHover(e, false, "search")}
              >
                Search
              </button>
              {appliedKeyword && (
                <button
                  style={{
                    ...styles.button,
                    backgroundColor: "#f3f4f6",
                    color: "#374151",
                    border: "1px solid #d1d5db",
                  }}
                  onClick={handleClearSearch}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Shortage Controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
            padding: "10px 14px",
            backgroundColor: "white",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertTriangle
              size={15}
              color={targetUnits > 0 ? "#ca8a04" : "#9ca3af"}
            />
            <span
              style={{ fontSize: "12px", fontWeight: "600", color: "#374151" }}
            >
              Shortage Monitor
            </span>
            <span style={{ fontSize: "11px", color: "#6b7280" }}>
              Target Units:
            </span>
            <input
              type="number"
              min="0"
              placeholder="e.g. 150"
              value={targetUnitsInput}
              onChange={(e) => setTargetUnitsInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const v = parseInt(targetUnitsInput);
                  if (!isNaN(v) && v >= 0) {
                    setTargetUnits(v);
                    localStorage.setItem("pm_target_units", String(v));
                    setCurrentPage(1);
                  }
                }
              }}
              style={{
                width: "80px",
                height: "28px",
                border: "1px solid #9fa8da",
                borderRadius: "4px",
                padding: "0 8px",
                fontSize: "12px",
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={() => {
                const v = parseInt(targetUnitsInput);
                if (!isNaN(v) && v >= 0) {
                  setTargetUnits(v);
                  localStorage.setItem("pm_target_units", String(v));
                  setCurrentPage(1);
                }
              }}
              style={{
                height: "28px",
                padding: "0 12px",
                backgroundColor: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "11px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Set
            </button>
            {targetUnits > 0 && (
              <>
                <span
                  style={{
                    fontSize: "11px",
                    backgroundColor: "#e0e7ff",
                    color: "#2563eb",
                    padding: "2px 8px",
                    borderRadius: "10px",
                    fontWeight: "600",
                  }}
                >
                  Active: {targetUnits} units
                </span>
                <button
                  onClick={() => {
                    setTargetUnits(0);
                    setTargetUnitsInput("");
                    localStorage.setItem("pm_target_units", "0");
                  }}
                  style={{
                    height: "24px",
                    padding: "0 8px",
                    backgroundColor: "#f3f4f6",
                    color: "#6b7280",
                    border: "1px solid #d1d5db",
                    borderRadius: "4px",
                    fontSize: "11px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Clear
                </button>
              </>
            )}
          </div>
          <button
            onClick={() => {
              setThresholdInput({ ...shortageThresholds });
              setShowShortagePopup(true);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              height: "28px",
              padding: "0 12px",
              backgroundColor: "#f8faff",
              color: "#374151",
              border: "1px solid #9fa8da",
              borderRadius: "4px",
              fontSize: "11px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <SlidersHorizontal size={12} />
            Thresholds
          </button>
        </div>

        {/* Shortage Thresholds Popup */}
        {showShortagePopup && (
          <div
            style={styles.popupOverlay}
            onClick={() => setShowShortagePopup(false)}
          >
            <div
              style={{
                ...styles.popupContainer,
                width: "420px",
                marginTop: "120px",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={styles.popupHeader}>
                <h3 style={styles.popupTitle}>Shortage Thresholds</h3>
                <button
                  style={styles.closeButton}
                  onClick={() => setShowShortagePopup(false)}
                >
                  ×
                </button>
              </div>
              <div style={{ padding: "4px 0 16px" }}>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    marginBottom: "16px",
                  }}
                >
                  Surplus = Stock - (Target Units × QTY/Assembly). Tentukan
                  batas selisih untuk warna status.
                </p>
                {[
                  {
                    key: "green",
                    label: "🟢 Green — Aman",
                    desc: "Surplus lebih dari nilai ini",
                  },
                  {
                    key: "yellow",
                    label: "🟡 Yellow — Warning",
                    desc: "Surplus lebih dari nilai ini",
                  },
                  {
                    key: "red",
                    label: "🔴 Red — Shortage",
                    desc: "Surplus sama/kurang dari Yellow",
                  },
                ].map(({ key, label, desc }) => (
                  <div
                    key={key}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 100px",
                      alignItems: "center",
                      gap: "12px",
                      marginBottom: "14px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#374151",
                        }}
                      >
                        {label}
                      </div>
                      <div style={{ fontSize: "11px", color: "#6b7280" }}>
                        {desc}
                      </div>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={thresholdInput[key]}
                      onChange={(e) =>
                        setThresholdInput((prev) => ({
                          ...prev,
                          [key]: parseInt(e.target.value) || 0,
                        }))
                      }
                      style={{
                        height: "32px",
                        border: "1px solid #9fa8da",
                        borderRadius: "4px",
                        padding: "0 10px",
                        fontSize: "12px",
                        fontFamily: "inherit",
                        textAlign: "right",
                      }}
                    />
                  </div>
                ))}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "8px",
                  borderTop: "1px solid #e5e7eb",
                  paddingTop: "12px",
                }}
              >
                <button
                  style={styles.cancelButton}
                  onClick={() => setShowShortagePopup(false)}
                >
                  Cancel
                </button>
                <button
                  style={styles.submitButton}
                  onClick={() => {
                    setShortageThresholds({ ...thresholdInput });
                    localStorage.setItem(
                      "pm_shortage_thresholds",
                      JSON.stringify(thresholdInput),
                    );
                    setShowShortagePopup(false);
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

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
              onClick={() => handleTabChange(tab)}
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
                  <th style={styles.thWithLeftBorder}>Stock M101</th>
                  <th style={styles.thWithLeftBorder}>Stock M136</th>
                  <th style={styles.thWithLeftBorder}>Status</th>
                </tr>
              </thead>
              <tbody>
                {pagedParts.map((p, idx) => (
                  <tr
                    key={p.id || p.code}
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
                      title={
                        p.assembly_station
                          ? p.assembly_station.toUpperCase()
                          : "-"
                      }
                      onMouseEnter={showTooltip}
                      onMouseLeave={hideTooltip}
                    >
                      {p.assembly_station
                        ? p.assembly_station.toUpperCase()
                        : "-"}
                    </td>

                    <td
                      style={styles.tdWithLeftBorder}
                      title={`${p.qty_per_assembly} pcs/unit`}
                      onMouseEnter={showTooltip}
                      onMouseLeave={hideTooltip}
                    >
                      {p.qty_per_assembly}
                    </td>

                    <td
                      style={styles.tdWithLeftBorder}
                      onMouseEnter={showTooltip}
                      onMouseLeave={hideTooltip}
                    >
                      <span
                        style={{
                          color:
                            targetUnits > 0
                              ? getStockColor(p.m101, p.qty_per_assembly)
                              : "#374151",
                          fontWeight: 600,
                        }}
                        title={
                          targetUnits > 0
                            ? `Required: ${getRequiredQty(p.qty_per_assembly)} pcs | Surplus: ${getSurplus(p.m101, p.qty_per_assembly)}`
                            : `${p.m101} pcs`
                        }
                      >
                        {p.m101} pcs
                        {targetUnits > 0 && (
                          <span
                            style={{
                              fontSize: "10px",
                              marginLeft: "4px",
                              opacity: 0.8,
                            }}
                          >
                            (
                            {getSurplus(p.m101, p.qty_per_assembly) >= 0
                              ? "+"
                              : ""}
                            {getSurplus(p.m101, p.qty_per_assembly)})
                          </span>
                        )}
                      </span>
                    </td>

                    <td
                      style={styles.tdWithLeftBorder}
                      onMouseEnter={showTooltip}
                      onMouseLeave={hideTooltip}
                    >
                      <span
                        style={{
                          color:
                            targetUnits > 0
                              ? getStockColor(p.m136, p.qty_per_assembly)
                              : "#374151",
                          fontWeight: 600,
                        }}
                        title={
                          targetUnits > 0
                            ? `Required: ${getRequiredQty(p.qty_per_assembly)} pcs | Surplus: ${getSurplus(p.m136, p.qty_per_assembly)}`
                            : `${p.m136} pcs`
                        }
                      >
                        {p.m136} pcs
                        {targetUnits > 0 && (
                          <span
                            style={{
                              fontSize: "10px",
                              marginLeft: "4px",
                              opacity: 0.8,
                            }}
                          >
                            (
                            {getSurplus(p.m136, p.qty_per_assembly) >= 0
                              ? "+"
                              : ""}
                            {getSurplus(p.m136, p.qty_per_assembly)})
                          </span>
                        )}
                      </span>
                    </td>

                    <td
                      style={{
                        ...styles.tdWithLeftBorder,
                        textAlign: "center",
                      }}
                    >
                      {(() => {
                        const status = getShortageStatus(
                          p.m101,
                          p.m136,
                          p.qty_per_assembly,
                        );
                        if (!status)
                          return (
                            <span
                              style={{ color: "#9ca3af", fontSize: "11px" }}
                            >
                              -
                            </span>
                          );
                        const cfg = {
                          OK: {
                            bg: "#dcfce7",
                            color: "#166534",
                            border: "#bbf7d0",
                          },
                          Warning: {
                            bg: "#fef9c3",
                            color: "#854d0e",
                            border: "#fef08a",
                          },
                          Shortage: {
                            bg: "#fef2f2",
                            color: "#dc2626",
                            border: "#fecaca",
                          },
                        }[status];
                        return (
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: "700",
                              padding: "2px 6px",
                              borderRadius: "10px",
                              backgroundColor: cfg.bg,
                              color: cfg.color,
                              border: `1px solid ${cfg.border}`,
                            }}
                          >
                            {status === "Shortage" && (
                              <AlertTriangle
                                size={9}
                                style={{
                                  marginRight: "3px",
                                  verticalAlign: "middle",
                                }}
                              />
                            )}
                            {status}
                          </span>
                        );
                      })()}
                    </td>
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