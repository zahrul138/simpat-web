"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { MdArrowRight, MdArrowDropDown } from "react-icons/md";
import { Plus, Trash2, Pencil, Save, X, Search } from "lucide-react";

const ComponentMasterPage = ({ sidebarVisible }) => {
  const navbarTotalHeight = 164;
  const sidebarWidth = 288;
  const navigate = useNavigate();
  const tableData = [];
  const [selectedStockLevel, setSelectedStockLevel] = useState("M101");
  const [selectedModel, setSelectedModel] = useState("Veronicas");
  const [selectedAnnexUpdate, setSelectedAnnexUpdate] =
    useState("ZAHRUL ROMADHON");
  const [scheduleDate, setScheduleDate] = useState("");
  const [expandedRows, setExpandedRows] = useState({});
  const [expandedVendorRows, setExpandedVendorRows] = useState({});
  const [addVendorDetail, setAddVendorDetail] = useState(false);
  const [addVendorFormData, setAddVendorFormData] = useState({
    partCode: "",
    partName: "",
    quantity: "",
  });

  const toggleRowExpansion = (rowId) => {
    setExpandedRows((prev) => {
      const newExpandedRows = {
        ...prev,
        [rowId]: !prev[rowId],
      };

      if (prev[rowId]) {
        setExpandedVendorRows((prevVendor) => {
          const newVendorRows = { ...prevVendor };
          Object.keys(newVendorRows).forEach((key) => {
            if (
              key.startsWith(`vendor_${rowId}_`) ||
              key === `vendor_${rowId}` ||
              key.includes("vendor_")
            ) {
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

  const handleAddVendorSubmit = (e) => {
    e.preventDefault();
    console.log("Third Level Form Data:", addVendorFormData);
    setAddVendorDetail(false);
    setAddVendorFormData({
      partCode: "",
      partName: "",
      quantity: "",
    });
  };

  const handleAddVendorInputChange = (field, value) => {
    setAddVendorFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const openThirdLevelPopup = () => {
    setAddVendorDetail(true);
  };

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
    if (type === "search") {
      e.target.style.backgroundColor = isHover ? "#1d4ed8" : "#2563eb";
    } else if (type === "pagination") {
      e.target.style.backgroundColor = isHover ? "#2563eb" : "transparent";
      e.target.style.color = isHover ? "white" : "#374151";
    }
  };
  const handleTabHover = (e, isHover, isActive) => {
    if (!isActive) {
      e.target.style.color = isHover
        ? styles.tabButtonHover?.color || "#2563eb"
        : styles.tabButton?.color || "#6b7280";
    }
  };

  const handleInputFocus = (e) => {
    e.target.style.borderColor = "#9fa8da";
  };

  const handleInputBlur = (e) => {
    e.target.style.borderColor = "#d1d5db";
  };

  const [activeTab, setActiveTab] = useState("Veronicas");

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
  };

  return (
    <div style={styles.pageContainer}>
      <div>
        <Helmet>
          <title>Master Data | Component Master</title>
        </Helmet>
      </div>
      <div style={styles.welcomeCard}>
        <div style={styles.combinedHeaderFilter}>
          <div style={styles.headerRow}>
            <h1 style={styles.title}>Component Master</h1>
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
              <select
                style={styles.select}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              >
                <option style={optionStyle}>Part Code</option>
                <option style={optionStyle}>Part Name</option>
                <option style={optionStyle}>Part Type</option>
                <option style={optionStyle}>Customer</option>
                <option style={optionStyle}>Material</option>
                <option style={optionStyle}>Vendor Name</option>
                <option style={optionStyle}>Vendor Type</option>
                <option style={optionStyle}>Size</option>
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

        <div style={styles.tabsContainer}>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "Veronicas" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("Veronicas")}
            onMouseEnter={(e) =>
              handleTabHover(e, true, activeTab === "Veronicas")
            }
            onMouseLeave={(e) =>
              handleTabHover(e, false, activeTab === "Veronicas")
            }
          >
            Veronicas
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "Heracles" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("Heracles")}
            onMouseEnter={(e) =>
              handleTabHover(e, true, activeTab === "Heracles")
            }
            onMouseLeave={(e) =>
              handleTabHover(e, false, activeTab === "Heracles")
            }
          >
            Heracles
          </button>
        </div>

        <div style={styles.tableContainer}>
          <div style={styles.tableBodyWrapper}>
            <table
              style={{
                ...styles.table,
                minWidth: "2000px",
                tableLayout: "fixed",
              }}
            >
              <colgroup>
                <col
                  style={{
                    width: "25px",
                    minWidth: "25px",
                    maxWidth: "25px",
                  }}
                />
                <col style={{ width: "15%" }} />
                <col style={{ width: "30%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "25%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "25%" }} />
              </colgroup>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.expandedTh}>No</th>
                  <th style={styles.thWithLeftBorder}>Part Code</th>
                  <th style={styles.thWithLeftBorder}>Part Name</th>
                  <th style={styles.thWithLeftBorder}>Part Type</th>
                  <th style={styles.thWithLeftBorder}>Customer</th>
                  <th style={styles.thWithLeftBorder}>Material</th>
                  <th style={styles.thWithLeftBorder}>Vendor Name</th>
                  <th style={styles.thWithLeftBorder}>Vendor Type</th>
                  <th style={styles.thWithLeftBorder}>Stock Level From</th>
                  <th style={styles.thWithLeftBorder}>Stock Level To</th>
                  <th style={styles.thWithLeftBorder}>Size</th>
                  <th style={styles.thWithLeftBorder}>Qty Used</th>
                  <th style={styles.thWithLeftBorder}>Rack</th>
                  <th style={styles.thWithLeftBorder}>No Kanban</th>
                  <th style={styles.thWithLeftBorder}>Upload By</th>
                </tr>
              </thead>
              <tbody>
                <tr
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
                  >
                    1
                  </td>
                  <td
                    style={styles.tdWithLeftBorder}
                    onMouseEnter={showTooltip}
                    onMouseLeave={hideTooltip}
                  >
                    123456789
                  </td>
                  <td
                    style={styles.tdWithLeftBorder}
                    onMouseEnter={showTooltip}
                    onMouseLeave={hideTooltip}
                  >
                    HOLDER ASSY PULLEY TENSION TPU
                  </td>
                  <td
                    style={styles.tdWithLeftBorder}
                    onMouseEnter={showTooltip}
                    onMouseLeave={hideTooltip}
                  >
                    REGULER PART
                  </td>
                  <td
                    style={styles.tdWithLeftBorder}
                    onMouseEnter={showTooltip}
                    onMouseLeave={hideTooltip}
                  >
                    EEB
                  </td>
                  <td
                    style={styles.tdWithLeftBorder}
                    onMouseEnter={showTooltip}
                    onMouseLeave={hideTooltip}
                  >
                    METAL
                  </td>
                  <td
                    style={styles.tdWithLeftBorder}
                    onMouseEnter={showTooltip}
                    onMouseLeave={hideTooltip}
                  >
                    PT SAT NUSAPERSADA TBK
                  </td>
                  <td
                    style={styles.tdWithLeftBorder}
                    onMouseEnter={showTooltip}
                    onMouseLeave={hideTooltip}
                  >
                    LOCAL VENDOR
                  </td>
                  <td
                    style={styles.tdWithLeftBorder}
                    onMouseEnter={showTooltip}
                    onMouseLeave={hideTooltip}
                  >
                    SCN-LOG (M136)
                  </td>
                  <td
                    style={styles.tdWithLeftBorder}
                    onMouseEnter={showTooltip}
                    onMouseLeave={hideTooltip}
                  >
                    SCN-MH(M1A1)
                  </td>
                  <td
                    style={styles.tdWithLeftBorder}
                    onMouseEnter={showTooltip}
                    onMouseLeave={hideTooltip}
                  >
                    SMALL
                  </td>
                  <td
                    style={styles.tdWithLeftBorder}
                    onMouseEnter={showTooltip}
                    onMouseLeave={hideTooltip}
                  >
                    1
                  </td>
                  <td
                    style={styles.tdWithLeftBorder}
                    onMouseEnter={showTooltip}
                    onMouseLeave={hideTooltip}
                  >
                    BVA
                  </td>
                  <td
                    style={styles.tdWithLeftBorder}
                    onMouseEnter={showTooltip}
                    onMouseLeave={hideTooltip}
                  >
                    003
                  </td>

                  <td
                    style={styles.tdWithLeftBorder}
                    onMouseEnter={showTooltip}
                    onMouseLeave={hideTooltip}
                  >
                    ZAHRUL ROMADHON | 12/09/2025
                  </td>
                </tr>
              </tbody>
            </table>
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
      </div>
    </div>
  );
};

export default ComponentMasterPage;
