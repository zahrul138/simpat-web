"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MdArrowRight, MdArrowDropDown } from "react-icons/md";
import { Plus, Trash2, Pencil, Save, X, RefreshCw } from "lucide-react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const PartDetailsPage = ({ sidebarVisible }) => {
  const navigate = useNavigate();

  // State untuk data
  const [partsData, setPartsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State untuk popup edit
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [editingPart, setEditingPart] = useState(null);
  const [editFormData, setEditFormData] = useState({
    part_code: "",
    part_name: "",
    part_size: "",
    size_id: "",
    part_material: "",
    part_types: "Regular",
    qty_per_box: "",
    part_price: "",
    part_weight: "",
    weight_unit: "kg",
    customer_id: "",
    customer_special: [],
    model: "",
    vendor_id: "",
    vendor_type: "",
    stock_level_to: "",
    placement_id: "",
    assembly_station: "",
    qty_per_assembly: 1,
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);
  const [selectedRowId, setSelectedRowId] = useState(null);

  // Data untuk dropdowns
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [models, setModels] = useState([]);
  const [partSizes, setPartSizes] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [stockLevels] = useState([
    { value: "M101 | SCN-MH", label: "M101 | SCN-MH" },
    { value: "M136 | SCN-LOG", label: "M136 | SCN-LOG" },
  ]);
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

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchBy, setSearchBy] = useState("Vendor");
  const [keyword, setKeyword] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const fetchAllData = async () => {
    try {
      await Promise.all([
        fetchCustomers(),
        fetchVendors(),
        fetchModels(),
        fetchPartSizes(),
        fetchPlacements(),
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/customers/active-minimal`);
      const data = await response.json();
      setCustomers(data);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/vendors`);
      const data = await response.json();
      if (data.success) {
        setVendors(data.data);
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
    }
  };

  const fetchModels = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/masters/models`);
      const data = await response.json();

      if (data.success) {
        if (Array.isArray(data.data) && data.data.length > 0) {
          if (typeof data.data[0] === "string") {
            setModels(data.data);
          } else {
            setModels(data.data.map((item) => item.name || item));
          }
        } else {
          setModels(["Veronicas", "Heracles"]);
        }
      } else {
        setModels(["Veronicas", "Heracles"]);
      }
    } catch (error) {
      console.error("Error fetching models:", error);
      setModels(["Veronicas", "Heracles"]);
    }
  };

  const fetchPartSizes = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/masters/part-sizes`);
      const data = await response.json();

      if (data.success) {
        if (Array.isArray(data.data) && data.data.length > 0) {
          setPartSizes(
            data.data.map((item) => ({
              id: item.id,
              size_name: item.size_name || item,
            }))
          );
        } else {
          setPartSizes([
            { id: 1, size_name: "SMALL" },
            { id: 2, size_name: "MEDIUM" },
            { id: 3, size_name: "LARGE" },
          ]);
        }
      } else {
        setPartSizes([
          { id: 1, size_name: "SMALL" },
          { id: 2, size_name: "MEDIUM" },
          { id: 3, size_name: "LARGE" },
        ]);
      }
    } catch (error) {
      console.error("Error fetching part sizes:", error);
      setPartSizes([
        { id: 1, size_name: "SMALL" },
        { id: 2, size_name: "MEDIUM" },
        { id: 3, size_name: "LARGE" },
      ]);
    }
  };

  const fetchPlacements = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/vendor-placements`);
      const result = await response.json();

      if (result.success) {
        setPlacements(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching placements:", error);
    }
  };

  const getCustomerName = useCallback(
    (customerSpecial) => {
      if (!customerSpecial) return "All Customers";

      try {
        const customerIds = Array.isArray(customerSpecial)
          ? customerSpecial
          : JSON.parse(customerSpecial);

        if (!customerIds || customerIds.length === 0) {
          return "All Customers";
        }

        const customerNames = customerIds.map((id) => {
          const customer = customers.find(
            (c) => c.id.toString() === id.toString()
          );
          return customer
            ? `${customer.mat_code} | ${customer.cust_name}`
            : `Customer ${id}`;
        });

        return customerNames.join(", ");
      } catch (error) {
        console.error("Error parsing customer_special:", error);
        return "Special Customer(s)";
      }
    },
    [customers]
  );

  const fetchPartsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE}/api/kanban-master/with-details`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Debug log untuk melihat data yang diterima
        console.log("Parts data received:", result.data);

        // Tambahkan logic untuk handle null placement
        const processedData = (result.data || []).map((part) => ({
          ...part,
          placement_name: part.placement_name || "No Placement",
          placement_length: part.placement_length || "",
          placement_width: part.placement_width || "",
          placement_height: part.placement_height || "",
        }));

        console.log("Processed parts data with placement:", processedData);

        setPartsData(processedData);
      } else {
        throw new Error(result.message || "Failed to fetch parts data");
      }
    } catch (err) {
      console.error("Error fetching parts data:", err);
      setError(err.message);
      setPartsData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartsData();
    fetchAllData();
  }, []);

  const handleEditClick = (part) => {
    setEditingPart(part);

    let customerSpecialArray = [];
    if (part.customer_special) {
      try {
        customerSpecialArray = Array.isArray(part.customer_special)
          ? part.customer_special
          : JSON.parse(part.customer_special);
      } catch (error) {
        console.error("Error parsing customer_special:", error);
        customerSpecialArray = [];
      }
    }

    const placementId = part.placement_id
      ? part.placement_id.toString()
      : "no-placement";

    setEditFormData({
      part_code: part.part_code || "",
      part_name: part.part_name || "",
      part_size: part.part_size || "",
      size_id: part.size_id || "",
      part_material: part.part_material || "",
      part_types: part.part_types || "Regular",
      qty_per_box: part.qty_per_box || "",
      part_price: part.part_price || "",
      part_weight: part.part_weight || "",
      weight_unit: part.weight_unit || "kg",
      customer_id:
        customerSpecialArray.length > 0 ? customerSpecialArray[0] : "",
      customer_special: customerSpecialArray,
      model: part.model || "",
      vendor_id: part.vendor_id || "",
      vendor_type: part.vendor_type || "",
      stock_level_to: part.stock_level_to || "",
      placement_id: placementId,
      assembly_station: part.assembly_station || "",
      qty_per_assembly: part.qty_per_assembly || 1,
    });

    setEditError(null);
    setShowEditPopup(true);
  };

  const handleCloseEditPopup = () => {
    setShowEditPopup(false);
    setEditingPart(null);
    setEditFormData({
      part_code: "",
      part_name: "",
      part_size: "",
      size_id: "",
      part_material: "",
      part_types: "Regular",
      qty_per_box: "",
      part_price: "",
      part_weight: "",
      customer_id: "",
      customer_special: [],
      model: "",
      vendor_id: "",
      vendor_type: "",
      stock_level_to: "",
      placement_id: "",
      assembly_station: "",
      qty_per_assembly: 1,
    });
    setEditError(null);
  };

  const handleEditFormChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "vendor_id") {
      const selectedVendor = vendors.find((v) => v.id.toString() === value);
      setEditFormData({
        ...editFormData,
        [name]: value,
        vendor_type: selectedVendor?.types || "",
      });
    } else if (name === "part_types" && value === "Regular") {
      setEditFormData({
        ...editFormData,
        [name]: value,
        customer_id: "",
        customer_special: [],
      });
    } else if (name === "weight_unit") {
      setEditFormData({
        ...editFormData,
        [name]: value,
      });
    } else if (name === "placement_id") {
      // Handle "No Placement"
      if (value === "no-placement") {
        setEditFormData({
          ...editFormData,
          [name]: null,
        });
      } else {
        setEditFormData({
          ...editFormData,
          [name]: value,
        });
      }
    } else {
      setEditFormData({
        ...editFormData,
        [name]: type === "checkbox" ? checked : value,
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingPart) return;

    if (!editFormData.part_code.trim()) {
      setEditError("Part Code is required");
      return;
    }

    if (!editFormData.part_name.trim()) {
      setEditError("Part Name is required");
      return;
    }

    if (!editFormData.vendor_id) {
      setEditError("Vendor is required");
      return;
    }

    if (!editFormData.part_size) {
      setEditError("Part Size is required");
      return;
    }

    if (!editFormData.model) {
      setEditError("Model is required");
      return;
    }

    if (!editFormData.stock_level_to) {
      setEditError("Stock Level is required");
      return;
    }

    if (editFormData.part_types === "Special" && !editFormData.customer_id) {
      setEditError("Please select Customer for Special part");
      return;
    }

    if (
      editFormData.part_weight !== "" &&
      isNaN(parseFloat(editFormData.part_weight))
    ) {
      setEditError("Part Weight must be a valid number");
      return;
    }

    if (
      editFormData.part_weight !== "" &&
      parseFloat(editFormData.part_weight) < 0
    ) {
      setEditError("Part Weight cannot be negative");
      return;
    }

    try {
      setEditLoading(true);
      setEditError(null);
      let customerSpecialData = null;
      if (editFormData.part_types === "Special" && editFormData.customer_id) {
        customerSpecialData = [editFormData.customer_id];
      }

      const selectedSize = partSizes.find(
        (size) => size.size_name === editFormData.part_size
      );

      const vendorIdNum = editFormData.vendor_id
        ? parseInt(editFormData.vendor_id)
        : null;
      const placementIdNum = editFormData.placement_id
        ? editFormData.placement_id === "no-placement"
          ? null
          : parseInt(editFormData.placement_id)
        : null;

      const updateData = {
        part_code: editFormData.part_code.trim(),
        part_name: editFormData.part_name.trim(),
        part_size: editFormData.part_size,
        size_id: selectedSize ? selectedSize.id : null,
        part_material: editFormData.part_material.trim() || null,
        part_types: editFormData.part_types,
        qty_per_box: parseInt(editFormData.qty_per_box) || 1,
        part_price: parseFloat(editFormData.part_price) || 0,
        part_weight: parseFloat(editFormData.part_weight) || null,
        weight_unit: editFormData.weight_unit || "kg",
        customer_special: customerSpecialData,
        model: editFormData.model,
        vendor_id: vendorIdNum,
        vendor_type: editFormData.vendor_type,
        stock_level_to: editFormData.stock_level_to,
        placement_id: placementIdNum,
        assembly_station: editFormData.assembly_station || null,
        qty_per_assembly: parseInt(editFormData.qty_per_assembly) || 1,
      };

      const response = await fetch(
        `${API_BASE}/api/kanban-master/${editingPart.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || `HTTP error! status: ${response.status}`
        );
      }

      if (result.success) {
        handleCloseEditPopup();
        fetchPartsData();
        alert("Part updated successfully!");
      } else {
        throw new Error(result.message || "Failed to update part");
      }
    } catch (err) {
      console.error("Error updating part:", err);
      setEditError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  // Fungsi untuk handle search (existing)
  const handleSearchClick = async () => {
    try {
      setLoading(true);

      let url = `${API_BASE}/api/kanban-master/with-details?`;
      const params = [];

      if (dateFrom) params.push(`date_from=${dateFrom}`);
      if (dateTo) params.push(`date_to=${dateTo}`);
      if (keyword) {
        switch (searchBy) {
          case "Vendor":
            params.push(`vendor_name=${encodeURIComponent(keyword)}`);
            break;
          case "Product Code":
            params.push(`part_code=${encodeURIComponent(keyword)}`);
            break;
          case "Product Description":
            params.push(`part_name=${encodeURIComponent(keyword)}`);
            break;
          case "Customers":
            break;
          default:
            break;
        }
      }

      url += params.join("&");

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setPartsData(result.data || []);
        setCurrentPage(1);
      } else {
        throw new Error(result.message || "Search failed");
      }
    } catch (err) {
      console.error("Error searching parts:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePart = async (partId, partCode) => {
    try {
      const response = await fetch(`${API_BASE}/api/kanban-master/${partId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || `HTTP error! status: ${response.status}`
        );
      }

      if (result.success) {
        alert(`Part succesfully deleted`);
        fetchPartsData();
      } else {
        throw new Error(result.message || "Failed to delete part");
      }
    } catch (err) {
      console.error("Error deleting part:", err);
      alert(`Failed to delete part: ${err.message}`);
    }
  };

  // Filter data berdasarkan search
  const filteredData = useMemo(() => {
    if (!keyword) return partsData;

    const searchTerm = keyword.toLowerCase();

    switch (searchBy) {
      case "Vendor":
        return partsData.filter((part) =>
          part.vendor_name?.toLowerCase().includes(searchTerm)
        );
      case "Product Code":
        return partsData.filter((part) =>
          part.part_code?.toLowerCase().includes(searchTerm)
        );
      case "Product Description":
        return partsData.filter((part) =>
          part.part_name?.toLowerCase().includes(searchTerm)
        );
      case "Customers":
        return partsData.filter((part) => {
          if (part.part_types === "Special") {
            const customerName = getCustomerName(part.customer_special);
            return customerName?.toLowerCase().includes(searchTerm);
          }
          return "all customers".includes(searchTerm);
        });
      default:
        return partsData;
    }
  }, [partsData, keyword, searchBy, getCustomerName]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  // Format date untuk display
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

  const getSelectedPlacement = useMemo(() => {
    if (
      !editFormData.placement_id ||
      editFormData.placement_id === "no-placement"
    )
      return null;
    return placements.find(
      (p) => p.id.toString() === editFormData.placement_id.toString()
    );
  }, [editFormData.placement_id, placements]);

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

  const convertToKg = (value, unit) => {
    if (!value || !unit) return 0;

    const numValue = parseFloat(value);

    switch (unit.toLowerCase()) {
      case "g":
        return numValue / 1000;
      case "lbs":
        return numValue * 0.453592;
      case "oz":
        return numValue * 0.0283495;
      case "kg":
        return numValue;
      default:
        return numValue;
    }
  };

  // Fungsi untuk format display
  const formatWeightDisplay = (weight, unit) => {
    if (!weight) return "-";

    const numWeight = parseFloat(weight);
    let displayWeight = numWeight;
    let displayUnit = unit || "kg";

    // Jika gram dan nilai besar, konversi ke kg untuk display
    if (unit === "g" && numWeight >= 1000) {
      displayWeight = numWeight / 1000;
      displayUnit = "kg";
    }

    return `${displayWeight.toLocaleString(undefined, {
      minimumFractionDigits: displayWeight < 1 ? 3 : 1,
      maximumFractionDigits: 3,
    })} ${displayUnit}`;
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
    if (!e || !e.target) return;

    if (type === "primary") {
      e.target.style.backgroundColor = isHover
        ? styles.primaryButtonHover.backgroundColor
        : styles.primaryButton.backgroundColor;
    } else if (type === "search") {
      e.target.style.backgroundColor = isHover
        ? styles.searchButtonHover.backgroundColor
        : styles.searchButton.backgroundColor;
    } else if (type === "pagination") {
      e.target.style.backgroundColor = isHover
        ? styles.paginationButtonHover.backgroundColor
        : styles.paginationButton.backgroundColor;
      e.target.style.color = isHover
        ? styles.paginationButtonHover.color
        : styles.paginationButton.color;
    }
  };

  const handleRowClick = (partId) => {
    if (selectedRowId === partId) {
      setSelectedRowId(null);
    } else {
      setSelectedRowId(partId);
    }
  };

  const handleTabHover = (e, isHover, isActive) => {
    if (!e || !e.target) return;

    if (!isActive) {
      e.target.style.color = isHover
        ? styles.tabButtonHover.color
        : styles.tabButton.color;
    }
  };

  const handleInputFocus = (e) => {
    e.target.style.borderColor = "#9fa8da";
  };

  const handleInputBlur = (e) => {
    e.target.style.borderColor = "#d1d5db";
  };

  const handleSearchByChange = (e) => {
    const value = e.target.value;
    setSearchBy(value);
    setKeyword("");
  };

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
    primaryButtonHover: {
      backgroundColor: "#1d4ed8",
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
      border: "0.5px solid #9fa8da",
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
      backgroundColor: "#93c5fd",
      color: "#1f2937",
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
      backgroundColor: "#1d4ed8",
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
    tooltip: {
      position: "fixed",
      top: tooltip.y,
      left: tooltip.x,

      backgroundColor: "rgba(0, 0, 0, 0.8)",
      color: "white",
      padding: "6px 10px",
      borderRadius: "4px",
      fontSize: "12px",
      fontWeight: "500",
      whiteSpace: "nowrap",
      pointerEvents: "none",
      zIndex: 1000,
      opacity: tooltip.visible ? 1 : 0,
      transition: "opacity 0.2s ease",
      maxWidth: "300px",
      boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
    },

    cellContent: {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },

    popupEditOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(55, 65, 81, 0.6)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2000,
    },
    popupEditContainer: {
      backgroundColor: "white",
      borderRadius: "8px",
      width: "960px",
      maxWidth: "95vw",
      maxHeight: "92vh",
      overflowY: "auto",
      boxShadow: "0 8px 32px rgba(99, 102, 241, 0.18), 0 2px 8px rgba(0,0,0,0.12)",
      border: "1.5px solid #9fa8da",
    },
    popupEditHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: "#e0e7ff",
      borderBottom: "1.5px solid #9fa8da",
      padding: "12px 20px",
      borderRadius: "6px 6px 0 0",
    },
    popupEditTitle: {
      fontSize: "14px",
      fontWeight: "700",
      color: "#374151",
      margin: 0,
      letterSpacing: "0.01em",
    },
    popupEditCloseButton: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "4px",
      borderRadius: "4px",
      color: "#2563eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    popupEditCloseButtonHover: {
      backgroundColor: "#bfdbfe",
      color: "#374151",
    },
    popupEditForm: {
      padding: "20px 24px 0 24px",
    },
    popupEditSection: {
      marginBottom: "16px",
    },
    popupEditSectionTitle: {
      fontSize: "11px",
      fontWeight: "700",
      color: "#2563eb",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      marginBottom: "10px",
      paddingBottom: "5px",
      borderBottom: "1px solid #e0e7ff",
    },
    popupEditGrid3: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: "12px 16px",
    },
    popupEditGrid2: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "12px 16px",
    },
    popupEditFormGroup: {
      marginBottom: "0",
    },
    popupEditLabel: {
      display: "block",
      fontSize: "11px",
      fontWeight: "600",
      color: "#4b5563",
      marginBottom: "4px",
    },
    popupEditInput: {
      width: "100%",
      height: "30px",
      border: "1px solid #9fa8da",
      borderRadius: "4px",
      padding: "0 8px",
      fontSize: "12px",
      backgroundColor: "white",
      fontFamily: "inherit",
      outline: "none",
      color: "#374151",
      boxSizing: "border-box",
    },
    popupEditInputFocus: {
      borderColor: "#2563eb",
    },
    popupEditSelect: {
      width: "100%",
      height: "30px",
      border: "1px solid #9fa8da",
      borderRadius: "4px",
      padding: "0 8px",
      fontSize: "12px",
      backgroundColor: "white",
      fontFamily: "inherit",
      outline: "none",
      color: "#374151",
      cursor: "pointer",
      boxSizing: "border-box",
    },
    popupEditTextarea: {
      width: "100%",
      minHeight: "60px",
      border: "1px solid #9fa8da",
      borderRadius: "4px",
      padding: "6px 8px",
      fontSize: "12px",
      backgroundColor: "white",
      fontFamily: "inherit",
      outline: "none",
      resize: "vertical",
      boxSizing: "border-box",
    },
    popupEditError: {
      color: "#dc2626",
      fontSize: "11px",
      marginTop: "4px",
      fontWeight: "500",
      backgroundColor: "#fef2f2",
      border: "1px solid #fecaca",
      borderRadius: "4px",
      padding: "6px 10px",
    },
    popupEditButtonGroup: {
      display: "flex",
      justifyContent: "flex-end",
      gap: "8px",
      padding: "12px 24px",
      backgroundColor: "#e0e7ff",
      borderTop: "1.5px solid #9fa8da",
      borderRadius: "0 0 6px 6px",
      marginTop: "16px",
    },
    popupEditCancelButton: {
      backgroundColor: "white",
      color: "#374151",
      padding: "6px 16px",
      border: "1px solid #9fa8da",
      borderRadius: "4px",
      fontSize: "12px",
      fontWeight: "600",
      cursor: "pointer",
      fontFamily: "inherit",
    },
    popupEditCancelButtonHover: {
      backgroundColor: "#f3f4f6",
    },
    popupEditSaveButton: {
      backgroundColor: "#2563eb",
      color: "white",
      padding: "6px 18px",
      border: "none",
      borderRadius: "4px",
      fontSize: "12px",
      fontWeight: "600",
      cursor: "pointer",
      fontFamily: "inherit",
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    popupEditSaveButtonHover: {
      backgroundColor: "#1d4ed8",
    },
    popupEditSaveButtonDisabled: {
      backgroundColor: "#93c5fd",
      color: "white",
      padding: "6px 18px",
      border: "none",
      borderRadius: "4px",
      fontSize: "12px",
      fontWeight: "600",
      cursor: "not-allowed",
      fontFamily: "inherit",
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    popupEditLoadingSpinner: {
      width: "14px",
      height: "14px",
      border: "2px solid rgba(255, 255, 255, 0.3)",
      borderRadius: "50%",
      borderTopColor: "white",
      animation: "spin 1s linear infinite",
    },
    editButtonHover: {
      backgroundColor: "#bfdbfe",
    },
    deleteButtonHover: {
      backgroundColor: "#bfdbfe",
    },
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.tooltip}>
        {tooltip.content}
        <div style={styles.tooltipArrow}></div>
      </div>
      <div style={styles.welcomeCard}>
        <div style={styles.combinedHeaderFilter}>
          <div style={styles.headerRow}>
            <h1 style={styles.title}>Part Details</h1>
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
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
              <span style={styles.label}>To</span>
              <input
                type="date"
                style={styles.input}
                placeholder="Date To"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </div>
            <div style={styles.inputGroup}>
              <span style={styles.label}>Search By</span>
              <select
                style={styles.select}
                value={searchBy}
                onChange={handleSearchByChange}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              >
                <option value="Vendor" style={optionStyle}>
                  Vendor
                </option>
                <option value="Product Code" style={optionStyle}>
                  Product Code
                </option>
                <option value="Product Description" style={optionStyle}>
                  Product Description
                </option>
                <option value="Customers" style={optionStyle}>
                  Customers
                </option>
              </select>

              {searchBy === "Vendor" ? (
                // Dropdown untuk Vendor
                <select
                  style={styles.input}
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                >
                  <option value="">Select Vendor</option>
                  {[
                    ...new Set(
                      partsData.map((part) => part.vendor_name).filter(Boolean)
                    ),
                  ].map((vendor) => (
                    <option key={vendor} value={vendor}>
                      {vendor}
                    </option>
                  ))}
                </select>
              ) : searchBy === "Customers" ? (
                // Dropdown untuk Customers
                <select
                  style={styles.input}
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                >
                  <option value="">Select Customer</option>
                  <option value="all customers">All Customers</option>
                  {/* Special Customers dari data yang ada */}
                  {[
                    ...new Set(
                      partsData
                        .filter((part) => part.part_types === "Special")
                        .map((part) => getCustomerName(part.customer_special))
                        .filter(Boolean)
                    ),
                  ].map((customer) => (
                    <option key={customer} value={customer}>
                      {customer}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  style={styles.input}
                  placeholder={`Input ${searchBy} Keyword`}
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
              )}

              <button
                style={styles.button}
                onClick={handleSearchClick}
                disabled={loading}
                onMouseEnter={(e) => handleButtonHover(e, true, "search")}
                onMouseLeave={(e) => handleButtonHover(e, false, "search")}
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </div>
        </div>
        {error && (
          <div
            style={{
              backgroundColor: "#fee2e2",
              border: "1px solid #fecaca",
              color: "#dc2626",
              padding: "12px",
              borderRadius: "4px",
              marginBottom: "16px",
              fontSize: "12px",
            }}
          >
            Error: {error}
          </div>
        )}
        <div style={styles.actionButtonsGroup}>
          <button
            style={{ ...styles.button, ...styles.primaryButton }}
            onMouseEnter={(e) => handleButtonHover(e, true, "search")}
            onMouseLeave={(e) => handleButtonHover(e, false, "search")}
            onClick={() => navigate("/part-details/add")}
          >
            <Plus size={16} />
            Create
          </button>
        </div>
        {loading && (
          <div
            style={{
              textAlign: "center",
              padding: "20px",
              fontSize: "14px",
              color: "#6b7280",
            }}
          >
            Loading parts data...
          </div>
        )}

        {!loading && (
          <div style={styles.tableContainer}>
            <div style={styles.tableBodyWrapper}>
              <table
                style={{
                  ...styles.table,
                  minWidth: "1800px",
                  tableLayout: "fixed",
                }}
              >
                <colgroup>
                  <col style={{ width: "3%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "7%" }} />
                  <col style={{ width: "25%" }} />
                  <col style={{ width: "8%" }} />
                </colgroup>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.expandedTh}>No</th>
                    <th style={styles.thWithLeftBorder}>Part Code</th>
                    <th style={styles.thWithLeftBorder}>Part Name</th>
                    <th style={styles.thWithLeftBorder}>Part Size</th>
                    <th style={styles.thWithLeftBorder}>QTY Per Box</th>
                    <th style={styles.thWithLeftBorder}>Part Material</th>
                    <th style={styles.thWithLeftBorder}>Part Types</th>
                    <th style={styles.thWithLeftBorder}>Part Placement</th>
                    <th style={styles.thWithLeftBorder}>Part Weight</th>
                    <th style={styles.thWithLeftBorder}>Customer</th>
                    <th style={styles.thWithLeftBorder}>Model</th>
                    <th style={styles.thWithLeftBorder}>Vendor</th>
                    <th style={styles.thWithLeftBorder}>Vendor Types</th>
                    <th style={styles.thWithLeftBorder}>Stock Level To</th>
                    <th style={styles.thWithLeftBorder}>Station</th>
                    <th style={styles.thWithLeftBorder}>QTY/Assembly</th>
                    <th style={styles.thWithLeftBorder}>Created By</th>
                    <th style={styles.thWithLeftBorder}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.length === 0 ? (
                    <tr></tr>
                  ) : (
                    currentData.map((part, index) => {
                      // Cek apakah row ini sedang dipilih
                      const isSelected = selectedRowId === part.id;

                      return (
                        <tr
                          key={part.id}
                          // Tambahkan onClick handler
                          onClick={() => handleRowClick(part.id)}
                          // Style untuk row yang dipilih
                          style={{
                            cursor: "pointer",
                            backgroundColor: isSelected
                              ? "#c7cde8"
                              : "transparent",
                            transition: "background-color 0.2s ease",
                          }}
                          // Hover effect hanya jika tidak dipilih
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = "#c7cde8";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor =
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
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </td>
                          <td
                            style={styles.tdWithLeftBorder}
                            title={part.part_code}
                          >
                            {part.part_code}
                          </td>
                          <td
                            style={styles.tdWithLeftBorder}
                            title={part.part_name}
                          >
                            {part.part_name}
                          </td>
                          <td
                            style={styles.tdWithLeftBorder}
                            title={part.part_size}
                          >
                            {part.part_size}
                          </td>
                          <td
                            style={styles.tdWithLeftBorder}
                            title={part.qty_per_box}
                          >
                            {part.qty_per_box}
                          </td>
                          <td
                            style={styles.tdWithLeftBorder}
                            title={part.part_material || "-"}
                          >
                            {part.part_material || "-"}
                          </td>
                          <td
                            style={styles.tdWithLeftBorder}
                            title={part.part_types}
                          >
                            {part.part_types}
                          </td>
                          <td style={styles.tdWithLeftBorder}>
                            {part.placement_name || "No Placement"}
                          </td>
                          <td
                            style={styles.tdWithLeftBorder}
                            title={part.part_weight}
                          >
                            {part.part_weight ? (
                              <div>
                                <div style={{ textAlign: "right" }}>
                                  {(() => {
                                    const weight = parseFloat(part.part_weight);
                                    if (Number.isInteger(weight)) {
                                      return weight.toLocaleString();
                                    } else {
                                      return weight.toLocaleString(undefined, {
                                        minimumFractionDigits: 1,
                                        maximumFractionDigits: 3,
                                      });
                                    }
                                  })()}{" "}
                                  {part.weight_unit || "kg"}
                                </div>
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td
                            style={styles.tdWithLeftBorder}
                            title={part.cust_name}
                          >
                            {part.part_types === "Special" ? (
                              <div
                                title={getCustomerName(part.customer_special)}
                              >
                                <div>
                                  {getCustomerName(part.customer_special)
                                    .length > 25
                                    ? getCustomerName(
                                      part.customer_special
                                    ).substring(0, 25) + "..."
                                    : getCustomerName(part.customer_special)}
                                </div>
                              </div>
                            ) : (
                              <span>All Customers</span>
                            )}
                          </td>
                          <td style={styles.tdWithLeftBorder}>{part.model}</td>
                          <td style={styles.tdWithLeftBorder}>
                            {part.vendor_name || "-"}
                          </td>
                          <td style={styles.tdWithLeftBorder}>
                            {part.vendor_type || "-"}
                          </td>
                          <td style={styles.tdWithLeftBorder}>
                            {part.stock_level_to}
                          </td>
                          <td
                            style={styles.tdWithLeftBorder}
                            title={part.assembly_station ? part.assembly_station.toUpperCase() : "-"}
                          >
                            {part.assembly_station ? part.assembly_station.toUpperCase() : "-"}
                          </td>
                          <td
                            style={styles.tdWithLeftBorder}
                            title={part.qty_per_assembly || 1}
                          >
                            {part.qty_per_assembly || 1}
                          </td>
                          <td style={styles.tdWithLeftBorder}>
                            {part.created_by_name || "System"} |{" "}
                            {formatDateForDisplay(part.created_at)}
                          </td>
                          <td style={styles.tdWithLeftBorder}>
                            <button
                              style={styles.editButton}
                              onClick={(e) => {
                                e.stopPropagation(); // Penting: mencegah trigger row click
                                handleEditClick(part);
                              }}
                              title="Edit"
                              onMouseEnter={(e) =>
                              (e.target.style.backgroundColor =
                                styles.editButtonHover.backgroundColor)
                              }
                              onMouseLeave={(e) =>
                              (e.target.style.backgroundColor =
                                styles.editButton.backgroundColor)
                              }
                            >
                              <Pencil size={10} />
                            </button>
                            <button
                              style={styles.deleteButton}
                              onClick={(e) => {
                                e.stopPropagation(); // Penting: mencegah trigger row click
                                handleDeletePart(part.id, part.part_code);
                              }}
                              title="Delete"
                              onMouseEnter={(e) =>
                              (e.target.style.backgroundColor =
                                styles.deleteButtonHover.backgroundColor)
                              }
                              onMouseLeave={(e) =>
                              (e.target.style.backgroundColor =
                                styles.deleteButton.backgroundColor)
                              }
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
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1 || filteredData.length === 0}
                  onMouseEnter={(e) => handleButtonHover(e, true, "pagination")}
                  onMouseLeave={(e) =>
                    handleButtonHover(e, false, "pagination")
                  }
                >
                  {"<<"}
                </button>
                <button
                  style={styles.paginationButton}
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1 || filteredData.length === 0}
                  onMouseEnter={(e) => handleButtonHover(e, true, "pagination")}
                  onMouseLeave={(e) =>
                    handleButtonHover(e, false, "pagination")
                  }
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
                    if (page >= 1 && page <= totalPages) {
                      setCurrentPage(page);
                    }
                  }}
                // disabled={filteredData.length === 0}
                />
                <span>of {totalPages}</span>
                <button
                  style={styles.paginationButton}
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={
                    currentPage === totalPages || filteredData.length === 0
                  }
                  onMouseEnter={(e) => handleButtonHover(e, true, "pagination")}
                  onMouseLeave={(e) =>
                    handleButtonHover(e, false, "pagination")
                  }
                >
                  {">"}
                </button>
                <button
                  style={styles.paginationButton}
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={
                    currentPage === totalPages || filteredData.length === 0
                  }
                  onMouseEnter={(e) => handleButtonHover(e, true, "pagination")}
                  onMouseLeave={(e) =>
                    handleButtonHover(e, false, "pagination")
                  }
                >
                  {">>"}
                </button>
              </div>
              <div style={{ fontSize: "12px", color: "#374151" }}>
                Total Row : {filteredData.length}
              </div>
            </div>
          </div>
        )}
        {/* Popup Edit Vendor Detail (existing) */}
        {addVendorDetail && (
          <div style={styles.popupOverlay}>
            <div style={styles.popupContainer}>
              <div style={styles.popupHeader}>
                <h3 style={styles.popupTitle}>Add Vendor Detail</h3>
                <button
                  style={styles.closeButton}
                  onClick={() => setAddVendorDetail(false)}
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddVendorSubmit}>
                <div style={styles.formGroup}>
                  <label style={styles.labelPopUp}>Trip</label>
                  <select
                    style={styles.inputPopUp}
                    value={addVendorFormData.partCode}
                    onChange={(e) =>
                      handleAddVendorInputChange("partCode", e.target.value)
                    }
                    required
                  >
                    <option value="">Select Trip</option>
                    <option value="Trip-01">Trip-01</option>
                    <option value="Trip-02">Trip-02</option>
                    <option value="Trip-03">Trip-03</option>
                    <option value="Trip-04">Trip-04</option>
                    <option value="Trip-05">Trip-05</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.labelPopUp}>Vendor Name</label>
                  <select
                    style={styles.inputPopUp}
                    value={addVendorFormData.partName}
                    onChange={(e) =>
                      handleAddVendorInputChange("partName", e.target.value)
                    }
                    required
                  >
                    <option value="">Select Vendor</option>
                    <option value="188646 - PT. DAIHO INDONESIA">
                      188646 - PT. DAIHO INDONESIA
                    </option>
                    <option value="188651 - PT SAT NUSAPERSADA TBK">
                      188651 - PT SAT NUSAPERSADA TBK
                    </option>
                    <option value="199869 - PT PRIMA LABELING">
                      199869 - PT PRIMA LABELING
                    </option>
                    <option value="192447 - SANSYU PRECISION SINGAPORE PTE LTD">
                      192447 - SANSYU PRECISION SINGAPORE PTE LTD
                    </option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.labelPopUp}>DO Number</label>
                  <input
                    style={styles.inputPopUpDO}
                    onChange={(e) =>
                      handleAddVendorInputChange("", e.target.value)
                    }
                    placeholder=""
                    min="1"
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.labelPopUp}>Arrival Time</label>
                  <input
                    type="time"
                    style={styles.input}
                    value={addVendorFormData.quantity}
                    onChange={(e) =>
                      handleAddVendorInputChange("quantity", e.target.value)
                    }
                    placeholder=""
                  />
                </div>
                <div style={styles.buttonGroup}>
                  <button
                    type="button"
                    style={styles.cancelButton}
                    onClick={() => setAddVendorDetail(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" style={styles.submitButton}>
                    Add
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Popup Edit Part */}
        {showEditPopup && (
          <div style={styles.popupEditOverlay}>
            <div style={styles.popupEditContainer}>

              {/* Header */}
              <div style={styles.popupEditHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    width: "4px", height: "20px",
                    backgroundColor: "#2563eb", borderRadius: "2px",
                  }} />
                  <h2 style={styles.popupEditTitle}>
                    Edit Part &nbsp;
                    <span style={{ color: "#2563eb", fontWeight: "800" }}>
                      {editingPart?.part_code}
                    </span>
                    <span style={{
                      marginLeft: "10px", fontSize: "11px", fontWeight: "500",
                      color: "#6b7280", backgroundColor: "#f3f4f6",
                      border: "1px solid #d1d5db", borderRadius: "4px",
                      padding: "2px 8px",
                    }}>
                      {editingPart?.part_name}
                    </span>
                  </h2>
                </div>
                <button
                  style={styles.popupEditCloseButton}
                  onClick={handleCloseEditPopup}
                  title="Close"
                  onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    styles.popupEditCloseButtonHover.backgroundColor)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <X size={16} />
                </button>
              </div>

              <form
                onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }}
              >
                <div style={styles.popupEditForm}>

                  {/* ── Section 1: Part Information ── */}
                  <div style={styles.popupEditSection}>
                    <div style={styles.popupEditSectionTitle}>Part Information</div>
                    <div style={styles.popupEditGrid3}>
                      <div style={styles.popupEditFormGroup}>
                        <label style={styles.popupEditLabel}>Part Code *</label>
                        <input
                          type="text"
                          name="part_code"
                          value={editFormData.part_code}
                          onChange={handleEditFormChange}
                          style={styles.popupEditInput}
                          placeholder="Enter part code"
                          required
                        />
                      </div>
                      <div style={{ ...styles.popupEditFormGroup, gridColumn: "span 2" }}>
                        <label style={styles.popupEditLabel}>Part Name *</label>
                        <input
                          type="text"
                          name="part_name"
                          value={editFormData.part_name}
                          onChange={handleEditFormChange}
                          style={styles.popupEditInput}
                          placeholder="Enter part name"
                          required
                        />
                      </div>
                      <div style={styles.popupEditFormGroup}>
                        <label style={styles.popupEditLabel}>Part Size *</label>
                        <select
                          name="part_size"
                          value={editFormData.part_size}
                          onChange={handleEditFormChange}
                          style={styles.popupEditSelect}
                          required
                        >
                          <option value="">Select Size</option>
                          {partSizes.map((size) => (
                            <option key={size.id} value={size.size_name}>
                              {size.size_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div style={styles.popupEditFormGroup}>
                        <label style={styles.popupEditLabel}>Part Material</label>
                        <input
                          type="text"
                          name="part_material"
                          value={editFormData.part_material}
                          onChange={handleEditFormChange}
                          style={styles.popupEditInput}
                          placeholder="Enter material"
                        />
                      </div>
                      <div style={styles.popupEditFormGroup}>
                        <label style={styles.popupEditLabel}>Part Types</label>
                        <select
                          name="part_types"
                          value={editFormData.part_types}
                          onChange={handleEditFormChange}
                          style={styles.popupEditSelect}
                        >
                          <option value="Regular">REGULAR</option>
                          <option value="Special">SPECIAL</option>
                        </select>
                      </div>
                      {editFormData.part_types === "Special" && (
                        <div style={{ ...styles.popupEditFormGroup, gridColumn: "span 3" }}>
                          <label style={styles.popupEditLabel}>Customer *</label>
                          <select
                            name="customer_id"
                            value={editFormData.customer_id}
                            onChange={handleEditFormChange}
                            style={styles.popupEditSelect}
                            required={editFormData.part_types === "Special"}
                          >
                            <option value="">Select Customer</option>
                            {customers.map((customer) => (
                              <option key={customer.id} value={customer.id}>
                                {customer.mat_code} | {customer.cust_name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Section 2: Specs & Vendor ── */}
                  <div style={styles.popupEditSection}>
                    <div style={styles.popupEditSectionTitle}>Specs & Vendor</div>
                    <div style={styles.popupEditGrid3}>
                      <div style={styles.popupEditFormGroup}>
                        <label style={styles.popupEditLabel}>QTY Per Box</label>
                        <input
                          type="number"
                          name="qty_per_box"
                          value={editFormData.qty_per_box}
                          onChange={handleEditFormChange}
                          style={styles.popupEditInput}
                          placeholder="1"
                          min="1"
                        />
                      </div>
                      <div style={styles.popupEditFormGroup}>
                        <label style={styles.popupEditLabel}>Part Price (USD)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          name="part_price"
                          value={editFormData.part_price}
                          onChange={handleEditFormChange}
                          style={styles.popupEditInput}
                          placeholder="0.00"
                        />
                      </div>
                      <div style={styles.popupEditFormGroup}>
                        <label style={styles.popupEditLabel}>Part Weight</label>
                        <div style={{ display: "flex", gap: "4px" }}>
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            name="part_weight"
                            value={editFormData.part_weight}
                            onChange={handleEditFormChange}
                            style={{ ...styles.popupEditInput, flex: 1 }}
                            placeholder="0"
                          />
                          <select
                            name="weight_unit"
                            value={editFormData.weight_unit}
                            onChange={handleEditFormChange}
                            style={{ ...styles.popupEditSelect, width: "60px", flex: "none" }}
                          >
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                            <option value="lbs">lbs</option>
                            <option value="oz">oz</option>
                          </select>
                        </div>
                      </div>
                      <div style={styles.popupEditFormGroup}>
                        <label style={styles.popupEditLabel}>Model *</label>
                        <select
                          name="model"
                          value={editFormData.model}
                          onChange={handleEditFormChange}
                          style={styles.popupEditSelect}
                          required
                        >
                          <option value="">Select Model</option>
                          {models.map((model, idx) => (
                            <option key={idx} value={model}>{model}</option>
                          ))}
                        </select>
                      </div>
                      <div style={styles.popupEditFormGroup}>
                        <label style={styles.popupEditLabel}>Vendor *</label>
                        <select
                          name="vendor_id"
                          value={editFormData.vendor_id}
                          onChange={handleEditFormChange}
                          style={styles.popupEditSelect}
                          required
                        >
                          <option value="">Select Vendor</option>
                          {vendors.map((vendor) => (
                            <option key={vendor.id} value={vendor.id}>
                              {vendor.vendor_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div style={styles.popupEditFormGroup}>
                        <label style={styles.popupEditLabel}>Vendor Types</label>
                        <input
                          type="text"
                          style={{
                            ...styles.popupEditInput,
                            backgroundColor: "#f3f4f6",
                            cursor: "not-allowed",
                            color: "#6b7280",
                          }}
                          value={editFormData.vendor_type}
                          readOnly
                          placeholder="Auto from vendor"
                        />
                      </div>
                      <div style={{ ...styles.popupEditFormGroup, gridColumn: "span 3" }}>
                        <label style={styles.popupEditLabel}>Stock Level To *</label>
                        <select
                          name="stock_level_to"
                          value={editFormData.stock_level_to}
                          onChange={handleEditFormChange}
                          style={{ ...styles.popupEditSelect, width: "calc(33.33% - 6px)" }}
                          required
                        >
                          <option value="">Select Stock Level</option>
                          {stockLevels.map((level, idx) => (
                            <option key={idx} value={level.value}>{level.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* ── Section 3: Placement & Assembly ── */}
                  <div style={styles.popupEditSection}>
                    <div style={styles.popupEditSectionTitle}>Placement & Assembly</div>
                    <div style={styles.popupEditGrid3}>
                      <div style={styles.popupEditFormGroup}>
                        <label style={styles.popupEditLabel}>Placement</label>
                        <select
                          name="placement_id"
                          value={editFormData.placement_id || ""}
                          onChange={handleEditFormChange}
                          style={styles.popupEditSelect}
                        >
                          <option value="">Select Placement</option>
                          <option value="no-placement">No Placement</option>
                          {placements
                            .filter((p) => p.is_active)
                            .map((placement) => (
                              <option key={placement.id} value={placement.id}>
                                {placement.placement_name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div style={styles.popupEditFormGroup}>
                        <label style={styles.popupEditLabel}>Assembly Station</label>
                        <select
                          name="assembly_station"
                          value={editFormData.assembly_station}
                          onChange={handleEditFormChange}
                          style={styles.popupEditSelect}
                        >
                          <option value="">Select Station</option>
                          <option value="subCr">SUBCR</option>
                          <option value="tpu1">TPU1</option>
                          <option value="tpu2">TPU2</option>
                          <option value="cr1">CR1</option>
                          <option value="cr2">CR2</option>
                          <option value="cradj">CRADJ</option>
                          <option value="m1">M1</option>
                          <option value="m2">M2</option>
                          <option value="ft">FT</option>
                          <option value="acc">ACC</option>
                          <option value="packing">PACKING</option>
                        </select>
                      </div>
                      <div style={styles.popupEditFormGroup}>
                        <label style={styles.popupEditLabel}>QTY Per Assembly</label>
                        <input
                          type="number"
                          name="qty_per_assembly"
                          value={editFormData.qty_per_assembly}
                          onChange={handleEditFormChange}
                          style={styles.popupEditInput}
                          placeholder="1"
                          min="1"
                        />
                      </div>
                      <div style={styles.popupEditFormGroup}>
                        <label style={styles.popupEditLabel}>Length (cm)</label>
                        <input
                          type="text"
                          style={{
                            ...styles.popupEditInput,
                            backgroundColor: "#f3f4f6",
                            cursor: "not-allowed",
                            color: "#6b7280",
                          }}
                          value={
                            editFormData.placement_id === "no-placement" || !editFormData.placement_id
                              ? "-"
                              : getSelectedPlacement
                                ? `${getSelectedPlacement.length_cm} cm`
                                : ""
                          }
                          readOnly
                        />
                      </div>
                      <div style={styles.popupEditFormGroup}>
                        <label style={styles.popupEditLabel}>Width (cm)</label>
                        <input
                          type="text"
                          style={{
                            ...styles.popupEditInput,
                            backgroundColor: "#f3f4f6",
                            cursor: "not-allowed",
                            color: "#6b7280",
                          }}
                          value={
                            editFormData.placement_id === "no-placement" || !editFormData.placement_id
                              ? "-"
                              : getSelectedPlacement
                                ? `${getSelectedPlacement.width_cm} cm`
                                : ""
                          }
                          readOnly
                        />
                      </div>
                      <div style={styles.popupEditFormGroup}>
                        <label style={styles.popupEditLabel}>Height (cm)</label>
                        <input
                          type="text"
                          style={{
                            ...styles.popupEditInput,
                            backgroundColor: "#f3f4f6",
                            cursor: "not-allowed",
                            color: "#6b7280",
                          }}
                          value={
                            editFormData.placement_id === "no-placement" || !editFormData.placement_id
                              ? "-"
                              : getSelectedPlacement
                                ? `${getSelectedPlacement.height_cm} cm`
                                : ""
                          }
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  {/* Error */}
                  {editError && (
                    <div style={styles.popupEditError}>⚠ {editError}</div>
                  )}

                </div>

                {/* Footer Buttons */}
                <div style={styles.popupEditButtonGroup}>
                  <button
                    type="button"
                    style={styles.popupEditCancelButton}
                    onClick={handleCloseEditPopup}
                    disabled={editLoading}
                    onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      styles.popupEditCancelButtonHover.backgroundColor)
                    }
                    onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      styles.popupEditCancelButton.backgroundColor)
                    }
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={
                      editLoading
                        ? styles.popupEditSaveButtonDisabled
                        : styles.popupEditSaveButton
                    }
                    disabled={editLoading}
                    onMouseEnter={(e) => {
                      if (!editLoading)
                        e.currentTarget.style.backgroundColor =
                          styles.popupEditSaveButtonHover.backgroundColor;
                    }}
                    onMouseLeave={(e) => {
                      if (!editLoading)
                        e.currentTarget.style.backgroundColor =
                          styles.popupEditSaveButton.backgroundColor;
                    }}
                  >
                    {editLoading ? (
                      <>
                        <div style={styles.popupEditLoadingSpinner}></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={14} />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default PartDetailsPage;