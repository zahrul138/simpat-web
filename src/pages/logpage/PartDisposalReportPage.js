"use client";

import { useState, useEffect, useRef } from "react";

const BarChart = ({ data, typeFilter, onBarClick }) => {
  const CHART_H = 300;
  const CHART_BOTTOM = 30;
  const CHART_TOP = 30;
  const LABEL_W = 64;
  const LEFT_PAD = 20;
  const BAR_GAP = 1;
  const GROUP_GAP = 30;
  const MAX_VAL = 70;
  const Y_STEP = 10;

  const yLabels = Array.from(
    { length: MAX_VAL / Y_STEP + 1 },
    (_, i) => MAX_VAL - i * Y_STEP,
  );
  const yTicks = yLabels.length - 1;

  const containerRef = useRef(null);
  const [containerW, setContainerW] = useState(800);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      setContainerW(entries[0].contentRect.width || 800);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const showScrap = typeFilter !== "rtv";
  const showRtv = typeFilter !== "scrap";
  const barCount = showScrap && showRtv ? 2 : 1;

  const plotW = containerW - LABEL_W - LEFT_PAD;
  const groupW = barCount * 12 + (barCount > 1 ? BAR_GAP : 0);
  const totalStep =
    data.length > 0
      ? Math.min(plotW / data.length, groupW + GROUP_GAP + 20)
      : 30;
  const barW = Math.max(
    4,
    Math.min(
      20,
      (totalStep - GROUP_GAP - (barCount > 1 ? BAR_GAP : 0)) / barCount,
    ),
  );
  const step = barCount * barW + (barCount > 1 ? BAR_GAP : 0) + GROUP_GAP;
  const plotH = CHART_H - CHART_BOTTOM - CHART_TOP;
  const baseY = CHART_H - CHART_BOTTOM;
  const toH = (v) => Math.min((Number(v) / MAX_VAL) * plotH, plotH) || 0;

  const fmtYLabel = (v) => {
    if (v >= 1_000_000) return `S$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `S$${(v / 1_000).toFixed(1)}K`;
    return `S$${v.toFixed(0)}`;
  };

  const fmtFullDate = (dateStr) => {
    const d = new Date(dateStr + "T00:00:00");
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${days[d.getDay()]}, ${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const chartRight = LABEL_W + LEFT_PAD + data.length * step;
  const svgW = Math.max(containerW, chartRight + 10);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", overflowX: "auto", position: "relative" }}
    >
      <svg
        width={svgW}
        height={CHART_H + 4}
        style={{ display: "block" }}
        onMouseLeave={() => setTooltip(null)}
      >
        {yLabels.map((label, i) => {
          const y = CHART_TOP + (i / yTicks) * plotH;
          return (
            <g key={i}>
              <line
                x1={LABEL_W}
                x2={svgW}
                y1={y}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="0.8"
              />
              <text
                x={LABEL_W - 5}
                y={y + 4}
                textAnchor="end"
                fontSize="9"
                fill="#9ca3af"
              >
                {fmtYLabel(label)}
              </text>
            </g>
          );
        })}
        {data.map((d, idx) => {
          const groupX = LABEL_W + LEFT_PAD + idx * step;
          const scrapH = toH(d.scrap_loss || 0);
          const rtvH = toH(d.rtv_loss || 0);
          const gW = barCount * barW + (barCount > 1 ? BAR_GAP : 0);
          const labelX = groupX + gW / 2;
          const dayLabel = String(
            new Date(d.date + "T00:00:00").getDate(),
          ).padStart(2, "0");
          const tallestH = Math.max(scrapH, rtvH);
          const tipY = baseY - tallestH;
          const showTip = () =>
            setTooltip({ x: labelX, y: tipY, label: fmtFullDate(d.date) });
          const hideTip = () => setTooltip(null);
          return (
            <g
              key={idx}
              style={{ cursor: "pointer" }}
              onClick={() => onBarClick(d)}
            >
              <rect
                x={groupX - 2}
                y={0}
                width={gW + 4}
                height={baseY}
                fill="transparent"
              />
              {showScrap && scrapH > 0 && (
                <rect
                  x={groupX}
                  y={baseY - scrapH}
                  width={barW}
                  height={scrapH}
                  rx="2"
                  fill="#ef4444"
                  opacity="0.85"
                  onMouseEnter={showTip}
                  onMouseLeave={hideTip}
                />
              )}
              {showRtv && rtvH > 0 && (
                <rect
                  x={showScrap ? groupX + barW + BAR_GAP : groupX}
                  y={baseY - rtvH}
                  width={barW}
                  height={rtvH}
                  rx="2"
                  fill="#2563eb"
                  opacity="0.85"
                  onMouseEnter={showTip}
                  onMouseLeave={hideTip}
                />
              )}
              <text
                x={labelX}
                y={CHART_H - 8}
                textAnchor="middle"
                fontSize="9"
                fill="#9ca3af"
              >
                {dayLabel}
              </text>
            </g>
          );
        })}
        <line
          x1={LABEL_W}
          x2={svgW}
          y1={baseY}
          y2={baseY}
          stroke="#d1d5db"
          strokeWidth="1"
        />
        {tooltip && (
          <g style={{ pointerEvents: "none" }}>
            <rect
              x={tooltip.x - 70}
              y={tooltip.y - 26}
              width={140}
              height={20}
              rx="4"
              fill="#1f2937"
              opacity="0.9"
            />
            <text
              x={tooltip.x}
              y={tooltip.y - 12}
              textAnchor="middle"
              fontSize="10"
              fill="white"
              fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
            >
              {tooltip.label}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};

const PartDisposalReportPage = ({ sidebarVisible }) => {
  const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  };

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [typeFilter, setTypeFilter] = useState("all");
  const [vendorId, setVendorId] = useState("");
  const [vendorList, setVendorList] = useState([]);
  const [summary, setSummary] = useState({
    scrap_total: 0,
    rtv_total: 0,
    combined_total: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [dayModal, setDayModal] = useState(null);
  const [modalPage, setModalPage] = useState(1);
  const MODAL_PER_PAGE = 10;

  const formatSGD = (value) => {
    if (value == null || isNaN(value)) return "S$ 0.00";
    return (
      "S$ " +
      Number(value).toLocaleString("en-SG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  const formatDateTime = (str) => {
    if (!str) return "-";
    const d = new Date(str);
    if (isNaN(d)) return str;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${d.getFullYear()} ${hh}.${min}`;
  };

  const formatModalDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr + "T00:00:00");
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  };

  const formatMonthLabel = (m) => {
    if (!m) return "-";
    const [y, mo] = m.split("-");
    const names = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${names[parseInt(mo) - 1]} ${y}`;
  };

  const buildParams = (extra = {}) => {
    const p = new URLSearchParams({
      month: selectedMonth,
      type: typeFilter,
      ...extra,
    });
    if (vendorId) p.set("vendor_id", vendorId);
    return p.toString();
  };

  const modalScrapTotal = (records) =>
    records
      .filter((r) => r.disposal_type === "Scrap")
      .reduce((a, r) => a + Number(r.loss_value || 0), 0);

  const modalRtvTotal = (records) =>
    records
      .filter((r) => r.disposal_type === "RTV")
      .reduce((a, r) => a + Number(r.loss_value || 0), 0);

  const fetchVendorList = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/vendors`);
      const result = await res.json();
      if (result.success) setVendorList(result.data || []);
    } catch (error) {
      console.error("[fetchVendorList] Error:", error);
    }
  };

  const fetchAll = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/disposal-report/summary?${buildParams()}`,
      );
      const result = await res.json();
      if (result.success) setSummary(result.data);
    } catch (error) {
      console.error("[fetchSummary] Error:", error);
    }
    setChartLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/disposal-report/chart?${buildParams()}`,
      );
      const result = await res.json();
      setChartData(result.success ? result.data || [] : []);
    } catch (error) {
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  };

  const fetchDayDetail = async (date) => {
    setDayModal({ date, records: [], loading: true });
    setModalPage(1);
    try {
      const p = new URLSearchParams({ date, type: typeFilter });
      if (vendorId) p.set("vendor_id", vendorId);
      const res = await fetch(
        `${API_BASE}/api/disposal-report/daily-detail?${p}`,
      );
      const result = await res.json();
      setDayModal({
        date,
        records: result.success ? result.data || [] : [],
        loading: false,
      });
    } catch (error) {
      setDayModal((prev) => ({ ...prev, loading: false, records: [] }));
    }
  };

  const handleTabHover = (e, on, isActive) => {
    if (!isActive) e.target.style.color = on ? "#2563eb" : "#6b7280";
  };
  const handleInputFocus = (e) => {
    e.target.style.borderColor = "#9fa8da";
  };
  const handleInputBlur = (e) => {
    e.target.style.borderColor = "#d1d5db";
  };

  useEffect(() => {
    fetchVendorList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, typeFilter, vendorId]);

  const selectedVendorName = vendorId
    ? vendorList.find((v) => String(v.id) === String(vendorId))?.vendor_name ||
      "-"
    : null;

  const modalRecords = dayModal?.records || [];
  const modalTotalPages = Math.ceil(modalRecords.length / MODAL_PER_PAGE) || 1;
  const modalSlice = modalRecords.slice(
    (modalPage - 1) * MODAL_PER_PAGE,
    modalPage * MODAL_PER_PAGE,
  );

  const handleModalPageChange = (page) => {
    if (page < 1 || page > modalTotalPages) return;
    setModalPage(page);
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
    filterRow: { display: "grid", alignItems: "center", gap: "12px" },
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
    selectVendor: {
      height: "32px",
      border: "2px solid #d1d5db",
      borderRadius: "4px",
      padding: "0 8px",
      fontSize: "12px",
      backgroundColor: "#e0e7ff",
      cursor: "pointer",
      fontFamily: "inherit",
      minWidth: "180px",
      maxWidth: "220px",
      outline: "none",
      transition: "border-color 0.2s ease",
    },
    optionStyle: {
      backgroundColor: "#d1d5db",
      color: "#374151",
      fontSize: "12px",
      padding: "4px 8px",
    },
    chartCard: {
      backgroundColor: "white",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      padding: "20px",
      marginBottom: "16px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    },
    chartHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "14px",
    },
    chartTitle: { fontSize: "13px", fontWeight: "600", color: "#1f2937" },
    chartVendorSpan: {
      fontSize: "12px",
      color: "#6b7280",
      marginLeft: "8px",
      fontWeight: "400",
    },
    chartLoadingDiv: {
      height: "310px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#9ca3af",
      fontSize: "12px",
    },
    miniSummaryRow: {
      display: "flex",
      gap: "24px",
      marginTop: "10px",
      paddingTop: "10px",
      borderTop: "1px solid #e5e7eb",
      justifyContent: "flex-end",
    },
    miniSummaryItem: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      fontSize: "12px",
      color: "#374151",
    },
    miniSummaryDotScrap: {
      width: "8px",
      height: "8px",
      borderRadius: "2px",
      backgroundColor: "#ef4444",
      flexShrink: 0,
    },
    miniSummaryDotRtv: {
      width: "8px",
      height: "8px",
      borderRadius: "2px",
      backgroundColor: "#2563eb",
      flexShrink: 0,
    },
    miniSummaryValueScrap: { color: "#991b1b" },
    miniSummaryValueRtv: { color: "#1e40af" },
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
      backgroundColor: "#e0e7ff",
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
      backgroundColor: "#e0e7ff",
    },
    expandedTdCenter: {
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
    tdCenter: {
      padding: "2px 4px",
      border: "0.5px solid #9fa8da",
      fontSize: "12px",
      color: "#374151",
      whiteSpace: "nowrap",
      height: "25px",
      lineHeight: "1",
      verticalAlign: "middle",
      overflow: "hidden",
      textAlign: "center",
    },
    tdRight: {
      padding: "2px 4px",
      border: "0.5px solid #9fa8da",
      fontSize: "12px",
      color: "#374151",
      whiteSpace: "nowrap",
      height: "25px",
      lineHeight: "1",
      verticalAlign: "middle",
      overflow: "hidden",
      textAlign: "right",
    },
    tdLossScrap: {
      padding: "2px 4px",
      border: "0.5px solid #9fa8da",
      fontSize: "12px",
      color: "#991b1b",
      whiteSpace: "nowrap",
      height: "25px",
      lineHeight: "1",
      verticalAlign: "middle",
      overflow: "hidden",
      textAlign: "right",
      fontWeight: "600",
    },
    tdLossRtv: {
      padding: "2px 4px",
      border: "0.5px solid #9fa8da",
      fontSize: "12px",
      color: "#92400e",
      whiteSpace: "nowrap",
      height: "25px",
      lineHeight: "1",
      verticalAlign: "middle",
      overflow: "hidden",
      textAlign: "right",
      fontWeight: "600",
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
      minHeight: "20px",
    },
    paginationCenter: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      justifyContent: "center",
    },
    paginationText: { fontSize: "12px" },
    paginationTotalRow: { fontSize: "12px", color: "#374151" },
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
    statusBadge: {
      padding: "2px 8px",
      borderRadius: "4px",
      fontSize: "11px",
      fontWeight: "600",
      display: "inline-block",
    },
    badgeScrap: { backgroundColor: "#fee2e2", color: "#991b1b" },
    badgeRtv: { backgroundColor: "#fef3c7", color: "#92400e" },
    popupOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
    },
    popupContainer: {
      backgroundColor: "white",
      borderRadius: "8px",
      width: "760px",
      maxWidth: "94vw",
      maxHeight: "85vh",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
      fontFamily: "inherit",
    },
    popupHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      padding: "18px 24px 14px",
      borderBottom: "1px solid #e5e7eb",
    },
    popupTitle: {
      fontSize: "15px",
      fontWeight: "600",
      color: "#1f2937",
      marginBottom: "4px",
    },
    popupVendorSpan: { fontSize: "12px", color: "#6b7280", marginLeft: "8px" },
    popupSub: { fontSize: "12px", color: "#6b7280" },
    closeButton: {
      background: "none",
      border: "none",
      borderRadius: "4px",
      width: "28px",
      height: "28px",
      cursor: "pointer",
      fontSize: "15px",
      color: "#6b7280",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    popupSummaryRow: {
      display: "flex",
      gap: "10px",
      padding: "10px 24px",
      background: "#f9fafb",
      borderBottom: "1px solid #e5e7eb",
      flexWrap: "wrap",
    },
    popupSummaryPill: {
      display: "flex",
      alignItems: "center",
      gap: "5px",
      fontSize: "12px",
      color: "#6b7280",
    },
    popupSummaryPillRight: {
      display: "flex",
      alignItems: "center",
      gap: "5px",
      fontSize: "12px",
      color: "#6b7280",
      marginLeft: "auto",
    },
    popupDotScrap: {
      width: "8px",
      height: "8px",
      borderRadius: "2px",
      backgroundColor: "#ef4444",
    },
    popupDotRtv: {
      width: "8px",
      height: "8px",
      borderRadius: "2px",
      backgroundColor: "#2563eb",
    },
    popupDotTotal: {
      width: "8px",
      height: "8px",
      borderRadius: "2px",
      backgroundColor: "#7c3aed",
    },
    pillStrongMargin: { marginLeft: "4px" },
    popupBody: { overflowY: "auto", flex: 1, padding: "12px 16px 16px" },
    popupLoadingDiv: {
      padding: "32px",
      textAlign: "center",
      color: "#6b7280",
      fontSize: "13px",
    },
    popupEmptyDiv: {
      padding: "32px",
      textAlign: "center",
      color: "#9ca3af",
      fontSize: "13px",
    },
    popupTableContainer: {
      marginBottom: "2px",
      marginLeft: 0,
      borderRadius: "8px",
      backgroundColor: "white",
      boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)",
      border: "1.5px solid #e5e7eb",
      overflowX: "auto",
      width: "calc(100% - 10px)",
    },
  };

  const renderPaginationBarGeneric = (
    currentPage,
    totalPages,
    totalRows,
    onPageChange,
  ) => (
    <div style={styles.paginationBar}>
      <div style={styles.paginationCenter}>
        {[
          {
            label: "<<",
            fn: () => onPageChange(1),
            disabled: currentPage === 1,
          },
          {
            label: "<",
            fn: () => onPageChange(currentPage - 1),
            disabled: currentPage === 1,
          },
        ].map(({ label, fn, disabled }, i) => (
          <button
            key={i}
            style={styles.paginationButton}
            onClick={fn}
            disabled={disabled}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#a5b4fc";
              e.target.style.color = "#1f2937";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
              e.target.style.color = "#374151";
            }}
          >
            {label}
          </button>
        ))}
        <span style={styles.paginationText}>Page</span>
        <input
          type="text"
          value={currentPage}
          style={styles.paginationInput}
          onChange={(e) => {
            const p = parseInt(e.target.value);
            if (!isNaN(p)) onPageChange(p);
          }}
        />
        <span style={styles.paginationText}>of {totalPages}</span>
        {[
          {
            label: ">",
            fn: () => onPageChange(currentPage + 1),
            disabled: currentPage === totalPages,
          },
          {
            label: ">>",
            fn: () => onPageChange(totalPages),
            disabled: currentPage === totalPages,
          },
        ].map(({ label, fn, disabled }, i) => (
          <button
            key={i}
            style={styles.paginationButton}
            onClick={fn}
            disabled={disabled}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#a5b4fc";
              e.target.style.color = "#1f2937";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
              e.target.style.color = "#374151";
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <span style={styles.paginationTotalRow}>Total Row: {totalRows}</span>
    </div>
  );

  return (
    <div style={styles.pageContainer}>
      {dayModal && (
        <div style={styles.popupOverlay} onClick={() => setDayModal(null)}>
          <div
            style={styles.popupContainer}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.popupHeader}>
              <div>
                <div style={styles.popupTitle}>
                  Detail Disposal — {formatModalDate(dayModal.date)}
                  {selectedVendorName && (
                    <span style={styles.popupVendorSpan}>
                      · {selectedVendorName}
                    </span>
                  )}
                </div>
                <div style={styles.popupSub}>
                  {dayModal.loading
                    ? "Loading..."
                    : `${modalRecords.length} record(s) on this date`}
                </div>
              </div>
              <button
                style={styles.closeButton}
                onClick={() => setDayModal(null)}
              >
                ✕
              </button>
            </div>

            {!dayModal.loading && modalRecords.length > 0 && (
              <div style={styles.popupSummaryRow}>
                {typeFilter === "all" && (
                  <>
                    <div style={styles.popupSummaryPill}>
                      <div style={styles.popupDotScrap} />
                      Scrap:{" "}
                      <strong style={styles.pillStrongMargin}>
                        {formatSGD(modalScrapTotal(modalRecords))}
                      </strong>
                    </div>
                    <div style={styles.popupSummaryPill}>
                      <div style={styles.popupDotRtv} />
                      RTV:{" "}
                      <strong style={styles.pillStrongMargin}>
                        {formatSGD(modalRtvTotal(modalRecords))}
                      </strong>
                    </div>
                  </>
                )}
                <div style={styles.popupSummaryPillRight}>
                  <div style={styles.popupDotTotal} />
                  Total:{" "}
                  <strong style={styles.pillStrongMargin}>
                    {formatSGD(
                      modalScrapTotal(modalRecords) +
                        modalRtvTotal(modalRecords),
                    )}
                  </strong>
                </div>
              </div>
            )}

            <div style={styles.popupBody}>
              {dayModal.loading ? (
                <div style={styles.popupLoadingDiv}>Loading records...</div>
              ) : modalRecords.length === 0 ? (
                <div style={styles.popupEmptyDiv}>
                  No records found for this date.
                </div>
              ) : (
                <div style={styles.popupTableContainer}>
                  <div style={styles.tableBodyWrapper}>
                    <table style={{ ...styles.table, minWidth: "1100px" }}>
                      <colgroup>
                        {[
                          "3%",
                          "18%",
                          "20%",
                          "8%",
                          "5%",
                          "12%",
                          "13%",
                          "20%",
                          "30%",
                        ].map((w, i) => (
                          <col key={i} style={{ width: w }} />
                        ))}
                      </colgroup>
                      <thead>
                        <tr style={styles.tableHeader}>
                          <th style={styles.expandedTh}>No</th>
                          <th style={styles.thWithLeftBorder}>Part Name</th>
                          <th style={styles.thWithLeftBorder}>Vendor</th>
                          <th style={styles.thWithLeftBorder}>Type</th>
                          <th style={styles.thWithLeftBorder}>Qty</th>
                          <th style={styles.thWithLeftBorder}>
                            Unit Price (S$)
                          </th>
                          <th style={styles.thWithLeftBorder}>
                            Loss Value (S$)
                          </th>
                          <th style={styles.thWithLeftBorder}>Remark</th>
                          <th style={styles.thWithLeftBorder}>Complete By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modalSlice.map((r, i) => (
                          <tr
                            key={i}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                "#c7cde8")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                "transparent")
                            }
                          >
                            <td
                              style={styles.expandedTdCenter}
                              title={String(
                                (modalPage - 1) * MODAL_PER_PAGE + i + 1,
                              )}
                            >
                              {(modalPage - 1) * MODAL_PER_PAGE + i + 1}
                            </td>
                            <td
                              style={styles.tdWithLeftBorder}
                              title={r.part_name || "-"}
                            >
                              {r.part_name || "-"}
                            </td>
                            <td
                              style={styles.tdWithLeftBorder}
                              title={r.vendor_name || "-"}
                            >
                              {r.vendor_name || "-"}
                            </td>
                            <td
                              style={styles.tdCenter}
                              title={r.disposal_type || "-"}
                            >
                              <span
                                style={{
                                  ...styles.statusBadge,
                                  ...(r.disposal_type === "Scrap"
                                    ? styles.badgeScrap
                                    : styles.badgeRtv),
                                }}
                              >
                                {r.disposal_type}
                              </span>
                            </td>
                            <td
                              style={styles.tdCenter}
                              title={String(r.qty || "-")}
                            >
                              {r.qty || "-"}
                            </td>
                            <td
                              style={styles.tdRight}
                              title={formatSGD(r.unit_price)}
                            >
                              {formatSGD(r.unit_price)}
                            </td>
                            <td
                              style={
                                r.disposal_type === "Scrap"
                                  ? styles.tdLossScrap
                                  : styles.tdLossRtv
                              }
                              title={formatSGD(r.loss_value)}
                            >
                              {formatSGD(r.loss_value)}
                            </td>
                            <td
                              style={styles.tdWithLeftBorder}
                              title={r.remark || "-"}
                            >
                              {r.remark || "-"}
                            </td>
                            <td
                              style={styles.tdWithLeftBorder}
                              title={`${r.actioned_by || "-"}${r.actioned_at ? " | " + formatDateTime(r.actioned_at) : ""}`}
                            >
                              {`${r.actioned_by || "-"}${r.actioned_at ? " | " + formatDateTime(r.actioned_at) : ""}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {renderPaginationBarGeneric(
                    modalPage,
                    modalTotalPages,
                    modalRecords.length,
                    handleModalPageChange,
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={styles.welcomeCard}>
        <div style={styles.combinedHeaderFilter}>
          <div style={styles.headerRow}>
            <h1 style={styles.title}>Part Disposal Report</h1>
          </div>
          <div style={styles.filterRow}>
            <div style={styles.inputGroup}>
              <span style={styles.label}>Month</span>
              <input
                type="month"
                style={styles.input}
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
              <span style={styles.label}>Type</span>
              <select
                style={styles.select}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option style={styles.optionStyle} value="all">
                  All (Scrap + RTV)
                </option>
                <option style={styles.optionStyle} value="scrap">
                  Scrap
                </option>
                <option style={styles.optionStyle} value="rtv">
                  RTV
                </option>
              </select>
              <span style={styles.label}>Vendor</span>
              <select
                style={styles.selectVendor}
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
              >
                <option style={styles.optionStyle} value="">
                  All Vendors
                </option>
                {vendorList.map((v) => (
                  <option key={v.id} style={styles.optionStyle} value={v.id}>
                    {v.vendor_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div style={styles.chartCard}>
          <div style={styles.chartHeader}>
            <div style={styles.chartTitle}>
              Daily Disposal Loss (S$) — {formatMonthLabel(selectedMonth)}
              {selectedVendorName && (
                <span style={styles.chartVendorSpan}>
                  · {selectedVendorName}
                </span>
              )}
            </div>
          </div>

          {chartLoading ? (
            <div style={styles.chartLoadingDiv}>Loading chart...</div>
          ) : (
            <BarChart
              data={chartData}
              typeFilter={typeFilter}
              onBarClick={(d) => fetchDayDetail(d.date)}
            />
          )}

          <div style={styles.miniSummaryRow}>
            {typeFilter !== "rtv" && (
              <div style={styles.miniSummaryItem}>
                <div style={styles.miniSummaryDotScrap} />
                <span>
                  Total Scrap Loss :{" "}
                  <strong style={styles.miniSummaryValueScrap}>
                    {formatSGD(summary.scrap_total)}
                  </strong>
                </span>
              </div>
            )}
            {typeFilter !== "scrap" && (
              <div style={styles.miniSummaryItem}>
                <div style={styles.miniSummaryDotRtv} />
                <span>
                  Total RTV Loss :{" "}
                  <strong style={styles.miniSummaryValueRtv}>
                    {formatSGD(summary.rtv_total)}
                  </strong>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartDisposalReportPage;
