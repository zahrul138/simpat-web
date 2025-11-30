"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Save } from "lucide-react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const getAuthUserLocal = () => {
  try {
    return JSON.parse(localStorage.getItem("auth_user") || "null");
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

const AddVendorPage = () => {
  const navigate = useNavigate();
  const [selectedModel, setSelectedModel] = useState("Veronicas");
  const [selectAll, setSelectAll] = useState(false);

  const [vendorFormData, setVendorFormData] = useState({
    vendor_name: "",
    vendor_desc: "",
    vendor_type_id: 1,
    types: "Local",
    vendor_country: "Indonesia",
    vendor_city: "Batam",
  });

  const [tempVendors, setTempVendors] = useState([]);
  const [currentEmpName, setCurrentEmpName] = useState("");
  const [showSaveButton, setShowSaveButton] = useState(false);

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
    setShowSaveButton(tempVendors.length > 0);
  }, [tempVendors]);

  const handleVendorInputChange = (field, value) => {
    setVendorFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleTypeChange = (type) => {
    const typeId = type === "Local" ? 1 : 2;
    const typesValue = type === "Local" ? "Local" : "Oversea";

    setVendorFormData((prev) => ({
      ...prev,
      vendor_type_id: typeId,
      types: typesValue,
      vendor_country: type === "Local" ? "Indonesia" : "",
      vendor_city: type === "Local" ? "Batam" : "",
    }));

    setSelectedModel(type === "Local" ? "Veronicas" : "Heracles");
  };

  const handleInsertToTemp = () => {
    if (!vendorFormData.vendor_name.trim()) {
      alert("Please fill in Vendor Name");
      return;
    }

    if (!vendorFormData.vendor_desc.trim()) {
      alert("Please fill in Description");
      return;
    }

    if (vendorFormData.vendor_type_id === 2) {
      if (!vendorFormData.vendor_country.trim()) {
        alert("Please fill in Country for Oversea vendor");
        return;
      }
      // Validasi city opsional untuk oversea
      if (!vendorFormData.vendor_city.trim()) {
        const proceed = window.confirm(
          "City field is empty for Oversea vendor. Do you want to continue without city?"
        );
        if (!proceed) return;
      }
    }

    const tempVendor = {
      id: Date.now(),
      vendor_name: vendorFormData.vendor_name.trim(),
      vendor_desc: vendorFormData.vendor_desc.trim(),
      vendor_type_id: vendorFormData.vendor_type_id,
      types: vendorFormData.types,
      vendor_country:
        vendorFormData.vendor_type_id === 1
          ? "Indonesia"
          : vendorFormData.vendor_country.trim(),
      vendor_city:
        vendorFormData.vendor_type_id === 1
          ? "Batam"
          : vendorFormData.vendor_city.trim(),
      is_active: true,
      created_at: new Date().toISOString(),
      isSelected: false,
    };

    setTempVendors((prev) => [...prev, tempVendor]);

    setVendorFormData({
      vendor_name: "",
      vendor_desc: "",
      vendor_type_id: 1,
      types: "Local",
      vendor_country: "Indonesia",
      vendor_city: "Batam",
    });

    setSelectedModel("Veronicas");
  };

  const handleSelectAllChange = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setTempVendors((prev) =>
      prev.map((vendor) => ({
        ...vendor,
        isSelected: newSelectAll,
      }))
    );
  };

  const handleCheckboxChange = (vendorId) => {
    setTempVendors((prev) =>
      prev.map((vendor) =>
        vendor.id === vendorId
          ? { ...vendor, isSelected: !vendor.isSelected }
          : vendor
      )
    );
  };

  useEffect(() => {
    if (tempVendors.length > 0) {
      const allSelected = tempVendors.every((vendor) => vendor.isSelected);
      setSelectAll(allSelected);
    } else {
      setSelectAll(false);
    }
  }, [tempVendors]);

  const handleDeleteTempVendor = (vendorId) => {
    setTempVendors((prev) => prev.filter((vendor) => vendor.id !== vendorId));
  };

  const handleSaveConfiguration = async () => {
  console.log("=== SAVE CONFIGURATION STARTED ===");
  
  const selectedVendors = tempVendors.filter((vendor) => vendor.isSelected);
  console.log("Selected vendors:", selectedVendors);

  if (selectedVendors.length === 0) {
    alert("Please select at least one vendor to save!");
    return;
  }

  try {
    const currentUser = getCurrentUser();
    console.log("Current user:", currentUser);

    const vendor = selectedVendors[0];
    
    const vendorData = {
      vendor_name: vendor.vendor_name,
      vendor_desc: vendor.vendor_desc,
      vendor_type_id: vendor.vendor_type_id,
      types: vendor.types,
      vendor_country: vendor.vendor_country,
      vendor_city: vendor.vendor_city,
      is_active: true,
      created_by: currentUser,
    };

    console.log("Sending data to API:", vendorData);

    const response = await fetch(`${API_BASE}/api/vendors`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(vendorData),
    });

    console.log("Response status:", response.status);
    console.log("Response ok:", response.ok);

    const result = await response.json();
    console.log("API Response:", result);

    if (!response.ok) {
      throw new Error(result.message || `HTTP error! status: ${response.status}`);
    }

    if (result.success) {
      alert(`Vendor "${vendor.vendor_name}" saved successfully!`);
      // Hapus vendor yang berhasil disimpan
      setTempVendors((prev) => prev.filter((v) => v.id !== vendor.id));
      navigate("/vendor-details");
    } else {
      throw new Error(result.message || "Failed to save vendor");
    }

  } catch (error) {
    console.error("Save error:", error);
    alert(`Failed to save vendor: ${error.message}`);
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
    dateDisplay: {
      display: "flex",
      height: "1rem",
      width: "8.5rem",
      borderRadius: "6px",
      border: "1px solid #d1d5db",
      backgroundColor: "#f3f4f6",
      padding: "8px 12px",
      fontSize: "12px",
      alignItems: "center",
      color: "#374151",
      fontFamily: "inherit",
      margin: 0,
      marginBottom: "65px",
    },
    tripDisplay: {
      display: "flex",
      height: "1rem",
      width: "8.5rem",
      borderRadius: "6px",
      border: "1px solid #d1d5db",
      backgroundColor: "#f3f4f6",
      padding: "8px 12px",
      fontSize: "12px",
      alignItems: "center",
      color: "#374151",
      fontFamily: "inherit",
      margin: 0,
    },
    timeDisplay: {
      display: "flex",
      height: "1rem",
      width: "8.5rem",
      borderRadius: "6px",
      border: "1px solid #d1d5db",
      backgroundColor: "#f3f4f6",
      padding: "8px 12px",
      fontSize: "12px",
      alignItems: "center",
      color: "#374151",
      fontFamily: "inherit",
      margin: 0,
      marginBottom: "68px",
      marginTop: "px",
    },
    select: {
      display: "flex",
      height: "2rem",
      width: "10.1rem",
      borderRadius: "6px",
      border: "1px solid #d1d5db",
      backgroundColor: "#f3f4f6",
      padding: "8px 12px",
      fontSize: "11px",
      outline: "none",
      boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
      cursor: "pointer",
      maxWidth: "100%",
    },
    formGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      minWidth: "200px",
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
      marginLeft: "49.8px",
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
      borderRadius: "4px",
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
      backgroundColor: "#2563eb",
      color: "white",
      padding: "8px 16px",
      border: "none",
      borderRadius: "4px",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
    },
    cancelButton: {
      backgroundColor: "#f3f4f6",
      color: "#374151",
      padding: "8px 16px",
      border: "none",
      borderRadius: "4px",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
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
    tableRowHover: {
      "&:hover": {
        backgroundColor: "#f3f4f6",
        cursor: "pointer",
      },
    },
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.welcomeCard}>
        <div style={styles.gridContainer}>
          <div style={styles.card}>
            <div style={{ marginBottom: "24px" }}>
              <h2 style={styles.h2}>Add Vendor</h2>
            </div>
            <div
              style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}
            >
              <div style={{ flex: "2", display: "grid", gap: "35px" }}>
                <div>
                  <label style={styles.label}>Vendor Name *</label>
                  <input
                    type="text"
                    style={styles.inputPartCode}
                    placeholder="Enter vendor name"
                    value={vendorFormData.vendor_name}
                    onChange={(e) =>
                      handleVendorInputChange("vendor_name", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label style={styles.label}>Description *</label>
                  <input
                    type="text"
                    style={styles.inputPartCode}
                    placeholder="Enter description"
                    value={vendorFormData.vendor_desc}
                    onChange={(e) =>
                      handleVendorInputChange("vendor_desc", e.target.value)
                    }
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

              <div style={{ flex: "2", display: "grid", gap: "35px" }}>
                <div>
                  <label style={styles.label}>Types *</label>
                  <select
                    style={styles.select}
                    value={selectedModel}
                    onChange={(e) =>
                      handleTypeChange(
                        e.target.value === "Veronicas" ? "Local" : "Oversea"
                      )
                    }
                  >
                    <option value="Veronicas">Local</option>
                    <option value="Heracles">Oversea</option>
                  </select>
                </div>

                <div>
                  <label style={styles.label}>Created By</label>
                  <input
                    type="text"
                    style={styles.inputPartCode}
                    value={currentEmpName}
                    readOnly
                    placeholder="User not logged in"
                  />
                </div>
              </div>

              <div style={{ flex: "2", display: "grid", gap: "35px" }}>
                {vendorFormData.vendor_type_id === 2 ? (
                  <>
                    <div>
                      <label style={styles.label}>Country *</label>
                      <input
                        type="text"
                        style={styles.inputPartCode}
                        placeholder="Enter country"
                        value={vendorFormData.vendor_country}
                        onChange={(e) =>
                          handleVendorInputChange(
                            "vendor_country",
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <div>
                      <label style={styles.label}>City</label>
                      <input
                        type="text"
                        style={styles.inputPartCode}
                        placeholder="Enter city (optional)"
                        value={vendorFormData.vendor_city}
                        onChange={(e) =>
                          handleVendorInputChange("vendor_city", e.target.value)
                        }
                      />
                    </div>
                  </>
                ) : (
                  // 🔥 TAMPILAN UNTUK LOCAL (READ-ONLY)
                  <>
                    <div>
                      <label style={styles.label}>Country</label>
                      <input
                        type="text"
                        style={{
                          ...styles.inputPartCode,
                          backgroundColor: "#f3f4f6",
                          color: "#6b7280",
                          cursor: "not-allowed",
                        }}
                        value="Indonesia"
                        readOnly
                      />
                    </div>

                    <div>
                      <label style={styles.label}>City</label>
                      <input
                        type="text"
                        style={{
                          ...styles.inputPartCode,
                          backgroundColor: "#f3f4f6",
                          color: "#6b7280",
                          cursor: "not-allowed",
                        }}
                        value="Batam"
                        readOnly
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <h2 style={styles.h2}>Vendor List</h2>
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
                  <col style={{ width: "26px" }} />
                  <col style={{ width: "2.5%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "23%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "25%" }} />
                  <col style={{ width: "6%" }} />
                </colgroup>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.expandedTh}>No</th>
                    <th style={styles.thWithLeftBorder}>
                      {tempVendors.length > 1 && (
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
                    <th style={styles.thWithLeftBorder}>Vendor Name</th>
                    <th style={styles.thWithLeftBorder}>Types</th>
                    <th style={styles.thWithLeftBorder}>Description</th>
                    <th style={styles.thWithLeftBorder}>Country</th>
                    <th style={styles.thWithLeftBorder}>City</th>
                    <th style={styles.thWithLeftBorder}>Created By</th>
                    <th style={styles.thWithLeftBorder}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tempVendors.length === 0 ? (
                    <tr>
                      <td
                        colSpan="9"
                        style={{
                          ...styles.tdWithLeftBorder,
                          textAlign: "center",
                          fontStyle: "italic",
                          color: "#6b7280",
                        }}
                      >
                        No vendor data available. Please use the form above to
                        add vendors.
                      </td>
                    </tr>
                  ) : (
                    tempVendors.map((vendor, index) => (
                      <tr
                        key={vendor.id}
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
                            checked={vendor.isSelected}
                            onChange={() => handleCheckboxChange(vendor.id)}
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
                          {vendor.vendor_name}
                        </td>
                        <td style={styles.tdWithLeftBorder}>{vendor.types}</td>
                        <td style={styles.tdWithLeftBorder}>
                          {vendor.vendor_desc}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {vendor.vendor_country || "-"}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {vendor.vendor_city || "-"}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {currentEmpName} |{" "}
                          {formatDateForDisplay(vendor.created_at)}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          <button
                            style={styles.deleteButton}
                            onClick={() => handleDeleteTempVendor(vendor.id)}
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

export default AddVendorPage;
