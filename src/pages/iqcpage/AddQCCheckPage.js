"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Save, Search } from "lucide-react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const getAuthUserLocal = () => {
 try {
    return JSON.parse(sessionStorage.getItem("auth_user") || "null");
  } catch {
    return null;
  }
};

const getCurrentUser = () => {
  try {
    const authUser = JSON.parse(localStorage.getItem("auth_user") || "null");
    return authUser
      ? authUser.emp_name ||
          authUser.employeeName ||
          authUser.fullname ||
          authUser.name ||
          authUser.username ||
          "System"
      : "System";
  } catch {
    return "System";
  }
};

const AddQCCheckPage = () => {
  const navigate = useNavigate();
  const [selectAll, setSelectAll] = useState(false);

  // Form data untuk input
  const [formData, setFormData] = useState({
    part_code: "",
    part_name: "",
    vendor_name: "",
    vendor_id: null,
    vendor_type: "",
    production_date: "",
  });

  const [tempQCChecks, setTempQCChecks] = useState([]);
  const [currentEmpName, setCurrentEmpName] = useState("");
  const [showSaveButton, setShowSaveButton] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    const u = getAuthUserLocal();
    if (u) {
      const name =
        u.emp_name ||
        u.employeeName ||
        u.fullname ||
        u.name ||
        u.username ||
        "";
      setCurrentEmpName(name);
    }
  }, []);

  useEffect(() => {
    setShowSaveButton(tempQCChecks.length > 0);
  }, [tempQCChecks]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Search Part Code - akan mengambil Part Name, Vendor Name, dan Type dari kanban_master
  const handleSearchPartCode = async () => {
    if (!formData.part_code.trim()) {
      alert("Please enter Part Code first");
      return;
    }

    setSearchLoading(true);
    try {
      // Ambil data part dari kanban_master (sudah include vendor info)
      const response = await fetch(
        `${API_BASE}/api/kanban-master/by-part-code?part_code=${formData.part_code.trim()}`
      );
      const result = await response.json();

      console.log("Search result:", result); // Debug log

      if (result.item) {
        setFormData((prev) => ({
          ...prev,
          part_name: result.item.part_name || "",
          vendor_name: result.item.vendor_name || "",
          vendor_id: result.item.vendor_id,
          vendor_type: result.item.vendor_type || "Local",
        }));
      } else {
        alert("Part Code not found in database");
        setFormData((prev) => ({
          ...prev,
          part_name: "",
          vendor_name: "",
          vendor_id: null,
          vendor_type: "",
        }));
      }
    } catch (error) {
      console.error("Error searching part code:", error);
      alert("Failed to search part code: " + error.message);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleInsertToTemp = () => {
    if (!formData.part_code.trim()) {
      alert("Please fill in Part Code");
      return;
    }

    if (!formData.part_name.trim()) {
      alert("Please search Part Code first to get Part Name");
      return;
    }

    if (!formData.production_date) {
      alert("Please select Production Date");
      return;
    }

    const now = new Date();
    const tempQCCheck = {
      id: Date.now(),
      part_code: formData.part_code.trim(),
      part_name: formData.part_name.trim(),
      vendor_name: formData.vendor_name.trim(),
      vendor_id: formData.vendor_id,
      vendor_type: formData.vendor_type || "Local",
      production_date: formData.production_date,
      approved_by: currentEmpName,
      approved_at: now.toISOString(),
      isSelected: false,
    };

    setTempQCChecks((prev) => [...prev, tempQCCheck]);

    // Reset form
    setFormData({
      part_code: "",
      part_name: "",
      vendor_name: "",
      vendor_id: null,
      vendor_type: "",
      production_date: "",
    });
  };

  const handleSelectAllChange = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setTempQCChecks((prev) =>
      prev.map((item) => ({
        ...item,
        isSelected: newSelectAll,
      }))
    );
  };

  const handleCheckboxChange = (itemId) => {
    setTempQCChecks((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, isSelected: !item.isSelected } : item
      )
    );
  };

  useEffect(() => {
    if (tempQCChecks.length > 0) {
      const allSelected = tempQCChecks.every((item) => item.isSelected);
      setSelectAll(allSelected);
    } else {
      setSelectAll(false);
    }
  }, [tempQCChecks]);

  const handleDeleteTempItem = (itemId) => {
    setTempQCChecks((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleSaveConfiguration = async () => {
    console.log("=== SAVE QC CHECK STARTED ===");

    const selectedItems = tempQCChecks.filter((item) => item.isSelected);
    console.log("Selected items:", selectedItems);

    if (selectedItems.length === 0) {
      alert("Please select at least one item to save!");
      return;
    }

    try {
      const currentUser = getCurrentUser();
      console.log("Current user:", currentUser);

      // Save each selected item
      for (const item of selectedItems) {
        const qcCheckData = {
          part_code: item.part_code,
          part_name: item.part_name,
          vendor_name: item.vendor_name,
          vendor_id: item.vendor_id,
          vendor_type: item.vendor_type,
          production_date: item.production_date,
          approved_by: currentUser,
          data_from: "Create", // Data dari AddQCCheckPage = "Create"
        };

        console.log("Sending data to API:", qcCheckData);

        const response = await fetch(`${API_BASE}/api/qc-checks`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(qcCheckData),
        });

        console.log("Response status:", response.status);

        const result = await response.json();
        console.log("API Response:", result);

        if (!response.ok) {
          throw new Error(
            result.message || `HTTP error! status: ${response.status}`
          );
        }
      }

      alert(`${selectedItems.length} QC Check(s) saved successfully!`);

      // Hapus items yang berhasil disimpan
      setTempQCChecks((prev) =>
        prev.filter((item) => !selectedItems.find((s) => s.id === item.id))
      );

      // Navigate ke QCCheckPage dengan tab Complete
      navigate("/qc-part");
    } catch (error) {
      console.error("Save error:", error);
      alert(`Failed to save QC Check: ${error.message}`);
    }
  };

  const formatDateForDisplay = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "-";
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${day}/${month}/${year} ${hours}.${minutes}`;
    } catch {
      return "-";
    }
  };

  const formatProductionDate = (dateString) => {
    try {
      if (!dateString) return "-";
      const [year, month, day] = dateString.split("-");
      return `${day}/${month}/${year}`;
    } catch {
      return dateString || "-";
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
      fontWeight: "600",
      marginBottom: "5px",
      color: "#4b5563",
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
    actionButtonsGroup: {
      display: "flex",
      gap: "8px",
      marginTop: "30px",
    },
    saveConfiguration: {
      display: "flex",
      gap: "8px",
      marginTop: "-5px",
      marginLeft: "12px",
    },
    formGroupPartCode: {
      padding: "5px 0px 0px 0px",
      margin: 0,
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
      backgroundColor: "#e5e7eb",
      borderRadius: "6px",
      fontSize: "12px",
      outline: "none",
      fontFamily: "inherit",
      fontWeight: "450",
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
      textAlign: "center",
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
    paginationBar: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: "#e0e7ff",
      padding: "8px 16px",
      border: "1.5px solid #9fa8da",
      borderTop: "none",
      borderRadius: "0 0 8px 8px",
    },
    paginationControls: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "12px",
      color: "#374151",
    },
    paginationButton: {
      padding: "4px 8px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      backgroundColor: "white",
      cursor: "pointer",
      fontSize: "12px",
      fontFamily: "inherit",
    },
    paginationInput: {
      width: "30px",
      height: "24px",
      textAlign: "center",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      fontSize: "12px",
      fontFamily: "inherit",
    },
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.welcomeCard}>
        <div style={styles.gridContainer}>
          <div style={styles.card}>
            <div style={{ marginBottom: "24px" }}>
              <h2 style={styles.h2}>Add Quality Part Check</h2>
            </div>
            <div
              style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}
            >
              <div style={{ flex: "1", display: "grid", gap: "25px" }}>
                <div style={styles.formGroupPartCode}>
                  <label style={styles.label}>Part Code</label>
                  <div style={styles.inputContainer}>
                    <input
                      type="text"
                      style={styles.inputPartCode}
                      placeholder="Enter part code"
                      value={formData.part_code}
                      onChange={(e) =>
                        handleInputChange("part_code", e.target.value)
                      }
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleSearchPartCode();
                        }
                      }}
                    />
                    <button
                      type="button"
                      style={styles.addPartButton}
                      title="Search"
                      onClick={handleSearchPartCode}
                      disabled={searchLoading}
                    >
                      <Search size={12} />
                      {searchLoading ? "..." : "Search"}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={styles.label}>Part Name</label>
                  <input
                    type="text"
                    style={styles.inputReadOnly}
                    value={formData.part_name}
                    readOnly
                    placeholder="Auto-filled from search"
                  />
                </div>

                <div>
                  <label style={styles.label}>Vendor Name</label>
                  <input
                    type="text"
                    style={styles.inputReadOnly}
                    value={formData.vendor_name}
                    readOnly
                    placeholder="Auto-filled from search"
                  />

                  <div style={styles.actionButtonsGroup}>
                    <button
                      style={{ ...styles.button, ...styles.primaryButton }}
                      onClick={handleInsertToTemp}
                    >
                      <Plus size={16} />
                      Insert
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ flex: "2", display: "grid", gap: "30px" }}>
                <div>
                  <label style={styles.label}>Production Date</label>
                  <input
                    type="date"
                    style={styles.inputPartCode}
                    value={formData.production_date}
                    onChange={(e) =>
                      handleInputChange("production_date", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label style={styles.label}>Approved By</label>
                  <input
                    type="text"
                    style={styles.inputReadOnly}
                    value={currentEmpName}
                    readOnly
                    placeholder="User not logged in"
                  />
                </div>
              </div>
            </div>
          </div>

          <h2 style={styles.h2}>QC Check List</h2>
          <div style={styles.tableContainer}>
            <div style={styles.tableBodyWrapper}>
              <table
                style={{
                  ...styles.table,
                  minWidth: "950px",
                  tableLayout: "fixed",
                }}
              >
                <colgroup>
                  <col style={{ width: "3%" }} />
                  <col style={{ width: "3%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "6%" }} />
                </colgroup>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.expandedTh}>No</th>
                    <th style={styles.thWithLeftBorder}>
                      {tempQCChecks.length > 1 && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "4px",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectAll}
                            onChange={handleSelectAllChange}
                            style={{
                              cursor: "pointer",
                              width: "12px",
                              height: "12px",
                            }}
                          />
                        </div>
                      )}
                    </th>
                    <th style={styles.thWithLeftBorder}>Production Date</th>
                    <th style={styles.thWithLeftBorder}>Part Code</th>
                    <th style={styles.thWithLeftBorder}>Part Name</th>
                    <th style={styles.thWithLeftBorder}>Vendor Name</th>
                    <th style={styles.thWithLeftBorder}>Type</th>
                    <th style={styles.thWithLeftBorder}>Approved By</th>
                    <th style={styles.thWithLeftBorder}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tempQCChecks.length === 0 ? (
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
                        No data - Please insert QC check items
                      </td>
                    </tr>
                  ) : (
                    tempQCChecks.map((item, index) => (
                      <tr
                        key={item.id}
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
                          {index + 1}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          <input
                            type="checkbox"
                            checked={item.isSelected}
                            onChange={() => handleCheckboxChange(item.id)}
                            style={{
                              margin: "0 auto",
                              display: "block",
                              cursor: "pointer",
                              width: "12px",
                              height: "12px",
                            }}
                          />
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {formatProductionDate(item.production_date)}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {item.part_code}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {item.part_name}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {item.vendor_name || "-"}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {item.vendor_type || "-"}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {item.approved_by} |{" "}
                          {formatDateForDisplay(item.approved_at)}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          <button
                            style={styles.deleteButton}
                            onClick={() => handleDeleteTempItem(item.id)}
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

          {showSaveButton && (
            <div style={styles.saveConfiguration}>
              <button
                style={{ ...styles.button, ...styles.primaryButton }}
                onClick={handleSaveConfiguration}
              >
                <Save size={16} />
                Save Configuration
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddQCCheckPage;
