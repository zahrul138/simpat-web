"use client";

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MdArrowRight, MdArrowDropDown } from "react-icons/md";
import { Plus, Trash2, Pencil, Save, Check, X, RotateCcw } from "lucide-react";
import { Helmet } from "react-helmet";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const getAuthUserLocal = () => {
  try {
    return JSON.parse(sessionStorage.getItem("auth_user") || "null");
  } catch {
    return null;
  }
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

const formatApprovedBy = (approvedBy, approvedAt) => {
  if (!approvedBy) return "-";

  let dateStr = "";
  if (approvedAt) {
    try {
      const date = new Date(approvedAt);
      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        dateStr = `${day}/${month}/${year} ${hours}.${minutes}`;
      }
    } catch {
      dateStr = "";
    }
  }

  return dateStr ? `${approvedBy} | ${dateStr}` : approvedBy;
};

const QCCheckPage = ({ sidebarVisible }) => {
  const navigate = useNavigate();
  const [productionSchedules, setProductionSchedules] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
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
  const [activeTab, setActiveTab] = useState("M101 Part");
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
  // STATE FOR PAGINATION
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // 10 items per page

  // STATE FOR COMPLETE TAB
  const [completeQCChecks, setCompleteQCChecks] = useState([]);

  // REF FOR PROCESSING (useRef for instant blocking, no re-render delay)
  const isProcessingRef = useRef(false);

  // STATE FOR M101 PART TAB (dari Local Schedule IQC Progress)
  const [m101Parts, setM101Parts] = useState([]);
  const [selectedM101Ids, setSelectedM101Ids] = useState(new Set());

  // STATE FOR M136 PART TAB (dari Oversea Schedule IQC Progress)
  const [m136Parts, setM136Parts] = useState([]);
  const [selectedM136Ids, setSelectedM136Ids] = useState(new Set());

  // STATE FOR REJECT TAB
  const [rejectQCChecks, setRejectQCChecks] = useState([]);

  // STATE FOR QC CHECKS COMPLETE (untuk cek status sample)
  const [qcChecksComplete, setQcChecksComplete] = useState([]);

  // STATE FOR EDIT (keeping original)
  const [editingCurrentId, setEditingCurrentId] = useState(null);
  const [editCurrentData, setEditCurrentData] = useState({ qc_status: "" });

  // Fetch QC Checks when tab changes
  useEffect(() => {
    if (activeTab === "Complete") {
      fetchCompleteQCChecks();
    } else if (activeTab === "M101 Part") {
      fetchM101Parts();
    } else if (activeTab === "M136 Part") {
      fetchM136Parts();
    } else if (activeTab === "Reject") {
      fetchRejectQCChecks();
    }
  }, [activeTab]);

  const fetchCompleteQCChecks = async () => {
    setLoading(true);
    try {
      // PERBAIKAN: Filter status=Complete
      const response = await fetch(`${API_BASE}/api/qc-checks?status=Complete`);
      const result = await response.json();

      if (result.success) {
        setCompleteQCChecks(result.data || []);
      } else {
        setCompleteQCChecks([]);
      }
    } catch (error) {
      console.error("Error fetching QC checks:", error);
      setCompleteQCChecks([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch M101 Parts (dari Local Schedule IQC Progress)
  const fetchM101Parts = async () => {
    setLoading(true);
    try {
      // Fetch QC checks complete first
      const qcRes = await fetch(`${API_BASE}/api/qc-checks?status=Complete`);
      const qcData = await qcRes.json();
      const qcChecks = qcData.success ? qcData.data || [] : [];
      setQcChecksComplete(qcChecks);

      // Fetch IQC Progress vendors from local schedule
      const response = await fetch(`${API_BASE}/api/local-schedules/iqc-progress-vendors`);
      const data = await response.json();

      let vendors = [];
      if (data.vendors) {
        vendors = data.vendors;
      } else if (data.success && data.data) {
        vendors = data.data;
      }

      // Extract parts with incomplete sample dates
      const partsWithSamples = [];

      vendors.forEach((vendor) => {
        if (vendor.parts && vendor.parts.length > 0) {
          vendor.parts.forEach((part) => {
            const prodDates = part.prod_dates || (part.prod_date ? [part.prod_date] : []);

            // Get incomplete dates (not yet approved in qc_checks)
            const incompleteDates = prodDates.filter((date) => {
              const normalizedDate = date.split("T")[0];
              // CRITICAL FIX: Must check vendor_id to avoid false positives
              return !qcChecks.some(
                (qc) =>
                  qc.part_code === part.part_code &&
                  (qc.production_date || "").split("T")[0] === normalizedDate &&
                  qc.status === "Complete" &&
                  qc.source_vendor_id === vendor.id  // ADDED: Check vendor ID
              );
            });

            // If has incomplete dates, add each date as separate entry
            if (incompleteDates.length > 0) {
              incompleteDates.forEach((date) => {
                partsWithSamples.push({
                  id: `${part.id}-${date}`,
                  part_id: part.id,
                  vendor_id: vendor.id,
                  part_code: part.part_code,
                  part_name: part.part_name,
                  vendor_name: vendor.vendor_name,
                  production_date: date,
                  qty: part.qty,
                  qty_box: part.qty_box,
                  remark: part.remark,
                  qc_status: part.status || "",
                  source: "M101",
                });
              });
            }
          });
        }
      });

      setM101Parts(partsWithSamples);
    } catch (error) {
      console.error("Error fetching M101 parts:", error);
      setM101Parts([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch M136 Parts (dari Oversea Schedule IQC Progress)
  const fetchM136Parts = async () => {
    setLoading(true);
    try {
      // Fetch qc_checks dengan status "M136 Part" (waiting for approval)
      const response = await fetch(`${API_BASE}/api/qc-checks?status=M136 Part`);
      const result = await response.json();

      console.log("[fetchM136Parts] QC checks with M136 Part status:", result);

      if (result.success) {
        const qcChecks = result.data || [];

        // Transform to match current M136Parts structure
        const formattedParts = qcChecks.map(qc => ({
          id: qc.id,  // qc_checks.id (for approve endpoint)
          part_id: qc.source_part_id,
          vendor_id: qc.source_vendor_id,
          part_code: qc.part_code,
          part_name: qc.part_name,
          vendor_name: qc.vendor_name,
          production_date: qc.production_date,
          source: "M136",
          approve_by_name: qc.created_by || "-",  // Who created this entry
          approve_at: qc.created_at || null,
        }));

        console.log("[fetchM136Parts] Total M136 Part entries:", formattedParts.length);
        setM136Parts(formattedParts);
      } else {
        console.log("[fetchM136Parts] No M136 Part entries found");
        setM136Parts([]);
      }
    } catch (error) {
      console.error("[fetchM136Parts] Error:", error);
      setM136Parts([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Reject QC Checks
  const fetchRejectQCChecks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/qc-checks?status=Reject`);
      const result = await response.json();

      if (result.success) {
        setRejectQCChecks(result.data || []);
      } else {
        setRejectQCChecks([]);
      }
    } catch (error) {
      console.error("Error fetching reject QC checks:", error);
      setRejectQCChecks([]);
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk mendapatkan data per halaman
  const getCurrentPageData = (data) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  // Fungsi untuk menghitung total halaman
  const getTotalPages = (data) => {
    return Math.max(1, Math.ceil(data.length / itemsPerPage));
  };

  // Fungsi untuk reset halaman saat ganti tab
  useEffect(() => {
    setCurrentPage(1); // Reset ke halaman 1 saat ganti tab
  }, [activeTab]);

  // BARU: Get auth user for approve
  const getAuthUser = () => {
    try {
      return JSON.parse(localStorage.getItem("auth_user") || "null");
    } catch {
      return null;
    }
  };

  // Approve single QC Check (works from M101, M136 and Reject tabs)
  const handleApproveQCCheck = async (id, fromTab = "M101 Part") => {
    if (!window.confirm("Approve this QC Check?")) return;

    try {
      // PERBAIKAN: Gunakan getAuthUserLocal() untuk mengambil data user
      const authUser = getAuthUserLocal();
      const response = await fetch(`${API_BASE}/api/qc-checks/${id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approved_by: authUser?.id,
          approved_by_name: authUser?.emp_name || authUser?.name || "Unknown",
        }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setToastMessage("QC Check approved successfully!");
        setToastType("success");
        setTimeout(() => setToastMessage(null), 3000);
        // Refresh the appropriate tab
        if (fromTab === "Reject") {
          fetchRejectQCChecks();
        } else if (fromTab === "M101 Part") {
          fetchM101Parts();
        } else if (fromTab === "M136 Part") {
          fetchM136Parts();
        }
      } else {
        throw new Error(result.message || "Failed to approve");
      }
    } catch (error) {
      setToastMessage(`Failed to approve: ${error.message}`);
      setToastType("error");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Approve part from M101 atau M136 tab (update QC check status to Complete)
  const handleApprovePartFromSample = async (part, sourceTab) => {
    // CRITICAL: Use ref for INSTANT blocking (no re-render delay)
    if (isProcessingRef.current) {
      console.log("[handleApprovePartFromSample] Already processing, ignoring duplicate call");
      return;
    }

    if (!window.confirm("Approve this QC Check?")) return;

    // Set processing flag IMMEDIATELY
    isProcessingRef.current = true;
    console.log("[handleApprovePartFromSample] Processing locked");

    try {
      // PERBAIKAN: Gunakan getAuthUserLocal() untuk mengambil data user
      const authUser = getAuthUserLocal();
      console.log("[handleApprovePartFromSample] Auth user:", authUser);

      console.log(`[handleApprovePartFromSample] Approving QC check:`, part.id, part.part_code, part.production_date);

      // CRITICAL: Detect if this is the last row for this vendor
      // Count rows yang belong to same vendor
      const currentPartsList = sourceTab === "M101 Part" ? m101Parts : m136Parts;
      const sameVendorRows = currentPartsList.filter(p => p.vendor_id === part.vendor_id);
      const isLastRow = sameVendorRows.length === 1; // Only this row left

      console.log(`[handleApprovePartFromSample] Vendor ${part.vendor_id}: ${sameVendorRows.length} row(s) remaining, isLastRow: ${isLastRow}`);

      // UPDATE QC Check status from "M136 Part" to "Complete"
      const response = await fetch(`${API_BASE}/api/qc-checks/${part.id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approved_by: authUser?.id,
          approved_by_name: authUser?.emp_name || authUser?.name || "Unknown",
          isLastQcCheck: isLastRow, // Flag untuk backend (auto-move to Pass)
        }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        console.log(`[handleApprovePartFromSample] Success, vendorMovedToPass:`, result.vendorMovedToPass);

        // CRITICAL: Always do optimistic update first
        // Remove the approved item from UI immediately
        if (sourceTab === "M101 Part") {
          setM101Parts(prevParts => {
            const filtered = prevParts.filter(p => p.id !== part.id);
            console.log(`[handleApprovePartFromSample] M101 parts after remove: ${filtered.length} (was ${prevParts.length})`);
            return filtered;
          });
        } else {
          setM136Parts(prevParts => {
            const filtered = prevParts.filter(p => p.id !== part.id);
            console.log(`[handleApprovePartFromSample] M136 parts after remove: ${filtered.length} (was ${prevParts.length})`);
            return filtered;
          });
        }

        // Check if vendor was auto-moved to Pass
        if (result.vendorMovedToPass) {
          setToastMessage("QC Check approved! Vendor moved to Pass tab.");
          setToastType("success");
          setTimeout(() => setToastMessage(null), 5000);

          // Refresh after delay to ensure all data is updated
          setTimeout(() => {
            console.log(`[handleApprovePartFromSample] Refreshing after vendor moved to Pass`);
            if (sourceTab === "M101 Part") {
              fetchM101Parts();
            } else {
              fetchM136Parts();
            }
          }, 500);
        } else {
          setToastMessage("QC Check approved successfully!");
          setToastType("success");
          setTimeout(() => setToastMessage(null), 3000);
        }
      } else {
        throw new Error(result.message || "Failed to approve");
      }
    } catch (error) {
      console.error("[handleApprovePartFromSample] Error:", error);
      setToastMessage(`Failed to approve: ${error.message}`);
      setToastType("error");
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      // CRITICAL: Reset flag after everything is done
      setTimeout(() => {
        isProcessingRef.current = false;
        console.log("[handleApprovePartFromSample] Processing flag reset");
      }, 1000);
    }
  };

  // Reject part from M101 atau M136 tab
  const handleRejectPartFromSample = async (part, sourceTab) => {
    if (!window.confirm("Reject this QC Check?")) return;

    try {
      const authUser = getAuthUser();

      // Create QC Check entry with Reject status
      const response = await fetch(`${API_BASE}/api/qc-checks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          part_code: part.part_code,
          part_name: part.part_name,
          vendor_name: part.vendor_name,
          production_date: part.production_date,
          data_from: sourceTab === "M101 Part" ? "M101" : "M136",
          status: "Reject",
          rejected_by: authUser?.id,
          rejected_by_name: authUser?.emp_name || "Unknown",
        }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setToastMessage("QC Check rejected!");
        setToastType("success");
        setTimeout(() => setToastMessage(null), 3000);

        // Refresh data
        if (sourceTab === "M101 Part") {
          fetchM101Parts();
        } else {
          fetchM136Parts();
        }
      } else {
        throw new Error(result.message || "Failed to reject");
      }
    } catch (error) {
      setToastMessage(`Failed to reject: ${error.message}`);
      setToastType("error");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleRejectQCCheck = async (id) => {
    if (!window.confirm("Reject this QC Check?")) return;

    try {
      const authUser = getAuthUser();
      const response = await fetch(`${API_BASE}/api/qc-checks/${id}/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rejected_by: authUser?.id,
          rejected_by_name: authUser?.emp_name || "Unknown",
        }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setToastMessage("QC Check rejected!");
        setToastType("success");
        setTimeout(() => setToastMessage(null), 3000);

        // PERBAIKAN: Refresh berdasarkan active tab
        if (activeTab === "M101 Part") {
          fetchM101Parts();
        } else if (activeTab === "M136 Part") {
          fetchM136Parts();
        } else if (activeTab === "Reject") {
          fetchRejectQCChecks();
        }
      } else {
        throw new Error(result.message || "Failed to reject");
      }
    } catch (error) {
      setToastMessage(`Failed to reject: ${error.message}`);
      setToastType("error");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Edit handlers for Current Check
  const handleEditCurrent = (item) => {
    setEditingCurrentId(item.id);
    setEditCurrentData({ qc_status: item.qc_status || "" });
  };

  const handleCancelEditCurrent = () => {
    setEditingCurrentId(null);
    setEditCurrentData({ qc_status: "" });
  };

  const handleSaveEditCurrent = async (id) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/qc-checks/${id}/update-status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            qc_status: editCurrentData.qc_status || null,
          }),
        },
      );

      const result = await response.json();
      if (response.ok && result.success) {
        setToastMessage("Status updated successfully!");
        setToastType("success");
        setTimeout(() => setToastMessage(null), 3000);
        setEditingCurrentId(null);
        setEditCurrentData({ qc_status: "" });
        // Refresh tab yang sesuai
        if (activeTab === "M101 Part") {
          fetchM101Parts();
        } else if (activeTab === "M136 Part") {
          fetchM136Parts();
        } else if (activeTab === "Complete") {
          fetchCompleteQCChecks();
        } else if (activeTab === "Reject") {
          fetchRejectQCChecks();
        };
      } else {
        throw new Error(result.message || "Failed to update status");
      }
    } catch (error) {
      setToastMessage(`Failed to update: ${error.message}`);
      setToastType("error");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Bulk approve QC Checks dari M101 atau M136 tab
  const handleBulkApprove = async (sourceTab) => {
    const selectedIds = sourceTab === "M101 Part" ? selectedM101Ids : selectedM136Ids;
    const parts = sourceTab === "M101 Part" ? m101Parts : m136Parts;

    if (selectedIds.size === 0) {
      alert("Please select at least one item to approve");
      return;
    }

    if (!window.confirm(`Approve ${selectedIds.size} selected QC Checks?`)) return;

    try {
      // PERBAIKAN: Gunakan getAuthUserLocal() untuk mengambil data user
      const authUser = getAuthUserLocal();
      const selectedParts = parts.filter((p) => selectedIds.has(p.id));

      // Create QC Check entries for each selected part
      const promises = selectedParts.map((part) =>
        fetch(`${API_BASE}/api/qc-checks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            part_code: part.part_code,
            part_name: part.part_name,
            vendor_name: part.vendor_name,
            production_date: part.production_date,
            data_from: sourceTab === "M101 Part" ? "M101" : "M136",
            status: "Complete",
            approved_by: authUser?.id,
            approved_by_name: authUser?.emp_name || authUser?.name || "Unknown",
          }),
        })
      );

      await Promise.all(promises);

      setToastMessage(`${selectedIds.size} QC Checks approved successfully!`);
      setToastType("success");
      setTimeout(() => setToastMessage(null), 3000);

      // Clear selection and refresh
      if (sourceTab === "M101 Part") {
        setSelectedM101Ids(new Set());
        fetchM101Parts();
      } else {
        setSelectedM136Ids(new Set());
        fetchM136Parts();
      }
    } catch (error) {
      setToastMessage(`Failed to bulk approve: ${error.message}`);
      setToastType("error");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Toggle checkbox for M101 Part
  const toggleM101Checkbox = (id, checked) => {
    setSelectedM101Ids((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  // Toggle select all for M101 Part
  const toggleSelectAllM101 = () => {
    if (selectedM101Ids.size === m101Parts.length) {
      setSelectedM101Ids(new Set());
    } else {
      setSelectedM101Ids(new Set(m101Parts.map((p) => p.id)));
    }
  };

  // Toggle checkbox for M136 Part
  const toggleM136Checkbox = (id, checked) => {
    setSelectedM136Ids((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  // Toggle select all for M136 Part
  const toggleSelectAllM136 = () => {
    if (selectedM136Ids.size === m136Parts.length) {
      setSelectedM136Ids(new Set());
    } else {
      setSelectedM136Ids(new Set(m136Parts.map((p) => p.id)));
    }
  };

  const handleDeleteQCCheck = async (id) => {
    if (!window.confirm("Are you sure you want to delete this QC check?")) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/qc-checks/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setToastMessage("QC Check deleted successfully!");
        setToastType("success");
        setTimeout(() => setToastMessage(null), 3000);
        // PERBAIKAN: Refresh tab yang benar
        if (activeTab === "Current Check") {
          // Refresh tab yang benar
          if (activeTab === "Complete") {
            fetchCompleteQCChecks();
          } else if (activeTab === "Reject") {
            fetchRejectQCChecks();
          }
          // Note: Tidak perlu refresh M101/M136 karena delete hanya tersedia di Complete dan Reject tab;
        } else {
          fetchCompleteQCChecks();
        }
      } else {
        throw new Error(result.message || "Failed to delete QC check");
      }
    } catch (error) {
      setToastMessage(`Failed to delete: ${error.message}`);
      setToastType("error");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const filteredSchedules = productionSchedules.filter(
    (schedule) => activeTab === "All" || schedule.status === activeTab,
  );

  const hasNewSchedules = productionSchedules.some(
    (schedule) => schedule.status === "New",
  );

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
        return next;
      });
    }
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedHeaderIds(new Set());
    } else {
      if (activeTab === "New") {
        const newScheduleIds = filteredSchedules.map((schedule) => schedule.id);
        setSelectedHeaderIds(new Set(newScheduleIds));
      }
    }
    setSelectAll(!selectAll);
  };

  const toggleRowExpansion = (rowId) => {
    setExpandedRows((prev) => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  };

  const handleInputFocus = (e) => {
    e.target.style.borderColor = "#9fa8da";
  };

  const handleInputBlur = (e) => {
    e.target.style.borderColor = "#d1d5db";
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

  // Colgroup settings sekarang didefinisikan langsung di masing-masing render function tabel

  const getColSpanCount = () => {
    if (activeTab === "Complete") return 7;
    if (activeTab === "Current Check") return 9;
    if (activeTab === "New") return 12;
    if (activeTab === "OnProgress") return 10;
    return 9;
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
    successButton: {
      backgroundColor: "#22c55e",
      color: "white",
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
    // tableContainer: {
    //   marginBottom: "2px",
    //   marginLeft: "10px",
    //   borderRadius: "8px",
    //   backgroundColor: "white",
    //   boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
    //   border: "1.5px solid #e5e7eb",
    //   overflowX: "auto",
    //   width: "calc(100% - 10px)",
    // },
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
    dataFrom: {
      textAlign: "center",
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
      textAlign: "center",
      fontSize: "10px",
      fontFamily: "inherit",
    },
    saveConfiguration: {
      display: "flex",
      gap: "8px",
      marginTop: "10px",
      marginLeft: "10px",
    },
    editButton: {
      backgroundColor: "#e0e7ff",
      color: "black",
      padding: "4px 8px",
      fontSize: "12px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      marginRight: "4px",
    },
    deleteButton: {
      backgroundColor: "#e0e7ff",
      color: "black",
      padding: "4px 8px",
      fontSize: "12px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
    },
    dataFromBadge: {
      padding: "2px 8px",
      borderRadius: "4px",
      fontSize: "11px",
      fontWeight: "500",
    },
    dataFromCreate: {
      backgroundColor: "#dbeafe",
      color: "#1e40af",
    },
    dataFromSample: {
      backgroundColor: "#fef3c7",
      color: "#92400e",
    },
    submitButton: {
      padding: "8px 16px",
      border: "none",
      borderRadius: "4px",
      background: "#3b82f6",
      color: "white",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: "500",
    },
  };

  const customerDetailStyles = {
    popupOverlay: {
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
    popupContainer: {
      backgroundColor: "white",
      borderRadius: "8px",
      padding: "24px",
      minWidth: "400px",
      maxWidth: "500px",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    },
    popupHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px",
    },
    popupTitle: {
      fontSize: "18px",
      fontWeight: "600",
      color: "#1f2937",
      margin: 0,
    },
    closeButton: {
      background: "none",
      border: "none",
      fontSize: "24px",
      cursor: "pointer",
      color: "#6b7280",
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
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      fontSize: "12px",
    },
    select: {
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      fontSize: "12px",
      backgroundColor: "white",
    },
    buttonGroup: {
      display: "flex",
      justifyContent: "flex-end",
      gap: "8px",
      marginTop: "16px",
    },
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

  // Render M101 Part Tab Table (sama persis dengan Current Check, hanya data source berbeda)
  const renderM101PartTable = () => {
    const currentData = getCurrentPageData(m101Parts);
    const totalPages = getTotalPages(m101Parts);
    return (
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
              <col style={{ width: "2.5%" }} />
              <col style={{ width: "2.5%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "10%" }} />
            </colgroup>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.expandedTh}>No</th>
                <th style={styles.thWithLeftBorder}>
                  {m101Parts.length > 0 && (
                    <input
                      type="checkbox"
                      checked={
                        selectedM101Ids.size === m101Parts.length &&
                        m101Parts.length > 0
                      }
                      onChange={toggleSelectAllM101}
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
                <th style={styles.thWithLeftBorder}>Production Date</th>
                <th style={styles.thWithLeftBorder}>Part Code</th>
                <th style={styles.thWithLeftBorder}>Part Name</th>
                <th style={styles.thWithLeftBorder}>Vendor Name</th>
                <th style={styles.thWithLeftBorder}>Status</th>
                <th style={styles.thWithLeftBorder}>Qty</th>
                <th style={styles.thWithLeftBorder}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      ...styles.tdWithLeftBorder,
                      textAlign: "center",
                      color: "#6b7280",
                      padding: "20px",
                    }}
                  >
                    Loading…
                  </td>
                </tr>
              )}

              {!loading &&
                currentData.map((item, index) => {
                  const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                    <tr
                      key={item.id}
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
                        title={(currentPage - 1) * itemsPerPage + index + 1}
                      >
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td
                        style={{
                          ...styles.tdWithLeftBorder,
                          textAlign: "center",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedM101Ids.has(item.id)}
                          onChange={(e) =>
                            toggleM101Checkbox(item.id, e.target.checked)
                          }
                          style={{
                            cursor: "pointer",
                            width: "12px",
                            height: "12px",
                          }}
                        />
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                        title={toDDMMYYYY(item.production_date)}
                      >
                        {toDDMMYYYY(item.production_date)}
                      </td>
                      <td style={styles.tdWithLeftBorder} title={item.part_code}>
                        {item.part_code}
                      </td>
                      <td style={styles.tdWithLeftBorder} title={item.part_name}>
                        {item.part_name}
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                        title={item.vendor_name || "-"}
                      >
                        {item.vendor_name || "-"}
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                        title={item.qc_status || "-"}
                      >
                        {item.qc_status || "-"}
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                        title={item.qty || "-"}
                      >
                        {item.qty || "-"}
                      </td>
                      <td style={{ ...styles.tdWithLeftBorder }}>
                        <div
                          style={{
                            display: "flex",
                            gap: "4px",
                            justifyContent: "center",
                          }}
                        >
                          <button
                            style={{
                              ...styles.editButton,
                              backgroundColor: "#dcfce7",
                              color: "#166534",
                            }}
                            onClick={() =>
                              handleApprovePartFromSample(item, "M101 Part")
                            }
                            title="Approve"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            style={{
                              ...styles.editButton,
                              backgroundColor: "#fee2e2",
                              color: "#991b1b",
                            }}
                            onClick={() => handleRejectPartFromSample(item, "M101 Part")}
                            title="Reject"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div style={styles.paginationBar}>
          <div style={styles.paginationControls}>
            <button
              style={styles.paginationButton}
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              {"<<"}
            </button>
            <button
              style={styles.paginationButton}
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              {"<"}
            </button>
            <span>Page</span>
            <input
              type="text"
              value={currentPage}
              style={styles.paginationInput}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (!isNaN(page) && page >= 1 && page <= totalPages) {
                  setCurrentPage(page);
                }
              }}
            />
            <span>of {totalPages}</span>
            <button
              style={styles.paginationButton}
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              {">"}
            </button>
            <button
              style={styles.paginationButton}
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              {">>"}
            </button>
          </div>
        </div>
        {/* Bulk Approve Button */}
        {selectedM101Ids.size > 0 && (
          <div
            style={{
              marginTop: "12px",
              display: "flex",
            }}
          >
            <button
              style={{
                ...styles.submitButton,
                ...styles.button
              }}
              onClick={() => handleBulkApprove("M101 Part")}
            >
              <Check size={14} />
              Approve All ({selectedM101Ids.size})
            </button>
          </div>
        )}
      </div>
    );
  };

  // Render M136 Part Tab Table (sama persis dengan M101, hanya data source berbeda)
  const renderM136PartTable = () => {
    const currentData = getCurrentPageData(m136Parts);
    const totalPages = getTotalPages(m136Parts);
    return (
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
              <col style={{ width: "2.5%" }} />
              <col style={{ width: "2.5%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "8%" }} />
            </colgroup>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.expandedTh}>No</th>
                <th style={styles.thWithLeftBorder}>
                  {m136Parts.length > 0 && (
                    <input
                      type="checkbox"
                      checked={
                        selectedM136Ids.size === m136Parts.length &&
                        m136Parts.length > 0
                      }
                      onChange={toggleSelectAllM136}
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
                <th style={styles.thWithLeftBorder}>Production Date</th>
                <th style={styles.thWithLeftBorder}>Part Code</th>
                <th style={styles.thWithLeftBorder}>Part Name</th>
                <th style={styles.thWithLeftBorder}>Vendor Name</th>
                <th style={styles.thWithLeftBorder}>Status</th>
                <th style={styles.thWithLeftBorder}>Received By</th>
                <th style={styles.thWithLeftBorder}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      ...styles.tdWithLeftBorder,
                      textAlign: "center",
                      color: "#6b7280",
                      padding: "20px",
                    }}
                  >
                    Loading…
                  </td>
                </tr>
              )}

              {!loading &&
                currentData.map((item, index) => {
                  const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                    <tr
                      key={item.id}
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
                        title={(currentPage - 1) * itemsPerPage + index + 1}
                      >
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                      >
                        <input
                          type="checkbox"
                          checked={selectedM136Ids.has(item.id)}
                          onChange={(e) =>
                            toggleM136Checkbox(item.id, e.target.checked)
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
                        style={styles.tdWithLeftBorder}
                        title={toDDMMYYYY(item.production_date)}
                      >
                        {toDDMMYYYY(item.production_date)}
                      </td>
                      <td style={styles.tdWithLeftBorder} title={item.part_code}>
                        {item.part_code}
                      </td>
                      <td style={styles.tdWithLeftBorder} title={item.part_name}>
                        {item.part_name}
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                        title={item.vendor_name || "-"}
                      >
                        {item.vendor_name || "-"}
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                        title={item.qc_status || "-"}
                      >
                        {item.qc_status || "-"}
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                        title={formatApprovedBy(item.approve_by_name, item.approve_at)}
                      >
                        {formatApprovedBy(item.approve_by_name, item.approve_at)}
                      </td>
                      <td style={{ ...styles.tdWithLeftBorder }}>
                        <div
                          style={{
                            display: "flex",
                            gap: "4px",
                            justifyContent: "center",
                          }}
                        >
                          <button
                            style={{
                              ...styles.editButton,
                              backgroundColor: "#dcfce7",
                              color: "#166534",
                            }}
                            onClick={() =>
                              handleApprovePartFromSample(item, "M136 Part")
                            }
                            title="Approve"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            style={{
                              ...styles.editButton,
                              backgroundColor: "#fee2e2",
                              color: "#991b1b",
                            }}
                            onClick={() => handleRejectPartFromSample(item, "M136 Part")}
                            title="Reject"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div style={styles.paginationBar}>
          <div style={styles.paginationControls}>
            <button
              style={styles.paginationButton}
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              {"<<"}
            </button>
            <button
              style={styles.paginationButton}
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              {"<"}
            </button>
            <span>Page</span>
            <input
              type="text"
              value={currentPage}
              style={styles.paginationInput}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (!isNaN(page) && page >= 1 && page <= totalPages) {
                  setCurrentPage(page);
                }
              }}
            />
            <span>of {totalPages}</span>
            <button
              style={styles.paginationButton}
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              {">"}
            </button>
            <button
              style={styles.paginationButton}
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              {">>"}
            </button>
          </div>
        </div>
        {/* Bulk Approve Button */}
        {selectedM136Ids.size > 0 && (
          <div
            style={{
              marginTop: "12px",
              display: "flex",
            }}
          >
            <button
              style={{
                ...styles.submitButton,
                ...styles.button
              }}
              onClick={() => handleBulkApprove("M136 Part")}
            >
              <Check size={14} />
              Approve All ({selectedM136Ids.size})
            </button>
          </div>
        )}
      </div>
    );
  };


  // Render Complete Tab Table
  const renderCompleteTable = () => {
    const currentData = getCurrentPageData(completeQCChecks);
    const totalPages = getTotalPages(completeQCChecks);
    return (
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
              <col style={{ width: "2.5%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "5%" }} />
            </colgroup>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.expandedTh}>No</th>
                <th style={styles.thWithLeftBorder}>Production Date</th>
                <th style={styles.thWithLeftBorder}>Part Code</th>
                <th style={styles.thWithLeftBorder}>Part Name</th>
                <th style={styles.thWithLeftBorder}>Vendor Name</th>
                <th style={styles.thWithLeftBorder}>Data From</th>
                <th style={styles.thWithLeftBorder}>Approved By</th>
                <th style={styles.thWithLeftBorder}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      ...styles.tdWithLeftBorder,
                      textAlign: "center",
                      color: "#6b7280",
                      padding: "20px",
                    }}
                  >
                    Loading…
                  </td>
                </tr>
              )}
              {!loading &&
                currentData.map((item, index) => {
                  const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                    <tr
                      key={item.id}
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
                        title={(currentPage - 1) * itemsPerPage + index + 1}
                      >
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                        title={toDDMMYYYY(item.production_date)}
                      >
                        {toDDMMYYYY(item.production_date)}
                      </td>
                      <td style={styles.tdWithLeftBorder} title={item.part_code}>
                        {item.part_code}
                      </td>
                      <td style={styles.tdWithLeftBorder} title={item.part_name}>
                        {item.part_name}
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                        title={item.vendor_name || "-"}
                      >
                        {item.vendor_name || "-"}
                      </td>
                      <td
                        style={{ ...styles.tdWithLeftBorder, ...styles.dataFrom }}
                      >
                        <span
                          style={{
                            ...styles.dataFromBadge,
                            ...styles.dataFrom,
                            ...(item.data_from === "M101"
                              ? { backgroundColor: "#dbeafe", color: "#1e40af" }
                              : item.data_from === "M136"
                                ? { backgroundColor: "#fef3c7", color: "#92400e" }
                                : item.data_from === "Create"
                                  ? styles.dataFromCreate
                                  : { backgroundColor: "#dcfce7", color: "#166534" }),
                          }}
                          title={item.data_from || "Create"}
                        >
                          {item.data_from || "Create"}
                        </span>
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                        title={formatApprovedBy(
                          item.approved_by,
                          item.approved_at,
                        )}
                      >
                        {formatApprovedBy(item.approved_by, item.approved_at)}
                      </td>
                      <td
                        style={{ ...styles.tdWithLeftBorder, ...styles.dataFrom }}
                      >
                        <button
                          style={styles.deleteButton}
                          onClick={() => handleDeleteQCCheck(item.id)}
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <div style={styles.paginationBar}>
          <div style={styles.paginationControls}>
            <button
              style={styles.paginationButton}
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              {"<<"}
            </button>
            <button
              style={styles.paginationButton}
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              {"<"}
            </button>
            <span>Page</span>
            <input
              type="text"
              value={currentPage}
              style={styles.paginationInput}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (!isNaN(page) && page >= 1 && page <= totalPages) {
                  setCurrentPage(page);
                }
              }}
            />
            <span>of {totalPages}</span>
            <button
              style={styles.paginationButton}
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              {">"}
            </button>
            <button
              style={styles.paginationButton}
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              {">>"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render Reject Tab Table
  const renderRejectTable = () => {
    const currentData = getCurrentPageData(m101Parts);
    const totalPages = getTotalPages(m101Parts);
    return (
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
              <col style={{ width: "2.5%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "8%" }} />
            </colgroup>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.expandedTh}>No</th>
                <th style={styles.thWithLeftBorder}>Production Date</th>
                <th style={styles.thWithLeftBorder}>Part Code</th>
                <th style={styles.thWithLeftBorder}>Part Name</th>
                <th style={styles.thWithLeftBorder}>Vendor Name</th>
                <th style={styles.thWithLeftBorder}>Status</th>
                <th style={styles.thWithLeftBorder}>Rejected By</th>
                <th style={styles.thWithLeftBorder}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      ...styles.tdWithLeftBorder,
                      textAlign: "center",
                      color: "#6b7280",
                      padding: "20px",
                    }}
                  >
                    Loading…
                  </td>
                </tr>
              )}
              {!loading &&
                currentData.map((item, index) => {
                  const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                    <tr
                      key={item.id}
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
                        title={(currentPage - 1) * itemsPerPage + index + 1}
                      >
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                        title={toDDMMYYYY(item.production_date)}
                      >
                        {toDDMMYYYY(item.production_date)}
                      </td>
                      <td style={styles.tdWithLeftBorder} title={item.part_code}>
                        {item.part_code}
                      </td>
                      <td style={styles.tdWithLeftBorder} title={item.part_name}>
                        {item.part_name}
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                        title={item.vendor_name || "-"}
                      >
                        {item.vendor_name || "-"}
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                        title={item.qc_status || "-"}
                      >
                        {item.qc_status || "-"}
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                        title={formatApprovedBy(
                          item.rejected_by_name,
                          item.rejected_at,
                        )}
                      >
                        {formatApprovedBy(
                          item.rejected_by_name,
                          item.rejected_at,
                        )}
                      </td>
                      <td
                        style={{ ...styles.tdWithLeftBorder, ...styles.dataFrom }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: "4px",
                            justifyContent: "center",
                          }}
                        >
                          <button
                            style={{
                              ...styles.editButton,
                              backgroundColor: "#dcfce7",
                              color: "#166534",
                            }}
                            onClick={() =>
                              handleApproveQCCheck(item.id, "Reject")
                            }
                            title="Approve"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            style={styles.deleteButton}
                            onClick={() => handleDeleteQCCheck(item.id)}
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <div style={styles.paginationBar}>
          <div style={styles.paginationControls}>
            <button
              style={styles.paginationButton}
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              {"<<"}
            </button>
            <button
              style={styles.paginationButton}
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              {"<"}
            </button>
            <span>Page</span>
            <input
              type="text"
              value={currentPage}
              style={styles.paginationInput}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (!isNaN(page) && page >= 1 && page <= totalPages) {
                  setCurrentPage(page);
                }
              }}
            />
            <span>of {totalPages}</span>
            <button
              style={styles.paginationButton}
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              {">"}
            </button>
            <button
              style={styles.paginationButton}
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              {">>"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render default table untuk tab lainnya
  const renderDefaultTable = () => {
    const currentData = getCurrentPageData(m101Parts);
    const totalPages = getTotalPages(m101Parts);
    return (
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
            </tbody>
          </table>
        </div>
        <div style={styles.paginationBar}>
          <div style={styles.paginationControls}>
            <button
              style={styles.paginationButton}
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              {"<<"}
            </button>
            <button
              style={styles.paginationButton}
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              {"<"}
            </button>
            <span>Page</span>
            <input
              type="text"
              value={currentPage}
              style={styles.paginationInput}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (!isNaN(page) && page >= 1 && page <= totalPages) {
                  setCurrentPage(page);
                }
              }}
            />
            <span>of {totalPages}</span>
            <button
              style={styles.paginationButton}
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              {">"}
            </button>
            <button
              style={styles.paginationButton}
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              {">>"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.pageContainer}>
      <div>
        <Helmet>
          <title>Quality Assurance | Quality Parts</title>
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
            <h1 style={styles.title}>Quality Part</h1>
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
            onClick={() => navigate("/qc-part/add")}
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
              ...(activeTab === "M101 Part" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("M101 Part")}
            onMouseEnter={(e) =>
              handleTabHover(e, true, activeTab === "M101 Part")
            }
            onMouseLeave={(e) =>
              handleTabHover(e, false, activeTab === "M101 Part")
            }
          >
            M101 Part
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "M136 Part" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("M136 Part")}
            onMouseEnter={(e) =>
              handleTabHover(e, true, activeTab === "M136 Part")
            }
            onMouseLeave={(e) =>
              handleTabHover(e, false, activeTab === "M136 Part")
            }
          >
            M136 Part
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

        {activeTab === "Complete"
          ? renderCompleteTable()
          : activeTab === "M101 Part"
            ? renderM101PartTable()
            : activeTab === "M136 Part"
              ? renderM136PartTable()
              : activeTab === "Reject"
                ? renderRejectTable()
                : renderDefaultTable()}

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
    </div>
  );
};

const FragmentLike = ({ children }) => children;

export default QCCheckPage;