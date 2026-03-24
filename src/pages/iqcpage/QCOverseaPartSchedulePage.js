"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MdArrowRight, MdArrowDropDown } from "react-icons/md";
import {
  Plus,
  Trash2,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { Helmet } from "react-helmet";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const getAuthUserLocal = () => {
  try {
    return JSON.parse(sessionStorage.getItem("auth_user") || "null");
  } catch {
    return null;
  }
};

const QCOverseaPartSchedulePage = ({ sidebarVisible }) => {

  const canCreateSchedule = true;
  const canDeleteSchedule = true;

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedScheduleIds, setSelectedScheduleIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [expandedVendorRows, setExpandedVendorRows] = useState({});
  const [activeTab, setActiveTab] = useState("Schedule");

  const [palletCalculations, setPalletCalculations] = useState({});

  const [editingPartId, setEditingPartId] = useState(null);
  const [editPartData, setEditPartData] = useState({});

  const [addVendorDetail, setAddVendorDetail] = useState(false);
  const [activeHeaderIdForVendorForm, setActiveHeaderIdForVendorForm] = useState(null);
  const [activeVendorContext, setActiveVendorContext] = useState(null);
  const [tripOptions, setTripOptions] = useState([]);
  const [vendorOptions, setVendorOptions] = useState([]);
  const [addVendorFormData, setAddVendorFormData] = useState({
    trip: "",
    vendor: "",
    doNumbers: [""],
    arrivalTime: "",
  });

  const [addVendorPartDetail, setAddVendorPartDetail] = useState(false);
  const [selectedPartsInPopup, setSelectedPartsInPopup] = useState([]);
  const [addVendorPartFormData, setAddVendorPartFormData] = useState({
    parts: [],
  });
  const [partSearchInput, setPartSearchInput] = useState("");

  const [receivedVendors, setReceivedVendors] = useState([]);
  const [iqcProgressVendors, setIqcProgressVendors] = useState([]);
  const [editingIqcPartId, setEditingIqcPartId] = useState(null);
  const [editIqcPartData, setEditIqcPartData] = useState({});
  const [qcChecksComplete, setQcChecksComplete] = useState([]);
  const [passVendors, setPassVendors] = useState([]);
  const [completeVendors, setCompleteVendors] = useState([]);

  const [showProdDatesPopup, setShowProdDatesPopup] = useState(false);
  const [activeProdDatesPart, setActiveProdDatesPart] = useState(null);
  const [tempProdDates, setTempProdDates] = useState([]);
  const [showAddSamplePopup, setShowAddSamplePopup] = useState(false);
  const [activeSamplePart, setActiveSamplePart] = useState(null);
  const [newSampleDate, setNewSampleDate] = useState("");

  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    searchBy: "vendor_name",
    keyword: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [appliedKeyword, setAppliedKeyword] = useState({ searchBy: "vendor_name", keyword: "" });
  const filtersRef = React.useRef(filters);
  React.useEffect(() => { filtersRef.current = filters; }, [filters]);
  const ROWS_PER_PAGE = 10;

  const tableConfig = {
    Schedule: {
      mainTable: {
        cols: ["26px", "25px", "15%", "15%", "12%", "10%", "10%", "10%", "25%"],
      },
      vendorTable: {
        marginLeft: "50.7px",
        cols: ["24px", "24px", "14%", "36%", "15%", "10%", "10%", "10%"],
      },
      partsTable: {
        marginLeft: "51px",
        cols: ["2.8%", "10%", "22%", "8%", "8%", "8%", "18%", "20%"],
      },
    },
    Received: {
      mainTable: {
        cols: [
          "26px",
          "26px",
          "25%",
          "15%",
          "10%",
          "10%",
          "12%",
          "12%",
          "10%",
          "25%",
        ],
      },
      partsTable: {
        marginLeft: "52px",
        cols: ["2.1%", "12%", "25%", "10%", "10%", "15%", "15%"],
      },
    },
    "IQC Progress": {
      mainTable: {
        cols: [
          "26px",
          "26px",
          "25%",
          "12%",
          "8%",
          "8%",
          "15%",
          "10%",
          "10%",
          "10%",
          "12%",
          "25%"
        ],
      },
      partsTable: {
        marginLeft: "51.8px",
        cols: ["3.3%", "12%", "25%", "8%", "8%", "7%", "18%", "8%", "15%", "15%", "20%", "9%"],
      },
    },
    Pass: {
      mainTable: {
        cols: [
          "26px",
          "26px",
          "14%",
          "11%",
          "7%",
          "7%",
          "10%",
          "7%",
          "9%",
          "10%",
          "11%",
          "7%",
        ],
      },
      partsTable: {
        marginLeft: "51px",
        cols: [
          "3%",
          "10%",
          "22%",
          "7%",
          "7%",
          "6%",
          "15%",
          "10%",
          "15%",
          "10%",
          "15%",
        ],
      },
    },
    Complete: {
      mainTable: {
        cols: [
          "26px",
          "26px",
          "25%",
          "12%",
          "8%",
          "8%",
          "15%",
          "10%",
          "10%",
          "10%",
          "12%",
          "25%"
        ],
      },
      partsTable: {
        marginLeft: "51.8px",
        cols: ["3%", "12%", "25%", "8%", "8%", "7%", "20%", "7%", "10%", "10%", "15%",],
      },
    },
  };

  const renderColgroup = (cols) => (
    <colgroup>
      {cols.map((width, index) => (
        <col key={index} style={{ width }} />
      ))}
    </colgroup>
  );

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
    const sampleDates = part.sample_dates || [];

    return {
      status: sampleDates.length > 0 ? "SAMPLE" : "PASS",
      sampleDates: sampleDates
    };
  };

  const toggleRowExpansion = (rowId) => {
    setExpandedRows((prev) => ({ ...prev, [rowId]: !prev[rowId] }));
  };

  const toggleVendorRowExpansion = (vendorRowId) => {
    setExpandedVendorRows((prev) => ({
      ...prev,
      [vendorRowId]: !prev[vendorRowId],
    }));
  };

  const canBoxFitPallet = (boxLength, boxWidth, palletLength, palletWidth) => {
    return (
      (boxLength <= palletLength && boxWidth <= palletWidth) ||
      (boxWidth <= palletLength && boxLength <= palletWidth)
    );
  };

  const calculateMaxBoxesInPallet = (box, palletType) => {
    const config =
      palletType === "large"
        ? {
          length: 110,
          width: 110,
          maxHeight: 170,
          baseHeight: 15,
          maxWeight: 150,
        }
        : {
          length: 96,
          width: 76,
          maxHeight: 150,
          baseHeight: 15,
          maxWeight: 60,
        };

    const availableHeight = config.maxHeight - config.baseHeight;

    let bestBoxesPerLayer = 0;

    const boxesLengthwiseNormal = Math.floor(config.length / box.length);
    const boxesWidthwiseNormal = Math.floor(config.width / box.width);
    const boxesPerLayerNormal = boxesLengthwiseNormal * boxesWidthwiseNormal;

    const boxesLengthwiseRotated = Math.floor(config.length / box.width);
    const boxesWidthwiseRotated = Math.floor(config.width / box.length);
    const boxesPerLayerRotated = boxesLengthwiseRotated * boxesWidthwiseRotated;

    if (boxesPerLayerNormal >= boxesPerLayerRotated) {
      bestBoxesPerLayer = boxesPerLayerNormal;
    } else {
      bestBoxesPerLayer = boxesPerLayerRotated;
    }

    if (palletType === "large" && bestBoxesPerLayer < 4) {
      const boxesMixed = boxesPerLayerNormal + boxesPerLayerRotated;
      if (boxesMixed > bestBoxesPerLayer) {
        bestBoxesPerLayer = Math.min(4, boxesMixed);
      }
    }

    const maxLayersByHeight = Math.floor(availableHeight / box.height);
    const safeLayersByHeight = Math.max(1, maxLayersByHeight - 1);

    const weightPerLayer = bestBoxesPerLayer * box.weight;

    const maxLayersByWeight = Math.floor(config.maxWeight / weightPerLayer);

    const safeLayers = Math.min(safeLayersByHeight, maxLayersByWeight);
    const finalLayers = Math.max(1, safeLayers);

    const maxBoxesByDimension = bestBoxesPerLayer * finalLayers;

    const maxBoxesByWeight = Math.floor(config.maxWeight / box.weight);

    const maxBoxesPerPallet = Math.min(maxBoxesByDimension, maxBoxesByWeight);

    return {
      maxBoxesPerPallet: Math.max(1, maxBoxesPerPallet),
      boxesPerLayer: bestBoxesPerLayer,
      maxLayers: finalLayers,
    };
  };

  const optimizePalletMixing = (palletDetails) => {
    if (palletDetails.length <= 1) return palletDetails;

    const optimized = [...palletDetails];

    for (let i = 0; i < optimized.length; i++) {
      for (let j = i + 1; j < optimized.length; j++) {
        const palletA = optimized[i];
        const palletB = optimized[j];

        if (palletA.palletType !== palletB.palletType) continue;

        const maxWeight = palletA.palletType === "large" ? 150 : 60;
        const combinedWeight = palletA.totalWeight + palletB.totalWeight;
        const combinedBoxes = palletA.boxesCount + palletB.boxesCount;

        if (combinedWeight <= maxWeight && combinedBoxes <= palletA.capacity) {

          palletA.boxesCount = combinedBoxes;
          palletA.totalWeight = combinedWeight;

          optimized.splice(j, 1);
          j--;
          console.log(`Merged pallets (${palletA.palletType})`);
        }
      }
    }

    return optimized;
  };

  const calculateOptimizedMixedPallet = async (boxData) => {
    try {
      if (!boxData || boxData.length === 0) {
        return {
          largePallets: 0,
          smallPallets: 0,
          totalPallets: 0,
          details: [],
          totalWeight: 0,
          optimized: false,
        };
      }

      console.log(`=== PERHITUNGAN PALLET DENGAN ${boxData.length} BOX ===`);

      const boxGroups = {};
      let totalBoxesAll = boxData.length;
      let totalWeightAll = 0;

      boxData.forEach((box, index) => {
        const boxKey = `${box.length}x${box.width}x${box.height}`;

        if (!boxGroups[boxKey]) {
          boxGroups[boxKey] = {
            length: box.length,
            width: box.width,
            height: box.height,
            weight: box.weight,
            totalBoxes: 0,
            totalWeight: 0,
          };
        }

        boxGroups[boxKey].totalBoxes += 1;
        boxGroups[boxKey].totalWeight += box.weight;
        totalWeightAll += box.weight;
      });

      if (totalBoxesAll === 0) {
        return {
          largePallets: 0,
          smallPallets: 0,
          totalPallets: 0,
          details: [],
          totalWeight: 0,
          optimized: false,
        };
      }

      console.log(
        `Total box: ${totalBoxesAll}, Total berat: ${totalWeightAll.toFixed(2)}kg`
      );
      console.log(`Kelompok box:`, Object.keys(boxGroups).length);

      let totalLargePallets = 0;
      let totalSmallPallets = 0;
      const palletDetails = [];

      for (const key in boxGroups) {
        const group = boxGroups[key];
        const weightPerBox = group.totalWeight / group.totalBoxes;

        console.log(`\nKelompok ${key}:`);
        console.log(`  Total box: ${group.totalBoxes}`);
        console.log(`  Berat per box: ${weightPerBox.toFixed(2)}kg`);
        console.log(`  Total berat: ${group.totalWeight.toFixed(2)}kg`);

        const fitsSmall = canBoxFitPallet(group.length, group.width, 96, 76);
        const fitsLarge = canBoxFitPallet(group.length, group.width, 110, 110);

        let palletType = "large";
        if (!fitsLarge && fitsSmall) {
          palletType = "small";
        }

        const capacity = calculateMaxBoxesInPallet(
          {
            length: group.length,
            width: group.width,
            height: group.height,
            weight: weightPerBox,
          },
          palletType
        );

        console.log(`  ${palletType} pallet capacity:`);
        console.log(`    Max boxes per pallet: ${capacity.maxBoxesPerPallet}`);

        const palletsNeeded = Math.ceil(
          group.totalBoxes / capacity.maxBoxesPerPallet
        );

        console.log(`  Pallets needed: ${palletsNeeded}`);

        let remainingBoxes = group.totalBoxes;
        for (let i = 0; i < palletsNeeded; i++) {
          const boxesInThisPallet = Math.min(
            remainingBoxes,
            capacity.maxBoxesPerPallet
          );
          const weightInThisPallet = boxesInThisPallet * weightPerBox;

          palletDetails.push({
            palletType,
            boxesCount: boxesInThisPallet,
            boxSize: key,
            boxWeight: weightPerBox,
            totalWeight: weightInThisPallet,
            capacity: capacity.maxBoxesPerPallet,
            groupKey: key,
          });

          remainingBoxes -= boxesInThisPallet;
        }

        if (palletType === "large") {
          totalLargePallets += palletsNeeded;
        } else {
          totalSmallPallets += palletsNeeded;
        }
      }

      const optimizedPallets = optimizePalletMixing(palletDetails);

      let finalLargePallets = 0;
      let finalSmallPallets = 0;
      let finalTotalWeight = 0;
      const details = [];

      optimizedPallets.forEach((pallet, idx) => {
        if (pallet.palletType === "large") {
          finalLargePallets++;
        } else {
          finalSmallPallets++;
        }

        finalTotalWeight += pallet.totalWeight;

        const maxWeight = pallet.palletType === "large" ? 150 : 60;
        const weightUtilization = (pallet.totalWeight / maxWeight) * 100;
        const boxUtilization = (pallet.boxesCount / pallet.capacity) * 100;

        details.push({
          palletId: idx + 1,
          palletType: pallet.palletType,
          boxesCount: pallet.boxesCount,
          boxSize: pallet.boxSize,
          totalWeight: pallet.totalWeight,
          weightUtilization: weightUtilization.toFixed(1),
          boxUtilization: boxUtilization.toFixed(1),
          capacity: pallet.capacity,
        });
      });

      console.log(`\n=== HASIL AKHIR ===`);
      console.log(`Large pallets: ${finalLargePallets}`);
      console.log(`Small pallets: ${finalSmallPallets}`);
      console.log(`Total pallets: ${finalLargePallets + finalSmallPallets}`);
      console.log(`Total weight: ${finalTotalWeight.toFixed(2)}kg`);

      return {
        largePallets: finalLargePallets,
        smallPallets: finalSmallPallets,
        totalPallets: finalLargePallets + finalSmallPallets,
        totalWeight: finalTotalWeight,
        details,
        optimized: true,
      };
    } catch (error) {
      console.error("Error in optimized calculation:", error);

      return calculateSimplePalletFromBoxData(boxData);
    }
  };

  const calculateSimplePalletFromBoxData = (boxData) => {
    if (!boxData || boxData.length === 0) {
      return {
        largePallets: 0,
        smallPallets: 0,
        totalPallets: 0,
        totalWeight: 0,
        details: [],
        optimized: false,
      };
    }

    const boxGroups = {};
    let totalWeight = 0;

    boxData.forEach((box) => {
      const boxKey = `${box.length}x${box.width}x${box.height}`;

      if (!boxGroups[boxKey]) {
        boxGroups[boxKey] = {
          totalBoxes: 0,
          totalWeight: 0,
          length: box.length,
          width: box.width,
          height: box.height,
        };
      }

      boxGroups[boxKey].totalBoxes += 1;
      boxGroups[boxKey].totalWeight += box.weight;
      totalWeight += box.weight;
    });

    let totalLargePallets = 0;
    let totalSmallPallets = 0;
    const details = [];

    for (const key in boxGroups) {
      const group = boxGroups[key];
      if (group.totalBoxes <= 0) continue;

      const avgWeightPerBox = group.totalWeight / group.totalBoxes;

      let palletType = "large";
      const fitsLarge = canBoxFitPallet(group.length, group.width, 110, 110);
      const fitsSmall = canBoxFitPallet(group.length, group.width, 96, 76);

      if (!fitsLarge && fitsSmall) {
        palletType = "small";
      }

      const capacity = calculateMaxBoxesInPallet(
        {
          length: group.length,
          width: group.width,
          height: group.height,
          weight: avgWeightPerBox,
        },
        palletType
      );

      const palletsNeeded = Math.ceil(
        group.totalBoxes / capacity.maxBoxesPerPallet
      );

      if (palletType === "large") {
        totalLargePallets += palletsNeeded;
      } else {
        totalSmallPallets += palletsNeeded;
      }

      details.push({
        boxSize: `${group.length}×${group.width}×${group.height}cm`,
        totalBoxes: group.totalBoxes,
        totalWeight: group.totalWeight,
        palletType,
        palletsNeeded,
        capacity: capacity.maxBoxesPerPallet,
      });
    }

    if (totalSmallPallets >= 2) {
      const largeFromSmall = Math.floor(totalSmallPallets / 2);
      totalLargePallets += largeFromSmall;
      totalSmallPallets = totalSmallPallets % 2;
    }

    return {
      largePallets: totalLargePallets,
      smallPallets: totalSmallPallets,
      totalPallets: totalLargePallets + totalSmallPallets,
      totalWeight,
      details,
      optimized: false,
    };
  };

  const fetchBoxDimensions = async (partCode) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/kanban-master/placement-details?part_code=${encodeURIComponent(partCode)}`
      );
      if (response.ok) {
        const result = await response.json();
        const item = result.item || result.data;

        if (item) {
          return {
            length: parseFloat(item.box_length || item.length_cm) || 0,
            width: parseFloat(item.box_width || item.width_cm) || 0,
            height: parseFloat(item.box_height || item.height_cm) || 0,
            weight: parseFloat(item.box_weight || item.part_weight) || 0,
          };
        }
      }
      return null;
    } catch (error) {
      console.error("Error fetching box dimensions:", error);
      return null;
    }
  };

  const recalculatePalletForVendor = async (vendorId, parts) => {
    try {
      console.log(`[Recalc] Starting for vendor ${vendorId} with ${parts.length} parts`);

      if (!parts || parts.length === 0) {
        setPalletCalculations((prev) => ({
          ...prev,
          [vendorId]: {
            largePallets: 0,
            smallPallets: 0,
            totalPallets: 0,
            details: [],
            totalWeight: 0,
            optimized: false,
          },
        }));
        console.log(`[Recalc] Vendor ${vendorId}: No parts, set to 0`);
        return {
          largePallets: 0,
          smallPallets: 0,
          totalPallets: 0,
          totalWeight: 0,
          details: [],
          optimized: false,
        };
      }

      const boxData = [];
      let totalBoxes = 0;
      let totalWeight = 0;

      for (const part of parts) {
        const partCode = part.part_code || part.partCode;
        const qtyBox = parseInt(part.qty_box || part.quantity_box || 0);

        if (qtyBox <= 0) continue;

        try {
          const dimensions = await fetchBoxDimensions(partCode);

          let boxLength = 30;
          let boxWidth = 30;
          let boxHeight = 30;
          let boxWeight = 0.5;

          if (dimensions && dimensions.length > 0 && dimensions.width > 0 && dimensions.height > 0) {
            boxLength = dimensions.length;
            boxWidth = dimensions.width;
            boxHeight = dimensions.height;
            boxWeight = dimensions.weight || 0.5;
            console.log(`[Recalc] ${partCode}: ${boxLength}x${boxWidth}x${boxHeight}cm, ${boxWeight}kg`);
          } else {
            console.log(`[Recalc] ${partCode}: Using default dimensions`);
          }

          for (let i = 0; i < qtyBox; i++) {
            boxData.push({
              length: boxLength,
              width: boxWidth,
              height: boxHeight,
              weight: boxWeight,
              partCode: partCode,
            });
            totalWeight += boxWeight;
          }
          totalBoxes += qtyBox;
        } catch (error) {
          console.warn(`Error fetching placement for part ${partCode}:`, error);
        }
      }

      console.log(`[Recalc] Total boxes: ${boxData.length}, Total weight: ${totalWeight.toFixed(2)}kg`);

      const result = await calculateOptimizedMixedPallet(boxData);

      console.log(`[Recalc] Vendor ${vendorId} result:`, result);

      setPalletCalculations((prev) => ({
        ...prev,
        [vendorId]: result,
      }));

      return result;
    } catch (error) {
      console.error(`[Recalc] Error for vendor ${vendorId}:`, error);

      let totalQtyBox = 0;
      if (parts && Array.isArray(parts)) {
        parts.forEach((part) => {
          totalQtyBox += parseInt(part.qty_box || part.quantity_box || 0);
        });
      }

      const fallbackResult = {
        largePallets: 0,
        smallPallets: totalQtyBox,
        totalPallets: totalQtyBox,
        totalWeight: 0,
        details: [],
        optimized: false,
      };

      setPalletCalculations((prev) => ({
        ...prev,
        [vendorId]: fallbackResult,
      }));

      return fallbackResult;
    }
  };

  const getVendorTotalPallet = (vendor) => {

    if (vendor.total_pallet !== undefined && vendor.total_pallet !== null) {
      return vendor.total_pallet;
    }

    const vendorId = vendor.id;
    const calculation = palletCalculations[vendorId];
    if (calculation && calculation.totalPallets !== undefined) {
      return calculation.totalPallets;
    }

    let totalQtyBox = 0;
    if (vendor.parts && vendor.parts.length > 0) {
      vendor.parts.forEach((part) => {
        const qtyBox = parseInt(part.qty_box || part.quantity_box || 0);
        totalQtyBox += qtyBox;
      });
      return totalQtyBox;
    }

    return 0;
  };

  const calculateVendorTotalPallet = getVendorTotalPallet;

  const calculateVendorTotalItem = (vendor) => {
    if (!vendor || !vendor.parts || vendor.parts.length === 0) {
      return vendor?.total_item || 0;
    }

    return vendor.parts.length;
  };

  const calculateScheduleTotalPallet = (schedule) => {
    if (!schedule || !schedule.vendors || schedule.vendors.length === 0) {
      return schedule?.total_pallet || 0;
    }

    let totalPallet = 0;
    schedule.vendors.forEach((vendor) => {
      totalPallet += calculateVendorTotalPallet(vendor);
    });

    return totalPallet;
  };

  const calculateScheduleTotalItem = (schedule) => {
    if (!schedule || !schedule.vendors || schedule.vendors.length === 0) {
      return schedule?.total_item || 0;
    }

    let totalItem = 0;
    schedule.vendors.forEach((vendor) => {
      totalItem += calculateVendorTotalItem(vendor);
    });

    return totalItem;
  };

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API_BASE}/api/oversea-schedules?status=${activeTab}`;

      const f = filtersRef.current;
      if (f.dateFrom) url += `&date_from=${f.dateFrom}`;
      if (f.dateTo) url += `&date_to=${f.dateTo}`;

      console.log("Fetching schedules from:", url);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("API Response:", data);
      if (data.success) {
        console.log("Schedules received:", data.data?.length || 0);
        setSchedules(data.data || []);
      } else {
        console.error("API returned error:", data.message);
        setSchedules([]);
      }
    } catch (error) {
      console.error("Error fetching schedules:", error);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  const fetchReceivedVendors = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/oversea-schedules/received-vendors`,
      );
      const data = await response.json();
      console.log("Received vendors API response:", data);

      if (data.vendors) {
        console.log("Setting receivedVendors from data.vendors:", data.vendors);
        setReceivedVendors(data.vendors || []);
      } else if (data.success && data.data) {

        console.log("Setting receivedVendors from data.data:", data.data);
        setReceivedVendors(data.data || []);
      } else {
        console.log("No vendors found, setting empty array");
        setReceivedVendors([]);
      }
    } catch (error) {
      console.error("Error fetching received vendors:", error);
      setReceivedVendors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchIqcProgressVendors = useCallback(async () => {
    setLoading(true);
    try {
      const [vendorsRes, qcRes] = await Promise.all([
        fetch(`${API_BASE}/api/oversea-schedules/iqc-progress-vendors`),
        fetch(`${API_BASE}/api/qc-checks?status=Complete`),
      ]);

      const vendorsData = await vendorsRes.json();
      const qcData = await qcRes.json();

      if (vendorsData.vendors) {
        setIqcProgressVendors(vendorsData.vendors || []);
      } else if (vendorsData.success && vendorsData.data) {
        setIqcProgressVendors(vendorsData.data || []);
      } else {
        setIqcProgressVendors([]);
      }

      if (qcData.success) {
        setQcChecksComplete(qcData.data || []);
      }
    } catch (error) {
      console.error("Error fetching IQC progress vendors:", error);
      setIqcProgressVendors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPassVendors = useCallback(async () => {
    setLoading(true);
    try {
      const [vendorsRes, qcRes] = await Promise.all([
        fetch(`${API_BASE}/api/oversea-schedules/pass-vendors`),
        fetch(`${API_BASE}/api/qc-checks?status=Complete`),
      ]);

      const vendorsData = await vendorsRes.json();
      const qcData = await qcRes.json();

      if (vendorsData.vendors) {
        setPassVendors(vendorsData.vendors || []);
      } else if (vendorsData.success && vendorsData.data) {
        setPassVendors(vendorsData.data || []);
      } else {
        setPassVendors([]);
      }

      if (qcData.success) {
        setQcChecksComplete(qcData.data || []);
      }
    } catch (error) {
      console.error("Error fetching sample vendors:", error);
      setPassVendors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCompleteVendors = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/oversea-schedules/complete-vendors`,
      );
      const data = await response.json();

      if (data.vendors) {
        setCompleteVendors(data.vendors || []);
      } else if (data.success && data.data) {
        setCompleteVendors(data.data || []);
      } else {
        setCompleteVendors([]);
      }
    } catch (error) {
      console.error("Error fetching complete vendors:", error);
      setCompleteVendors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setExpandedRows({});
    setExpandedVendorRows({});
    setSelectedScheduleIds(new Set());
    setSelectAll(false);

    if (activeTab === "Received") {
      fetchReceivedVendors();
    } else if (activeTab === "IQC Progress") {
      fetchIqcProgressVendors();
    } else if (activeTab === "Pass") {
      fetchPassVendors();
    } else if (activeTab === "Complete") {
      fetchCompleteVendors();
    } else {
      fetchSchedules();
    }
  }, [
    activeTab,
    fetchSchedules,
    fetchReceivedVendors,
    fetchIqcProgressVendors,
    fetchPassVendors,
    fetchCompleteVendors,
  ]);

  const handleSearch = () => {
    if (activeTab === "Received") {
      fetchReceivedVendors();
    } else if (activeTab === "IQC Progress") {
      fetchIqcProgressVendors();
    } else if (activeTab === "Pass") {
      fetchPassVendors();
    } else if (activeTab === "Complete") {
      fetchCompleteVendors();
    } else {
      fetchSchedules();
    }
  };

  const handleMoveToSchedule = async () => {
    if (selectedScheduleIds.size === 0) {
      alert("Please select at least one schedule to move.");
      return;
    }

    if (
      !window.confirm(
        `Move ${selectedScheduleIds.size} schedule(s) to Schedule tab?`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/oversea-schedules/bulk/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scheduleIds: Array.from(selectedScheduleIds),
            status: "Schedule",
          }),
        },
      );

      const data = await response.json();

      if (data.success) {
        alert(
          `Successfully moved ${data.updated?.length || 0} schedule(s) to Schedule tab.`,
        );
        setSelectedScheduleIds(new Set());
        setSelectAll(false);
        fetchSchedules();
      } else {
        alert(`Failed to move schedules: ${data.message}`);
      }
    } catch (error) {
      console.error("Error moving schedules:", error);
      alert("Error moving schedules. Please try again.");
    }
  };

  const handleApproveVendor = async (vendorId) => {

    return;
  };

  const handleMoveVendorToPass = async (vendorId) => {
    if (!window.confirm("Move this vendor to Pass?")) return;

    try {
      const authUser = getAuthUserLocal();
      const moveByName = authUser?.emp_name || "Unknown";

      const response = await fetch(
        `${API_BASE}/api/oversea-schedules/vendors/${vendorId}/move-to-sample`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ moveByName }),
        },
      );

      const result = await response.json();
      if (response.ok && result.success) {
        alert("Vendor moved to Pass!");
        await fetchIqcProgressVendors();
      } else {
        throw new Error(result.message || "Failed to move vendor");
      }
    } catch (error) {
      alert("Failed to move vendor: " + error.message);
    }
  };

  const handleEditIqcPart = (part) => {
    setEditingIqcPartId(part.id);

    const existingDates = part.prod_dates ? [...part.prod_dates] : [];
    if (
      part.prod_date &&
      !existingDates.includes(part.prod_date.split("T")[0])
    ) {
      existingDates.unshift(part.prod_date.split("T")[0]);
    }

    const { status: autoStatus } = getPartSampleStatus(part);

    setEditIqcPartData({
      status: autoStatus || "",
      remark: part.remark || "",
      prod_dates: existingDates.length > 0 ? existingDates : [""],
    });
  };

  const handleCancelEditIqcPart = () => {
    setEditingIqcPartId(null);
    setEditIqcPartData({});
  };

  const handleSaveEditIqcPart = async (partId) => {
    try {

      const validDates = (editIqcPartData.prod_dates || []).filter(
        (d) => d && d.trim() !== "",
      );

      if (validDates.length === 0) {
        alert("Error: Please add at least one production date.");
        return;
      }

      const uniqueDates = [...new Set(validDates)];
      if (uniqueDates.length !== validDates.length) {
        alert(
          "Error: Production dates must have different dates. Please remove duplicate dates.",
        );
        return;
      }

      console.log("Saving part data:", {
        partId,
        status: editIqcPartData.status,
        remark: editIqcPartData.remark,
        prod_date: validDates[0] || null,
        prod_dates: validDates,
      });

      const response = await fetch(
        `${API_BASE}/api/oversea-schedules/parts/${partId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: editIqcPartData.status || null,
            remark: editIqcPartData.remark || null,
            prod_date: validDates[0] || null,
            prod_dates: validDates,
          }),
        },
      );

      const result = await response.json();
      console.log("Save response:", result);

      if (response.ok && result.success) {
        setEditingIqcPartId(null);
        setEditIqcPartData({});
        await fetchIqcProgressVendors();
      } else {
        throw new Error(result.message || "Failed to update part");
      }
    } catch (error) {
      console.error("Error saving part:", error);
      alert("Failed to update part: " + error.message);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {

    return;
  };

  const handleDeleteVendor = async (vendorId, scheduleId) => {

    return;
  };

  const handleDeletePart = async (partId) => {

    return;
  };

  const handleEditPart = (part, vendorId) => {

    return;
  };

  const fetchQtyPerBox = async (partCode) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/kanban-master/qty-per-box?part_code=${partCode}`,
      );
      const result = await response.json();
      return result?.qty_per_box || result?.item?.qty_per_box || 1;
    } catch (error) {
      return 1;
    }
  };

  const handleQtyChangeInEdit = async (value) => {
    const qty = Number(value) || 0;
    const partCode = editPartData.part_code;
    const qtyPerBox = await fetchQtyPerBox(partCode);
    const qtyBox = qtyPerBox > 0 ? Math.ceil(qty / qtyPerBox) : 0;
    setEditPartData((prev) => ({ ...prev, qty: value, qty_box: qtyBox }));
  };

  const handleReturnVendor = async (vendorId) => {

    return;
  };

  const handleSaveProdDates = async () => {
    if (!activeProdDatesPart) return;

    const validDates = tempProdDates.filter((d) => d && d.trim() !== "");
    if (validDates.length === 0) {
      alert("Please add at least one production date.");
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/oversea-schedules/parts/${activeProdDatesPart.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prod_dates: validDates,
          }),
        },
      );

      const data = await response.json();

      if (data.success) {
        alert("Production dates saved successfully.");
        setShowProdDatesPopup(false);
        setActiveProdDatesPart(null);
        setTempProdDates([]);
        fetchSchedules();
      } else {
        alert(`Failed to save dates: ${data.message}`);
      }
    } catch (error) {
      console.error("Error saving production dates:", error);
      alert("Error saving production dates. Please try again.");
    }
  };

  const handleAddSampleDate = async () => {
    if (!activeSamplePart || !newSampleDate) {
      alert("Please select a date.");
      return;
    }

    try {
      const existingDates = activeSamplePart.prod_dates || [];
      const updatedDates = [...existingDates, newSampleDate];

      const response = await fetch(
        `${API_BASE}/api/oversea-schedules/parts/${activeSamplePart.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prod_dates: updatedDates,
          }),
        },
      );

      const data = await response.json();

      if (data.success) {
        alert("Sample date added successfully.");
        setShowAddSamplePopup(false);
        setActiveSamplePart(null);
        setNewSampleDate("");

        if (activeTab === "IQC Progress") {
          fetchIqcProgressVendors();
        } else if (activeTab === "Pass") {
          fetchPassVendors();
        }
      } else {
        alert(`Failed to add sample date: ${data.message}`);
      }
    } catch (error) {
      console.error("Error adding sample date:", error);
      alert("Error adding sample date. Please try again.");
    }
  };

  const handleOpenAddVendor = (scheduleId) => {

    return;
  };

  const handleTripChange = (tripId) => {
    const selectedTrip = tripOptions.find((t) => t.id === parseInt(tripId));
    setAddVendorFormData((prev) => ({
      ...prev,
      trip: tripId,
      arrivalTime: selectedTrip?.arv_to || "",
    }));
  };

  const handleAddDoNumber = () => {
    setAddVendorFormData((prev) => ({
      ...prev,
      doNumbers: [...prev.doNumbers, ""],
    }));
  };

  const handleRemoveDoNumber = (index) => {
    setAddVendorFormData((prev) => ({
      ...prev,
      doNumbers: prev.doNumbers.filter((_, i) => i !== index),
    }));
  };

  const handleSubmitAddVendor = async (e) => {
    e.preventDefault();

    return;
  };

  const handleSearchPart = async () => {
    if (!partSearchInput.trim()) {
      alert("Please enter a part code.");
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/kanban-master/by-part-code?part_code=${encodeURIComponent(partSearchInput.trim())}`,
      );
      const data = await response.json();

      if (data.success && data.data) {

        const existsInList = addVendorPartFormData.parts.some(
          (p) => p.partCode === data.data.part_code,
        );

        if (existsInList) {
          alert("This part is already in the list.");
          return;
        }

        const newPart = {
          id: Date.now(),
          partCode: data.data.part_code,
          partName: data.data.part_name,
          qty: 0,
          qtyBox: 0,
          qtyPerBoxFromMaster: data.data.qty_per_box || 1,
          unit: data.data.qty_unit || "PCS",
        };

        setAddVendorPartFormData((prev) => ({
          ...prev,
          parts: [...prev.parts, newPart],
        }));
        setPartSearchInput("");
      } else {
        alert("Part not found in kanban master.");
      }
    } catch (error) {
      console.error("Error searching part:", error);
      alert("Error searching part. Please try again.");
    }
  };

  const handlePopupPartQtyChange = (partId, value) => {
    setAddVendorPartFormData((prev) => ({
      ...prev,
      parts: prev.parts.map((p) => {
        if (p.id === partId) {
          const qty = parseInt(value) || 0;
          const qtyPerBox = p.qtyPerBoxFromMaster || 1;
          const qtyBox = qtyPerBox > 0 ? Math.ceil(qty / qtyPerBox) : 0;
          return { ...p, qty, qtyBox };
        }
        return p;
      }),
    }));
  };

  const handleRemovePartFromPopup = (partId) => {
    setAddVendorPartFormData((prev) => ({
      ...prev,
      parts: prev.parts.filter((p) => p.id !== partId),
    }));
  };

  const handlePopupCheckboxChange = (partId) => {
    setSelectedPartsInPopup((prev) => {
      if (prev.includes(partId)) {
        return prev.filter((id) => id !== partId);
      }
      return [...prev, partId];
    });
  };

  const handleSubmitAddParts = async (e) => {
    e.preventDefault();

    return;
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
    secondaryButton: {
      backgroundColor: "#10b981",
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
    moveButton: {
      backgroundColor: "#dbeafe",
      color: "#1d4ed8",
      padding: "4px 8px",
      fontSize: "12px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      marginLeft: "4px",
      display: "flex",
      alignItems: "center",
      gap: "2px",
    },
    approveButton: {
      backgroundColor: "#d1fae5",
      color: "#065f46",
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
      zIndex: 2000,
    },
    popupContainer: {
      backgroundColor: "white",
      borderRadius: "8px",
      padding: "24px",
      width: "500px",
      maxWidth: "90vw",
      maxHeight: "80vh",
      overflow: "auto",
      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
    },
    popupHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: "1px solid #e5e7eb",
      paddingBottom: "12px",
      marginBottom: "16px",
    },
    popupTitle: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#374151",
      margin: 0,
    },
    formGroup: {
      marginBottom: "16px",
    },
    formLabel: {
      display: "block",
      marginBottom: "4px",
      fontWeight: "500",
      fontSize: "14px",
    },
    formInput: {
      width: "100%",
      padding: "8px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      fontSize: "14px",
    },
    formSelect: {
      width: "100%",
      padding: "8px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      fontSize: "14px",
    },
    buttonGroup: {
      display: "flex",
      gap: "8px",
      justifyContent: "flex-end",
      marginTop: "16px",
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
    sampleBadge: {
      backgroundColor: "#fef3c7",
      color: "#92400e",
      padding: "2px 6px",
      borderRadius: "4px",
      fontSize: "10px",
      fontWeight: "600",
    },
    passBadge: {
      backgroundColor: "#d1fae5",
      color: "#065f46",
      padding: "2px 6px",
      borderRadius: "4px",
      fontSize: "10px",
      fontWeight: "600",
    },
    statusBadge: {
      padding: "2px 8px",
      borderRadius: "4px",
      fontSize: "10px",
      fontWeight: "500",
      backgroundColor: "transparent",
      color: "#374151",
    },
    saveConfiguration: {
      display: "flex",
      gap: "8px",
      marginTop: "10px",
      marginLeft: "13px",
    },
    returnButton: {
      backgroundColor: "#fef3c7",
      color: "#92400e",
      padding: "4px 8px",
      fontSize: "12px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      marginLeft: "4px",
    },
    inlineProdDatesContainer: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      gap: "4px",
    },
    inlineProdDateItem: {
      display: "flex",
      alignItems: "center",
      gap: "2px",
    },
    inlineProdDateInput: {
      width: "100px",
      height: "22px",
      border: "1px solid #d1d5db",
      borderRadius: "3px",
      padding: "0 4px",
      fontSize: "10px",
      outline: "none",
    },
    inlineProdDateRemove: {
      background: "none",
      border: "none",
      color: "#ef4444",
      cursor: "pointer",
      padding: "0",
      display: "flex",
      alignItems: "center",
    },
    inlineProdDateAdd: {
      background: "none",
      border: "1px solid #3b82f6",
      color: "#3b82f6",
      cursor: "pointer",
      padding: "2px 6px",
      borderRadius: "3px",
      fontSize: "10px",
      display: "flex",
      alignItems: "center",
      gap: "2px",
    },
    prodDatesBadge: {
      display: "inline-block",
      padding: "2px 6px",
      fontSize: "11px",
      color: "#374151",
    },
  };

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
    },
    paginationInput: {
      width: "20px",
      height: "20px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      padding: "0 8px",
      textAlign: "center",
      fontSize: "10px",
    },
  };

  const tabNames = ["Schedule", "Received", "IQC Progress", "Pass", "Complete"];

  const getByFieldValueQC = (item) => {
    if (activeTab === "Schedule") return item.upload_by_name || "";
    if (activeTab === "Received") return item.move_by_name || "";
    if (activeTab === "IQC Progress") return item.approve_by_name || "";
    if (activeTab === "Pass") return item.sample_by_name || item.approve_by_name || "";
    if (activeTab === "Complete") return item.complete_by_name || "";
    return "";
  };

  const applyFilterQC = (arr, isSchedule = false) => {
    if (!appliedKeyword.keyword || !appliedKeyword.keyword.trim()) return arr;
    const kw = appliedKeyword.keyword.trim().toLowerCase();
    const by = appliedKeyword.searchBy;
    return arr.filter(item => {
      if (by === "vendor_name") {
        if (isSchedule) return (item.vendors || []).some(v => (v.vendor_name || "").toLowerCase().includes(kw));
        return (item.vendor_name || "").toLowerCase().includes(kw);
      }
      if (by === "stock_level") {
        if (isSchedule) return (item.stock_level || "").toLowerCase().includes(kw);
        return (item.stock_level || item.stock_level_ref || "").toLowerCase().includes(kw);
      }
      if (by === "model_name") {
        if (isSchedule) return (item.model_name || "").toLowerCase().includes(kw);
        return (item.model_name || item.model_name_ref || "").toLowerCase().includes(kw);
      }
      if (by === "do_number") {
        if (isSchedule) return (item.vendors || []).some(v => (v.do_number || "").toLowerCase().includes(kw));
        return (item.do_number || "").toLowerCase().includes(kw);
      }
      if (by === "by_name") return getByFieldValueQC(item).toLowerCase().includes(kw);
      return true;
    });
  };

  const renderReceivedTab = () => {
    if (loading) {
      return (
        <tr>
          <td
            colSpan="12"
            style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}
          >
            Loading...
          </td>
        </tr>
      );
    }

    const _filteredR = applyFilterQC(receivedVendors);
    const _startR = (currentPage - 1) * ROWS_PER_PAGE;
    const _pagedR = _filteredR.slice(_startR, _startR + ROWS_PER_PAGE);
    return _pagedR.map((vendor, index) => (
      <React.Fragment key={vendor.id}>
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
          <td style={{ ...styles.tdWithLeftBorder, ...styles.emptyColumn }}>
            <button
              style={styles.arrowButton}
              onClick={() => toggleRowExpansion(vendor.id)}
            >
              {expandedRows[vendor.id] ? (
                <MdArrowDropDown style={styles.arrowIcon} />
              ) : (
                <MdArrowRight style={styles.arrowIcon} />
              )}
            </button>
          </td>
          <td style={styles.tdWithLeftBorder} title={vendor.vendor_name || "-"}>
            {vendor.vendor_name || "-"}
          </td>
          <td style={styles.tdWithLeftBorder} title={vendor.do_number || "-"}>
            {vendor.do_number || "-"}
          </td>
          <td style={styles.tdWithLeftBorder} title={vendor.total_pallet || 0}>{vendor.total_pallet || 0}</td>
          <td style={styles.tdWithLeftBorder} title={vendor.total_item || 0}>{vendor.total_item || 0}</td>
          <td style={styles.tdWithLeftBorder} title={formatDate(vendor.schedule_date_ref || vendor.schedule_date)}>
            {formatDate(vendor.schedule_date_ref || vendor.schedule_date)}
          </td>
          <td style={styles.tdWithLeftBorder} title={vendor.stock_level_ref || vendor.stock_level || "-"}>
            {vendor.stock_level_ref || vendor.stock_level || "-"}
          </td>
          <td style={styles.tdWithLeftBorder} title={vendor.model_name_ref || vendor.schedule_model_name || vendor.model_name || "-"}>
            {vendor.model_name_ref ||
              vendor.schedule_model_name ||
              vendor.model_name ||
              "-"}
          </td>
          <td style={styles.tdWithLeftBorder} title={`${vendor.move_by_name || "-"} | ${formatDateTime(vendor.move_at)}`}>
            {vendor.move_by_name || "-"} | {formatDateTime(vendor.move_at)}
          </td>
          {}
        </tr>

        {}
        {expandedRows[vendor.id] && vendor.parts && (
          <tr>
            <td colSpan="12" style={{ padding: 0, border: "none" }}>
              <div
                style={{
                  ...styles.thirdLevelTableContainer,
                  marginLeft: tableConfig.Received.partsTable?.marginLeft,
                }}
              >
                <table style={styles.thirdLevelTable}>
                  {renderColgroup(tableConfig.Received.partsTable?.cols || [])}
                  <thead>
                    <tr style={styles.expandedTableHeader}>
                      <th style={styles.thirdLevelTh}>No</th>
                      <th style={styles.thirdLevelTh}>Part Code</th>
                      <th style={styles.thirdLevelTh}>Part Name</th>
                      <th style={styles.thirdLevelTh}>Qty</th>
                      <th style={styles.thirdLevelTh}>Qty Box</th>
                      <th style={styles.thirdLevelTh}>Prod Date</th>
                      <th style={styles.thirdLevelTh}>Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendor.parts.length === 0 ? (
                      <tr>
                        <td
                          colSpan="7"
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
                      vendor.parts.map((part, pIdx) => (
                        <tr key={part.id}>
                          <td
                            style={{
                              ...styles.thirdLevelTd,
                              ...styles.expandedWithLeftBorder,
                              ...styles.emptyColumn,
                            }}
                          >
                            {pIdx + 1}
                          </td>
                          <td style={styles.thirdLevelTd} title={part.part_code}>{part.part_code}</td>
                          <td style={styles.thirdLevelTd} title={part.part_name || "-"}>
                            {part.part_name || "-"}
                          </td>
                          <td style={styles.thirdLevelTd} title={part.qty || part.quantity || 0}>
                            {part.qty || part.quantity || 0}
                          </td>
                          <td style={styles.thirdLevelTd} title={part.qty_box || part.quantity_box || 0}>
                            {part.qty_box || part.quantity_box || 0}
                          </td>
                          <td
                            style={styles.thirdLevelTd}
                            title={(() => {
                              const prodDates =
                                part.prod_dates ||
                                (part.prod_date ? [part.prod_date] : []);
                              if (prodDates.length === 0) return "-";
                              return prodDates
                                .map((d) => formatDate(d))
                                .join(", ");
                            })()}
                          >
                            {(() => {
                              const prodDates =
                                part.prod_dates ||
                                (part.prod_date ? [part.prod_date] : []);
                              if (prodDates.length === 0) return "-";
                              return prodDates
                                .map((d) => formatDate(d))
                                .join(", ");
                            })()}
                          </td>
                          <td
                            style={styles.thirdLevelTd}
                            title={part.remark || "-"}
                          >
                            {part.remark || "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    ));
  };

  const renderIqcProgressTab = () => {
    if (loading) {
      return (
        <tr>
          <td
            colSpan="11"
            style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}
          >
            Loading...
          </td>
        </tr>
      );
    }

    const _filteredI = applyFilterQC(iqcProgressVendors);
    const _startI = (currentPage - 1) * ROWS_PER_PAGE;
    const _pagedI = _filteredI.slice(_startI, _startI + ROWS_PER_PAGE);
    return _pagedI.map((vendor, index) => (
      <React.Fragment key={vendor.id}>
        <tr>
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
          <td
            style={{ ...styles.tdWithLeftBorder, ...styles.emptyColumn }}
            title="Toggle details"
          >
            <button
              style={styles.arrowButton}
              onClick={() => toggleRowExpansion(vendor.id)}
            >
              {expandedRows[vendor.id] ? (
                <MdArrowDropDown style={styles.arrowIcon} />
              ) : (
                <MdArrowRight style={styles.arrowIcon} />
              )}
            </button>
          </td>
          <td style={styles.tdWithLeftBorder} title={vendor.vendor_name || "-"}>
            {vendor.vendor_name || "-"}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={vendor.stock_level_ref || vendor.stock_level || "-"}
          >
            {vendor.stock_level_ref || vendor.stock_level || "-"}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={
              vendor.model_name_ref ||
              vendor.schedule_model_name ||
              vendor.model_name ||
              "-"
            }
          >
            {vendor.model_name_ref ||
              vendor.schedule_model_name ||
              vendor.model_name ||
              "-"}
          </td>
          <td style={styles.tdWithLeftBorder} title={vendor.trip_code || "-"}>
            {vendor.trip_code || "-"}
          </td>
          <td style={styles.tdWithLeftBorder} title={vendor.do_number || "-"}>
            {vendor.do_number || "-"}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={vendor.total_pallet?.toString() || "0"}
          >
            {vendor.total_pallet || 0}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={vendor.total_item?.toString() || "0"}
          >
            {vendor.total_item || 0}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={vendor.arrival_time || "-"}
          >
            {vendor.arrival_time || "-"}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={formatDate(vendor.schedule_date_ref || vendor.schedule_date)}
          >
            {formatDate(vendor.schedule_date_ref || vendor.schedule_date)}
          </td>

          <td
            style={styles.tdWithLeftBorder}
            title={
              vendor.approve_by_name
                ? `${vendor.approve_by_name} | ${formatDateTime(vendor.approve_at)}`
                : "-"
            }
          >
            {vendor.approve_by_name
              ? `${vendor.approve_by_name} | ${formatDateTime(vendor.approve_at)}`
              : "-"}
          </td>
          {}
          {}
        </tr>

        {}
        {expandedRows[vendor.id] && vendor.parts && (
          <tr>
            <td colSpan="12" style={{ padding: 0, border: "none" }}>
              <div
                style={{
                  ...styles.thirdLevelTableContainer,
                  marginLeft:
                    tableConfig["IQC Progress"].partsTable?.marginLeft,
                }}
              >
                <table style={styles.thirdLevelTable}>
                  {renderColgroup(
                    tableConfig["IQC Progress"].partsTable?.cols || [],
                  )}
                  <thead>
                    <tr style={styles.expandedTableHeader}>
                      <th style={styles.thirdLevelTh}>No</th>
                      <th style={styles.thirdLevelTh}>Part Code</th>
                      <th style={styles.thirdLevelTh}>Part Name</th>
                      <th style={styles.thirdLevelTh}>Qty</th>
                      <th style={styles.thirdLevelTh}>Qty Box</th>
                      <th style={styles.thirdLevelTh}>Unit</th>
                      <th style={styles.thirdLevelTh}>Prod Date</th>
                      <th style={styles.thirdLevelTh}>Status</th>
                      <th style={styles.thirdLevelTh}>Sample</th>
                      <th style={styles.thirdLevelTh}>Pass</th>
                      <th style={styles.thirdLevelTh}>Remark</th>
                      <th style={styles.thirdLevelTh}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendor.parts.length === 0 ? (
                      <tr>
                        <td
                          colSpan="11"
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
                      vendor.parts.map((part, pIdx) => {
                        const { status: autoStatus, sampleDates } =
                          getPartSampleStatus(part);
                        const displayStatus =
                          part.status === "PASS" ? "PASS" : autoStatus;

                        return (
                          <tr key={part.id}>
                            <td
                              style={{
                                ...styles.thirdLevelTd,
                                ...styles.expandedWithLeftBorder,
                                ...styles.emptyColumn,
                              }}
                              title={pIdx + 1}
                            >
                              {pIdx + 1}
                            </td>
                            <td
                              style={styles.thirdLevelTd}
                              title={part.part_code || "-"}
                            >
                              {part.part_code || "-"}
                            </td>
                            <td
                              style={styles.thirdLevelTd}
                              title={part.part_name || "-"}
                            >
                              {part.part_name || "-"}
                            </td>
                            <td
                              style={styles.thirdLevelTd}
                              title={part.qty?.toString() || "0"}
                            >
                              {part.qty || 0}
                            </td>
                            <td
                              style={styles.thirdLevelTd}
                              title={part.qty_box?.toString() || "0"}
                            >
                              {part.qty_box || 0}
                            </td>
                            <td
                              style={styles.thirdLevelTd}
                              title={part.unit || "PCS"}
                            >
                              {part.unit || "PCS"}
                            </td>
                            {}
                            <td
                              style={styles.thirdLevelTd}
                              title={(() => {
                                const prodDates =
                                  part.prod_dates ||
                                  (part.prod_date ? [part.prod_date] : []);
                                if (prodDates.length === 0) return "-";
                                return prodDates
                                  .map((d) => formatDate(d))
                                  .join(", ");
                              })()}
                            >
                              {editingIqcPartId === part.id ? (
                                <div style={styles.inlineProdDatesContainer}>
                                  {(editIqcPartData.prod_dates || [""]).map(
                                    (date, dateIdx) => (
                                      <div
                                        key={dateIdx}
                                        style={styles.inlineProdDateItem}
                                      >
                                        <input
                                          type="date"
                                          style={styles.inlineProdDateInput}
                                          value={date || ""}
                                          onChange={(e) => {
                                            const newDates = [
                                              ...(editIqcPartData.prod_dates || [
                                                "",
                                              ]),
                                            ];
                                            newDates[dateIdx] = e.target.value;
                                            setEditIqcPartData((p) => ({
                                              ...p,
                                              prod_dates: newDates,
                                            }));
                                          }}
                                        />
                                        {(editIqcPartData.prod_dates || [])
                                          .length > 1 && (
                                            <button
                                              style={styles.inlineProdDateRemove}
                                              onClick={() => {
                                                const newDates = (
                                                  editIqcPartData.prod_dates || []
                                                ).filter((_, i) => i !== dateIdx);
                                                setEditIqcPartData((p) => ({
                                                  ...p,
                                                  prod_dates:
                                                    newDates.length > 0
                                                      ? newDates
                                                      : [""],
                                                }));
                                              }}
                                              title="Remove date"
                                            >
                                              <X size={12} />
                                            </button>
                                          )}
                                      </div>
                                    ),
                                  )}
                                  <button
                                    style={styles.inlineProdDateAdd}
                                    onClick={() => {
                                      const newDates = [
                                        ...(editIqcPartData.prod_dates || [""]),
                                        "",
                                      ];
                                      setEditIqcPartData((p) => ({
                                        ...p,
                                        prod_dates: newDates,
                                      }));
                                    }}
                                    title="Add date"
                                  >
                                    <Plus size={10} />
                                  </button>
                                </div>
                              ) : (
                                <span style={styles.prodDatesList}>
                                  {(() => {
                                    const prodDates =
                                      part.prod_dates ||
                                      (part.prod_date ? [part.prod_date] : []);
                                    if (prodDates.length === 0) return "-";
                                    return prodDates
                                      .map((d) => formatDate(d))
                                      .join(", ");
                                  })()}
                                </span>
                              )}
                            </td>

                            <td
                              style={styles.thirdLevelTd}
                              title={part.status || "-"}
                            >
                              {editingIqcPartId === part.id ? (
                                <select
                                  style={styles.inlineInput}
                                  value={editIqcPartData.status || ""}
                                  onChange={(e) =>
                                    setEditIqcPartData((p) => ({
                                      ...p,
                                      status: e.target.value,
                                    }))
                                  }
                                  title="Select status"
                                >
                                  <option value="">-</option>
                                  <option value="PASS">PASS</option>
                                  <option value="EQZD">EQZD</option>
                                  <option value="SAMPLE">SAMPLE</option>
                                </select>
                              ) : (
                                <span style={styles.statusBadge}>
                                  {displayStatus || "-"}
                                </span>
                              )}
                            </td>
                            {}
                            <td
                              style={styles.thirdLevelTd}
                              title={
                                sampleDates.length > 0
                                  ? sampleDates
                                    .map((d) => formatDate(d))
                                    .join(", ")
                                  : "-"
                              }
                            >
                              {sampleDates.length > 0 ? (
                                <span>
                                  {sampleDates
                                    .map((d) => formatDate(d))
                                    .join(", ")}
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                            {}
                            <td
                              style={styles.thirdLevelTd}
                              title={(() => {
                                const _prod = part.prod_dates || (part.prod_date ? [part.prod_date] : []);
                                const _pass = _prod.filter(d => !sampleDates.includes(typeof d === "string" ? d.split("T")[0] : d));
                                return _pass.length > 0 ? _pass.map(d => formatDate(d)).join(", ") : "-";
                              })()}
                            >
                              {(() => {
                                const _prod = part.prod_dates || (part.prod_date ? [part.prod_date] : []);
                                const _pass = _prod.filter(d => !sampleDates.includes(typeof d === "string" ? d.split("T")[0] : d));
                                return _pass.length > 0 ? (
                                  <span style={{ fontSize: "10px" }}>{_pass.map(d => formatDate(d)).join(", ")}</span>
                                ) : "-";
                              })()}
                            </td>
                            {}
                            <td
                              style={styles.thirdLevelTd}
                              title={part.remark || "-"}
                            >
                              {editingIqcPartId === part.id ? (
                                <input
                                  type="text"
                                  style={styles.inlineInput}
                                  value={editIqcPartData.remark || ""}
                                  onChange={(e) =>
                                    setEditIqcPartData((p) => ({
                                      ...p,
                                      remark: e.target.value,
                                    }))
                                  }
                                  title="Enter remark"
                                />
                              ) : (
                                part.remark || "-"
                              )}
                            </td>
                            {}
                            <td style={styles.thirdLevelTd} title="Action">
                              {editingIqcPartId === part.id ? (
                                <>
                                  <button
                                    style={styles.saveButton}
                                    onClick={() =>
                                      handleSaveEditIqcPart(part.id)
                                    }
                                    title="Save"
                                  >
                                    <Save size={10} />
                                  </button>
                                  <button
                                    style={styles.cancelButton}
                                    onClick={handleCancelEditIqcPart}
                                    title="Cancel"
                                  >
                                    <X size={10} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    style={styles.editButton}
                                    onClick={() => handleEditIqcPart(part)}
                                    title="Edit"
                                  >
                                    <Pencil size={10} />
                                  </button>
                                  <button
                                    style={styles.deleteButton}
                                    onClick={() => handleDeletePart(part.id)}
                                    title="Delete"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    ));
  };

  const renderPassTab = () => {
    if (loading) {
      return (
        <tr>
          <td
            colSpan="12"
            style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}
          >
            Loading...
          </td>
        </tr>
      );
    }

    const _filteredP = applyFilterQC(passVendors);
    const _startP = (currentPage - 1) * ROWS_PER_PAGE;
    const _pagedP = _filteredP.slice(_startP, _startP + ROWS_PER_PAGE);
    return _pagedP.map((vendor, index) => (
      <React.Fragment key={vendor.id}>
        <tr>
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
          <td
            style={{ ...styles.tdWithLeftBorder, ...styles.emptyColumn }}
            title="Toggle details"
          >
            <button
              style={styles.arrowButton}
              onClick={() => toggleRowExpansion(vendor.id)}
            >
              {expandedRows[vendor.id] ? (
                <MdArrowDropDown style={styles.arrowIcon} />
              ) : (
                <MdArrowRight style={styles.arrowIcon} />
              )}
            </button>
          </td>
          <td style={styles.tdWithLeftBorder} title={vendor.vendor_name || "-"}>
            {vendor.vendor_name || "-"}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={vendor.stock_level_ref || vendor.stock_level || "-"}
          >
            {vendor.stock_level_ref || vendor.stock_level || "-"}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={
              vendor.model_name_ref ||
              vendor.schedule_model_name ||
              vendor.model_name ||
              "-"
            }
          >
            {vendor.model_name_ref ||
              vendor.schedule_model_name ||
              vendor.model_name ||
              "-"}
          </td>
          <td style={styles.tdWithLeftBorder} title={vendor.trip_code || "-"}>
            {vendor.trip_code || "-"}
          </td>
          <td style={styles.tdWithLeftBorder} title={vendor.do_number || "-"}>
            {vendor.do_number || "-"}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={vendor.total_pallet?.toString() || "0"}
          >
            {vendor.total_pallet || 0}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={vendor.total_item?.toString() || "0"}
          >
            {vendor.total_item || 0}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={vendor.arrival_time || "-"}
          >
            {vendor.arrival_time || "-"}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={formatDate(vendor.schedule_date_ref || vendor.schedule_date)}
          >
            {formatDate(vendor.schedule_date_ref || vendor.schedule_date)}
          </td>

          {}
          <td
            style={styles.tdWithLeftBorder}
            title={
              vendor.sample_by_name
                ? `${vendor.sample_by_name} | ${formatDateTime(vendor.sample_at)}`
                : vendor.approve_by_name
                  ? `${vendor.approve_by_name} | ${formatDateTime(vendor.approve_at)}`
                  : "-"
            }
          >
            {vendor.sample_by_name
              ? `${vendor.sample_by_name} | ${formatDateTime(vendor.sample_at)}`
              : vendor.approve_by_name
                ? `${vendor.approve_by_name} | ${formatDateTime(vendor.approve_at)}`
                : "-"}
          </td>
        </tr>

        {}
        {expandedRows[vendor.id] && vendor.parts && (
          <tr>
            <td colSpan="12" style={{ padding: 0, border: "none" }}>
              <div
                style={{
                  ...styles.thirdLevelTableContainer,
                  marginLeft:
                    tableConfig["IQC Progress"].partsTable?.marginLeft,
                }}
              >
                <table style={styles.thirdLevelTable}>
                  {renderColgroup(
                    tableConfig["Pass"].partsTable?.cols || []
                  )}
                  <thead>
                    <tr style={styles.expandedTableHeader}>
                      <th style={styles.thirdLevelTh}>No</th>
                      <th style={styles.thirdLevelTh}>Part Code</th>
                      <th style={styles.thirdLevelTh}>Part Name</th>
                      <th style={styles.thirdLevelTh}>Qty</th>
                      <th style={styles.thirdLevelTh}>Qty Box</th>
                      <th style={styles.thirdLevelTh}>Unit</th>
                      <th style={styles.thirdLevelTh}>Prod Date</th>
                      <th style={styles.thirdLevelTh}>Status</th>
                      <th style={styles.thirdLevelTh}>Sample</th>
                      <th style={styles.thirdLevelTh}>Pass</th>
                      <th style={styles.thirdLevelTh}>Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendor.parts.length === 0 ? (
                      <tr>
                        <td
                          colSpan="10"
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
                      vendor.parts.map((part, pIdx) => {
                        const { sampleDates } = getPartSampleStatus(part);
                        const displayStatus = sampleDates.length > 0 ? "SAMPLE" : "PASS";

                        return (
                          <tr key={part.id}>
                            <td
                              style={{
                                ...styles.thirdLevelTd,
                                ...styles.expandedWithLeftBorder,
                                ...styles.emptyColumn,
                              }}
                              title={pIdx + 1}
                            >
                              {pIdx + 1}
                            </td>
                            <td
                              style={styles.thirdLevelTd}
                              title={part.part_code || "-"}
                            >
                              {part.part_code || "-"}
                            </td>
                            <td
                              style={styles.thirdLevelTd}
                              title={part.part_name || "-"}
                            >
                              {part.part_name || "-"}
                            </td>
                            <td
                              style={styles.thirdLevelTd}
                              title={part.qty?.toString() || "0"}
                            >
                              {part.qty || 0}
                            </td>
                            <td
                              style={styles.thirdLevelTd}
                              title={part.qty_box?.toString() || "0"}
                            >
                              {part.qty_box || 0}
                            </td>
                            <td
                              style={styles.thirdLevelTd}
                              title={part.unit || "PCS"}
                            >
                              {part.unit || "PCS"}
                            </td>
                            {}
                            <td
                              style={styles.thirdLevelTd}
                              title={(() => {
                                const prodDates =
                                  part.prod_dates ||
                                  (part.prod_date ? [part.prod_date] : []);
                                if (prodDates.length === 0) return "-";
                                return prodDates.map((d) => formatDate(d)).join(", ");
                              })()}
                            >
                              <span style={styles.prodDatesList}>
                                {(() => {
                                  const prodDates =
                                    part.prod_dates ||
                                    (part.prod_date ? [part.prod_date] : []);
                                  if (prodDates.length === 0) return "-";
                                  return prodDates.map((d) => formatDate(d)).join(", ");
                                })()}
                              </span>
                            </td>
                            {}
                            <td
                              style={styles.thirdLevelTd}
                              title={displayStatus}
                            >
                              <span style={styles.statusBadge}>
                                {displayStatus}
                              </span>
                            </td>
                            {}
                            <td
                              style={styles.thirdLevelTd}
                              title={
                                sampleDates.length > 0
                                  ? sampleDates.map((d) => formatDate(d)).join(", ")
                                  : "-"
                              }
                            >
                              {sampleDates.length > 0 ? (
                                <span>
                                  {sampleDates.map((d) => formatDate(d)).join(", ")}
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                            {}
                            <td
                              style={styles.thirdLevelTd}
                              title={(() => {
                                const _prod = part.prod_dates || (part.prod_date ? [part.prod_date] : []);
                                const _pass = _prod.filter(d => !sampleDates.includes(typeof d === "string" ? d.split("T")[0] : d));
                                return _pass.length > 0 ? _pass.map(d => formatDate(d)).join(", ") : "-";
                              })()}
                            >
                              {(() => {
                                const _prod = part.prod_dates || (part.prod_date ? [part.prod_date] : []);
                                const _pass = _prod.filter(d => !sampleDates.includes(typeof d === "string" ? d.split("T")[0] : d));
                                return _pass.length > 0 ? (
                                  <span style={{ fontSize: "10px" }}>{_pass.map(d => formatDate(d)).join(", ")}</span>
                                ) : "-";
                              })()}
                            </td>
                            {}
                            <td
                              style={styles.thirdLevelTd}
                              title={part.remark || "-"}
                            >
                              {editingIqcPartId === part.id ? (
                                <input
                                  type="text"
                                  style={styles.inlineInput}
                                  value={editIqcPartData.remark || ""}
                                  onChange={(e) =>
                                    setEditIqcPartData((p) => ({
                                      ...p,
                                      remark: e.target.value,
                                    }))
                                  }
                                  title="Enter remark"
                                />
                              ) : (
                                part.remark || "-"
                              )}
                            </td>
                            {}
                            <td style={styles.thirdLevelTd} title="Action">
                              {editingIqcPartId === part.id ? (
                                <>
                                  <button
                                    style={styles.saveButton}
                                    onClick={() => handleSaveEditIqcPart(part.id)}
                                    title="Save"
                                  >
                                    <Save size={10} />
                                  </button>
                                  <button
                                    style={styles.cancelButton}
                                    onClick={handleCancelEditIqcPart}
                                    title="Cancel"
                                  >
                                    <X size={10} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    style={styles.editButton}
                                    onClick={() => handleEditIqcPart(part)}
                                    title="Edit"
                                  >
                                    <Pencil size={10} />
                                  </button>
                                  <button
                                    style={styles.deleteButton}
                                    onClick={() => handleDeletePart(part.id)}
                                    title="Delete"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    ));
  };

  const renderCompleteTab = () => {
    if (loading) {
      return (
        <tr>
          <td
            colSpan="12"
            style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}
          >
            Loading...
          </td>
        </tr>
      );
    }

    const _filteredC = applyFilterQC(completeVendors);
    const _startC = (currentPage - 1) * ROWS_PER_PAGE;
    const _pagedC = _filteredC.slice(_startC, _startC + ROWS_PER_PAGE);
    return _pagedC.map((vendor, index) => (
      <React.Fragment key={vendor.id}>
        <tr>
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
          <td
            style={{ ...styles.tdWithLeftBorder, ...styles.emptyColumn }}
            title="Toggle details"
          >
            <button
              style={styles.arrowButton}
              onClick={() => toggleRowExpansion(vendor.id)}
            >
              {expandedRows[vendor.id] ? (
                <MdArrowDropDown style={styles.arrowIcon} />
              ) : (
                <MdArrowRight style={styles.arrowIcon} />
              )}
            </button>
          </td>
          <td style={styles.tdWithLeftBorder} title={vendor.vendor_name || "-"}>
            {vendor.vendor_name || "-"}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={vendor.stock_level_ref || vendor.stock_level || "-"}
          >
            {vendor.stock_level_ref || vendor.stock_level || "-"}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={
              vendor.model_name_ref ||
              vendor.schedule_model_name ||
              vendor.model_name ||
              "-"
            }
          >
            {vendor.model_name_ref ||
              vendor.schedule_model_name ||
              vendor.model_name ||
              "-"}
          </td>
          <td style={styles.tdWithLeftBorder} title={vendor.trip_code || "-"}>
            {vendor.trip_code || "-"}
          </td>
          <td style={styles.tdWithLeftBorder} title={vendor.do_number || "-"}>
            {vendor.do_number || "-"}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={(vendor.total_pallet || 0).toString()}
          >
            {vendor.total_pallet || 0}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={(vendor.total_item || 0).toString()}
          >
            {vendor.total_item || 0}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={vendor.arrival_time || "-"}
          >
            {vendor.arrival_time || "-"}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={formatDate(vendor.schedule_date_ref || vendor.schedule_date)}
          >
            {formatDate(vendor.schedule_date_ref || vendor.schedule_date)}
          </td>

          {}
          <td
            style={styles.tdWithLeftBorder}
            title={
              vendor.complete_by_name
                ? `${vendor.complete_by_name} | ${formatDateTime(vendor.complete_at)}`
                : "-"
            }
          >
            {vendor.complete_by_name
              ? `${vendor.complete_by_name} | ${formatDateTime(vendor.complete_at)}`
              : "-"}
          </td>
        </tr>

        {}
        {expandedRows[vendor.id] && vendor.parts && (
          <tr>
            <td colSpan="12" style={{ padding: 0, border: "none" }}>
              <div
                style={{
                  ...styles.thirdLevelTableContainer,
                  marginLeft: tableConfig.Complete.partsTable?.marginLeft,
                }}
              >
                <table style={styles.thirdLevelTable}>
                  {renderColgroup(tableConfig.Complete.partsTable?.cols || [])}
                  <thead>
                    <tr style={styles.expandedTableHeader}>
                      <th style={styles.thirdLevelTh}>No</th>
                      <th style={styles.thirdLevelTh}>Part Code</th>
                      <th style={styles.thirdLevelTh}>Part Name</th>
                      <th style={styles.thirdLevelTh}>Qty</th>
                      <th style={styles.thirdLevelTh}>Qty Box</th>
                      <th style={styles.thirdLevelTh}>Unit</th>
                      <th style={styles.thirdLevelTh}>Prod Date</th>
                      <th style={styles.thirdLevelTh}>Status</th>
                      <th style={styles.thirdLevelTh}>Sample</th>
                      <th style={styles.thirdLevelTh}>Pass</th>
                      <th style={styles.thirdLevelTh}>Remark</th>
                      <th style={styles.thirdLevelTh}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendor.parts.length === 0 ? (
                      <tr>
                        <td
                          colSpan="11"
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
                      vendor.parts.map((part, pIdx) => {
                        const sampleStatus = getPartSampleStatus(part);
                        return (
                          <tr key={part.id}>
                            <td
                              style={{
                                ...styles.thirdLevelTd,
                                ...styles.expandedWithLeftBorder,
                                ...styles.emptyColumn,
                              }}
                            >
                              {pIdx + 1}
                            </td>
                            <td style={styles.thirdLevelTd} title={part.part_code}>
                              {part.part_code}
                            </td>
                            <td style={styles.thirdLevelTd} title={part.part_name || "-"}>
                              {part.part_name || "-"}
                            </td>
                            <td style={styles.thirdLevelTd} title={part.qty || 0}>{part.qty || 0}</td>
                            <td style={styles.thirdLevelTd} title={part.qty_box || 0}>
                              {part.qty_box || 0}
                            </td>
                            <td style={styles.thirdLevelTd} title={part.unit || "PCS"}>
                              {part.unit || "PCS"}
                            </td>

                            {}
                            <td
                              style={styles.thirdLevelTd}
                              title={(() => {
                                const prodDates =
                                  part.prod_dates ||
                                  (part.prod_date ? [part.prod_date] : []);
                                if (prodDates.length === 0) return "-";
                                return prodDates
                                  .map((d) => formatDate(d))
                                  .join(", ");
                              })()}
                            >
                              <span style={styles.prodDatesList}>
                                {(() => {
                                  const prodDates =
                                    part.prod_dates ||
                                    (part.prod_date ? [part.prod_date] : []);
                                  if (prodDates.length === 0) return "-";
                                  return prodDates
                                    .map((d) => formatDate(d))
                                    .join(", ");
                                })()}
                              </span>
                            </td>

                            {}
                            <td
                              style={styles.thirdLevelTd}
                              title={part.status || "-"}
                            >
                              {editingIqcPartId === part.id ? (
                                <select
                                  style={styles.inlineInput}
                                  value={editIqcPartData.status || ""}
                                  onChange={(e) =>
                                    setEditIqcPartData((p) => ({
                                      ...p,
                                      status: e.target.value,
                                    }))
                                  }
                                  title="Select status"
                                >
                                  <option value="">-</option>
                                  <option value="PASS">PASS</option>
                                  <option value="EQZD">EQZD</option>
                                  <option value="SAMPLE">SAMPLE</option>
                                </select>
                              ) : (
                                <span style={styles.statusBadge}>
                                  {sampleStatus.status || "-"}
                                </span>
                              )}
                            </td>
                            {}
                            <td
                              style={styles.thirdLevelTd}
                              title={
                                sampleStatus.sampleDates.length > 0
                                  ? sampleStatus.sampleDates
                                    .map((d) => formatDate(d))
                                    .join(", ")
                                  : "-"
                              }
                            >
                              {sampleStatus.sampleDates.length > 0 ? (
                                <span>
                                  {sampleStatus.sampleDates
                                    .map((d) => formatDate(d))
                                    .join(", ")}
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                            {}
                            <td
                              style={styles.thirdLevelTd}
                              title={(() => {
                                const _prod = part.prod_dates || (part.prod_date ? [part.prod_date] : []);
                                const _pass = _prod.filter(d => !sampleStatus.sampleDates.includes(typeof d === "string" ? d.split("T")[0] : d));
                                return _pass.length > 0 ? _pass.map(d => formatDate(d)).join(", ") : "-";
                              })()}
                            >
                              {(() => {
                                const _prod = part.prod_dates || (part.prod_date ? [part.prod_date] : []);
                                const _pass = _prod.filter(d => !sampleStatus.sampleDates.includes(typeof d === "string" ? d.split("T")[0] : d));
                                return _pass.length > 0 ? (
                                  <span style={{ fontSize: "10px" }}>{_pass.map(d => formatDate(d)).join(", ")}</span>
                                ) : "-";
                              })()}
                            </td>
                            {}
                            <td
                              style={styles.thirdLevelTd}
                              title={part.remark || "-"}
                            >
                              {editingIqcPartId === part.id ? (
                                <input
                                  type="text"
                                  style={styles.inlineInput}
                                  value={editIqcPartData.remark || ""}
                                  onChange={(e) =>
                                    setEditIqcPartData((p) => ({
                                      ...p,
                                      remark: e.target.value,
                                    }))
                                  }
                                  title="Enter remark"
                                />
                              ) : (
                                part.remark || "-"
                              )}
                            </td>
                            {}
                            <td style={styles.thirdLevelTd} title="Action">
                              {editingIqcPartId === part.id ? (
                                <>
                                  <button
                                    style={styles.saveButton}
                                    onClick={() => handleSaveEditIqcPart(part.id)}
                                    title="Save"
                                  >
                                    <Save size={10} />
                                  </button>
                                  <button
                                    style={styles.cancelButton}
                                    onClick={handleCancelEditIqcPart}
                                    title="Cancel"
                                  >
                                    <X size={10} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    style={styles.editButton}
                                    onClick={() => handleEditIqcPart(part)}
                                    title="Edit"
                                  >
                                    <Pencil size={10} />
                                  </button>
                                  <button
                                    style={styles.deleteButton}
                                    onClick={() => handleDeletePart(part.id)}
                                    title="Delete"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    ));
  };

  const renderScheduleTab = () => {
    if (loading) {
      return (
        <tr>
          <td
            colSpan="10"
            style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}
          >
            Loading...
          </td>
        </tr>
      );
    }

    const _filteredS = applyFilterQC(schedules, true);
    const _startS = (currentPage - 1) * ROWS_PER_PAGE;
    const _pagedS = _filteredS.slice(_startS, _startS + ROWS_PER_PAGE);
    return _pagedS.map((schedule, index) => {

      return (
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
            <td style={{ ...styles.tdWithLeftBorder, ...styles.emptyColumn }}>
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
            <td style={styles.tdWithLeftBorder} title={formatDate(schedule.schedule_date)}>
              {formatDate(schedule.schedule_date)}
            </td>
            <td style={styles.tdWithLeftBorder} title={schedule.stock_level || "-"}>
              {schedule.stock_level || "-"}
            </td>
            <td style={styles.tdWithLeftBorder} title={schedule.model_name || "-"}>
              {schedule.model_name || "-"}
            </td>
            <td style={styles.tdWithLeftBorder} title={schedule.total_vendor || 0}>
              {schedule.total_vendor || 0}
            </td>
            <td style={styles.tdWithLeftBorder} title={calculateScheduleTotalPallet(schedule)}>
              {calculateScheduleTotalPallet(schedule)}
            </td>
            <td style={styles.tdWithLeftBorder} title={calculateScheduleTotalItem(schedule)}>
              {calculateScheduleTotalItem(schedule)}
            </td>
            <td style={styles.tdWithLeftBorder} title={`${schedule.upload_by_name} | ${formatDateTime(schedule.updated_at || schedule.created_at)}`}>
              {schedule.upload_by_name} |{" "}
              {formatDateTime(schedule.updated_at || schedule.created_at)}
            </td>
            <td style={styles.tdWithLeftBorder}>
              {canCreateSchedule && (
                <button
                  style={styles.addButton}
                  onClick={() => handleOpenAddVendor(schedule.id)}
                  title="Add Vendor"
                >
                  <Plus size={10} />
                </button>
              )}
              {canDeleteSchedule && (
                <button
                  style={styles.deleteButton}
                  onClick={() => handleDeleteSchedule(schedule.id)}
                  title="Delete"
                >
                  <Trash2 size={10} />
                </button>
              )}
            </td>
          </tr>

          {}
          {expandedRows[schedule.id] &&
            schedule.vendors &&
            schedule.vendors.length > 0 && (
              <tr>
                <td colSpan="10" style={{ padding: 0, border: "none" }}>
                  <div
                    style={{
                      ...styles.expandedTableContainer,
                      marginLeft: tableConfig.Schedule.vendorTable?.marginLeft,
                    }}
                  >
                    <table style={styles.expandedTable}>
                      {renderColgroup(
                        tableConfig.Schedule.vendorTable?.cols || [],
                      )}
                      <thead>
                        <tr style={styles.expandedTableHeader}>
                          <th style={styles.expandedTh}>No</th>
                          <th style={styles.expandedTh}></th>
                          <th style={styles.expandedTh}>Trip</th>
                          <th style={styles.expandedTh}>Vendor</th>
                          <th style={styles.expandedTh}>DO Number</th>
                          <th style={styles.expandedTh}>Arrival Time</th>
                          <th style={styles.expandedTh}>Total Pallet</th>
                          <th style={styles.expandedTh}>Total Item</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schedule.vendors.map((vendor, vIdx) => (
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
                                    <MdArrowDropDown style={styles.arrowIcon} />
                                  ) : (
                                    <MdArrowRight style={styles.arrowIcon} />
                                  )}
                                </button>
                              </td>
                              <td style={styles.expandedTd} title={vendor.trip_code || "-"}>
                                {vendor.trip_code || "-"}
                              </td>
                              <td style={styles.expandedTd} title={vendor.vendor_name || (vendor.vendor_code ? `Vendor ${vendor.vendor_code}` : "-")}>
                                {vendor.vendor_name ||
                                  (vendor.vendor_code
                                    ? `Vendor ${vendor.vendor_code}`
                                    : "-")}
                              </td>
                              <td style={styles.expandedTd} title={vendor.do_number && vendor.do_number.length > 0 ? (Array.isArray(vendor.do_number) ? vendor.do_number.join(", ") : vendor.do_number) : "-"}>
                                {vendor.do_number &&
                                  vendor.do_number.length > 0
                                  ? Array.isArray(vendor.do_number)
                                    ? vendor.do_number.join(", ")
                                    : vendor.do_number
                                  : "-"}
                              </td>
                              <td style={styles.expandedTd} title={vendor.trip_arrival_time || vendor.arrival_time || "-"}>
                                {vendor.trip_arrival_time ||
                                  vendor.arrival_time ||
                                  "-"}
                              </td>
                              <td style={styles.expandedTd} title={String(getVendorTotalPallet(vendor))}>
                                {" "}
                                {getVendorTotalPallet(vendor)}
                              </td>
                              <td style={styles.expandedTd} title={calculateVendorTotalItem(vendor)}>
                                {calculateVendorTotalItem(vendor)}
                              </td>

                            </tr>

                            {}
                            {expandedVendorRows[
                              `vendor_${schedule.id}_${vendor.id}`
                            ] &&
                              vendor.parts && (
                                <tr>
                                  <td
                                    colSpan="8"
                                    style={{ padding: 0, border: "none" }}
                                  >
                                    <div
                                      style={{
                                        ...styles.thirdLevelTableContainer,
                                        marginLeft:
                                          tableConfig.Schedule.partsTable
                                            ?.marginLeft,
                                      }}
                                    >
                                      <table style={styles.thirdLevelTable}>
                                        {renderColgroup(
                                          tableConfig.Schedule.partsTable
                                            ?.cols || [],
                                        )}
                                        <thead>
                                          <tr
                                            style={styles.expandedTableHeader}
                                          >
                                            <th style={styles.thirdLevelTh}>
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
                                              Prod Date
                                            </th>
                                            <th style={styles.thirdLevelTh}>
                                              Remark
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {vendor.parts.length === 0 ? (
                                            <tr>
                                              <td
                                                colSpan="9"
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
                                            vendor.parts.map((part, pIdx) => (
                                              <tr key={part.id}>
                                                <td
                                                  style={{
                                                    ...styles.thirdLevelTd,
                                                    ...styles.expandedWithLeftBorder,
                                                    ...styles.emptyColumn,
                                                  }}
                                                  title={pIdx + 1}
                                                >
                                                  {pIdx + 1}
                                                </td>
                                                <td
                                                  style={styles.thirdLevelTd}
                                                  title={part.part_code || "-"}
                                                >
                                                  {part.part_code || "-"}
                                                </td>
                                                <td
                                                  style={styles.thirdLevelTd}
                                                  title={part.part_name || "-"}
                                                >
                                                  {part.part_name || "-"}
                                                </td>
                                                <td
                                                  style={styles.thirdLevelTd}
                                                  title={
                                                    part.qty?.toString() || "0"
                                                  }
                                                >
                                                  {editingPartId === part.id ? (
                                                    <input
                                                      type="number"
                                                      style={styles.inlineInput}
                                                      value={
                                                        editPartData.qty || ""
                                                      }
                                                      onChange={(e) =>
                                                        handleQtyChangeInEdit(
                                                          e.target.value,
                                                        )
                                                      }
                                                      min="0"
                                                    />
                                                  ) : (
                                                    part.qty || 0
                                                  )}
                                                </td>
                                                <td
                                                  style={styles.thirdLevelTd}
                                                  title={
                                                    part.qty_box?.toString() ||
                                                    "0"
                                                  }
                                                >
                                                  {editingPartId === part.id ? (
                                                    <input
                                                      type="number"
                                                      style={{
                                                        ...styles.inlineInput,
                                                        backgroundColor:
                                                          "#f3f4f6",
                                                      }}
                                                      value={
                                                        editPartData.qty_box ||
                                                        ""
                                                      }
                                                      readOnly
                                                    />
                                                  ) : (
                                                    part.qty_box || 0
                                                  )}
                                                </td>
                                                <td
                                                  style={styles.thirdLevelTd}
                                                  title={part.unit || "PCS"}
                                                >
                                                  {editingPartId === part.id ? (
                                                    <input
                                                      type="text"
                                                      style={styles.inlineInput}
                                                      value={
                                                        editPartData.unit || ""
                                                      }
                                                      onChange={(e) =>
                                                        setEditPartData(
                                                          (prev) => ({
                                                            ...prev,
                                                            unit: e.target
                                                              .value,
                                                          }),
                                                        )
                                                      }
                                                    />
                                                  ) : (
                                                    part.unit || "PCS"
                                                  )}
                                                </td>
                                                <td style={styles.thirdLevelTd}>
                                                  {editingPartId === part.id ? (
                                                    <div
                                                      style={
                                                        styles.inlineProdDatesContainer
                                                      }
                                                    >
                                                      {(
                                                        editPartData.prod_dates || [
                                                          "",
                                                        ]
                                                      ).map((date, dateIdx) => (
                                                        <div
                                                          key={dateIdx}
                                                          style={
                                                            styles.inlineProdDateItem
                                                          }
                                                        >
                                                          <input
                                                            type="date"
                                                            style={
                                                              styles.inlineProdDateInput
                                                            }
                                                            value={date || ""}
                                                            onChange={(e) => {
                                                              const newDates = [
                                                                ...(editPartData.prod_dates || [
                                                                  "",
                                                                ]),
                                                              ];
                                                              newDates[
                                                                dateIdx
                                                              ] =
                                                                e.target.value;
                                                              setEditPartData(
                                                                (p) => ({
                                                                  ...p,
                                                                  prod_dates:
                                                                    newDates,
                                                                  prod_date:
                                                                    newDates[0] ||
                                                                    null,
                                                                }),
                                                              );
                                                            }}
                                                          />
                                                          {(
                                                            editPartData.prod_dates || [
                                                              "",
                                                            ]
                                                          ).length > 1 && (
                                                              <button
                                                                style={
                                                                  styles.inlineProdDateRemove
                                                                }
                                                                onClick={() => {
                                                                  const newDates =
                                                                    (
                                                                      editPartData.prod_dates || [
                                                                        "",
                                                                      ]
                                                                    ).filter(
                                                                      (_, i) =>
                                                                        i !==
                                                                        dateIdx,
                                                                    );
                                                                  setEditPartData(
                                                                    (p) => ({
                                                                      ...p,
                                                                      prod_dates:
                                                                        newDates,
                                                                      prod_date:
                                                                        newDates[0] ||
                                                                        null,
                                                                    }),
                                                                  );
                                                                }}
                                                                title="Remove date"
                                                              >
                                                                <X size={12} />
                                                              </button>
                                                            )}
                                                        </div>
                                                      ))}
                                                      <button
                                                        style={
                                                          styles.inlineProdDateAdd
                                                        }
                                                        onClick={() => {
                                                          const newDates = [
                                                            ...(editPartData.prod_dates || [
                                                              "",
                                                            ]),
                                                            "",
                                                          ];
                                                          setEditPartData(
                                                            (p) => ({
                                                              ...p,
                                                              prod_dates:
                                                                newDates,
                                                            }),
                                                          );
                                                        }}
                                                        title="Add date"
                                                      >
                                                        <Plus size={10} />
                                                      </button>
                                                    </div>
                                                  ) : (
                                                    <span
                                                      style={
                                                        styles.prodDatesBadge
                                                      }
                                                    >
                                                      {(() => {
                                                        const prodDates =
                                                          part.prod_dates ||
                                                          (part.prod_date
                                                            ? [part.prod_date]
                                                            : []);
                                                        if (
                                                          prodDates.length === 0
                                                        )
                                                          return "-";
                                                        return prodDates
                                                          .map((d) =>
                                                            formatDate(d),
                                                          )
                                                          .join(", ");
                                                      })()}
                                                    </span>
                                                  )}
                                                </td>
                                                <td
                                                  style={styles.thirdLevelTd}
                                                  title={part.remark || "-"}
                                                >
                                                  {editingPartId === part.id ? (
                                                    <input
                                                      type="text"
                                                      style={styles.inlineInput}
                                                      value={
                                                        editPartData.remark ||
                                                        ""
                                                      }
                                                      onChange={(e) =>
                                                        setEditPartData(
                                                          (prev) => ({
                                                            ...prev,
                                                            remark:
                                                              e.target.value,
                                                          }),
                                                        )
                                                      }
                                                    />
                                                  ) : (
                                                    part.remark || "-"
                                                  )}
                                                </td>
                                              </tr>
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
                </td>
              </tr>
            )}
        </React.Fragment>
      );
    });
  };

  return (
    <div style={styles.pageContainer}>
      <Helmet>
        <title>Oversea Part Schedule</title>
      </Helmet>

      <div style={styles.welcomeCard}>
        {}
        <div style={styles.combinedHeaderFilter}>
          <div style={styles.headerRow}>
            <h1 style={styles.title}>Oversea Part Schedule</h1>
          </div>

          <div style={styles.filterRow}>
            <div style={styles.inputGroup}>
              <span style={styles.label}>Date Filter</span>
              <input
                type="date"
                style={styles.input}
                placeholder="Date From"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              />
              <span style={styles.label}>To</span>
              <input
                type="date"
                style={styles.input}
                placeholder="Date To"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              />
            </div>
            <div style={styles.inputGroup}>
              <span style={styles.label}>Search By</span>
              <select
                style={styles.select}
                value={filters.searchBy}
                onChange={(e) => setFilters(prev => ({ ...prev, searchBy: e.target.value }))}
              >
                <option value="vendor_name">Vendor Name</option>
                <option value="stock_level">Stock Level</option>
                <option value="model_name">Model</option>
                <option value="do_number">DO Number</option>
                <option value="by_name">
                  {activeTab === "Schedule"
                    ? "Updated By"
                    : activeTab === "Received"
                    ? "Received By"
                    : activeTab === "IQC Progress"
                    ? "Approve By"
                    : activeTab === "Pass"
                    ? "Pass By"
                    : "Complete By"}
                </option>
              </select>
              <input
                type="text"
                style={styles.input}
                placeholder="Input Keyword"
                value={filters.keyword}
                onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") { setAppliedKeyword({ searchBy: filters.searchBy, keyword: filters.keyword }); setCurrentPage(1); } }}
              />
              <button style={styles.button} onClick={() => { setAppliedKeyword({ searchBy: filters.searchBy, keyword: filters.keyword }); setCurrentPage(1); }}>
                Search
              </button>
            </div>
          </div>
        </div>

        {}
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

        {}
        <div style={styles.tableContainer}>
          <div style={styles.tableBodyWrapper}>
            {activeTab === "Received" ? (
              <table
                style={{
                  ...styles.table,
                  minWidth: "1200px",
                  tableLayout: "fixed",
                }}
              >
                {renderColgroup(tableConfig.Received.mainTable.cols)}
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.expandedTh}>No</th>
                    <th style={styles.thWithLeftBorder}></th>
                    <th style={styles.thWithLeftBorder}>Vendor</th>
                    <th style={styles.thWithLeftBorder}>DO Number</th>
                    <th style={styles.thWithLeftBorder}>Total Pallet</th>
                    <th style={styles.thWithLeftBorder}>Total Item</th>
                    <th style={styles.thWithLeftBorder}>Schedule Date</th>
                    <th style={styles.thWithLeftBorder}>Stock Level</th>
                    <th style={styles.thWithLeftBorder}>Model</th>
                    <th style={styles.thWithLeftBorder}>Move By</th>
                    {}
                  </tr>
                </thead>
                <tbody>{renderReceivedTab()}</tbody>
              </table>
            ) : activeTab === "IQC Progress" ? (
              <table
                style={{
                  ...styles.table,
                  minWidth: "1200px",
                  tableLayout: "fixed",
                }}
              >
                {renderColgroup(tableConfig["IQC Progress"].mainTable.cols)}
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.expandedTh}>No</th>
                    <th style={styles.thWithLeftBorder}></th>
                    <th style={styles.thWithLeftBorder}>Vendor Name</th>
                    <th style={styles.thWithLeftBorder}>Stock Level</th>
                    <th style={styles.thWithLeftBorder}>Model</th>
                    <th style={styles.thWithLeftBorder}>Trip</th>
                    <th style={styles.thWithLeftBorder}>DO Number</th>
                    <th style={styles.thWithLeftBorder}>Total Pallet</th>
                    <th style={styles.thWithLeftBorder}>Total Item</th>
                    <th style={styles.thWithLeftBorder}>Arrival Time</th>
                    <th style={styles.thWithLeftBorder}>Schedule Date</th>
                    <th style={styles.thWithLeftBorder}>Approve By</th>
                    {}
                  </tr>
                </thead>
                <tbody>{renderIqcProgressTab()}</tbody>
              </table>
            ) : activeTab === "Pass" ? (
              <table
                style={{
                  ...styles.table,
                  minWidth: "1200px",
                  tableLayout: "fixed",
                }}
              >
                {renderColgroup(tableConfig["IQC Progress"].mainTable.cols)}
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.expandedTh}>No</th>
                    <th style={styles.thWithLeftBorder}></th>
                    <th style={styles.thWithLeftBorder}>Vendor Name</th>
                    <th style={styles.thWithLeftBorder}>Stock Level</th>
                    <th style={styles.thWithLeftBorder}>Model</th>
                    <th style={styles.thWithLeftBorder}>Trip</th>
                    <th style={styles.thWithLeftBorder}>DO Number</th>
                    <th style={styles.thWithLeftBorder}>Total Pallet</th>
                    <th style={styles.thWithLeftBorder}>Total Item</th>
                    <th style={styles.thWithLeftBorder}>Arrival Time</th>
                    <th style={styles.thWithLeftBorder}>Schedule Date</th>
                    <th style={styles.thWithLeftBorder}>Pass By</th>
                  </tr>
                </thead>
                <tbody>{renderPassTab()}</tbody>
              </table>
            ) : activeTab === "Complete" ? (
              <table
                style={{
                  ...styles.table,
                  minWidth: "1200px",
                  tableLayout: "fixed",
                }}
              >
                {renderColgroup(tableConfig.Complete.mainTable.cols)}
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.expandedTh}>No</th>
                    <th style={styles.thWithLeftBorder}></th>
                    <th style={styles.thWithLeftBorder}>Vendor Name</th>
                    <th style={styles.thWithLeftBorder}>Stock Level</th>
                    <th style={styles.thWithLeftBorder}>Model</th>
                    <th style={styles.thWithLeftBorder}>Trip</th>
                    <th style={styles.thWithLeftBorder}>DO Number</th>
                    <th style={styles.thWithLeftBorder}>Total Pallet</th>
                    <th style={styles.thWithLeftBorder}>Total Item</th>
                    <th style={styles.thWithLeftBorder}>Arrival Time</th>
                    <th style={styles.thWithLeftBorder}>Schedule Date</th>
                    <th style={styles.thWithLeftBorder}>Complete By</th>
                  </tr>
                </thead>
                <tbody>{renderCompleteTab()}</tbody>
              </table>
            ) : (
              <table
                style={{
                  ...styles.table,
                  minWidth: "960px",
                  tableLayout: "fixed",
                }}
              >
                {renderColgroup(tableConfig.Schedule.mainTable.cols)}
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.expandedTh}>No</th>
                    <th style={styles.thWithLeftBorder}></th>
                    <th style={styles.thWithLeftBorder}>Schedule Date</th>
                    <th style={styles.thWithLeftBorder}>Stock Level</th>
                    <th style={styles.thWithLeftBorder}>Model</th>
                    <th style={styles.thWithLeftBorder}>Total Vendor</th>
                    <th style={styles.thWithLeftBorder}>Total Pallet</th>
                    <th style={styles.thWithLeftBorder}>Total Item</th>
                    <th style={styles.thWithLeftBorder}>Updated By</th>
                  </tr>
                </thead>
                <tbody>{renderScheduleTab()}</tbody>
              </table>
            )}
          </div>

          {}
          {(() => {
            const _rawData = activeTab === "Received" ? receivedVendors
              : activeTab === "IQC Progress" ? iqcProgressVendors
              : activeTab === "Pass" ? passVendors
              : activeTab === "Complete" ? completeVendors
              : schedules;
            const _activeFiltered = applyFilterQC(_rawData, activeTab === "Schedule");
            const _totalPages = Math.max(1, Math.ceil(_activeFiltered.length / ROWS_PER_PAGE));
            return (
              <div style={styles.paginationBar}>
                <div style={styles.paginationControls}>
                  <button style={styles.paginationButton} onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>{"<<"}</button>
                  <button style={styles.paginationButton} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>{"<"}</button>
                  <span>Page</span>
                  <input type="text" value={currentPage} style={styles.paginationInput} readOnly />
                  <span>of {_totalPages}</span>
                  <button style={styles.paginationButton} onClick={() => setCurrentPage(p => Math.min(_totalPages, p + 1))} disabled={currentPage === _totalPages}>{">"}</button>
                  <button style={styles.paginationButton} onClick={() => setCurrentPage(_totalPages)} disabled={currentPage === _totalPages}>{">>"}</button>
                </div>
              </div>
            );
          })()}
        </div>

        {activeTab === "New" && schedules.length > 0 && (
          <div style={styles.saveConfiguration}>
            <button
              style={{
                ...styles.button,
                ...styles.primaryButton,
                cursor:
                  selectedScheduleIds.size === 0 ? "not-allowed" : "pointer",
                opacity: selectedScheduleIds.size === 0 ? 0.6 : 1,
              }}
              onClick={() => {
                if (selectedScheduleIds.size === 0) {
                  alert("Select schedule");
                  return;
                }
                handleMoveToSchedule();
              }}
              disabled={selectedScheduleIds.size === 0}
            >
              <Save size={16} />
              Move to Schedule
            </button>
          </div>
        )}
      </div>

      {}
      {addVendorDetail && (
        <div style={vendorDetailStyles.popupOverlay}>
          <div style={vendorDetailStyles.popupContainer}>
            <div style={vendorDetailStyles.popupHeader}>
              <h3 style={vendorDetailStyles.popupTitle}>Add Vendor</h3>
              <button
                style={vendorDetailStyles.closeButton}
                onClick={() => {
                  setAddVendorDetail(false);
                  setActiveHeaderIdForVendorForm(null);
                }}
              >
                ×
              </button>
            </div>
            <form
              style={vendorDetailStyles.form}
              onSubmit={handleSubmitAddVendor}
            >
              <div style={vendorDetailStyles.formGroup}>
                <label style={vendorDetailStyles.label}>Trip:</label>
                <select
                  style={vendorDetailStyles.select}
                  value={addVendorFormData.trip}
                  onChange={(e) => handleTripChange(e.target.value)}
                >
                  <option value="">Select Trip</option>
                  {tripOptions.map((trip) => (
                    <option key={trip.id} value={trip.id}>
                      {trip.trip_code}
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
                    setAddVendorFormData((prev) => ({
                      ...prev,
                      vendor: e.target.value,
                    }))
                  }
                >
                  <option value="">Select Vendor</option>
                  {vendorOptions.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.vendor_name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={vendorDetailStyles.formGroup}>
                <label style={vendorDetailStyles.label}>DO Numbers:</label>
                {addVendorFormData.doNumbers.map((doNum, index) => (
                  <div key={index} style={vendorDetailStyles.doNumberContainer}>
                    <input
                      type="text"
                      style={vendorDetailStyles.input}
                      value={doNum}
                      onChange={(e) => {
                        const newDoNumbers = [...addVendorFormData.doNumbers];
                        newDoNumbers[index] = e.target.value;
                        setAddVendorFormData((prev) => ({
                          ...prev,
                          doNumbers: newDoNumbers,
                        }));
                      }}
                      placeholder="Enter DO Number"
                    />
                    {addVendorFormData.doNumbers.length > 1 && (
                      <button
                        type="button"
                        style={vendorDetailStyles.removeButton}
                        onClick={() => handleRemoveDoNumber(index)}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  style={vendorDetailStyles.addButton}
                  onClick={handleAddDoNumber}
                >
                  <Plus size={14} /> Add DO Number
                </button>
              </div>
              <div style={vendorDetailStyles.formGroup}>
                <label style={vendorDetailStyles.label}>Arrival Time:</label>
                <input
                  type="time"
                  style={vendorDetailStyles.timeInput}
                  value={addVendorFormData.arrivalTime}
                  onChange={(e) =>
                    setAddVendorFormData((prev) => ({
                      ...prev,
                      arrivalTime: e.target.value,
                    }))
                  }
                  readOnly
                />
              </div>
              <div style={vendorDetailStyles.buttonGroup}>
                <button
                  type="button"
                  style={vendorDetailStyles.cancelButton}
                  onClick={() => {
                    setAddVendorDetail(false);
                    setActiveHeaderIdForVendorForm(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" style={vendorDetailStyles.submitButton}>
                  Add Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {}
      {addVendorPartDetail && (
        <div style={vendorPartStyles.popupOverlay}>
          <div style={vendorPartStyles.popupContainer}>
            <div style={vendorPartStyles.popupHeader}>
              <h3 style={vendorPartStyles.popupTitle}>Add Parts to Vendor</h3>
              <button
                style={vendorPartStyles.closeButton}
                onClick={() => {
                  setAddVendorPartDetail(false);
                  setActiveVendorContext(null);
                }}
              >
                ×
              </button>
            </div>
            <form style={vendorPartStyles.form} onSubmit={handleSubmitAddParts}>
              <div style={vendorPartStyles.formGroup}>
                <label style={vendorPartStyles.label}>Part Code:</label>
                <div style={vendorPartStyles.inputContainer}>
                  <input
                    type="text"
                    style={vendorPartStyles.input}
                    placeholder="Enter Part Code"
                    value={partSearchInput}
                    onChange={(e) => setPartSearchInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSearchPart();
                      }
                    }}
                  />
                  <button
                    type="button"
                    style={vendorPartStyles.addPartButton}
                    onClick={handleSearchPart}
                  >
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
                            <input
                              type="checkbox"
                              checked={
                                selectedPartsInPopup.length ===
                                addVendorPartFormData.parts.length &&
                                addVendorPartFormData.parts.length > 0
                              }
                              onChange={() => {
                                if (
                                  selectedPartsInPopup.length ===
                                  addVendorPartFormData.parts.length
                                ) {
                                  setSelectedPartsInPopup([]);
                                } else {
                                  setSelectedPartsInPopup(
                                    addVendorPartFormData.parts.map(
                                      (p) => p.id,
                                    ),
                                  );
                                }
                              }}
                            />
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
                                  onChange={() =>
                                    handlePopupCheckboxChange(part.id)
                                  }
                                />
                              </td>
                              <td style={vendorPartStyles.td} title={part.partCode}>
                                {part.partCode}
                              </td>
                              <td style={vendorPartStyles.td} title={part.partName || "—"}>
                                {part.partName || "—"}
                              </td>
                              <td style={vendorPartStyles.td}>
                                <input
                                  type="number"
                                  value={part.qty || ""}
                                  onChange={(e) =>
                                    handlePopupPartQtyChange(
                                      part.id,
                                      e.target.value,
                                    )
                                  }
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
                              <td style={vendorPartStyles.td} title={part.qtyBox || ""}>
                                {part.qtyBox || ""}
                              </td>
                              <td style={vendorPartStyles.td} title={part.unit || "PCS"}>
                                {part.unit || "PCS"}
                              </td>
                              <td style={vendorPartStyles.td}>
                                <button
                                  type="button"
                                  style={vendorPartStyles.deleteButton}
                                  onClick={() =>
                                    handleRemovePartFromPopup(part.id)
                                  }
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
                      <span>
                        Total: {addVendorPartFormData.parts.length} parts
                      </span>
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
                  Insert ({selectedPartsInPopup.length})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {}
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
              <button
                style={styles.primaryButtonDates}
                onClick={handleSaveProdDates}
              >
                Save Dates
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {showAddSamplePopup && activeSamplePart && (
        <div style={styles.popupOverlayDates}>
          <div style={styles.popupContainerDates}>
            <div style={styles.popupHeaderDates}>
              <h3 style={styles.popupTitleDates}>
                Add Sample Date - {activeSamplePart.part_code}
              </h3>
              <button
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#6b7280",
                }}
                onClick={() => setShowAddSamplePopup(false)}
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
                Add a new sample date for QC checking.
              </p>
              <div style={styles.dateInputRow}>
                <input
                  type="date"
                  style={styles.dateInput}
                  value={newSampleDate}
                  onChange={(e) => setNewSampleDate(e.target.value)}
                />
              </div>
            </div>
            <div style={styles.buttonGroupDates}>
              <button
                style={styles.secondaryButtonDates}
                onClick={() => setShowAddSamplePopup(false)}
              >
                Cancel
              </button>
              <button
                style={styles.primaryButtonDates}
                onClick={handleAddSampleDate}
              >
                Add Date
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QCOverseaPartSchedulePage;