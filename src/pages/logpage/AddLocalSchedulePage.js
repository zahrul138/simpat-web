"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdArrowRight, MdArrowDropDown } from "react-icons/md";
import { Plus, Trash2, Pencil, Save } from "lucide-react";

const AddLocalSchedulePage = () => {
  const navigate = useNavigate();
  const [selectedStockLevel, setSelectedStockLevel] = useState("M101");
  const [selectedModel, setSelectedModel] = useState("Veronicas");
  const [selectedAnnexUpdate, setSelectedAnnexUpdate] =
    useState("ZAHRUL ROMADHON");
  const [scheduleDate, setScheduleDate] = useState("");
  const [expandedRows, setExpandedRows] = useState({});
  const [expandedVendorRows, setExpandedVendorRows] = useState({});

  const [addVendorDetail, setAddVendorDetail] = useState(false);
  const [addVendorFormData, setAddVendorFormData] = useState({
    trip: "",
    vendor: "",
    doNumbers: [""],
    arrivalTime: "",
  });

  const [addVendorPartDetail, setAddVendorPartDetail] = useState(false);
  const [addVendorPartFormData, setAddVendorPartFormData] = useState({
    trip: "",
    vendor: "",
    doNumbers: [""],
    arrivalTime: "",
    parts: [], // Array of {doNumber, partCode, id}
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

  const openThirdLevelPopup = () => {
    setAddVendorDetail(true);
  };

  const openVendorPartDetailPopup = () => {
    setAddVendorPartDetail(true);
  };

  const handleAddVendorInputChange = (field, value) => {
    setAddVendorFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddVendorPartInputChange = (field, value) => {
    setAddVendorPartFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDoNumberChange = (index, value) => {
    const updatedDoNumbers = [...addVendorFormData.doNumbers];
    updatedDoNumbers[index] = value;
    setAddVendorFormData((prev) => ({
      ...prev,
      doNumbers: updatedDoNumbers,
    }));
  };

  const handleVendorPartDoNumberChange = (index, value) => {
    const updatedDoNumbers = [...addVendorPartFormData.doNumbers];
    updatedDoNumbers[index] = value;
    setAddVendorPartFormData((prev) => ({
      ...prev,
      doNumbers: updatedDoNumbers,
    }));
  };

  const addDoNumberField = () => {
    setAddVendorFormData((prev) => ({
      ...prev,
      doNumbers: [...prev.doNumbers, ""],
    }));
  };

  const addVendorPartDoNumberField = () => {
    setAddVendorPartFormData((prev) => ({
      ...prev,
      doNumbers: [...prev.doNumbers, ""],
    }));
  };

  const removeDoNumberField = (index) => {
    if (addVendorFormData.doNumbers.length > 1) {
      const updatedDoNumbers = addVendorFormData.doNumbers.filter(
        (_, i) => i !== index
      );
      setAddVendorFormData((prev) => ({
        ...prev,
        doNumbers: updatedDoNumbers,
      }));
    }
  };

  const removeVendorPartDoNumberField = (index) => {
    if (addVendorPartFormData.doNumbers.length > 1) {
      const updatedDoNumbers = addVendorPartFormData.doNumbers.filter(
        (_, i) => i !== index
      );
      setAddVendorPartFormData((prev) => ({
        ...prev,
        doNumbers: updatedDoNumbers,
      }));
    }
  };

  const handleAddVendorSubmit = (e) => {
    e.preventDefault();
    console.log("Vendor Detail Added:", addVendorFormData);
    setAddVendorDetail(false);
    setAddVendorFormData({
      trip: "",
      vendor: "",
      doNumbers: [""],
      arrivalTime: "",
    });
  };

  const handleAddVendorPartSubmit = (e) => {
    e.preventDefault();
    console.log("Vendor Part Detail Added:", addVendorPartFormData);
    setAddVendorPartDetail(false);
    setAddVendorPartFormData({
      trip: "",
      vendor: "",
      doNumbers: [""],
      arrivalTime: "",
    });
  };

  const handleAddPart = (partCode) => {
    if (!partCode.trim()) return;
    const availableDoNumbers = addVendorFormData.doNumbers.filter((doNum) =>
      doNum.trim()
    );
    if (availableDoNumbers.length === 0) {
      alert("Please add DO Numbers in Vendor Details first");
      return;
    }
    const newPart = {
      id: Date.now(),
      doNumber: availableDoNumbers[0],
      partCode: partCode.trim(),
    };
    setAddVendorPartFormData((prev) => ({
      ...prev,
      parts: [...prev.parts, newPart],
    }));
  };

  const handleRemovePart = (partId) => {
    setAddVendorPartFormData((prev) => ({
      ...prev,
      parts: prev.parts.filter((part) => part.id !== partId),
    }));
  };

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
    input: {
      display: "flex",
      height: "1rem",
      width: "8.5rem",
      borderRadius: "6px",
      border: "1px solid #d1d5db",
      backgroundColor: "#ffffff",
      padding: "8px 12px",
      fontSize: "12px",
      outline: "none",
      boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
      fontFamily: "inherit",
      alignItems: "center",
      gap: "8px",
      maxWidth: "100%",
    },
    select: {
      display: "flex",
      height: "2rem",
      width: "10rem",
      borderRadius: "6px",
      border: "1px solid #d1d5db",
      backgroundColor: "#ffffff",
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
      borderRadius: "8px",
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

  const vendorDetailStyles = {
    popupOverlay: {
      position: "fixed",
      top: 100,
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
      borderRadius: "8px",
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
      fontSize: "20px",
      cursor: "pointer",
      color: "#6b7280",
    },
    form: {
      marginTop: "16px",
    },
    formGroup: {
      marginBottom: "16px",
    },
    label: {
      display: "block",
      marginBottom: "4px",
      fontWeight: "500",
    },
    select: {
      width: "100%",
      padding: "8px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
    },
    input: {
      flex: 1,
      padding: "8px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
    },
    doNumberContainer: {
      display: "flex",
      gap: "8px",
      marginBottom: "8px",
    },
    removeButton: {
      padding: "8px",
      border: "1px solid #ef4444",
      borderRadius: "4px",
      background: "#fef2f2",
      color: "#ef4444",
      cursor: "pointer",
    },
    addButton: {
      padding: "6px 12px",
      border: "1px solid #3b82f6",
      borderRadius: "4px",
      background: "#eff6ff",
      color: "#3b82f6",
      cursor: "pointer",
      fontSize: "12px",
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    timeInput: {
      width: "100%",
      padding: "8px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
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
      cursor: "pointer",
    },
    submitButton: {
      padding: "8px 16px",
      border: "none",
      borderRadius: "4px",
      background: "#3b82f6",
      color: "white",
      cursor: "pointer",
    },
  };

  const vendorPartStyles = {
    popupOverlay: {
      position: "fixed",
      top: 50,
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
      padding: "24px",
      borderRadius: "8px",
      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
      width: "90%",
      maxWidth: "800px",
      maxHeight: "90vh",
      overflowY: "auto",
    },
    popupHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "16px",
    },
    popupTitle: {
      margin: 0,
      fontSize: "18px",
      fontWeight: "600",
    },
    closeButton: {
      background: "none",
      border: "none",
      fontSize: "20px",
      cursor: "pointer",
      color: "#6b7280",
    },
    form: {
      marginTop: "16px",
    },
    formGroup: {
      marginBottom: "16px",
    },
    label: {
      display: "block",
      marginBottom: "4px",
      fontWeight: "500",
    },
    inputContainer: {
      display: "flex",
      gap: "8px",
      alignItems: "center",
    },
    input: {
      flex: "none",
      height: "1rem",
      width: "150px",
      padding: "8px 12px",
      border: "1px solid #d1d5db",
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
    partsList: {
      marginTop: "16px",
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
      backgroundColor: "#f9fafb",
    },
    partsListHeader: {
      padding: "12px 16px",
      borderBottom: "1px solid #e5e7eb",
      backgroundColor: "#f3f4f6",
      fontWeight: "600",
      fontSize: "14px",
    },
    partItem: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "12px 16px",
      borderBottom: "1px solid #e5e7eb",
    },
    partInfo: {
      display: "flex",
      gap: "16px",
      alignItems: "center",
    },
    partCode: {
      fontWeight: "500",
    },
    doNumber: {
      fontSize: "12px",
      color: "#6b7280",
      backgroundColor: "#e5e7eb",
      padding: "2px 8px",
      borderRadius: "12px",
    },
    removePartButton: {
      backgroundColor: "#ef4444",
      color: "white",
      border: "none",
      borderRadius: "4px",
      padding: "4px 8px",
      fontSize: "12px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    partDetailsSection: {
      marginBottom: "16px",
    },
    sectionTitle: {
      marginBottom: "8px",
      fontWeight: "500",
    },
    tableContainer: {
      marginLeft: "5px",
      backgroundColor: "white",
      borderRadius: "8px",
      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
      overflowX: "auto",
      width: "calc(100% - 5px)",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      tableLayout: "auto",
      minWidth: "1000px",
    },
    tableHeader: {
      backgroundColor: "#e0e7ff",
      color: "#374151",
      fontWeight: "600",
      fontSize: "12px",
      textAlign: "center",
    },
    tableBodyWrapper: {
      overflowX: "auto",
      border: "1.5px solid #9fa8da",
      borderBottom: "none",
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
      textOverflow: "ellipsis",
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
      textOverflow: "ellipsis",
    },
    tdNumber: {
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
    buttonGroup: {
      display: "flex",
      justifyContent: "flex-end",
      gap: "8px",
    },
    cancelButton: {
      padding: "8px 16px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      background: "white",
      cursor: "pointer",
    },
    submitButton: {
      padding: "8px 16px",
      border: "none",
      borderRadius: "4px",
      backgroundColor: "#2563eb",
      color: "white",
      cursor: "pointer",
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
      textAlign: "center",
      fontSize: "10px",
      fontFamily: "inherit",
    },
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.welcomeCard}>
        <div style={styles.gridContainer}>
          <div style={styles.card}>
            <div style={{ marginBottom: "24px" }}>
              <h2 style={styles.h2}>Stock Level Configuration</h2>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ flex: "1", display: "grid", gap: "35px" }}>
                <div>
                  <label htmlFor="stockLevel" style={styles.label}>
                    Stock Level
                  </label>
                  <select
                    id="stockLevel"
                    style={styles.select}
                    value={selectedStockLevel}
                    onChange={(e) => setSelectedStockLevel(e.target.value)}
                  >
                    <option value="M101 | SCN-MH">M101 | SCN-MH</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="model" style={styles.label}>
                    Model
                  </label>
                  <select
                    id="model"
                    style={styles.select}
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                  >
                    <option value="Veronicas">Veronicas</option>
                    <option value="Heracles">Heracles</option>
                  </select>
                  <div style={styles.actionButtonsGroup}>
                    <button
                      style={{ ...styles.button, ...styles.primaryButton }}
                    >
                      <Plus size={16} />
                      Insert
                    </button>
                  </div>
                </div>
              </div>
              <div style={{ flex: "2", display: "grid" }}>
                <div>
                  <label htmlFor="annexUpdate" style={styles.label}>
                    Upload By
                  </label>
                  <select
                    id="annexUpdate"
                    style={styles.select}
                    value={selectedAnnexUpdate}
                    onChange={(e) => setSelectedAnnexUpdate(e.target.value)}
                  >
                    <option value="ZAHRUL ROMADHON">ZAHRUL ROMADHON</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="scheduleDate" style={styles.label}>
                    Schedule Date
                  </label>
                  <input
                    id="scheduleDate"
                    type="date"
                    style={{ ...styles.input, marginBottom: "28px" }}
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
          <h2 style={styles.h2}>Schedule List</h2>
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
                  <col style={{ width: "25px" }} />
                  <col style={{ width: "2.5%" }} />
                  <col style={{ width: "25px" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "25%" }} />
                  <col style={{ width: "10%" }} />
                </colgroup>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.expandedTh}>No</th>
                    <th style={styles.thWithLeftBorder}></th>
                    <th style={styles.thWithLeftBorder}></th>
                    <th style={styles.thWithLeftBorder}>Schedule Date</th>
                    <th style={styles.thWithLeftBorder}>Stock Level</th>
                    <th style={styles.thWithLeftBorder}>Model</th>
                    <th style={styles.thWithLeftBorder}>Total Vendor</th>
                    <th style={styles.thWithLeftBorder}>Total Pallet</th>
                    <th style={styles.thWithLeftBorder}>Total Item</th>
                    <th style={styles.thWithLeftBorder}>Upload By</th>
                    <th style={styles.thWithLeftBorder}>Action</th>
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
                    <td style={styles.tdWithLeftBorder}>
                      <input
                        type="checkbox"
                        style={{
                          margin: "0 auto",
                          display: "block",
                          cursor: "pointer",
                          width: "12px",
                          height: "12px",
                        }}
                      />
                    </td>
                    <td
                      style={{
                        ...styles.tdWithLeftBorder,
                        ...styles.emptyColumn,
                      }}
                    >
                      <button
                        style={styles.arrowButton}
                        onClick={() => toggleRowExpansion(1)}
                      >
                        {expandedRows[1] ? (
                          <MdArrowDropDown style={styles.arrowIcon} />
                        ) : (
                          <MdArrowRight style={styles.arrowIcon} />
                        )}
                      </button>
                    </td>
                    <td style={styles.tdWithLeftBorder}>18/08/2025</td>
                    <td style={styles.tdWithLeftBorder}>M101 | SCN-MH</td>
                    <td style={styles.tdWithLeftBorder}>Veronicas</td>
                    <td style={styles.tdWithLeftBorder}>2</td>
                    <td style={styles.tdWithLeftBorder}>4</td>
                    <td style={styles.tdWithLeftBorder}>12</td>
                    <td style={styles.tdWithLeftBorder}>ZAHRUL ROMADHON</td>
                    <td style={styles.tdWithLeftBorder}>
                      <button
                        style={styles.addButton}
                        onClick={openThirdLevelPopup}
                      >
                        <Plus size={10} />
                      </button>
                      <button style={styles.deleteButton}>
                        <Trash2 size={10} />
                      </button>
                    </td>
                  </tr>
                  {expandedRows[1] && (
                    <tr>
                      <td colSpan="11" style={{ padding: 0, border: "none" }}>
                        <div style={styles.expandedTableContainer}>
                          <table style={styles.expandedTable}>
                            <colgroup>
                              <col style={{ width: "25px" }} />
                              <col style={{ width: "25px" }} />
                              <col style={{ width: "10%" }} />
                              <col style={{ width: "50%" }} />
                              <col style={{ width: "15%" }} />
                              <col style={{ width: "15%" }} />
                              <col style={{ width: "15%" }} />
                              <col style={{ width: "15%" }} />
                              <col style={{ width: "10%" }} />
                            </colgroup>
                            <thead>
                              <tr style={styles.expandedTableHeader}>
                                <th style={styles.expandedTh}>No</th>
                                <th style={styles.expandedTh}></th>
                                <th style={styles.expandedTh}>Trip</th>
                                <th style={styles.expandedTh}>Vendor Name</th>
                                <th style={styles.expandedTh}>DO Number</th>
                                <th style={styles.expandedTh}>Arrival Time</th>
                                <th style={styles.expandedTh}>Total Pallet</th>
                                <th style={styles.expandedTh}>Total Item</th>
                                <th style={styles.expandedTh}>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr
                                onMouseEnter={(e) =>
                                  (e.target.closest(
                                    "tr"
                                  ).style.backgroundColor = "#c7cde8")
                                }
                                onMouseLeave={(e) =>
                                  (e.target.closest(
                                    "tr"
                                  ).style.backgroundColor = "transparent")
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
                                  style={{
                                    ...styles.tdWithLeftBorder,
                                    ...styles.emptyColumn,
                                  }}
                                >
                                  <button
                                    style={styles.arrowButton}
                                    onClick={() =>
                                      toggleVendorRowExpansion("vendor_1_1")
                                    }
                                  >
                                    {expandedVendorRows["vendor_1_1"] ? (
                                      <MdArrowDropDown
                                        style={styles.arrowIcon}
                                      />
                                    ) : (
                                      <MdArrowRight style={styles.arrowIcon} />
                                    )}
                                  </button>
                                </td>
                                <td style={styles.expandedTd}>Trip-01</td>
                                <td style={styles.expandedTd}>
                                  188646 - PT. DAIHO INDONESIA
                                </td>
                                <td style={styles.expandedTd}>DO-001</td>
                                <td style={styles.expandedTd}>08:00</td>
                                <td style={styles.expandedTd}>2</td>
                                <td style={styles.expandedTd}>6</td>
                                <td style={styles.expandedTd}>
                                  <button style={styles.addButton}>
                                    <Plus
                                      size={10}
                                      onClick={openVendorPartDetailPopup}
                                    />
                                  </button>
                                  <button style={styles.deleteButton}>
                                    <Trash2 size={10} />
                                  </button>
                                </td>
                              </tr>
                              {expandedVendorRows["vendor_1_1"] && (
                                <tr>
                                  <td
                                    colSpan="9"
                                    style={{ padding: 0, border: "none" }}
                                  >
                                    <div
                                      style={styles.thirdLevelTableContainer}
                                    >
                                      <table style={styles.thirdLevelTable}>
                                        <colgroup>
                                          <col style={{ width: "1.5%" }} />
                                          <col style={{ width: "10%" }} />
                                          <col style={{ width: "20%" }} />
                                          <col style={{ width: "8%" }} />
                                          <col style={{ width: "8%" }} />
                                          <col style={{ width: "8%" }} />
                                          <col style={{ width: "5%" }} />
                                        </colgroup>
                                        <thead>
                                          <tr
                                            style={styles.thirdLevelTableHeader}
                                          >
                                            <th style={styles.expandedTh}>
                                              No
                                            </th>
                                            <th style={styles.thirdLevelTh}>
                                              Part Code
                                            </th>
                                            <th style={styles.thirdLevelTh}>
                                              Part Name
                                            </th>
                                            <th style={styles.thirdLevelTh}>
                                              Qty
                                            </th>
                                            <th style={styles.thirdLevelTh}>
                                              Qty Box
                                            </th>
                                            <th style={styles.thirdLevelTh}>
                                              Unit
                                            </th>
                                            <th style={styles.thirdLevelTh}>
                                              Action
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          <tr
                                            onMouseEnter={(e) =>
                                              (e.target.closest(
                                                "tr"
                                              ).style.backgroundColor =
                                                "#c7cde8")
                                            }
                                            onMouseLeave={(e) =>
                                              (e.target.closest(
                                                "tr"
                                              ).style.backgroundColor =
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
                                            <td style={styles.thirdLevelTd}>
                                              213345432
                                            </td>
                                            <td style={styles.thirdLevelTd}>
                                              Engine Part A
                                            </td>
                                            <td style={styles.thirdLevelTd}>
                                              50
                                            </td>
                                            <td style={styles.thirdLevelTd}>
                                              2
                                            </td>
                                            <td style={styles.thirdLevelTd}>
                                              PCS
                                            </td>
                                            <td style={styles.thirdLevelTd}>
                                               <button
                                                style={styles.deleteButton}
                                              >
                                                <Pencil size={10} />
                                              </button>
                                              <button
                                                style={styles.deleteButton}
                                              >
                                                <Trash2 size={10} />
                                              </button>
                                            </td>
                                          </tr>
                                          <tr
                                            onMouseEnter={(e) =>
                                              (e.target.closest(
                                                "tr"
                                              ).style.backgroundColor =
                                                "#c7cde8")
                                            }
                                            onMouseLeave={(e) =>
                                              (e.target.closest(
                                                "tr"
                                              ).style.backgroundColor =
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
                                              2
                                            </td>
                                            <td style={styles.thirdLevelTd}>
                                              214235654
                                            </td>
                                            <td style={styles.thirdLevelTd}>
                                              Engine Part B
                                            </td>
                                            <td style={styles.thirdLevelTd}>
                                              30
                                            </td>
                                            <td style={styles.thirdLevelTd}>
                                              5
                                            </td>
                                            <td style={styles.thirdLevelTd}>
                                              PCS
                                            </td>
                                            
                                            <td style={styles.thirdLevelTd}>
                                               <button
                                                style={styles.deleteButton}
                                              >
                                                <Pencil size={10} />
                                              </button>
                                              <button
                                                style={styles.deleteButton}
                                              >
                                                <Trash2 size={10} />
                                              </button>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              )}
                              <tr
                                onMouseEnter={(e) =>
                                  (e.target.closest(
                                    "tr"
                                  ).style.backgroundColor = "#c7cde8")
                                }
                                onMouseLeave={(e) =>
                                  (e.target.closest(
                                    "tr"
                                  ).style.backgroundColor = "transparent")
                                }
                              >
                                <td
                                  style={{
                                    ...styles.expandedTd,
                                    ...styles.expandedWithLeftBorder,
                                    ...styles.emptyColumn,
                                  }}
                                >
                                  2
                                </td>
                                <td
                                  style={{
                                    ...styles.tdWithLeftBorder,
                                    ...styles.emptyColumn,
                                  }}
                                >
                                  <button
                                    style={styles.arrowButton}
                                    onClick={() =>
                                      toggleVendorRowExpansion("vendor_1_2")
                                    }
                                  >
                                    {expandedVendorRows["vendor_1_2"] ? (
                                      <MdArrowDropDown
                                        style={styles.arrowIcon}
                                      />
                                    ) : (
                                      <MdArrowRight style={styles.arrowIcon} />
                                    )}
                                  </button>
                                </td>
                                <td style={styles.expandedTd}>Trip-02</td>
                                <td style={styles.expandedTd}>
                                  188651 - PT. SAT NUSAPERSADA TBK
                                </td>
                                <td style={styles.expandedTd}>DO-002</td>
                                <td style={styles.expandedTd}>10:00</td>
                                <td style={styles.expandedTd}>1</td>
                                <td style={styles.expandedTd}>3</td>
                                <td style={styles.expandedTd}>
                                  <button
                                    style={styles.addButton}
                                    onClick={openVendorPartDetailPopup}
                                  >
                                    <Plus size={10} />
                                  </button>
                                  <button style={styles.deleteButton}>
                                    <Trash2 size={10} />
                                  </button>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
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
                      2
                    </td>
                    <td style={styles.tdWithLeftBorder}>
                      <input
                        type="checkbox"
                        style={{
                          margin: "0 auto",
                          display: "block",
                          cursor: "pointer",
                          width: "12px",
                          height: "12px",
                        }}
                      />
                    </td>
                    <td
                      style={{
                        ...styles.tdWithLeftBorder,
                        ...styles.emptyColumn,
                      }}
                    >
                      <button
                        style={styles.arrowButton}
                        onClick={() => toggleRowExpansion(2)}
                      >
                        {expandedRows[2] ? (
                          <MdArrowDropDown style={styles.arrowIcon} />
                        ) : (
                          <MdArrowRight style={styles.arrowIcon} />
                        )}
                      </button>
                    </td>
                    <td style={styles.tdWithLeftBorder}>18/08/2025</td>
                    <td style={styles.tdWithLeftBorder}>M101 | SCN-MH</td>
                    <td style={styles.tdWithLeftBorder}>Veronicas</td>
                    <td style={styles.tdWithLeftBorder}>2</td>
                    <td style={styles.tdWithLeftBorder}>4</td>
                    <td style={styles.tdWithLeftBorder}>12</td>
                    <td style={styles.tdWithLeftBorder}>ZAHRUL ROMADHON</td>
                    <td style={styles.tdWithLeftBorder}>
                      <button
                        style={styles.addButton}
                        onClick={openThirdLevelPopup}
                      >
                        <Plus size={10} />
                      </button>
                      <button style={styles.deleteButton}>
                        <Trash2 size={10} />
                      </button>
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
          <div style={styles.saveConfiguration}>
            <button style={{ ...styles.button, ...styles.primaryButton }} onClick={() => navigate("/local-schedule")}>
              <Save size={16} />
              Input Schedule
            </button>
          </div>
        </div>
      </div>

      {addVendorDetail && (
        <div style={vendorDetailStyles.popupOverlay}>
          <div style={vendorDetailStyles.popupContainer}>
            <div style={vendorDetailStyles.popupHeader}>
              <h3 style={vendorDetailStyles.popupTitle}>Add Vendor Detail</h3>
              <button
                onClick={() => setAddVendorDetail(false)}
                style={vendorDetailStyles.closeButton}
              >
                ×
              </button>
            </div>
            <form
              onSubmit={handleAddVendorSubmit}
              style={vendorDetailStyles.form}
            >
              <div style={vendorDetailStyles.formGroup}>
                <label style={vendorDetailStyles.label}>Trip:</label>
                <select
                  value={addVendorFormData.trip}
                  onChange={(e) =>
                    handleAddVendorInputChange("trip", e.target.value)
                  }
                  style={vendorDetailStyles.select}
                  required
                >
                  <option value="">Select Trip</option>
                  <option value="Trip-01">Trip-01</option>
                  <option value="Trip-02">Trip-02</option>
                  <option value="Trip-03">Trip-03</option>
                  <option value="Trip-04">Trip-04</option>
                  <option value="Trip-05">Trip-05</option>
                  <option value="Trip-06">Trip-06</option>
                  <option value="Trip-07">Trip-07</option>
                  <option value="Trip-08">Trip-08</option>
                </select>
              </div>

              <div style={vendorDetailStyles.formGroup}>
                <label style={vendorDetailStyles.label}>Vendor:</label>
                <select
                  value={addVendorFormData.vendor}
                  onChange={(e) =>
                    handleAddVendorInputChange("vendor", e.target.value)
                  }
                  style={vendorDetailStyles.select}
                  required
                >
                  <option value="">Select Vendor</option>
                  <option value="188646 - PT. Daiho Indonesia">
                    188646 - PT. Daiho Indonesia
                  </option>
                  <option value="188651 - PT. SAT NUSAPERSADA TBK">
                    188651 - PT. SAT NUSAPERSADA TBK
                  </option>
                  <option value="199869 - PT. PRIMA LABELING">
                    199869 - PT. PRIMA LABELING
                  </option>
                </select>
              </div>

              <div style={vendorDetailStyles.formGroup}>
                <label style={vendorDetailStyles.label}>Do Number:</label>
                {addVendorFormData.doNumbers.map((doNumber, index) => (
                  <div key={index} style={vendorDetailStyles.doNumberContainer}>
                    <input
                      type="text"
                      value={doNumber}
                      onChange={(e) =>
                        handleDoNumberChange(index, e.target.value)
                      }
                      placeholder={`Do Number ${index + 1}`}
                      style={vendorDetailStyles.input}
                      required
                    />
                    {addVendorFormData.doNumbers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDoNumberField(index)}
                        style={vendorDetailStyles.removeButton}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addDoNumberField}
                  style={vendorDetailStyles.addButton}
                >
                  <Plus size={12} />
                  Add Do Number
                </button>
              </div>

              <div style={vendorDetailStyles.formGroup}>
                <label style={vendorDetailStyles.label}>Arrival Time:</label>
                <input
                  type="time"
                  value={addVendorFormData.arrivalTime}
                  onChange={(e) =>
                    handleAddVendorInputChange("arrivalTime", e.target.value)
                  }
                  style={vendorDetailStyles.timeInput}
                  required
                />
              </div>

              <div style={vendorDetailStyles.buttonGroup}>
                <button
                  type="button"
                  onClick={() => setAddVendorDetail(false)}
                  style={vendorDetailStyles.cancelButton}
                >
                  Cancel
                </button>
                <button type="submit" style={vendorDetailStyles.submitButton}>
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {addVendorPartDetail && (
        <div style={vendorPartStyles.popupOverlay}>
          <div style={vendorPartStyles.popupContainer}>
            <div style={vendorPartStyles.popupHeader}>
              <h3 style={vendorPartStyles.popupTitle}>
                Add Vendor Part Details
              </h3>
              <button
                onClick={() => setAddVendorPartDetail(false)}
                style={vendorPartStyles.closeButton}
              >
                ×
              </button>
            </div>
            <form
              onSubmit={handleAddVendorPartSubmit}
              style={vendorPartStyles.form}
            >
              <div style={vendorPartStyles.formGroup}>
                <label style={vendorPartStyles.label}>Part Code</label>
                <div style={vendorPartStyles.inputContainer}>
                  <input
                    type="text"
                    style={vendorPartStyles.input}
                    placeholder="Enter part code"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddPart(e.target.value);
                        e.target.value = "";
                      }
                    }}
                  />
                  <button
                    type="button"
                    style={vendorPartStyles.addPartButton}
                    onClick={(e) => {
                      const input =
                        e.target.parentElement.querySelector("input");
                      handleAddPart(input.value);
                      input.value = "";
                    }}
                  >
                    <Plus size={16} />
                    Add
                  </button>
                </div>
              </div>

              {addVendorPartFormData.parts.length > 0 && (
                <div style={vendorPartStyles.partsList}>
                  <div style={vendorPartStyles.partsListHeader}>
                    Added Parts ({addVendorPartFormData.parts.length})
                  </div>
                  {addVendorPartFormData.parts.map((part) => (
                    <div key={part.id} style={vendorPartStyles.partItem}>
                      <div style={vendorPartStyles.partInfo}>
                        <span style={vendorPartStyles.partCode}>
                          {part.partCode}
                        </span>
                        <span style={vendorPartStyles.doNumber}>
                          DO: {part.doNumber}
                        </span>
                      </div>
                      <button
                        type="button"
                        style={vendorPartStyles.removePartButton}
                        onClick={() => handleRemovePart(part.id)}
                      >
                        <Trash2 size={12} />
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={vendorPartStyles.partDetailsSection}>
                <h4 style={vendorPartStyles.sectionTitle}>Part List</h4>
                <div style={vendorPartStyles.tableContainer}>
                  <div style={vendorPartStyles.tableBodyWrapper}>
                    <table
                      style={{
                        ...styles.table,
                        minWidth: "900px",
                        tableLayout: "fixed",
                      }}
                    >
                      <colgroup>
                        <col style={{ width: "2.5%"}} />
                        <col style={{ width: "15%" }} />
                        <col style={{ width: "25%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "8%" }} />
                      </colgroup>
                      <thead>
                        <tr style={vendorPartStyles.tableHeader}>
                          <th  style={vendorPartStyles.th}>No</th>
                          <th style={vendorPartStyles.th}>Part Code</th>
                          <th style={vendorPartStyles.th}>Part Name</th>
                          <th style={vendorPartStyles.th}>Qty</th>
                          <th style={vendorPartStyles.th}>Qty Box</th>
                          <th style={vendorPartStyles.th}>Unit</th>
                          <th style={vendorPartStyles.th}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          onMouseEnter={(e) =>
                            (e.target.closest("tr").style.backgroundColor =
                              "#c7cde8")
                          }
                          onMouseLeave={(e) =>
                            (e.target.closest("tr").style.backgroundColor =
                              "transparent")
                          }
                        >
                          <td style={vendorPartStyles.tdNumber}>1</td>
                          <td style={vendorPartStyles.td}>213123432</td>
                          <td style={vendorPartStyles.td}>Sample Part A</td>
                          <td style={vendorPartStyles.td}>25</td>
                          <td style={vendorPartStyles.td}>1</td>
                          <td style={vendorPartStyles.td}>PCS</td>
                          <td style={vendorPartStyles.td}>
                            <button style={vendorPartStyles.deleteButton}>
                              <Pencil size={10} />
                            </button>
                            <button style={vendorPartStyles.deleteButton}>
                              <Trash2 size={10} />
                            </button>
                          </td>
                        </tr>
                        <tr
                          onMouseEnter={(e) =>
                            (e.target.closest("tr").style.backgroundColor =
                              "#c7cde8")
                          }
                          onMouseLeave={(e) =>
                            (e.target.closest("tr").style.backgroundColor =
                              "transparent")
                          }
                        >
                          <td style={vendorPartStyles.tdNumber}>2</td>
                          <td style={vendorPartStyles.td}>432123431</td>
                          <td style={vendorPartStyles.td}>Sample Part B</td>
                          <td style={vendorPartStyles.td}>15</td>
                          <td style={vendorPartStyles.td}>3</td>
                          <td style={vendorPartStyles.td}>PCS</td>
                          <td style={vendorPartStyles.td}>
                            <button style={vendorPartStyles.deleteButton}>
                              <Pencil size={10} />
                            </button>
                            <button style={vendorPartStyles.deleteButton}>
                              <Trash2 size={10} />
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div style={vendorPartStyles.paginationBar}>
                    <div style={vendorPartStyles.paginationControls}>
                      <button style={vendorPartStyles.paginationButton}>
                        {"<<"}
                      </button>
                      <button style={vendorPartStyles.paginationButton}>
                        {"<"}
                      </button>
                      <span>Page</span>
                      <input
                        type="text"
                        value="1"
                        style={vendorPartStyles.paginationInput}
                        readOnly
                      />
                      <span>of 1</span>
                      <button style={vendorPartStyles.paginationButton}>
                        {">"}
                      </button>
                      <button style={vendorPartStyles.paginationButton}>
                        {">>"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div style={vendorPartStyles.buttonGroup}>
                <button
                  type="button"
                  onClick={() => setAddVendorPartDetail(false)}
                  style={vendorPartStyles.cancelButton}
                >
                  Cancel
                </button>
                <button type="submit" style={vendorPartStyles.submitButton}>
                  Insert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddLocalSchedulePage;
