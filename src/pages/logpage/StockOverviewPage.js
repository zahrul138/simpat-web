"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MdArrowRight, MdArrowDropDown, MdArrowDropUp } from "react-icons/md";
import { Plus, Trash2, Pencil, Save, Search, Upload } from "lucide-react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const StockOverviewPage = () => {
  const navigate = useNavigate();

  // State untuk search dan data part
  const [searchPartCode, setSearchPartCode] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [stockData, setStockData] = useState(null);
  const [searchError, setSearchError] = useState("");

  // State untuk Movement History
  const [movements, setMovements] = useState([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("M136");
  const [movementsPagination, setMovementsPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [currentDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  // Format datetime: dd/mm/yyyy hh.mm
  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}.${minutes}`;
  };

  // Format date only: dd/mm/yyyy
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Get "From" display based on source_type
  const getFromDisplay = (movement) => {
    if (!movement.source_type) return "-";
    
    switch (movement.source_type) {
      case "local_schedule":
        return "Vendor";
      case "import_schedule":
        return "Import";
      case "manual_adjustment":
        return "Manual";
      case "transfer":
        return "Transfer";
      case "production":
        return "Production";
      default:
        return movement.source_type;
    }
  };

  // Search part by code
  const handleSearch = async () => {
    if (!searchPartCode.trim()) {
      setSearchError("Please enter a part code");
      return;
    }

    setIsSearching(true);
    setSearchError("");
    setStockData(null);
    setMovements([]);

    try {
      const response = await fetch(
        `${API_BASE}/api/stock-inventory/overview?part_code=${encodeURIComponent(searchPartCode.trim())}`
      );
      const result = await response.json();

      if (result.success && result.data) {
        setStockData(result.data);
        // Fetch movement history for current tab
        await fetchMovements(searchPartCode.trim(), activeTab, 1);
      } else {
        setSearchError(result.message || "Part code not found");
        setStockData(null);
      }
    } catch (err) {
      console.error("Search error:", err);
      setSearchError("Failed to search. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  // Fetch movement history
  const fetchMovements = async (partCode, stockLevel, page = 1) => {
    if (!partCode) return;

    setMovementsLoading(true);
    const offset = (page - 1) * itemsPerPage;

    try {
      const response = await fetch(
        `${API_BASE}/api/stock-inventory/movements?part_code=${encodeURIComponent(partCode)}&stock_level=${stockLevel}&limit=${itemsPerPage}&offset=${offset}`
      );
      const result = await response.json();

      if (result.success) {
        setMovements(result.data || []);
        setMovementsPagination(result.pagination || {
          total: 0,
          limit: itemsPerPage,
          offset: offset,
        });
      } else {
        setMovements([]);
      }
    } catch (err) {
      console.error("Fetch movements error:", err);
      setMovements([]);
    } finally {
      setMovementsLoading(false);
    }
  };

  // Handle tab change
  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    if (stockData?.part_code) {
      fetchMovements(stockData.part_code, tab, 1);
    }
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    const totalPages = Math.ceil(movementsPagination.total / itemsPerPage) || 1;
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      if (stockData?.part_code) {
        fetchMovements(stockData.part_code, activeTab, newPage);
      }
    }
  };

  // Handle Enter key on search
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleTabHover = (e, isHover, isActive) => {
    if (!isActive) {
      e.target.style.color = isHover
        ? styles.tabButtonHover.color
        : styles.tabButton.color;
    }
  };

  const totalPages = Math.ceil(movementsPagination.total / itemsPerPage) || 1;

  const styles = {
    pageContainer: {
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'",
      paddingRight: "24px",
    },
    welcomeCard: {
      backgroundColor: "white",
      borderRadius: "8px",
      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
      border: "1.5px solid #e5e7eb",
      padding: "20px",
    },
    card: {
      padding: "24px",
      boxShadow: "0 1px 10px 0 rgba(0, 0, 0, 0.1)",
      borderRadius: "8px",
      backgroundColor: "white",
    },
    h1: {
      fontSize: "20px",
      fontWeight: "700",
      marginBottom: "32px",
      color: "#374151",
    },
    h2: {
      fontSize: "18px",
      fontWeight: "600",
      marginBottom: "5px",
      color: "#4b5563",
    },
    h3: {
      fontSize: "16px",
      fontWeight: "500",
      color: "#4b5563",
      textAlign: "center",
    },
    gridContainer: {
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: "10px",
    },
    label: {
      fontSize: "12px",
      fontWeight: "500",
      color: "#4b5563",
      marginBottom: "3px",
      display: "block",
    },
    formGroupPartCode: {
      margin: "0px 0px 10px 0px",
      borderBottom: "2px solid #e5e7eb",
      paddingBottom: "16px",
    },
    inputContainer: {
      display: "flex",
      gap: "8px",
      alignItems: "center",
    },
    inputPartCode: {
      flex: "none",
      height: "1rem",
      width: "150px",
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      backgroundColor: "#f3f4f6",
      borderRadius: "6px",
      fontSize: "12px",
      outline: "none",
      boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
      fontFamily: "inherit",
      fontWeight: "450",
    },
    inputReadOnly: {
      flex: "none",
      height: "1rem",
      width: "150px",
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      backgroundColor: "#f9fafb",
      borderRadius: "6px",
      fontSize: "12px",
      outline: "none",
      fontFamily: "inherit",
      fontWeight: "500",
      color: "#374151",
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
    tabsContainer: {
      display: "flex",
      borderBottom: "2px solid #e5e7eb",
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
    arrowIconUp: {
      fontSize: "25px",
      color: "#10B981",
      justifyContent: "center",
    },
    arrowIconDown: {
      fontSize: "25px",
      color: "#EF4444",
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
      overflowX: "auto",
      width: "calc(100% - 10px)",
    },
    tableBodyWrapper: {
      overflowX: "auto",
      border: "1.5px solid #9fa8da",
      borderBottom: "none",
      maxHeight: "400px",
      overflowY: "auto",
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
    errorText: {
      color: "#EF4444",
      fontSize: "11px",
      marginTop: "4px",
    },
    loadingText: {
      textAlign: "center",
      padding: "20px",
      color: "#6b7280",
      fontSize: "12px",
    },
    noDataText: {
      textAlign: "center",
      padding: "20px",
      color: "#9ca3af",
      fontSize: "11px",
    },
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.welcomeCard}>
        <div style={styles.gridContainer}>
          <div style={styles.card}>
            <div style={{ marginBottom: "24px" }}>
              <h2 style={styles.h2}>Stock Overview</h2>
            </div>

            {/* Search Part Code */}
            <div style={{ display: "flex" }}>
              <div style={{ flex: "1", display: "grid", gap: "10px" }}>
                <div style={styles.formGroupPartCode}>
                  <label style={styles.label}>Part Code</label>
                  <div style={styles.inputContainer}>
                    <input
                      type="text"
                      style={styles.inputPartCode}
                      placeholder="Enter part code"
                      value={searchPartCode}
                      onChange={(e) => setSearchPartCode(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                    <button
                      type="button"
                      style={{
                        ...styles.addPartButton,
                        opacity: isSearching ? 0.7 : 1,
                      }}
                      onClick={handleSearch}
                      disabled={isSearching}
                    >
                      <Search size={12} />
                      {isSearching ? "..." : "Search"}
                    </button>
                  </div>
                  {searchError && (
                    <div style={styles.errorText}>{searchError}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Part Name & Vendor Name */}
            <div style={{ display: "flex" }}>
              <div style={{ flex: "1", display: "grid", gap: "10px" }}>
                <div style={styles.formGroupPartCode}>
                  <label style={styles.label}>Part Name</label>
                  <div style={styles.inputContainer}>
                    <input
                      type="text"
                      style={{
                        ...styles.inputReadOnly,
                        width: stockData?.part_name
                          ? `${Math.max(150, stockData.part_name.length * 8 + 24)}px`
                          : "150px",
                        minWidth: "150px",
                        maxWidth: "400px",
                      }}
                      value={stockData?.part_name || ""}
                      readOnly
                      placeholder=""
                    />
                  </div>
                </div>
              </div>
              <div style={{ flex: "2", display: "grid", gap: "10px" }}>
                <div style={styles.formGroupPartCode}>
                  <label style={styles.label}>Vendor Name</label>
                  <div style={styles.inputContainer}>
                    <input
                      type="text"
                      style={{
                        ...styles.inputReadOnly,
                        width: stockData?.vendor_name
                          ? `${Math.max(150, stockData.vendor_name.length * 8 + 24)}px`
                          : "150px",
                        minWidth: "150px",
                        maxWidth: "500px",
                      }}
                      value={stockData?.vendor_name || ""}
                      readOnly
                      placeholder=""
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Stock Info */}
            <div style={{ display: "flex" }}>
              <div style={{ flex: "1", display: "grid", gap: "20px" }}>
                <div>
                  <label htmlFor="" style={styles.label}>
                    Stock M136 | SCN-LOG
                  </label>
                  <input
                    type="text"
                    style={styles.inputReadOnly}
                    value={
                      stockData
                        ? `${stockData.stock_m136 || 0} ${stockData.unit || "PCS"}`
                        : ""
                    }
                    readOnly
                    placeholder="Total part"
                  />
                </div>
                <div>
                  <label htmlFor="" style={styles.label}>
                    Stock M101 | SCN-MH
                  </label>
                  <input
                    type="text"
                    style={styles.inputReadOnly}
                    value={
                      stockData
                        ? `${stockData.stock_m101 || 0} ${stockData.unit || "PCS"}`
                        : ""
                    }
                    readOnly
                    placeholder="Total part"
                  />
                </div>
              </div>
              <div style={{ flex: "2", display: "grid", gap: "20px" }}>
                <div>
                  <label htmlFor="" style={styles.label}>
                    Stock M1Y2 (Transit)
                  </label>
                  <input
                    type="text"
                    style={styles.inputReadOnly}
                    value={
                      stockData
                        ? `${stockData.stock_m1y2 || 0} ${stockData.unit || "PCS"}`
                        : ""
                    }
                    readOnly
                    placeholder="Total part"
                  />
                </div>
                <div>
                  <label htmlFor="" style={styles.label}>
                    Stock RTV
                  </label>
                  <input
                    type="text"
                    style={styles.inputReadOnly}
                    value={
                      stockData
                        ? `${stockData.stock_rtv || 0} ${stockData.unit || "PCS"}`
                        : ""
                    }
                    readOnly
                    placeholder="Total part"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Movement History Section */}
          <h2 style={styles.h2}>Movement History</h2>

          {/* Tabs */}
          <div style={styles.tabsContainer}>
            <button
              style={{
                ...styles.tabButton,
                ...(activeTab === "M136" && styles.tabButtonActive),
              }}
              onClick={() => handleTabClick("M136")}
              onMouseEnter={(e) => handleTabHover(e, true, activeTab === "M136")}
              onMouseLeave={(e) => handleTabHover(e, false, activeTab === "M136")}
            >
              M136
            </button>
            <button
              style={{
                ...styles.tabButton,
                ...(activeTab === "M101" && styles.tabButtonActive),
              }}
              onClick={() => handleTabClick("M101")}
              onMouseEnter={(e) => handleTabHover(e, true, activeTab === "M101")}
              onMouseLeave={(e) => handleTabHover(e, false, activeTab === "M101")}
            >
              M101
            </button>
            <button
              style={{
                ...styles.tabButton,
                ...(activeTab === "M1Y2" && styles.tabButtonActive),
              }}
              onClick={() => handleTabClick("M1Y2")}
              onMouseEnter={(e) => handleTabHover(e, true, activeTab === "M1Y2")}
              onMouseLeave={(e) => handleTabHover(e, false, activeTab === "M1Y2")}
            >
              M1Y2
            </button>
            <button
              style={{
                ...styles.tabButton,
                ...(activeTab === "RTV" && styles.tabButtonActive),
              }}
              onClick={() => handleTabClick("RTV")}
              onMouseEnter={(e) => handleTabHover(e, true, activeTab === "RTV")}
              onMouseLeave={(e) => handleTabHover(e, false, activeTab === "RTV")}
            >
              RTV
            </button>
          </div>

          {/* Movement History Table */}
          <div style={styles.tableContainer}>
            <div style={styles.tableBodyWrapper}>
              <table
                style={{
                  ...styles.table,
                  minWidth: "500px",
                  tableLayout: "fixed",
                }}
              >
                <colgroup>
                  <col style={{ width: "3%" }} />
                  <col style={{ width: "3%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "30%" }} />
                </colgroup>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.expandedTh}>No</th>
                    <th style={styles.thWithLeftBorder}></th>
                    <th style={styles.thWithLeftBorder}>Model</th>
                    <th style={styles.thWithLeftBorder}>From</th>
                    <th style={styles.thWithLeftBorder}>Total Qty</th>
                    <th style={styles.thWithLeftBorder}>Production Date</th>
                    <th style={styles.thWithLeftBorder}>Remark</th>
                    <th style={styles.thWithLeftBorder}>Moved By</th>
                  </tr>
                </thead>
                <tbody>
                  {movementsLoading ? (
                    <tr>
                      <td colSpan="8" style={styles.loadingText}>
                        Loading...
                      </td>
                    </tr>
                  ) : movements.length === 0 ? (
                    <tr>
                    </tr>
                  ) : (
                    movements.map((movement, index) => (
                      <tr
                        key={movement.id}
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
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>
                        <td
                          style={{
                            ...styles.tdWithLeftBorder,
                            ...styles.emptyColumn,
                          }}
                          title={movement.movement_type === "IN" ? "In" : "Out"}
                        >
                          {movement.movement_type === "IN" ? (
                            <MdArrowDropUp style={styles.arrowIconUp} />
                          ) : (
                            <MdArrowDropDown style={styles.arrowIconDown} />
                          )}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={movement.model || "-"}
                        >
                          {movement.model || "-"}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {getFromDisplay(movement)}
                        </td>
                        <td
                          style={{
                            ...styles.tdWithLeftBorder,
                            fontWeight: "600",
                            color:
                              movement.movement_type === "IN"
                                ? "#10B981"
                                : "#EF4444",
                          }}
                        >
                          {movement.movement_type === "IN" ? "+" : "-"}
                          {movement.quantity}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {movement.production_date
                            ? formatDate(movement.production_date)
                            : "-"}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={movement.remark || "-"}
                        >
                          {movement.remark
                            ? movement.remark.length > 25
                              ? `${movement.remark.substring(0, 25)}...`
                              : movement.remark
                            : "-"}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {movement.moved_by_name
                            ? `${movement.moved_by_name} | ${formatDateTime(movement.moved_at)}`
                            : formatDateTime(movement.moved_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={styles.paginationBar}>
              <div style={styles.paginationControls}>
                <button
                  style={styles.paginationButton}
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                >
                  {"<<"}
                </button>
                <button
                  style={styles.paginationButton}
                  onClick={() => handlePageChange(currentPage - 1)}
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
                    if (!isNaN(page)) {
                      handlePageChange(page);
                    }
                  }}
                />
                <span>of {totalPages}</span>
                <button
                  style={styles.paginationButton}
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  {">"}
                </button>
                <button
                  style={styles.paginationButton}
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage >= totalPages}
                >
                  {">>"}
                </button>
              </div>
              <div style={{ fontSize: "11px", color: "#6b7280" }}>
                Total: {movementsPagination.total || 0} records
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockOverviewPage;