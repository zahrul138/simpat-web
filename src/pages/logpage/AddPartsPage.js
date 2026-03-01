"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Save } from "lucide-react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

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

const getCurrentUserId = () => {
  try {
    const authUser = JSON.parse(localStorage.getItem("auth_user") || "null");
    return authUser?.id || null;
  } catch {
    return null;
  }
};

const AddPartsPage = () => {
  const navigate = useNavigate();

  const [partFormData, setPartFormData] = useState({
    part_code: "",
    part_name: "",
    part_size: "",
    part_material: "",
    part_types: "",
    qty_per_box: "",
    part_price: "",
    placement_id: "",
    customer_ids: [],
    model: "",
    vendor_id: "",
    stock_level_to: "",
    part_weight: "",
    weight_unit: "kg",
    assembly_station: "",
    qty_per_assembly: 1,
  });

  const [customers, setCustomers] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [models, setModels] = useState([]);
  const [stockLevels, setStockLevels] = useState([
    { value: "M101 | SCN-MH", label: "M101 | SCN-MH" },
    { value: "M136 | SCN-LOG", label: "M136 | SCN-LOG" },
  ]);
  const [partSizes, setPartSizes] = useState([]);
  const [selectedVendorType, setSelectedVendorType] = useState("");
  const [tempParts, setTempParts] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [currentEmpName, setCurrentEmpName] = useState("");
  const [currentEmpId, setCurrentEmpId] = useState(null);
  const [showSaveButton, setShowSaveButton] = useState(false);
  const [placements, setPlacements] = useState([]);
  const [selectedPlacement, setSelectedPlacement] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const generateRandomPartId = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
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
        // 🔥 UBAH: Sort berdasarkan ID secara ASCENDING (1, 2, 3, ...)
        const sortedVendors = [...data.data].sort((a, b) => a.id - b.id);
        setVendors(sortedVendors);
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

  const fetchPartSizesWithKanban = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/masters/part-sizes-with-kanban`
      );
      const data = await response.json();

      if (data.success) {
        const formattedSizes = data.data.map((item) => ({
          id: item.id,
          size_name: item.size_name,
          description: item.description,
          total_parts: item.total_parts || 0,
          has_associated_part: item.has_associated_part,
          master_kanban_id: item.master_kanban_id,
          vendor_name: item.vendor_name,
        }));
        setPartSizes(formattedSizes);
      } else {
        await fetchPartSizes();
      }
    } catch (error) {
      console.error("Error fetching part sizes with kanban:", error);
      await fetchPartSizes();
    }
  };

  const fetchPartSizes = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/masters/part-sizes`);
      const data = await response.json();

      if (data.success) {
        if (Array.isArray(data.data) && data.data.length > 0) {
          if (typeof data.data[0] === "string") {
            setPartSizes(data.data);
          } else {
            setPartSizes(
              data.data.map((item) => ({
                size_name: item.size_name || item.name || item,
                total_parts: item.total_parts || 0,
                id: item.id,
              }))
            );
          }
        } else {
          setPartSizes([
            { size_name: "SMALL", total_parts: 0 },
            { size_name: "MEDIUM", total_parts: 0 },
            { size_name: "LARGE", total_parts: 0 },
          ]);
        }
      } else {
        setPartSizes([
          { size_name: "SMALL", total_parts: 0 },
          { size_name: "MEDIUM", total_parts: 0 },
          { size_name: "LARGE", total_parts: 0 },
        ]);
      }
    } catch (error) {
      console.error("Error fetching part sizes:", error);
      setPartSizes([
        { size_name: "SMALL", total_parts: 0 },
        { size_name: "MEDIUM", total_parts: 0 },
        { size_name: "LARGE", total_parts: 0 },
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

  const fetchAllData = async () => {
    try {
      await Promise.all([
        fetchCustomers(),
        fetchVendors(),
        fetchModels(),
        fetchPartSizesWithKanban(),
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchAllData();
    setCurrentEmpName(getCurrentUser());
    setCurrentEmpId(getCurrentUserId());
    fetchPlacements();
  }, []);

  const handlePlacementChange = (e) => {
    const placementId = e.target.value;

    if (placementId === "no-placement") {
      handlePartInputChange("placement_id", null);
      setSelectedPlacement(null);
    } else {
      handlePartInputChange("placement_id", placementId);
      const placement = placements.find((p) => p.id.toString() === placementId);
      setSelectedPlacement(placement);
    }
  };

  const handlePartInputChange = (field, value) => {
    const newFormData = {
      ...partFormData,
      [field]: value,
    };

    if (field === "vendor_id") {
      const selectedVendor = vendors.find((v) => v.id.toString() === value);
      if (selectedVendor) {
        setSelectedVendorType(selectedVendor.types);
      } else {
        setSelectedVendorType("");
      }
    }

    if (field === "part_types") {
      if (value === "Regular") {
        newFormData.customer_ids = [];
        setSelectedCustomers([]);
      } else if (value === "Special") {
        newFormData.customer_ids = [];
        setSelectedCustomers([]);
      }
    }

    setPartFormData(newFormData);
  };

  const handleInsertToTemp = () => {
    if (!partFormData.part_code.trim()) {
      alert("Please fill in Part Code");
      return;
    }

    if (!partFormData.part_name.trim()) {
      alert("Please fill in Part Name");
      return;
    }

    const missingFields = [];

    if (!partFormData.part_size) {
      missingFields.push("Part Size");
    }

    if (!partFormData.part_types) {
      missingFields.push("Part Types");
    }

    if (partFormData.part_types === "Special") {
      if (selectedCustomers.length === 0) {
        missingFields.push(
          "Customer (Special part requires at least one customer)"
        );
      }
    }

    if (!partFormData.model) {
      missingFields.push("Model");
    }

    if (!partFormData.vendor_id) {
      missingFields.push("Vendor");
    }

    if (!partFormData.stock_level_to) {
      missingFields.push("Stock Level To");
    }

    // Placement tidak wajib lagi (optional)
    // if (!partFormData.placement_id) {
    //   missingFields.push("Placement Name");
    // }

    if (missingFields.length > 0) {
      const errorMessage =
        missingFields.length === 1
          ? `Please select ${missingFields[0]}`
          : `Please select the following options:\n- ${missingFields.join(
              "\n- "
            )}`;

      alert(errorMessage);
      return;
    }

    const selectedVendor = vendors.find(
      (v) => v.id.toString() === partFormData.vendor_id
    );

    const selectedPlacementObj =
      partFormData.placement_id && partFormData.placement_id !== "no-placement"
        ? placements.find((p) => p.id.toString() === partFormData.placement_id)
        : null;

    const vendorIdNum = partFormData.vendor_id
      ? parseInt(partFormData.vendor_id)
      : null;

    const placementIdNum =
      partFormData.placement_id && partFormData.placement_id !== "no-placement"
        ? parseInt(partFormData.placement_id)
        : null;
    const customerNames =
      selectedCustomers.length > 0
        ? selectedCustomers
            .map((c) => `${c.mat_code} | ${c.cust_name}`)
            .join(", ")
        : "All Customers";

    const tempPart = {
      id: Date.now(),
      part_code: partFormData.part_code.trim(),
      part_name: partFormData.part_name.trim(),
      part_size: partFormData.part_size,
      part_material: partFormData.part_material.trim(),
      part_types: partFormData.part_types,
      qty_per_box: parseInt(partFormData.qty_per_box) || 1,
      part_price: parseFloat(partFormData.part_price) || 0,
      part_weight: parseFloat(partFormData.part_weight) || null,
      weight_unit: partFormData.weight_unit || "kg",
      customer_ids: partFormData.customer_ids || [],
      placement_id: placementIdNum,
      placement_name: selectedPlacementObj?.placement_name || "No Placement",
      placement_length: selectedPlacementObj?.length_cm || "",
      placement_width: selectedPlacementObj?.width_cm || "",
      placement_height: selectedPlacementObj?.height_cm || "",
      customer_names: customerNames,
      model: partFormData.model,
      vendor_id: vendorIdNum,
      vendor_name: selectedVendor?.vendor_name,
      vendor_type: selectedVendor?.types,
      stock_level_to: partFormData.stock_level_to,
      assembly_station: partFormData.assembly_station || null,
      qty_per_assembly: parseInt(partFormData.qty_per_assembly) || 1,
      unit: "PCS",
      is_active: true,
      created_at: new Date().toISOString(),
      isSelected: false,
    };

    setTempParts((prev) => [...prev, tempPart]);

    resetForm();
  };

  const handleSelectAllChange = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setTempParts((prev) =>
      prev.map((part) => ({
        ...part,
        isSelected: newSelectAll,
      }))
    );
  };

  const handleCheckboxChange = (partId) => {
    setTempParts((prev) =>
      prev.map((part) =>
        part.id === partId ? { ...part, isSelected: !part.isSelected } : part
      )
    );
  };

  useEffect(() => {
    if (tempParts.length > 0) {
      const allSelected = tempParts.every((part) => part.isSelected);
      setSelectAll(allSelected);
    } else {
      setSelectAll(false);
    }
    setShowSaveButton(tempParts.length > 0);
  }, [tempParts]);

  const handleDeleteTempPart = (partId) => {
    setTempParts((prev) => prev.filter((part) => part.id !== partId));
  };

  const resetForm = () => {
    setPartFormData({
      part_code: "",
      part_name: "",
      part_size: "",
      part_material: "",
      part_types: "",
      qty_per_box: "",
      part_price: "",
      part_weight: "",
      weight_unit: "kg",
      customer_ids: [],
      model: "",
      vendor_id: "",
      stock_level_to: "",
      placement_id: "",
      assembly_station: "",
      qty_per_assembly: 1,
    });
    setSelectedCustomers([]);
    setSelectedPlacement(null);
    setSelectedVendorType("");
  };

  const handleSaveConfiguration = async () => {
    if (isSaving) {
      console.log("Already saving, please wait...");
      return;
    }

    const selectedParts = tempParts.filter((part) => part.isSelected);

    if (selectedParts.length === 0) {
      alert("Please select at least one part to save!");
      return;
    }

    try {
      setIsSaving(true);

      const currentUserId = getCurrentUserId();
      let successCount = 0;
      let errorMessages = [];

      for (const part of selectedParts) {
        try {
          if (
            !part.part_code ||
            !part.part_name ||
            !part.vendor_id ||
            !part.part_size ||
            !part.model ||
            !part.stock_level_to
          ) {
            throw new Error(
              `Missing required fields for part ${part.part_code}`
            );
          }

          const checkDuplicate = await fetch(
            `${API_BASE}/api/kanban-master/by-part-code?part_code=${part.part_code}`
          );
          const duplicateResult = await checkDuplicate.json();

          if (duplicateResult.item) {
            throw new Error(`Part code ${part.part_code} already exists`);
          }

          const selectedSize = partSizes.find(
            (size) => size.size_name === part.part_size
          );

          const partData = {
            part_code: part.part_code,
            part_name: part.part_name,
            part_size: part.part_size,
            size_id: selectedSize ? parseInt(selectedSize.id) : null,
            part_material: part.part_material || null,
            part_types: part.part_types,
            qty_per_box: parseInt(part.qty_per_box) || 1,
            part_price: parseFloat(part.part_price) || 0,
            part_weight: part.part_weight ? parseFloat(part.part_weight) : null,
            weight_unit: part.weight_unit || "kg",
            customer_special:
              part.customer_ids && part.customer_ids.length > 0
                ? part.customer_ids.map((id) => parseInt(id))
                : null,
            model: part.model,
            vendor_id: parseInt(part.vendor_id),
            vendor_type: part.vendor_type,
            stock_level_to: part.stock_level_to,
            unit: part.unit || "PCS",
            created_by: currentUserId ? parseInt(currentUserId) : null,
            placement_id: part.placement_id
              ? parseInt(part.placement_id)
              : null,
            assembly_station: part.assembly_station || null,
            qty_per_assembly: parseInt(part.qty_per_assembly) || 1,
          };

          console.log("Saving part:", partData);

          await new Promise((resolve) => setTimeout(resolve, 100));

          const response = await fetch(`${API_BASE}/api/kanban-master`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(partData),
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(
              result.message || `HTTP error! status: ${response.status}`
            );
          }

          if (!result.success) {
            throw new Error(result.message || "Failed to save part");
          }

          successCount++;
        } catch (error) {
          console.error(`Error saving part ${part.part_code}:`, error);
          errorMessages.push(`Part ${part.part_code}: ${error.message}`);
        }
      }

      if (errorMessages.length > 0) {
        alert(
          `Successfully saved ${successCount} part(s). Errors:\n${errorMessages.join(
            "\n"
          )}`
        );
      } else {
        alert(`Parts successfully saved`);
        resetForm();
        setTempParts((prev) =>
          prev.filter((part) => !selectedParts.includes(part))
        );
        navigate("/part-details");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert(`Failed to save parts: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Fungsi untuk menambah customer ke list
  const handleAddCustomer = (customerId) => {
    if (!customerId) return;

    const customer = customers.find(
      (c) => c.id.toString() === customerId.toString()
    );
    if (!customer) return;

    // Cek apakah customer sudah dipilih
    if (
      selectedCustomers.some((c) => c.id.toString() === customerId.toString())
    ) {
      alert("Customer already selected!");
      return;
    }

    const newSelectedCustomers = [...selectedCustomers, customer];
    setSelectedCustomers(newSelectedCustomers);

    // Update partFormData
    const newCustomerIds = newSelectedCustomers.map((c) => c.id);
    setPartFormData({
      ...partFormData,
      customer_ids: newCustomerIds,
    });
  };

  const handleRemoveCustomer = (customerId) => {
    const newSelectedCustomers = selectedCustomers.filter(
      (c) => c.id.toString() !== customerId.toString()
    );
    setSelectedCustomers(newSelectedCustomers);

    const newCustomerIds = newSelectedCustomers.map((c) => c.id);
    setPartFormData({
      ...partFormData,
      customer_ids: newCustomerIds,
    });
  };

  const handleClearAllCustomers = () => {
    setSelectedCustomers([]);
    setPartFormData({
      ...partFormData,
      customer_ids: [],
    });
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

  return (
    <div style={styles.pageContainer}>
      <div style={styles.welcomeCard}>
        <div style={styles.gridContainer}>
          <div style={styles.card}>
            <div style={{ marginBottom: "24px" }}>
              <h2 style={styles.h2}>Add Part Details</h2>
            </div>
            <div
              style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}
            >
              {/* Kolom 1 */}
              <div style={{ flex: "2", display: "grid", gap: "35px" }}>
                <div>
                  <label style={styles.label}>Part Code</label>
                  <input
                    type="text"
                    style={styles.inputPartCode}
                    placeholder="Enter part code"
                    value={partFormData.part_code}
                    onChange={(e) => {
                      const numbersOnly = e.target.value.replace(/\D/g, "");
                      handlePartInputChange("part_code", numbersOnly);
                    }}
                  />
                </div>
                <div>
                  <label style={styles.label}>Part Name</label>
                  <input
                    type="text"
                    style={styles.inputPartCode}
                    placeholder="Enter part name"
                    value={partFormData.part_name}
                    onChange={(e) =>
                      handlePartInputChange("part_name", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label style={styles.label}>Part Size *</label>
                  <select
                    style={styles.select}
                    value={partFormData.part_size}
                    onChange={(e) =>
                      handlePartInputChange("part_size", e.target.value)
                    }
                  >
                    <option value="">Select Size</option>
                    {partSizes.map((size, index) => (
                      <option
                        key={size.id || index}
                        value={size.size_name || size}
                      >
                        {size.size_name || size}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Part Types</label>
                  <select
                    style={styles.select}
                    value={partFormData.part_types}
                    onChange={(e) =>
                      handlePartInputChange("part_types", e.target.value)
                    }
                  >
                    <option value="">Select part types</option>
                    <option value="Regular">REGULAR</option>
                    <option value="Special">SPECIAL</option>
                  </select>
                </div>

                {partFormData.part_types === "Special" && (
                  <div>
                    <label style={styles.label}>Select Customers *</label>
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                      }}
                    >
                      <select
                        style={styles.select}
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddCustomer(e.target.value);
                            e.target.value = "";
                          }
                        }}
                      >
                        <option value="">Select Customer</option>
                        {customers
                          .filter(
                            (customer) =>
                              !selectedCustomers.some(
                                (sc) => sc.id === customer.id
                              )
                          )
                          .map((customer) => (
                            <option key={customer.id} value={customer.id}>
                              {customer.mat_code} | {customer.cust_name}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Display selected customers */}
                    {selectedCustomers.length > 0 && (
                      <div style={{ marginTop: "8px" }}>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#4b5563",
                            marginBottom: "4px",
                            fontWeight: "500",
                          }}
                        >
                          Selected For Customers :
                        </div>
                        <div
                          style={{
                            maxHeight: "100px",
                            overflowY: "auto",
                            border: "1px solid #d1d5db",
                            borderRadius: "4px",
                            padding: "8px",
                            backgroundColor: "#f9fafb",
                          }}
                        >
                          {selectedCustomers.map((customer) => (
                            <div
                              key={customer.id}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "4px 8px",
                                marginBottom: "4px",
                                backgroundColor: "white",
                                border: "1px solid #e5e7eb",
                                borderRadius: "4px",
                              }}
                            >
                              <span style={{ fontSize: "11px" }}>
                                {customer.mat_code} | {customer.cust_name}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveCustomer(customer.id)
                                }
                                style={{
                                  backgroundColor: "transparent",
                                  border: "none",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                  padding: "2px 4px",
                                }}
                                title="Delete"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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

              <div style={{ flex: "2", display: "grid", gap: "35px" }}>
                <div>
                  <label style={styles.label}>Part Material</label>
                  <input
                    type="text"
                    style={styles.inputPartCode}
                    placeholder="Enter part material"
                    value={partFormData.part_material}
                    onChange={(e) =>
                      handlePartInputChange("part_material", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label style={styles.label}>Part Price (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    style={styles.inputPartCode}
                    placeholder="0.00"
                    value={partFormData.part_price}
                    onChange={(e) =>
                      handlePartInputChange("part_price", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label style={styles.label}>Part QTY (Per Box)</label>
                  <input
                    type="number"
                    style={styles.inputPartCode}
                    placeholder="Enter qty"
                    value={partFormData.qty_per_box}
                    onChange={(e) =>
                      handlePartInputChange("qty_per_box", e.target.value)
                    }
                    min="1"
                  />
                </div>

                <div>
                  <label style={styles.label}>Part Weight (Per Parts)</label>
                  <div
                    style={{
                      display: "inline-flex",
                      border: "1px solid #d1d5db",
                      borderRadius: "4px",
                      overflow: "hidden",
                      width: "175px",
                      height: "2rem",
                      backgroundColor: "#f3f4f6",
                    }}
                  >
                    {/* Input Number */}
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      style={{
                        flex: 1,
                        border: "none",
                        padding: "0 8px",
                        fontSize: "11px",
                        backgroundColor: "transparent",
                        outline: "none",
                        minWidth: 0,
                        fontFamily: "inherit",
                      }}
                      placeholder="Weight"
                      value={partFormData.part_weight}
                      onChange={(e) =>
                        handlePartInputChange("part_weight", e.target.value)
                      }
                    />

                    {/* Unit Selector - Separator */}
                    <div
                      style={{
                        width: "1px",
                        backgroundColor: "#d1d5db",
                        alignSelf: "stretch",
                      }}
                    ></div>

                    {/* Unit Dropdown */}
                    <div
                      style={{
                        position: "relative",
                        minWidth: "45px",
                      }}
                    >
                      <select
                        style={{
                          width: "100%",
                          height: "100%",
                          border: "none",
                          backgroundColor: "transparent",
                          fontSize: "11px",
                          color: "#374151",
                          cursor: "pointer",
                          outline: "none",
                          padding: "0 20px 0 8px",
                          appearance: "none",
                          fontFamily: "inherit",
                        }}
                        value={partFormData.weight_unit}
                        onChange={(e) =>
                          handlePartInputChange("weight_unit", e.target.value)
                        }
                      >
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="lbs">lbs</option>
                        <option value="oz">oz</option>
                      </select>
                      {/* Custom dropdown arrow */}
                      <div
                        style={{
                          position: "absolute",
                          right: "6px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: "0",
                          height: "0",
                          borderLeft: "3px solid transparent",
                          borderRight: "3px solid transparent",
                          borderTop: "3px solid #6b7280",
                          pointerEvents: "none",
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ flex: "2", display: "grid", gap: "35px" }}>
                <div>
                  <label style={styles.label}>Model</label>
                  <select
                    style={styles.select}
                    value={partFormData.model}
                    onChange={(e) =>
                      handlePartInputChange("model", e.target.value)
                    }
                  >
                    <option value="">Select Model</option>
                    {models.map((model, index) => (
                      <option key={index} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Vendor</label>
                  <select
                    style={styles.select}
                    value={partFormData.vendor_id}
                    onChange={(e) =>
                      handlePartInputChange("vendor_id", e.target.value)
                    }
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.vendor_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Vendor Types</label>
                  <input
                    type="text"
                    style={{
                      ...styles.inputPartCode,
                      backgroundColor: "#f3f4f6",
                      color: "#6b7280",
                      cursor: "not-allowed",
                    }}
                    value={selectedVendorType}
                    readOnly
                    placeholder="Auto from vendor"
                  />
                </div>
                <div>
                  <label style={styles.label}>
                    Stock Level To (From Vendor)
                  </label>
                  <select
                    style={styles.select}
                    value={partFormData.stock_level_to}
                    onChange={(e) =>
                      handlePartInputChange("stock_level_to", e.target.value)
                    }
                  >
                    <option value="">Select Stock Level</option>
                    {stockLevels.map((level, index) => (
                      <option key={index} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>
                {/* <div>
                    <label style={styles.label}>Created By</label>
                    <input
                      type="text"
                      style={styles.inputPartCode}
                      value={currentEmpName}
                      readOnly
                      placeholder="User not logged in"
                    />
                  </div> */}
              </div>

              <div style={{ flex: "2", display: "grid", gap: "35px" }}>
                <div>
                  <label style={styles.label}>Placement Name</label>
                  <select
                    style={styles.select}
                    value={partFormData.placement_id}
                    onChange={handlePlacementChange}
                  >
                    <option value="">Select Placement</option>
                    <option value="no-placement">No Placement</option>
                    {placements
                      .filter((placement) => placement.is_active)
                      .map((placement) => (
                        <option key={placement.id} value={placement.id}>
                          {placement.placement_name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Placement Length</label>
                  <input
                    type="text"
                    style={{
                      ...styles.inputPartCode,
                      backgroundColor: "#f3f4f6",
                      cursor: "not-allowed",
                      color: selectedPlacement ? "#374151" : "#9ca3af",
                    }}
                    value={
                      selectedPlacement
                        ? `${selectedPlacement.length_cm} cm`
                        : partFormData.placement_id === "no-placement" ||
                          !partFormData.placement_id
                        ? "No Placement"
                        : ""
                    }
                    readOnly
                    placeholder={
                      partFormData.placement_id === "no-placement" ||
                      !partFormData.placement_id
                        ? "No Placement"
                        : "Auto from placement"
                    }
                  />
                </div>
                <div>
                  <label style={styles.label}>Placement Width</label>
                  <input
                    type="text"
                    style={{
                      ...styles.inputPartCode,
                      backgroundColor: "#f3f4f6",
                      cursor: "not-allowed",
                      color: selectedPlacement ? "#374151" : "#9ca3af",
                    }}
                    value={
                      selectedPlacement
                        ? `${selectedPlacement.width_cm} cm`
                        : partFormData.placement_id === "no-placement" ||
                          !partFormData.placement_id
                        ? "No Placement"
                        : ""
                    }
                    readOnly
                    placeholder={
                      partFormData.placement_id === "no-placement" ||
                      !partFormData.placement_id
                        ? "No Placement"
                        : "Auto from placement"
                    }
                  />
                </div>
                <div>
                  <label style={styles.label}>Placement Height</label>
                  <input
                    type="text"
                    style={{
                      ...styles.inputPartCode,
                      backgroundColor: "#f3f4f6",
                      cursor: "not-allowed",
                      color: selectedPlacement ? "#374151" : "#9ca3af",
                    }}
                    value={
                      selectedPlacement
                        ? `${selectedPlacement.height_cm} cm`
                        : partFormData.placement_id === "no-placement" ||
                          !partFormData.placement_id
                        ? "No Placement"
                        : ""
                    }
                    readOnly
                    placeholder={
                      partFormData.placement_id === "no-placement" ||
                      !partFormData.placement_id
                        ? "No Placement"
                        : "Auto from placement"
                    }
                  />
                </div>
                <div>
                  <label style={styles.label}>Assembly Station</label>
                  <select
                    style={styles.select}
                    value={partFormData.assembly_station}
                    onChange={(e) =>
                      handlePartInputChange("assembly_station", e.target.value)
                    }
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
                <div>
                  <label style={styles.label}>QTY Per Assembly</label>
                  <input
                    type="number"
                    style={styles.inputPartCode}
                    placeholder="1"
                    value={partFormData.qty_per_assembly}
                    onChange={(e) =>
                      handlePartInputChange("qty_per_assembly", e.target.value)
                    }
                    min="1"
                  />
                </div>
              </div>
            </div>
          </div>

          <h2 style={styles.h2}>Part Detail List</h2>
          <div style={styles.tableContainer}>
            <div style={styles.tableBodyWrapper}>
              <table
                style={{
                  ...styles.table,
                  minWidth: "1500px",
                  tableLayout: "fixed",
                }}
              >
                <colgroup>
                  <col style={{ width: "4%" }} />
                  <col style={{ width: "4%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "25%" }} />
                  <col style={{ width: "9%" }} />
                </colgroup>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.expandedTh}>No</th>
                    <th style={styles.thWithLeftBorder}>
                      {tempParts.length > 1 && (
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
                    <th style={styles.thWithLeftBorder}>Part Code</th>
                    <th style={styles.thWithLeftBorder}>Part Name</th>
                    <th style={styles.thWithLeftBorder}>Part Size</th>
                    <th style={styles.thWithLeftBorder}>Part Material</th>
                    <th style={styles.thWithLeftBorder}>Part Types</th>
                    <th style={styles.thWithLeftBorder}>QTY Per Box</th>
                    <th style={styles.thWithLeftBorder}>Part Price</th>
                    <th style={styles.thWithLeftBorder}>Part Weight</th>
                    <th style={styles.thWithLeftBorder}>Part Placement</th>
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
                  {tempParts.length === 0 ? (
                    <tr>
                      {/* <td
                          colSpan="16"
                          style={{
                            ...styles.tdWithLeftBorder,
                            textAlign: "center",
                            fontStyle: "italic",
                            color: "#6b7280",
                          }}
                        >
                          No part data available. Please use the form above to add
                          parts.
                        </td> */}
                    </tr>
                  ) : (
                    tempParts.map((part, index) => (
                      <tr
                        key={part.id}
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
                          title={index + 1}
                        >
                          {index + 1}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          <input
                            type="checkbox"
                            checked={part.isSelected}
                            onChange={() => handleCheckboxChange(part.id)}
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
                        <td
                          style={styles.tdWithLeftBorder}
                          title={part.qty_per_box}
                        >
                          {part.qty_per_box}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {part.part_price}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {part.part_weight
                            ? `${part.part_weight} ${part.weight_unit || "kg"}`
                            : "-"}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          {part.placement_name}
                        </td>
                        <td style={styles.tdWithLeftBorder} title={part.customer_names}>
                          {part.customer_names}
                        </td>
                        <td style={styles.tdWithLeftBorder} title={part.model}>
                          {part.model}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={part.vendor_name}
                        >
                          {part.vendor_name}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={part.vendor_type}
                        >
                          {part.vendor_type}
                        </td>
                        <td
                          style={styles.tdWithLeftBorder}
                          title={part.stock_level_to}
                        >
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
                          {currentEmpName} |{" "}
                          {formatDateForDisplay(part.created_at)}
                        </td>
                        <td style={styles.tdWithLeftBorder}>
                          <button
                            style={styles.deleteButton}
                            onClick={() => handleDeleteTempPart(part.id)}
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

export default AddPartsPage;