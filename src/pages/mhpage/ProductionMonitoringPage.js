"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2 } from "lucide-react"

const ProductionMonitoringPage = ({ sidebarVisible }) => {
  const formatDuration = (ms) => {
    if (ms < 0) ms = 0
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    return [hours, minutes, seconds].map((unit) => String(unit).padStart(2, "0")).join(":")
  }

  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const shiftStartTime = new Date()
  shiftStartTime.setHours(6, 30, 0, 0)
  const shiftEndTime = new Date()
  shiftEndTime.setHours(18, 30, 0, 0)

  const totalShiftDuration = shiftEndTime.getTime() - shiftStartTime.getTime()
  const elapsedShiftTime = currentTime.getTime() - shiftStartTime.getTime()
  const remainingShiftTime = shiftEndTime.getTime() - currentTime.getTime()

  const [tooltip, setTooltip] = useState({
    visible: false,
    content: "",
    x: 0,
    y: 0,
  })

  const showTooltip = (e) => {
    let content = ""
    if (e.target.tagName === "BUTTON" || e.target.closest("button")) {
      const button = e.target.tagName === "BUTTON" ? e.target : e.target.closest("button")
      if (
        button.querySelector('svg[data-icon="plus"]') ||
        (button.querySelector("svg") &&
          button.querySelector("svg").parentElement.contains(e.target) &&
          button.querySelector('[size="10"]'))
      ) {
        content = "Add"
      } else if (
        button.querySelector('svg[data-icon="trash-2"]') ||
        (button.querySelector("svg") &&
          button.querySelector("svg").parentElement.contains(e.target) &&
          button.classList.contains("delete-button"))
      ) {
        content = "Delete"
      } else if (button.title) {
        content = button.title
      } else if (button.querySelector("svg")) {
        const icon = button.querySelector("svg").parentElement
        if (icon) {
          if (icon.contains(e.target)) {
            if (button.querySelector('[size="10"]')) {
              content = "Add"
            } else {
              content = "Perluas/sembunyikan detail"
            }
          }
        }
      }
    } else if (e.target.type === "checkbox") {
      content = "Pilih baris ini"
    } else if (e.target.tagName === "TD" || e.target.tagName === "TH") {
      content = e.target.textContent.trim()
      if (!content) {
        if (e.target.cellIndex === 1) {
          content = "Pilih baris ini"
        } else if (e.target.cellIndex === 2) {
          content = "Perluas/sembunyikan detail"
        }
      }
    }
    if (!content && e.target.textContent.trim()) {
      content = e.target.textContent.trim()
    }
    if (!content) {
      content = "Informasi"
    }
    const rect = e.target.getBoundingClientRect()
    setTooltip({
      visible: true,
      content,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    })
  }

  const hideTooltip = () => {
    setTooltip({
      ...tooltip,
      visible: false,
    })
  }

  const handleButtonHover = (e, isHover, type) => {
    if (type === "primary") {
      e.target.style.backgroundColor = isHover
        ? styles.primaryButtonHover.backgroundColor
        : styles.primaryButton.backgroundColor
    } else if (type === "search") {
      e.target.style.backgroundColor = isHover
        ? styles.searchButtonHover.backgroundColor
        : styles.searchButton.backgroundColor
    } else if (type === "pagination") {
      e.target.style.backgroundColor = isHover
        ? styles.paginationButtonHover.backgroundColor
        : styles.paginationButton.backgroundColor
      e.target.style.color = isHover ? styles.paginationButtonHover.color : styles.paginationButton.color
    }
  }

  const handleTabHover = (e, isHover, isActive) => {
    if (!isActive) {
      e.target.style.color = isHover ? styles.tabButtonHover.color : styles.tabButton.color
    }
  }

  const handleInputFocus = (e) => {
    e.target.style.borderColor = "#9fa8da"
  }

  const handleInputBlur = (e) => {
    e.target.style.borderColor = "#d1d5db"
  }

  const [activeTab, setActiveTab] = useState("all")

  const optionStyle = {
    backgroundColor: "#d1d5db",
    color: "#374151",
    fontSize: "12px",
    padding: "4px 8px",
  }

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
    metricValueMedium: {
      fontSize: "12px",
      fontWeight: "700",
      color: "#1f2937",
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
      backgroundColor: "#c7d2fe", // light indigo to match border
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
  }

  const unitsCoverage = (stock, usagePerUnit) => {
    if (!usagePerUnit || usagePerUnit <= 0) return Number.POSITIVE_INFINITY
    return Math.floor((stock ?? 0) / usagePerUnit)
  }

  // returns a font color based on coverage thresholds:
  // RED if coverage < 90, YELLOW if 90–149, GREEN if 150+
  const m1a1TextColor = (stock, usagePerUnit) => {
    const cov = unitsCoverage(stock, usagePerUnit)
    if (cov < 90) return "#dc2626" // red-600
    if (cov < 150) return "#ca8a04" // amber-600
    return "#16a34a" // green-600
  }

  const PAGE_SIZE = 20

  const parts = Array.from({ length: 30 }, (_, i) => {
    const usageOptions = [1, 2, 4, 8]
    const usagePerUnit = usageOptions[i % usageOptions.length]

    // Cycle a few coverage targets to exercise red/yellow/green
    // 75 (red), 110 (yellow), 180 (green), 60 (red), 95 (yellow), 140 (yellow), 155 (green), 200 (green)
    const coverageOptions = [75, 110, 180, 60, 95, 140, 155, 200]
    const coverage = coverageOptions[i % coverageOptions.length]
    const m1a1 = coverage * usagePerUnit
    const m136 = Math.max(0, Math.floor(m1a1 * 0.3))
    const real = m1a1 + m136

    return {
      code: `PART-${String(i + 1).padStart(3, "0")}`,
      name: `Dummy Part ${i + 1}`,
      type:  i % 2 === 0 ? "REGULER" : "SPECIAL PART",
      vendorType: i % 2 === 0 ? "LOCAL" : "OVERSEA",
      vendorName: i % 2 === 0 ? "PT EXAMPLE SUPPLIER" : "ACME GLOBAL",
      m1a1,
      m136,
      real,
      usagePerUnit,
    }
  })

  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(parts.length / PAGE_SIZE))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pagedParts = parts.slice(startIndex, startIndex + PAGE_SIZE)

  return (
    <div style={styles.pageContainer}>
      <div style={styles.welcomeCard}>
        <div style={styles.dailyProductionCard}>
          <div style={styles.cardHeader}>Production Monitoring</div>

          <div style={styles.metricBoxesWrapper}>
            {" "}
            <div style={styles.metricBox}>
              <span style={styles.metricLabel}>Daily Input Target</span>
              <span style={styles.metricValueLarge}>45</span>
            </div>
            <div style={styles.metricBox}>
              <span style={styles.metricLabel}>Current Target</span>
              <span style={styles.metricValueLarge}>15</span>
            </div>
            <div style={styles.metricBox}>
              <span style={styles.metricLabel}>Shift Remaining</span>
              <span style={styles.timerValue}>{formatDuration(remainingShiftTime)}</span>
            </div>
          </div>

          <div style={styles.infoBlock}>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Shift Time</span>
              <span style={styles.infoColon}>:</span>
              <span style={styles.infoValue}>06:30 - 18:30</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Shift Status</span>
              <span style={styles.infoColon}>:</span>
              <span style={styles.infoValue}>
                {elapsedShiftTime > 0 && remainingShiftTime > 0
                  ? "In Progress"
                  : elapsedShiftTime <= 0
                    ? "Not Started"
                    : "Completed"}
              </span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Current Customer</span>
              <span style={styles.infoColon}>:</span>
              <span style={styles.infoValue}>EEB</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Product Code</span>
              <span style={styles.infoColon}>:</span>
              <span style={styles.infoValue}>B224401-1143</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Product Model</span>
              <span style={styles.infoColon}>:</span>
              <span style={styles.infoValue}>Perfection V850 Pro</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Description</span>
              <span style={styles.infoColon}>:</span>
              <span style={styles.infoValue}>Running Veronica</span>
            </div>
          </div>
        </div>
        <div style={styles.combinedHeaderFilter}>
          <div style={styles.headerRow}>
            <h1 style={styles.title}>Search Bar</h1>
          </div>

          <div style={styles.filterRow}>
            <div style={styles.inputGroup}>
              <span style={styles.label}>Date Filter</span>
              <select style={styles.select} onFocus={handleInputFocus} onBlur={handleInputBlur}>
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
              <select style={styles.select} onFocus={handleInputFocus} onBlur={handleInputBlur}>
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
        {/* <div style={styles.tabsContainer}>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "all" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("all")}
            onMouseEnter={(e) => handleTabHover(e, true, activeTab === "all")}
            onMouseLeave={(e) => handleTabHover(e, false, activeTab === "all")}
          >
            ALL
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "subCr" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("subCr")}
            onMouseEnter={(e) => handleTabHover(e, true, activeTab === "subCr")}
            onMouseLeave={(e) =>
              handleTabHover(e, false, activeTab === "subCr")
            }
          >
            SUB CR
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "tpu1" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("tpu1")}
            onMouseEnter={(e) => handleTabHover(e, true, activeTab === "tpu1")}
            onMouseLeave={(e) => handleTabHover(e, false, activeTab === "tpu1")}
          >
            TPU 1
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "tpu2" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("tpu2")}
            onMouseEnter={(e) => handleTabHover(e, true, activeTab === "tpu2")}
            onMouseLeave={(e) => handleTabHover(e, false, activeTab === "tpu2")}
          >
            TPU 2
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "cr1" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("cr1")}
            onMouseEnter={(e) => handleTabHover(e, true, activeTab === "cr1")}
            onMouseLeave={(e) => handleTabHover(e, false, activeTab === "cr1")}
          >
            CR 1
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "cr2" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("cr2")}
            onMouseEnter={(e) => handleTabHover(e, true, activeTab === "cr2")}
            onMouseLeave={(e) => handleTabHover(e, false, activeTab === "cr")}
          >
            CR 2
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "cradj" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("cradj")}
            onMouseEnter={(e) => handleTabHover(e, true, activeTab === "cradj")}
            onMouseLeave={(e) =>
              handleTabHover(e, false, activeTab === "cradj")
            }
          >
            CR ADJ
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "m1" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("m1")}
            onMouseEnter={(e) => handleTabHover(e, true, activeTab === "m1")}
            onMouseLeave={(e) => handleTabHover(e, false, activeTab === "m1")}
          >
            M 1
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "m2" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("m2")}
            onMouseEnter={(e) => handleTabHover(e, true, activeTab === "m2")}
            onMouseLeave={(e) => handleTabHover(e, false, activeTab === "m2")}
          >
            M 2
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "ft" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("ft")}
            onMouseEnter={(e) => handleTabHover(e, true, activeTab === "ft")}
            onMouseLeave={(e) => handleTabHover(e, false, activeTab === "ft")}
          >
            FT
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "acc" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("ft")}
            onMouseEnter={(e) => handleTabHover(e, true, activeTab === "acc")}
            onMouseLeave={(e) => handleTabHover(e, false, activeTab === "acc")}
          >
            ACC
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "packing" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("packing")}
            onMouseEnter={(e) =>
              handleTabHover(e, true, activeTab === "packing")
            }
            onMouseLeave={(e) =>
              handleTabHover(e, false, activeTab === "packing")
            }
          >
            PACKING
          </button>
        </div> */}
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
                  <th style={styles.expandedTh}>No</th>
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
                    onMouseEnter={(e) => (e.target.closest("tr").style.backgroundColor = "#c7cde8")}
                    onMouseLeave={(e) => (e.target.closest("tr").style.backgroundColor = "transparent")}
                  >
                    <td
                      style={{
                        ...styles.expandedTd,
                        ...styles.expandedWithLeftBorder,
                        ...styles.emptyColumn,
                      }}
                    >
                      {startIndex + idx + 1}
                    </td>

                    <td style={styles.tdWithLeftBorder} onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
                      {p.code}
                    </td>

                    <td style={styles.tdWithLeftBorder} onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
                      {p.name}
                    </td>

                    <td style={styles.tdWithLeftBorder} onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
                      {p.type}
                    </td>

                    <td style={styles.tdWithLeftBorder} onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
                      {p.vendorType}
                    </td>

                    <td style={styles.tdWithLeftBorder} onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
                      {p.vendorName}
                    </td>

                     <td style={styles.tdWithLeftBorder} onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
                      
                    </td>

                     <td style={styles.tdWithLeftBorder} onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
                      
                    </td>

                    <td style={styles.tdWithLeftBorder} onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
                      <span
                        style={{
                          color: m1a1TextColor(p.m1a1, p.usagePerUnit),
                          fontWeight: 700,
                        }}
                        title={`Coverage: ${unitsCoverage(p.m1a1, p.usagePerUnit)} units (usage: ${p.usagePerUnit}/unit)`}
                      >
                        {p.m1a1} pcs
                      </span>
                    </td>

                    <td style={styles.tdWithLeftBorder} onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
                      {p.m136} pcs
                    </td>

                    <td style={styles.tdWithLeftBorder}>
              
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
              <input type="text" value={currentPage} style={styles.paginationInput} readOnly />
              <span>of {totalPages}</span>
              <button
                style={styles.paginationButton}
                disabled={currentPage === totalPages}
                onMouseEnter={(e) => handleButtonHover(e, true, "pagination")}
                onMouseLeave={(e) => handleButtonHover(e, false, "pagination")}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
  )
}

export default ProductionMonitoringPage
