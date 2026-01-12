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
  Calendar,
} from "lucide-react";
import { Helmet } from "react-helmet";
import timerService from "../../utils/TimerService";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const getAuthUser = () => {
  try {
    return JSON.parse(localStorage.getItem("auth_user") || "null");
  } catch {
    return null;
  }
};

const LocalSchedulePage = ({ sidebarVisible }) => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());

  // INVENTORY ONLY - FULL ACCESS
  const canCreateSchedule = true;
  const canDeleteSchedule = true;
  const canEditSchedule = true;
  const canEditPartsInToday = true;

  // STATE UNTUK DATA
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedScheduleIds, setSelectedScheduleIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [expandedVendorRows, setExpandedVendorRows] = useState({});
  const [activeTab, setActiveTab] = useState("New");

  // STATE FOR EDITING
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [editScheduleData, setEditScheduleData] = useState({});
  const [editingPartId, setEditingPartId] = useState(null);
  const [editPartData, setEditPartData] = useState({});

  // STATE FOR ADD VENDOR POPUP (same as AddLocalSchedulePage.js)
  const [addVendorDetail, setAddVendorDetail] = useState(false);
  const [activeHeaderIdForVendorForm, setActiveHeaderIdForVendorForm] =
    useState(null);
  const [tripOptions, setTripOptions] = useState([]);
  const [vendorOptions, setVendorOptions] = useState([]);
  const [addVendorFormData, setAddVendorFormData] = useState({
    trip: "",
    vendor: "",
    doNumbers: [""],
    arrivalTime: "",
  });

  // STATE FOR ADD PART POPUP (same as AddLocalSchedulePage.js)
  const [addVendorPartDetail, setAddVendorPartDetail] = useState(false);
  const [activeVendorContext, setActiveVendorContext] = useState(null);
  const [selectedPartsInPopup, setSelectedPartsInPopup] = useState([]);
  const [addVendorPartFormData, setAddVendorPartFormData] = useState({
    trip: "",
    vendor: "",
    doNumbers: [""],
    arrivalTime: "",
    parts: [],
  });

  // STATE FOR RECEIVED TAB
  const [receivedVendors, setReceivedVendors] = useState([]);

  // STATE FOR IQC PROGRESS TAB
  const [iqcProgressVendors, setIqcProgressVendors] = useState([]);
  const [editingIqcPartId, setEditingIqcPartId] = useState(null);
  const [editIqcPartData, setEditIqcPartData] = useState({});
  const [qcChecksComplete, setQcChecksComplete] = useState([]);

  // STATE FOR SAMPLE TAB
  const [sampleVendors, setSampleVendors] = useState([]);
  const [editingSamplePartId, setEditingSamplePartId] = useState(null);
  const [editSamplePartData, setEditSamplePartData] = useState({});

  // STATE FOR PRODUCTION DATES POPUP (Multiple Prod Dates - Today Tab)
  const [showProdDatesPopup, setShowProdDatesPopup] = useState(false);
  const [activeProdDatesPart, setActiveProdDatesPart] = useState(null);
  const [tempProdDates, setTempProdDates] = useState([]);

  // STATE FOR ADD SAMPLE DATE POPUP (IQC Progress Tab)
  const [showAddSamplePopup, setShowAddSamplePopup] = useState(false);
  const [activeSamplePart, setActiveSamplePart] = useState(null);
  const [newSampleDate, setNewSampleDate] = useState("");

  // STATE FOR COMPLETE TAB
  const [completeVendors, setCompleteVendors] = useState([]);

  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    vendorName: "",
    partCode: "",
  });

  // ====== FETCH QC CHECKS COMPLETE ======
  const fetchQcChecksComplete = async () => {
    try {
      // PERBAIKAN: Filter hanya status=Complete
      const response = await fetch(`${API_BASE}/api/qc-checks?status=Complete`);
      const result = await response.json();
      if (result.success) {
        setQcChecksComplete(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching QC checks:", error);
      setQcChecksComplete([]);
    }
  };

  // Helper function untuk check apakah part + prod_date sudah Complete di QC Check
  const isProductionDateComplete = (partCode, prodDate) => {
    if (!partCode || !prodDate) return false;
    const normalizedProdDate = prodDate.split("T")[0];
    return qcChecksComplete.some((qc) => {
      const qcProdDate = qc.production_date
        ? qc.production_date.split("T")[0]
        : "";
      // PERBAIKAN: Tambah pengecekan status === 'Complete'
      return (
        qc.part_code === partCode &&
        qcProdDate === normalizedProdDate &&
        qc.status === "Complete"
      );
    });
  };

  // Helper function untuk mendapatkan status dan sample dates
  // Status otomatis: SAMPLE jika ada tanggal yang belum Complete, PASS jika semua sudah Complete
  const getPartSampleStatus = (part) => {
    const prodDates =
      part.prod_dates || (part.prod_date ? [part.prod_date] : []);

    // Jika tidak ada prod_dates, tampilkan -
    if (prodDates.length === 0) {
      return { status: "-", sampleDates: [] };
    }

    // Hitung sample dates (tanggal yang belum Complete di qc_checks)
    const sampleDates = [];
    let allComplete = true;

    prodDates.forEach((date) => {
      const normalizedDate = date.split("T")[0];
      const isComplete = isProductionDateComplete(
        part.part_code,
        normalizedDate
      );
      if (!isComplete) {
        allComplete = false;
        sampleDates.push(normalizedDate);
      }
    });

    // Otomatis tentukan status berdasarkan qc_checks
    if (allComplete && prodDates.length > 0) {
      return { status: "PASS", sampleDates: [] };
    }

    return { status: "SAMPLE", sampleDates };
  };

  // ====== TABLE CONFIGURATION PER TAB ======
  const tableConfig = {
    New: {
      mainTable: {
        cols: [
          "26px",
          "2%",
          "25px",
          "15%",
          "15%",
          "12%",
          "8%",
          "8%",
          "8%",
          "25%",
          "4%",
        ],
      },
      vendorTable: {
        marginLeft: "74.5px",
        cols: ["26px", "26px", "15%", "36%", "17%", "12%", "8%", "8%"],
      },
      partsTable: {
        marginLeft: "51px",
        cols: ["2.4%", "12%", "30%", "8%", "8%", "8%", "10%", "4%"],
      },
    },
    Schedule: {
      mainTable: {
        cols: [
          "26px",
          "26px",
          "15%",
          "12%",
          "12%",
          "8%",
          "8%",
          "8%",
          "25%",
          "8.5%",
        ],
      },
      vendorTable: {
        marginLeft: "51.5px",
        cols: ["26px", "26px", "12%", "35%", "15%", "15%", "8%", "8%", "6.7%"],
      },
      partsTable: {
        marginLeft: "51px",
        cols: ["2%", "12%", "30%", "8%", "8%", "8%", "10%", "4%"],
      },
    },
    Today: {
      mainTable: {
        cols: [
          "26px",
          "25px",
          "15%",
          "10%",
          "12%",
          "8%",
          "8%",
          "8%",
          "23%",
          "6%",
        ],
      },
      vendorTable: {
        marginLeft: "50.7px",
        cols: ["26px", "26px", "10%", "36%", "15%", "10%", "8%", "8%", "9.3%"],
      },
      partsTable: {
        marginLeft: "51px",
        cols: ["2.8%", "10%", "22%", "7%", "7%", "6%", "18%", "12%", "7%"],
      },
    },

    Received: {
      mainTable: {
        cols: [
          "26px",
          "26px",
          "30%",
          "12%",
          "8%",
          "8%",
          "15%",
          "10%",
          "10%",
          "10%",
          "12%",
          "25%",
          "12%",
        ],
      },
      partsTable: {
        marginLeft: "51px",
        cols: ["2%", "12%", "25%", "10%", "10%", "15%", "20%"],
      },
    },

    "IQC Progress": {
      mainTable: {
        cols: [
          "26px",
          "26px",
          "30%",
          "12%",
          "8%",
          "8%",
          "15%",
          "10%",
          "10%",
          "10%",
          "12%",
          "25%",
          "5%",
        ],
      },
      partsTable: {
        marginLeft: "51px",
        cols: [
          "2%",
          "10%",
          "25%",
          "7%",
          "7%",
          "6%",
          "15%",
          "12%",
          "10%",
          "20%",
          "6%",
        ],
      },
    },
    Sample: {
      mainTable: {
        cols: [
          "26px",
          "26px",
          "30%",
          "12%",
          "8%",
          "8%",
          "15%",
          "10%",
          "10%",
          "10%",
          "12%",
          "25%",
          "5%",
        ],
      },
      partsTable: {
        marginLeft: "51px",
        cols: [
          "2%",
          "10%",
          "25%",
          "7%",
          "7%",
          "6%",
          "15%",
          "10%",
          "12%",
          "20%",
          "6%",
        ],
      },
    },
    Complete: {
      mainTable: {
        // No, toggle, Vendor Name, Stock Level, Model, Trip, DO Number, Total Pallet, Total Item, Arrival Time, Schedule Date, Move By (tanpa Action)
        cols: [
          "26px", // No
          "26px", // toggle
          "20%", // Vendor Name
          "6%", // Stock Level
          "8%", // Model
          "5%", // Trip
          "10%", // DO Number
          "7%", // Total Pallet
          "7%", // Total Item
          "8%", // Arrival Time
          "9%", // Schedule Date
          "18%", // Move By
        ],
      },
      partsTable: {
        marginLeft: "51px",
        // No, Part Code, Part Name, Qty, Qty Box, Unit, Prod Date, Status, Remark (tanpa Action)
        cols: [
          "3%",
          "12%",
          "25%",
          "8%",
          "8%",
          "7%",
          "12%",
          "10%",
          "12%",
          "15%",
        ],
      },
    },
  };

  // Helper function untuk render colgroup
  const renderColgroup = (cols) => (
    <colgroup>
      {cols.map((width, index) => (
        <col key={index} style={{ width }} />
      ))}
    </colgroup>
  );

  // Get current tab config dengan fallback ke Today
  const getCurrentConfig = () => tableConfig[activeTab] || tableConfig.Today;
  useEffect(() => {
    fetchQcChecksComplete();
    if (activeTab === "Received") {
      fetchReceivedVendors();
    } else if (activeTab === "IQC Progress") {
      fetchIqcProgressVendors();
    } else if (activeTab === "Sample") {
      fetchSampleVendors();
    } else if (activeTab === "Complete") {
      fetchCompleteVendors();
    } else {
      fetchSchedules();
    }
  }, [activeTab]);

  useEffect(() => {
    fetchTripOptions();
    fetchVendorOptions();
  }, []);

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
      // Handle berbagai format response
      if (Array.isArray(data)) {
        setTripOptions(data);
      } else if (data && Array.isArray(data.data)) {
        setTripOptions(data.data);
      } else {
        setTripOptions([]);
      }
    } catch (error) {
      console.error("Error fetching trips:", error);
      setTripOptions([]);
    }
  };

  const fetchVendorOptions = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/vendors`);
      const data = await response.json();
      // Handle berbagai format response
      let vendorsArray = [];
      if (Array.isArray(data)) {
        vendorsArray = data;
      } else if (data && Array.isArray(data.data)) {
        vendorsArray = data.data;
      } else if (data && data.success && Array.isArray(data.data)) {
        vendorsArray = data.data;
      }
      setVendorOptions(vendorsArray);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      setVendorOptions([]);
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

  const fetchIqcProgressVendors = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/local-schedules/iqc-progress-vendors`
      );
      const result = await response.json();
      if (result.success) {
        setIqcProgressVendors(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching IQC Progress vendors:", error);
      setIqcProgressVendors([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSampleVendors = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/local-schedules/sample-vendors`
      );
      const result = await response.json();
      if (result.success) {
        setSampleVendors(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching Sample vendors:", error);
      setSampleVendors([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompleteVendors = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/local-schedules/complete-vendors`
      );
      const result = await response.json();
      if (result.success) {
        setCompleteVendors(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching Complete vendors:", error);
      setCompleteVendors([]);
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
      };

      const statusForAPI = tabToStatus[activeTab] || "New";
      let url = `${API_BASE}/api/local-schedules?status=${statusForAPI}`;

      const response = await fetch(url);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const result = await response.json();

      if (result.success) {
        let filteredData = result.data || [];

        if (activeTab === "Today") {
          const now = new Date();
          const today = `${now.getFullYear()}-${String(
            now.getMonth() + 1
          ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

          filteredData = filteredData.filter((schedule) => {
            try {
              const rawDate = schedule.schedule_date;
              let scheduleDate =
                typeof rawDate === "string" ? rawDate.split("T")[0] : "";
              return scheduleDate === today;
            } catch (e) {
              return false;
            }
          });
        }

        setSchedules(filteredData);
        setSelectedScheduleIds(new Set());
        setSelectAll(false);
      }
    } catch (error) {
      console.error("Error fetching schedules:", error);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  // ====== EDIT SCHEDULE ======
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
          headers: { "Content-Type": "application/json" },
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
        setEditingScheduleId(null);
        setEditScheduleData({});
        await fetchSchedules();
      } else {
        throw new Error(result.message || "Failed to update schedule");
      }
    } catch (error) {
      alert("Failed to update schedule: " + error.message);
    }
  };

  // ====== EDIT PART ======
  const handleEditPart = (part, vendorId) => {
    setEditingPartId(part.id);
    // Gabungkan prod_date dengan prod_dates untuk editing
    const existingDates = part.prod_dates ? [...part.prod_dates] : [];
    if (part.prod_date && !existingDates.includes(part.prod_date.split("T")[0])) {
      existingDates.unshift(part.prod_date.split("T")[0]);
    }
    setEditPartData({
      vendorId: vendorId,
      part_code: part.part_code || "",
      part_name: part.part_name || "",
      qty: part.qty || "",
      qty_box: part.qty_box || 0,
      unit: part.unit || "PCS",
      remark: part.remark || "",
      prod_date: part.prod_date ? part.prod_date.split("T")[0] : "",
      prod_dates: existingDates.length > 0 ? existingDates : [""],
    });
  };

  const handleCancelEditPart = () => {
    setEditingPartId(null);
    setEditPartData({});
  };

  const fetchQtyPerBox = async (partCode) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/kanban-master/qty-per-box?part_code=${partCode}`
      );
      const result = await response.json();
      return result?.qty_per_box || result?.item?.qty_per_box || 1;
    } catch (error) {
      return 1;
    }
  };

  const handleQtyChangeInEdit = async (value) => {
    const qty = Number(value) || 0;
    const partCode = editPartData.part_code;
    const qtyPerBox = await fetchQtyPerBox(partCode);
    const qtyBox = qtyPerBox > 0 ? Math.ceil(qty / qtyPerBox) : 0;
    setEditPartData((prev) => ({ ...prev, qty: value, qty_box: qtyBox }));
  };

  const handleSaveEditPart = async (partId) => {
    try {
      // Filter out empty dates
      const validDates = (editPartData.prod_dates || []).filter((d) => d && d.trim() !== "");
      
      const response = await fetch(
        `${API_BASE}/api/local-schedules/parts/${partId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            part_code: editPartData.part_code,
            part_name: editPartData.part_name,
            quantity: editPartData.qty,
            quantity_box: editPartData.qty_box,
            unit: editPartData.unit,
            remark: editPartData.remark,
            prod_date: validDates[0] || null,
            prod_dates: validDates,
          }),
        }
      );

      const result = await response.json();
      if (response.ok && result.success) {
        setEditingPartId(null);
        setEditPartData({});
        await fetchSchedules();
      } else {
        throw new Error(result.message || "Failed to update part");
      }
    } catch (error) {
      alert("Failed to update part: " + error.message);
    }
  };

  // ====== PRODUCTION DATES POPUP HANDLERS (Multiple Dates) ======
  const handleOpenProdDatesPopup = (part) => {
    setActiveProdDatesPart(part);
    // Gabungkan prod_date dengan prod_dates
    const existingDates = part.prod_dates ? [...part.prod_dates] : [];
    if (
      part.prod_date &&
      !existingDates.includes(part.prod_date.split("T")[0])
    ) {
      existingDates.unshift(part.prod_date.split("T")[0]);
    }
    setTempProdDates(existingDates.length > 0 ? existingDates : [""]);
    setShowProdDatesPopup(true);
  };

  const handleCloseProdDatesPopup = () => {
    setShowProdDatesPopup(false);
    setActiveProdDatesPart(null);
    setTempProdDates([]);
  };

  const handleAddProdDate = () => {
    setTempProdDates((prev) => [...prev, ""]);
  };

  const handleRemoveProdDate = (index) => {
    setTempProdDates((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProdDateChange = (index, value) => {
    setTempProdDates((prev) => prev.map((d, i) => (i === index ? value : d)));
  };

  const handleSaveProdDates = async () => {
    if (!activeProdDatesPart) return;

    // Filter out empty dates
    const validDates = tempProdDates.filter((d) => d && d.trim() !== "");

    try {
      const response = await fetch(
        `${API_BASE}/api/local-schedules/parts/${activeProdDatesPart.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prod_dates: validDates,
            prod_date: validDates[0] || null,
          }),
        }
      );

      const result = await response.json();
      if (response.ok && result.success) {
        handleCloseProdDatesPopup();
        await fetchSchedules();
      } else {
        throw new Error(result.message || "Failed to update production dates");
      }
    } catch (error) {
      alert("Failed to update production dates: " + error.message);
    }
  };

  // ====== ADD SAMPLE DATE HANDLERS (IQC Progress) ======
  const handleOpenAddSamplePopup = (part) => {
    setActiveSamplePart(part);
    setNewSampleDate("");
    setShowAddSamplePopup(true);
  };

  const handleCloseAddSamplePopup = () => {
    setShowAddSamplePopup(false);
    setActiveSamplePart(null);
    setNewSampleDate("");
  };

  const handleAddSampleDate = async () => {
    if (!activeSamplePart || !newSampleDate) return;

    const existingProdDates = activeSamplePart.prod_dates
      ? [...activeSamplePart.prod_dates]
      : [];
    if (
      activeSamplePart.prod_date &&
      !existingProdDates.includes(activeSamplePart.prod_date.split("T")[0])
    ) {
      existingProdDates.unshift(activeSamplePart.prod_date.split("T")[0]);
    }

    // Tambahkan date baru jika belum ada
    if (!existingProdDates.includes(newSampleDate)) {
      existingProdDates.push(newSampleDate);
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/local-schedules/parts/${activeSamplePart.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prod_dates: existingProdDates,
          }),
        }
      );

      const result = await response.json();
      if (response.ok && result.success) {
        handleCloseAddSamplePopup();
        await fetchIqcProgressVendors();
      } else {
        throw new Error(result.message || "Failed to add sample date");
      }
    } catch (error) {
      alert("Failed to add sample date: " + error.message);
    }
  };

  // ====== DELETE FUNCTIONS ======
  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm("Are you sure you want to delete this schedule?"))
      return;

    try {
      const response = await fetch(
        `${API_BASE}/api/local-schedules/${scheduleId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }
      );

      const result = await response.json();
      if (response.ok && result.success) {
        alert("Schedule deleted successfully!");
        setSelectedScheduleIds((prev) => {
          const next = new Set(prev);
          next.delete(scheduleId);
          return next;
        });
        await fetchSchedules();
      } else {
        throw new Error(result.message || "Failed to delete schedule");
      }
    } catch (error) {
      alert("Failed to delete schedule: " + error.message);
    }
  };

  const handleDeleteVendor = async (vendorId) => {
    if (!window.confirm("Are you sure you want to delete this vendor?")) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/local-schedules/vendors/${vendorId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }
      );

      const result = await response.json();
      if (response.ok && result.success) {
        alert("Vendor deleted successfully!");
        if (activeTab === "Received") {
          await fetchReceivedVendors();
        } else {
          await fetchSchedules();
        }
      } else {
        throw new Error(result.message || "Failed to delete vendor");
      }
    } catch (error) {
      alert("Failed to delete vendor: " + error.message);
    }
  };

  const handleDeletePart = async (partId) => {
    if (!window.confirm("Are you sure you want to delete this part?")) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/local-schedules/parts/${partId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
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
      alert("Failed to delete part: " + error.message);
    }
  };

  // ====== CHECKBOX FUNCTIONS ======
  const toggleScheduleCheckbox = (scheduleId, checked) => {
    setSelectedScheduleIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(scheduleId);
      else next.delete(scheduleId);
      return next;
    });
  };

  const handleSelectAllSchedules = (checked) => {
    if (checked) {
      setSelectedScheduleIds(new Set(schedules.map((s) => s.id)));
    } else {
      setSelectedScheduleIds(new Set());
    }
    setSelectAll(checked);
  };

  // ====== MOVE FUNCTIONS ======
  const handleMoveVendorToReceived = async (vendorId, scheduleId) => {
    if (!window.confirm("Move this vendor to Received?")) return;

    try {
      const authUser = getAuthUser();
      const moveByName = authUser?.emp_name || authUser?.name || "System";

      const response = await fetch(
        `${API_BASE}/api/local-schedules/vendors/${vendorId}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "Received", moveByName: moveByName }),
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
      alert("Failed to move vendor: " + error.message);
    }
  };

  const handleApproveVendor = async (vendorId) => {
    if (!window.confirm("Approve this vendor and move to IQC Progress?"))
      return;

    try {
      const authUser = getAuthUser();
      const approveByName = authUser?.emp_name || "Unknown";

      const response = await fetch(
        `${API_BASE}/api/local-schedules/vendors/${vendorId}/approve`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approveByName }),
        }
      );

      const result = await response.json();
      if (response.ok && result.success) {
        alert("Vendor approved!");
        await fetchReceivedVendors();
      } else {
        throw new Error(result.message || "Failed to approve vendor");
      }
    } catch (error) {
      alert("Failed to approve vendor: " + error.message);
    }
  };

  // ====== MOVE PART TO SAMPLE (Create QC Check entries) ======
  const handleMovePartToSample = async (part, vendor) => {
    // PERBAIKAN: Terima vendor object, bukan hanya vendorId
    const vendorName = vendor.vendor_name || "";
    const vendorType = "Local"; // Karena ini LocalSchedulePage

    const { status, sampleDates } = getPartSampleStatus(part);

    if (status === "PASS") {
      alert("This part already has PASS status. No sampling needed.");
      return;
    }

    if (sampleDates.length === 0) {
      alert("No sample dates to check. Please add production dates first.");
      return;
    }

    if (
      !window.confirm(
        `Move this part to Sample/Current Check for dates: ${sampleDates
          .map((d) => formatDate(d))
          .join(", ")}?`
      )
    )
      return;

    try {
      const authUser = getAuthUser();
      const moveByName = authUser?.emp_name || "Unknown";

      // Create QC Check entries for each sample date
      for (const sampleDate of sampleDates) {
        const qcCheckData = {
          part_code: part.part_code,
          part_name: part.part_name,
          production_date: sampleDate,
          // Note: Don't send vendor_id because local_schedule_vendors.id != vendor_detail.id
          vendor_name: vendorName,
          vendor_type: vendorType,
          local_schedule_part_id: part.id,
          data_from: "Sample",
          created_by: moveByName,
        };

        const response = await fetch(`${API_BASE}/api/qc-checks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(qcCheckData),
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to create QC Check");
        }
      }

      // Update part status to SAMPLE
      await fetch(`${API_BASE}/api/local-schedules/parts/${part.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SAMPLE" }),
      });

      alert("Part moved to Current Check successfully!");
      await fetchIqcProgressVendors();
      await fetchQcChecksComplete();
    } catch (error) {
      alert("Failed to move part to sample: " + error.message);
    }
  };

  // ====== HANDLERS FOR IQC PROGRESS TAB ======
  const handleMoveVendorToSample = async (vendorId) => {
    if (!window.confirm("Move this vendor to Sample? All SAMPLE parts will be sent to Current Check.")) return;

    try {
      const authUser = getAuthUser();
      const moveByName = authUser?.emp_name || "Unknown";

      // Find the vendor from iqcProgressVendors to get parts
      const vendor = iqcProgressVendors.find(v => v.id === vendorId);
      if (!vendor) {
        throw new Error("Vendor not found");
      }

      // Create QC Check entries for all SAMPLE parts
      if (vendor.parts && vendor.parts.length > 0) {
        for (const part of vendor.parts) {
          const { status, sampleDates } = getPartSampleStatus(part);
          
          // Only create QC checks for SAMPLE status parts with sample dates
          if (status === "SAMPLE" && sampleDates.length > 0) {
            for (const sampleDate of sampleDates) {
              const qcCheckData = {
                part_code: part.part_code,
                part_name: part.part_name,
                production_date: sampleDate,
                // Note: Don't send vendor_id because local_schedule_vendors.id != vendor_detail.id
                vendor_name: vendor.vendor_name || "",
                vendor_type: "Local",
                local_schedule_part_id: part.id,
                data_from: "Sample",
                created_by: moveByName,
                skip_duplicate_check: true, // Skip duplicate check since we're doing vendor-level move
              };

              await fetch(`${API_BASE}/api/qc-checks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(qcCheckData),
              });
            }
          }
        }
      }

      // Move vendor to Sample tab
      const response = await fetch(
        `${API_BASE}/api/local-schedules/vendors/${vendorId}/move-to-sample`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ moveByName }),
        }
      );

      const result = await response.json();
      if (response.ok && result.success) {
        alert("Vendor moved to Sample! SAMPLE parts sent to Current Check.");
        await fetchIqcProgressVendors();
      } else {
        throw new Error(result.message || "Failed to move vendor");
      }
    } catch (error) {
      alert("Failed to move vendor: " + error.message);
    }
  };

  const handleEditIqcPart = (part) => {
    setEditingIqcPartId(part.id);
    // Gabungkan prod_date dengan prod_dates untuk editing
    const existingDates = part.prod_dates ? [...part.prod_dates] : [];
    if (part.prod_date && !existingDates.includes(part.prod_date.split("T")[0])) {
      existingDates.unshift(part.prod_date.split("T")[0]);
    }
    setEditIqcPartData({
      status: part.status || "",
      remark: part.remark || "",
      prod_dates: existingDates.length > 0 ? existingDates : [""],
    });
  };

  const handleCancelEditIqcPart = () => {
    setEditingIqcPartId(null);
    setEditIqcPartData({});
  };

  const handleSaveEditIqcPart = async (partId) => {
    try {
      // Filter out empty dates
      const validDates = (editIqcPartData.prod_dates || []).filter((d) => d && d.trim() !== "");
      
      const response = await fetch(
        `${API_BASE}/api/local-schedules/parts/${partId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: editIqcPartData.status || null,
            remark: editIqcPartData.remark || null,
            prod_date: validDates[0] || null,
            prod_dates: validDates,
          }),
        }
      );

      const result = await response.json();
      if (response.ok && result.success) {
        setEditingIqcPartId(null);
        setEditIqcPartData({});
        await fetchIqcProgressVendors();
      } else {
        throw new Error(result.message || "Failed to update part");
      }
    } catch (error) {
      alert("Failed to update part: " + error.message);
    }
  };

  // ====== HANDLERS FOR SAMPLE TAB ======
  const handleMoveVendorToComplete = async (vendorId) => {
    if (!window.confirm("Move this vendor to Complete?")) return;

    try {
      const authUser = getAuthUser();
      const moveByName = authUser?.emp_name || "Unknown";

      const response = await fetch(
        `${API_BASE}/api/local-schedules/vendors/${vendorId}/move-to-complete`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ moveByName }),
        }
      );

      const result = await response.json();
      if (response.ok && result.success) {
        alert("Vendor moved to Complete!");
        await fetchSampleVendors();
      } else {
        throw new Error(result.message || "Failed to move vendor");
      }
    } catch (error) {
      alert("Failed to move vendor: " + error.message);
    }
  };

  const handleEditSamplePart = (part) => {
    setEditingSamplePartId(part.id);
    setEditSamplePartData({
      status: part.status || "",
      remark: part.remark || "",
    });
  };

  const handleCancelEditSamplePart = () => {
    setEditingSamplePartId(null);
    setEditSamplePartData({});
  };

  const handleSaveEditSamplePart = async (partId) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/local-schedules/parts/${partId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: editSamplePartData.status || null,
            remark: editSamplePartData.remark || null,
          }),
        }
      );

      const result = await response.json();
      if (response.ok && result.success) {
        setEditingSamplePartId(null);
        setEditSamplePartData({});
        await fetchSampleVendors();
      } else {
        throw new Error(result.message || "Failed to update part");
      }
    } catch (error) {
      alert("Failed to update part: " + error.message);
    }
  };

  const handleReturnVendor = async (vendorId) => {
    if (!window.confirm("Return this vendor to Today tab?")) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/local-schedules/vendors/${vendorId}/return`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
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
      alert("Failed to return vendor: " + error.message);
    }
  };

  const handleMoveBetweenTabs = async (fromTab, toTab) => {
    if (
      !window.confirm(
        `Move ${selectedScheduleIds.size} schedule(s) to ${toTab}?`
      )
    )
      return;

    try {
      const scheduleIds = Array.from(selectedScheduleIds);
      const response = await fetch(
        `${API_BASE}/api/local-schedules/bulk/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduleIds, targetTab: toTab }),
        }
      );

      const result = await response.json();
      if (response.ok && result.success) {
        alert(`Successfully moved to ${toTab}`);
        setSelectedScheduleIds(new Set());
        setSelectAll(false);
        await fetchSchedules();
        setActiveTab(toTab);
      } else {
        throw new Error(result.message || "Failed to move");
      }
    } catch (error) {
      alert("Failed to move: " + error.message);
    }
  };

  // ====== ADD VENDOR POPUP HANDLERS (same as AddLocalSchedulePage.js) ======
  const handleOpenAddVendor = (scheduleId) => {
    setActiveHeaderIdForVendorForm(scheduleId);
    setAddVendorFormData({
      trip: "",
      vendor: "",
      doNumbers: [""],
      arrivalTime: "",
    });
    setAddVendorDetail(true);
  };

  const onTripChange = (e) => {
    const value = e.target.value;
    const selectedTrip = tripOptions.find((t) => String(t.trip_no) === value);
    setAddVendorFormData((prev) => ({
      ...prev,
      trip: value,
      arrivalTime: selectedTrip?.arv_to || "",
    }));
  };

  const handleAddVendorInputChange = (field, value) => {
    setAddVendorFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDoNumberChange = (index, value) => {
    setAddVendorFormData((prev) => {
      const newDoNumbers = [...prev.doNumbers];
      newDoNumbers[index] = value;
      return { ...prev, doNumbers: newDoNumbers };
    });
  };

  const addDoNumberField = () => {
    setAddVendorFormData((prev) => ({
      ...prev,
      doNumbers: [...prev.doNumbers, ""],
    }));
  };

  const removeDoNumberField = (index) => {
    setAddVendorFormData((prev) => ({
      ...prev,
      doNumbers: prev.doNumbers.filter((_, i) => i !== index),
    }));
  };

  const handleAddVendorSubmit = async (e) => {
    e.preventDefault();

    const selectedTrip = tripOptions.find(
      (t) => String(t.trip_no) === addVendorFormData.trip
    );
    const selectedVendor = vendorOptions.find(
      (v) => `${v.vendor_code} - ${v.vendor_name}` === addVendorFormData.vendor
    );

    if (!selectedTrip || !selectedVendor || !addVendorFormData.doNumbers[0]) {
      alert("Please fill all required fields");
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/local-schedules/${activeHeaderIdForVendorForm}/vendors`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trip_id: selectedTrip.id,
            vendor_id: selectedVendor.id,
            do_numbers: addVendorFormData.doNumbers.filter((d) => d.trim()),
          }),
        }
      );

      const result = await response.json();
      if (result.success) {
        alert("Vendor added successfully");
        setAddVendorDetail(false);
        setAddVendorFormData({
          trip: "",
          vendor: "",
          doNumbers: [""],
          arrivalTime: "",
        });
        fetchSchedules();
      } else {
        alert(result.message || "Failed to add vendor");
      }
    } catch (error) {
      console.error("Error adding vendor:", error);
      alert("Failed to add vendor");
    }
  };

  // ====== ADD PART POPUP HANDLERS (same as AddLocalSchedulePage.js) ======
  const handleOpenAddPart = (vendorId, vendorData) => {
    setActiveVendorContext({
      vendorId: vendorId,
      vendorDbId: vendorData?.vendor_id || null, // ID vendor dari database untuk validasi part
      doNumbers: vendorData?.do_numbers
        ? vendorData.do_numbers.split(",")
        : [""],
    });
    setAddVendorPartFormData({
      trip: "",
      vendor: vendorData?.vendor_name || "",
      doNumbers: vendorData?.do_numbers
        ? vendorData.do_numbers.split(",")
        : [""],
      arrivalTime: "",
      parts: [],
    });
    setSelectedPartsInPopup([]);
    setAddVendorPartDetail(true);
  };

  const handleAddPart = async (rawPartCode) => {
    const partCode = String(rawPartCode || "").trim();
    if (!partCode) return;

    if (!activeVendorContext) {
      alert("Vendor context not found. Open popup from vendor row.");
      return;
    }

    const existingPartCodes = addVendorPartFormData.parts.map(
      (p) => p.partCode
    );

    try {
      const resp = await fetch(
        `${API_BASE}/api/kanban-master/qty-per-box?part_code=${encodeURIComponent(
          partCode
        )}`
      );
      if (!resp.ok) throw new Error("Failed to check Part Code.");

      const json = await resp.json();

      // Validasi: jika part tidak ditemukan sama sekali
      if (!json.success || !json.item) {
        alert("Part code has not found.");
        return;
      }

      const item = json.item;

      // Validasi: jika part ditemukan tapi milik vendor lain
      if (
        activeVendorContext.vendorDbId &&
        item.vendor_id &&
        Number(item.vendor_id) !== Number(activeVendorContext.vendorDbId)
      ) {
        alert("Part code belongs to another vendor.");
        return;
      }

      // Validasi: jika part sudah ditambahkan
      if (existingPartCodes.includes(item.part_code)) {
        alert("Part already added");
        return;
      }

      let qtyPerBox = item.qty_per_box || 1;
      if (qtyPerBox <= 0) qtyPerBox = 1;

      const availableDoNumbers =
        activeVendorContext?.doNumbers?.filter((d) => String(d || "").trim()) ||
        [];

      setAddVendorPartFormData((prev) => ({
        ...prev,
        parts: [
          ...prev.parts,
          {
            id: Date.now(),
            doNumber: availableDoNumbers[0] || "",
            partCode: item.part_code,
            partName: item.part_name || "",
            qty: 0,
            qtyBox: 0,
            unit: item.unit || "PCS",
            qtyPerBoxFromMaster: qtyPerBox,
          },
        ],
      }));
    } catch (err) {
      alert(err.message || "Error occurred while checking Part Code.");
    }
  };

  const handlePopupPartQtyChange = (partId, value) => {
    setAddVendorPartFormData((prev) => ({
      ...prev,
      parts: prev.parts.map((p) => {
        if (p.id === partId) {
          const qty = Number(value) || 0;
          const qtyPerBox = p.qtyPerBoxFromMaster || 1;
          const qtyBox = qtyPerBox > 0 ? Math.ceil(qty / qtyPerBox) : 0;
          return { ...p, qty, qtyBox };
        }
        return p;
      }),
    }));
  };

  const handlePopupCheckboxChange = (e, partId) => {
    if (e.target.checked) {
      setSelectedPartsInPopup((prev) => [...prev, partId]);
    } else {
      setSelectedPartsInPopup((prev) => prev.filter((id) => id !== partId));
    }
  };

  const handleSelectAllInPopup = (e) => {
    if (e.target.checked) {
      setSelectedPartsInPopup(addVendorPartFormData.parts.map((p) => p.id));
    } else {
      setSelectedPartsInPopup([]);
    }
  };

  const handleRemovePart = (partId) => {
    setAddVendorPartFormData((prev) => ({
      ...prev,
      parts: prev.parts.filter((p) => p.id !== partId),
    }));
    setSelectedPartsInPopup((prev) => prev.filter((id) => id !== partId));
  };

  const handleAddVendorPartSubmit = async (e) => {
    e.preventDefault();

    if (
      addVendorPartFormData.parts.length > 0 &&
      selectedPartsInPopup.length === 0
    ) {
      alert("Select part before insert");
      return;
    }

    const partsToInsert = addVendorPartFormData.parts.filter((p) =>
      selectedPartsInPopup.includes(p.id)
    );

    try {
      for (const part of partsToInsert) {
        await fetch(
          `${API_BASE}/api/local-schedules/vendors/${activeVendorContext.vendorId}/parts`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              part_code: part.partCode,
              part_name: part.partName,
              quantity: part.qty || 0,
              quantity_box: part.qtyBox || 0,
              unit: part.unit || "PCS",
            }),
          }
        );
      }

      alert("Parts added successfully!");
      setAddVendorPartDetail(false);
      setActiveVendorContext(null);
      setAddVendorPartFormData({
        trip: "",
        vendor: "",
        doNumbers: [""],
        arrivalTime: "",
        parts: [],
      });
      setSelectedPartsInPopup([]);
      fetchSchedules();
    } catch (error) {
      alert("Failed to add parts");
    }
  };

  // ====== FORMAT FUNCTIONS ======
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

  // ====== ROW EXPANSION ======
  const toggleRowExpansion = (rowId) => {
    if (activeTab === "Today") return;
    setExpandedRows((prev) => ({ ...prev, [rowId]: !prev[rowId] }));
  };

  const toggleVendorRowExpansion = (vendorRowId) => {
    setExpandedVendorRows((prev) => ({
      ...prev,
      [vendorRowId]: !prev[vendorRowId],
    }));
  };

  // ====== TIMER & AUTO-MOVE ======
  useEffect(() => {
    setCurrentDate(new Date());
    const unsubscribe = timerService.subscribe((time) => setCurrentDate(time));
    if (!timerService.isRunning) timerService.start();
    return () => unsubscribe();
  }, []);

  const autoMoveSchedulesToToday = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/local-schedules?status=Schedule`
      );
      if (!response.ok) return;

      const result = await response.json();
      if (!result.success || !result.data || result.data.length === 0) return;

      const today = new Date(currentDate);
      const todayString = `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      const schedulesToMove = result.data.filter((schedule) => {
        const rawDate = schedule.schedule_date;
        const scheduleDate =
          typeof rawDate === "string" ? rawDate.split("T")[0] : "";
        return scheduleDate === todayString;
      });

      if (schedulesToMove.length === 0) return;

      const scheduleIds = schedulesToMove.map((s) => s.id);
      const moveResponse = await fetch(
        `${API_BASE}/api/local-schedules/bulk/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduleIds, targetTab: "Today" }),
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
    const initialDelay = setTimeout(() => autoMoveSchedulesToToday(), 1000);
    const autoMoveInterval = setInterval(
      () => autoMoveSchedulesToToday(),
      5000
    );
    return () => {
      clearTimeout(initialDelay);
      clearInterval(autoMoveInterval);
    };
  }, []);

  useEffect(() => {
    const handleAutoMoved = () => {
      if (activeTab === "Schedule" || activeTab === "Today") fetchSchedules();
    };
    window.addEventListener("scheduleAutoMoved", handleAutoMoved);
    return () =>
      window.removeEventListener("scheduleAutoMoved", handleAutoMoved);
  }, [activeTab]);

  const handleInputFocus = (e) => (e.target.style.borderColor = "#9fa8da");
  const handleInputBlur = (e) => (e.target.style.borderColor = "#d1d5db");
  const handleButtonHover = (e, isHover, type) => {
    if (type === "primary")
      e.target.style.backgroundColor = isHover ? "#1d4ed8" : "#2563eb";
  };
  const handleTabHover = (e, isHover, isActive) => {
    if (!isActive) e.target.style.color = isHover ? "#2563eb" : "#6b7280";
  };

  // ====== STYLES ======
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
      backgroundColor: "#fee2e2",
      color: "#991b1b",
      padding: "4px 8px",
      fontSize: "12px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      marginLeft: "4px",
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

    cellContent: {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },

    popupEditOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2000,
    },
    popupEditContainer: {
      backgroundColor: "white",
      borderRadius: "12px",
      padding: "30px",
      width: "800px",
      maxWidth: "90vw",
      maxHeight: "90vh",
      overflowY: "auto",
      boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
    },
    popupEditHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: "2px solid #e5e7eb",
      paddingBottom: "15px",
      marginBottom: "25px",
    },
    popupEditTitle: {
      fontSize: "22px",
      fontWeight: "700",
      color: "#1f2937",
      margin: 0,
    },
    popupEditCloseButton: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "8px",
      borderRadius: "6px",
      color: "#6b7280",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.2s ease",
    },
    popupEditCloseButtonHover: {
      backgroundColor: "#f3f4f6",
      color: "#374151",
    },
    popupEditForm: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "20px",
    },
    popupEditFormGroup: {
      marginBottom: "15px",
    },
    popupEditLabel: {
      display: "block",
      fontSize: "13px",
      fontWeight: "600",
      color: "#4b5563",
      marginBottom: "6px",
    },
    popupEditInput: {
      width: "100%",
      height: "38px",
      border: "2px solid #e5e7eb",
      borderRadius: "6px",
      padding: "0 12px",
      fontSize: "13px",
      backgroundColor: "white",
      fontFamily: "inherit",
      outline: "none",
      transition: "border-color 0.2s ease",
      boxSizing: "border-box",
    },
    popupEditInputFocus: {
      borderColor: "#6366f1",
    },
    popupEditSelect: {
      width: "100%",
      height: "38px",
      border: "2px solid #e5e7eb",
      borderRadius: "6px",
      padding: "0 12px",
      fontSize: "13px",
      backgroundColor: "white",
      fontFamily: "inherit",
      outline: "none",
      transition: "border-color 0.2s ease",
      cursor: "pointer",
      boxSizing: "border-box",
    },
    popupEditTextarea: {
      width: "100%",
      minHeight: "80px",
      border: "2px solid #e5e7eb",
      borderRadius: "6px",
      padding: "10px 12px",
      fontSize: "13px",
      backgroundColor: "white",
      fontFamily: "inherit",
      outline: "none",
      transition: "border-color 0.2s ease",
      resize: "vertical",
      boxSizing: "border-box",
    },
    popupEditError: {
      color: "#dc2626",
      fontSize: "12px",
      marginTop: "5px",
      fontWeight: "500",
    },
    popupEditButtonGroup: {
      gridColumn: "1 / -1",
      display: "flex",
      justifyContent: "flex-end",
      gap: "12px",
      marginTop: "25px",
      paddingTop: "20px",
      borderTop: "2px solid #e5e7eb",
    },
    popupEditCancelButton: {
      backgroundColor: "#f3f4f6",
      color: "#374151",
      padding: "10px 20px",
      border: "none",
      borderRadius: "6px",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer",
      fontFamily: "inherit",
      transition: "all 0.2s ease",
    },
    popupEditCancelButtonHover: {
      backgroundColor: "#e5e7eb",
    },
    popupEditSaveButton: {
      backgroundColor: "#2563eb",
      color: "white",
      padding: "10px 24px",
      border: "none",
      borderRadius: "6px",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer",
      fontFamily: "inherit",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      transition: "all 0.2s ease",
    },
    popupEditSaveButtonHover: {
      backgroundColor: "#1d4ed8",
    },
    popupEditSaveButtonDisabled: {
      backgroundColor: "#93c5fd",
      color: "white",
      padding: "10px 24px",
      border: "none",
      borderRadius: "6px",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "not-allowed",
      fontFamily: "inherit",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    popupEditLoadingSpinner: {
      width: "18px",
      height: "18px",
      border: "3px solid rgba(255, 255, 255, 0.3)",
      borderRadius: "50%",
      borderTopColor: "white",
      animation: "spin 1s linear infinite",
    },
    editButtonHover: {
      backgroundColor: "#c7d2fe",
    },
    deleteButtonHover: {
      backgroundColor: "#c7d2fe",
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

    checkButton: {
      backgroundColor: "#e0e7ff",
      color: "black",
      padding: "4px 8px",
      fontSize: "12px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      marginLeft: "4px",
    },
    returnButton: {
      backgroundColor: "#e0e7ff",
      color: "black",
      padding: "4px 8px",
      fontSize: "12px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      marginLeft: "4px",
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
    prodDatesBadge: {
      display: "inline",
      fontSize: "10px",
      color: "#374151",
    },

    // Inline Prod Dates Editor (Today Tab)
    inlineProdDatesContainer: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      gap: "4px",
    },
    inlineProdDateItem: {
      display: "flex",
      alignItems: "center",
      gap: "2px",
    },
    inlineProdDateInput: {
      width: "100px",
      height: "22px",
      border: "1px solid #d1d5db",
      borderRadius: "3px",
      padding: "0 4px",
      fontSize: "10px",
      outline: "none",
    },
    inlineProdDateRemove: {
      background: "none",
      border: "none",
      color: "#ef4444",
      cursor: "pointer",
      padding: "0",
      display: "flex",
      alignItems: "center",
    },
    inlineProdDateAdd: {
      background: "none",
      border: "1px solid #3b82f6",
      color: "#3b82f6",
      cursor: "pointer",
      padding: "2px 6px",
      borderRadius: "3px",
      fontSize: "10px",
      display: "flex",
      alignItems: "center",
      gap: "2px",
    },

    prodDatesList: {
      display: "inline",
      fontSize: "10px",
    },

    // Status Badge - POLOS tanpa warna
    statusBadge: {
      padding: "2px 8px",
      borderRadius: "4px",
      fontSize: "10px",
      fontWeight: "500",
      backgroundColor: "transparent",
      color: "#374151",
    },

    statusPass: {
      // Polos tanpa warna
      backgroundColor: "transparent",
      color: "#374151",
    },

    statusSample: {
      // Polos tanpa warna
      backgroundColor: "transparent",
      color: "#374151",
    },

    // Sample Dates
    sampleDatesList: {
      display: "flex",
      flexDirection: "column",
      gap: "2px",
      fontSize: "10px",
    },

    sampleDateItem: {
      padding: "1px 4px",
      backgroundColor: "transparent",
      borderRadius: "2px",
    },

    // Popup Styles untuk Multiple Dates
    popupOverlayDates: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2000,
    },

    popupContainerDates: {
      backgroundColor: "white",
      borderRadius: "8px",
      padding: "24px",
      width: "450px",
      maxWidth: "90vw",
      maxHeight: "80vh",
      overflow: "auto",
      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
    },

    popupHeaderDates: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: "1px solid #e5e7eb",
      paddingBottom: "12px",
      marginBottom: "16px",
    },

    popupTitleDates: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#374151",
      margin: 0,
    },

    dateInputRow: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginBottom: "8px",
    },

    dateInput: {
      flex: 1,
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      fontSize: "14px",
    },

    removeDateButton: {
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

    addDateButton: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      padding: "8px 12px",
      border: "1px solid #3b82f6",
      borderRadius: "4px",
      background: "#eff6ff",
      color: "#3b82f6",
      cursor: "pointer",
      fontSize: "12px",
      marginTop: "8px",
    },

    buttonGroupDates: {
      display: "flex",
      gap: "8px",
      justifyContent: "flex-end",
      marginTop: "16px",
      paddingTop: "16px",
      borderTop: "1px solid #e5e7eb",
    },

    primaryButtonDates: {
      padding: "8px 16px",
      border: "none",
      borderRadius: "4px",
      background: "#3b82f6",
      color: "white",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "500",
    },

    secondaryButtonDates: {
      padding: "8px 16px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      background: "white",
      cursor: "pointer",
      fontSize: "14px",
    },
  };

  // Vendor Detail Popup Styles (from AddLocalSchedulePage.js)
  const vendorDetailStyles = {
    popupOverlay: {
      position: "fixed",
      top: 100,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
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
      boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
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
    form: { marginTop: "16px" },
    formGroup: { marginBottom: "16px" },
    label: { display: "block", marginBottom: "4px", fontWeight: "500" },
    select: {
      width: "100%",
      padding: "8px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
    },
    input: {
      flex: 1,
      padding: "8px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
    },
    doNumberContainer: { display: "flex", gap: "8px", marginBottom: "8px" },
    removeButton: {
      padding: "8px",
      border: "1px solid #ef4444",
      borderRadius: "4px",
      background: "#fef2f2",
      color: "#ef4444",
      cursor: "pointer",
    },
    addButton: {
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
    },
    timeInput: {
      width: "100%",
      padding: "8px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
    },
    buttonGroup: { display: "flex", gap: "8px", justifyContent: "flex-end" },
    cancelButton: {
      padding: "8px 16px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      background: "white",
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

  // Vendor Part Popup Styles (from AddLocalSchedulePage.js)
  const vendorPartStyles = {
    popupOverlay: {
      position: "fixed",
      top: 50,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
    },
    popupContainer: {
      backgroundColor: "white",
      padding: "24px",
      borderRadius: "8px",
      boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
      width: "90%",
      maxWidth: "800px",
      maxHeight: "90vh",
      overflowY: "auto",
    },
    popupHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "16px",
    },
    popupTitle: { margin: 0, fontSize: "18px", fontWeight: "600" },
    closeButton: {
      background: "none",
      border: "none",
      fontSize: "20px",
      cursor: "pointer",
      color: "#6b7280",
    },
    form: { marginTop: "16px" },
    formGroup: { marginBottom: "16px" },
    label: { display: "block", marginBottom: "4px", fontWeight: "500" },
    inputContainer: { display: "flex", gap: "8px", alignItems: "center" },
    input: {
      flex: "none",
      height: "1rem",
      width: "150px",
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "12px",
      outline: "none",
      boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)",
      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
      fontFamily: "inherit",
      fontWeight: "450",
    },
    addPartButton: {
      backgroundColor: "#3b82f6",
      color: "white",
      border: "none",
      borderRadius: "6px",
      padding: "8px 16px",
      fontSize: "12px",
      fontWeight: "500",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      transition: "background-color 0.2s ease",
      whiteSpace: "nowrap",
    },
    partDetailsSection: { marginBottom: "16px" },
    sectionTitle: { marginBottom: "8px", fontWeight: "500" },
    tableContainer: {
      marginLeft: "5px",
      backgroundColor: "white",
      borderRadius: "8px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      overflowX: "auto",
      width: "calc(100% - 5px)",
    },
    tableBodyWrapper: {
      overflowX: "auto",
      border: "1.5px solid #9fa8da",
      borderBottom: "none",
    },
    tableHeader: {
      backgroundColor: "#e0e7ff",
      color: "#374151",
      fontWeight: "600",
      fontSize: "12px",
      textAlign: "center",
    },
    th: {
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
      textOverflow: "ellipsis",
    },
    td: {
      padding: "2px 4px",
      border: "0.5px solid #9fa8da",
      fontSize: "12px",
      color: "#374151",
      whiteSpace: "nowrap",
      height: "25px",
      lineHeight: "1",
      verticalAlign: "middle",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    tdNumber: {
      padding: "2px 4px",
      border: "0.5px solid #9fa8da",
      fontSize: "12px",
      color: "#374151",
      whiteSpace: "nowrap",
      height: "25px",
      lineHeight: "1",
      verticalAlign: "middle",
      overflow: "hidden",
      backgroundColor: "#e0e7ff",
      textAlign: "center",
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
    buttonGroup: { display: "flex", justifyContent: "flex-end", gap: "8px" },
    cancelButton: {
      padding: "8px 16px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      background: "white",
      cursor: "pointer",
    },
    submitButton: {
      padding: "8px 16px",
      border: "none",
      borderRadius: "4px",
      backgroundColor: "#2563eb",
      color: "white",
      cursor: "pointer",
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
      textAlign: "center",
      fontSize: "10px",
      fontFamily: "inherit",
    },
  };

  // ====== RENDER RECEIVED TAB ======
  const renderReceivedTab = () => {
    if (loading)
      return (
        <tr>
          <td
            colSpan="13"
            style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}
          >
            Loading...
          </td>
        </tr>
      );

    return receivedVendors.map((vendor, index) => (
      <React.Fragment key={vendor.id}>
        <tr>
          <td
            style={{
              ...styles.expandedTd,
              ...styles.expandedWithLeftBorder,
              ...styles.emptyColumn,
            }}
          >
            {index + 1}
          </td>
          <td style={{ ...styles.tdWithLeftBorder, ...styles.emptyColumn }}>
            <button
              style={styles.arrowButton}
              onClick={() =>
                toggleVendorRowExpansion(`received_vendor_${vendor.id}`)
              }
            >
              {expandedVendorRows[`received_vendor_${vendor.id}`] ? (
                <MdArrowDropDown style={styles.arrowIcon} />
              ) : (
                <MdArrowRight style={styles.arrowIcon} />
              )}
            </button>
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={
              vendor.vendor_code
                ? `${vendor.vendor_code} - ${vendor.vendor_name}`
                : "-"
            }
          >
            {vendor.vendor_code
              ? `${vendor.vendor_code} - ${vendor.vendor_name}`
              : "-"}
          </td>
          <td style={styles.tdWithLeftBorder} title={vendor.stock_level || "-"}>
            {vendor.stock_level || "-"}
          </td>
          <td style={styles.tdWithLeftBorder} title={vendor.model_name || "-"}>
            {vendor.model_name || "-"}
          </td>
          <td style={styles.tdWithLeftBorder} title={vendor.trip_no || "-"}>
            {vendor.trip_no || "-"}
          </td>

          <td style={styles.tdWithLeftBorder} title={vendor.do_numbers || "-"}>
            {vendor.do_numbers || "-"}
          </td>

          <td style={styles.tdWithLeftBorder} title={vendor.total_pallet || 0}>
            {vendor.total_pallet || 0}
          </td>
          <td style={styles.tdWithLeftBorder} title={vendor.total_item || 0}>
            {vendor.total_item || 0}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={vendor.arrival_time || "-"}
          >
            {vendor.arrival_time || "-"}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={formatDate(vendor.schedule_date)}
          >
            {formatDate(vendor.schedule_date)}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={
              vendor.move_by_name
                ? `${vendor.move_by_name} | ${formatDateTime(vendor.move_at)}`
                : "-"
            }
          >
            {vendor.move_by_name
              ? `${vendor.move_by_name} | ${formatDateTime(vendor.move_at)}`
              : "-"}
          </td>
          <td style={styles.tdWithLeftBorder} title="Action">
            <button
              style={styles.checkButton}
              onClick={() => handleApproveVendor(vendor.id)}
              title="Approve"
            >
              <Check size={10} />
            </button>
            <button
              style={styles.returnButton}
              onClick={() => handleReturnVendor(vendor.id)}
              title="Return"
            >
              <RotateCcw size={10} />
            </button>
            <button
              style={styles.deleteButton}
              onClick={() => handleDeleteVendor(vendor.id)}
              title="Delete"
            >
              <Trash2 size={10} />
            </button>
          </td>
        </tr>
        {expandedVendorRows[`received_vendor_${vendor.id}`] && (
          <tr>
            <td colSpan="13" style={{ padding: 0, border: "none" }}>
              <div
                style={{
                  ...styles.thirdLevelTableContainer,
                  marginLeft: getCurrentConfig().partsTable?.marginLeft,
                }}
              >
                <table style={styles.thirdLevelTable}>
                  {renderColgroup(
                    getCurrentConfig().partsTable?.cols ||
                      tableConfig.Received.partsTable.cols
                  )}
                  <thead>
                    <tr style={styles.expandedTableHeader}>
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
                    {vendor.parts?.length > 0 ? (
                      vendor.parts.map((part, i) => (
                        <tr key={part.id}>
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
                            style={styles.thirdLevelTd}
                            title={part.part_code || "-"}
                          >
                            {part.part_code || "-"}
                          </td>
                          <td
                            style={styles.thirdLevelTd}
                            title={part.part_name || "-"}
                          >
                            {part.part_name || "-"}
                          </td>
                          <td style={styles.thirdLevelTd} title={part.qty || 0}>
                            {part.qty || 0}
                          </td>
                          <td
                            style={styles.thirdLevelTd}
                            title={part.qty_box || 0}
                          >
                            {part.qty_box || 0}
                          </td>
                          <td
                            style={styles.thirdLevelTd}
                            title={
                              (() => {
                                const prodDates = part.prod_dates || (part.prod_date ? [part.prod_date] : []);
                                if (prodDates.length === 0) return "-";
                                return prodDates.map((d) => formatDate(d)).join(", ");
                              })()
                            }
                          >
                            {(() => {
                              const prodDates = part.prod_dates || (part.prod_date ? [part.prod_date] : []);
                              if (prodDates.length === 0) return "-";
                              return prodDates.map((d) => formatDate(d)).join(", ");
                            })()}
                          </td>
                          <td
                            style={styles.thirdLevelTd}
                            title={part.remark || "-"}
                          >
                            {part.remark || "-"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="7"
                          style={{
                            textAlign: "center",
                            padding: "10px",
                            color: "#6b7280",
                          }}
                        >
                          No parts
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

  // ====== RENDER IQC PROGRESS TAB ======
  const renderIqcProgressTab = () => {
    if (loading)
      return (
        <tr>
          <td
            colSpan="13"
            style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}
          >
            Loading...
          </td>
        </tr>
      );

    return iqcProgressVendors.map((vendor, index) => (
      <React.Fragment key={vendor.id}>
        <tr>
          <td
            style={{
              ...styles.expandedTd,
              ...styles.expandedWithLeftBorder,
              ...styles.emptyColumn,
            }}
            title={index + 1}
          >
            {index + 1}
          </td>
          <td
            style={{ ...styles.tdWithLeftBorder, ...styles.emptyColumn }}
            title="Toggle details"
          >
            <button
              style={styles.arrowButton}
              onClick={() =>
                toggleVendorRowExpansion(`iqc_vendor_${vendor.id}`)
              }
            >
              {expandedVendorRows[`iqc_vendor_${vendor.id}`] ? (
                <MdArrowDropDown style={styles.arrowIcon} />
              ) : (
                <MdArrowRight style={styles.arrowIcon} />
              )}
            </button>
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={
              vendor.vendor_code
                ? `${vendor.vendor_code} - ${vendor.vendor_name}`
                : "-"
            }
          >
            {vendor.vendor_code
              ? `${vendor.vendor_code} - ${vendor.vendor_name}`
              : "-"}
          </td>
          <td style={styles.tdWithLeftBorder} title={vendor.stock_level || "-"}>
            {vendor.stock_level || "-"}
          </td>
          <td style={styles.tdWithLeftBorder} title={vendor.model_name || "-"}>
            {vendor.model_name || "-"}
          </td>
          <td style={styles.tdWithLeftBorder} title={vendor.trip_no || "-"}>
            {vendor.trip_no || "-"}
          </td>
          <td style={styles.tdWithLeftBorder} title={vendor.do_numbers || "-"}>
            {vendor.do_numbers || "-"}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={vendor.total_pallet?.toString() || "0"}
          >
            {vendor.total_pallet || 0}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={vendor.total_item?.toString() || "0"}
          >
            {vendor.total_item || 0}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={vendor.arrival_time || "-"}
          >
            {vendor.arrival_time || "-"}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={formatDate(vendor.schedule_date)}
          >
            {formatDate(vendor.schedule_date)}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={
              vendor.approve_by_name
                ? `${vendor.approve_by_name} | ${formatDateTime(
                    vendor.approve_at
                  )}`
                : "-"
            }
          >
            {vendor.approve_by_name
              ? `${vendor.approve_by_name} | ${formatDateTime(
                  vendor.approve_at
                )}`
              : "-"}
          </td>
          <td style={styles.tdWithLeftBorder} title="Move to Sample">
            <button
              style={styles.checkButton}
              onClick={() => handleMoveVendorToSample(vendor.id)}
              title="Move to Sample"
            >
              <Check size={10} />
            </button>
          </td>
        </tr>
        {expandedVendorRows[`iqc_vendor_${vendor.id}`] && (
          <tr>
            <td colSpan="13" style={{ padding: 0, border: "none" }}>
              <div
                style={{
                  ...styles.thirdLevelTableContainer,
                  marginLeft: getCurrentConfig().partsTable?.marginLeft,
                }}
              >
                <table style={styles.thirdLevelTable}>
                  {renderColgroup(
                    getCurrentConfig().partsTable?.cols ||
                      tableConfig["IQC Progress"].partsTable.cols
                  )}
                  <thead>
                    <tr style={styles.expandedTableHeader}>
                      <th style={styles.thirdLevelTh}>No</th>
                      <th style={styles.thirdLevelTh}>Part Code</th>
                      <th style={styles.thirdLevelTh}>Part Name</th>
                      <th style={styles.thirdLevelTh}>Qty</th>
                      <th style={styles.thirdLevelTh}>Qty Box</th>
                      <th style={styles.thirdLevelTh}>Unit</th>
                      <th style={styles.thirdLevelTh}>Prod Date</th>
                      <th style={styles.thirdLevelTh}>Status</th>
                      <th style={styles.thirdLevelTh}>Sample</th>
                      <th style={styles.thirdLevelTh}>Remark</th>
                      <th style={styles.thirdLevelTh}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendor.parts?.length > 0 ? (
                      vendor.parts.map((part, i) => {
                        const { status: autoStatus, sampleDates } =
                          getPartSampleStatus(part);
                        const displayStatus =
                          part.status === "PASS" ? "PASS" : autoStatus;

                        return (
                          <tr key={part.id}>
                            <td
                              style={{
                                ...styles.expandedTd,
                                ...styles.expandedWithLeftBorder,
                                ...styles.emptyColumn,
                              }}
                              title={i + 1}
                            >
                              {i + 1}
                            </td>
                            <td
                              style={styles.thirdLevelTd}
                              title={part.part_code || "-"}
                            >
                              {part.part_code || "-"}
                            </td>
                            <td
                              style={styles.thirdLevelTd}
                              title={part.part_name || "-"}
                            >
                              {part.part_name || "-"}
                            </td>
                            <td
                              style={styles.thirdLevelTd}
                              title={part.qty?.toString() || "0"}
                            >
                              {part.qty || 0}
                            </td>
                            <td
                              style={styles.thirdLevelTd}
                              title={part.qty_box?.toString() || "0"}
                            >
                              {part.qty_box || 0}
                            </td>
                            <td
                              style={styles.thirdLevelTd}
                              title={part.unit || "PCS"}
                            >
                              {part.unit || "PCS"}
                            </td>
                            <td
                              style={styles.thirdLevelTd}
                              title={(() => {
                                const prodDates =
                                  part.prod_dates ||
                                  (part.prod_date ? [part.prod_date] : []);
                                if (prodDates.length === 0) return "-";
                                return prodDates.map((d) => formatDate(d)).join(", ");
                              })()}
                            >
                              {editingIqcPartId === part.id ? (
                                <div style={styles.inlineProdDatesContainer}>
                                  {(editIqcPartData.prod_dates || [""]).map((date, dateIdx) => (
                                    <div key={dateIdx} style={styles.inlineProdDateItem}>
                                      <input
                                        type="date"
                                        style={styles.inlineProdDateInput}
                                        value={date || ""}
                                        onChange={(e) => {
                                          const newDates = [...(editIqcPartData.prod_dates || [""])];
                                          newDates[dateIdx] = e.target.value;
                                          setEditIqcPartData((p) => ({
                                            ...p,
                                            prod_dates: newDates,
                                          }));
                                        }}
                                      />
                                      {(editIqcPartData.prod_dates || []).length > 1 && (
                                        <button
                                          style={styles.inlineProdDateRemove}
                                          onClick={() => {
                                            const newDates = (editIqcPartData.prod_dates || []).filter((_, i) => i !== dateIdx);
                                            setEditIqcPartData((p) => ({
                                              ...p,
                                              prod_dates: newDates.length > 0 ? newDates : [""],
                                            }));
                                          }}
                                          title="Remove date"
                                        >
                                          <X size={12} />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  <button
                                    style={styles.inlineProdDateAdd}
                                    onClick={() => {
                                      const newDates = [...(editIqcPartData.prod_dates || [""]), ""];
                                      setEditIqcPartData((p) => ({
                                        ...p,
                                        prod_dates: newDates,
                                      }));
                                    }}
                                    title="Add date"
                                  >
                                    <Plus size={10} />
                                  </button>
                                </div>
                              ) : (
                                <span style={styles.prodDatesList}>
                                  {(() => {
                                    const prodDates =
                                      part.prod_dates ||
                                      (part.prod_date ? [part.prod_date] : []);
                                    if (prodDates.length === 0) return "-";
                                    return prodDates.map((d) => formatDate(d)).join(", ");
                                  })()}
                                </span>
                              )}
                            </td>
                            <td
                              style={styles.thirdLevelTd}
                              title={displayStatus || "-"}
                            >
                              {editingIqcPartId === part.id ? (
                                <select
                                  style={styles.inlineInput}
                                  value={editIqcPartData.status || ""}
                                  onChange={(e) =>
                                    setEditIqcPartData((p) => ({
                                      ...p,
                                      status: e.target.value,
                                    }))
                                  }
                                  title="Select"
                                >
                                  <option value="">-</option>
                                  <option value="PASS">PASS</option>
                                  <option value="EQZD">EQZD</option>
                                  <option value="SAMPLE">SAMPLE</option>
                                </select>
                              ) : (
                                <span style={styles.statusBadge}>
                                  {displayStatus || "-"}
                                </span>
                              )}
                            </td>
                            <td
                              style={styles.thirdLevelTd}
                              title={
                                displayStatus === "PASS"
                                  ? "-"
                                  : sampleDates.length > 0
                                  ? sampleDates.map((d) => formatDate(d)).join(", ")
                                  : "-"
                              }
                            >
                              {displayStatus === "PASS" ? (
                                "-"
                              ) : sampleDates.length > 0 ? (
                                <span style={{ fontSize: "10px" }}>
                                  {sampleDates.map((d) => formatDate(d)).join(", ")}
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td
                              style={styles.thirdLevelTd}
                              title={part.remark || "-"}
                            >
                              {editingIqcPartId === part.id ? (
                                <input
                                  type="text"
                                  style={styles.inlineInput}
                                  value={editIqcPartData.remark || ""}
                                  onChange={(e) =>
                                    setEditIqcPartData((p) => ({
                                      ...p,
                                      remark: e.target.value,
                                    }))
                                  }
                                  title="Enter remark"
                                />
                              ) : (
                                part.remark || "-"
                              )}
                            </td>
                            <td style={styles.thirdLevelTd} title="Action">
                              {editingIqcPartId === part.id ? (
                                <>
                                  <button
                                    style={styles.saveButton}
                                    onClick={() =>
                                      handleSaveEditIqcPart(part.id)
                                    }
                                    title="Save"
                                  >
                                    <Save size={10} />
                                  </button>
                                  <button
                                    style={styles.cancelButton}
                                    onClick={handleCancelEditIqcPart}
                                    title="Cancel"
                                  >
                                    <X size={10} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  {/* Tombol Edit */}
                                  <button
                                    style={styles.editButton}
                                    onClick={() => handleEditIqcPart(part)}
                                    title="Edit"
                                  >
                                    <Pencil size={10} />
                                  </button>

                                  {/* Tombol Delete */}
                                  <button
                                    style={styles.deleteButton}
                                    onClick={() => handleDeletePart(part.id)}
                                    title="Delete"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan="11"
                          style={{
                            textAlign: "center",
                            padding: "10px",
                            color: "#6b7280",
                          }}
                        >
                          No parts
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

  // ====== RENDER SAMPLE TAB ======
  const renderSampleTab = () => {
    if (loading)
      return (
        <tr>
          <td
            colSpan="13"
            style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}
          >
            Loading...
          </td>
        </tr>
      );

    return sampleVendors.map((vendor, index) => (
      <React.Fragment key={vendor.id}>
        <tr>
          <td
            style={{
              ...styles.expandedTd,
              ...styles.expandedWithLeftBorder,
              ...styles.emptyColumn,
            }}
            title={index + 1}
          >
            {index + 1}
          </td>
          <td
            style={{ ...styles.tdWithLeftBorder, ...styles.emptyColumn }}
            title="Toggle details"
          >
            <button
              style={styles.arrowButton}
              onClick={() =>
                toggleVendorRowExpansion(`sample_vendor_${vendor.id}`)
              }
              title="Toggle details"
            >
              {expandedVendorRows[`sample_vendor_${vendor.id}`] ? (
                <MdArrowDropDown style={styles.arrowIcon} />
              ) : (
                <MdArrowRight style={styles.arrowIcon} />
              )}
            </button>
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={
              vendor.vendor_code
                ? `${vendor.vendor_code} - ${vendor.vendor_name}`
                : "-"
            }
          >
            {vendor.vendor_code
              ? `${vendor.vendor_code} - ${vendor.vendor_name}`
              : "-"}
          </td>
          <td style={styles.tdWithLeftBorder} title={vendor.stock_level || "-"}>
            {vendor.stock_level || "-"}
          </td>
          <td style={styles.tdWithLeftBorder} title={vendor.model_name || "-"}>
            {vendor.model_name || "-"}
          </td>
          <td style={styles.tdWithLeftBorder} title={vendor.trip_no || "-"}>
            {vendor.trip_no || "-"}
          </td>
          <td style={styles.tdWithLeftBorder} title={vendor.do_numbers || "-"}>
            {vendor.do_numbers || "-"}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={vendor.total_pallet?.toString() || "0"}
          >
            {vendor.total_pallet || 0}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={vendor.total_item?.toString() || "0"}
          >
            {vendor.total_item || 0}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={vendor.arrival_time || "-"}
          >
            {vendor.arrival_time || "-"}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={formatDate(vendor.schedule_date)}
          >
            {formatDate(vendor.schedule_date)}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={
              vendor.sample_by_name
                ? `${vendor.sample_by_name} | ${formatDateTime(
                    vendor.sample_at
                  )}`
                : "-"
            }
          >
            {vendor.sample_by_name
              ? `${vendor.sample_by_name} | ${formatDateTime(vendor.sample_at)}`
              : "-"}
          </td>
          <td style={styles.tdWithLeftBorder} title="Move to Complete">
            <button
              style={styles.checkButton}
              onClick={() => handleMoveVendorToComplete(vendor.id)}
              title="Move to Complete"
            >
              <Check size={10} />
            </button>
          </td>
        </tr>
        {expandedVendorRows[`sample_vendor_${vendor.id}`] && (
          <tr>
            <td colSpan="13" style={{ padding: 0, border: "none" }}>
              <div
                style={{
                  ...styles.thirdLevelTableContainer,
                  marginLeft: getCurrentConfig().partsTable?.marginLeft,
                }}
              >
                <table style={styles.thirdLevelTable}>
                  {renderColgroup(
                    getCurrentConfig().partsTable?.cols ||
                      tableConfig.Sample.partsTable.cols
                  )}
                  <thead>
                    <tr style={styles.expandedTableHeader}>
                      <th style={styles.thirdLevelTh}>No</th>
                      <th style={styles.thirdLevelTh}>Part Code</th>
                      <th style={styles.thirdLevelTh}>Part Name</th>
                      <th style={styles.thirdLevelTh}>Qty</th>
                      <th style={styles.thirdLevelTh}>Qty Box</th>
                      <th style={styles.thirdLevelTh}>Unit</th>
                      <th style={styles.thirdLevelTh}>Prod Date</th>
                      <th style={styles.thirdLevelTh}>Status</th>
                      <th style={styles.thirdLevelTh}>Sample</th>
                      <th style={styles.thirdLevelTh}>Remark</th>
                      <th style={styles.thirdLevelTh}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendor.parts?.length > 0 ? (
                      vendor.parts.map((part, i) => (
                        <tr key={part.id}>
                          <td
                            style={{
                              ...styles.expandedTd,
                              ...styles.expandedWithLeftBorder,
                              ...styles.emptyColumn,
                            }}
                            title={i + 1}
                          >
                            {i + 1}
                          </td>
                          <td
                            style={styles.thirdLevelTd}
                            title={part.part_code || "-"}
                          >
                            {part.part_code || "-"}
                          </td>
                          <td
                            style={styles.thirdLevelTd}
                            title={part.part_name || "-"}
                          >
                            {part.part_name || "-"}
                          </td>
                          <td
                            style={styles.thirdLevelTd}
                            title={part.qty?.toString() || "0"}
                          >
                            {part.qty || 0}
                          </td>
                          <td
                            style={styles.thirdLevelTd}
                            title={part.qty_box?.toString() || "0"}
                          >
                            {part.qty_box || 0}
                          </td>
                          <td
                            style={styles.thirdLevelTd}
                            title={part.unit || "PCS"}
                          >
                            {part.unit || "PCS"}
                          </td>
                          <td
                            style={styles.thirdLevelTd}
                            title={(() => {
                              const allDates = [];
                              if (part.prod_dates && part.prod_dates.length > 0) {
                                part.prod_dates.forEach((d) => {
                                  if (d && d.date) allDates.push(formatDate(d.date));
                                  else if (d && typeof d === "string") allDates.push(formatDate(d));
                                });
                              } else if (part.prod_date) {
                                allDates.push(formatDate(part.prod_date));
                              }
                              return allDates.length > 0 ? allDates.join(", ") : "-";
                            })()}
                          >
                            {(() => {
                              const allDates = [];
                              if (part.prod_dates && part.prod_dates.length > 0) {
                                part.prod_dates.forEach((d) => {
                                  if (d && d.date) allDates.push(formatDate(d.date));
                                  else if (d && typeof d === "string") allDates.push(formatDate(d));
                                });
                              } else if (part.prod_date) {
                                allDates.push(formatDate(part.prod_date));
                              }
                              return allDates.length > 0 ? allDates.join(", ") : "-";
                            })()}
                          </td>
                          <td
                            style={styles.thirdLevelTd}
                            title={(() => {
                              const { status } = getPartSampleStatus(part);
                              return status || "-";
                            })()}
                          >
                            {editingSamplePartId === part.id ? (
                              <select
                                style={styles.inlineInput}
                                value={editSamplePartData.status || ""}
                                onChange={(e) =>
                                  setEditSamplePartData((p) => ({
                                    ...p,
                                    status: e.target.value,
                                  }))
                                }
                                title="Select status"
                              >
                                <option value="">-</option>
                                <option value="PASS">PASS</option>
                                <option value="EQZD">EQZD</option>
                                <option value="SAMPLE">SAMPLE</option>
                              </select>
                            ) : (
                              (() => {
                                const { status } = getPartSampleStatus(part);
                                return status || "-";
                              })()
                            )}
                          </td>
                          <td
                            style={styles.thirdLevelTd}
                            title={(() => {
                              const { sampleDates } = getPartSampleStatus(part);
                              return sampleDates.length > 0
                                ? sampleDates.map((d) => formatDate(d)).join(", ")
                                : "-";
                            })()}
                          >
                            {(() => {
                              const { sampleDates } = getPartSampleStatus(part);
                              return sampleDates.length > 0
                                ? sampleDates.map((d) => formatDate(d)).join(", ")
                                : "-";
                            })()}
                          </td>
                          <td
                            style={styles.thirdLevelTd}
                            title={part.remark || "-"}
                          >
                            {editingSamplePartId === part.id ? (
                              <input
                                type="text"
                                style={styles.inlineInput}
                                value={editSamplePartData.remark || ""}
                                onChange={(e) =>
                                  setEditSamplePartData((p) => ({
                                    ...p,
                                    remark: e.target.value,
                                  }))
                                }
                                title="Enter remark"
                              />
                            ) : (
                              part.remark || "-"
                            )}
                          </td>
                          <td style={styles.thirdLevelTd} title="Action">
                            {editingSamplePartId === part.id ? (
                              <>
                                <button
                                  style={styles.saveButton}
                                  onClick={() =>
                                    handleSaveEditSamplePart(part.id)
                                  }
                                  title="Save"
                                >
                                  <Save size={10} />
                                </button>
                                <button
                                  style={styles.cancelButton}
                                  onClick={handleCancelEditSamplePart}
                                  title="Cancel"
                                >
                                  <X size={10} />
                                </button>
                              </>
                            ) : (
                              <button
                                style={styles.editButton}
                                onClick={() => handleEditSamplePart(part)}
                                title="Edit"
                              >
                                <Pencil size={10} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="10"
                          style={{
                            textAlign: "center",
                            padding: "10px",
                            color: "#6b7280",
                          }}
                          title="No parts"
                        >
                          No parts
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

  // ====== RENDER COMPLETE TAB ======
  const renderCompleteTab = () => {
    if (loading)
      return (
        <tr>
          <td
            colSpan="12"
            style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}
          >
            Loading...
          </td>
        </tr>
      );

    return completeVendors.map((vendor, index) => (
      <React.Fragment key={vendor.id}>
        <tr>
          <td
            style={{
              ...styles.expandedTd,
              ...styles.expandedWithLeftBorder,
              ...styles.emptyColumn,
            }}
            title={index + 1}
          >
            {index + 1}
          </td>
          <td
            style={{ ...styles.tdWithLeftBorder, ...styles.emptyColumn }}
            title="Toggle details"
          >
            <button
              style={styles.arrowButton}
              onClick={() =>
                toggleVendorRowExpansion(`complete_vendor_${vendor.id}`)
              }
              title="Toggle details"
            >
              {expandedVendorRows[`complete_vendor_${vendor.id}`] ? (
                <MdArrowDropDown style={styles.arrowIcon} />
              ) : (
                <MdArrowRight style={styles.arrowIcon} />
              )}
            </button>
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={
              vendor.vendor_code
                ? `${vendor.vendor_code} - ${vendor.vendor_name}`
                : "-"
            }
          >
            {vendor.vendor_code
              ? `${vendor.vendor_code} - ${vendor.vendor_name}`
              : "-"}
          </td>
          <td style={styles.tdWithLeftBorder} title={vendor.stock_level || "-"}>
            {vendor.stock_level || "-"}
          </td>
          <td style={styles.tdWithLeftBorder} title={vendor.model_name || "-"}>
            {vendor.model_name || "-"}
          </td>
          <td style={styles.tdWithLeftBorder} title={vendor.trip_no || "-"}>
            {vendor.trip_no || "-"}
          </td>
          <td style={styles.tdWithLeftBorder} title={vendor.do_numbers || "-"}>
            {vendor.do_numbers || "-"}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={vendor.total_pallet?.toString() || "0"}
          >
            {vendor.total_pallet || 0}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={vendor.total_item?.toString() || "0"}
          >
            {vendor.total_item || 0}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={vendor.arrival_time || "-"}
          >
            {vendor.arrival_time || "-"}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={formatDate(vendor.schedule_date)}
          >
            {formatDate(vendor.schedule_date)}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={
              vendor.complete_by_name
                ? `${vendor.complete_by_name} | ${formatDateTime(
                    vendor.complete_at
                  )}`
                : "-"
            }
          >
            {vendor.complete_by_name
              ? `${vendor.complete_by_name} | ${formatDateTime(
                  vendor.complete_at
                )}`
              : "-"}
          </td>
        </tr>
        {expandedVendorRows[`complete_vendor_${vendor.id}`] && (
          <tr>
            <td colSpan="12" style={{ padding: 0, border: "none" }}>
              <div
                style={{
                  ...styles.thirdLevelTableContainer,
                  marginLeft: tableConfig.Complete.partsTable?.marginLeft,
                }}
              >
                <table style={styles.thirdLevelTable}>
                  {renderColgroup(tableConfig.Complete.partsTable.cols)}
                  <thead>
                    <tr style={styles.expandedTableHeader}>
                      <th style={styles.thirdLevelTh}>No</th>
                      <th style={styles.thirdLevelTh}>Part Code</th>
                      <th style={styles.thirdLevelTh}>Part Name</th>
                      <th style={styles.thirdLevelTh}>Qty</th>
                      <th style={styles.thirdLevelTh}>Qty Box</th>
                      <th style={styles.thirdLevelTh}>Unit</th>
                      <th style={styles.thirdLevelTh}>Prod Date</th>
                      <th style={styles.thirdLevelTh}>Status</th>
                      <th style={styles.thirdLevelTh}>Sample</th>
                      <th style={styles.thirdLevelTh}>Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendor.parts?.length > 0 ? (
                      vendor.parts.map((part, i) => (
                        <tr key={part.id}>
                          <td
                            style={{
                              ...styles.expandedTd,
                              ...styles.expandedWithLeftBorder,
                              ...styles.emptyColumn,
                            }}
                            title={i + 1}
                          >
                            {i + 1}
                          </td>
                          <td
                            style={styles.thirdLevelTd}
                            title={part.part_code || "-"}
                          >
                            {part.part_code || "-"}
                          </td>
                          <td
                            style={styles.thirdLevelTd}
                            title={part.part_name || "-"}
                          >
                            {part.part_name || "-"}
                          </td>
                          <td
                            style={styles.thirdLevelTd}
                            title={part.qty?.toString() || "-"}
                          >
                            {part.qty || "-"}
                          </td>
                          <td
                            style={styles.thirdLevelTd}
                            title={part.qty_box?.toString() || "-"}
                          >
                            {part.qty_box || "-"}
                          </td>
                          <td
                            style={styles.thirdLevelTd}
                            title={part.unit || "PCS"}
                          >
                            {part.unit || "PCS"}
                          </td>
                          <td
                            style={styles.thirdLevelTd}
                            title={(() => {
                              const allDates = [];
                              if (part.prod_dates && part.prod_dates.length > 0) {
                                part.prod_dates.forEach((d) => {
                                  if (d && d.date) allDates.push(formatDate(d.date));
                                  else if (d && typeof d === "string") allDates.push(formatDate(d));
                                });
                              } else if (part.prod_date) {
                                allDates.push(formatDate(part.prod_date));
                              }
                              return allDates.length > 0 ? allDates.join(", ") : "-";
                            })()}
                          >
                            {(() => {
                              const allDates = [];
                              if (part.prod_dates && part.prod_dates.length > 0) {
                                part.prod_dates.forEach((d) => {
                                  if (d && d.date) allDates.push(formatDate(d.date));
                                  else if (d && typeof d === "string") allDates.push(formatDate(d));
                                });
                              } else if (part.prod_date) {
                                allDates.push(formatDate(part.prod_date));
                              }
                              return allDates.length > 0 ? allDates.join(", ") : "-";
                            })()}
                          </td>
                          <td
                            style={styles.thirdLevelTd}
                            title={(() => {
                              const { status } = getPartSampleStatus(part);
                              return status || "-";
                            })()}
                          >
                            {(() => {
                              const { status } = getPartSampleStatus(part);
                              return status || "-";
                            })()}
                          </td>
                          <td
                            style={styles.thirdLevelTd}
                            title={(() => {
                              const { sampleDates } = getPartSampleStatus(part);
                              return sampleDates.length > 0
                                ? sampleDates.map((d) => formatDate(d)).join(", ")
                                : "-";
                            })()}
                          >
                            {(() => {
                              const { sampleDates } = getPartSampleStatus(part);
                              return sampleDates.length > 0
                                ? sampleDates.map((d) => formatDate(d)).join(", ")
                                : "-";
                            })()}
                          </td>
                          <td
                            style={styles.thirdLevelTd}
                            title={part.remark || "-"}
                          >
                            {part.remark || "-"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="9"
                          style={{
                            textAlign: "center",
                            padding: "10px",
                            color: "#6b7280",
                          }}
                          title="No parts"
                        >
                          No parts
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
    if (loading)
      return (
        <tr>
          <td
            colSpan="11"
            style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}
          >
            Loading...
          </td>
        </tr>
      );

    return schedules.map((schedule, index) => (
      <React.Fragment key={`schedule-${schedule.id}`}>
        <tr>
          <td
            style={{
              ...styles.expandedTd,
              ...styles.expandedWithLeftBorder,
              ...styles.emptyColumn,
            }}
          >
            {index + 1}
          </td>
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
          {/* REMOVED MdArrowDropDown for Today tab - empty cell instead */}
          <td style={{ ...styles.tdWithLeftBorder, ...styles.emptyColumn }}>
            {activeTab === "Today" ? null : (
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
            )}
          </td>
          <td style={styles.tdWithLeftBorder}>
            {editingScheduleId === schedule.id ? (
              <input
                type="date"
                style={styles.inlineInput}
                value={editScheduleData.schedule_date || ""}
                onChange={(e) =>
                  setEditScheduleData((p) => ({
                    ...p,
                    schedule_date: e.target.value,
                  }))
                }
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
                onChange={(e) =>
                  setEditScheduleData((p) => ({
                    ...p,
                    stock_level: e.target.value,
                  }))
                }
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
                onChange={(e) =>
                  setEditScheduleData((p) => ({
                    ...p,
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
          {/* ACTION column with Add Vendor button moved here */}
          <td style={styles.tdWithLeftBorder}>
            {editingScheduleId === schedule.id ? (
              <>
                <button
                  style={styles.saveButton}
                  onClick={() => handleSaveEditSchedule(schedule.id)}
                  title="Save"
                  
                  
                >
                  <Save size={10} />
                </button>
                <button
                  style={styles.cancelButton}
                  onClick={handleCancelEditSchedule}
                  title="Cancel"
                  
                  
                >
                  <X size={10} />
                </button>
              </>
            ) : (
              <>
                {activeTab === "Schedule" && canEditSchedule && (
                  <button
                    style={styles.editButton}
                    onClick={() => handleEditSchedule(schedule)}
                    title="Edit"
                    
                    
                  >
                    <Pencil size={10} />
                  </button>
                )}
                {canDeleteSchedule && (
                  <button
                    style={styles.deleteButton}
                    onClick={() => handleDeleteSchedule(schedule.id)}
                    title="Delete"
                    
                    
                  >
                    <Trash2 size={10} />
                  </button>
                )}
                {/* ADD VENDOR BUTTON MOVED HERE - beside delete */}
                {(activeTab === "Today" || activeTab === "Schedule") && (
                  <button
                    style={styles.addButton}
                    onClick={() => handleOpenAddVendor(schedule.id)}
                    title="Add Vendor"
                    
                    
                  >
                    <Plus size={10} />
                  </button>
                )}
              </>
            )}
          </td>
        </tr>

        {(activeTab === "Today" || expandedRows[schedule.id]) && (
          <tr>
            <td colSpan="11" style={{ padding: 0, border: "none" }}>
              <div
                style={{
                  ...styles.expandedTableContainer,
                  marginLeft: getCurrentConfig().vendorTable?.marginLeft,
                }}
              >
                <table style={styles.expandedTable}>
                  {renderColgroup(
                    getCurrentConfig().vendorTable?.cols ||
                      tableConfig.Today.vendorTable.cols
                  )}
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
                        <th style={styles.expandedTh}>Action</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.vendors?.length > 0 ? (
                      schedule.vendors.map((vendor, vi) => (
                        <React.Fragment key={vendor.id}>
                          <tr>
                            <td
                              style={{
                                ...styles.expandedTd,
                                ...styles.expandedWithLeftBorder,
                                ...styles.emptyColumn,
                              }}
                            >
                              {vi + 1}
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
                                    `vendor_${schedule.id}_${vi}`
                                  )
                                }
                              >
                                {expandedVendorRows[
                                  `vendor_${schedule.id}_${vi}`
                                ] ? (
                                  <MdArrowDropDown style={styles.arrowIcon} />
                                ) : (
                                  <MdArrowRight style={styles.arrowIcon} />
                                )}
                              </button>
                            </td>
                            <td style={styles.expandedTd} title={vendor.trip_no || "-"}>
                              {vendor.trip_no || "-"}
                            </td>
                            <td style={styles.expandedTd} title={vendor.vendor_code ? `${vendor.vendor_code} - ${vendor.vendor_name}` : "-"}>
                              {vendor.vendor_code
                                ? `${vendor.vendor_code} - ${vendor.vendor_name}`
                                : "-"}
                            </td>
                            <td style={styles.expandedTd} title={vendor.do_numbers || "-"}>
                              {vendor.do_numbers || "-"}
                            </td>
                            <td style={styles.expandedTd} title={vendor.arrival_time || "-"}>
                              {vendor.arrival_time || "-"}
                            </td>
                            <td style={styles.expandedTd} title={vendor.total_pallet?.toString() || "0"}>
                              {vendor.total_pallet || 0}
                            </td>
                            <td style={styles.expandedTd} title={vendor.total_item?.toString() || "0"}>
                              {vendor.total_item || 0}
                            </td>
                            {(activeTab === "Today" ||
                              activeTab === "Schedule") && (
                              <td style={styles.expandedTd} title="Action">
                                <button
                                  style={styles.addButton}
                                  onClick={() =>
                                    handleOpenAddPart(vendor.id, vendor)
                                  }
                                  title="Add Part"
                                  
                                  
                                >
                                  <Plus size={10} />
                                </button>
                                {activeTab === "Today" && (
                                  <button
                                    style={styles.checkButton}
                                    onClick={() =>
                                      handleMoveVendorToReceived(
                                        vendor.id,
                                        schedule.id
                                      )
                                    }
                                    title="Move to Received"
                                    
                                    
                                  >
                                    <CheckCircle size={10} />
                                  </button>
                                )}
                                {canDeleteSchedule && (
                                  <button
                                    style={styles.deleteButton}
                                    onClick={() =>
                                      handleDeleteVendor(vendor.id)
                                    }
                                    title="Delete"
                                    
                                    
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                          {expandedVendorRows[
                            `vendor_${schedule.id}_${vi}`
                          ] && (
                            <tr>
                              <td
                                colSpan={
                                  activeTab === "Today" ||
                                  activeTab === "Schedule"
                                    ? "9"
                                    : "8"
                                }
                                style={{ padding: 0, border: "none" }}
                              >
                                <div
                                  style={{
                                    ...styles.thirdLevelTableContainer,
                                    marginLeft:
                                      getCurrentConfig().partsTable?.marginLeft,
                                  }}
                                >
                                  <table style={styles.thirdLevelTable}>
                                    {renderColgroup(
                                      getCurrentConfig().partsTable?.cols ||
                                        tableConfig.Today.partsTable.cols
                                    )}
                                    <thead>
                                      <tr style={styles.expandedTableHeader}>
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
                                        <th style={styles.thirdLevelTh}>
                                          Prod Date
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
                                      {vendor.parts?.length > 0 ? (
                                        vendor.parts.map((part, pi) => (
                                          <tr key={part.id}>
                                            <td
                                              style={{
                                                ...styles.expandedTd,
                                                ...styles.expandedWithLeftBorder,
                                                ...styles.emptyColumn,
                                              }}
                                              title={pi + 1}
                                            >
                                              {pi + 1}
                                            </td>
                                            <td style={styles.thirdLevelTd} title={part.part_code || "-"}>
                                              {editingPartId === part.id ? (
                                                <input
                                                  type="text"
                                                  style={styles.inlineInput}
                                                  value={
                                                    editPartData.part_code || ""
                                                  }
                                                  onChange={(e) =>
                                                    setEditPartData((p) => ({
                                                      ...p,
                                                      part_code: e.target.value,
                                                    }))
                                                  }
                                                />
                                              ) : (
                                                part.part_code || "-"
                                              )}
                                            </td>
                                            <td style={styles.thirdLevelTd} title={part.part_name || "-"}>
                                              {editingPartId === part.id ? (
                                                <input
                                                  type="text"
                                                  style={styles.inlineInput}
                                                  value={
                                                    editPartData.part_name || ""
                                                  }
                                                  onChange={(e) =>
                                                    setEditPartData((p) => ({
                                                      ...p,
                                                      part_name: e.target.value,
                                                    }))
                                                  }
                                                />
                                              ) : (
                                                part.part_name || "-"
                                              )}
                                            </td>
                                            <td style={styles.thirdLevelTd} title={part.qty?.toString() || "0"}>
                                              {editingPartId === part.id ? (
                                                <input
                                                  type="number"
                                                  style={styles.inlineInput}
                                                  value={editPartData.qty || ""}
                                                  onChange={(e) =>
                                                    handleQtyChangeInEdit(
                                                      e.target.value
                                                    )
                                                  }
                                                />
                                              ) : (
                                                part.qty || 0
                                              )}
                                            </td>
                                            <td style={styles.thirdLevelTd} title={part.qty_box?.toString() || "0"}>
                                              {editingPartId === part.id ? (
                                                <input
                                                  type="number"
                                                  style={styles.inlineInput}
                                                  value={
                                                    editPartData.qty_box || ""
                                                  }
                                                  readOnly
                                                />
                                              ) : (
                                                part.qty_box || 0
                                              )}
                                            </td>
                                            <td style={styles.thirdLevelTd} title={part.unit || "PCS"}>
                                              {editingPartId === part.id ? (
                                                <input
                                                  type="text"
                                                  style={styles.inlineInput}
                                                  value={
                                                    editPartData.unit || "PCS"
                                                  }
                                                  onChange={(e) =>
                                                    setEditPartData((p) => ({
                                                      ...p,
                                                      unit: e.target.value,
                                                    }))
                                                  }
                                                />
                                              ) : (
                                                part.unit || "PCS"
                                              )}
                                            </td>
                                            <td
                                              style={styles.thirdLevelTd}
                                              title={(() => {
                                                const prodDates = part.prod_dates || (part.prod_date ? [part.prod_date] : []);
                                                if (prodDates.length === 0) return "-";
                                                return prodDates.map((d) => formatDate(d)).join(", ");
                                              })()}
                                            >
                                              {activeTab === "Today" ? (
                                                editingPartId === part.id ? (
                                                  <div style={styles.inlineProdDatesContainer}>
                                                    {(editPartData.prod_dates || [""]).map((date, dateIdx) => (
                                                      <div key={dateIdx} style={styles.inlineProdDateItem}>
                                                        <input
                                                          type="date"
                                                          style={styles.inlineProdDateInput}
                                                          value={date || ""}
                                                          onChange={(e) => {
                                                            const newDates = [...(editPartData.prod_dates || [""])];
                                                            newDates[dateIdx] = e.target.value;
                                                            setEditPartData((p) => ({
                                                              ...p,
                                                              prod_dates: newDates,
                                                              prod_date: newDates[0] || null,
                                                            }));
                                                          }}
                                                        />
                                                        {(editPartData.prod_dates || []).length > 1 && (
                                                          <button
                                                            style={styles.inlineProdDateRemove}
                                                            onClick={() => {
                                                              const newDates = (editPartData.prod_dates || []).filter((_, i) => i !== dateIdx);
                                                              setEditPartData((p) => ({
                                                                ...p,
                                                                prod_dates: newDates.length > 0 ? newDates : [""],
                                                                prod_date: newDates[0] || null,
                                                              }));
                                                            }}
                                                            title="Remove date"
                                                          >
                                                            <X size={12} />
                                                          </button>
                                                        )}
                                                      </div>
                                                    ))}
                                                    <button
                                                      style={styles.inlineProdDateAdd}
                                                      onClick={() => {
                                                        const newDates = [...(editPartData.prod_dates || [""]), ""];
                                                        setEditPartData((p) => ({
                                                          ...p,
                                                          prod_dates: newDates,
                                                        }));
                                                      }}
                                                      title="Add date"
                                                    >
                                                      <Plus size={10} />
                                                    </button>
                                                  </div>
                                                ) : (
                                                  <span style={styles.prodDatesBadge}>
                                                    {(() => {
                                                      const prodDates =
                                                        part.prod_dates ||
                                                        (part.prod_date
                                                          ? [part.prod_date]
                                                          : []);
                                                      if (prodDates.length === 0) return "-";
                                                      return prodDates.map((d) => formatDate(d)).join(", ");
                                                    })()}
                                                  </span>
                                                )
                                              ) : (
                                                // Tab New dan Schedule: Tampilkan "-"
                                                "-"
                                              )}
                                            </td>
                                            {activeTab === "Today" && (
                                              <td style={styles.thirdLevelTd} title={part.remark || "-"}>
                                                {editingPartId === part.id ? (
                                                  <input
                                                    type="text"
                                                    style={styles.inlineInput}
                                                    value={
                                                      editPartData.remark || ""
                                                    }
                                                    onChange={(e) =>
                                                      setEditPartData((p) => ({
                                                        ...p,
                                                        remark: e.target.value,
                                                      }))
                                                    }
                                                  />
                                                ) : (
                                                  part.remark || "-"
                                                )}
                                              </td>
                                            )}
                                            <td style={styles.thirdLevelTd} title="Action">
                                              {editingPartId === part.id ? (
                                                <>
                                                  <button
                                                    style={styles.saveButton}
                                                    onClick={() =>
                                                      handleSaveEditPart(
                                                        part.id
                                                      )
                                                    }
                                                    title="Save"
                                                    
                                                    
                                                  >
                                                    <Save size={10} />
                                                  </button>
                                                  <button
                                                    style={styles.cancelButton}
                                                    onClick={
                                                      handleCancelEditPart
                                                    }
                                                    title="Cancel"
                                                    
                                                    
                                                  >
                                                    <X size={10} />
                                                  </button>
                                                </>
                                              ) : (
                                                <>
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
                                                        title="Edit"
                                                      >
                                                        <Pencil size={10} />
                                                      </button>
                                                    )}
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
                                                      title="Delete"
                                                      
                                                      
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
      <div>
        <Helmet>
          <title>Inventory Control | Local Schedule</title>
        </Helmet>
      </div>

      <div style={styles.welcomeCard}>
        <div style={styles.combinedHeaderFilter}>
          <div style={styles.headerRow}>
            <h1 style={styles.title}>Local Schedule</h1>
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
                onChange={(e) =>
                  handleFilterChange("vendorName", e.target.value)
                }
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
                onClick={() => {
                  activeTab === "Received"
                    ? fetchReceivedVendors()
                    : fetchSchedules();
                }}
                onMouseEnter={(e) => handleButtonHover(e, true, "primary")}
                onMouseLeave={(e) => handleButtonHover(e, false, "primary")}
              >
                Search
              </button>
            </div>
          </div>
        </div>

        {canCreateSchedule && (
          <div style={styles.actionButtonsGroup}>
            <button
              style={{ ...styles.button, ...styles.primaryButton }}
              onClick={() => navigate("/local-schedule/add")}
              onMouseEnter={(e) => handleButtonHover(e, true, "primary")}
              onMouseLeave={(e) => handleButtonHover(e, false, "primary")}
            >
              <Plus size={16} />
              Create
            </button>
          </div>
        )}

        <div style={styles.tabsContainer}>
          {[
            "New",
            "Schedule",
            "Today",
            "Received",
            "IQC Progress",
            "Sample",
            "Complete",
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
              {tab}
            </button>
          ))}
        </div>

        <div style={styles.tableContainer}>
          <div style={styles.tableBodyWrapper}>
            {activeTab === "Received" ? (
              <table style={{ ...styles.table, minWidth: "1400px" }}>
                {renderColgroup(tableConfig.Received.mainTable.cols)}
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.expandedTh}>No</th>
                    <th style={styles.thWithLeftBorder}></th>
                    <th style={styles.thWithLeftBorder}>Vendor Name</th>
                    <th style={styles.thWithLeftBorder}>Stock Level</th>
                    <th style={styles.thWithLeftBorder}>Model</th>
                    <th style={styles.thWithLeftBorder}>Trip</th>
                    <th style={styles.thWithLeftBorder}>DO Number</th>
                    <th style={styles.thWithLeftBorder}>Total Pallet</th>
                    <th style={styles.thWithLeftBorder}>Total Item</th>
                    <th style={styles.thWithLeftBorder}>Arrival Time</th>
                    <th style={styles.thWithLeftBorder}>Schedule Date</th>
                    <th style={styles.thWithLeftBorder}>Move By</th>
                    <th style={styles.thWithLeftBorder}>Action</th>
                  </tr>
                </thead>
                <tbody>{renderReceivedTab()}</tbody>
              </table>
            ) : activeTab === "IQC Progress" ? (
              <table style={{ ...styles.table, minWidth: "1400px" }}>
                {renderColgroup(tableConfig["IQC Progress"].mainTable.cols)}
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.expandedTh}>No</th>
                    <th style={styles.thWithLeftBorder}></th>
                    <th style={styles.thWithLeftBorder}>Vendor Name</th>
                    <th style={styles.thWithLeftBorder}>Stock Level</th>
                    <th style={styles.thWithLeftBorder}>Model</th>
                    <th style={styles.thWithLeftBorder}>Trip</th>
                    <th style={styles.thWithLeftBorder}>DO Number</th>
                    <th style={styles.thWithLeftBorder}>Total Pallet</th>
                    <th style={styles.thWithLeftBorder}>Total Item</th>
                    <th style={styles.thWithLeftBorder}>Arrival Time</th>
                    <th style={styles.thWithLeftBorder}>Schedule Date</th>
                    <th style={styles.thWithLeftBorder}>Approve By</th>
                    <th style={styles.thWithLeftBorder}>Action</th>
                  </tr>
                </thead>
                <tbody>{renderIqcProgressTab()}</tbody>
              </table>
            ) : activeTab === "Sample" ? (
              <table style={{ ...styles.table, minWidth: "1400px" }}>
                {renderColgroup(tableConfig.Sample.mainTable.cols)}
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.expandedTh}>No</th>
                    <th style={styles.thWithLeftBorder}></th>
                    <th style={styles.thWithLeftBorder}>Vendor Name</th>
                    <th style={styles.thWithLeftBorder}>Stock Level</th>
                    <th style={styles.thWithLeftBorder}>Model</th>
                    <th style={styles.thWithLeftBorder}>Trip</th>
                    <th style={styles.thWithLeftBorder}>DO Number</th>
                    <th style={styles.thWithLeftBorder}>Total Pallet</th>
                    <th style={styles.thWithLeftBorder}>Total Item</th>
                    <th style={styles.thWithLeftBorder}>Arrival Time</th>
                    <th style={styles.thWithLeftBorder}>Schedule Date</th>
                    <th style={styles.thWithLeftBorder}>Move By</th>
                    <th style={styles.thWithLeftBorder}>Action</th>
                  </tr>
                </thead>
                <tbody>{renderSampleTab()}</tbody>
              </table>
            ) : activeTab === "Complete" ? (
              <table style={{ ...styles.table, minWidth: "1400px" }}>
                {renderColgroup(tableConfig.Complete.mainTable.cols)}
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.expandedTh}>No</th>
                    <th style={styles.thWithLeftBorder}></th>
                    <th style={styles.thWithLeftBorder}>Vendor Name</th>
                    <th style={styles.thWithLeftBorder}>Stock Level</th>
                    <th style={styles.thWithLeftBorder}>Model</th>
                    <th style={styles.thWithLeftBorder}>Trip</th>
                    <th style={styles.thWithLeftBorder}>DO Number</th>
                    <th style={styles.thWithLeftBorder}>Total Pallet</th>
                    <th style={styles.thWithLeftBorder}>Total Item</th>
                    <th style={styles.thWithLeftBorder}>Arrival Time</th>
                    <th style={styles.thWithLeftBorder}>Schedule Date</th>
                    <th style={styles.thWithLeftBorder}>Move By</th>
                  </tr>
                </thead>
                <tbody>{renderCompleteTab()}</tbody>
              </table>
            ) : (
              <table style={{ ...styles.table, minWidth: "1200px" }}>
                {renderColgroup(getCurrentConfig().mainTable.cols)}
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.expandedTh}>No</th>
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
                    <th style={styles.thWithLeftBorder}>Action</th>
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

        {activeTab !== "Received" &&
          activeTab !== "IQC Progress" &&
          activeTab !== "Sample" &&
          schedules.length > 0 && (
            <div style={styles.saveConfiguration}>
              {activeTab === "New" && (
                <button
                  style={{
                    ...styles.button,
                    ...styles.primaryButton,
                    cursor:
                      selectedScheduleIds.size === 0
                        ? "not-allowed"
                        : "pointer",
                    opacity: selectedScheduleIds.size === 0 ? 0.6 : 1,
                  }}
                  onClick={() => {
                    if (selectedScheduleIds.size === 0) {
                      alert("Select schedule");
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
            </div>
          )}

        {/* ADD VENDOR POPUP - from AddLocalSchedulePage.js */}
        {addVendorDetail && (
          <div style={vendorDetailStyles.popupOverlay}>
            <div style={vendorDetailStyles.popupContainer}>
              <div style={vendorDetailStyles.popupHeader}>
                <h3 style={vendorDetailStyles.popupTitle}>Add Vendor Detail</h3>
                <button
                  onClick={() => {
                    setAddVendorFormData({
                      trip: "",
                      vendor: "",
                      doNumbers: [""],
                      arrivalTime: "",
                    });
                    setAddVendorDetail(false);
                  }}
                  style={vendorDetailStyles.closeButton}
                >
                  ×
                </button>
              </div>
              <form
                onSubmit={handleAddVendorSubmit}
                style={vendorDetailStyles.form}
              >
                <div style={vendorDetailStyles.formGroup}>
                  <label style={vendorDetailStyles.label}>Trip:</label>
                  <select
                    value={addVendorFormData.trip}
                    onChange={onTripChange}
                    style={vendorDetailStyles.select}
                    required
                  >
                    <option value="">Select Trip</option>
                    {tripOptions.length === 0 ? (
                      <option value="" disabled>
                        (loading / empty)
                      </option>
                    ) : (
                      tripOptions.map((t) => (
                        <option key={t.id} value={String(t.trip_no)}>
                          {t.trip_no}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div style={vendorDetailStyles.formGroup}>
                  <label style={vendorDetailStyles.label}>Arrival Time:</label>
                  <input
                    type="time"
                    value={(addVendorFormData.arrivalTime || "").slice(0, 5)}
                    readOnly
                    style={vendorDetailStyles.timeInput}
                    required
                  />
                </div>
                <div style={vendorDetailStyles.formGroup}>
                  <label style={vendorDetailStyles.label}>Vendor:</label>
                  <select
                    value={addVendorFormData.vendor}
                    onChange={(e) =>
                      handleAddVendorInputChange("vendor", e.target.value)
                    }
                    style={vendorDetailStyles.select}
                    required
                  >
                    <option value="">Select Vendor</option>
                    {vendorOptions.length === 0 ? (
                      <option value="" disabled>
                        (loading / empty)
                      </option>
                    ) : (
                      vendorOptions.map((v) => {
                        const label = `${v.vendor_code} - ${v.vendor_name}`;
                        return (
                          <option key={v.id} value={label}>
                            {label}
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>
                <div style={vendorDetailStyles.formGroup}>
                  <label style={vendorDetailStyles.label}>Do Number:</label>
                  {addVendorFormData.doNumbers.map((doNumber, index) => (
                    <div
                      key={index}
                      style={vendorDetailStyles.doNumberContainer}
                    >
                      <input
                        type="text"
                        value={doNumber}
                        onChange={(e) =>
                          handleDoNumberChange(index, e.target.value)
                        }
                        placeholder={`Do Number ${index + 1}`}
                        style={vendorDetailStyles.input}
                        required
                      />
                      {addVendorFormData.doNumbers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDoNumberField(index)}
                          style={vendorDetailStyles.removeButton}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addDoNumberField}
                    style={vendorDetailStyles.addButton}
                  >
                    <Plus size={12} />
                    Add Column
                  </button>
                </div>
                <div style={vendorDetailStyles.buttonGroup}>
                  <button
                    type="button"
                    onClick={() => {
                      setAddVendorFormData({
                        trip: "",
                        vendor: "",
                        doNumbers: [""],
                        arrivalTime: "",
                      });
                      setAddVendorDetail(false);
                    }}
                    style={vendorDetailStyles.cancelButton}
                  >
                    Cancel
                  </button>
                  <button type="submit" style={vendorDetailStyles.submitButton}>
                    Add
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ADD PART POPUP - from AddLocalSchedulePage.js */}
        {addVendorPartDetail && (
          <div style={vendorPartStyles.popupOverlay}>
            <div style={vendorPartStyles.popupContainer}>
              <div style={vendorPartStyles.popupHeader}>
                <h3 style={vendorPartStyles.popupTitle}>
                  Add Vendor Part Details
                </h3>
                <button
                  onClick={() => {
                    setAddVendorPartDetail(false);
                    setActiveVendorContext(null);
                    setAddVendorPartFormData({
                      trip: "",
                      vendor: "",
                      doNumbers: [""],
                      arrivalTime: "",
                      parts: [],
                    });
                    setSelectedPartsInPopup([]);
                  }}
                  style={vendorPartStyles.closeButton}
                >
                  ×
                </button>
              </div>
              <form
                onSubmit={handleAddVendorPartSubmit}
                style={vendorPartStyles.form}
              >
                <div style={vendorPartStyles.formGroup}>
                  <label style={vendorPartStyles.label}>Part Code</label>
                  <div style={vendorPartStyles.inputContainer}>
                    <input
                      type="text"
                      style={vendorPartStyles.input}
                      placeholder="Enter part code"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddPart(e.target.value);
                          e.target.value = "";
                        }
                      }}
                    />
                    <button
                      type="button"
                      style={vendorPartStyles.addPartButton}
                      onClick={(e) => {
                        const input =
                          e.currentTarget.parentElement.querySelector("input");
                        if (!input) {
                          console.error("Part Code input not found");
                          return;
                        }
                        handleAddPart(input.value);
                        input.value = "";
                      }}
                    >
                      <Plus size={16} />
                      Add
                    </button>
                  </div>
                </div>
                <div style={vendorPartStyles.partDetailsSection}>
                  <h4 style={vendorPartStyles.sectionTitle}>Part List</h4>
                  <div style={vendorPartStyles.tableContainer}>
                    <div style={vendorPartStyles.tableBodyWrapper}>
                      <table
                        style={{
                          ...styles.table,
                          minWidth: "900px",
                          tableLayout: "fixed",
                        }}
                      >
                        <colgroup>
                          <col style={{ width: "2.5%" }} />
                          <col style={{ width: "2.5%" }} />
                          <col style={{ width: "15%" }} />
                          <col style={{ width: "25%" }} />
                          <col style={{ width: "10%" }} />
                          <col style={{ width: "10%" }} />
                          <col style={{ width: "10%" }} />
                          <col style={{ width: "8%" }} />
                        </colgroup>
                        <thead>
                          <tr style={vendorPartStyles.tableHeader}>
                            <th style={vendorPartStyles.th}>No</th>
                            <th style={vendorPartStyles.th}>
                              {addVendorPartFormData.parts.length > 1 && (
                                <input
                                  type="checkbox"
                                  onChange={handleSelectAllInPopup}
                                  checked={
                                    addVendorPartFormData.parts.length > 0 &&
                                    selectedPartsInPopup.length ===
                                      addVendorPartFormData.parts.length
                                  }
                                  style={{
                                    cursor: "pointer",
                                    width: "12px",
                                    height: "12px",
                                  }}
                                />
                              )}
                            </th>
                            <th style={vendorPartStyles.th}>Part Code</th>
                            <th style={vendorPartStyles.th}>Part Name</th>
                            <th style={vendorPartStyles.th}>Qty</th>
                            <th style={vendorPartStyles.th}>Qty Box</th>
                            <th style={vendorPartStyles.th}>Unit</th>
                            <th style={vendorPartStyles.th}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {addVendorPartFormData.parts.length === 0 ? (
                            <tr></tr>
                          ) : (
                            addVendorPartFormData.parts.map((part, index) => (
                              <tr
                                key={part.id || index}
                                onMouseEnter={(e) =>
                                  (e.target.closest(
                                    "tr"
                                  ).style.backgroundColor = "#c7cde8")
                                }
                                onMouseLeave={(e) =>
                                  (e.target.closest(
                                    "tr"
                                  ).style.backgroundColor = "transparent")
                                }
                              >
                                <td style={vendorPartStyles.tdNumber}>
                                  {index + 1}
                                </td>
                                <td style={styles.tdWithLeftBorder}>
                                  <input
                                    type="checkbox"
                                    checked={selectedPartsInPopup.includes(
                                      part.id
                                    )}
                                    onChange={(e) =>
                                      handlePopupCheckboxChange(e, part.id)
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
                                <td
                                  style={vendorPartStyles.td}
                                  
                                  
                                  title={`${part.partCode}`}
                                >
                                  {part.partCode}
                                </td>
                                <td
                                  style={vendorPartStyles.td}
                                  
                                  
                                  title={`${part.partName || "—"}`}
                                >
                                  {part.partName || "—"}
                                </td>
                                <td style={vendorPartStyles.td}>
                                  <input
                                    type="number"
                                    value={part.qty || ""}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (
                                        value.includes("e") ||
                                        value.includes("E")
                                      ) {
                                        const cleanValue = value.replace(
                                          /[eE]/g,
                                          ""
                                        );
                                        handlePopupPartQtyChange(
                                          part.id,
                                          cleanValue
                                        );
                                      } else {
                                        handlePopupPartQtyChange(
                                          part.id,
                                          value
                                        );
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (["e", "E", "+"].includes(e.key)) {
                                        e.preventDefault();
                                      }
                                    }}
                                    style={{
                                      width: "60px",
                                      padding: "2px",
                                      fontSize: "12px",
                                      textAlign: "center",
                                      border: "1px solid #d1d5db",
                                      borderRadius: "3px",
                                    }}
                                    placeholder="0"
                                  />
                                </td>
                                <td style={vendorPartStyles.td}>
                                  <div>
                                    <div>{part.qtyBox || ""}</div>
                                    {part.qtyPerBoxFromMaster &&
                                      part.qtyPerBoxFromMaster > 0 && (
                                        <div
                                          style={{
                                            fontSize: "9px",
                                            color: "#6b7280",
                                          }}
                                        ></div>
                                      )}
                                  </div>
                                </td>
                                <td
                                  style={vendorPartStyles.td}
                                  
                                  
                                  title={`${part.unit || "PCS"}`}
                                >
                                  {part.unit || "PCS"}
                                </td>
                                <td style={vendorPartStyles.td}>
                                  <button
                                    style={vendorPartStyles.deleteButton}
                                    onClick={() => handleRemovePart(part.id)}
                                    
                                    
                                    title="Delete"
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
                    <div style={vendorPartStyles.paginationBar}>
                      <div style={vendorPartStyles.paginationControls}>
                        <button style={vendorPartStyles.paginationButton}>
                          {"<<"}
                        </button>
                        <button style={vendorPartStyles.paginationButton}>
                          {"<"}
                        </button>
                        <span>Page</span>
                        <input
                          type="text"
                          value="1"
                          style={vendorPartStyles.paginationInput}
                          readOnly
                        />
                        <span>of 1</span>
                        <button style={vendorPartStyles.paginationButton}>
                          {">"}
                        </button>
                        <button style={vendorPartStyles.paginationButton}>
                          {">>"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={vendorPartStyles.buttonGroup}>
                  <button
                    type="button"
                    onClick={() => {
                      setAddVendorPartDetail(false);
                      setActiveVendorContext(null);
                    }}
                    style={vendorPartStyles.cancelButton}
                  >
                    Cancel
                  </button>
                  <button type="submit" style={vendorPartStyles.submitButton}>
                    Insert
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      {/* Production Dates Popup (for Today tab) */}
      {showProdDatesPopup && activeProdDatesPart && (
        <div style={styles.popupOverlayDates}>
          <div style={styles.popupContainerDates}>
            <div style={styles.popupHeaderDates}>
              <h3 style={styles.popupTitleDates}>
                Production Dates - {activeProdDatesPart.part_code}
              </h3>
              <button
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#6b7280",
                }}
                onClick={handleCloseProdDatesPopup}
              >
                ×
              </button>
            </div>
            <div>
              <p
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  marginBottom: "12px",
                }}
              >
                Add multiple production dates for this part. These dates will be
                used for QC sampling.
              </p>
              {tempProdDates.map((date, index) => (
                <div key={index} style={styles.dateInputRow}>
                  <input
                    type="date"
                    style={styles.dateInput}
                    value={date}
                    onChange={(e) =>
                      handleProdDateChange(index, e.target.value)
                    }
                  />
                  {tempProdDates.length > 1 && (
                    <button
                      style={styles.removeDateButton}
                      onClick={() => handleRemoveProdDate(index)}
                      title="Remove date"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button style={styles.addDateButton} onClick={handleAddProdDate}>
                <Plus size={14} /> Add Another Date
              </button>
            </div>
            <div style={styles.buttonGroupDates}>
              <button
                style={styles.secondaryButtonDates}
                onClick={handleCloseProdDatesPopup}
              >
                Cancel
              </button>
              <button
                style={styles.primaryButtonDates}
                onClick={handleSaveProdDates}
              >
                Save Dates
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocalSchedulePage;