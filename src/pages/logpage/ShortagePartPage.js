import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { AlertTriangle, SlidersHorizontal, Save } from "lucide-react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

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

const ShortagePartPage = ({ sidebarVisible }) => {
  const [parts, setParts] = useState([]);
  const [partsLoading, setPartsLoading] = useState(false);
  const [customersMap, setCustomersMap] = useState({});
  const [warningThreshold, setWarningThreshold] = useState(() => {
    const s = localStorage.getItem("sp_warning_threshold");
    return s ? parseInt(s) || 0 : 0;
  });
  const [okThreshold, setOkThreshold] = useState(() => {
    const s = localStorage.getItem("sp_ok_threshold");
    return s ? parseInt(s) || 0 : 0;
  });
  const [showThresholdPopup, setShowThresholdPopup] = useState(false);
  const [popupWarningInput, setPopupWarningInput] = useState("");
  const [popupOkInput, setPopupOkInput] = useState("");
  const [isSettingsHovered, setIsSettingsHovered] = useState(false);
  const [vendorFilter, setVendorFilter] = useState("ALL");
  const [searchBy, setSearchBy] = useState("Part Code");
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [appliedSearchBy, setAppliedSearchBy] = useState("Part Code");
  const [currentPage, setCurrentPage] = useState(1);

  const partsRefreshTimerRef = useRef(null);
  const fetchPartsRef = useRef(null);

  const parseCustomerSpecial = (raw) => {
    if (!raw) return null;
    try {
      const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
      return Array.isArray(arr) && arr.length > 0 ? arr.map(String) : null;
    } catch {
      return null;
    }
  };

  const fetchParts = useCallback(async (silent = false) => {
    if (!silent) setPartsLoading(true);
    try {
      const data = await http(
        `/api/kanban-master/with-details?include_inactive=false`,
      );
      if (data?.success && Array.isArray(data.data)) {
        const mapped = data.data.map((p) => {
          const cs = parseCustomerSpecial(p.customer_special);
          return {
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
            customerSpecial: cs,
          };
        });
        setParts(mapped);
      }
    } catch {
    } finally {
      if (!silent) setPartsLoading(false);
    }
  }, []);

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

  useEffect(() => {
    http("/api/customers/active-minimal")
      .then((data) => {
        if (Array.isArray(data)) {
          const map = {};
          data.forEach((c) => {
            map[String(c.id)] = c.cust_name;
          });
          setCustomersMap(map);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (showThresholdPopup) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showThresholdPopup]);

  const allVendorNames = useMemo(() => {
    const nameSet = new Set();
    parts.forEach((p) => {
      if (p.vendorName && p.vendorName !== "-") nameSet.add(p.vendorName);
    });
    return [...nameSet].sort();
  }, [parts]);

  const thresholdsActive = warningThreshold > 0 && okThreshold > 0;

  const getUnitCoverage = (stock, qtyPerAssembly) => {
    if (!qtyPerAssembly || qtyPerAssembly <= 0) return Infinity;
    return Math.floor((stock ?? 0) / qtyPerAssembly);
  };

  const getStockColor = (stock, qtyPerAssembly) => {
    if (!thresholdsActive) return "#374151";
    const cov = getUnitCoverage(stock, qtyPerAssembly);
    if (cov >= okThreshold) return "#16a34a";
    if (cov >= warningThreshold) return "#ca8a04";
    return "#dc2626";
  };

  const getShortageStatus = (stock, qtyPerAssembly) => {
    if (!thresholdsActive) return null;
    const cov = getUnitCoverage(stock, qtyPerAssembly);
    if (cov >= okThreshold) return "OK";
    if (cov >= warningThreshold) return "Warning";
    return "Shortage";
  };

  const getBalanceColor = (coverage) => {
    if (coverage === Infinity) return "#16a34a";
    const bal = coverage - okThreshold;
    if (bal >= 0) return "#16a34a";
    if (coverage >= warningThreshold) return "#ca8a04";
    return "#dc2626";
  };

  const getSortScore = (p) => getUnitCoverage(p.m136, p.qty_per_assembly);

  const handleOpenThresholdPopup = () => {
    setPopupWarningInput(warningThreshold > 0 ? String(warningThreshold) : "");
    setPopupOkInput(okThreshold > 0 ? String(okThreshold) : "");
    setShowThresholdPopup(true);
  };

  const handleSaveThresholds = () => {
    const w = parseInt(popupWarningInput);
    const o = parseInt(popupOkInput);
    if (!isNaN(w) && w >= 0) {
      setWarningThreshold(w);
      localStorage.setItem("sp_warning_threshold", String(w));
    }
    if (!isNaN(o) && o >= 0) {
      setOkThreshold(o);
      localStorage.setItem("sp_ok_threshold", String(o));
    }
    setCurrentPage(1);
    setShowThresholdPopup(false);
  };

  const handleCancelThresholds = () => setShowThresholdPopup(false);

  const handleClearThresholds = () => {
    setWarningThreshold(0);
    setOkThreshold(0);
    setPopupWarningInput("");
    setPopupOkInput("");
    localStorage.setItem("sp_warning_threshold", "0");
    localStorage.setItem("sp_ok_threshold", "0");
  };

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

  const handleInputFocus = (e) => {
    e.target.style.borderColor = "#9fa8da";
  };
  const handleInputBlur = (e) => {
    e.target.style.borderColor = "#d1d5db";
  };

  const handleButtonHover = (e, isHover, type) => {
    if (type === "pagination") {
      e.target.style.backgroundColor = isHover ? "#c7d2fe" : "transparent";
      e.target.style.color = isHover ? "#111827" : "#374151";
    } else if (type === "search") {
      e.target.style.backgroundColor = isHover ? "#1d4ed8" : "#2563eb";
    }
  };

  const filteredParts = parts.filter((p) => {
    if (vendorFilter !== "ALL" && p.vendorName !== vendorFilter) return false;
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

  const sortedFilteredParts = thresholdsActive
    ? [...filteredParts].sort((a, b) => getSortScore(a) - getSortScore(b))
    : filteredParts;

  const PAGE_SIZE = 20;
  const totalPages = Math.max(
    1,
    Math.ceil(sortedFilteredParts.length / PAGE_SIZE),
  );
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pagedParts = sortedFilteredParts.slice(
    startIndex,
    startIndex + PAGE_SIZE,
  );

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
    partCount: {
      fontSize: "11px",
      color: "#6b7280",
    },
    partCountFiltered: {
      marginLeft: "6px",
      color: "#2563eb",
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
    inputGroupRight: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginLeft: "auto",
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
      fontFamily: "inherit",
      cursor: "pointer",
    },
    optionStyle: {
      backgroundColor: "#d1d5db",
      color: "#374151",
      fontSize: "12px",
      padding: "4px 8px",
    },
    searchButton: {
      padding: "8px 16px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: "500",
      fontFamily: "inherit",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      backgroundColor: "#2563eb",
      color: "white",
    },
    clearSearchButton: {
      padding: "8px 16px",
      borderRadius: "4px",
      border: "1px solid #d1d5db",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: "500",
      fontFamily: "inherit",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      backgroundColor: "#f3f4f6",
      color: "#374151",
    },
    settingsIconButton: {
      backgroundColor: "transparent",
      border: "none",
      cursor: "pointer",
      padding: "4px",
      borderRadius: "4px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.2s ease",
    },
    settingsIconButtonHovered: {
      backgroundColor: "#f3f4f6",
      border: "none",
      cursor: "pointer",
      padding: "4px",
      borderRadius: "4px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.2s ease",
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
      minWidth: "1400px",
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
    },
    tdNo: {
      padding: "0",
      border: "0.5px solid #9fa8da",
      whiteSpace: "nowrap",
      backgroundColor: "#e0e7ff",
      fontSize: "12px",
      color: "#374151",
      height: "25px",
      lineHeight: "1",
      verticalAlign: "middle",
      overflow: "hidden",
      textAlign: "center",
    },
    tdStatus: {
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
    tdEmptyState: {
      padding: "20px",
      border: "0.5px solid #9fa8da",
      fontSize: "12px",
      color: "#6b7280",
      textAlign: "center",
    },
    tdEmptyStateItalic: {
      padding: "20px",
      border: "0.5px solid #9fa8da",
      fontSize: "12px",
      color: "#6b7280",
      textAlign: "center",
      fontStyle: "italic",
    },
    stockValue: {
      fontWeight: 600,
    },
    statusBadgeBase: {
      fontSize: "10px",
      fontWeight: "700",
      padding: "2px 6px",
      borderRadius: "10px",
    },
    statusBadgeOK: {
      fontSize: "10px",
      fontWeight: "700",
      padding: "2px 6px",
      borderRadius: "10px",
      backgroundColor: "#dcfce7",
      color: "#166534",
      border: "1px solid #bbf7d0",
    },
    statusBadgeWarning: {
      fontSize: "10px",
      fontWeight: "700",
      padding: "2px 6px",
      borderRadius: "10px",
      backgroundColor: "#fef9c3",
      color: "#854d0e",
      border: "1px solid #fef08a",
    },
    statusBadgeShortage: {
      fontSize: "10px",
      fontWeight: "700",
      padding: "2px 6px",
      borderRadius: "10px",
      backgroundColor: "#fef2f2",
      color: "#dc2626",
      border: "1px solid #fecaca",
    },
    statusNone: {
      color: "#9ca3af",
      fontSize: "11px",
    },
    shortageIcon: {
      marginRight: "3px",
      verticalAlign: "middle",
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
      width: "440px",
      maxWidth: "90vw",
      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
    },
    popupHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: "1px solid #e5e7eb",
      paddingBottom: "12px",
      marginBottom: "20px",
    },
    popupTitle: {
      fontSize: "16px",
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
    popupSection: {
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
      padding: "16px",
      marginBottom: "16px",
    },
    popupSectionTitle: {
      fontSize: "13px",
      fontWeight: "600",
      color: "#374151",
      margin: 0,
      marginBottom: "24px",
    },
    popupThresholdRow: {
      display: "flex",
      flexDirection: "column",
      gap: "12px",
    },
    popupThresholdItem: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
    },
    popupDot: {
      width: "12px",
      height: "12px",
      borderRadius: "50%",
      flexShrink: 0,
    },
    popupDotWarning: {
      width: "12px",
      height: "12px",
      borderRadius: "50%",
      flexShrink: 0,
      backgroundColor: "#ca8a04",
    },
    popupDotOK: {
      width: "12px",
      height: "12px",
      borderRadius: "50%",
      flexShrink: 0,
      backgroundColor: "#16a34a",
    },
    popupThresholdLabel: {
      fontSize: "12px",
      color: "#374151",
      width: "140px",
    },
    popupThresholdInput: {
      width: "90px",
      height: "30px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      padding: "0 8px",
      fontSize: "12px",
      fontFamily: "inherit",
      backgroundColor: "white",
    },
    popupThresholdUnit: {
      fontSize: "11px",
      color: "#6b7280",
    },
    popupActiveInfo: {
      marginTop: "16px",
      padding: "8px 12px",
      backgroundColor: "#f8faff",
      border: "1px solid #e0e7ff",
      borderRadius: "6px",
      fontSize: "11px",
      color: "#374151",
    },
    activeInfoShortage: {
      color: "#dc2626",
      fontWeight: "700",
    },
    activeInfoWarning: {
      color: "#ca8a04",
      fontWeight: "700",
    },
    activeInfoOK: {
      color: "#16a34a",
      fontWeight: "700",
    },
    activeInfoBold: {
      fontWeight: "700",
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
      fontSize: "12px",
      fontFamily: "inherit",
      fontWeight: "600",
    },
    clearButton: {
      padding: "8px 16px",
      border: "1px solid #fecaca",
      borderRadius: "4px",
      background: "white",
      color: "#dc2626",
      cursor: "pointer",
      fontSize: "12px",
      fontFamily: "inherit",
      fontWeight: "600",
    },
    saveButton: {
      padding: "8px 16px",
      border: "none",
      borderRadius: "4px",
      background: "#3b82f6",
      color: "white",
      cursor: "pointer",
      fontSize: "12px",
      fontFamily: "inherit",
      fontWeight: "600",
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.welcomeCard}>
        <div style={styles.combinedHeaderFilter}>
          <div style={styles.headerRow}>
            <h1 style={styles.title}>Shortage Part (M136)</h1>
            <span style={styles.partCount}>
              {partsLoading
                ? "Loading..."
                : `${sortedFilteredParts.length} parts`}
              {appliedKeyword && (
                <span style={styles.partCountFiltered}>
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
                <option value="Part Code" style={styles.optionStyle}>
                  Part Code
                </option>
                <option value="Part Name" style={styles.optionStyle}>
                  Part Name
                </option>
                <option value="Vendor" style={styles.optionStyle}>
                  Vendor
                </option>
                <option value="Part Type" style={styles.optionStyle}>
                  Part Type
                </option>
                <option value="Vendor Type" style={styles.optionStyle}>
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
                style={styles.searchButton}
                onClick={handleSearch}
                onMouseEnter={(e) => handleButtonHover(e, true, "search")}
                onMouseLeave={(e) => handleButtonHover(e, false, "search")}
              >
                Search
              </button>
              {appliedKeyword && (
                <button
                  style={styles.clearSearchButton}
                  onClick={handleClearSearch}
                >
                  Clear
                </button>
              )}
            </div>

            <div style={styles.inputGroupRight}>
              <span style={styles.label}>Vendor</span>
              <select
                style={styles.select}
                value={vendorFilter}
                onChange={(e) => {
                  setVendorFilter(e.target.value);
                  setCurrentPage(1);
                }}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              >
                <option value="ALL" style={styles.optionStyle}>
                  All Vendors
                </option>
                {allVendorNames.map((v) => (
                  <option key={v} value={v} style={styles.optionStyle}>
                    {v}
                  </option>
                ))}
              </select>
              <button
                style={
                  isSettingsHovered
                    ? styles.settingsIconButtonHovered
                    : styles.settingsIconButton
                }
                onClick={handleOpenThresholdPopup}
                onMouseEnter={() => setIsSettingsHovered(true)}
                onMouseLeave={() => setIsSettingsHovered(false)}
                title="Threshold Settings"
              >
                <SlidersHorizontal size={16} />
              </button>
            </div>
          </div>
        </div>

        <div style={styles.tableContainer}>
          <div style={styles.tableBodyWrapper}>
            <table style={styles.table}>
              <colgroup>
                <col style={{ width: "28px" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "6%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "5%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "6%" }} />
              </colgroup>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>No</th>
                  <th style={styles.th}>Part Code</th>
                  <th style={styles.th}>Part Name</th>
                  <th style={styles.th}>Part Type</th>
                  <th style={styles.th}>Vendor Type</th>
                  <th style={styles.th}>Vendor Name</th>
                  <th style={styles.th}>Station</th>
                  <th style={styles.th}>Customer</th>
                  <th style={styles.th}>QTY/Assy</th>
                  <th style={styles.th}>Stock M101</th>
                  <th style={styles.th}>Stock M136</th>
                  <th style={styles.th}>Balance</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {partsLoading ? (
                  <tr>
                    <td colSpan={13} style={styles.tdEmptyState}>
                      Loading...
                    </td>
                  </tr>
                ) : pagedParts.length === 0 ? (
                  <tr>
                    <td colSpan={13} style={styles.tdEmptyStateItalic}>
                      No parts found.
                    </td>
                  </tr>
                ) : (
                  pagedParts.map((p, idx) => {
                    const coverage = getUnitCoverage(
                      p.m136,
                      p.qty_per_assembly,
                    );
                    const coverageDisplay =
                      coverage === Infinity ? "∞" : coverage;
                    const balance =
                      coverage === Infinity
                        ? "∞ pcs"
                        : `${coverage - okThreshold >= 0 ? "+" : ""}${coverage - okThreshold} pcs`;
                    const status = getShortageStatus(
                      p.m136,
                      p.qty_per_assembly,
                    );
                    const statusStyle =
                      status === "OK"
                        ? styles.statusBadgeOK
                        : status === "Warning"
                          ? styles.statusBadgeWarning
                          : styles.statusBadgeShortage;
                    return (
                      <tr
                        key={p.id || p.code}
                        onMouseEnter={(e) =>
                          (e.target.closest("tr").style.backgroundColor =
                            "#c7cde8")
                        }
                        onMouseLeave={(e) =>
                          (e.target.closest("tr").style.backgroundColor =
                            "transparent")
                        }
                      >
                        <td style={styles.tdNo}>{startIndex + idx + 1}</td>
                        <td style={styles.td} title={p.code}>
                          {p.code}
                        </td>
                        <td style={styles.td} title={p.name}>
                          {p.name}
                        </td>
                        <td style={styles.td} title={p.type}>
                          {p.type}
                        </td>
                        <td style={styles.td} title={p.vendorType}>
                          {p.vendorType}
                        </td>
                        <td style={styles.td} title={p.vendorName}>
                          {p.vendorName}
                        </td>
                        <td
                          style={styles.td}
                          title={
                            p.assembly_station
                              ? p.assembly_station.toUpperCase()
                              : "-"
                          }
                        >
                          {p.assembly_station
                            ? p.assembly_station.toUpperCase()
                            : "-"}
                        </td>
                        <td
                          style={styles.td}
                          title={
                            p.customerSpecial
                              ? p.customerSpecial
                                  .map((id) => customersMap[id] || id)
                                  .join(", ")
                              : "All Customers"
                          }
                        >
                          {p.customerSpecial
                            ? p.customerSpecial
                                .map((id) => customersMap[id] || id)
                                .join(", ")
                            : "All Customers"}
                        </td>
                        <td
                          style={styles.td}
                          title={`${p.qty_per_assembly} pcs/unit`}
                        >
                          {p.qty_per_assembly}
                        </td>
                        <td style={styles.td} title={`${p.m101} pcs`}>
                          <span
                            style={{
                              ...styles.stockValue,
                              color: getStockColor(p.m101, p.qty_per_assembly),
                            }}
                          >
                            {p.m101} pcs
                          </span>
                        </td>
                        <td
                          style={styles.td}
                          title={
                            thresholdsActive
                              ? `${p.m136} pcs ÷ ${p.qty_per_assembly} pcs/unit = ${coverageDisplay} units coverage`
                              : `${p.m136} pcs`
                          }
                        >
                          <span
                            style={{
                              ...styles.stockValue,
                              color: getStockColor(p.m136, p.qty_per_assembly),
                            }}
                          >
                            {p.m136} pcs
                          </span>
                        </td>
                        <td
                          style={styles.td}
                          title={
                            thresholdsActive
                              ? `Coverage ${coverageDisplay} units − OK threshold ${okThreshold} units = ${coverage === Infinity ? "∞" : coverage - okThreshold}`
                              : ""
                          }
                        >
                          {thresholdsActive ? (
                            <span
                              style={{
                                ...styles.stockValue,
                                color: getBalanceColor(coverage),
                              }}
                            >
                              {balance}
                            </span>
                          ) : (
                            <span style={styles.statusNone}>- pcs</span>
                          )}
                        </td>
                        <td style={styles.tdStatus}>
                          {!status ? (
                            <span style={styles.statusNone}>-</span>
                          ) : (
                            <span style={statusStyle}>
                              {status === "Shortage" && (
                                <AlertTriangle
                                  size={9}
                                  style={styles.shortageIcon}
                                />
                              )}
                              {status}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div style={styles.paginationBar}>
            <div style={styles.paginationControls}>
              <button
                style={styles.paginationButton}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
                onMouseEnter={(e) => handleButtonHover(e, true, "pagination")}
                onMouseLeave={(e) => handleButtonHover(e, false, "pagination")}
                title="First page"
              >
                {"<<"}
              </button>
              <button
                style={styles.paginationButton}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                onMouseEnter={(e) => handleButtonHover(e, true, "pagination")}
                onMouseLeave={(e) => handleButtonHover(e, false, "pagination")}
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
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                onMouseEnter={(e) => handleButtonHover(e, true, "pagination")}
                onMouseLeave={(e) => handleButtonHover(e, false, "pagination")}
                title="Next page"
              >
                {">"}
              </button>
              <button
                style={styles.paginationButton}
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                onMouseEnter={(e) => handleButtonHover(e, true, "pagination")}
                onMouseLeave={(e) => handleButtonHover(e, false, "pagination")}
                title="Last page"
              >
                {">>"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showThresholdPopup && (
        <div style={styles.popupOverlay}>
          <div style={styles.popupContainer}>
            <div style={styles.popupHeader}>
              <h3 style={styles.popupTitle}>Threshold Settings</h3>
              <button
                style={styles.closeButton}
                onClick={handleCancelThresholds}
              >
                ×
              </button>
            </div>

            <div style={styles.popupSection}>
              <h4 style={styles.popupSectionTitle}>
                Stock M136 Coverage Threshold (units)
              </h4>

              <div style={styles.popupThresholdRow}>
                <div style={styles.popupThresholdItem}>
                  <span style={styles.popupDotWarning} />
                  <span style={styles.popupThresholdLabel}>
                    Warning threshold
                  </span>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 120"
                    value={popupWarningInput}
                    onChange={(e) => setPopupWarningInput(e.target.value)}
                    style={styles.popupThresholdInput}
                  />
                  <span style={styles.popupThresholdUnit}>units</span>
                </div>

                <div style={styles.popupThresholdItem}>
                  <span style={styles.popupDotOK} />
                  <span style={styles.popupThresholdLabel}>OK threshold</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 150"
                    value={popupOkInput}
                    onChange={(e) => setPopupOkInput(e.target.value)}
                    style={styles.popupThresholdInput}
                  />
                  <span style={styles.popupThresholdUnit}>units</span>
                </div>
              </div>

              {thresholdsActive && (
                <div style={styles.popupActiveInfo}>
                  Active:{" "}
                  <span style={styles.activeInfoShortage}>Shortage</span>
                  {" < "}
                  <span style={styles.activeInfoBold}>{warningThreshold}</span>
                  {" ≤ "}
                  <span style={styles.activeInfoWarning}>Warning</span>
                  {" < "}
                  <span style={styles.activeInfoBold}>{okThreshold}</span>
                  {" ≤ "}
                  <span style={styles.activeInfoOK}>OK</span>
                </div>
              )}
            </div>

            <div style={styles.buttonGroup}>
              {thresholdsActive && (
                <button
                  style={styles.clearButton}
                  onClick={() => {
                    handleClearThresholds();
                    setShowThresholdPopup(false);
                  }}
                >
                  Clear
                </button>
              )}
              <button
                style={styles.cancelButton}
                onClick={handleCancelThresholds}
              >
                Cancel
              </button>
              <button style={styles.saveButton} onClick={handleSaveThresholds}>
                <Save size={13} />
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShortagePartPage;
