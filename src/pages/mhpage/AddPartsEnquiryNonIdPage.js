"use client";

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MdArrowRight, MdArrowDropDown } from "react-icons/md";
import { Plus, Trash2, Pencil, Save, Search, RefreshCw } from "lucide-react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const getAuthUserLocal = () => {
  try {
    return JSON.parse(sessionStorage.getItem("auth_user") || "null");
  } catch {
    return null;
  }
};

const AddPartsEnquiryNonIdPage = () => {
  // ==================== STATE MANAGEMENT ====================
  const navigate = useNavigate();
  const [selectedStockLevel, setSelectedStockLevel] = useState("M101");
  const [selectedModel, setSelectedModel] = useState("Veronicas");
  const [selectedAnnexUpdate, setSelectedAnnexUpdate] =
    useState("ZAHRUL ROMADHON");
  const [scheduleDate, setScheduleDate] = useState("");
  const [expandedRows, setExpandedRows] = useState({});

  const [searchPartCode, setSearchPartCode] = useState("");
  const [storageInventoryData, setStorageInventoryData] = useState([]);
  const [selectedStorageItems, setSelectedStorageItems] = useState(new Set());
  const [addedStorageIds, setAddedStorageIds] = useState(new Set());
  const [loadingStorage, setLoadingStorage] = useState(false);

  const [popupCurrentPage, setPopupCurrentPage] = useState(1);
  const popupItemsPerPage = 10;

  const [expandedVendorRows, setExpandedVendorRows] = useState({});
  const [remarks, setRemarks] = useState({});
  const [selectedMainTableItems, setSelectedMainTableItems] = useState(new Set());
  const [selectAllMainTable, setSelectAllMainTable] = useState(false);

  const [addVendorDetail, setAddVendorDetail] = useState(false);
  const [addVendorFormData, setAddVendorFormData] = useState({
    trip: "",
    vendor: "",
    doNumbers: [""],
    arrivalTime: "",
  });

  const [currentDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  const [addVendorPartDetail, setAddVendorPartDetail] = useState(false);
  const [addVendorPartFormData, setAddVendorPartFormData] = useState({
    trip: "",
    vendor: "",
    doNumbers: [""],
    arrivalTime: "",
    parts: [],
  });

  const [partData, setPartData] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(partData.length / itemsPerPage);

  // ==================== UTILITY FUNCTIONS ====================

  // Pagination Functions
  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return partData.slice(startIndex, endIndex);
  };

  // Fungsi untuk menangani perubahan halaman
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePopupPageChange = (newPage) => {
    if (newPage >= 1 && newPage <= popupTotalPages) {
      setPopupCurrentPage(newPage);
    }
  };

  const computeAddedStorageIds = () => {
    return new Set(partData.map(p => p.storage_inventory_id).filter(id => id));
  };

  // Expansion Functions
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

  // ==================== POPUP & FORM HANDLERS ====================

  const openThirdLevelPopup = () => {
    setAddVendorDetail(true);
  };

  // ==================== STORAGE INVENTORY HANDLERS ====================

  const openVendorPartDetailPopup = async () => {
    if (!searchPartCode.trim()) {
      alert("Please enter part code");
      return;
    }

    setLoadingStorage(true);
    setAddVendorPartDetail(true);

    try {
      const response = await fetch(
        `${API_BASE}/api/storage-inventory?part_code=${searchPartCode.trim()}&status_tab=M136 System`
      );
      const result = await response.json();
      if (result.success) {
        const sortedData = result.data.sort((a, b) => {
          const getSuffix = (label) => {
            const str = label || '';
            return parseInt(str.slice(-6)) || 0;
          };
          return getSuffix(a.label_id) - getSuffix(b.label_id);
        });
        setStorageInventoryData(sortedData);
        setPopupCurrentPage(1);
        setAddedStorageIds(computeAddedStorageIds());
      } else {
        alert("No data found");
        setStorageInventoryData([]);
        setAddedStorageIds(new Set());
      }
    } catch (error) {
      console.error("Error fetching storage inventory:", error);
      alert("Error fetching data");
      setStorageInventoryData([]);
      setAddedStorageIds(new Set());
    } finally {
      setLoadingStorage(false);
    }
  };

  const refreshStorageData = async () => {
    if (!searchPartCode.trim()) return;

    setLoadingStorage(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/storage-inventory?part_code=${searchPartCode.trim()}&status_tab=M136 System`
      );
      const result = await response.json();
      if (result.success) {
        const sortedData = result.data.sort((a, b) => {
          const getSuffix = (label) => {
            const str = label || '';
            return parseInt(str.slice(-6)) || 0;
          };
          return getSuffix(a.label_id) - getSuffix(b.label_id);
        });
        setStorageInventoryData(sortedData);
        setPopupCurrentPage(1);
        setAddedStorageIds(computeAddedStorageIds());
      } else {
        setStorageInventoryData([]);
        setAddedStorageIds(new Set());
      }
    } catch (error) {
      console.error("Error refreshing storage inventory:", error);
      alert("Error refreshing data");
    } finally {
      setLoadingStorage(false);
    }
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

  const handleSelectStorageItem = (id) => {
    setSelectedStorageItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleAddSelectedStorageItems = () => {
    const holdItems = storageInventoryData.filter(
      item => selectedStorageItems.has(item.id) && item.status_part === 'HOLD'
    );

    if (holdItems.length > 0) {
      alert("Cannot insert items with HOLD status. Please deselect HOLD items.");
      return;
    }

    const selectedItems = storageInventoryData.filter((item) =>
      selectedStorageItems.has(item.id) && item.status_part !== 'HOLD'
    );

    if (selectedItems.length === 0) {
      alert("No items selected");
      return;
    }

    const newParts = selectedItems.map((item, index) => ({
      id: Date.now() + index,
      storage_inventory_id: item.id,
      partCode: item.part_code,
      partName: item.part_name,
      model: item.model,
      reqQty: item.qty,
      qtyperLabel: "",
      stcokM136: item.qty,
      labelId: item.label_id,
      stockLevel: item.stock_level,
      status: item.status_part,
      remark: ""
    }));

    setPartData((prev) => [...prev, ...newParts]);
    setAddedStorageIds(computeAddedStorageIds());
    setSelectedStorageItems(new Set());
    setAddVendorPartDetail(false);
    setSearchPartCode("");
    setStorageInventoryData([]);
    setAddedStorageIds(new Set());
  };

  // ==================== MAIN TABLE HANDLERS ====================

  const handleRemarkChange = (partId, value) => {
    setPartData((prevParts) =>
      prevParts.map((part) =>
        part.id === partId ? { ...part, remark: value } : part
      )
    );
  };

  const handleMainTableCheckbox = (id) => {
    setSelectedMainTableItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAllMainTable = () => {
    const validParts = partData.filter(p => p.partCode && p.partCode.trim() !== "");
    if (selectAllMainTable) {
      setSelectedMainTableItems(new Set());
    } else {
      setSelectedMainTableItems(new Set(validParts.map(p => p.id)));
    }
    setSelectAllMainTable(!selectAllMainTable);
  };

  const handleDeleteFromMainTable = (id) => {
    setPartData(prev => prev.filter(p => p.id !== id));
    setSelectedMainTableItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    if (addVendorPartDetail) {
      setAddedStorageIds(computeAddedStorageIds());
    }
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

    // Get available DO numbers from addVendorFormData
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

  const handleDeletePart = (id) => {
    setPartData(partData.filter((part) => part.id !== id));
  };


  // ==================== SAVE & SUBMIT HANDLERS ====================

  const handleSaveConfiguration = async () => {
    const validParts = partData.filter(p => p.partCode && p.partCode.trim() !== "");

    if (validParts.length === 0) {
      alert("No parts to save");
      return;
    }

    if (validParts.length > 1 && selectedMainTableItems.size === 0) {
      alert("Please select at least one part to save");
      return;
    }

    const partsToSave = validParts.length === 1
      ? validParts
      : validParts.filter(p => selectedMainTableItems.has(p.id));

    if (partsToSave.length === 0) {
      alert("No parts selected");
      return;
    }

    try {
      const user = getAuthUserLocal();
      const requestedByName = user?.emp_name || user?.name || "Unknown";

      const parts = partsToSave.map(part => ({
        storage_inventory_id: part.storage_inventory_id,
        label_id: part.labelId,
        part_code: part.partCode,
        part_name: part.partName || "",
        model: part.model || "",
        qty_requested: parseInt(part.reqQty) || 0,
        remark: part.remark || ""
      }));

      const response = await fetch(`${API_BASE}/api/parts-enquiry-non-id`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parts: parts,
          requested_by_name: requestedByName
        })
      });

      const result = await response.json();
      if (result.success) {
        alert("Parts enquiry saved successfully!");
        navigate("/part-enquiry-non-id?tab=new");
      } else {
        alert("Failed to save: " + result.message);
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Error saving configuration");
    }
  };

  const popupTotalPages = Math.ceil(storageInventoryData.length / popupItemsPerPage);
  const popupCurrentData = storageInventoryData.slice(
    (popupCurrentPage - 1) * popupItemsPerPage,
    popupCurrentPage * popupItemsPerPage
  );

  // ==================== STYLES ====================
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
    tripDisplayTable: {
      display: "flex",
      height: "0.65rem",
      width: "60%",
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
      margin: "20px 0px 10px 0px",
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


  const vendorPartStyles = {
    popupOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 99999,
      boxSizing: "border-box",
    },
    popupContainer: {
      backgroundColor: "white",
      padding: "24px",
      borderRadius: "4px",
      boxShadow: "0 50px 25px rgba(0, 0, 0, 0.1)",
      width: "100%",
      maxWidth: "900px",
      maxHeight: "90vh",
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      margin: "20px 0",
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
    label: {
      display: "block",
      marginBottom: "4px",
      fontWeight: "500",
    },
    inputContainer: {
      display: "flex",
      gap: "1px",
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
      backgroundColor: "##e0e7ff",
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
      fontSize: "16px",
    },
    tableContainer: {
      marginLeft: "5px",
      backgroundColor: "white",
      borderRadius: "8px",
      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      maxHeight: "500px",
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
      overflowY: "auto",
      flex: "1",
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
      marginTop: "16px",
    },
    cancelButton: {
      padding: "8px 16px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      background: "white",
      cursor: "pointer",
      fontSize: "14px",
    },
    submitButton: {
      padding: "8px 16px",
      border: "none",
      borderRadius: "4px",
      backgroundColor: "#2563eb",
      color: "white",
      cursor: "pointer",
      fontSize: "14px",
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
      width: "30px",
      height: "20px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      padding: "0 8px",
      textAlign: "center",
      fontSize: "10px",
      fontFamily: "inherit",
    },
    paginationInfo: {
      fontSize: "12px",
      color: "#374151",
    },
  };


  // ==================== RENDER ====================
  return (
    <div style={styles.pageContainer}>
      <div style={styles.welcomeCard}>
        <div style={styles.gridContainer}>
          <div style={styles.card}>
            <div style={{ marginBottom: "24px" }}>
              <h2 style={styles.h2}>Parts Enquiry Non-ID</h2>
            </div>
            <div style={{ display: "flex" }}>
              <div style={{ flex: "3", display: "grid", gap: "20px" }}>
                <div>
                  <label htmlFor="stockLevel" style={styles.label}>
                    Stock Level (Requester)
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
                  <div style={styles.formGroupPartCode}>
                    <label style={styles.label}>Part Code</label>
                    <div style={styles.inputContainer}>
                      <input
                        type="text"
                        style={styles.inputPartCode}
                        placeholder="Enter part code"
                        value={searchPartCode}
                        onChange={(e) => setSearchPartCode(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            openVendorPartDetailPopup();
                          }
                        }}
                      />
                      <button
                        type="button"
                        style={styles.addPartButton}
                        onClick={openVendorPartDetailPopup}
                      >
                        <Search size={12} />
                        Search
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ flex: "3", display: "grid" }}>
                <div>
                  <label htmlFor="requestBy" style={styles.label}>
                    Request By
                  </label>
                  <select
                    id="requestBy"
                    style={styles.select}
                    value={selectedAnnexUpdate}
                    onChange={(e) => setSelectedAnnexUpdate(e.target.value)}
                  >
                    <option value="ZAHRUL ROMADHON">ZAHRUL ROMADHON</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="scheduleDate" style={styles.label}>
                    Request Date
                  </label>
                  <p style={styles.dateDisplay}>{currentDate}</p>
                </div>
              </div>
              <div style={{ flex: "3", display: "grid" }}>
                <div>
                  <label htmlFor="tripDisplay" style={styles.label}>
                    Trip
                  </label>
                  <p style={styles.tripDisplay}>Trip-11</p>
                </div>
                <div>
                  <label htmlFor="timeTrip" style={styles.label}>
                    Trip Time
                  </label>
                  <p style={styles.timeDisplay}>18:30-19:15</p>
                </div>
              </div>
            </div>
          </div>
          <h2 style={styles.h2}>Request List</h2>
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
                  <col style={{ width: "3%" }} />
                  <col style={{ width: "3%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "25%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "6%" }} />
                </colgroup>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.expandedTh}>No</th>
                    <th style={styles.thWithLeftBorder}>
                      {partData.filter(p => p.partCode && p.partCode.trim() !== "").length > 1 && (
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
                    <th style={styles.thWithLeftBorder}>Label ID</th>
                    <th style={styles.thWithLeftBorder}>Part Code</th>
                    <th style={styles.thWithLeftBorder}>Part Name</th>
                    <th style={styles.thWithLeftBorder}>Model</th>
                    <th style={styles.thWithLeftBorder}>Qty Req</th>
                    <th style={styles.thWithLeftBorder}>Stock Level</th>
                    <th style={styles.thWithLeftBorder}>Status</th>
                    <th style={styles.thWithLeftBorder}>Remark</th>
                    <th style={styles.thWithLeftBorder}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {partData.filter(p => p.partCode && p.partCode.trim() !== "").length === 0 ? (
                    <tr>

                    </tr>
                  ) : (
                    partData.filter(p => p.partCode && p.partCode.trim() !== "").map((part, index) => (
                      <tr
                        key={part.id}
                        style={{
                          backgroundColor: selectedMainTableItems.has(part.id) ? "#c7cde8" : "transparent"
                        }}
                        onMouseEnter={(e) => {
                          e.target.closest("tr").style.backgroundColor = "#c7cde8";
                        }}
                        onMouseLeave={(e) => {
                          if (selectedMainTableItems.has(part.id)) {
                            e.target.closest("tr").style.backgroundColor = "#c7cde8";
                          } else {
                            e.target.closest("tr").style.backgroundColor = "transparent";
                          }
                        }}
                      >
                        <td style={{ ...styles.expandedTd, ...styles.expandedWithLeftBorder, ...styles.emptyColumn }}>
                          {index + 1}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {partData.filter(p => p.partCode && p.partCode.trim() !== "").length > 1 && (
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
                        <td style={styles.tdWithLeftBorder}>{part.labelId || "-"}</td>
                        <td style={styles.tdWithLeftBorder}>{part.partCode}</td>
                        <td style={styles.tdWithLeftBorder}>{part.partName}</td>
                        <td style={styles.tdWithLeftBorder}>{part.model || "-"}</td>
                        <td style={styles.tdWithLeftBorder}>{part.reqQty}</td>
                        <td style={styles.tdWithLeftBorder}>M136</td>
                        <td style={styles.tdWithLeftBorder}>{part.status || "-"}</td>
                        <td style={styles.tdWithLeftBorder}>
                          <input
                            type="text"
                            value={part.remark || ""}
                            onChange={(e) => handleRemarkChange(part.id, e.target.value)}
                            placeholder="Enter remark..."
                            style={styles.remarkInput}
                          />
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          <button
                            onClick={() => handleDeleteFromMainTable(part.id)}
                            style={styles.deleteButton}
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
          <div style={styles.saveConfiguration}>
            <button
              style={{ ...styles.button, ...styles.primaryButton }}
              onClick={handleSaveConfiguration}
            >
              <Save size={16} />
              Save Configuration
            </button>
          </div>
        </div>
      </div>

      {addVendorPartDetail && (
        <div style={vendorPartStyles.popupOverlay}>
          <div style={vendorPartStyles.popupContainer}>
            <div style={vendorPartStyles.popupHeader}>
              <h3 style={vendorPartStyles.popupTitle}>
                Part List Stock In M136
              </h3>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  onClick={refreshStorageData}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    color: "#4b5563",
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="Refresh"
                >
                  <RefreshCw size={12} />
                </button>
                <button
                  onClick={() => {
                    setAddVendorPartDetail(false);
                    setAddedStorageIds(new Set());
                  }}
                  style={vendorPartStyles.closeButton}
                  title="Close"
                >
                  ×
                </button>
              </div>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleAddSelectedStorageItems(); }} style={vendorPartStyles.form}>
              <div style={vendorPartStyles.partDetailsSection}>
                <div style={vendorPartStyles.tableContainer}>
                  <div style={vendorPartStyles.tableBodyWrapper}>
                    <table
                      style={{
                        ...vendorPartStyles.table,
                        minWidth: "950px",
                        tableLayout: "fixed",
                      }}
                    >
                      <colgroup>
                        <col style={{ width: "2.5%" }} />
                        <col style={{ width: "2.5%" }} />
                        <col style={{ width: "15%" }} />
                        <col style={{ width: "15%" }} />
                        <col style={{ width: "20%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "8%" }} />
                        <col style={{ width: "8%" }} />
                        <col style={{ width: "8%" }} />
                        <col style={{ width: "7%" }} />
                      </colgroup>
                      <thead>
                        <tr style={vendorPartStyles.tableHeader}>
                          <th style={styles.thWithLeftBorder}>No</th>
                          <th style={styles.thWithLeftBorder}>
                            <input
                              type="checkbox"
                              checked={
                                storageInventoryData.filter(item => item.status_part !== 'HOLD').length > 0 &&
                                storageInventoryData.filter(item => item.status_part !== 'HOLD').every(item => selectedStorageItems.has(item.id))
                              }
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const allSelectable = storageInventoryData
                                    .filter(item => item.status_part !== 'HOLD')
                                    .map(item => item.id);
                                  setSelectedStorageItems(new Set(allSelectable));
                                } else {
                                  setSelectedStorageItems(new Set());
                                }
                              }}
                              style={{
                                margin: "0 auto",
                                display: "block",
                                cursor: "pointer",
                                width: "12px",
                                height: "12px",
                              }}
                            />
                          </th>
                          <th style={styles.thWithLeftBorder}>Label ID</th>
                          <th style={styles.thWithLeftBorder}>Part Code</th>
                          <th style={styles.thWithLeftBorder}>Part Name</th>
                          <th style={styles.thWithLeftBorder}>Model</th>
                          <th style={styles.thWithLeftBorder}>Qty</th>
                          <th style={styles.thWithLeftBorder}>Stock Level</th>
                          <th style={styles.thWithLeftBorder}>Status</th>
                          <th style={styles.thWithLeftBorder}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingStorage ? (
                          <tr>
                            <td colSpan="10" style={{ textAlign: "center", padding: "20px" }}>
                              Loading...
                            </td>
                          </tr>
                        ) : storageInventoryData.length === 0 ? (
                          <tr>
                            {/* Optional: tampilkan pesan kosong */}
                            <td colSpan="10" style={{ textAlign: "center", padding: "20px", color: "#9ca3af" }}>
                              No data available
                            </td>
                          </tr>
                        ) : (
                          popupCurrentData.map((item, index) => {
                            const actualIndex = (popupCurrentPage - 1) * popupItemsPerPage + index + 1;
                            return (
                              <tr
                                key={item.id}
                                style={{
                                  backgroundColor: addedStorageIds.has(item.id)
                                    ? "#a5b4fc"
                                    : item.status_part === 'HOLD'
                                      ? '#fee2e2'
                                      : selectedStorageItems.has(item.id)
                                        ? "#c7cde8"
                                        : "transparent"
                                }}
                                onMouseEnter={(e) => {
                                  if (!addedStorageIds.has(item.id) && item.status_part !== 'HOLD') {
                                    e.target.closest("tr").style.backgroundColor = "#c7cde8";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (addedStorageIds.has(item.id)) {
                                    e.target.closest("tr").style.backgroundColor = "#a5b4fc";
                                  } else if (item.status_part === 'HOLD') {
                                    e.target.closest("tr").style.backgroundColor = '#fee2e2';
                                  } else if (selectedStorageItems.has(item.id)) {
                                    e.target.closest("tr").style.backgroundColor = "#c7cde8";
                                  } else {
                                    e.target.closest("tr").style.backgroundColor = "transparent";
                                  }
                                }}
                              >
                                <td style={vendorPartStyles.tdNumber}>
                                  {actualIndex}
                                </td>
                                <td style={vendorPartStyles.td}>
                                  <input
                                    type="checkbox"
                                    checked={selectedStorageItems.has(item.id) || addedStorageIds.has(item.id)}
                                    onChange={() => handleSelectStorageItem(item.id)}
                                    disabled={item.status_part === 'HOLD' || addedStorageIds.has(item.id)}
                                    style={{
                                      margin: "0 auto",
                                      display: "block",
                                      cursor: (item.status_part === 'HOLD' || addedStorageIds.has(item.id)) ? 'not-allowed' : 'pointer',
                                      width: "12px",
                                      height: "12px",
                                      opacity: (item.status_part === 'HOLD' || addedStorageIds.has(item.id)) ? 0.5 : 1
                                    }}
                                  />
                                </td>
                                <td style={vendorPartStyles.td}>
                                  {item.label_id}
                                </td>
                                <td style={vendorPartStyles.td}>
                                  {item.part_code}
                                </td>
                                <td style={vendorPartStyles.td}>
                                  {item.part_name}
                                </td>
                                <td style={vendorPartStyles.td}>
                                  {item.model}
                                </td>
                                <td style={vendorPartStyles.td}>{item.qty}</td>
                                <td style={vendorPartStyles.td}>
                                  M136
                                </td>
                                <td style={{
                                  ...vendorPartStyles.td,
                                  color: item.status_part === 'HOLD' ? '#dc2626' : 'inherit',
                                  fontWeight: item.status_part === 'HOLD' ? '600' : 'normal'
                                }}>
                                  {item.status_part}
                                </td>
                                <td style={vendorPartStyles.td}>
                                  -
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div style={vendorPartStyles.paginationBar}>
                    <div style={vendorPartStyles.paginationControls}>
                      <button
                        style={vendorPartStyles.paginationButton}
                        onClick={() => handlePopupPageChange(1)}
                        disabled={popupCurrentPage === 1}
                      >
                        {"<<"}
                      </button>
                      <button
                        style={vendorPartStyles.paginationButton}
                        onClick={() => handlePopupPageChange(popupCurrentPage - 1)}
                        disabled={popupCurrentPage === 1}
                      >
                        {"<"}
                      </button>
                      <span>Page</span>
                      <input
                        type="text"
                        value={popupCurrentPage}
                        style={vendorPartStyles.paginationInput}
                        onChange={(e) => {
                          const page = parseInt(e.target.value);
                          if (!isNaN(page) && page >= 1 && page <= popupTotalPages) {
                            handlePopupPageChange(page);
                          }
                        }}
                      />
                      <span>of {popupTotalPages}</span>
                      <button
                        style={vendorPartStyles.paginationButton}
                        onClick={() => handlePopupPageChange(popupCurrentPage + 1)}
                        disabled={popupCurrentPage === popupTotalPages}
                      >
                        {">"}
                      </button>
                      <button
                        style={vendorPartStyles.paginationButton}
                        onClick={() => handlePopupPageChange(popupTotalPages)}
                        disabled={popupCurrentPage === popupTotalPages}
                      >
                        {">>"}
                      </button>
                    </div>
                    <div style={vendorPartStyles.paginationInfo}>
                      Total Row: {storageInventoryData.length}
                    </div>
                  </div>
                </div>
              </div>

              <div style={vendorPartStyles.buttonGroup}>
                <button
                  type="button"
                  onClick={() => {
                    setAddVendorPartDetail(false);
                    setAddedStorageIds(new Set());
                  }}
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
export default AddPartsEnquiryNonIdPage;