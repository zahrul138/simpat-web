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

const AddVendorPartPlacementPage = () => {
  const navigate = useNavigate();
  const [selectAll, setSelectAll] = useState(false);

  const [placementFormData, setPlacementFormData] = useState({
    placement_name: "",
    length_cm: "",
    width_cm: "",
    height_cm: "",
    placement_type: "Rack",
  });

  const [tempPlacements, setTempPlacements] = useState([]);
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
    setShowSaveButton(tempPlacements.length > 0);
  }, [tempPlacements]);

  // Fungsi untuk validasi input decimal
  const validateDecimalInput = (value) => {
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      const parts = value.split('.');
      if (parts[0].length <= 3 && (!parts[1] || parts[1].length <= 2)) {
        return true;
      }
    }
    return false;
  };

  // Fungsi helper untuk formatting
  const formatDecimalOnBlur = (value) => {
    if (!value) return "0.00";
    
    let formatted = value;
    
    // Kasus khusus: "03" → "0.3"
    if (/^0[1-9]$/.test(formatted)) {
      formatted = "0." + formatted.charAt(1);
    }
    
    // Kasus: "3" → "3.00"
    if (formatted && !formatted.includes('.')) {
      formatted = formatted + '.00';
    }
    
    // Kasus: "." → "0.00"
    if (formatted === '.') {
      formatted = '0.00';
    }
    
    // Format ke 2 decimal places
    if (formatted.includes('.')) {
      const parts = formatted.split('.');
      if (parts[1].length === 1) {
        formatted = parts[0] + '.' + parts[1] + '0';
      } else if (parts[1].length > 2) {
        formatted = parts[0] + '.' + parts[1].substring(0, 2);
      }
    }
    
    return formatted;
  };

  // Handler untuk input change
  const handlePlacementInputChange = (field, value) => {
    setPlacementFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handler untuk insert ke temporary list - TANPA VALIDASI DESCRIPTION
  const handleInsertToTemp = () => {
    // Validasi required fields
    if (!placementFormData.placement_name.trim()) {
      alert("Please fill in Placement Name");
      return;
    }

    // Validasi dimensions
    const requiredDimensions = ['length_cm', 'width_cm', 'height_cm'];
    for (const dimension of requiredDimensions) {
      const value = placementFormData[dimension];
      if (!value || isNaN(parseFloat(value)) || parseFloat(value) <= 0) {
        alert(`Please enter valid ${dimension.replace('_cm', '')} (greater than 0)`);
        return;
      }
    }

    // Check for duplicate placement name in temp list
    const isDuplicate = tempPlacements.some(
      (placement) => 
        placement.placement_name.toLowerCase() === 
        placementFormData.placement_name.trim().toLowerCase()
    );

    if (isDuplicate) {
      alert("Placement name already exists in the list");
      return;
    }

    // Format dimensions to 2 decimal places
    const formattedLength = formatDecimalOnBlur(placementFormData.length_cm);
    const formattedWidth = formatDecimalOnBlur(placementFormData.width_cm);
    const formattedHeight = formatDecimalOnBlur(placementFormData.height_cm);

    // Calculate volume
    const volume = (
      parseFloat(formattedLength) * 
      parseFloat(formattedWidth) * 
      parseFloat(formattedHeight)
    ).toFixed(2);

    const tempPlacement = {
      id: Date.now(),
      placement_name: placementFormData.placement_name.trim(),
      length_cm: formattedLength,
      width_cm: formattedWidth,
      height_cm: formattedHeight,
      volume_cm3: volume,
      placement_type: placementFormData.placement_type,
      is_active: true,
      created_at: new Date().toISOString(),
      isSelected: false,
    };

    setTempPlacements((prev) => [...prev, tempPlacement]);

    // Reset form
    setPlacementFormData({
      placement_name: "",
      length_cm: "",
      width_cm: "",
      height_cm: "",
      placement_type: "Rack",
    });
  };

  // Handler untuk select all checkbox
  const handleSelectAllChange = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setTempPlacements((prev) =>
      prev.map((placement) => ({
        ...placement,
        isSelected: newSelectAll,
      }))
    );
  };

  // Handler untuk individual checkbox
  const handleCheckboxChange = (placementId) => {
    setTempPlacements((prev) =>
      prev.map((placement) =>
        placement.id === placementId
          ? { ...placement, isSelected: !placement.isSelected }
          : placement
      )
    );
  };

  useEffect(() => {
    if (tempPlacements.length > 0) {
      const allSelected = tempPlacements.every((placement) => placement.isSelected);
      setSelectAll(allSelected);
    } else {
      setSelectAll(false);
    }
  }, [tempPlacements]);

  // Handler untuk delete dari temporary list
  const handleDeleteTempPlacement = (placementId) => {
    setTempPlacements((prev) => 
      prev.filter((placement) => placement.id !== placementId)
    );
  };

  // Handler untuk save ke database
  const handleSaveConfiguration = async () => {
    console.log("=== SAVE CONFIGURATION STARTED ===");

    const selectedPlacements = tempPlacements.filter((placement) => placement.isSelected);
    console.log("Selected placements:", selectedPlacements);

    if (selectedPlacements.length === 0) {
      alert("Please select at least one placement to save!");
      return;
    }

    try {
      const currentUser = getCurrentUser();
      console.log("Current user:", currentUser);

      // Save placements one by one
      const savePromises = selectedPlacements.map(async (placement) => {
        const placementData = {
          placement_name: placement.placement_name,
          length_cm: placement.length_cm,
          width_cm: placement.width_cm,
          height_cm: placement.height_cm,
          placement_type: placement.placement_type,
          is_active: true,
          created_by: currentUser,
        };

        console.log("Sending data to API:", placementData);

        const response = await fetch(`${API_BASE}/api/vendor-placements`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(placementData),
        });

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(
            result.message || `HTTP error! status: ${response.status}`
          );
        }

        return {
          id: placement.id,
          success: true,
          data: result.data,
        };
      });

      const results = await Promise.allSettled(savePromises);
      
      // Check results
      const successfulSaves = results.filter(r => r.status === 'fulfilled' && r.value.success);
      const failedSaves = results.filter(r => r.status === 'rejected');
      
      if (failedSaves.length > 0) {
        console.error("Some saves failed:", failedSaves);
        
        if (successfulSaves.length === 0) {
          // All failed
          alert("Failed to save placements. Please try again.");
          return;
        } else {
          // Some succeeded, some failed
          const confirmContinue = window.confirm(
            `${successfulSaves.length} placements saved successfully, ` +
            `${failedSaves.length} failed. Do you want to continue?`
          );
          
          if (!confirmContinue) return;
        }
      }

      // Remove successfully saved placements from temp list
      const savedIds = successfulSaves.map(r => r.value.id);
      setTempPlacements((prev) => 
        prev.filter((placement) => !savedIds.includes(placement.id))
      );

      // Show success message
      if (successfulSaves.length > 0) {
        alert(`Data successfully saved.`);
      }
      
      // Navigate if all saved
      if (tempPlacements.length === successfulSaves.length) {
        navigate("/vendor-placement");
      }
      
    } catch (error) {
      console.error("Save error:", error);
      alert(`Failed to save placements: ${error.message}`);
    }
  };

  // Format date for display
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
    cmFix: {
      position: "absolute",
      right: "35px",
      top: "50%",
      transform: "translateY(-50%)",
      color: "#6b7280",
      fontSize: "11px",
      pointerEvents: "none",
      fontWeight: 500,
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
      width: "calc(100% - 30px)",
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
              <h2 style={styles.h2}>Add Vendor Placement</h2>
            </div>
            <div
              style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}
            >
              <div style={{ flex: "2", display: "grid", gap: "35px" }}>
                <div>
                  <label style={styles.label}>Placement Name</label>
                  <input
                    type="text"
                    style={styles.inputPartCode}
                    placeholder="Enter placement name"
                    value={placementFormData.placement_name}
                    onChange={(e) =>
                      handlePlacementInputChange("placement_name", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label style={styles.label}>Length</label>
                  <div
                    style={{ position: "relative", display: "inline-block" }}
                  >
                    <input
                      type="text"
                      inputMode="decimal"
                      style={styles.inputPartCode}
                      placeholder="0.00"
                      value={placementFormData.length_cm || ""}
                      onChange={(e) => {
                        if (validateDecimalInput(e.target.value)) {
                          handlePlacementInputChange("length_cm", e.target.value);
                        }
                      }}
                      onBlur={(e) => {
                        const formatted = formatDecimalOnBlur(e.target.value);
                        handlePlacementInputChange("length_cm", formatted);
                      }}
                    />
                    <span style={styles.cmFix}>cm</span>
                  </div>

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
                  <label style={styles.label}>Width</label>
                  <div
                    style={{ position: "relative", display: "inline-block" }}
                  >
                    <input
                      type="text"
                      inputMode="decimal"
                      style={styles.inputPartCode}
                      placeholder="0.00"
                      value={placementFormData.width_cm || ""}
                      onChange={(e) => {
                        if (validateDecimalInput(e.target.value)) {
                          handlePlacementInputChange("width_cm", e.target.value);
                        }
                      }}
                      onBlur={(e) => {
                        const formatted = formatDecimalOnBlur(e.target.value);
                        handlePlacementInputChange("width_cm", formatted);
                      }}
                    />
                    <span style={styles.cmFix}>cm</span>
                  </div>
                </div>
                <div>
                  <label style={styles.label}>Height</label>
                  <div
                    style={{ position: "relative", display: "inline-block" }}
                  >
                    <input
                      type="text"
                      inputMode="decimal"
                      style={styles.inputPartCode}
                      placeholder="0.00"
                      value={placementFormData.height_cm || ""}
                      onChange={(e) => {
                        if (validateDecimalInput(e.target.value)) {
                          handlePlacementInputChange("height_cm", e.target.value);
                        }
                      }}
                      onBlur={(e) => {
                        const formatted = formatDecimalOnBlur(e.target.value);
                        handlePlacementInputChange("height_cm", formatted);
                      }}
                    />
                    <span style={styles.cmFix}>cm</span>
                  </div>
                </div>
              </div>

              <div style={{ flex: "2", display: "grid", gap: "35px" }}>
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
            </div>
          </div>
          <h2 style={styles.h2}>Placement List</h2>
          <div style={styles.tableContainer}>
            <div style={styles.tableBodyWrapper}>
              <table
                style={{
                  ...styles.table,
                  minWidth: "300px",
                  tableLayout: "fixed",
                }}
              >
                <colgroup>
                  <col style={{ width: "25px" }} />
                  <col style={{ width: "2.5%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "25%" }} />
                  <col style={{ width: "6%" }} />
                </colgroup>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.expandedTh}>No</th>
                    <th style={styles.thWithLeftBorder}>
                      {tempPlacements.length > 1 && (
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
                    <th style={styles.thWithLeftBorder}>Placement Name</th>
                    <th style={styles.thWithLeftBorder}>Length (cm)</th>
                    <th style={styles.thWithLeftBorder}>Width (cm)</th>
                    <th style={styles.thWithLeftBorder}>Height (cm)</th>
                    <th style={styles.thWithLeftBorder}>Created By</th>
                    <th style={styles.thWithLeftBorder}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tempPlacements.length === 0 ? (
                    <tr>
                     
                    </tr>
                  ) : (
                    tempPlacements.map((placement, index) => (
                      <tr
                        key={placement.id}
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
                            ...styles.tdWithLeftBorder,
                            ...styles.emptyColumn,
                          }}
                        >
                          {index + 1}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          <input
                            type="checkbox"
                            checked={placement.isSelected}
                            onChange={() => handleCheckboxChange(placement.id)}
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
                          {placement.placement_name}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {placement.length_cm} cm
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {placement.width_cm} cm
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {placement.height_cm} cm
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {currentEmpName} |{" "}
                          {formatDateForDisplay(placement.created_at)}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          <button
                            style={styles.deleteButton}
                            onClick={() => handleDeleteTempPlacement(placement.id)}
                            title="Delete"
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

export default AddVendorPartPlacementPage;