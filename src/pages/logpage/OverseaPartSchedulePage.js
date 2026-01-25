"use client";

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdArrowRight, MdArrowDropDown } from "react-icons/md";
import {
  Plus,
  Trash2,
  Pencil,
  Save,
  X,
  Check,
  CheckCircle,
  RotateCcw,
  Calendar,
} from "lucide-react";
import { Helmet } from "react-helmet";

const OverseaPartSchedulePage = ({ sidebarVisible }) => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());

  // PERMISSIONS
  const canCreateSchedule = true;
  const canDeleteSchedule = true;
  const canEditSchedule = true;
  const canEditPartsInToday = true;

  // STATE UNTUK DATA
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedScheduleIds, setSelectedScheduleIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [expandedVendorRows, setExpandedVendorRows] = useState({});
  const [activeTab, setActiveTab] = useState("New");

  // STATE FOR EDITING
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [editScheduleData, setEditScheduleData] = useState({});
  const [editingPartId, setEditingPartId] = useState(null);
  const [editPartData, setEditPartData] = useState({});

  // STATE FOR ADD VENDOR POPUP
  const [addVendorDetail, setAddVendorDetail] = useState(false);
  const [activeHeaderIdForVendorForm, setActiveHeaderIdForVendorForm] =
    useState(null);
  const [tripOptions, setTripOptions] = useState([]);
  const [vendorOptions, setVendorOptions] = useState([]);
  const [addVendorFormData, setAddVendorFormData] = useState({
    trip: "",
    vendor: "",
    doNumbers: [""],
    arrivalTime: "",
  });

  // STATE FOR ADD PART POPUP
  const [addVendorPartDetail, setAddVendorPartDetail] = useState(false);
  const [activeVendorContext, setActiveVendorContext] = useState(null);
  const [selectedPartsInPopup, setSelectedPartsInPopup] = useState([]);
  const [addVendorPartFormData, setAddVendorPartFormData] = useState({
    trip: "",
    vendor: "",
    doNumbers: [""],
    arrivalTime: "",
    parts: [],
  });

  // STATE FOR TABS
  const [receivedVendors, setReceivedVendors] = useState([]);
  const [iqcProgressVendors, setIqcProgressVendors] = useState([]);
  const [editingIqcPartId, setEditingIqcPartId] = useState(null);
  const [editIqcPartData, setEditIqcPartData] = useState({});
  const [qcChecksComplete, setQcChecksComplete] = useState([]);
  const [sampleVendors, setSampleVendors] = useState([]);
  const [editingSamplePartId, setEditingSamplePartId] = useState(null);
  const [editSamplePartData, setEditSamplePartData] = useState({});
  const [completeVendors, setCompleteVendors] = useState([]);

  // STATE FOR POPUPS
  const [showProdDatesPopup, setShowProdDatesPopup] = useState(false);
  const [activeProdDatesPart, setActiveProdDatesPart] = useState(null);
  const [tempProdDates, setTempProdDates] = useState([]);
  const [showAddSamplePopup, setShowAddSamplePopup] = useState(false);
  const [activeSamplePart, setActiveSamplePart] = useState(null);
  const [newSampleDate, setNewSampleDate] = useState("");

  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    vendorName: "",
    partCode: "",
  });

  // ====== TABLE CONFIGURATION PER TAB ======
  const tableConfig = {
    New: {
      mainTable: {
        cols: [
          "26px",
          "2%",
          "25px",
          "15%",
          "15%",
          "12%",
          "8%",
          "8%",
          "8%",
          "25%",
          "4%",
        ],
      },
      vendorTable: {
        marginLeft: "74.5px",
        cols: ["26px", "26px", "15%", "36%", "17%", "12%", "8%", "8%"],
      },
      partsTable: {
        marginLeft: "51px",
        cols: ["2.4%", "12%", "30%", "8%", "8%", "8%", "10%", "4%"],
      },
    },
    Schedule: {
      mainTable: {
        cols: [
          "26px",
          "26px",
          "15%",
          "12%",
          "12%",
          "8%",
          "8%",
          "8%",
          "25%",
          "8.5%",
        ],
      },
      vendorTable: {
        marginLeft: "51.5px",
        cols: ["26px", "26px", "12%", "35%", "15%", "15%", "8%", "8%", "6.7%"],
      },
      partsTable: {
        marginLeft: "51px",
        cols: ["2%", "12%", "30%", "8%", "8%", "8%", "10%", "4%"],
      },
    },
    Today: {
      mainTable: {
        cols: [
          "26px",
          "25px",
          "15%",
          "15%",
          "12%",
          "8%",
          "8%",
          "8%",
          "25%",
          "6%",
        ],
      },
      vendorTable: {
        marginLeft: "50.7px",
        cols: ["26px", "26px", "10%", "36%", "17%", "10%", "8%", "8%", "6.5%"],
      },
      partsTable: {
        marginLeft: "51px",
        cols: ["2.8%", "10%", "22%", "7%", "7%", "6%", "18%", "12%", "7%"],
      },
    },
    Received: {
      mainTable: {
        cols: [
          "26px",
          "26px",
          "30%",
          "12%",
          "8%",
          "8%",
          "15%",
          "10%",
          "10%",
          "10%",
          "12%",
          "25%",
          "12%",
        ],
      },
      partsTable: {
        marginLeft: "51px",
        cols: ["2%", "12%", "25%", "10%", "10%", "15%", "20%"],
      },
    },
    "IQC Progress": {
      mainTable: {
        cols: [
          "26px",
          "26px",
          "30%",
          "12%",
          "8%",
          "8%",
          "15%",
          "10%",
          "10%",
          "10%",
          "12%",
          "25%",
        ],
      },
      partsTable: {
        marginLeft: "51px",
        cols: [
          "2%",
          "10%",
          "25%",
          "7%",
          "7%",
          "6%",
          "15%",
          "12%",
          "10%",
          "20%",
        ],
      },
    },
    Sample: {
      mainTable: {
        cols: [
          "26px",
          "26px",
          "30%",
          "12%",
          "8%",
          "8%",
          "15%",
          "10%",
          "10%",
          "10%",
          "12%",
          "25%",
        ],
      },
      partsTable: {
        marginLeft: "51px",
        cols: [
          "2%",
          "10%",
          "25%",
          "7%",
          "7%",
          "6%",
          "15%",
          "10%",
          "12%",
          "20%",
        ],
      },
    },
    Complete: {
      mainTable: {
        cols: [
          "26px",
          "26px",
          "20%",
          "6%",
          "8%",
          "5%",
          "10%",
          "7%",
          "7%",
          "8%",
          "9%",
          "18%",
        ],
      },
      partsTable: {
        marginLeft: "51px",
        cols: [
          "3%",
          "12%",
          "25%",
          "8%",
          "8%",
          "7%",
          "12%",
          "10%",
          "12%",
          "15%",
        ],
      },
    },
  };

  // Helper functions
  const renderColgroup = (cols) => (
    <colgroup>
      {cols.map((width, index) => (
        <col key={index} style={{ width }} />
      ))}
    </colgroup>
  );

  const getCurrentConfig = () => tableConfig[activeTab] || tableConfig.Today;

  const formatDate = (dateString) => {
    try {
      if (!dateString) return "-";
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString) => {
    try {
      if (!dateString) return "-";
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return dateString;
    }
  };

  const getPartSampleStatus = (part) => {
    const prodDates =
      part.prod_dates || (part.prod_date ? [part.prod_date] : []);
    if (prodDates.length === 0) {
      return { status: "-", sampleDates: [] };
    }
    return { status: "SAMPLE", sampleDates: prodDates };
  };

  const toggleRowExpansion = (rowId) => {
    if (activeTab === "Today") return;
    setExpandedRows((prev) => ({ ...prev, [rowId]: !prev[rowId] }));
  };

  const toggleVendorRowExpansion = (vendorRowId) => {
    setExpandedVendorRows((prev) => ({
      ...prev,
      [vendorRowId]: !prev[vendorRowId],
    }));
  };

  // ====== STYLES ======
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
      marginBottom: "20px",
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
      gap: "8px",
      display: "flex",
    },
    actionButtonsGroup: {
      display: "flex",
      gap: "8px",
      marginBottom: "15px",
      marginTop: "10px",
      right: "10px",
    },
    primaryButton: {
      backgroundColor: "#2563eb",
      color: "white",
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
    expandedTableContainer: {
      marginBottom: "1px",
      marginLeft: "71px",
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
    saveConfiguration: {
      display: "flex",
      gap: "8px",
      marginTop: "10px",
      marginLeft: "13px",
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
    editButton: {
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
    saveButton: {
      backgroundColor: "#d1fae5",
      color: "#065f46",
      padding: "4px 8px",
      fontSize: "12px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      marginLeft: "4px",
    },
    cancelButton: {
      backgroundColor: "#fee2e2",
      color: "#991b1b",
      padding: "4px 8px",
      fontSize: "12px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      marginLeft: "4px",
    },
    checkButton: {
      backgroundColor: "#e0e7ff",
      color: "black",
      padding: "4px 8px",
      fontSize: "12px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      marginLeft: "4px",
    },
    returnButton: {
      backgroundColor: "#e0e7ff",
      color: "black",
      padding: "4px 8px",
      fontSize: "12px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      marginLeft: "4px",
    },
    inlineInput: {
      height: "22px",
      border: "1px solid #9fa8da",
      borderRadius: "3px",
      padding: "0 4px",
      fontSize: "11px",
      width: "90%",
      outline: "none",
    },
    popupOverlayDates: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2000,
    },
    popupContainerDates: {
      backgroundColor: "white",
      borderRadius: "8px",
      padding: "24px",
      width: "450px",
      maxWidth: "90vw",
      maxHeight: "80vh",
      overflow: "auto",
      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
    },
    popupHeaderDates: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: "1px solid #e5e7eb",
      paddingBottom: "12px",
      marginBottom: "16px",
    },
    popupTitleDates: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#374151",
      margin: 0,
    },
    dateInputRow: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginBottom: "8px",
    },
    dateInput: {
      flex: 1,
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      fontSize: "14px",
    },
    removeDateButton: {
      padding: "8px",
      border: "1px solid #ef4444",
      borderRadius: "4px",
      background: "#fef2f2",
      color: "#ef4444",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    addDateButton: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      padding: "8px 12px",
      border: "1px solid #3b82f6",
      borderRadius: "4px",
      background: "#eff6ff",
      color: "#3b82f6",
      cursor: "pointer",
      fontSize: "12px",
      marginTop: "8px",
    },
    buttonGroupDates: {
      display: "flex",
      gap: "8px",
      justifyContent: "flex-end",
      marginTop: "16px",
      paddingTop: "16px",
      borderTop: "1px solid #e5e7eb",
    },
    primaryButtonDates: {
      padding: "8px 16px",
      border: "none",
      borderRadius: "4px",
      background: "#3b82f6",
      color: "white",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "500",
    },
    secondaryButtonDates: {
      padding: "8px 16px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      background: "white",
      cursor: "pointer",
      fontSize: "14px",
    },
  };

  // Vendor Detail Popup Styles
  const vendorDetailStyles = {
    popupOverlay: {
      position: "fixed",
      top: 100,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
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
      boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
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
    form: { marginTop: "16px" },
    formGroup: { marginBottom: "16px" },
    label: { display: "block", marginBottom: "4px", fontWeight: "500" },
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
    doNumberContainer: { display: "flex", gap: "8px", marginBottom: "8px" },
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
    buttonGroup: { display: "flex", gap: "8px", justifyContent: "flex-end" },
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

  // Vendor Part Popup Styles
  const vendorPartStyles = {
    popupOverlay: {
      position: "fixed",
      top: 50,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
    },
    popupContainer: {
      backgroundColor: "white",
      padding: "24px",
      borderRadius: "8px",
      boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
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
    popupTitle: { margin: 0, fontSize: "18px", fontWeight: "600" },
    closeButton: {
      background: "none",
      border: "none",
      fontSize: "20px",
      cursor: "pointer",
      color: "#6b7280",
    },
    form: { marginTop: "16px" },
    formGroup: { marginBottom: "16px" },
    label: { display: "block", marginBottom: "4px", fontWeight: "500" },
    inputContainer: { display: "flex", gap: "8px", alignItems: "center" },
    input: {
      flex: "none",
      height: "1rem",
      width: "150px",
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "12px",
      outline: "none",
      boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)",
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
    partDetailsSection: { marginBottom: "16px" },
    sectionTitle: { marginBottom: "8px", fontWeight: "500" },
    tableContainer: {
      marginLeft: "5px",
      backgroundColor: "white",
      borderRadius: "8px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      overflowX: "auto",
      width: "calc(100% - 5px)",
    },
    tableBodyWrapper: {
      overflowX: "auto",
      border: "1.5px solid #9fa8da",
      borderBottom: "none",
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
    buttonGroup: { display: "flex", justifyContent: "flex-end", gap: "8px" },
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
    paginationControls: { display: "flex", alignItems: "center", gap: "8px" },
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

  // Tab names
  const tabNames = [
    "New",
    "Schedule",
    "Today",
    "Received",
    "IQC Progress",
    "Sample",
    "Complete",
  ];

  return (
    <div style={styles.pageContainer}>
      <Helmet>
        <title>Oversea Part Schedule</title>
      </Helmet>

      <div style={styles.welcomeCard}>
        {/* Header and Filter */}
        <div style={styles.combinedHeaderFilter}>
          <div style={styles.headerRow}>
            <h1 style={styles.title}>Oversea Part Schedule</h1>
          </div>

        <div style={styles.filterRow}>
            <div style={styles.inputGroup}>
              <span style={styles.label}>Date From</span>
              <input
                type="date"
                style={styles.input}
                value={filters.dateFrom}
              />
              <span style={styles.label}>Date To</span>
              <input
                type="date"
                style={styles.input}
                value={filters.dateTo}
              />
            </div>
            <div style={styles.inputGroup}>
              <span style={styles.label}>Search By</span>
              <input
                type="text"
                style={styles.input}
                placeholder="Vendor Name"
                value={filters.vendorName}
              />
              <input
                type="text"
                style={styles.input}
                placeholder="Part Code"
                value={filters.partCode}
              />
              <button
                style={styles.button}
        
              >
                Search
              </button>
            </div>
          </div>
        </div>
        <div style={styles.actionButtonsGroup}>
          <button
            style={{ ...styles.button, ...styles.primaryButton }}
            onClick={() => navigate("/oversea-schedule/add")}
          >
            <Plus size={16} />
            Create
          </button>
        </div>

        {/* Tabs */}
        <div style={styles.tabsContainer}>
          {tabNames.map((tab) => (
            <button
              key={tab}
              style={{
                ...styles.tabButton,
                ...(activeTab === tab && styles.tabButtonActive),
              }}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={styles.tableContainer}>
          <div style={styles.tableBodyWrapper}>
            <table
              style={{
                ...styles.table,
                minWidth: "1200px",
                tableLayout: "fixed",
              }}
            >
              {renderColgroup(getCurrentConfig().mainTable.cols)}
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.expandedTh}>No</th>
                  {activeTab === "New" && (
                    <th style={styles.thWithLeftBorder}>
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={() => setSelectAll(!selectAll)}
                        style={{
                          margin: "0 auto",
                          display: "block",
                          cursor: "pointer",
                          width: "12px",
                          height: "12px",
                        }}
                      />
                    </th>
                  )}
                  <th style={styles.thWithLeftBorder}></th>
                  <th style={styles.thWithLeftBorder}>Schedule Date</th>
                  {activeTab !== "New" && (
                    <th style={styles.thWithLeftBorder}>Stock Level</th>
                  )}
                  <th style={styles.thWithLeftBorder}>Model</th>
                  <th style={styles.thWithLeftBorder}>Total Vendor</th>
                  <th style={styles.thWithLeftBorder}>Total Pallet</th>
                  <th style={styles.thWithLeftBorder}>Total Item</th>
                  <th style={styles.thWithLeftBorder}>Upload By</th>
                  {(activeTab === "New" ||
                    activeTab === "Schedule" ||
                    activeTab === "Today") && (
                    <th style={styles.thWithLeftBorder}>Action</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td
                      colSpan={activeTab === "New" ? 11 : 10}
                      style={{
                        ...styles.tdWithLeftBorder,
                        textAlign: "center",
                        color: "#6b7280",
                      }}
                    >
                      Loading...
                    </td>
                  </tr>
                )}
                {!loading && schedules.length === 0 && (
                  <tr>
                    <td
                      colSpan={activeTab === "New" ? 11 : 10}
                      style={{
                        ...styles.tdWithLeftBorder,
                        textAlign: "center",
                        color: "#6b7280",
                      }}
                    >
                      No data available
                    </td>
                  </tr>
                )}
                {!loading &&
                  schedules.map((schedule, index) => (
                    <React.Fragment key={schedule.id}>
                      <tr>
                        <td
                          style={{
                            ...styles.expandedTd,
                            ...styles.expandedWithLeftBorder,
                            ...styles.emptyColumn,
                          }}
                        >
                          {index + 1}
                        </td>
                        {activeTab === "New" && (
                          <td style={styles.tdWithLeftBorder}>
                            <input
                              type="checkbox"
                              checked={selectedScheduleIds.has(schedule.id)}
                              onChange={() => {}}
                              style={{
                                margin: "0 auto",
                                display: "block",
                                cursor: "pointer",
                                width: "12px",
                                height: "12px",
                              }}
                            />
                          </td>
                        )}
                        <td
                          style={{
                            ...styles.tdWithLeftBorder,
                            ...styles.emptyColumn,
                          }}
                        >
                          <button
                            style={styles.arrowButton}
                            onClick={() => toggleRowExpansion(schedule.id)}
                          >
                            {expandedRows[schedule.id] ? (
                              <MdArrowDropDown style={styles.arrowIcon} />
                            ) : (
                              <MdArrowRight style={styles.arrowIcon} />
                            )}
                          </button>
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {formatDate(schedule.schedule_date)}
                        </td>
                        {activeTab !== "New" && (
                          <td style={styles.tdWithLeftBorder}>
                            {schedule.stock_level || "-"}
                          </td>
                        )}
                        <td style={styles.tdWithLeftBorder}>
                          {schedule.model_name || "-"}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {schedule.total_vendor || 0}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {schedule.total_pallet || 0}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {schedule.total_item || 0}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {schedule.upload_by_name || "-"}
                        </td>
                        {(activeTab === "New" ||
                          activeTab === "Schedule" ||
                          activeTab === "Today") && (
                          <td style={styles.tdWithLeftBorder}>
                            {canEditSchedule && (
                              <button style={styles.editButton} title="Edit">
                                <Pencil size={10} />
                              </button>
                            )}
                            {canDeleteSchedule && (
                              <button
                                style={styles.deleteButton}
                                title="Delete"
                              >
                                <Trash2 size={10} />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>

                      {/* Expanded Vendor Row */}
                      {expandedRows[schedule.id] && schedule.vendors && (
                        <tr>
                          <td
                            colSpan={activeTab === "New" ? 11 : 10}
                            style={{ padding: 0, border: "none" }}
                          >
                            <div
                              style={{
                                ...styles.expandedTableContainer,
                                marginLeft:
                                  getCurrentConfig().vendorTable?.marginLeft,
                              }}
                            >
                              <table style={styles.expandedTable}>
                                {renderColgroup(
                                  getCurrentConfig().vendorTable?.cols || [],
                                )}
                                <thead>
                                  <tr style={styles.expandedTableHeader}>
                                    <th style={styles.expandedTh}>No</th>
                                    <th style={styles.expandedTh}></th>
                                    <th style={styles.expandedTh}>Vendor</th>
                                    <th style={styles.expandedTh}>DO Number</th>
                                    <th style={styles.expandedTh}>
                                      Arrival Time
                                    </th>
                                    <th style={styles.expandedTh}>
                                      Total Pallet
                                    </th>
                                    <th style={styles.expandedTh}>
                                      Total Item
                                    </th>
                                    <th style={styles.expandedTh}>Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {schedule.vendors.length === 0 ? (
                                    <tr>
                                      <td
                                        colSpan="8"
                                        style={{
                                          textAlign: "center",
                                          padding: "10px",
                                          color: "#6b7280",
                                        }}
                                      >
                                        No vendors
                                      </td>
                                    </tr>
                                  ) : (
                                    schedule.vendors.map((vendor, vIdx) => (
                                      <React.Fragment key={vendor.id}>
                                        <tr>
                                          <td
                                            style={{
                                              ...styles.expandedTd,
                                              ...styles.expandedWithLeftBorder,
                                              ...styles.emptyColumn,
                                            }}
                                          >
                                            {vIdx + 1}
                                          </td>
                                          <td
                                            style={{
                                              ...styles.expandedTd,
                                              ...styles.emptyColumn,
                                            }}
                                          >
                                            <button
                                              style={styles.arrowButton}
                                              onClick={() =>
                                                toggleVendorRowExpansion(
                                                  `vendor_${schedule.id}_${vendor.id}`,
                                                )
                                              }
                                            >
                                              {expandedVendorRows[
                                                `vendor_${schedule.id}_${vendor.id}`
                                              ] ? (
                                                <MdArrowDropDown
                                                  style={styles.arrowIcon}
                                                />
                                              ) : (
                                                <MdArrowRight
                                                  style={styles.arrowIcon}
                                                />
                                              )}
                                            </button>
                                          </td>
                                          <td style={styles.expandedTd}>
                                            {vendor.vendor_name || "-"}
                                          </td>
                                          <td style={styles.expandedTd}>
                                            {vendor.do_numbers || "-"}
                                          </td>
                                          <td style={styles.expandedTd}>
                                            {vendor.arrival_time || "-"}
                                          </td>
                                          <td style={styles.expandedTd}>
                                            {vendor.total_pallet || 0}
                                          </td>
                                          <td style={styles.expandedTd}>
                                            {vendor.total_item || 0}
                                          </td>
                                          <td style={styles.expandedTd}>
                                            <button
                                              style={styles.addButton}
                                              title="Add Part"
                                            >
                                              <Plus size={10} />
                                            </button>
                                            <button
                                              style={styles.deleteButton}
                                              title="Delete"
                                            >
                                              <Trash2 size={10} />
                                            </button>
                                          </td>
                                        </tr>

                                        {/* Expanded Parts Row */}
                                        {expandedVendorRows[
                                          `vendor_${schedule.id}_${vendor.id}`
                                        ] && (
                                          <tr>
                                            <td
                                              colSpan="8"
                                              style={{
                                                padding: 0,
                                                border: "none",
                                              }}
                                            >
                                              <div
                                                style={{
                                                  ...styles.thirdLevelTableContainer,
                                                  marginLeft:
                                                    getCurrentConfig()
                                                      .partsTable?.marginLeft,
                                                }}
                                              >
                                                <table
                                                  style={styles.thirdLevelTable}
                                                >
                                                  {renderColgroup(
                                                    getCurrentConfig()
                                                      .partsTable?.cols || [],
                                                  )}
                                                  <thead>
                                                    <tr
                                                      style={
                                                        styles.expandedTableHeader
                                                      }
                                                    >
                                                      <th
                                                        style={
                                                          styles.thirdLevelTh
                                                        }
                                                      >
                                                        No
                                                      </th>
                                                      <th
                                                        style={
                                                          styles.thirdLevelTh
                                                        }
                                                      >
                                                        Part Code
                                                      </th>
                                                      <th
                                                        style={
                                                          styles.thirdLevelTh
                                                        }
                                                      >
                                                        Part Name
                                                      </th>
                                                      <th
                                                        style={
                                                          styles.thirdLevelTh
                                                        }
                                                      >
                                                        Qty
                                                      </th>
                                                      <th
                                                        style={
                                                          styles.thirdLevelTh
                                                        }
                                                      >
                                                        Qty Box
                                                      </th>
                                                      <th
                                                        style={
                                                          styles.thirdLevelTh
                                                        }
                                                      >
                                                        Unit
                                                      </th>
                                                      <th
                                                        style={
                                                          styles.thirdLevelTh
                                                        }
                                                      >
                                                        Remark
                                                      </th>
                                                      <th
                                                        style={
                                                          styles.thirdLevelTh
                                                        }
                                                      >
                                                        Action
                                                      </th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {!vendor.parts ||
                                                    vendor.parts.length ===
                                                      0 ? (
                                                      <tr>
                                                        <td
                                                          colSpan="8"
                                                          style={{
                                                            textAlign: "center",
                                                            padding: "10px",
                                                            color: "#6b7280",
                                                          }}
                                                        >
                                                          No parts
                                                        </td>
                                                      </tr>
                                                    ) : (
                                                      vendor.parts.map(
                                                        (part, pIdx) => (
                                                          <tr key={part.id}>
                                                            <td
                                                              style={{
                                                                ...styles.expandedTd,
                                                                ...styles.expandedWithLeftBorder,
                                                                ...styles.emptyColumn,
                                                              }}
                                                            >
                                                              {pIdx + 1}
                                                            </td>
                                                            <td
                                                              style={
                                                                styles.thirdLevelTd
                                                              }
                                                            >
                                                              {part.part_code ||
                                                                "-"}
                                                            </td>
                                                            <td
                                                              style={
                                                                styles.thirdLevelTd
                                                              }
                                                            >
                                                              {part.part_name ||
                                                                "-"}
                                                            </td>
                                                            <td
                                                              style={
                                                                styles.thirdLevelTd
                                                              }
                                                            >
                                                              {part.qty || 0}
                                                            </td>
                                                            <td
                                                              style={
                                                                styles.thirdLevelTd
                                                              }
                                                            >
                                                              {part.qty_box ||
                                                                0}
                                                            </td>
                                                            <td
                                                              style={
                                                                styles.thirdLevelTd
                                                              }
                                                            >
                                                              {part.unit ||
                                                                "PCS"}
                                                            </td>
                                                            <td
                                                              style={
                                                                styles.thirdLevelTd
                                                              }
                                                            >
                                                              {part.remark ||
                                                                "-"}
                                                            </td>
                                                            <td
                                                              style={
                                                                styles.thirdLevelTd
                                                              }
                                                            >
                                                              <button
                                                                style={
                                                                  styles.editButton
                                                                }
                                                                title="Edit"
                                                              >
                                                                <Pencil
                                                                  size={10}
                                                                />
                                                              </button>
                                                              <button
                                                                style={
                                                                  styles.deleteButton
                                                                }
                                                                title="Delete"
                                                              >
                                                                <Trash2
                                                                  size={10}
                                                                />
                                                              </button>
                                                            </td>
                                                          </tr>
                                                        ),
                                                      )
                                                    )}
                                                  </tbody>
                                                </table>
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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

        {/* Save Button for New Tab */}
        {activeTab === "New" && selectedScheduleIds.size > 0 && (
          <div style={styles.saveConfiguration}>
            <button style={{ ...styles.button, ...styles.primaryButton }}>
              <Save size={16} />
              Save to Schedule ({selectedScheduleIds.size})
            </button>
          </div>
        )}
      </div>

      {/* Add Vendor Popup */}
      {addVendorDetail && (
        <div style={vendorDetailStyles.popupOverlay}>
          <div style={vendorDetailStyles.popupContainer}>
            <div style={vendorDetailStyles.popupHeader}>
              <h3 style={vendorDetailStyles.popupTitle}>Add Vendor</h3>
              <button
                style={vendorDetailStyles.closeButton}
                onClick={() => setAddVendorDetail(false)}
              >
                ×
              </button>
            </div>
            <form style={vendorDetailStyles.form}>
              <div style={vendorDetailStyles.formGroup}>
                <label style={vendorDetailStyles.label}>Trip:</label>
                <select
                  style={vendorDetailStyles.select}
                  value={addVendorFormData.trip}
                  onChange={(e) =>
                    setAddVendorFormData({
                      ...addVendorFormData,
                      trip: e.target.value,
                    })
                  }
                >
                  <option value="">Select Trip</option>
                  {tripOptions.map((trip) => (
                    <option key={trip.id} value={trip.trip_no}>
                      {trip.trip_no}
                    </option>
                  ))}
                </select>
              </div>
              <div style={vendorDetailStyles.formGroup}>
                <label style={vendorDetailStyles.label}>Vendor:</label>
                <select
                  style={vendorDetailStyles.select}
                  value={addVendorFormData.vendor}
                  onChange={(e) =>
                    setAddVendorFormData({
                      ...addVendorFormData,
                      vendor: e.target.value,
                    })
                  }
                >
                  <option value="">Select Vendor</option>
                  {vendorOptions.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.vendor_code} - {vendor.vendor_name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={vendorDetailStyles.formGroup}>
                <label style={vendorDetailStyles.label}>Arrival Time:</label>
                <input
                  type="time"
                  style={vendorDetailStyles.timeInput}
                  value={addVendorFormData.arrivalTime}
                  onChange={(e) =>
                    setAddVendorFormData({
                      ...addVendorFormData,
                      arrivalTime: e.target.value,
                    })
                  }
                />
              </div>
              <div style={vendorDetailStyles.buttonGroup}>
                <button
                  type="button"
                  style={vendorDetailStyles.cancelButton}
                  onClick={() => setAddVendorDetail(false)}
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

      {/* Add Part Popup */}
      {addVendorPartDetail && (
        <div style={vendorPartStyles.popupOverlay}>
          <div style={vendorPartStyles.popupContainer}>
            <div style={vendorPartStyles.popupHeader}>
              <h3 style={vendorPartStyles.popupTitle}>Add Part</h3>
              <button
                style={vendorPartStyles.closeButton}
                onClick={() => setAddVendorPartDetail(false)}
              >
                ×
              </button>
            </div>
            <form style={vendorPartStyles.form}>
              <div style={vendorPartStyles.formGroup}>
                <label style={vendorPartStyles.label}>Part Code:</label>
                <div style={vendorPartStyles.inputContainer}>
                  <input
                    type="text"
                    style={vendorPartStyles.input}
                    placeholder="Enter Part Code"
                  />
                  <button type="button" style={vendorPartStyles.addPartButton}>
                    <Plus size={14} /> Add Part
                  </button>
                </div>
              </div>
              <div style={vendorPartStyles.partDetailsSection}>
                <div style={vendorPartStyles.sectionTitle}>Part Details</div>
                <div style={vendorPartStyles.tableContainer}>
                  <div style={vendorPartStyles.tableBodyWrapper}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        tableLayout: "fixed",
                      }}
                    >
                      <thead>
                        <tr style={vendorPartStyles.tableHeader}>
                          <th style={vendorPartStyles.th}>
                            <input type="checkbox" />
                          </th>
                          <th style={vendorPartStyles.th}>Part Code</th>
                          <th style={vendorPartStyles.th}>Part Name</th>
                          <th style={vendorPartStyles.th}>Qty</th>
                          <th style={vendorPartStyles.th}>Qty Box</th>
                          <th style={vendorPartStyles.th}>Unit</th>
                          <th style={vendorPartStyles.th}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {addVendorPartFormData.parts.length === 0 ? (
                          <tr>
                            <td
                              colSpan="7"
                              style={{
                                textAlign: "center",
                                padding: "20px",
                                color: "#6b7280",
                              }}
                            >
                              No parts added yet
                            </td>
                          </tr>
                        ) : (
                          addVendorPartFormData.parts.map((part) => (
                            <tr key={part.id}>
                              <td style={vendorPartStyles.td}>
                                <input
                                  type="checkbox"
                                  checked={selectedPartsInPopup.includes(
                                    part.id,
                                  )}
                                  onChange={() => {}}
                                />
                              </td>
                              <td style={vendorPartStyles.td}>
                                {part.partCode}
                              </td>
                              <td style={vendorPartStyles.td}>
                                {part.partName || "—"}
                              </td>
                              <td style={vendorPartStyles.td}>
                                <input
                                  type="number"
                                  value={part.qty || ""}
                                  onChange={() => {}}
                                  style={{
                                    width: "60px",
                                    padding: "2px",
                                    fontSize: "12px",
                                    textAlign: "center",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "3px",
                                  }}
                                  placeholder="0"
                                />
                              </td>
                              <td style={vendorPartStyles.td}>
                                {part.qtyBox || ""}
                              </td>
                              <td style={vendorPartStyles.td}>
                                {part.unit || "PCS"}
                              </td>
                              <td style={vendorPartStyles.td}>
                                <button
                                  style={vendorPartStyles.deleteButton}
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
                  onClick={() => {
                    setAddVendorPartDetail(false);
                    setActiveVendorContext(null);
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

      {/* Production Dates Popup */}
      {showProdDatesPopup && activeProdDatesPart && (
        <div style={styles.popupOverlayDates}>
          <div style={styles.popupContainerDates}>
            <div style={styles.popupHeaderDates}>
              <h3 style={styles.popupTitleDates}>
                Production Dates - {activeProdDatesPart.part_code}
              </h3>
              <button
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#6b7280",
                }}
                onClick={() => setShowProdDatesPopup(false)}
              >
                ×
              </button>
            </div>
            <div>
              <p
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  marginBottom: "12px",
                }}
              >
                Add multiple production dates for this part. These dates will be
                used for QC sampling.
              </p>
              {tempProdDates.map((date, index) => (
                <div key={index} style={styles.dateInputRow}>
                  <input
                    type="date"
                    style={styles.dateInput}
                    value={date}
                    onChange={(e) => {
                      const newDates = [...tempProdDates];
                      newDates[index] = e.target.value;
                      setTempProdDates(newDates);
                    }}
                  />
                  {tempProdDates.length > 1 && (
                    <button
                      style={styles.removeDateButton}
                      onClick={() =>
                        setTempProdDates(
                          tempProdDates.filter((_, i) => i !== index),
                        )
                      }
                      title="Remove date"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button
                style={styles.addDateButton}
                onClick={() => setTempProdDates([...tempProdDates, ""])}
              >
                <Plus size={14} /> Add Another Date
              </button>
            </div>
            <div style={styles.buttonGroupDates}>
              <button
                style={styles.secondaryButtonDates}
                onClick={() => setShowProdDatesPopup(false)}
              >
                Cancel
              </button>
              <button style={styles.primaryButtonDates}>Save Dates</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OverseaPartSchedulePage;
