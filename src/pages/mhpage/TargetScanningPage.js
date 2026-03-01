"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { CheckSquare, Check, SkipForward, Pencil, Save, X } from "lucide-react";
import { MdArrowRight, MdArrowDropDown } from "react-icons/md";
import timerService from "../../utils/TimerService";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const http = async (path, { method = "GET", body } = {}) => {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {}
  if (!res.ok) {
    const err = new Error(data?.message || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
};

const getAuthUser = () => {
  try {
    return (
      JSON.parse(sessionStorage.getItem("auth_user") || "null") ||
      JSON.parse(localStorage.getItem("auth_user") || "null")
    );
  } catch {
    return null;
  }
};

const toLocalYMD = (dateObj) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const normalizeDate = (d) => {
  if (!d) return null;
  return toLocalYMD(new Date(d));
};

const isShiftActive = (schedule) => {
  if (!schedule?.shift_time) return false;
  const now = new Date();
  const today = toLocalYMD(now);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = toLocalYMD(yesterday);
  const schedDate = normalizeDate(
    schedule.target_date_display || schedule.target_date,
  );
  if (schedDate !== today && schedDate !== yesterdayStr) return false;
  const [startTime, endTime] = schedule.shift_time.split(" - ");
  if (!startTime || !endTime) return false;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const cur = now.getHours() * 60 + now.getMinutes();
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  return endMins > startMins
    ? cur >= startMins && cur <= endMins
    : cur >= startMins || cur <= endMins;
};

const toDDMMYYYY = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

const TargetScanningPage = ({ sidebarVisible }) => {
  const [activeTab, setActiveTab] = useState("OnProgress");

  const [schedule, setSchedule] = useState(null);
  const [approvals, setApprovals] = useState({});
  const [remarkInputs, setRemarkInputs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approveLoading, setApproveLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [bulkRemark, setBulkRemark] = useState("");
  // State untuk edit remark dan approve di tab Complete
  const [editingApproval, setEditingApproval] = useState({}); // {schedId_unitNo: remark}
  const [completeActionLoading, setCompleteActionLoading] = useState({}); // {schedId_unitNo: true}

  const [completeSchedules, setCompleteSchedules] = useState([]);
  const [completeLoading, setCompleteLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [completeApprovals, setCompleteApprovals] = useState({});
  const [completeAppLoading, setCompleteAppLoading] = useState({});
  // Breakdown detail untuk hitung customer per unit (termasuk Pending)
  const [detailBreakdown, setDetailBreakdown] = useState([]);

  const [searchBy, setSearchBy] = useState("Unit");
  const [keyword, setKeyword] = useState("");
  const [appliedKw, setAppliedKw] = useState("");
  const [appliedBy, setAppliedBy] = useState("Unit");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [cDateFrom, setCDateFrom] = useState("");
  const [cDateTo, setCDateTo] = useState("");
  const [cPage, setCPage] = useState(1);
  const cItemsPerPage = 20;


  const tableConfig = {
    OnProgress: {
      mainTable: {
        cols: [
          "30px",
          "3%",
          "5%",
          "13%",
          "9%",
          "9%",
          "9%",
          "6%",
          "8%",
          "14%",
          "20%",
          "16%",
        ],
      },
    },
    Complete: {
      mainTable: {
        cols: ["7px", "7px", "17%", "10%", "13%", "7%", "8.5%", "8%", "8%", "22%"],
      },
      expandedTable: {
        marginLeft: "66px",
        cols: ["3%", "6%", "8%", "28%", "30%", "20%"],
      },
    },
  };

  const renderColgroup = (cols) => (
    <colgroup>
      {cols.map((w, i) => (
        <col key={i} style={{ width: w }} />
      ))}
    </colgroup>
  );

  useEffect(() => {
    const unsub = timerService.subscribe(() => {});
    return unsub;
  }, []);

  const loadSchedule = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const resp = await http(
        `/api/production-schedules?status=OnProgress&limit=100&page=1`,
      );
      const items = resp?.items || [];
      const active = items.find(isShiftActive) || null;
      setSchedule(active);
      if (active?.id) {
        try {
          const rows = await http(
            `/api/production-schedules/${active.id}/scan-approvals`,
          );
          const map = {};
          (rows || []).forEach((r) => { map[r.unit_no] = r; });
          setApprovals(map);
        } catch {}
        // Load detail breakdown untuk tampilkan customer di semua row (termasuk Pending)
        try {
          const detailResp = await http(`/api/production-schedules/${active.id}`);
          const details = detailResp?.details || [];
          let cum = 0;
          const bd = details.map((d) => {
            const start = cum;
            cum += Number(d.input || 0);
            return { customer: d.customer || "", start, end: cum };
          });
          setDetailBreakdown(bd);
        } catch {}
      } else {
        setApprovals({});
        setDetailBreakdown([]);
      }
    } catch (err) {
      setError(err.message || "Failed to load schedule");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const loadCompleteSchedules = useCallback(async () => {
    setCompleteLoading(true);
    try {
      const resp = await http(
        `/api/production-schedules?status=Complete&limit=200&page=1`,
      );
      setCompleteSchedules(resp?.items || []);
    } catch {
    } finally {
      setCompleteLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchedule();
    const interval = setInterval(() => loadSchedule(true), 30000);
    const onVisible = () => {
      if (!document.hidden) loadSchedule(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadSchedule]);

  // Auto-jump ke page yang berisi row Pending pertama
  // Guard: tunggu approvals selesai load (approvals tidak kosong ATAU memang belum ada yang approve)
  const lastJumpedScheduleId = useRef(null);
  useEffect(() => {
    if (!schedule?.id) return;
    if (lastJumpedScheduleId.current === schedule.id) return;
    const total = schedule.total_input || 0;
    const actual = schedule.actual_input || 0;
    if (total === 0) return;

    // Jika actual > 0 tapi approvals masih kosong → belum selesai load, tunggu
    if (actual > 0 && Object.keys(approvals).length === 0) return;

    // Scan approvals map untuk cari unit Pending pertama (bukan approved/skipped)
    let firstPending = null;
    for (let u = 1; u <= total; u++) {
      const appr = approvals[u];
      const status = appr ? (appr.status === "skipped" ? "skipped" : "approved") : "pending";
      if (status === "pending") { firstPending = u; break; }
    }

    // Kalau semua sudah done, lompat ke halaman terakhir
    const targetUnit = firstPending ?? total;
    const targetPage = Math.max(1, Math.ceil(targetUnit / itemsPerPage));
    setCurrentPage(targetPage);
    lastJumpedScheduleId.current = schedule.id;
  }, [schedule?.id, schedule?.total_input, schedule?.actual_input, approvals, itemsPerPage]);

  useEffect(() => {
    if (activeTab === "Complete") loadCompleteSchedules();
  }, [activeTab, loadCompleteSchedules]);

  const toggleExpandRow = async (schedId) => {
    setExpandedRows((prev) => ({ ...prev, [schedId]: !prev[schedId] }));
    if (!completeApprovals[schedId] && !completeAppLoading[schedId]) {
      setCompleteAppLoading((p) => ({ ...p, [schedId]: true }));
      try {
        const rows = await http(
          `/api/production-schedules/${schedId}/scan-approvals`,
        );
        const map = {};
        (rows || []).forEach((r) => {
          map[r.unit_no] = r;
        });
        setCompleteApprovals((p) => ({ ...p, [schedId]: map }));
      } catch {
      } finally {
        setCompleteAppLoading((p) => ({ ...p, [schedId]: false }));
      }
    }
  };

  const totalUnits = schedule?.total_input || 0;
  const actualInput = schedule?.actual_input || 0;

  // Hitung customer dari breakdown (untuk semua row, termasuk Pending)
  const getCustomerFromBreakdown = useCallback(
    (unitNo) => {
      for (const b of detailBreakdown) {
        if (unitNo > b.start && unitNo <= b.end) return b.customer;
      }
      return detailBreakdown.length > 0
        ? detailBreakdown[detailBreakdown.length - 1].customer
        : "";
    },
    [detailBreakdown],
  );

  const allRows = useMemo(
    () =>
      Array.from({ length: totalUnits }, (_, i) => {
        const unitNo = i + 1;
        const appr = approvals[unitNo];
        return {
          unitNo,
          status: appr ? (appr.status === "skipped" ? "Skipped" : "Approved") : "Pending",
          scheduleCode: schedule?.code || "-",
          date: schedule?.target_date || null,
          shiftTime: schedule?.shift_time || "-",
          line: schedule?.line_code || "-",
          customer: getCustomerFromBreakdown(unitNo),
          remark: appr?.remark || "",
          approvedByName: appr?.approved_by_name || "",
        };
      }),
    [totalUnits, schedule, approvals, getCustomerFromBreakdown],
  );

  const filteredRows = useMemo(() => {
    let rows = allRows;
    if (statusFilter !== "All")
      rows = rows.filter((r) => r.status === statusFilter);
    if (appliedKw) {
      const kw = appliedKw.toLowerCase();
      rows = rows.filter((r) => {
        if (appliedBy === "Unit") return String(r.unitNo).includes(kw);
        if (appliedBy === "Status") return r.status.toLowerCase().includes(kw);
        if (appliedBy === "Line") return r.line.toLowerCase().includes(kw);
        return true;
      });
    }
    return rows;
  }, [allRows, statusFilter, appliedKw, appliedBy]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));
  const currentData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(start, start + itemsPerPage);
  }, [filteredRows, currentPage, itemsPerPage]);

  const filteredComplete = useMemo(() => {
    let list = [...completeSchedules];
    if (cDateFrom)
      list = list.filter((s) => normalizeDate(s.target_date) >= cDateFrom);
    if (cDateTo)
      list = list.filter((s) => normalizeDate(s.target_date) <= cDateTo);
    list.sort((a, b) => (b.id || 0) - (a.id || 0));
    return list;
  }, [completeSchedules, cDateFrom, cDateTo]);

  const cTotalPages = Math.max(
    1,
    Math.ceil(filteredComplete.length / cItemsPerPage),
  );
  const cCurrentData = useMemo(() => {
    const start = (cPage - 1) * cItemsPerPage;
    return filteredComplete.slice(start, start + cItemsPerPage);
  }, [filteredComplete, cPage, cItemsPerPage]);

  const doApprove = async (count, remark = "") => {
    if (!schedule?.id || count < 1) return;
    const user = getAuthUser();
    const approvedById =
      user?.id || user?.emp_id || user?.employeeId || user?.employee_id || null;
    setApproveLoading(true);
    try {
      const result = await http(
        `/api/production-schedules/${schedule.id}/approve-units`,
        {
          method: "PATCH",
          body: { count, approved_by_id: approvedById, remark: remark || null },
        },
      );
      const newActual = result.data?.actual_input ?? actualInput + count;
      const approvedByName = result.approved_by_name;
      const approvedAt = result.approved_at;
      let displayName = approvedByName
        ? (() => {
            const dt = new Date(approvedAt);
            const day = String(dt.getDate()).padStart(2, "0");
            const month = String(dt.getMonth() + 1).padStart(2, "0");
            const year = dt.getFullYear();
            const hh = String(dt.getHours()).padStart(2, "0");
            const mm = String(dt.getMinutes()).padStart(2, "0");
            return `${approvedByName} | ${day}/${month}/${year} ${hh}.${mm}`;
          })()
        : "";
      setSchedule((prev) =>
        prev ? { ...prev, actual_input: newActual } : prev,
      );
      setApprovals((prev) => {
        const next = { ...prev };
        let filled = 0;
        for (let u = 1; u <= totalUnits && filled < count; u++) {
          const ex = next[u];
          if (!ex || (ex.status !== "approved" && ex.status !== "skipped")) {
            next[u] = { status: "approved", remark: remark || "", approved_by_name: displayName };
            filled++;
          }
        }
        return next;
      });
      setSelectedRows(new Set());
      setBulkRemark("");
      setRemarkInputs({});
    } catch (err) {
      alert(`Failed to approve: ${err.message}`);
    } finally {
      setApproveLoading(false);
    }
  };

  const handleApproveOne = (unitNo) => {
    const nextPending = allRows.find((r) => r.status === "Pending")?.unitNo ?? null;
    if (unitNo !== nextPending) return;
    const remark = remarkInputs[unitNo] || "";
    doApprove(1, remark);
  };

  const handleSkipUnit = async (unitNo) => {
    if (!schedule?.id) return;
    const remark = remarkInputs[unitNo] || "";
    if (!remark.trim()) {
      alert("Remark must be fill.");
      return;
    }
    setApproveLoading(true);
    try {
      const result = await http(
        `/api/production-schedules/${schedule.id}/skip-unit`,
        { method: "PATCH", body: { unit_no: unitNo, remark } }
      );
      setSchedule((prev) => prev ? { ...prev, actual_input: result.new_actual_input ?? actualInput } : prev);
      setApprovals((prev) => ({
        ...prev,
        [unitNo]: { ...(prev[unitNo] || {}), status: "skipped", remark },
      }));
    } catch (err) {
      alert(`Gagal skip: ${err.message}`);
    } finally {
      setApproveLoading(false);
    }
  };

  const handleApproveSkipped = async (unitNo) => {
    if (!schedule?.id) return;
    const user = getAuthUser();
    const approvedById = user?.id || user?.emp_id || user?.employeeId || user?.employee_id || null;
    const remark = remarkInputs[unitNo] || "";
    setApproveLoading(true);
    try {
      const result = await http(
        `/api/production-schedules/${schedule.id}/approve-single`,
        { method: "PATCH", body: { unit_no: unitNo, approved_by_id: approvedById, remark: remark || null } }
      );
      const dt = new Date(result.approved_at);
      const p = (n) => String(n).padStart(2, "0");
      const displayName = result.approved_by_name
        ? `${result.approved_by_name} | ${p(dt.getDate())}/${p(dt.getMonth()+1)}/${dt.getFullYear()} ${p(dt.getHours())}.${p(dt.getMinutes())}`
        : "";
      setApprovals((prev) => ({
        ...prev,
        [unitNo]: { status: "approved", remark, approved_by_name: displayName },
      }));
      setSchedule((prev) => prev ? { ...prev, actual_input: result.new_actual_input ?? actualInput + 1 } : prev);
    } catch (err) {
      alert(`Gagal approve: ${err.message}`);
    } finally {
      setApproveLoading(false);
    }
  };

  const handleSaveRemark = async (unitNo) => {
    if (!schedule?.id) return;
    const user = getAuthUser();
    const approvedById = user?.id || user?.emp_id || user?.employeeId || user?.employee_id || null;
    const remark = remarkInputs[unitNo] || "";
    setApproveLoading(true);
    try {
      await http(
        `/api/production-schedules/${schedule.id}/update-approval`,
        { method: "PATCH", body: { unit_no: unitNo, remark, approved_by_id: approvedById } }
      );
      setApprovals((prev) => ({
        ...prev,
        [unitNo]: { ...(prev[unitNo] || {}), remark },
      }));
      setRemarkInputs((p) => { const n = { ...p }; delete n[unitNo]; return n; });
    } catch (err) {
      alert(`Gagal simpan remark: ${err.message}`);
    } finally {
      setApproveLoading(false);
    }
  };

  // Approve unit spesifik di tab Complete
  const handleApproveSingle = async (schedId, unitNo, remark) => {
    const key = `${schedId}_${unitNo}`;
    const user = getAuthUser();
    const approvedById = user?.id || user?.emp_id || user?.employeeId || user?.employee_id || null;
    setCompleteActionLoading((p) => ({ ...p, [key]: true }));
    try {
      const result = await http(
        `/api/production-schedules/${schedId}/approve-single`,
        { method: "PATCH", body: { unit_no: unitNo, approved_by_id: approvedById, remark: remark || null } }
      );
      const approvedAt = result.approved_at;
      const approvedByName = result.approved_by_name;
      const dt = new Date(approvedAt);
      const dd = String(dt.getDate()).padStart(2, "0");
      const mm = String(dt.getMonth() + 1).padStart(2, "0");
      const yyyy = dt.getFullYear();
      const hh = String(dt.getHours()).padStart(2, "0");
      const min = String(dt.getMinutes()).padStart(2, "0");
      const displayName = approvedByName
        ? `${approvedByName} | ${dd}/${mm}/${yyyy} ${hh}.${min}`
        : `User | ${dd}/${mm}/${yyyy} ${hh}.${min}`;
      setCompleteApprovals((prev) => ({
        ...prev,
        [schedId]: {
          ...(prev[schedId] || {}),
          [unitNo]: { remark: remark || "", approved_by_name: displayName, unit_no: unitNo },
        },
      }));
    } catch (err) {
      alert(`Gagal approve: ${err.message}`);
    } finally {
      setCompleteActionLoading((p) => ({ ...p, [key]: false }));
    }
  };

  // Update remark + approved_by di tab Complete
  const handleUpdateApproval = async (schedId, unitNo) => {
    const key = `${schedId}_${unitNo}`;
    const editKey = key;
    const newRemark = editingApproval[editKey];
    const user = getAuthUser();
    const approvedById = user?.id || user?.emp_id || user?.employeeId || user?.employee_id || null;
    setCompleteActionLoading((p) => ({ ...p, [key]: true }));
    try {
      const result = await http(
        `/api/production-schedules/${schedId}/update-approval`,
        { method: "PATCH", body: { unit_no: unitNo, remark: newRemark, approved_by_id: approvedById } }
      );
      const approvedAt = result.approved_at;
      const approvedByName = result.approved_by_name;
      const dt = new Date(approvedAt);
      const dd = String(dt.getDate()).padStart(2, "0");
      const mm = String(dt.getMonth() + 1).padStart(2, "0");
      const yyyy = dt.getFullYear();
      const hh = String(dt.getHours()).padStart(2, "0");
      const min = String(dt.getMinutes()).padStart(2, "0");
      const displayName = approvedByName
        ? `${approvedByName} | ${dd}/${mm}/${yyyy} ${hh}.${min}`
        : `User | ${dd}/${mm}/${yyyy} ${hh}.${min}`;
      setCompleteApprovals((prev) => ({
        ...prev,
        [schedId]: {
          ...(prev[schedId] || {}),
          [unitNo]: {
            ...(prev[schedId]?.[unitNo] || {}),
            remark: newRemark || "",
            approved_by_name: displayName,
          },
        },
      }));
      // Tutup edit mode
      setEditingApproval((p) => {
        const n = { ...p };
        delete n[editKey];
        return n;
      });
    } catch (err) {
      alert(`Gagal update: ${err.message}`);
    } finally {
      setCompleteActionLoading((p) => ({ ...p, [key]: false }));
    }
  };

  const handleApproveBulk = () => {
    if (selectedRows.size === 0) {
      alert("No units selected. Please select at least one unit to approve.");
      return;
    }
    doApprove(selectedRows.size, bulkRemark);
  };

  const toggleRow = (unitNo) => {
    const pendingList = allRows.filter((r) => r.status === "Pending").map((r) => r.unitNo);
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(unitNo)) {
        const idx = pendingList.indexOf(unitNo);
        pendingList.slice(idx).forEach((u) => next.delete(u));
      } else {
        const idx = pendingList.indexOf(unitNo);
        if (idx === next.size) next.add(unitNo);
      }
      return next;
    });
  };

  const pendingOnPage = currentData.filter((r) => r.status === "Pending");
  const allPagePendingSelected =
    pendingOnPage.length > 0 &&
    pendingOnPage.every((r) => selectedRows.has(r.unitNo));

  const handleSelectAllPage = (e) => {
    if (e.target.checked) {
      setSelectedRows((prev) => {
        const next = new Set(prev);
        const pendingList = allRows.filter((r) => r.status === "Pending").map((r) => r.unitNo);
        for (const row of pendingOnPage) {
          const idx = pendingList.indexOf(row.unitNo);
          if (idx === next.size) next.add(row.unitNo);
        }
        return next;
      });
    } else {
      const pageNos = new Set(pendingOnPage.map((r) => r.unitNo));
      setSelectedRows((prev) => {
        const next = new Set(prev);
        pageNos.forEach((u) => next.delete(u));
        return next;
      });
    }
  };

  const handleSearchClick = () => {
    setAppliedKw(keyword.trim());
    setAppliedBy(searchBy);
    setCurrentPage(1);
  };

  const handleButtonHover = (e, isHover, type) => {
    if (!e?.target) return;
    if (type === "search" || type === "primary") {
      e.target.style.backgroundColor = isHover ? "#1d4ed8" : "#2563eb";
    } else if (type === "pagination") {
      e.target.style.backgroundColor = isHover ? "#2563eb" : "transparent";
      e.target.style.color = isHover ? "white" : "#374151";
    }
  };

  const handleTabHover = (e, isHover, isActive) => {
    if (!isActive) e.target.style.color = isHover ? "#2563eb" : "#6b7280";
  };

  const handleInputFocus = (e) => {
    e.target.style.borderColor = "#9fa8da";
  };
  const handleInputBlur = (e) => {
    e.target.style.borderColor = "#d1d5db";
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
      boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)",
      border: "1px solid #e5e7eb",
      padding: "32px",
    },
    combinedHeaderFilter: {
      backgroundColor: "white",
      padding: "24px",
      borderRadius: "8px",
      boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)",
      border: "1px solid #e5e7eb",
      marginBottom: "20px",
    },
    headerRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "24px",
    },
    title: { fontSize: "20px", fontWeight: "600", color: "#1f2937", margin: 0 },
    filterRow: {
      display: "grid",
      alignItems: "center",
      gap: "12px",
      marginBottom: "16px",
    },
    inputGroup: { display: "flex", alignItems: "center", gap: "8px" },
    label: { fontSize: "12px", color: "#374151", fontWeight: "500" },
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
      transition: "border-color 0.2s ease",
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
      alignItems: "center",
    },
    actionButtonsGroup: {
      display: "flex",
      gap: "8px",
      marginBottom: "15px",
      marginTop: "10px",
      right: "10px",
    },
    primaryButton: { backgroundColor: "#2563eb", color: "white" },
    emptyColumn: {
      width: "auto",
      minWidth: "auto",
      maxWidth: "auto",
      padding: "0",
      textAlign: "center",
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
      boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)",
      border: "1.5px solid #e5e7eb",
      overflowX: "auto",
      width: "calc(100% - 10px)",
    },
    tableBodyWrapper: {
      overflowX: "auto",
      border: "1.5px solid #9fa8da",
      borderBottom: "none",
    },
    table: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" },
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
    expandedWithLeftBorder: {
      border: "0.5px solid #9fa8da",
      whiteSpace: "nowrap",
      backgroundColor: "#e0e7ff",
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
    expandedTableContainer: {
      marginBottom: "1px",
      marginLeft: "71px",
      backgroundColor: "white",
      boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)",
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
    paginationControls: { display: "flex", alignItems: "center", gap: "8px" },
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
    arrowIcon: { fontSize: "25px", color: "#9fa8da" },
    cellContent: {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    approveButton: {
      backgroundColor: "#e0e7ff",
      color: "black",
      padding: "4px 8px",
      fontSize: "11px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      marginLeft: "4px",
      display: "inline-flex",
      alignItems: "center",
      gap: "3px",
      fontFamily: "inherit",
    },
    approveButtonDisabled: {
      backgroundColor: "#f3f4f6",
      color: "#9ca3af",
      padding: "4px 8px",
      fontSize: "11px",
      borderRadius: "4px",
      border: "none",
      cursor: "not-allowed",
      marginLeft: "4px",
      display: "inline-flex",
      alignItems: "center",
      gap: "3px",
      fontFamily: "inherit",
    },
    remarkInput: {
      height: "22px",
      border: "1px solid #d1d5db",
      borderRadius: "3px",
      padding: "0 6px",
      fontSize: "11px",
      fontFamily: "inherit",
      outline: "none",
      width: "100%",
      boxSizing: "border-box",
    },
    skipButton: {
      backgroundColor: "#fef3c7",
      color: "#92400e",
      padding: "4px 8px",
      fontSize: "11px",
      borderRadius: "4px",
      border: "1px solid #fbbf24",
      cursor: "pointer",
      marginLeft: "4px",
      display: "inline-flex",
      alignItems: "center",
      gap: "3px",
      fontFamily: "inherit",
    },
    editButton: {
      backgroundColor: "#eff6ff",
      color: "#1d4ed8",
      padding: "3px 6px",
      fontSize: "11px",
      borderRadius: "4px",
      border: "1px solid #93c5fd",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: "3px",
      fontFamily: "inherit",
    },
    saveButton: {
      backgroundColor: "#f0fdf4",
      color: "#15803d",
      padding: "3px 6px",
      fontSize: "11px",
      borderRadius: "4px",
      border: "1px solid #86efac",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: "3px",
      fontFamily: "inherit",
    },
    cancelButton: {
      backgroundColor: "#fef2f2",
      color: "#dc2626",
      padding: "3px 6px",
      fontSize: "11px",
      borderRadius: "4px",
      border: "1px solid #fca5a5",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: "3px",
      fontFamily: "inherit",
    },
  };

  const renderFilterRow = () => (
    <div style={styles.filterRow}>
      <div style={styles.inputGroup}>
        {activeTab === "OnProgress" && (
          <>
            <span style={styles.label}>Status</span>
            <select
              style={styles.select}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            >
              <option value="All" style={optionStyle}>
                All
              </option>
              <option value="Pending" style={optionStyle}>
                Pending
              </option>
              <option value="Skipped" style={optionStyle}>
                Skipped
              </option>
              <option value="Approved" style={optionStyle}>
                Approved
              </option>
            </select>
            <span style={styles.label}>Search By</span>
            <select
              style={styles.select}
              value={searchBy}
              onChange={(e) => setSearchBy(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            >
              <option value="Unit" style={optionStyle}>
                Unit No
              </option>
              <option value="Status" style={optionStyle}>
                Status
              </option>
              <option value="Line" style={optionStyle}>
                Line
              </option>
            </select>
            <input
              type="text"
              style={styles.input}
              placeholder="Input keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchClick()}
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
          </>
        )}
        {activeTab === "Complete" && (
          <>
            <span style={styles.label}>Date From</span>
            <input
              type="date"
              style={styles.input}
              value={cDateFrom}
              onChange={(e) => {
                setCDateFrom(e.target.value);
                setCPage(1);
              }}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
            <span style={styles.label}>To</span>
            <input
              type="date"
              style={styles.input}
              value={cDateTo}
              onChange={(e) => {
                setCDateTo(e.target.value);
                setCPage(1);
              }}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
          </>
        )}
      </div>
    </div>
  );

  const renderPagination = (page, totalPg, setPage, totalRows, extraInfo) => (
    <div style={styles.paginationBar}>
      <div style={styles.paginationControls}>
        <button
          style={styles.paginationButton}
          disabled={page === 1 || totalRows === 0}
          onClick={() => setPage(1)}
          onMouseEnter={(e) => handleButtonHover(e, true, "pagination")}
          onMouseLeave={(e) => handleButtonHover(e, false, "pagination")}
        >
          {"<<"}
        </button>
        <button
          style={styles.paginationButton}
          disabled={page === 1 || totalRows === 0}
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
          onMouseEnter={(e) => handleButtonHover(e, true, "pagination")}
          onMouseLeave={(e) => handleButtonHover(e, false, "pagination")}
        >
          {"<"}
        </button>
        <span>Page</span>
        <input
          type="text"
          value={page}
          readOnly
          style={styles.paginationInput}
        />
        <span>of {totalPg}</span>
        <button
          style={styles.paginationButton}
          disabled={page === totalPg || totalRows === 0}
          onClick={() => setPage((p) => Math.min(p + 1, totalPg))}
          onMouseEnter={(e) => handleButtonHover(e, true, "pagination")}
          onMouseLeave={(e) => handleButtonHover(e, false, "pagination")}
        >
          {">"}
        </button>
        <button
          style={styles.paginationButton}
          disabled={page === totalPg || totalRows === 0}
          onClick={() => setPage(totalPg)}
          onMouseEnter={(e) => handleButtonHover(e, true, "pagination")}
          onMouseLeave={(e) => handleButtonHover(e, false, "pagination")}
        >
          {">>"}
        </button>
      </div>
      <div style={{ fontSize: "12px", color: "#374151" }}>{extraInfo}</div>
    </div>
  );

  const renderStatusBadge = (status) => {
    const isApproved = status === true || status === "Approved";
    const isSkipped  = status === "Skipped";
    const bg    = isApproved ? "#dcfce7" : isSkipped ? "#fee2e2" : "#fef9c3";
    const color = isApproved ? "#166534" : isSkipped ? "#991b1b" : "#854d0e";
    const bdr   = isApproved ? "1px solid #bbf7d0" : isSkipped ? "1px solid #fca5a5" : "1px solid #fef08a";
    const label = isApproved ? "Approved" : isSkipped ? "Skipped" : "Pending";
    return (
      <span style={{ display:"inline-block", padding:"1px 8px", borderRadius:"10px", fontSize:"11px", fontWeight:"600", backgroundColor:bg, color, border:bdr }}>
        {label}
      </span>
    );
  };

  const renderOnProgressTab = () => {
    if (loading) {
      return (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            fontSize: "13px",
            color: "#6b7280",
          }}
        >
          Loading...
        </div>
      );
    }
    return (
      <div style={styles.tableContainer}>
        <div style={styles.tableBodyWrapper}>
          <table
            style={{
              ...styles.table,
              minWidth: "1100px",
              tableLayout: "fixed",
            }}
          >
            {renderColgroup(tableConfig.OnProgress.mainTable.cols)}
            <thead>
              <tr style={styles.tableHeader}>
               
                <th style={styles.thWithLeftBorder}>No</th>
                 <th style={{ ...styles.thWithLeftBorder, textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={allPagePendingSelected}
                    onChange={handleSelectAllPage}
                    disabled={pendingOnPage.length === 0}
                    style={{
                      margin: "0 auto",
                      display: "block",
                      cursor:
                        pendingOnPage.length === 0 ? "not-allowed" : "pointer",
                      width: "12px",
                      height: "12px",
                    }}
                  />
                </th>
                <th style={styles.thWithLeftBorder}>Unit #</th>
                <th style={styles.thWithLeftBorder}>Schedule Code</th>
                <th style={styles.thWithLeftBorder}>Date</th>
                <th style={styles.thWithLeftBorder}>Customer</th>
                <th style={styles.thWithLeftBorder}>Shift Time</th>
                <th style={styles.thWithLeftBorder}>Line</th>
                <th style={styles.thWithLeftBorder}>Status</th>
                <th style={styles.thWithLeftBorder}>Remark</th>
                <th style={styles.thWithLeftBorder}>Approved By</th>
                <th style={{ ...styles.thWithLeftBorder, textAlign: "center" }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {currentData.length === 0 ? (
                <tr>
                </tr>
              ) : (
                currentData.map((row, index) => {
                  const isApproved     = row.status === "Approved";
                  const isSkipped      = row.status === "Skipped";
                  const nextPendingUnit = allRows.find((r) => r.status === "Pending")?.unitNo ?? null;
                  const isNextPend     = row.unitNo === nextPendingUnit;
                  const isSelected     = selectedRows.has(row.unitNo);
                  const pendingList    = allRows.filter((r) => r.status === "Pending").map((r) => r.unitNo);
                  const pendingIdx     = pendingList.indexOf(row.unitNo);
                  const isSelectable   = pendingIdx >= 0 && pendingIdx <= selectedRows.size && !isApproved && !isSkipped;
                  return (
                    <tr
                      key={row.unitNo}
                      style={{
                        backgroundColor: isApproved
                          ? "#f0fdf4"
                          : isSkipped
                            ? "#fff1f2"
                            : isSelected
                              ? "#eff6ff"
                              : "transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (!isApproved && !isSkipped && !isSelected)
                          e.target.closest("tr").style.backgroundColor = "#c7cde8";
                      }}
                      onMouseLeave={(e) => {
                        if (!isApproved && !isSkipped && !isSelected)
                          e.target.closest("tr").style.backgroundColor = "transparent";
                      }}
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
                      <td
                        style={{
                          ...styles.tdWithLeftBorder,
                          textAlign: "center",
                        }}
                      >
                        {!isApproved && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRow(row.unitNo)}
                            disabled={!isSelectable && !isSelected}
                            style={{
                              margin: "0 auto",
                              display: "block",
                              cursor:
                                !isSelectable && !isSelected
                                  ? "not-allowed"
                                  : "pointer",
                              width: "12px",
                              height: "12px",
                            }}
                          />
                        )}
                      </td>
                      <td
                        style={{
                          ...styles.tdWithLeftBorder,
                          textAlign: "center",
                          fontWeight: "600",
                        }}
                      >
                        {row.unitNo}
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                        title={row.scheduleCode}
                      >
                        {row.scheduleCode}
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                      >
                        {toDDMMYYYY(row.date)}
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                      >
                        {row.customer}
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                      >
                        {row.shiftTime}
                      </td>
                      <td
                        style={{
                          ...styles.tdWithLeftBorder,
                          textAlign: "center",
                        }}
                      >
                        {row.line}
                      </td>
                      <td
                        style={{
                          ...styles.tdWithLeftBorder,
                          textAlign: "center",
                        }}
                      >
                        {renderStatusBadge(row.status)}
                      </td>
                      <td style={styles.tdWithLeftBorder}>
                        {(isNextPend || isSkipped || isApproved) ? (
                          <input
                            type="text"
                            style={styles.remarkInput}
                            placeholder={isSkipped ? "Remark (wajib untuk skip)..." : "Remark..."}
                            value={remarkInputs[row.unitNo] ?? row.remark ?? ""}
                            onChange={(e) => setRemarkInputs((p) => ({ ...p, [row.unitNo]: e.target.value }))}
                          />
                        ) : (
                          <span style={styles.cellContent} title={row.remark}>{row.remark}</span>
                        )}
                      </td>
                      <td style={styles.tdWithLeftBorder} title={row.approvedByName}>
                        <span style={styles.cellContent}>{row.approvedByName}</span>
                      </td>
                      <td style={{ ...styles.tdWithLeftBorder, textAlign: "center" }}>
                        {isNextPend ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <button style={approveLoading ? styles.approveButtonDisabled : styles.approveButton} onClick={() => handleApproveOne(row.unitNo)} disabled={approveLoading}>
                              <Check size={11} /> Approve
                            </button>
                            <button style={approveLoading ? styles.approveButtonDisabled : styles.skipButton} onClick={() => handleSkipUnit(row.unitNo)} disabled={approveLoading} title="Skip">
                              <SkipForward size={11} /> Skip
                            </button>
                          </span>
                        ) : isApproved ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <button style={approveLoading ? styles.approveButtonDisabled : styles.saveButton} onClick={() => handleSaveRemark(row.unitNo)} disabled={approveLoading}  title="Save remark">
                              <Save size={11} /> Save
                            </button>
                            <button style={approveLoading ? styles.approveButtonDisabled : styles.skipButton} onClick={() => handleSkipUnit(row.unitNo)} disabled={approveLoading} title="Skip">
                              <SkipForward size={11} /> Skip
                            </button>
                          </span>
                        ) : isSkipped ? (
                          <button style={approveLoading ? styles.approveButtonDisabled : styles.approveButton} onClick={() => handleApproveSkipped(row.unitNo)} disabled={approveLoading}>
                            <Check size={11} /> Approve
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {renderPagination(
          currentPage,
          totalPages,
          setCurrentPage,
          filteredRows.length,
          `Total Row: ${filteredRows.length} | Approved: ${actualInput} / ${totalUnits}`,
        )}
      </div>
    );
  };

  const renderCompleteTab = () => {
    if (completeLoading) {
      return (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            fontSize: "13px",
            color: "#6b7280",
          }}
        >
          Loading...
        </div>
      );
    }
    return (
      <div style={styles.tableContainer}>
        <div style={styles.tableBodyWrapper}>
          <table
            style={{ ...styles.table, minWidth: "900px", tableLayout: "fixed" }}
          >
            {renderColgroup(tableConfig.Complete.mainTable.cols)}
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.thWithLeftBorder}>No</th>
                <th style={styles.thWithLeftBorder}></th>
                <th style={styles.thWithLeftBorder}>Schedule Code</th>
                <th style={styles.thWithLeftBorder}>Date</th>
                <th style={styles.thWithLeftBorder}>Shift Time</th>
                <th style={styles.thWithLeftBorder}>Line</th>
                <th style={styles.thWithLeftBorder}>Total Customer</th>
                <th style={styles.thWithLeftBorder}>Total Input</th>
                <th style={styles.thWithLeftBorder}>Actual Input</th>
                <th style={styles.thWithLeftBorder}>Created By</th>
              </tr>
            </thead>
            <tbody>
              {cCurrentData.length === 0 ? (
                <tr></tr>
              ) : (
                cCurrentData.map((sched, idx) => (
                  <>
                    <tr
                      key={sched.id}
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
                        {(cPage - 1) * cItemsPerPage + idx + 1}
                      </td>
                      <td
                        style={{
                          ...styles.tdWithLeftBorder,
                          ...styles.emptyColumn,
                        }}
                      >
                        <button
                          style={styles.arrowButton}
                          onClick={() => toggleExpandRow(sched.id)}
                        >
                          {expandedRows[sched.id] ? (
                            <MdArrowDropDown style={styles.arrowIcon} />
                          ) : (
                            <MdArrowRight style={styles.arrowIcon} />
                          )}
                        </button>
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                      >
                        {sched.code || "-"}
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                      >
                        {toDDMMYYYY(sched.target_date)}
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                      >
                        {sched.shift_time || "-"}
                      </td>
                      <td
                        style={{
                          ...styles.tdWithLeftBorder,
                          textAlign: "center",
                        }}
                      >
                        {sched.line_code || "-"}
                      </td>
                      <td
                        style={{
                          ...styles.tdWithLeftBorder,
                          textAlign: "center",
                        }}
                      >
                        {sched.total_customer || 0}
                      </td>
                      <td
                        style={{
                          ...styles.tdWithLeftBorder,
                          textAlign: "center",
                        }}
                      >
                        {sched.total_input || 0}
                      </td>
                      <td
                        style={{
                          ...styles.tdWithLeftBorder,
                          textAlign: "center",
                        }}
                      >
                        {sched.actual_input || 0}
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                      >
                        {sched.created_by_name || "-"}
                      </td>
                    </tr>
                    {expandedRows[sched.id] && (
                      <tr key={`exp-${sched.id}`}>
                        <td colSpan={10} style={{ padding: 0, border: "none" }}>
                          <div
                            style={{
                              ...styles.expandedTableContainer,
                              marginLeft:
                                tableConfig.Complete.expandedTable.marginLeft,
                              width: `calc(100% - ${tableConfig.Complete.expandedTable.marginLeft} - 14px)`,
                            }}
                          >
                            {completeAppLoading[sched.id] ? (
                              <div
                                style={{
                                  padding: "12px",
                                  fontSize: "12px",
                                  color: "#6b7280",
                                }}
                              >
                                Loading...
                              </div>
                            ) : (
                              <table style={styles.expandedTable}>
                                {renderColgroup(
                                  tableConfig.Complete.expandedTable.cols,
                                )}
                                <thead>
                                  <tr style={styles.expandedTableHeader}>
                                    <th style={styles.expandedTh}>No</th>
                                    <th style={styles.expandedTh}>Unit #</th>
                                    <th style={styles.expandedTh}>Status</th>
                                    <th style={styles.expandedTh}>Remark</th>
                                    <th style={styles.expandedTh}>Approved By</th>
                                    <th style={styles.expandedTh}>Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {Array.from(
                                    { length: sched.total_input || 0 },
                                    (_, i) => {
                                      const unitNo = i + 1;
                                      const appMap = completeApprovals[sched.id] || {};
                                      const appr = appMap[unitNo];
                                      const isApp = !!appr;
                                      const actionKey = `${sched.id}_${unitNo}`;
                                      const isEditMode = editingApproval.hasOwnProperty(actionKey);
                                      const isActLoading = !!completeActionLoading[actionKey];
                                      return (
                                        <tr
                                          key={unitNo}
                                          style={{
                                            backgroundColor: isApp ? "#f0fdf4" : "transparent",
                                          }}
                                          onMouseEnter={(e) =>
                                            (e.target.closest("tr").style.backgroundColor = "#c7cde8")
                                          }
                                          onMouseLeave={(e) =>
                                            (e.target.closest("tr").style.backgroundColor = isApp
                                              ? "#f0fdf4"
                                              : "transparent")
                                          }
                                        >
                                          <td style={{ ...styles.expandedTd, ...styles.expandedWithLeftBorder, ...styles.emptyColumn }}>
                                            {unitNo}
                                          </td>
                                          <td style={{ ...styles.expandedTd, textAlign: "center", fontWeight: "600" }}>
                                            {unitNo}
                                          </td>
                                          <td style={{ ...styles.expandedTd, textAlign: "center" }}>
                                            {renderStatusBadge(isApp)}
                                          </td>
                                          <td style={styles.expandedTd}>
                                            {isEditMode ? (
                                              <input
                                                type="text"
                                                style={styles.remarkInput}
                                                value={editingApproval[actionKey]}
                                                onChange={(e) =>
                                                  setEditingApproval((p) => ({ ...p, [actionKey]: e.target.value }))
                                                }
                                                autoFocus
                                              />
                                            ) : (
                                              <span title={appr?.remark || ""}>
                                                {appr?.remark || ""}
                                              </span>
                                            )}
                                          </td>
                                          <td style={styles.expandedTd} title={appr?.approved_by_name || ""}>
                                            {appr?.approved_by_name || ""}
                                          </td>
                                          <td style={{ ...styles.expandedTd, textAlign: "center", whiteSpace: "nowrap" }}>
                                            {isApp ? (
                                              isEditMode ? (
                                                <span style={{ display: "inline-flex", gap: "3px" }}>
                                                  <button
                                                    style={styles.saveButton}
                                                    disabled={isActLoading}
                                                    onClick={() => handleUpdateApproval(sched.id, unitNo)}
                                                    title="Simpan perubahan"
                                                  >
                                                    <Save size={10} /> Save
                                                  </button>
                                                  <button
                                                    style={styles.cancelButton}
                                                    disabled={isActLoading}
                                                    onClick={() =>
                                                      setEditingApproval((p) => {
                                                        const n = { ...p };
                                                        delete n[actionKey];
                                                        return n;
                                                      })
                                                    }
                                                    title="Batal edit"
                                                  >
                                                    <X size={10} />
                                                  </button>
                                                </span>
                                              ) : (
                                                <button
                                                  style={styles.editButton}
                                                  disabled={isActLoading}
                                                  onClick={() =>
                                                    setEditingApproval((p) => ({
                                                      ...p,
                                                      [actionKey]: appr?.remark || "",
                                                    }))
                                                  }
                                                  title="Edit remark"
                                                >
                                                  <Pencil size={10} /> Edit
                                                </button>
                                              )
                                            ) : (
                                              <button
                                                style={isActLoading ? styles.approveButtonDisabled : styles.approveButton}
                                                disabled={isActLoading}
                                                onClick={() => handleApproveSingle(sched.id, unitNo, "")}
                                                title="Approve unit ini"
                                              >
                                                <Check size={10} /> Approve
                                              </button>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    },
                                  )}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
        {renderPagination(
          cPage,
          cTotalPages,
          setCPage,
          filteredComplete.length,
          `Total Row: ${filteredComplete.length}`,
        )}
      </div>
    );
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.welcomeCard}>
        <div style={styles.combinedHeaderFilter}>
          <div style={styles.headerRow}>
            <h1 style={styles.title}>Target Scanning</h1>
          </div>
          {renderFilterRow()}
        </div>

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

        {activeTab === "OnProgress" && (
          <div style={styles.actionButtonsGroup}>
            <button
              style={{
                ...styles.button,
                backgroundColor: "#2563eb",
                color: !approveLoading ? "white" : "#e5e7eb",
                cursor: !approveLoading ? "pointer" : "not-allowed",
              }}
              onClick={handleApproveBulk}
              disabled={approveLoading}
            >
              <CheckSquare size={14} />
              Approve Selected
            </button>
            {selectedRows.size > 0 && (
              <input
                type="text"
                style={{ ...styles.input, minWidth: "220px" }}
                placeholder="Remark for selected row"
                value={bulkRemark}
                onChange={(e) => setBulkRemark(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            )}
          </div>
        )}

        <div style={styles.tabsContainer}>
          {["OnProgress", "Complete"].map((tab) => (
            <button
              key={tab}
              style={{
                ...styles.tabButton,
                ...(activeTab === tab ? styles.tabButtonActive : {}),
              }}
              onClick={() => setActiveTab(tab)}
              onMouseEnter={(e) => handleTabHover(e, true, activeTab === tab)}
              onMouseLeave={(e) => handleTabHover(e, false, activeTab === tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "OnProgress" && renderOnProgressTab()}
        {activeTab === "Complete" && renderCompleteTab()}
      </div>
    </div>
  );
};

export default TargetScanningPage;