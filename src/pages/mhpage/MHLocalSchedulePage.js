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
  RotateCcw,
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

const MHLocalSchedulePage = ({ sidebarVisible }) => {
  const navbarTotalHeight = 164;
  const sidebarWidth = 288;
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());

  const authUser = getAuthUser();

  // INVENTORY ONLY - FULL ACCESS
  const canCreateSchedule = true;
  const canDeleteSchedule = true;
  const canEditSchedule = true;
  const canEditPartsInToday = true;

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
  const [selectedVendorIds, setSelectedVendorIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [expandedVendorRows, setExpandedVendorRows] = useState({});

  const [activeTab, setActiveTab] = useState("New");

  // STATE FOR EDITING
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [editScheduleData, setEditScheduleData] = useState({});
  const [editingPartId, setEditingPartId] = useState(null);
  const [editPartData, setEditPartData] = useState({});

  // ====== NEW STATES FOR ADD VENDOR/PART POPUP ======
  const [addVendorPopup, setAddVendorPopup] = useState(false);
  const [addPartPopup, setAddPartPopup] = useState(false);
  const [activeScheduleForVendor, setActiveScheduleForVendor] = useState(null);
  const [activeVendorForPart, setActiveVendorForPart] = useState(null);
  const [tripOptions, setTripOptions] = useState([]);
  const [vendorOptions, setVendorOptions] = useState([]);

  // State for vendor form
  const [vendorFormData, setVendorFormData] = useState({
    trip: "",
    tripId: null,
    vendor: "",
    vendorId: null,
    doNumbers: [""],
    arrivalTime: "",
  });

  // State for part form
  const [partFormData, setPartFormData] = useState({
    partCode: "",
    partName: "",
    qty: "",
    qtyBox: "",
    qtyPerBox: 1,
    unit: "PCS",
  });

  // State for Received tab vendors (flat list)
  const [receivedVendors, setReceivedVendors] = useState([]);

  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    vendorName: "",
    partCode: "",
    partName: "",
  });

  // ====== FETCH SCHEDULES ======
  useEffect(() => {
    if (activeTab === "Received") {
      fetchReceivedVendors();
    } else {
      fetchSchedules();
    }
  }, [activeTab]);

  // ====== FETCH TRIP & VENDOR OPTIONS ======
  useEffect(() => {
    fetchTripOptions();
    fetchVendorOptions();
  }, []);

  // ====== AUTO-EXPAND FOR TODAY TAB ======
  useEffect(() => {
    if (activeTab === "Today" && schedules.length > 0) {
      const allExpanded = {};
      schedules.forEach((schedule) => {
        allExpanded[schedule.id] = true;
      });
      setExpandedRows(allExpanded);
    }
  }, [activeTab, schedules]);

  const fetchTripOptions = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/masters/trips`);
      const data = await response.json();
      setTripOptions(data || []);
    } catch (error) {
      console.error("Error fetching trips:", error);
    }
  };

  const fetchVendorOptions = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/vendors`);
      const data = await response.json();
      setVendorOptions(data || []);
    } catch (error) {
      console.error("Error fetching vendors:", error);
    }
  };

  const fetchReceivedVendors = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/local-schedules/received-vendors`
      );
      const result = await response.json();
      if (result.success) {
        setReceivedVendors(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching received vendors:", error);
      setReceivedVendors([]);
    } finally {
      setLoading(false);
    }
  };

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

      const statusForAPI = tabToStatus[activeTab] || "New";
      let url = `${API_BASE}/api/local-schedules?status=${statusForAPI}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        let filteredData = result.data || [];

        // Untuk tab Today, filter tambahan berdasarkan tanggal LOCAL
        if (activeTab === "Today") {
          const now = new Date();
          const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

          filteredData = filteredData.filter((schedule) => {
            try {
              const rawDate = schedule.schedule_date;
              let scheduleDate;

              if (typeof rawDate === "string") {
                scheduleDate = rawDate.split("T")[0];
              } else {
                const d = new Date(rawDate);
                scheduleDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
              }

              return scheduleDate === today;
            } catch (e) {
              return false;
            }
          });
        }

        setSchedules(filteredData);
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
            uploadByName: uploadByName,
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

  // ====== FETCH QTY_PER_BOX FROM KANBAN_MASTER ======
  const fetchQtyPerBox = async (partCode) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/kanban-master/qty-per-box?part_code=${partCode}`
      );
      const result = await response.json();
      return result?.qty_per_box || 1;
    } catch (error) {
      console.error("Error fetching qty_per_box:", error);
      return 1;
    }
  };

  // ====== HANDLE QTY CHANGE WITH AUTO-CALCULATE QTY_BOX ======
  const handleQtyChangeInEdit = async (value) => {
    const qty = Number(value) || 0;
    const partCode = editPartData.part_code;

    const qtyPerBox = await fetchQtyPerBox(partCode);
    const qtyBox = qtyPerBox > 0 ? Math.ceil(qty / qtyPerBox) : 0;

    setEditPartData((prev) => ({
      ...prev,
      qty: value,
      qty_box: qtyBox,
    }));
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
    if (
      !window.confirm(
        "Are you sure you want to delete this schedule? This will also delete all vendors and parts."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/local-schedules/${scheduleId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
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
        await fetchSchedules();
      } else {
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
        if (activeTab === "Received") {
          await fetchReceivedVendors();
        } else {
          await fetchSchedules();
        }
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
      if (checked) {
        next.add(scheduleId);
      } else {
        next.delete(scheduleId);
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
      const authUser = getAuthUser();
      const moveByName = authUser?.emp_name || authUser?.name || "System";

      const response = await fetch(
        `${API_BASE}/api/local-schedules/vendors/${vendorId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "Received",
            moveByName: moveByName,
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

  // ====== APPROVE VENDOR (Received -> IQC Progress) ======
  const handleApproveVendor = async (vendorId) => {
    if (!window.confirm("Approve this vendor and move to IQC Progress?")) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/local-schedules/vendors/${vendorId}/approve`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        alert("Vendor approved and moved to IQC Progress!");
        await fetchReceivedVendors();
      } else {
        throw new Error(result.message || "Failed to approve vendor");
      }
    } catch (error) {
      console.error("Error approving vendor:", error);
      alert("Failed to approve vendor: " + error.message);
    }
  };

  // ====== RETURN VENDOR (Received -> Today) ======
  const handleReturnVendor = async (vendorId) => {
    if (!window.confirm("Return this vendor to Today tab?")) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/local-schedules/vendors/${vendorId}/return`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        alert("Vendor returned to Today!");
        await fetchReceivedVendors();
      } else {
        throw new Error(result.message || "Failed to return vendor");
      }
    } catch (error) {
      console.error("Error returning vendor:", error);
      alert("Failed to return vendor: " + error.message);
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

  // ====== ADD VENDOR POPUP HANDLERS ======
  const handleOpenAddVendor = (scheduleId) => {
    setActiveScheduleForVendor(scheduleId);
    setVendorFormData({
      trip: "",
      tripId: null,
      vendor: "",
      vendorId: null,
      doNumbers: [""],
      arrivalTime: "",
    });
    setAddVendorPopup(true);
  };

  const handleTripChange = (value) => {
    const selectedTrip = tripOptions.find((t) => String(t.trip_no) === value);
    setVendorFormData((prev) => ({
      ...prev,
      trip: value,
      tripId: selectedTrip?.id || null,
      arrivalTime: selectedTrip?.arv_to || "",
    }));
  };

  const handleVendorChange = (value) => {
    const selectedVendor = vendorOptions.find(
      (v) => `${v.vendor_code} - ${v.vendor_name}` === value
    );
    setVendorFormData((prev) => ({
      ...prev,
      vendor: value,
      vendorId: selectedVendor?.id || null,
    }));
  };

  const handleDoNumberChange = (index, value) => {
    setVendorFormData((prev) => {
      const newDoNumbers = [...prev.doNumbers];
      newDoNumbers[index] = value;
      return { ...prev, doNumbers: newDoNumbers };
    });
  };

  const addDoNumberField = () => {
    setVendorFormData((prev) => ({
      ...prev,
      doNumbers: [...prev.doNumbers, ""],
    }));
  };

  const removeDoNumberField = (index) => {
    setVendorFormData((prev) => ({
      ...prev,
      doNumbers: prev.doNumbers.filter((_, i) => i !== index),
    }));
  };

  const handleAddVendorSubmit = async (e) => {
    e.preventDefault();

    if (
      !vendorFormData.tripId ||
      !vendorFormData.vendorId ||
      !vendorFormData.doNumbers[0]
    ) {
      alert("Please fill all required fields");
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/local-schedules/${activeScheduleForVendor}/vendors`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trip_id: vendorFormData.tripId,
            vendor_id: vendorFormData.vendorId,
            do_numbers: vendorFormData.doNumbers.filter((d) => d.trim()),
          }),
        }
      );

      const result = await response.json();
      if (result.success) {
        alert("Vendor added successfully");
        setAddVendorPopup(false);
        fetchSchedules();
      } else {
        alert(result.message || "Failed to add vendor");
      }
    } catch (error) {
      console.error("Error adding vendor:", error);
      alert("Failed to add vendor");
    }
  };

  // ====== ADD PART POPUP HANDLERS ======
  const handleOpenAddPart = (vendorId) => {
    setActiveVendorForPart(vendorId);
    setPartFormData({
      partCode: "",
      partName: "",
      qty: "",
      qtyBox: "",
      qtyPerBox: 1,
      unit: "PCS",
    });
    setAddPartPopup(true);
  };

  const handlePartCodeChange = async (value) => {
    setPartFormData((prev) => ({ ...prev, partCode: value }));

    if (value.trim()) {
      try {
        const response = await fetch(
          `${API_BASE}/api/kanban-master/qty-per-box?part_code=${value}`
        );
        const result = await response.json();
        if (result) {
          setPartFormData((prev) => ({
            ...prev,
            partName: result.part_name || "",
            qtyPerBox: result.qty_per_box || 1,
          }));
        }
      } catch (error) {
        console.error("Error fetching part info:", error);
      }
    }
  };

  const handleQtyChangeInPopup = (value) => {
    const qty = Number(value) || 0;
    const qtyPerBox = partFormData.qtyPerBox || 1;
    const qtyBox = qtyPerBox > 0 ? Math.ceil(qty / qtyPerBox) : 0;

    setPartFormData((prev) => ({
      ...prev,
      qty: value,
      qtyBox: qtyBox,
    }));
  };

  const handleAddPartSubmit = async (e) => {
    e.preventDefault();

    if (!partFormData.partCode) {
      alert("Please enter part code");
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/local-schedules/vendors/${activeVendorForPart}/parts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            part_code: partFormData.partCode,
            part_name: partFormData.partName,
            quantity: Number(partFormData.qty) || 0,
            quantity_box: Number(partFormData.qtyBox) || 0,
            unit: partFormData.unit || "PCS",
          }),
        }
      );

      const result = await response.json();
      if (result.success) {
        alert("Part added successfully");
        setAddPartPopup(false);
        fetchSchedules();
      } else {
        alert(result.message || "Failed to add part");
      }
    } catch (error) {
      console.error("Error adding part:", error);
      alert("Failed to add part");
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
    if (activeTab === "Today") {
      return;
    }

    setExpandedRows((prev) => {
      const newExpandedRows = {
        ...prev,
        [rowId]: !prev[rowId],
      };

      if (prev[rowId]) {
        setExpandedVendorRows((prevVendor) => {
          const newVendorRows = { ...prevVendor };
          Object.keys(newVendorRows).forEach((key) => {
            if (key.startsWith(`vendor_${rowId}_`)) {
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

      const today = new Date(currentDate);
      const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      const scheduledData = result.data;

      const schedulesToMove = scheduledData.filter((schedule) => {
        const rawDate = schedule.schedule_date;
        const scheduleDate =
          typeof rawDate === "string" ? rawDate.split("T")[0] : "";
        return scheduleDate === todayString;
      });

      if (schedulesToMove.length === 0) {
        return;
      }

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
        window.dispatchEvent(new CustomEvent("scheduleAutoMoved"));
      }
    } catch (error) {
      console.error("[Auto Move] Error:", error);
    }
  }, [currentDate]);

  useEffect(() => {
    const initialDelay = setTimeout(() => {
      autoMoveSchedulesToToday();
    }, 1000);

    const autoMoveInterval = setInterval(() => {
      autoMoveSchedulesToToday();
    }, 5000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(autoMoveInterval);
    };
  }, []);

  useEffect(() => {
    const handleAutoMoved = () => {
      if (activeTab === "Schedule" || activeTab === "Today") {
        fetchSchedules();
      }
    };

    window.addEventListener("scheduleAutoMoved", handleAutoMoved);
    return () => {
      window.removeEventListener("scheduleAutoMoved", handleAutoMoved);
    };
  }, [activeTab]);

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
      backgroundColor: "#fee2e2",
      color: "#991b1b",
      padding: "4px 8px",
      fontSize: "12px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      marginLeft: "4px",
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
    returnButton: {
      backgroundColor: "#fef3c7",
      color: "#92400e",
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

  // Popup styles
  const popupStyles = {
    overlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
    },
    container: {
      backgroundColor: "white",
      borderRadius: "8px",
      padding: "24px",
      width: "500px",
      maxWidth: "90vw",
      maxHeight: "90vh",
      overflow: "auto",
      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: "1px solid #e5e7eb",
      paddingBottom: "12px",
      marginBottom: "16px",
    },
    title: {
      fontSize: "18px",
      fontWeight: "600",
      color: "#374151",
      margin: 0,
    },
    closeButton: {
      background: "none",
      border: "none",
      fontSize: "24px",
      cursor: "pointer",
      color: "#6b7280",
      padding: "0",
      lineHeight: "1",
    },
    form: {
      display: "flex",
      flexDirection: "column",
      gap: "16px",
    },
    formGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "4px",
    },
    label: {
      fontSize: "12px",
      fontWeight: "500",
      color: "#374151",
    },
    input: {
      height: "36px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      padding: "0 12px",
      fontSize: "12px",
      outline: "none",
    },
    select: {
      height: "36px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      padding: "0 8px",
      fontSize: "12px",
      outline: "none",
    },
    doNumberRow: {
      display: "flex",
      gap: "8px",
      marginBottom: "8px",
    },
    removeButton: {
      padding: "8px",
      border: "1px solid #ef4444",
      borderRadius: "4px",
      background: "#fef2f2",
      color: "#ef4444",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    addDoButton: {
      padding: "6px 12px",
      border: "1px solid #3b82f6",
      borderRadius: "4px",
      background: "#eff6ff",
      color: "#3b82f6",
      cursor: "pointer",
      fontSize: "12px",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      width: "fit-content",
    },
    buttonGroup: {
      display: "flex",
      gap: "8px",
      justifyContent: "flex-end",
      marginTop: "8px",
    },
    cancelBtn: {
      padding: "8px 16px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      background: "white",
      cursor: "pointer",
      fontSize: "12px",
    },
    submitBtn: {
      padding: "8px 16px",
      border: "none",
      borderRadius: "4px",
      background: "#2563eb",
      color: "white",
      cursor: "pointer",
      fontSize: "12px",
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

  // ====== RENDER RECEIVED TAB ======
  const renderReceivedTab = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan="12" style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}>
            Loading data...
          </td>
        </tr>
      );
    }

    if (receivedVendors.length === 0) {
      return (
        <tr>
          <td colSpan="12" style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}>
            No data available
          </td>
        </tr>
      );
    }

    return receivedVendors.map((vendor, index) => (
      <React.Fragment key={vendor.id}>
        <tr>
          <td style={styles.tdWithLeftBorder}>{index + 1}</td>
          <td style={styles.tdWithLeftBorder}>
            <button
              style={styles.arrowButton}
              onClick={() => toggleVendorRowExpansion(`received_vendor_${vendor.id}`)}
            >
              {expandedVendorRows[`received_vendor_${vendor.id}`] ? (
                <MdArrowDropDown style={styles.arrowIcon} />
              ) : (
                <MdArrowRight style={styles.arrowIcon} />
              )}
            </button>
          </td>
          <td style={styles.tdWithLeftBorder}>{formatDate(vendor.schedule_date)}</td>
          <td style={styles.tdWithLeftBorder}>{vendor.stock_level || "-"}</td>
          <td style={styles.tdWithLeftBorder}>{vendor.model_name || "-"}</td>
          <td style={styles.tdWithLeftBorder}>{vendor.trip_no || "-"}</td>
          <td style={styles.tdWithLeftBorder}>
            {vendor.vendor_code ? `${vendor.vendor_code} - ${vendor.vendor_name}` : "-"}
          </td>
          <td style={styles.tdWithLeftBorder}>{vendor.do_numbers || "-"}</td>
          <td style={styles.tdWithLeftBorder}>{vendor.arrival_time || "-"}</td>
          <td style={styles.tdWithLeftBorder}>{vendor.total_pallet || 0}</td>
          <td style={styles.tdWithLeftBorder}>{vendor.total_item || 0}</td>
          <td style={styles.tdWithLeftBorder}>
            <button
              style={styles.checkButton}
              onClick={() => handleApproveVendor(vendor.id)}
              data-tooltip="Approve - Move to IQC Progress"
              onMouseEnter={showTooltip}
              onMouseLeave={hideTooltip}
            >
              <Check size={10} />
            </button>
            <button
              style={styles.returnButton}
              onClick={() => handleReturnVendor(vendor.id)}
              data-tooltip="Return to Today"
              onMouseEnter={showTooltip}
              onMouseLeave={hideTooltip}
            >
              <RotateCcw size={10} />
            </button>
            <button
              style={styles.deleteButton}
              onClick={() => handleDeleteVendor(vendor.id)}
              data-tooltip="Delete Vendor"
              onMouseEnter={showTooltip}
              onMouseLeave={hideTooltip}
            >
              <Trash2 size={10} />
            </button>
          </td>
        </tr>

        {vendor.move_by_name && (
          <tr>
            <td
              colSpan="12"
              style={{
                padding: "4px 8px",
                backgroundColor: "#f3f4f6",
                fontSize: "11px",
                color: "#6b7280",
                border: "0.5px solid #9fa8da",
              }}
            >
              Move By: {vendor.move_by_name} | {formatDateTime(vendor.move_at)}
            </td>
          </tr>
        )}

        {expandedVendorRows[`received_vendor_${vendor.id}`] && (
          <tr>
            <td colSpan="12" style={{ padding: 0, border: "none" }}>
              <div style={styles.thirdLevelTableContainer}>
                <table style={styles.thirdLevelTable}>
                  <colgroup>
                    <col style={{ width: "5%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "30%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "15%" }} />
                  </colgroup>
                  <thead>
                    <tr style={styles.thirdLevelTableHeader}>
                      <th style={styles.thirdLevelTh}>No</th>
                      <th style={styles.thirdLevelTh}>Part Code</th>
                      <th style={styles.thirdLevelTh}>Part Name</th>
                      <th style={styles.thirdLevelTh}>Qty</th>
                      <th style={styles.thirdLevelTh}>Qty Box</th>
                      <th style={styles.thirdLevelTh}>Prod Date</th>
                      <th style={styles.thirdLevelTh}>Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendor.parts && vendor.parts.length > 0 ? (
                      vendor.parts.map((part, partIndex) => (
                        <tr key={part.id}>
                          <td style={styles.thirdLevelTd}>{partIndex + 1}</td>
                          <td style={styles.thirdLevelTd}>{part.part_code || "-"}</td>
                          <td style={styles.thirdLevelTd}>{part.part_name || "-"}</td>
                          <td style={styles.thirdLevelTd}>{part.qty || 0}</td>
                          <td style={styles.thirdLevelTd}>{part.qty_box || 0}</td>
                          <td style={styles.thirdLevelTd}>
                            {part.prod_date ? formatDate(part.prod_date) : "-"}
                          </td>
                          <td style={styles.thirdLevelTd}>{part.remark || "-"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" style={{ textAlign: "center", padding: "10px", color: "#6b7280" }}>
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
    ));
  };

  // ====== RENDER TABLE BODY ======
  const renderTableBody = () => {
    if (loading) {
      return (
        <tr key="loading">
          <td colSpan="11" style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}>
            Loading data...
          </td>
        </tr>
      );
    }

    if (schedules.length === 0) {
      return (
        <tr>
          <td colSpan="11" style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}>
            No data available
          </td>
        </tr>
      );
    }

    return schedules.map((schedule, index) => (
      <React.Fragment key={`schedule-${schedule.id}`}>
        <tr key={`schedule-row-${schedule.id}`}>
          <td style={{ ...styles.expandedTd, ...styles.expandedWithLeftBorder, ...styles.emptyColumn }}>
            {index + 1}
          </td>

          {activeTab !== "Schedule" && activeTab !== "Today" && (
            <td style={styles.tdWithLeftBorder}>
              <input
                type="checkbox"
                checked={selectedScheduleIds.has(schedule.id)}
                onChange={(e) => toggleScheduleCheckbox(schedule.id, e.target.checked)}
                style={{ margin: "0 auto", display: "block", cursor: "pointer", width: "12px", height: "12px" }}
              />
            </td>
          )}

          <td style={{ ...styles.tdWithLeftBorder, ...styles.emptyColumn }}>
            {activeTab === "Today" ? (
              <MdArrowDropDown style={styles.arrowIcon} />
            ) : (
              <button style={styles.arrowButton} onClick={() => toggleRowExpansion(schedule.id)}>
                {expandedRows[schedule.id] ? (
                  <MdArrowDropDown style={styles.arrowIcon} />
                ) : (
                  <MdArrowRight style={styles.arrowIcon} />
                )}
              </button>
            )}
          </td>

          <td style={styles.tdWithLeftBorder}>
            {editingScheduleId === schedule.id ? (
              <input
                type="date"
                style={styles.inlineInput}
                value={editScheduleData.schedule_date || ""}
                onChange={(e) => setEditScheduleData((prev) => ({ ...prev, schedule_date: e.target.value }))}
              />
            ) : (
              formatDate(schedule.schedule_date)
            )}
          </td>

          <td style={styles.tdWithLeftBorder}>
            {editingScheduleId === schedule.id ? (
              <input
                type="text"
                style={styles.inlineInput}
                value={editScheduleData.stock_level || ""}
                onChange={(e) => setEditScheduleData((prev) => ({ ...prev, stock_level: e.target.value }))}
              />
            ) : (
              schedule.stock_level
            )}
          </td>

          <td style={styles.tdWithLeftBorder}>
            {editingScheduleId === schedule.id ? (
              <input
                type="text"
                style={styles.inlineInput}
                value={editScheduleData.model_name || ""}
                onChange={(e) => setEditScheduleData((prev) => ({ ...prev, model_name: e.target.value }))}
              />
            ) : (
              schedule.model_name
            )}
          </td>

          <td style={styles.tdWithLeftBorder}>{schedule.total_vendor || 0}</td>
          <td style={styles.tdWithLeftBorder}>{schedule.total_pallet || 0}</td>
          <td style={styles.tdWithLeftBorder}>{schedule.total_item || 0}</td>
          <td style={styles.tdWithLeftBorder}>
            {schedule.upload_by_name} | {formatDateTime(schedule.updated_at || schedule.created_at)}
          </td>

          {(activeTab === "Schedule" && canDeleteSchedule) || activeTab !== "Schedule" ? (
            <td style={styles.tdWithLeftBorder}>
              {activeTab === "Schedule" && !canDeleteSchedule ? null : (
                <>
                  {editingScheduleId === schedule.id ? (
                    <>
                      <button style={styles.saveButton} onClick={() => handleSaveEditSchedule(schedule.id)} data-tooltip="Save" onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
                        <Save size={10} />
                      </button>
                      <button style={styles.cancelButton} onClick={handleCancelEditSchedule} data-tooltip="Cancel" onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
                        <X size={10} />
                      </button>
                    </>
                  ) : (
                    <>
                      {activeTab === "Schedule" && canEditSchedule && (
                        <button style={styles.editButton} onClick={() => handleEditSchedule(schedule)} data-tooltip="Edit Schedule" onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
                          <Pencil size={10} />
                        </button>
                      )}
                      {canDeleteSchedule && (
                        <button style={styles.deleteButton} onClick={() => handleDeleteSchedule(schedule.id)} data-tooltip="Delete Schedule" onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
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

        {(activeTab === "Today" || expandedRows[schedule.id]) && (
          <tr key={`expanded-${schedule.id}`}>
            <td colSpan="11" style={{ padding: 0, border: "none" }}>
              <div style={styles.expandedTableContainer}>
                <table style={styles.expandedTable}>
                  <colgroup>
                    <col style={{ width: "25px" }} />
                    <col style={{ width: "25px" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "30%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "8%" }} />
                    {(activeTab === "Today" || activeTab === "Schedule") && <col style={{ width: "12%" }} />}
                  </colgroup>
                  <thead>
                    <tr style={styles.expandedTableHeader}>
                      <th style={styles.expandedTh}>No</th>
                      <th style={styles.expandedTh}></th>
                      <th style={styles.expandedTh}>Trip</th>
                      <th style={styles.expandedTh}>Vendor Name</th>
                      <th style={styles.expandedTh}>DO Number</th>
                      <th style={styles.expandedTh}>Arrival Time</th>
                      <th style={styles.expandedTh}>Total Pallet</th>
                      <th style={styles.expandedTh}>Total Item</th>
                      {(activeTab === "Today" || activeTab === "Schedule") && (
                        <th style={styles.expandedTh}>
                          Action
                          <button style={{ ...styles.addButton, marginLeft: "4px" }} onClick={() => handleOpenAddVendor(schedule.id)} data-tooltip="Add Vendor" onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
                            <Plus size={10} />
                          </button>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.vendors && schedule.vendors.length > 0 ? (
                      schedule.vendors.map((vendor, vendorIndex) => (
                        <React.Fragment key={vendor.id}>
                          <tr key={`vendor-row-${vendor.id}`}>
                            <td style={{ ...styles.expandedTd, ...styles.expandedWithLeftBorder, ...styles.emptyColumn }}>{vendorIndex + 1}</td>
                            <td style={{ ...styles.tdWithLeftBorder, ...styles.emptyColumn }}>
                              <button style={styles.arrowButton} onClick={() => toggleVendorRowExpansion(`vendor_${schedule.id}_${vendorIndex}`)}>
                                {expandedVendorRows[`vendor_${schedule.id}_${vendorIndex}`] ? <MdArrowDropDown style={styles.arrowIcon} /> : <MdArrowRight style={styles.arrowIcon} />}
                              </button>
                            </td>
                            <td style={styles.expandedTd}>{vendor.trip_no || "-"}</td>
                            <td style={styles.expandedTd}>{vendor.vendor_code ? `${vendor.vendor_code} - ${vendor.vendor_name}` : "-"}</td>
                            <td style={styles.expandedTd}>{vendor.do_numbers || "-"}</td>
                            <td style={styles.expandedTd}>{vendor.arrival_time || "-"}</td>
                            <td style={styles.expandedTd}>{vendor.total_pallet || 0}</td>
                            <td style={styles.expandedTd}>{vendor.total_item || 0}</td>

                            {(activeTab === "Today" || activeTab === "Schedule") && (
                              <td style={styles.expandedTd}>
                                <button style={styles.addButton} onClick={() => handleOpenAddPart(vendor.id)} data-tooltip="Add Part" onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
                                  <Plus size={10} />
                                </button>
                                {activeTab === "Today" && (
                                  <button style={styles.checkButton} onClick={() => handleMoveVendorToReceived(vendor.id, schedule.id)} data-tooltip="Move to Received" onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
                                    <CheckCircle size={10} />
                                  </button>
                                )}
                                {canDeleteSchedule && (
                                  <button style={styles.deleteButton} onClick={() => handleDeleteVendor(vendor.id)} data-tooltip="Delete Vendor" onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
                                    <Trash2 size={10} />
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>

                          {expandedVendorRows[`vendor_${schedule.id}_${vendorIndex}`] && (
                            <tr key={`parts-${vendor.id}`}>
                              <td colSpan={activeTab === "Today" || activeTab === "Schedule" ? "9" : "8"} style={{ padding: 0, border: "none" }}>
                                <div style={styles.thirdLevelTableContainer}>
                                  <table style={styles.thirdLevelTable}>
                                    <colgroup>
                                      <col style={{ width: "5%" }} />
                                      <col style={{ width: "12%" }} />
                                      <col style={{ width: "25%" }} />
                                      <col style={{ width: "8%" }} />
                                      <col style={{ width: "8%" }} />
                                      <col style={{ width: "8%" }} />
                                      {activeTab === "Today" && <col style={{ width: "15%" }} />}
                                      <col style={{ width: "10%" }} />
                                    </colgroup>
                                    <thead>
                                      <tr style={styles.thirdLevelTableHeader}>
                                        <th style={styles.expandedTh}>No</th>
                                        <th style={styles.thirdLevelTh}>Part Code</th>
                                        <th style={styles.thirdLevelTh}>Part Name</th>
                                        <th style={styles.thirdLevelTh}>Qty</th>
                                        <th style={styles.thirdLevelTh}>Qty Box</th>
                                        <th style={styles.thirdLevelTh}>Unit</th>
                                        {activeTab === "Today" && <th style={styles.thirdLevelTh}>Remark</th>}
                                        <th style={styles.thirdLevelTh}>Action</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {vendor.parts && vendor.parts.length > 0 ? (
                                        vendor.parts.map((part, partIndex) => (
                                          <tr key={part.id}>
                                            <td style={{ ...styles.expandedTd, ...styles.expandedWithLeftBorder, ...styles.emptyColumn }}>{partIndex + 1}</td>
                                            <td style={styles.thirdLevelTd}>
                                              {editingPartId === part.id ? (
                                                <input type="text" style={styles.inlineInput} value={editPartData.part_code || ""} onChange={(e) => setEditPartData((prev) => ({ ...prev, part_code: e.target.value }))} />
                                              ) : (
                                                part.part_code || "-"
                                              )}
                                            </td>
                                            <td style={styles.thirdLevelTd}>
                                              {editingPartId === part.id ? (
                                                <input type="text" style={styles.inlineInput} value={editPartData.part_name || ""} onChange={(e) => setEditPartData((prev) => ({ ...prev, part_name: e.target.value }))} />
                                              ) : (
                                                part.part_name || "-"
                                              )}
                                            </td>
                                            <td style={styles.thirdLevelTd}>
                                              {editingPartId === part.id ? (
                                                <input type="number" style={styles.inlineInput} value={editPartData.qty || 0} onChange={(e) => handleQtyChangeInEdit(e.target.value)} />
                                              ) : (
                                                part.qty || 0
                                              )}
                                            </td>
                                            <td style={styles.thirdLevelTd}>
                                              {editingPartId === part.id ? (
                                                <input type="number" style={styles.inlineInput} value={editPartData.qty_box || 0} readOnly />
                                              ) : (
                                                part.qty_box || 0
                                              )}
                                            </td>
                                            <td style={styles.thirdLevelTd}>
                                              {editingPartId === part.id ? (
                                                <input type="text" style={styles.inlineInput} value={editPartData.unit || "PCS"} onChange={(e) => setEditPartData((prev) => ({ ...prev, unit: e.target.value }))} />
                                              ) : (
                                                part.unit || "PCS"
                                              )}
                                            </td>
                                            {activeTab === "Today" && (
                                              <td style={styles.thirdLevelTd}>
                                                {editingPartId === part.id ? (
                                                  <input type="text" style={styles.inlineInput} value={editPartData.remark || ""} onChange={(e) => setEditPartData((prev) => ({ ...prev, remark: e.target.value }))} placeholder="Enter remark" />
                                                ) : (
                                                  part.remark || "-"
                                                )}
                                              </td>
                                            )}
                                            <td style={styles.thirdLevelTd}>
                                              {editingPartId === part.id ? (
                                                <>
                                                  <button style={styles.saveButton} onClick={() => handleSaveEditPart(part.id)} data-tooltip="Save" onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
                                                    <Save size={10} />
                                                  </button>
                                                  <button style={styles.cancelButton} onClick={handleCancelEditPart} data-tooltip="Cancel" onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
                                                    <X size={10} />
                                                  </button>
                                                </>
                                              ) : (
                                                <>
                                                  {activeTab === "Today" && canEditPartsInToday && (
                                                    <button style={styles.editButton} onClick={() => handleEditPart(part, vendor.id)} data-tooltip="Edit Part" onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
                                                      <Pencil size={10} />
                                                    </button>
                                                  )}
                                                  {canDeleteSchedule && (
                                                    <button style={styles.deleteButton} onClick={() => handleDeletePart(part.id)} data-tooltip="Delete Part" onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
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
                                          <td colSpan={activeTab === "Today" ? "8" : "7"} style={{ textAlign: "center", padding: "10px", color: "#6b7280" }}>
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
                        <td colSpan={activeTab === "Today" || activeTab === "Schedule" ? "9" : "8"} style={{ textAlign: "center", padding: "10px", color: "#6b7280" }}>
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

  return (
    <div style={styles.pageContainer}>
      {tooltip.visible && <div style={styles.tooltip}>{tooltip.content}</div>}

      <div style={styles.combinedHeaderFilter}>
        <div style={styles.headerRow}>
          <h1 style={styles.title}>Local Schedule</h1>
        </div>

        <div style={styles.filterRow}>
          <div style={styles.inputGroup}>
            <span style={styles.label}>Date From</span>
            <input type="date" style={styles.input} value={filters.dateFrom} onChange={(e) => handleFilterChange("dateFrom", e.target.value)} onFocus={handleInputFocus} onBlur={handleInputBlur} />
            <span style={styles.label}>Date To</span>
            <input type="date" style={styles.input} value={filters.dateTo} onChange={(e) => handleFilterChange("dateTo", e.target.value)} onFocus={handleInputFocus} onBlur={handleInputBlur} />
          </div>
          <div style={styles.inputGroup}>
            <span style={styles.label}>Search By</span>
            <input type="text" style={styles.input} placeholder="Vendor Name" value={filters.vendorName} onChange={(e) => handleFilterChange("vendorName", e.target.value)} onFocus={handleInputFocus} onBlur={handleInputBlur} />
            <input type="text" style={styles.input} placeholder="Part Code" value={filters.partCode} onChange={(e) => handleFilterChange("partCode", e.target.value)} onFocus={handleInputFocus} onBlur={handleInputBlur} />
            <button style={styles.button} onClick={() => { if (activeTab === "Received") { fetchReceivedVendors(); } else { fetchSchedules(); } }} onMouseEnter={(e) => handleButtonHover(e, true, "primary")} onMouseLeave={(e) => handleButtonHover(e, false, "primary")}>
              Search
            </button>
          </div>
        </div>
      </div>

      {canCreateSchedule && (
        <div style={styles.actionButtonsGroup}>
          <button style={{ ...styles.button, ...styles.primaryButton }} onMouseEnter={(e) => handleButtonHover(e, true, "primary")} onMouseLeave={(e) => handleButtonHover(e, false, "primary")} onClick={() => navigate("/local-schedule/add")}>
            <Plus size={16} />
            Create
          </button>
        </div>
      )}

      <div style={styles.tabsContainer}>
        {["New", "Schedule", "Today", "Received", "IQC Progress", "Sample", "Complete", "History"].map((tab) => (
          <button key={tab} style={{ ...styles.tabButton, ...(activeTab === tab && styles.tabButtonActive) }} onClick={() => setActiveTab(tab)} onMouseEnter={(e) => handleTabHover(e, true, activeTab === tab)} onMouseLeave={(e) => handleTabHover(e, false, activeTab === tab)}>
            {tab}
          </button>
        ))}
      </div>

      <div style={styles.tableContainer}>
        <div style={styles.tableBodyWrapper}>
          {activeTab === "Received" ? (
            <table style={{ ...styles.table, minWidth: "1400px", tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: "3%" }} />
                <col style={{ width: "3%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "6%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "6%" }} />
                <col style={{ width: "6%" }} />
                <col style={{ width: "15%" }} />
              </colgroup>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.thWithLeftBorder}>No</th>
                  <th style={styles.thWithLeftBorder}></th>
                  <th style={styles.thWithLeftBorder}>Schedule Date</th>
                  <th style={styles.thWithLeftBorder}>Stock Level</th>
                  <th style={styles.thWithLeftBorder}>Model</th>
                  <th style={styles.thWithLeftBorder}>Trip</th>
                  <th style={styles.thWithLeftBorder}>Vendor Name</th>
                  <th style={styles.thWithLeftBorder}>DO Number</th>
                  <th style={styles.thWithLeftBorder}>Arrival Time</th>
                  <th style={styles.thWithLeftBorder}>Total Pallet</th>
                  <th style={styles.thWithLeftBorder}>Total Item</th>
                  <th style={styles.thWithLeftBorder}>Action</th>
                </tr>
              </thead>
              <tbody>{renderReceivedTab()}</tbody>
            </table>
          ) : (
            <table style={{ ...styles.table, minWidth: "1200px", tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: "25px" }} />
                {activeTab !== "Schedule" && activeTab !== "Today" && <col style={{ width: "2.5%" }} />}
                <col style={{ width: "25px" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "25%" }} />
                {(activeTab !== "Schedule" || canDeleteSchedule) && <col style={{ width: "8%" }} />}
              </colgroup>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.expandedTh}>No</th>
                  {activeTab !== "Schedule" && activeTab !== "Today" && (
                    <th style={styles.thWithLeftBorder}>
                      {schedules.length > 1 && (
                        <input type="checkbox" checked={selectAll} onChange={(e) => handleSelectAllSchedules(e.target.checked)} style={{ margin: "0 auto", display: "block", cursor: "pointer", width: "12px", height: "12px" }} title="Select All" />
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
                  {(activeTab !== "Schedule" || canDeleteSchedule) && <th style={styles.thWithLeftBorder}>Action</th>}
                </tr>
              </thead>
              <tbody>{renderTableBody()}</tbody>
            </table>
          )}
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

      {activeTab !== "Received" && schedules.length > 0 && (
        <div style={styles.saveConfiguration}>
          {activeTab === "New" && (
            <button style={{ ...styles.button, ...styles.primaryButton, cursor: selectedScheduleIds.size === 0 ? "not-allowed" : "pointer", opacity: selectedScheduleIds.size === 0 ? 0.6 : 1 }} onClick={() => { if (selectedScheduleIds.size === 0) { alert("Please select at least one schedule"); return; } handleMoveBetweenTabs("New", "Schedule"); }} disabled={selectedScheduleIds.size === 0}>
              <Save size={16} />
              Move to Schedule
            </button>
          )}
          {activeTab === "IQC Progress" && (
            <button style={{ ...styles.button, ...styles.primaryButton, cursor: selectedScheduleIds.size === 0 ? "not-allowed" : "pointer", opacity: selectedScheduleIds.size === 0 ? 0.6 : 1 }} onClick={() => { if (selectedScheduleIds.size === 0) { alert("Please select at least one schedule"); return; } handleMoveBetweenTabs("IQC Progress", "Sample"); }} disabled={selectedScheduleIds.size === 0}>
              <Save size={16} />
              Move to Sample
            </button>
          )}
          {activeTab === "Sample" && (
            <button style={{ ...styles.button, ...styles.primaryButton, cursor: selectedScheduleIds.size === 0 ? "not-allowed" : "pointer", opacity: selectedScheduleIds.size === 0 ? 0.6 : 1 }} onClick={() => { if (selectedScheduleIds.size === 0) { alert("Please select at least one schedule"); return; } handleMoveBetweenTabs("Sample", "Complete"); }} disabled={selectedScheduleIds.size === 0}>
              <Save size={16} />
              Move to Complete
            </button>
          )}
        </div>
      )}

      {addVendorPopup && (
        <div style={popupStyles.overlay}>
          <div style={popupStyles.container}>
            <div style={popupStyles.header}>
              <h3 style={popupStyles.title}>Add Vendor Detail</h3>
              <button onClick={() => setAddVendorPopup(false)} style={popupStyles.closeButton}>×</button>
            </div>
            <form onSubmit={handleAddVendorSubmit} style={popupStyles.form}>
              <div style={popupStyles.formGroup}>
                <label style={popupStyles.label}>Trip:</label>
                <select value={vendorFormData.trip} onChange={(e) => handleTripChange(e.target.value)} style={popupStyles.select} required>
                  <option value="">Select Trip</option>
                  {tripOptions.map((t) => (<option key={t.id} value={String(t.trip_no)}>{t.trip_no}</option>))}
                </select>
              </div>
              <div style={popupStyles.formGroup}>
                <label style={popupStyles.label}>Arrival Time:</label>
                <input type="time" value={(vendorFormData.arrivalTime || "").slice(0, 5)} readOnly style={popupStyles.input} />
              </div>
              <div style={popupStyles.formGroup}>
                <label style={popupStyles.label}>Vendor:</label>
                <select value={vendorFormData.vendor} onChange={(e) => handleVendorChange(e.target.value)} style={popupStyles.select} required>
                  <option value="">Select Vendor</option>
                  {vendorOptions.map((v) => (<option key={v.id} value={`${v.vendor_code} - ${v.vendor_name}`}>{v.vendor_code} - {v.vendor_name}</option>))}
                </select>
              </div>
              <div style={popupStyles.formGroup}>
                <label style={popupStyles.label}>DO Number:</label>
                {vendorFormData.doNumbers.map((doNum, idx) => (
                  <div key={idx} style={popupStyles.doNumberRow}>
                    <input type="text" value={doNum} onChange={(e) => handleDoNumberChange(idx, e.target.value)} style={{ ...popupStyles.input, flex: 1 }} placeholder={`DO Number ${idx + 1}`} required={idx === 0} />
                    {vendorFormData.doNumbers.length > 1 && (<button type="button" onClick={() => removeDoNumberField(idx)} style={popupStyles.removeButton}><Trash2 size={14} /></button>)}
                  </div>
                ))}
                <button type="button" onClick={addDoNumberField} style={popupStyles.addDoButton}><Plus size={12} /> Add DO</button>
              </div>
              <div style={popupStyles.buttonGroup}>
                <button type="button" onClick={() => setAddVendorPopup(false)} style={popupStyles.cancelBtn}>Cancel</button>
                <button type="submit" style={popupStyles.submitBtn}>Add Vendor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {addPartPopup && (
        <div style={popupStyles.overlay}>
          <div style={popupStyles.container}>
            <div style={popupStyles.header}>
              <h3 style={popupStyles.title}>Add Part Detail</h3>
              <button onClick={() => setAddPartPopup(false)} style={popupStyles.closeButton}>×</button>
            </div>
            <form onSubmit={handleAddPartSubmit} style={popupStyles.form}>
              <div style={popupStyles.formGroup}>
                <label style={popupStyles.label}>Part Code:</label>
                <input type="text" value={partFormData.partCode} onChange={(e) => handlePartCodeChange(e.target.value)} style={popupStyles.input} placeholder="Enter part code" required />
              </div>
              <div style={popupStyles.formGroup}>
                <label style={popupStyles.label}>Part Name:</label>
                <input type="text" value={partFormData.partName} style={{ ...popupStyles.input, backgroundColor: "#f3f4f6" }} placeholder="Auto-filled from master" readOnly />
              </div>
              <div style={popupStyles.formGroup}>
                <label style={popupStyles.label}>Qty:</label>
                <input type="number" value={partFormData.qty} onChange={(e) => handleQtyChangeInPopup(e.target.value)} style={popupStyles.input} placeholder="0" />
              </div>
              <div style={popupStyles.formGroup}>
                <label style={popupStyles.label}>Qty Box (Auto-calculated):</label>
                <input type="number" value={partFormData.qtyBox} style={{ ...popupStyles.input, backgroundColor: "#f3f4f6" }} readOnly />
              </div>
              <div style={popupStyles.formGroup}>
                <label style={popupStyles.label}>Unit:</label>
                <input type="text" value={partFormData.unit} onChange={(e) => setPartFormData((prev) => ({ ...prev, unit: e.target.value }))} style={popupStyles.input} />
              </div>
              <div style={popupStyles.buttonGroup}>
                <button type="button" onClick={() => setAddPartPopup(false)} style={popupStyles.cancelBtn}>Cancel</button>
                <button type="submit" style={popupStyles.submitBtn}>Add Part</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MHLocalSchedulePage;