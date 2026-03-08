"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Save } from "lucide-react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const getAuthUserLocal = () => {
  try {
    return JSON.parse(sessionStorage.getItem("auth_user") || "null");
  } catch {
    return null;
  }
};

const formatReturnByTimestamp = (empName) => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  return `${empName} | ${day}/${month}/${year} ${hour}.${minute}`;
};

const AddReturnPartsPage = () => {
  const navigate = useNavigate();
  const user = getAuthUserLocal();
  const empName = user?.emp_name || user?.name || "Unknown";

  const [partCodeInput, setPartCodeInput] = useState("");
  const [qtyReturn, setQtyReturn] = useState("");
  const [inserting, setInserting] = useState(false);

  const [partData, setPartData] = useState([]);
  const [selectedMainTableItems, setSelectedMainTableItems] = useState(
    new Set(),
  );
  const [selectAllMainTable, setSelectAllMainTable] = useState(false);
  const [saving, setSaving] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const validParts = partData.filter(
    (p) => p.partCode && p.partCode.trim() !== "",
  );
  const totalPages = Math.ceil(validParts.length / itemsPerPage) || 1;
  const showCheckbox = validParts.length > 1;

  const getCurrentPageData = () => {
    const start = (currentPage - 1) * itemsPerPage;
    return validParts.slice(start, start + itemsPerPage);
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleInsert = async () => {
    const code = partCodeInput.trim();
    if (!code) {
      alert("Part Code is required.");
      setPartCodeInput("");
      return;
    }
    if (!qtyReturn || Number(qtyReturn) <= 0) {
      alert("Enter a valid Qty Return.");
      return;
    }

    const isDuplicate = validParts.some(
      (p) => p.partCode.toLowerCase() === code.toLowerCase(),
    );
    if (isDuplicate) {
      alert(`Part Code "${code}" already added.`);
      setPartCodeInput("");
      return;
    }

    setInserting(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/kanban-master/by-part-code?part_code=${encodeURIComponent(code)}`,
      );
      const result = await res.json();

      if (!result.item) {
        alert(`Part Code "${code}" not found in Kanban Master.`);
        setPartCodeInput("");
        return;
      }

      const km = result.item;

      if (!km.stock_m101 || Number(km.stock_m101) <= 0) {
        alert(`Part Code "${code}" has no stock in M101.`);
        setPartCodeInput("");
        return;
      }
      const newPart = {
        id: Date.now(),
        partCode: km.part_code,
        partName: km.part_name,
        model: km.model || "-",
        vendorName: km.vendor_name || "-",
        vendorType: km.vendor_type || "-",
        qtyReturn: Number(qtyReturn),
        remark: "",
        returnBy: formatReturnByTimestamp(empName),
      };

      setPartData((prev) => [...prev, newPart]);
      setPartCodeInput("");
      setQtyReturn("");
    } catch (err) {
      console.error("Error validating part code:", err);
      alert("Server error. Check connection.");
      setPartCodeInput("");
    } finally {
      setInserting(false);
    }
  };

  const handleMainTableCheckbox = (id) => {
    setSelectedMainTableItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllMainTable = () => {
    if (selectAllMainTable) {
      setSelectedMainTableItems(new Set());
    } else {
      setSelectedMainTableItems(new Set(validParts.map((p) => p.id)));
    }
    setSelectAllMainTable(!selectAllMainTable);
  };

  const handleRemarkChange = (id, value) => {
    setPartData((prev) =>
      prev.map((p) => (p.id === id ? { ...p, remark: value } : p)),
    );
  };

  const handleQtyReturnChange = (id, value) => {
    setPartData((prev) =>
      prev.map((p) => (p.id === id ? { ...p, qtyReturn: value } : p)),
    );
  };

  const handleDeleteFromMainTable = (id) => {
    setPartData((prev) => prev.filter((p) => p.id !== id));
    setSelectedMainTableItems((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleSaveConfiguration = async () => {
    if (validParts.length === 0) {
      alert("No data to save.");
      return;
    }

    if (showCheckbox && selectedMainTableItems.size === 0) {
      alert("Select at least one row before saving.");
      return;
    }

    const partsToSave = showCheckbox
      ? validParts.filter((p) => selectedMainTableItems.has(p.id))
      : validParts;

    if (partsToSave.length === 0) {
      alert("No rows selected.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/return-parts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parts: partsToSave.map((p) => ({
            part_code: p.partCode,
            part_name: p.partName,
            model: p.model,
            vendor_name: p.vendorName,
            vendor_type: p.vendorType,
            qty_return: Number(p.qtyReturn) || 0,
            remark: p.remark || null,
            return_by_name: empName,
          })),
        }),
      });

      const result = await res.json();
      if (result.success) {
        navigate("/return-parts?tab=New");
      } else {
        alert("Failed to save: " + result.message);
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Server error. Failed to save.");
    } finally {
      setSaving(false);
    }
  };

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
    h2: {
      fontSize: "18px",
      fontWeight: "630",
      marginBottom: "20px",
      color: "#4b5563",
    },
    h2List: {
      fontSize: "18px",
      fontWeight: "630",
      marginBottom: "5px",
      marginTop: "16px",
      color: "#4b5563",
    },
    label: {
      fontSize: "12px",
      fontWeight: "500",
      color: "#4b5563",
      marginBottom: "3px",
      display: "block",
    },
    formRow: {
      display: "flex",
      gap: "24px",
      alignItems: "flex-end",
      flexWrap: "wrap",
    },
    formGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "4px",
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
    readonlyDisplay: {
      display: "flex",
      height: "1rem",
      width: "160px",
      borderRadius: "6px",
      border: "1px solid #e5e7eb",
      backgroundColor: "#f9fafb",
      padding: "8px 12px",
      fontSize: "12px",
      alignItems: "center",
      color: "#6b7280",
      fontFamily: "inherit",
    },
    actionButtonsGroup: {
      display: "flex",
      gap: "8px",
      marginTop: "20px",
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
    saveConfiguration: {
      display: "flex",
      gap: "8px",
      marginTop: "20px",
      marginLeft: "10px",
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
    emptyColumn: {
      width: "auto",
      minWidth: "auto",
      maxWidth: "auto",
      padding: "0",
      textAlign: "center",
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
    qtyInput: {
      height: "1rem",
      width: "90%",
      borderRadius: "6px",
      border: "1px solid #d1d5db",
      backgroundColor: "#f3f4f6",
      padding: "8px 6px",
      fontSize: "12px",
      color: "#374151",
      fontFamily: "inherit",
      outline: "none",
      boxSizing: "border-box",
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
      <div style={styles.welcomeCard}>
        <div style={styles.card}>
          <h2 style={styles.h2}>Return Parts</h2>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Part Code</label>
              <input
                type="text"
                style={styles.inputPartCode}
                placeholder="Enter part code"
                value={partCodeInput}
                onChange={(e) => setPartCodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleInsert();
                  }
                }}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Qty Return</label>
              <input
                type="number"
                min="0"
                step="1"
                style={styles.inputPartCode}
                placeholder="0"
                value={qtyReturn}
                onChange={(e) => setQtyReturn(e.target.value)}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Return By</label>
              <div style={styles.readonlyDisplay}>{empName}</div>
            </div>
          </div>

          <div style={styles.actionButtonsGroup}>
            <button
              style={{ ...styles.button, ...styles.primaryButton }}
              onClick={handleInsert}
              disabled={inserting}
            >
              <Plus size={16} />
              {inserting ? "Checking..." : "Insert"}
            </button>
          </div>
        </div>

        <h2 style={styles.h2List}>Request List</h2>

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
                <col style={{ width: "8%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "6%" }} />
              </colgroup>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.expandedTh}>No</th>
                  <th style={styles.thWithLeftBorder}>
                    {showCheckbox && (
                      <input
                        type="checkbox"
                        checked={selectAllMainTable}
                        onChange={handleSelectAllMainTable}
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
                  <th style={styles.thWithLeftBorder}>Part Code</th>
                  <th style={styles.thWithLeftBorder}>Part Name</th>
                  <th style={styles.thWithLeftBorder}>Model</th>
                  <th style={styles.thWithLeftBorder}>Vendor</th>
                  <th style={styles.thWithLeftBorder}>Types</th>
                  <th style={styles.thWithLeftBorder}>Qty Return</th>
                  <th style={styles.thWithLeftBorder}>Remark</th>
                  <th style={styles.thWithLeftBorder}>Return By</th>
                  <th style={styles.thWithLeftBorder}>Action</th>
                </tr>
              </thead>
              <tbody>
                {getCurrentPageData().length === 0 ? (
                  <tr></tr>
                ) : (
                  getCurrentPageData().map((part, index) => {
                    const globalIndex =
                      (currentPage - 1) * itemsPerPage + index + 1;
                    return (
                      <tr
                        key={part.id}
                        style={{
                          backgroundColor: selectedMainTableItems.has(part.id)
                            ? "#c7cde8"
                            : "transparent",
                        }}
                        onMouseEnter={(e) => {
                          e.target.closest("tr").style.backgroundColor =
                            "#c7cde8";
                        }}
                        onMouseLeave={(e) => {
                          if (selectedMainTableItems.has(part.id)) {
                            e.target.closest("tr").style.backgroundColor =
                              "#c7cde8";
                          } else {
                            e.target.closest("tr").style.backgroundColor =
                              "transparent";
                          }
                        }}
                      >
                        <td
                          style={{
                            ...styles.expandedTd,
                            ...styles.expandedWithLeftBorder,
                            ...styles.emptyColumn,
                          }}
                        >
                          {globalIndex}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {showCheckbox && (
                            <input
                              type="checkbox"
                              checked={selectedMainTableItems.has(part.id)}
                              onChange={() => handleMainTableCheckbox(part.id)}
                              style={{
                                margin: "0 auto",
                                display: "block",
                                cursor: "pointer",
                                width: "12px",
                                height: "12px",
                              }}
                            />
                          )}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={part.partCode}
                        >
                          {part.partCode}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={part.partName}
                        >
                          {part.partName}
                        </td>
                        <td style={styles.tdWithLeftBorder} title={part.model}>
                          {part.model}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={part.vendorName}
                        >
                          {part.vendorName}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={part.vendorType}
                        >
                          {part.vendorType}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            title={part.qtyReturn}
                            value={part.qtyReturn}
                            onChange={(e) =>
                              handleQtyReturnChange(part.id, e.target.value)
                            }
                            style={styles.qtyInput}
                          />
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          <input
                            type="text"
                            title={part.remark}
                            value={part.remark || ""}
                            onChange={(e) =>
                              handleRemarkChange(part.id, e.target.value)
                            }
                            placeholder="Add remark..."
                            style={styles.remarkInput}
                          />
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={part.returnBy}
                        >
                          {part.returnBy}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          <button
                            onClick={() => handleDeleteFromMainTable(part.id)}
                            style={styles.deleteButton}
                            title="Delete"
                          >
                            <Trash2 size={10} />
                          </button>
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
                  if (!isNaN(page)) handlePageChange(page);
                }}
              />
              <span>of {totalPages}</span>
              <button
                style={styles.paginationButton}
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                {">"}
              </button>
              <button
                style={styles.paginationButton}
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
              >
                {">>"}
              </button>
            </div>
            <span style={{ fontSize: "12px", color: "#374151" }}>
              Total Row: {validParts.length}
            </span>
          </div>
        </div>

        <div style={styles.saveConfiguration}>
          <button
            style={{ ...styles.button, ...styles.primaryButton }}
            onClick={handleSaveConfiguration}
            disabled={saving}
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddReturnPartsPage;
