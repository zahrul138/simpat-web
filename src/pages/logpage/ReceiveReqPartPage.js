"use client";

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MdArrowRight, MdArrowDropDown } from "react-icons/md";
import { Trash2, Pencil, Save, X, Search, Check, FileDown } from "lucide-react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const getAuthUserLocal = () => {
  try {
    return JSON.parse(sessionStorage.getItem("auth_user") || "null");
  } catch {
    return null;
  }
};

const ReceiveReqPartPage = ({ sidebarVisible }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [partsData, setPartsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [remarks, setRemarks] = useState({});
  const [activeTab, setActiveTab] = useState("Waiting");
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const [filterPartCode, setFilterPartCode] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const [tripsData, setTripsData] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalItems = partsData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = partsData.slice(startIndex, endIndex);

  const tableConfig = {
    "Waiting": {
      cols: [
        "3%",
        "3%",
        "15%",
        "12%",
        "25%",
        "10%",
        "10%",
        "8%",
        "18%",
        "25%",
        "10.3%",
      ],
      headers: ["No", "☑", "Label ID", "Part Code", "Part Name", "Model", "Qty Req", "Trip", "Remark", "Request By", "Action"],
      showCheckbox: true,
      showAction: true,
    },
    "Received": {
      cols: [
        "3.5%",
        "3.5%",
        "15%",
        "12%",
        "27%",
        "8%",
        "8%",
        "8%",
        "15%",
        "35%",
      ],
      headers: ["No", "☑", "Label ID", "Part Code", "Part Name", "Model", "Qty Req", "Trip", "Remark", "Received By"],
      showCheckbox: true,
      showAction: false,
    },
    "InTransit": {
      cols: [
        "3%",
        "15%",
        "12%",
        "25%",
        "10%",
        "10%",
        "8%",
        "17%",
        "25%",
      ],
      headers: ["No", "Label ID", "Part Code", "Part Name", "Model", "Qty Req", "Trip", "Remark", "Moved By"],
      showCheckbox: false,
      showAction: false,
    },
    "Arrived": {
      cols: [
        "3.5%",
        "3.5%",
        "15%",
        "12%",
        "27%",
        "8%",
        "8%",
        "8%",
        "15%",
        "35%",
      ],
      headers: ["No", "", "Label ID", "Part Code", "Part Name", "Model", "Qty Req", "Trip", "Remark", "Moved By"],
      showCheckbox: true,
      showAction: false,
    },
    "Complete": {
      cols: [
        "3%",
        "15%",
        "12%",
        "25%",
        "10%",
        "10%",
        "8%",
        "17%",
        "25%",
      ],
      headers: ["No", "Label ID", "Part Code", "Part Name", "Model", "Qty Req", "Trip", "Remark", "Completed By"],
      showCheckbox: false,
      showAction: false,
    },
    "History": {
      cols: [
        "3%",
        "15%",
        "12%",
        "25%",
        "10%",
        "10%",
        "8%",
        "17%",
        "25%",
      ],
      headers: ["No", "Label ID", "Part Code", "Part Name", "Model", "Qty Req", "Trip", "Remark", "Request By"],
      showCheckbox: false,
      showAction: false,
    },
    "Rejected": {
      cols: [
        "3%",
        "13%",
        "11%",
        "22%",
        "9%",
        "8%",
        "7%",
        "14%",
        "20%",
        "8%",
      ],
      headers: ["No", "Label ID", "Part Code", "Part Name", "Model", "Qty Req", "Trip", "Remark", "Request By", "Action"],
      showCheckbox: false,
      showAction: true,
    },
  };

  const renderColgroup = (cols) => (
    <colgroup>
      {cols.map((width, i) => (
        <col key={i} style={{ width }} />
      ))}
    </colgroup>
  );

  const getActiveTripInfo = (now, trips) => {
    const totalMinutes = (h, m) => h * 60 + m;
    const parseTime = (str) => {
      const [h, m] = (str || "").split(":").map(Number);
      return totalMinutes(h, m);
    };
    const source = trips || tripsData;
    const nowMin = totalMinutes(now.getHours(), now.getMinutes());

    for (const t of source) {
      const startMin = parseTime(t.req_from);
      const endMin   = parseTime(t.req_to);
      const isActive = startMin > endMin
        ? nowMin >= startMin || nowMin < endMin
        : nowMin >= startMin && nowMin < endMin;
      if (isActive) {
        return { label: t.trip_code, timeRange: `${t.req_from}-${t.req_to}` };
      }
    }

    let nextTrip = null;
    let minDiff = Infinity;
    for (const t of source) {
      const startMin = parseTime(t.req_from);
      let diff = startMin - nowMin;
      if (diff < 0) diff += 24 * 60;
      if (diff < minDiff) { minDiff = diff; nextTrip = t; }
    }

    if (nextTrip) {
      return { label: nextTrip.trip_code, timeRange: `${nextTrip.req_from}-${nextTrip.req_to}` };
    }
    return { label: "-", timeRange: "-" };
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const fetchPartsEnquiry = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/parts-enquiry-non-id?status=${activeTab}`
      );
      const result = await response.json();

      if (result.success) {
        setPartsData(result.data);

        const remarksObj = {};
        result.data.forEach(item => {
          remarksObj[item.id] = item.remark || "";
        });
        setRemarks(remarksObj);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemarkChange = (rowId, value) => {
    setRemarks((prev) => ({
      ...prev,
      [rowId]: value,
    }));
  };

  const handleRemarkBlur = async (partId) => {
    try {
      await fetch(`${API_BASE}/api/parts-enquiry-non-id/${partId}/remark`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remark: remarks[partId] || "" })
      });
    } catch (error) {
      console.error("Update remark error:", error);
    }
  };

  const handleCheckbox = (id) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(currentItems.map(p => p.id)));
    }
    setSelectAll(!selectAll);
  };

  const handleRejectPart = async (partId) => {
    if (!window.confirm("Move this part to Rejected?")) {
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/parts-enquiry-non-id/move-to-rejected`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: partId }),
      });
      const result = await response.json();
      if (result.success) {
        alert("Part moved to Rejected");
        fetchPartsEnquiry();
      } else {
        alert("Failed: " + result.message);
      }
    } catch (error) {
      console.error("Reject error:", error);
      alert("Error moving part to Rejected");
    }
  };

  const handleDeletePermanent = async (partId) => {
    if (!window.confirm("Permanently delete this part? This cannot be undone.")) {
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/parts-enquiry-non-id/${partId}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (result.success) {
        alert("Part deleted permanently");
        fetchPartsEnquiry();
      } else {
        alert("Failed to delete: " + result.message);
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Error deleting part");
    }
  };

  const handleRestoreToWaiting = async (partId) => {
    if (!window.confirm("Restore this part back to Waiting?")) {
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/parts-enquiry-non-id/restore-to-waiting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: partId }),
      });
      const result = await response.json();
      if (result.success) {
        alert("Part restored to Waiting");
        fetchPartsEnquiry();
      } else {
        alert("Failed: " + result.message);
      }
    } catch (error) {
      console.error("Restore error:", error);
      alert("Error restoring part");
    }
  };

  const handleApproveParts = async () => {
    if (selectedItems.size === 0) {
      alert("Please select at least one item to approve");
      return;
    }

    if (!window.confirm(`Approve ${selectedItems.size} item(s)?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/parts-enquiry-non-id/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedItems), approved_by_name: getAuthUserLocal()?.emp_name || null })
      });

      const result = await response.json();
      if (result.success) {
        alert(result.message);
        setSelectedItems(new Set());
        setSelectAll(false);
        fetchPartsEnquiry();
      } else {
        alert("Failed: " + result.message);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error approving items");
    }
  };

  const handleMoveToInTransit = async () => {
    if (selectedItems.size === 0) {
      alert("Please select at least one item to move to InTransit");
      return;
    }

    if (!window.confirm(`Move ${selectedItems.size} item(s) to InTransit?`)) {
      return;
    }

    const authUser = getAuthUserLocal();
    try {
      const response = await fetch(`${API_BASE}/api/parts-enquiry-non-id/move-to-intransit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedItems), intransit_by_name: authUser?.emp_name || null })
      });

      const result = await response.json();
      if (result.success) {
        alert(result.message);
        setSelectedItems(new Set());
        setSelectAll(false);
        fetchPartsEnquiry();
      } else {
        alert("Failed: " + result.message);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error moving to InTransit");
    }
  };

  const handleMoveToComplete = async () => {
    if (selectedItems.size === 0) {
      alert("Please select at least one item to move to Complete");
      return;
    }
    if (!window.confirm(`Move ${selectedItems.size} item(s) to Complete?`)) {
      return;
    }
    const authUser = getAuthUserLocal();
    try {
      const response = await fetch(`${API_BASE}/api/parts-enquiry-non-id/move-to-complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedItems), complete_by_name: authUser?.emp_name || null }),
      });
      const result = await response.json();
      if (result.success) {
        alert(result.message);
        setSelectedItems(new Set());
        setSelectAll(false);
        fetchPartsEnquiry();
      } else {
        alert("Failed: " + result.message);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error moving to Complete");
    }
  };

  const handleDownloadPDF = () => {
    if (partsData.length === 0) {
      alert("No data to export");
      return;
    }

    const tripGroups = {};
    partsData.forEach((part) => {
      const tripKey = part.trip || "-";
      if (!tripGroups[tripKey]) tripGroups[tripKey] = [];
      tripGroups[tripKey].push(part);
    });

    const tripKeys = Object.keys(tripGroups);

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      alert("Pop-up diblokir browser. Izinkan pop-up untuk halaman ini.");
      return;
    }

    const today = new Date();
    const dateStr = today.toLocaleDateString("id-ID", {
      day: "2-digit", month: "long", year: "numeric",
    });

    const pages = tripKeys.map((tripKey, pageIdx) => {
      const rows = tripGroups[tripKey];
      const rowsHtml = rows
        .map(
          (p, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${p.label_id || "-"}</td>
            <td>${p.part_code || "-"}</td>
            <td>${p.part_name || "-"}</td>
            <td>${p.model || "-"}</td>
            <td>${p.qty_requested ?? "-"}</td>
            <td>${p.remark || "-"}</td>
            <td>${p.requested_by_name || "Unknown"}</td>
          </tr>`
        )
        .join("");

      return `
        <div class="page${pageIdx < tripKeys.length - 1 ? " page-break" : ""}">
          <div class="header">
            <div class="title">Parts Enquiry Non-ID — Received</div>
            <div class="meta">
              <span><b>Trip:</b> ${tripKey}</span>
              <span><b>Tanggal Cetak:</b> ${dateStr}</span>
              <span><b>Total Parts:</b> ${rows.length} item</span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Label ID</th>
                <th>Part Code</th>
                <th>Part Name</th>
                <th>Model</th>
                <th>Qty Req</th>
                <th>Remark</th>
                <th>Request By</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div class="footer">
            Halaman ${pageIdx + 1} dari ${tripKeys.length} &nbsp;|&nbsp; SIMPAT — Parts Enquiry Non-ID
          </div>
        </div>`;
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>Parts Enquiry Non-ID - Received</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 11px; color: #1f2937; background: white; }
          .page { padding: 28px 32px 24px; min-height: 100vh; display: flex; flex-direction: column; }
          .page-break { page-break-after: always; }
          .header { margin-bottom: 16px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
          .title { font-size: 16px; font-weight: 700; color: #1e3a8a; margin-bottom: 6px; }
          .meta { display: flex; gap: 24px; font-size: 11px; color: #374151; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          thead tr { background-color: #dbeafe; }
          th { padding: 6px 8px; border: 1px solid #93c5fd; font-size: 11px; font-weight: 600;
               text-align: left; color: #1e3a8a; white-space: nowrap; }
          td { padding: 5px 8px; border: 1px solid #bfdbfe; font-size: 11px; color: #1f2937; }
          tbody tr:nth-child(even) { background-color: #eff6ff; }
          .footer { margin-top: auto; padding-top: 12px; text-align: center; font-size: 10px;
                    color: #6b7280; border-top: 1px solid #e5e7eb; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page-break { page-break-after: always; }
          }
        </style>
      </head>
      <body>
        ${pages.join("")}
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
          };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  useEffect(() => {
    fetch(`${API_BASE}/api/trips`)
      .then((r) => r.json())
      .then((result) => {
        if (result.success) setTripsData(result.data);
      })
      .catch((err) => console.error("[Trips] Fetch error:", err));
  }, []);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab.charAt(0).toUpperCase() + tab.slice(1));
    }
  }, [searchParams]);

  useEffect(() => {
    fetchPartsEnquiry();
    setSelectedItems(new Set());
    setSelectAll(false);
    setCurrentPage(1);
  }, [activeTab]);

  useEffect(() => {
    if (!["InTransit", "Arrived"].includes(activeTab)) return;
    const interval = setInterval(() => fetchPartsEnquiry(), 30 * 1000);
    return () => clearInterval(interval);
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

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
      alignItems: "center",
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
    expandedWithLeftBorder: {
      border: "0.5px solid #9fa8da",
      whiteSpace: "nowrap",
      backgroundColor: "#e0e7ff",
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
    saveConfiguration: {
      display: "flex",
      gap: "8px",
      marginTop: "10px",
      marginLeft: "13px",
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
    restoreButton: {
      backgroundColor: "#10b981",
      color: "white",
      padding: "4px 8px",
      fontSize: "12px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      marginLeft: "4px",
    },
    approveButton: {
      backgroundColor: "#e0e7ff",
      color: "black",
      padding: "4px 8px",
      fontSize: "12px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      marginLeft: "6px",
    },
    remarkInput: {
      display: "flex",
      height: "1rem",
      width: "90%",
      borderRadius: "6px",
      border: "1px solid #d1d5db",
      backgroundColor: "#f3f4f6",
      padding: "10px 14px",
      fontSize: "12px",
      alignItems: "center",
      color: "#374151",
      fontFamily: "inherit",
      margin: 0,
      outline: "none",
      boxSizing: "border-box",
    },
  };

  const handleButtonHover = (e, isHover, type) => {
    if (type === "primary") {
      e.target.style.backgroundColor = isHover ? "#1d4ed8" : "#2563eb";
    }
  };

  const handleTabHover = (e, isHover, isActive) => {
    if (!isActive) {
      e.target.style.color = isHover ? "#4b5563" : "#6b7280";
    }
  };

  const renderWaitingTab = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan="10" style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>
            Loading...
          </td>
        </tr>
      );
    }

    return currentItems.map((part, idx) => (
      <tr
        key={part.id}
        onMouseEnter={(e) =>
          (e.target.closest("tr").style.backgroundColor = "#c7cde8")
        }
        onMouseLeave={(e) =>
          (e.target.closest("tr").style.backgroundColor = "transparent")
        }
      >
        <td style={{ ...styles.expandedTd, ...styles.expandedWithLeftBorder, ...styles.emptyColumn }}>
          {startIndex + idx + 1}
        </td>
        <td style={styles.tdWithLeftBorder}>
          <input
            type="checkbox"
            checked={selectedItems.has(part.id)}
            onChange={() => handleCheckbox(part.id)}
            style={{
              margin: "0 auto",
              display: "block",
              cursor: "pointer",
              width: "12px",
              height: "12px",
            }}
          />
        </td>
        <td style={styles.tdWithLeftBorder} title={part.label_id || "-"}>{part.label_id || "-"}</td>
        <td style={styles.tdWithLeftBorder} title={part.part_code}>{part.part_code}</td>
        <td style={styles.tdWithLeftBorder} title={part.part_name}>{part.part_name}</td>
        <td style={styles.tdWithLeftBorder} title={part.model}>{part.model}</td>
        <td style={styles.tdWithLeftBorder} title={String(part.qty_requested)}>{part.qty_requested}</td>
        <td style={styles.tdWithLeftBorder} title={part.trip || "-"}>{part.trip || "-"}</td>
        <td style={styles.tdWithLeftBorder} title={part.remark || "-"}>{part.remark || "-"}</td>
        <td style={styles.tdWithLeftBorder} title={`${part.requested_by_name || "Unknown"} | ${part.requested_at || "-"}`}>
          {part.requested_by_name || "Unknown"} | {part.requested_at || "-"}
        </td>
        <td style={styles.tdWithLeftBorder}>
          <button
            style={styles.approveButton}
            onClick={async () => {
              const tempSelected = new Set([part.id]);
              try {
                if (!window.confirm("Approve this item?")) return;

                const response = await fetch(`${API_BASE}/api/parts-enquiry-non-id/approve`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ids: Array.from(tempSelected), approved_by_name: getAuthUserLocal()?.emp_name || null })
                });

                const result = await response.json();
                if (result.success) {
                  alert("Item approved successfully");
                  fetchPartsEnquiry();
                } else {
                  alert("Failed: " + result.message);
                }
              } catch (error) {
                console.error("Error:", error);
                alert("Error approving item");
              }
            }}
          >
            <Check size={10} />
          </button>
          <button
            style={styles.deleteButton}
            onClick={() => handleRejectPart(part.id)}
          >
            <Trash2 size={10} />
          </button>
        </td>
      </tr>
    ));
  };

  const renderReceivedTab = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan="10" style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>
            Loading...
          </td>
        </tr>
      );
    }

    return currentItems.map((part, idx) => (
      <tr
        key={part.id}
        style={{
          backgroundColor: selectedItems.has(part.id) ? "#c7cde8" : "transparent",
        }}
        onMouseEnter={(e) =>
          (e.target.closest("tr").style.backgroundColor = "#c7cde8")
        }
        onMouseLeave={(e) => {
          e.target.closest("tr").style.backgroundColor = selectedItems.has(part.id)
            ? "#c7cde8"
            : "transparent";
        }}
      >
        <td style={{ ...styles.expandedTd, ...styles.expandedWithLeftBorder, ...styles.emptyColumn }}>
          {startIndex + idx + 1}
        </td>
        <td style={styles.tdWithLeftBorder}>
          <input
            type="checkbox"
            checked={selectedItems.has(part.id)}
            onChange={() => handleCheckbox(part.id)}
            style={{
              margin: "0 auto",
              display: "block",
              cursor: "pointer",
              width: "12px",
              height: "12px",
            }}
          />
        </td>
        <td style={styles.tdWithLeftBorder} title={part.label_id || "-"}>{part.label_id || "-"}</td>
        <td style={styles.tdWithLeftBorder} title={part.part_code}>{part.part_code}</td>
        <td style={styles.tdWithLeftBorder} title={part.part_name}>{part.part_name}</td>
        <td style={styles.tdWithLeftBorder} title={part.model}>{part.model}</td>
        <td style={styles.tdWithLeftBorder} title={String(part.qty_requested)}>{part.qty_requested}</td>
        <td style={styles.tdWithLeftBorder} title={part.trip || "-"}>{part.trip || "-"}</td>
        <td style={styles.tdWithLeftBorder} title={part.remark || "-"}>{part.remark || "-"}</td>
        <td style={styles.tdWithLeftBorder} title={`${part.approved_by_name || "-"} | ${part.approved_at || "-"}`}>
          {part.approved_by_name || "-"} | {part.approved_at || "-"}
        </td>
      </tr>
    ));
  };

  const renderArrivedTab = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan="10" style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>
            Loading...
          </td>
        </tr>
      );
    }
    return currentItems.map((part, idx) => (
      <tr
        key={part.id}
        style={{
          backgroundColor: selectedItems.has(part.id) ? "#c7cde8" : "transparent",
        }}
        onMouseEnter={(e) =>
          (e.target.closest("tr").style.backgroundColor = "#c7cde8")
        }
        onMouseLeave={(e) => {
          e.target.closest("tr").style.backgroundColor = selectedItems.has(part.id)
            ? "#c7cde8"
            : "transparent";
        }}
      >
        <td style={{ ...styles.expandedTd, ...styles.expandedWithLeftBorder, ...styles.emptyColumn }}>
          {startIndex + idx + 1}
        </td>
        <td style={styles.tdWithLeftBorder}>
          {/* <input
            type="checkbox"
            checked={selectedItems.has(part.id)}
            onChange={() => handleCheckbox(part.id)}
            style={{
              margin: "0 auto",
              display: "block",
              cursor: "pointer",
              width: "12px",
              height: "12px",
            }}
          /> */}
        </td>
        <td style={styles.tdWithLeftBorder} title={part.label_id || "-"}>{part.label_id || "-"}</td>
        <td style={styles.tdWithLeftBorder} title={part.part_code}>{part.part_code}</td>
        <td style={styles.tdWithLeftBorder} title={part.part_name}>{part.part_name}</td>
        <td style={styles.tdWithLeftBorder} title={part.model}>{part.model}</td>
        <td style={styles.tdWithLeftBorder} title={String(part.qty_requested)}>{part.qty_requested}</td>
        <td style={styles.tdWithLeftBorder} title={part.trip || "-"}>{part.trip || "-"}</td>
        <td style={styles.tdWithLeftBorder} title={part.remark || "-"}>{part.remark || "-"}</td>
        <td style={styles.tdWithLeftBorder} title={`${part.intransit_by_name || "-"} | ${part.intransit_at || "-"}`}>
          {part.intransit_by_name || "-"} | {part.intransit_at || "-"}
        </td>
      </tr>
    ));
  };

  const renderRejectedTab = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan="10" style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>
            Loading...
          </td>
        </tr>
      );
    }
    return currentItems.map((part, idx) => (
      <tr
        key={part.id}
        onMouseEnter={(e) =>
          (e.target.closest("tr").style.backgroundColor = "#fde8e8")
        }
        onMouseLeave={(e) =>
          (e.target.closest("tr").style.backgroundColor = "transparent")
        }
      >
        <td style={{ ...styles.expandedTd, ...styles.expandedWithLeftBorder, ...styles.emptyColumn }}>
          {startIndex + idx + 1}
        </td>
        <td style={styles.tdWithLeftBorder} title={part.label_id || "-"}>{part.label_id || "-"}</td>
        <td style={styles.tdWithLeftBorder} title={part.part_code}>{part.part_code}</td>
        <td style={styles.tdWithLeftBorder} title={part.part_name}>{part.part_name}</td>
        <td style={styles.tdWithLeftBorder} title={part.model}>{part.model}</td>
        <td style={styles.tdWithLeftBorder} title={String(part.qty_requested)}>{part.qty_requested}</td>
        <td style={styles.tdWithLeftBorder} title={part.trip || "-"}>{part.trip || "-"}</td>
        <td style={styles.tdWithLeftBorder} title={part.remark || "-"}>{part.remark || "-"}</td>
        <td style={styles.tdWithLeftBorder} title={`${part.requested_by_name || "Unknown"} | ${part.requested_at || "-"}`}>
          {part.requested_by_name || "Unknown"} | {part.requested_at || "-"}
        </td>
        <td style={styles.tdWithLeftBorder}>
          <button
            style={styles.restoreButton}
            onClick={() => handleRestoreToWaiting(part.id)}
            title="Restore to Waiting"
          >
            <MdArrowRight size={12} />
          </button>
          <button
            style={styles.deleteButton}
            onClick={() => handleDeletePermanent(part.id)}
            title="Delete permanently"
          >
            <Trash2 size={10} />
          </button>
        </td>
      </tr>
    ));
  };

  const renderOtherTabs = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan="9" style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>
            Loading...
          </td>
        </tr>
      );
    }

    return currentItems.map((part, idx) => (
      <tr
        key={part.id}
        onMouseEnter={(e) =>
          (e.target.closest("tr").style.backgroundColor = "#c7cde8")
        }
        onMouseLeave={(e) =>
          (e.target.closest("tr").style.backgroundColor = "transparent")
        }
      >
        <td style={{ ...styles.expandedTd, ...styles.expandedWithLeftBorder, ...styles.emptyColumn }}>
          {startIndex + idx + 1}
        </td>
        <td style={styles.tdWithLeftBorder} title={part.label_id || "-"}>{part.label_id || "-"}</td>
        <td style={styles.tdWithLeftBorder} title={part.part_code}>{part.part_code}</td>
        <td style={styles.tdWithLeftBorder} title={part.part_name}>{part.part_name}</td>
        <td style={styles.tdWithLeftBorder} title={part.model}>{part.model}</td>
        <td style={styles.tdWithLeftBorder} title={String(part.qty_requested)}>{part.qty_requested}</td>
        <td style={styles.tdWithLeftBorder} title={part.trip || "-"}>{part.trip || "-"}</td>
        <td style={styles.tdWithLeftBorder} title={part.remark || "-"}>{part.remark || "-"}</td>
        <td style={styles.tdWithLeftBorder} title={
          activeTab === "InTransit"
            ? `${part.intransit_by_name || "-"} | ${part.intransit_at || "-"}`
            : activeTab === "Complete"
            ? `${part.complete_by_name || "-"} | ${part.complete_at || "-"}`
            : `${part.requested_by_name || "-"} | ${part.requested_at || "-"}`
        }>
          {activeTab === "InTransit"
            ? `${part.intransit_by_name || "-"} | ${part.intransit_at || "-"}`
            : activeTab === "Complete"
            ? `${part.complete_by_name || "-"} | ${part.complete_at || "-"}`
            : `${part.requested_by_name || "-"} | ${part.requested_at || "-"}`}
        </td>
      </tr>
    ));
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.welcomeCard}>
        <div style={styles.combinedHeaderFilter}>
          <div style={styles.headerRow}>
            <h1 style={styles.title}>Receive Request Part</h1>
          </div>

          <div style={styles.filterRow}>
            <div style={styles.inputGroup}>
              <span style={styles.label}>Date Filter</span>
              <select style={styles.select}>
                <option style={optionStyle}>Search Date</option>
              </select>
              <input
                type="date"
                style={styles.input}
                placeholder="Date From"
              />
              <span style={styles.label}>To</span>
              <input
                type="date"
                style={styles.input}
                placeholder="Date To"
              />
            </div>
            <div style={styles.inputGroup}>
              <span style={styles.label}>Search By</span>
              <select style={styles.select}>
                <option style={optionStyle}>Customer</option>
                <option style={optionStyle}>Product Code</option>
                <option style={optionStyle}>Product Description</option>
              </select>
              <input
                type="text"
                style={styles.input}
                placeholder="Input Keyword"
              />
              <button style={styles.button}>
                Search
              </button>
            </div>
          </div>
        </div>

        <div style={styles.tabsContainer}>
          {Object.keys(tableConfig).map((tab) => (
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
            {activeTab === "Waiting" && (
              <table
                style={{
                  ...styles.table,
                  minWidth: "950px",
                  tableLayout: "fixed",
                }}
              >
                {renderColgroup(tableConfig["Waiting"].cols)}
                <thead>
                  <tr style={styles.tableHeader}>
                    {tableConfig["Waiting"].headers.map((header, idx) => (
                      <th key={idx} style={idx === 0 ? styles.expandedTh : styles.thWithLeftBorder}>
                        {header === "☑" && currentItems.length > 1 ? (
                          <input
                            type="checkbox"
                            checked={selectAll}
                            onChange={handleSelectAll}
                            style={{
                              margin: "0 auto",
                              display: "block",
                              cursor: "pointer",
                              width: "12px",
                              height: "12px",
                            }}
                          />
                        ) : header === "☑" ? "" : header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>{renderWaitingTab()}</tbody>
              </table>
            )}

            {activeTab === "Received" && (
              <table
                style={{
                  ...styles.table,
                  minWidth: "950px",
                  tableLayout: "fixed",
                }}
              >
                {renderColgroup(tableConfig["Received"].cols)}
                <thead>
                  <tr style={styles.tableHeader}>
                    {tableConfig["Received"].headers.map((header, idx) => (
                      <th key={idx} style={idx === 0 ? styles.expandedTh : styles.thWithLeftBorder}>
                        {header === "☑" && currentItems.length > 1 ? (
                          <input
                            type="checkbox"
                            checked={selectAll}
                            onChange={handleSelectAll}
                            style={{
                              margin: "0 auto",
                              display: "block",
                              cursor: "pointer",
                              width: "12px",
                              height: "12px",
                            }}
                          />
                        ) : header === "☑" ? "" : header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>{renderReceivedTab()}</tbody>
              </table>
            )}

            {activeTab === "Arrived" && (
              <table
                style={{
                  ...styles.table,
                  minWidth: "950px",
                  tableLayout: "fixed",
                }}
              >
                {renderColgroup(tableConfig["Arrived"].cols)}
                <thead>
                  <tr style={styles.tableHeader}>
                    {tableConfig["Arrived"].headers.map((header, idx) => (
                      <th key={idx} style={idx === 0 ? styles.expandedTh : styles.thWithLeftBorder}>
                        {header === "☑" && currentItems.length > 1 ? (
                          <input
                            type="checkbox"
                            checked={selectAll}
                            onChange={handleSelectAll}
                            style={{
                              margin: "0 auto",
                              display: "block",
                              cursor: "pointer",
                              width: "12px",
                              height: "12px",
                            }}
                          />
                        ) : header === "☑" ? "" : header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>{renderArrivedTab()}</tbody>
              </table>
            )}

            {!["Waiting", "Received", "Arrived", "Rejected"].includes(activeTab) && (
              <table
                style={{
                  ...styles.table,
                  minWidth: "970px",
                  tableLayout: "fixed",
                }}
              >
                {renderColgroup(tableConfig[activeTab].cols)}
                <thead>
                  <tr style={styles.tableHeader}>
                    {tableConfig[activeTab].headers.map((header, idx) => (
                      <th key={idx} style={idx === 0 ? styles.expandedTh : styles.thWithLeftBorder}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>{renderOtherTabs()}</tbody>
              </table>
            )}

            {activeTab === "Rejected" && (
              <table
                style={{
                  ...styles.table,
                  minWidth: "1100px",
                  tableLayout: "fixed",
                }}
              >
                {renderColgroup(tableConfig["Rejected"].cols)}
                <thead>
                  <tr style={styles.tableHeader}>
                    {tableConfig["Rejected"].headers.map((header, idx) => (
                      <th key={idx} style={idx === 0 ? styles.expandedTh : styles.thWithLeftBorder}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>{renderRejectedTab()}</tbody>
              </table>
            )}
          </div>

          <div style={styles.paginationBar}>
            <div style={styles.paginationControls}>
              <button
                style={styles.paginationButton}
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
              >
                {"<<"}
              </button>
              <button
                style={styles.paginationButton}
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
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
              <span>of {totalPages || 1}</span>
              <button
                style={styles.paginationButton}
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                {">"}
              </button>
              <button
                style={styles.paginationButton}
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                {">>"}
              </button>
            </div>

            {activeTab === "Received" && partsData.length > 0 && (
              <button
                onClick={handleDownloadPDF}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 12px",
                  backgroundColor:  "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "background-color 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor =  "#2563eb")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor =  "#2563eb")}
                title="Download PDF per Trip"
              >
                <FileDown size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons Below Pagination */}
        {activeTab === "Waiting" && partsData.length > 0 && (
          <div style={styles.saveConfiguration}>
            <button
              style={{ ...styles.button, ...styles.primaryButton }}
              onClick={handleApproveParts}
            >
              <Check size={16} />
              Approve
            </button>
          </div>
        )}

        {activeTab === "Received" && partsData.length > 0 && (
          <div style={styles.saveConfiguration}>
            <button
              style={{ ...styles.button, ...styles.primaryButton }}
              onClick={handleMoveToInTransit}
            >
              <MdArrowRight size={16} />
              Move to InTransit
            </button>
          </div>
        )}

        {/* {activeTab === "Arrived" && partsData.length > 0 && (
          <div style={styles.saveConfiguration}>
            <button
              style={{ ...styles.button, ...styles.primaryButton }}
              onClick={handleMoveToComplete}
            >
              <Check size={16} />
              Move to Complete
            </button>
          </div>
        )} */}
      </div>
    </div>
  );
};

export default ReceiveReqPartPage;