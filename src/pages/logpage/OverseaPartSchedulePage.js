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
  Check,
  CheckCircle,
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

const OverseaPartSchedulePage = ({ sidebarVisible }) => {
  const navigate = useNavigate();

  const canCreateSchedule = true;
  const canDeleteSchedule = true;

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedScheduleIds, setSelectedScheduleIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [expandedVendorRows, setExpandedVendorRows] = useState({});
  const [activeTab, setActiveTab] = useState("New");

  const [editingPartId, setEditingPartId] = useState(null);
  const [editPartData, setEditPartData] = useState({});

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
  const [partSearchInput, setPartSearchInput] = useState("");

  const [receivedVendors, setReceivedVendors] = useState([]);
  const [iqcProgressVendors, setIqcProgressVendors] = useState([]);
  const [editingIqcPartId] = useState(null);
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
    searchBy: "schedule_code",
    keyword: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [appliedKeyword, setAppliedKeyword] = useState({ searchBy: "vendor_name", keyword: "" });
  const filtersRef = React.useRef(filters);
  React.useEffect(() => { filtersRef.current = filters; }, [filters]);
  const ROWS_PER_PAGE = 10;

  const [palletCalculations, setPalletCalculations] = useState({});
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState(null);

  const tableConfig = {
    New: {
      mainTable: {
        cols: [
          "25px",
          "2%",
          "25px",
          "15%",
          "15%",
          "12%",
          "10%",
          "10%",
          "10%",
          "25%",
        ],
      },
      vendorTable: {
        marginLeft: "73px",
        cols: ["25px", "25px", "10%", "36%", "17%", "12%", "12%", "12%"],
      },
      partsTable: {
        marginLeft: "51px",
        cols: ["2.4%", "12%", "30%", "10%", "10%", "10%", "10%"],
      },
    },
    Schedule: {
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
        cols: ["26px", "26px", "10%", "36%", "15%", "10%", "8%", "8%", "9.3%"],
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
          "25%",
          "15%",
          "10%",
          "10%",
          "12%",
          "12%",
          "10%",
          "25%",
          "8%",
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
        cols: ["3%", "12%", "25%", "8%", "8%", "7%", "20%", "7%", "20%", "15%",],
      },
    },
    Pass: {
      mainTable: {
        cols: [
          "26px",
          "26px",
          "25%",
          "12%",
          "7%",
          "7%",
          "15%",
          "10%",
          "10%",
          "10%",
          "12%",
          "20%",
          "6%"
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
          "10%",
          "10%",
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
        cols: ["3%", "12%", "25%", "8%", "8%", "7%", "20%", "7%", "20%", "15%",],
      },
    },
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
          name: "Large Pallet (110x110)",
        }
        : {
          length: 96,
          width: 76,
          maxHeight: 150,
          baseHeight: 15,
          maxWeight: 60,
          name: "Small Pallet (76x96)",
        };

    const availableHeight = config.maxHeight - config.baseHeight;

    let bestBoxesPerLayer = 0;
    let bestOrientation = "";

    const boxesLengthwiseNormal = Math.floor(config.length / box.length);
    const boxesWidthwiseNormal = Math.floor(config.width / box.width);
    const boxesPerLayerNormal = boxesLengthwiseNormal * boxesWidthwiseNormal;

    const boxesLengthwiseRotated = Math.floor(config.length / box.width);
    const boxesWidthwiseRotated = Math.floor(config.width / box.length);
    const boxesPerLayerRotated = boxesLengthwiseRotated * boxesWidthwiseRotated;

    if (boxesPerLayerNormal >= boxesPerLayerRotated) {
      bestBoxesPerLayer = boxesPerLayerNormal;
      bestOrientation = "normal";
    } else {
      bestBoxesPerLayer = boxesPerLayerRotated;
      bestOrientation = "rotated";
    }

    if (palletType === "large" && bestBoxesPerLayer < 4) {
      const boxesMixed = boxesPerLayerNormal + boxesPerLayerRotated;
      if (boxesMixed > bestBoxesPerLayer) {
        bestBoxesPerLayer = Math.min(4, boxesMixed);
        bestOrientation = "mixed";
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

    const weightPerPallet = maxBoxesPerPallet * box.weight;

    return {
      maxBoxesPerPallet,
      boxesPerLayer: bestBoxesPerLayer,
      maxLayers: finalLayers,
      orientation: bestOrientation,
      weightPerPallet,
      isWeightLimited: maxBoxesPerPallet === maxBoxesByWeight,
      isHeightLimited: maxBoxesPerPallet === maxBoxesByDimension,
    };
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
        console.log(`    Weight per pallet: ${capacity.weightPerPallet.toFixed(2)}kg`);

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

      const largeCapacity = calculateMaxBoxesInPallet(
        {
          length: group.length,
          width: group.width,
          height: group.height,
          weight: avgWeightPerBox,
        },
        "large"
      );

      const smallCapacity = calculateMaxBoxesInPallet(
        {
          length: group.length,
          width: group.width,
          height: group.height,
          weight: avgWeightPerBox,
        },
        "small"
      );

      let palletType = "large";
      let capacity = largeCapacity;

      const fitsLarge = canBoxFitPallet(group.length, group.width, 110, 110);
      const fitsSmall = canBoxFitPallet(group.length, group.width, 96, 76);

      if (!fitsLarge && fitsSmall) {
        palletType = "small";
        capacity = smallCapacity;
      }

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
      console.log(`[Pallet] Vendor ${vendor.id}: ${vendor.total_pallet} (from database)`);
      return vendor.total_pallet;
    }

    const vendorId = vendor.id;
    const calculation = palletCalculations[vendorId];
    if (calculation && calculation.totalPallets !== undefined) {
      console.log(`[Pallet] Vendor ${vendorId}: ${calculation.totalPallets} (calculated)`);
      return calculation.totalPallets;
    }

    let totalQtyBox = 0;
    if (vendor.parts && vendor.parts.length > 0) {
      vendor.parts.forEach((part) => {
        const qtyBox = parseInt(part.qty_box || part.quantity_box || 0);
        totalQtyBox += qtyBox;
      });
      console.log(`[Pallet] Vendor ${vendorId}: ${totalQtyBox} (from qty_box)`);
      return totalQtyBox;
    }

    console.log(`[Pallet] Vendor ${vendorId}: 0 (no data)`);
    return 0;
  };

  const calculateScheduleTotalPallet = (schedule) => {
    if (!schedule || !schedule.vendors || schedule.vendors.length === 0) {
      console.log(`[Schedule ${schedule?.id}] No vendors: ${schedule?.total_pallet || 0}`);
      return schedule?.total_pallet || 0;
    }

    let totalPallet = 0;
    console.log(`[Schedule ${schedule.id}] Calculating for ${schedule.vendors.length} vendors:`);

    schedule.vendors.forEach((vendor, index) => {
      const vendorPallet = getVendorTotalPallet(vendor);
      console.log(`  Vendor ${index + 1} (${vendor.id}): ${vendorPallet} pallets`);
      totalPallet += vendorPallet;
    });

    console.log(`[Schedule ${schedule.id}] Total: ${totalPallet} pallets`);
    return totalPallet;
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

  const calculateVendorTotalItem = (vendor) => {
    if (!vendor || !vendor.parts || vendor.parts.length === 0) {
      return vendor?.total_item || 0;
    }

    return vendor.parts.length;
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

  const fetchTrips = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/masters/trips`);
      const data = await response.json();

      if (Array.isArray(data)) {
        setTripOptions(data);
      } else if (data && Array.isArray(data.data)) {
        setTripOptions(data.data);
      } else {
        setTripOptions([]);
      }
    } catch (error) {
      console.error("Error fetching trips:", error);
      setTripOptions([]);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/vendors`);
      const data = await response.json();

      let vendorsArray = [];
      if (Array.isArray(data)) {
        vendorsArray = data;
      } else if (data && Array.isArray(data.data)) {
        vendorsArray = data.data;
      } else if (data && data.success && Array.isArray(data.data)) {
        vendorsArray = data.data;
      }
      setVendorOptions(vendorsArray);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      setVendorOptions([]);
    }
  };

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

  useEffect(() => {
    fetchTrips();
    fetchVendors();
  }, []);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedScheduleIds(new Set());
    } else {
      const allIds = new Set(schedules.map((s) => s.id));
      setSelectedScheduleIds(allIds);
    }
    setSelectAll(!selectAll);
  };

  const handleSelectSchedule = (id) => {
    const newSelected = new Set(selectedScheduleIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedScheduleIds(newSelected);
    setSelectAll(newSelected.size === schedules.length && schedules.length > 0);
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

      const authUser = getAuthUserLocal();
      const movedByName = authUser?.emp_name || authUser?.name || "Unknown";

      console.log("[handleMoveToSchedule] Moving schedules by:", movedByName);

      const response = await fetch(
        `${API_BASE}/api/oversea-schedules/bulk/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scheduleIds: Array.from(selectedScheduleIds),
            status: "Schedule",
            movedByName: movedByName,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        alert(
          `Successfully moved ${data.updated?.length || 0} schedule(s) to Schedule tab.`
        );
        setSelectedScheduleIds(new Set());
        setSelectAll(false);

        await fetchSchedules();

        setActiveTab("Schedule");
      } else {
        alert(`Failed to move schedules: ${data.message}`);
      }
    } catch (error) {
      console.error("Error moving schedules:", error);
      alert("Error moving schedules. Please try again.");
    }
  };

  const handleMoveVendorToReceived = async (vendorId) => {
    if (!window.confirm("Move this vendor to Received?")) {
      return;
    }

    try {
      const user = getAuthUserLocal();
      const moveByName = user?.emp_name || user?.name || "Unknown";

      const response = await fetch(
        `${API_BASE}/api/oversea-schedules/vendors/${vendorId}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "Received",
            moveByName: moveByName,
          }),
        },
      );

      const data = await response.json();

      if (data.success) {
        alert("Vendor moved to Received successfully.");
        fetchSchedules();
        setActiveTab("Received");
      } else {
        alert(`Failed to move vendor: ${data.message}`);
      }
    } catch (error) {
      console.error("Error moving vendor:", error);
      alert("Error moving vendor. Please try again.");
    }
  };

  const handleApproveVendor = async (vendorId) => {
    if (!window.confirm("Approve this vendor and add stock to inventory?")) {
      return;
    }

    try {
      const user = getAuthUserLocal();
      const approveByName = user?.emp_name || user?.name || "Unknown";

      const response = await fetch(
        `${API_BASE}/api/oversea-schedules/vendors/${vendorId}/approve`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            approveByName: approveByName,
          }),
        },
      );

      const data = await response.json();

      if (data.success) {
        alert("Vendor approved and stock added successfully.");
        fetchReceivedVendors();
        const nextTab = data.data?.vendor?.status || "IQC Progress";
        if (nextTab === "Pass") {
          fetchPassVendors();
        } else {
          fetchIqcProgressVendors();
        }
        setActiveTab(nextTab);
      } else {
        alert(`Failed to approve vendor: ${data.message}`);
      }
    } catch (error) {
      console.error("Error approving vendor:", error);
      alert("Error approving vendor. Please try again.");
    }
  };

  const handleMoveVendorToComplete = async (vendorId) => {
    if (!window.confirm("Move this vendor to Complete?")) return;

    try {
      const authUser = getAuthUserLocal();
      const moveByName = authUser?.emp_name || "Unknown";

      const response = await fetch(
        `${API_BASE}/api/oversea-schedules/vendors/${vendorId}/move-to-complete`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ moveByName }),
        },
      );

      const result = await response.json();
      if (response.ok && result.success) {
        alert("Vendor moved to Complete!");
        await fetchPassVendors();
        await fetchCompleteVendors();
        setActiveTab("Complete");
      } else {
        throw new Error(result.message || "Failed to move vendor");
      }
    } catch (error) {
      alert("Failed to move vendor: " + error.message);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this schedule and all its data?",
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/oversea-schedules/${scheduleId}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (data.success) {
        alert("Schedule deleted successfully.");
        fetchSchedules();
      } else {
        alert(`Failed to delete schedule: ${data.message}`);
      }
    } catch (error) {
      console.error("Error deleting schedule:", error);
      alert("Error deleting schedule. Please try again.");
    }
  };

  const handleDeleteVendor = async (vendorId, scheduleId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this vendor and all its parts?",
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/oversea-schedules/vendors/${vendorId}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (data.success) {
        alert("Vendor deleted successfully.");
        fetchSchedules();
      } else {
        alert(`Failed to delete vendor: ${data.message}`);
      }
    } catch (error) {
      console.error("Error deleting vendor:", error);
      alert("Error deleting vendor. Please try again.");
    }
  };

  const handleDeletePart = async (partId) => {
    if (!window.confirm("Are you sure you want to delete this part?")) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/oversea-schedules/parts/${partId}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (data.success) {
        alert("Part deleted successfully.");
        fetchSchedules();
      } else {
        alert(`Failed to delete part: ${data.message}`);
      }
    } catch (error) {
      console.error("Error deleting part:", error);
      alert("Error deleting part. Please try again.");
    }
  };

  const handleEditPart = (part, vendorId) => {

    setEditingPartId(null);
    setEditPartData({});

    setTimeout(() => {
      setEditingPartId(part.id);

      const existingDates = part.prod_dates ? [...part.prod_dates] : [];
      if (
        part.prod_date &&
        !existingDates.includes(part.prod_date.split("T")[0])
      ) {
        existingDates.unshift(part.prod_date.split("T")[0]);
      }

      setEditPartData({
        vendorId: vendorId,
        part_code: part.part_code || "",
        part_name: part.part_name || "",
        qty: part.qty || part.quantity || "",
        qty_box: part.qty_box || part.quantity_box || 0,
        unit: part.unit || "PCS",
        remark: part.remark || "",
        prod_date: part.prod_date ? part.prod_date.split("T")[0] : "",
        prod_dates: existingDates.length > 0 ? existingDates : [""],
      });
    }, 0);
  };

  const handleCancelEditPart = () => {
    setEditingPartId(null);
    setEditPartData({});
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

  const handleSaveEditPart = async (partId) => {
    try {

      const authUser = getAuthUserLocal();
      console.log("[handleSaveEditPart] Auth user:", authUser);

      const validProdDates = (editPartData.prod_dates || []).filter(
        (d) => d && d.trim() !== ""
      );

      if (!editPartData.qty && editPartData.qty !== 0) {
        alert("Quantity is required.");
        return;
      }

      const payload = {
        quantity: editPartData.qty,
        quantityBox: editPartData.qty_box,
        remark: editPartData.remark,
        prod_dates: validProdDates,

        updated_by_name: authUser?.emp_name || authUser?.name || "Unknown",
      };

      console.log("[handleSaveEditPart] Payload:", payload);

      const response = await fetch(
        `${API_BASE}/api/oversea-schedules/parts/${partId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update part");
      }

      const result = await response.json();
      console.log("[handleSaveEditPart] Response:", result);

      const vendorId = editPartData.vendorId;

      setEditingPartId(null);
      setEditPartData({});

      await fetchSchedules();

      if (vendorId) {

        for (const schedule of schedules) {
          if (schedule.vendors) {
            const vendor = schedule.vendors.find(v => v.id === vendorId);
            if (vendor && vendor.parts) {
              await recalculatePalletForVendor(vendorId, vendor.parts);
              break;
            }
          }
        }
      }

      setToastMessage("Part updated successfully!");
      setToastType("success");
      setTimeout(() => setToastMessage(null), 3000);

    } catch (error) {
      console.error("[handleSaveEditPart] Error saving part:", error);
      setToastMessage("Failed to save part changes: " + error.message);
      setToastType("error");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleAddPart = async (rawPartCode) => {
    const partCode = String(rawPartCode || "").trim();
    if (!partCode) return;

    if (!activeVendorContext) {
      alert("Vendor context not found. Open popup from vendor row.");
      return;
    }

    try {
      const resp = await fetch(
        `${API_BASE}/api/kanban-master/qty-per-box?part_code=${encodeURIComponent(partCode)}`,
      );
      if (!resp.ok) throw new Error("Failed to check Part Code.");

      const json = await resp.json();

      if (!json.success || !json.item) {
        alert("Part code has not found.");
        return;
      }

      const item = json.item;

      if (activeVendorContext.vendorDbId) {
        if (!item.vendor_id) {
          alert("Part code has no vendor assignment. Cannot be used.");
          return;
        }
        if (Number(item.vendor_id) !== Number(activeVendorContext.vendorDbId)) {
          alert("Part Code In Another Vendor");
          return;
        }
      } else {

        alert("Vendor information is incomplete. Cannot add part.");
        return;
      }

      const existingPartCodes = addVendorPartFormData.parts.map(
        (p) => p.partCode,
      );
      if (existingPartCodes.includes(item.part_code)) {
        alert("Part already added");
        return;
      }

      let qtyPerBox = item.qty_per_box || 1;
      if (qtyPerBox <= 0) qtyPerBox = 1;

      const availableDoNumbers =
        activeVendorContext?.doNumbers?.filter((d) => String(d || "").trim()) ||
        [];

      setAddVendorPartFormData((prev) => ({
        ...prev,
        parts: [
          ...prev.parts,
          {
            id: Date.now(),
            doNumber: availableDoNumbers[0] || "",
            partCode: item.part_code,
            partName: item.part_name || "",
            qty: 0,
            qtyBox: 0,
            unit: item.unit || "PCS",
            qtyPerBoxFromMaster: qtyPerBox,
          },
        ],
      }));
    } catch (err) {
      alert(err.message || "Error occurred while checking Part Code.");
    }
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
    setActiveHeaderIdForVendorForm(scheduleId);
    setAddVendorFormData({
      trip: "",
      vendor: "",
      doNumbers: [""],
      arrivalTime: "",
    });
    setAddVendorDetail(true);
  };

  const onTripChange = (e) => {
    const value = e.target.value;
    const selectedTrip = tripOptions.find((t) => String(t.trip_no) === value);
    setAddVendorFormData((prev) => ({
      ...prev,
      trip: value,
      arrivalTime: selectedTrip?.arv_to || "",
    }));
  };

  const handleAddVendorInputChange = (field, value) => {
    setAddVendorFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDoNumberChange = (index, value) => {
    setAddVendorFormData((prev) => {
      const newDoNumbers = [...prev.doNumbers];
      newDoNumbers[index] = value;
      return { ...prev, doNumbers: newDoNumbers };
    });
  };

  const addDoNumberField = () => {
    setAddVendorFormData((prev) => ({
      ...prev,
      doNumbers: [...prev.doNumbers, ""],
    }));
  };

  const removeDoNumberField = (index) => {
    setAddVendorFormData((prev) => ({
      ...prev,
      doNumbers: prev.doNumbers.filter((_, i) => i !== index),
    }));
  };

  const handleAddVendorSubmit = async (e) => {
    e.preventDefault();

    const selectedTrip = tripOptions.find(
      (t) => String(t.trip_no) === addVendorFormData.trip,
    );
    const selectedVendor = vendorOptions.find(
      (v) => `${v.vendor_code} - ${v.vendor_name}` === addVendorFormData.vendor,
    );

    if (!selectedTrip || !selectedVendor || !addVendorFormData.doNumbers[0]) {
      alert("Please fill all required fields");
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/oversea-schedules/${activeHeaderIdForVendorForm}/vendors`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trip_id: selectedTrip.id,
            vendor_id: selectedVendor.id,
            do_number: addVendorFormData.doNumbers.filter((d) => d.trim()),
          }),
        },
      );

      const result = await response.json();
      if (result.success) {
        alert("Vendor added successfully");
        setAddVendorDetail(false);
        setAddVendorFormData({
          trip: "",
          vendor: "",
          doNumbers: [""],
          arrivalTime: "",
        });
        fetchSchedules();
      } else {
        alert(result.message || "Failed to add vendor");
      }
    } catch (error) {
      console.error("Error adding vendor:", error);
      alert("Failed to add vendor");
    }
  };

  const handleOpenAddPart = (scheduleId, vendorId) => {

    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule || !schedule.vendors) {
      alert("Schedule or vendor data not found.");
      return;
    }

    const vendorData = schedule.vendors.find(v => v.id === vendorId);
    if (!vendorData) {
      alert("Vendor not found.");
      return;
    }

    setActiveVendorContext({
      scheduleId: scheduleId,
      vendorId: vendorId,
      vendorDbId: vendorData.vendor_id,
      doNumbers: vendorData.do_number
        ? (Array.isArray(vendorData.do_number)
          ? vendorData.do_number
          : vendorData.do_number.split(" | "))
        : [""],
      vendorName: vendorData.vendor_name || ""
    });

    setAddVendorPartFormData({
      trip: "",
      vendor: vendorData.vendor_name || "",
      doNumbers: vendorData.do_number
        ? (Array.isArray(vendorData.do_number)
          ? vendorData.do_number
          : vendorData.do_number.split(" | "))
        : [""],
      arrivalTime: "",
      parts: []
    });

    setSelectedPartsInPopup([]);
    setAddVendorPartDetail(true);
  };

  const handleAddVendorPartSubmit = async (e) => {
    e.preventDefault();

    if (!activeVendorContext || !activeVendorContext.vendorId) {
      alert("Vendor context is missing. Please reopen the popup.");
      return;
    }

    if (
      addVendorPartFormData.parts.length > 0 &&
      selectedPartsInPopup.length === 0
    ) {
      alert("Select part before insert");
      return;
    }

    const partsToInsert = addVendorPartFormData.parts.filter((p) =>
      selectedPartsInPopup.includes(p.id),
    );

    if (partsToInsert.length === 0) {
      alert("No parts selected for insertion.");
      return;
    }

    try {
      const vendorId = activeVendorContext.vendorId;

      for (const part of partsToInsert) {
        const resp = await fetch(
          `${API_BASE}/api/kanban-master/qty-per-box?part_code=${encodeURIComponent(part.partCode)}`,
        );

        if (resp.ok) {
          const json = await resp.json();
          if (json.success && json.item) {
            const item = json.item;

            if (activeVendorContext.vendorDbId &&
              item.vendor_id &&
              Number(item.vendor_id) !== Number(activeVendorContext.vendorDbId)) {
              alert(`Part "${part.partCode}" belongs to another vendor. Cannot insert.`);
              return;
            }
          }
        }
      }

      for (const part of partsToInsert) {
        await fetch(
          `${API_BASE}/api/oversea-schedules/vendors/${vendorId}/parts`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              part_code: part.partCode,
              part_name: part.partName,
              quantity: part.qty || 0,
              quantity_box: part.qtyBox || 0,
              unit: part.unit || "PCS",
              do_number: part.doNumber || ""
            }),
          },
        );
      }

      alert(`Successfully added ${partsToInsert.length} part(s) to ${activeVendorContext.vendorName || 'vendor'}!`);

      setAddVendorPartDetail(false);
      setActiveVendorContext(null);
      setAddVendorPartFormData({
        trip: "",
        vendor: "",
        doNumbers: [""],
        arrivalTime: "",
        parts: [],
      });
      setSelectedPartsInPopup([]);

      await fetchSchedules();

      for (const schedule of schedules) {
        if (schedule.vendors) {
          const vendor = schedule.vendors.find(v => v.id === vendorId);
          if (vendor && vendor.parts) {
            await recalculatePalletForVendor(vendorId, vendor.parts);
            break;
          }
        }
      }

    } catch (error) {
      console.error("Error adding parts:", error);
      alert("Failed to add parts: " + error.message);
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

  const handleRemovePart = (partId) => {
    setAddVendorPartFormData((prev) => ({
      ...prev,
      parts: prev.parts.filter((p) => p.id !== partId),
    }));
    setSelectedPartsInPopup((prev) => prev.filter((id) => id !== partId));
  };

  const handlePopupCheckboxChange = (e, partId) => {
    if (e.target.checked) {
      setSelectedPartsInPopup((prev) => [...prev, partId]);
    } else {
      setSelectedPartsInPopup((prev) => prev.filter((id) => id !== partId));
    }
  };

  const handleSelectAllInPopup = (e) => {
    if (e.target.checked) {
      setSelectedPartsInPopup(addVendorPartFormData.parts.map((p) => p.id));
    } else {
      setSelectedPartsInPopup([]);
    }
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
    completeButton: {
      backgroundColor: "#10b981",
      color: "white",
      padding: "4px 8px",
      fontSize: "12px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      marginLeft: "4px",
    },
    successButton: {
      backgroundColor: "#10b981",
      color: "white",
    },

    inputFocus: {
      border: "2px solid #9fa8da",
    },
    selectFocus: {
      border: "2px solid #9fa8da",
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
    paginationButtonHover: {
      backgroundColor: "#a5b4fc",
      color: "#1f2937",
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
      backgroundColor: "#fee2e2",
      color: "#991b1b",
      padding: "4px 8px",
      fontSize: "12px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      marginLeft: "4px",
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
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2000,
    },
    popupEditContainer: {
      backgroundColor: "white",
      borderRadius: "12px",
      padding: "30px",
      width: "800px",
      maxWidth: "90vw",
      maxHeight: "90vh",
      overflowY: "auto",
      boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
    },
    popupEditHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: "2px solid #e5e7eb",
      paddingBottom: "15px",
      marginBottom: "25px",
    },
    popupEditTitle: {
      fontSize: "22px",
      fontWeight: "700",
      color: "#1f2937",
      margin: 0,
    },
    popupEditCloseButton: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "8px",
      borderRadius: "6px",
      color: "#6b7280",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.2s ease",
    },
    popupEditCloseButtonHover: {
      backgroundColor: "#f3f4f6",
      color: "#374151",
    },
    popupEditForm: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "20px",
    },
    popupEditFormGroup: {
      marginBottom: "15px",
    },
    popupEditLabel: {
      display: "block",
      fontSize: "13px",
      fontWeight: "600",
      color: "#4b5563",
      marginBottom: "6px",
    },
    popupEditInput: {
      width: "100%",
      height: "38px",
      border: "2px solid #e5e7eb",
      borderRadius: "6px",
      padding: "0 12px",
      fontSize: "13px",
      backgroundColor: "white",
      fontFamily: "inherit",
      outline: "none",
      transition: "border-color 0.2s ease",
      boxSizing: "border-box",
    },
    popupEditInputFocus: {
      borderColor: "#6366f1",
    },
    popupEditSelect: {
      width: "100%",
      height: "38px",
      border: "2px solid #e5e7eb",
      borderRadius: "6px",
      padding: "0 12px",
      fontSize: "13px",
      backgroundColor: "white",
      fontFamily: "inherit",
      outline: "none",
      transition: "border-color 0.2s ease",
      cursor: "pointer",
      boxSizing: "border-box",
    },
    popupEditTextarea: {
      width: "100%",
      minHeight: "80px",
      border: "2px solid #e5e7eb",
      borderRadius: "6px",
      padding: "10px 12px",
      fontSize: "13px",
      backgroundColor: "white",
      fontFamily: "inherit",
      outline: "none",
      transition: "border-color 0.2s ease",
      resize: "vertical",
      boxSizing: "border-box",
    },
    popupEditError: {
      color: "#dc2626",
      fontSize: "12px",
      marginTop: "5px",
      fontWeight: "500",
    },
    popupEditButtonGroup: {
      gridColumn: "1 / -1",
      display: "flex",
      justifyContent: "flex-end",
      gap: "12px",
      marginTop: "25px",
      paddingTop: "20px",
      borderTop: "2px solid #e5e7eb",
    },
    popupEditCancelButton: {
      backgroundColor: "#f3f4f6",
      color: "#374151",
      padding: "10px 20px",
      border: "none",
      borderRadius: "6px",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer",
      fontFamily: "inherit",
      transition: "all 0.2s ease",
    },
    popupEditCancelButtonHover: {
      backgroundColor: "#e5e7eb",
    },
    popupEditSaveButton: {
      backgroundColor: "#2563eb",
      color: "white",
      padding: "10px 24px",
      border: "none",
      borderRadius: "6px",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer",
      fontFamily: "inherit",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      transition: "all 0.2s ease",
    },
    popupEditSaveButtonHover: {
      backgroundColor: "#1d4ed8",
    },
    popupEditSaveButtonDisabled: {
      backgroundColor: "#93c5fd",
      color: "white",
      padding: "10px 24px",
      border: "none",
      borderRadius: "6px",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "not-allowed",
      fontFamily: "inherit",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    popupEditLoadingSpinner: {
      width: "18px",
      height: "18px",
      border: "3px solid rgba(255, 255, 255, 0.3)",
      borderRadius: "50%",
      borderTopColor: "white",
      animation: "spin 1s linear infinite",
    },
    editButtonHover: {
      backgroundColor: "#c7d2fe",
    },
    deleteButtonHover: {
      backgroundColor: "#c7d2fe",
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
    prodDatesBadge: {
      display: "inline",
      fontSize: "10px",
      color: "#374151",
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

    prodDatesList: {
      display: "inline",
      fontSize: "10px",
    },

    statusBadge: {
      padding: "2px 8px",
      borderRadius: "4px",
      fontSize: "10px",
      fontWeight: "500",
      backgroundColor: "transparent",
      color: "#374151",
    },

    statusPass: {

      backgroundColor: "transparent",
      color: "#374151",
    },

    statusSample: {

      backgroundColor: "transparent",
      color: "#374151",
    },

    sampleDatesList: {
      display: "flex",
      flexDirection: "column",
      gap: "2px",
      fontSize: "10px",
    },

    sampleDateItem: {
      padding: "1px 4px",
      backgroundColor: "transparent",
      borderRadius: "2px",
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

  const tabNames = [
    "New",
    "Schedule",
    "Received",
    "IQC Progress",
    "Pass",
    "Complete",
  ];

  const getByFieldValue = (item) => {
    if (activeTab === "New" || activeTab === "Schedule") return item.upload_by_name || "";
    if (activeTab === "Received") return item.move_by_name || "";
    if (activeTab === "IQC Progress") return item.approve_by_name || "";
    if (activeTab === "Pass") return item.sample_by_name || "";
    if (activeTab === "Complete") return item.complete_by_name || "";
    return "";
  };

  const applyFilter = (arr, isSchedule = false) => {
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
      if (by === "by_name") return getByFieldValue(item).toLowerCase().includes(kw);
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

    const _filteredR = applyFilter(receivedVendors);
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
          <td style={styles.tdWithLeftBorder} title={String(getVendorTotalPallet(vendor))}>{getVendorTotalPallet(vendor)}</td>
          <td style={styles.tdWithLeftBorder} title={String(calculateVendorTotalItem(vendor))}>{calculateVendorTotalItem(vendor)}</td>
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
          <td style={styles.tdWithLeftBorder}>
            <button
              style={styles.checkButton}
              onClick={() => handleApproveVendor(vendor.id)}
              title="Approve"
            >
              <Check size={10} />
            </button>
            { }
            <button
              style={styles.deleteButton}
              onClick={() => handleDeleteVendor(vendor.id, null)}
              title="Delete"
            >
              <Trash2 size={10} />
            </button>
          </td>
        </tr>

        { }
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
            colSpan="12"
            style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}
          >
            Loading...
          </td>
        </tr>
      );
    }

    const _filteredI = applyFilter(iqcProgressVendors);
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
          <td style={styles.tdWithLeftBorder} title={getVendorTotalPallet(vendor).toString()}>
            {getVendorTotalPallet(vendor)}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={calculateVendorTotalItem(vendor).toString()}
          >
            {calculateVendorTotalItem(vendor)}
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
        </tr>

        { }
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
                            { }
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
                            { }
                            <td
                              style={styles.thirdLevelTd}
                              title={displayStatus || "-"}
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
                                  {!editIqcPartData.status ||
                                    editIqcPartData.status === "-" ? (
                                    <option value="">-</option>
                                  ) : null}
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
                            { }
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
                            { }
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

    const _filteredP = applyFilter(passVendors);
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
            title={getVendorTotalPallet(vendor).toString()}
          >
            {getVendorTotalPallet(vendor)}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={calculateVendorTotalItem(vendor).toString()}
          >
            {calculateVendorTotalItem(vendor)}
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

          { }
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

          { }
          <td style={styles.tdWithLeftBorder}>
            <button
              style={styles.checkButton}
              onClick={() => handleMoveVendorToComplete(vendor.id)}
              title="Move to Complete"
            >
              <CheckCircle size={10} />

            </button>
          </td>
        </tr>

        { }
        {expandedRows[vendor.id] && vendor.parts && (
          <tr>
            <td colSpan="13" style={{ padding: 0, border: "none" }}>
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
                            { }
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

                            { }
                            <td
                              style={styles.thirdLevelTd}
                              title={displayStatus || "-"}
                            >
                              <span style={styles.statusBadge}>
                                {displayStatus || "-"}
                              </span>
                            </td>

                            { }
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

                            { }
                            <td
                              style={styles.thirdLevelTd}
                              title={part.remark || "-"}
                            >
                              <span style={styles.remarkText}>
                                {part.remark || "-"}
                              </span>
                            </td>

                            { }
                            <td style={styles.thirdLevelTd}>
                              <button
                                style={styles.editButton}
                                onClick={() => handleEditPart(part, vendor.id)}
                                title="Edit"
                              >
                                <Pencil size={10} />
                              </button>
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

    const _filteredC = applyFilter(completeVendors);
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
            title={getVendorTotalPallet(vendor).toString()}
          >
            {getVendorTotalPallet(vendor)}
          </td>
          <td
            style={styles.tdWithLeftBorder}
            title={calculateVendorTotalItem(vendor).toString()}
          >
            {calculateVendorTotalItem(vendor)}
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

          { }
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

        { }
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

                            { }
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

                            { }
                            <td
                              style={styles.thirdLevelTd}
                              title={sampleStatus.status || "-"}
                            >
                              <span style={styles.statusBadge}>
                                {sampleStatus.status}
                              </span>
                            </td>

                            { }
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

                            { }
                            <td
                              style={styles.thirdLevelTd}
                              title={part.remark || "-"}
                            >
                              <span style={styles.remarkText}>
                                {part.remark || "-"}
                              </span>
                            </td>

                            { }
                            <td style={styles.thirdLevelTd}>
                              <button
                                style={styles.editButton}
                                onClick={() => handleEditPart(part, vendor.id)}
                                title="Edit"
                              >
                                <Pencil size={10} />
                              </button>
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

  const renderNewTab = () => {
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

    return (
      <>
        {schedules.map((schedule, index) => {
          const scheduleTotalPallet = calculateScheduleTotalPallet(schedule);
          const scheduleTotalItem = calculateScheduleTotalItem(schedule);

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
                <td style={styles.tdWithLeftBorder}>
                  <input
                    type="checkbox"
                    checked={selectedScheduleIds.has(schedule.id)}
                    onChange={() => handleSelectSchedule(schedule.id)}
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
                  style={{ ...styles.tdWithLeftBorder, ...styles.emptyColumn }}
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
                <td style={styles.tdWithLeftBorder} title={String(scheduleTotalPallet)}>{scheduleTotalPallet}</td>
                <td style={styles.tdWithLeftBorder} title={String(scheduleTotalItem)}>{scheduleTotalItem}</td>
                <td style={styles.tdWithLeftBorder} title={`${schedule.upload_by_name} | ${formatDateTime(schedule.updated_at || schedule.created_at)}`}>
                  {schedule.upload_by_name} |{" "}
                  {formatDateTime(schedule.updated_at || schedule.created_at)}
                </td>
              </tr>

              { }
              {expandedRows[schedule.id] &&
                schedule.vendors &&
                schedule.vendors.length > 0 && (
                  <tr>
                    <td colSpan="10" style={{ padding: 0, border: "none" }}>
                      <div
                        style={{
                          ...styles.expandedTableContainer,
                          marginLeft: tableConfig.New.vendorTable?.marginLeft,
                        }}
                      >
                        <table style={styles.expandedTable}>
                          {renderColgroup(
                            tableConfig.New.vendorTable?.cols || [],
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
                              <th style={styles.expandedTh}></th>
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
                                  <td style={styles.expandedTd} title={String(getVendorTotalPallet(vendor))}>{getVendorTotalPallet(vendor)}</td>
                                  <td style={styles.expandedTd} title={String(calculateVendorTotalItem(vendor))}>{calculateVendorTotalItem(vendor)}</td>
                                  <td style={styles.expandedTd}></td>
                                </tr>

                                { }
                                {expandedVendorRows[
                                  `vendor_${schedule.id}_${vendor.id}`
                                ] &&
                                  vendor.parts && (
                                    <tr>
                                      <td
                                        colSpan="9"
                                        style={{ padding: 0, border: "none" }}
                                      >
                                        <div
                                          style={{
                                            ...styles.thirdLevelTableContainer,
                                            marginLeft:
                                              tableConfig.New.partsTable
                                                ?.marginLeft,
                                          }}
                                        >
                                          <table style={styles.thirdLevelTable}>
                                            {renderColgroup(
                                              tableConfig.New.partsTable
                                                ?.cols || [],
                                            )}
                                            <thead>
                                              <tr
                                                style={
                                                  styles.expandedTableHeader
                                                }
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
                                                vendor.parts.map(
                                                  (part, pIdx) => (
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
                                                        style={
                                                          styles.thirdLevelTd
                                                        }
                                                        title={
                                                          part.part_code || "-"
                                                        }
                                                      >
                                                        {part.part_code || "-"}
                                                      </td>
                                                      <td
                                                        style={
                                                          styles.thirdLevelTd
                                                        }
                                                        title={
                                                          part.part_name || "-"
                                                        }
                                                      >
                                                        {part.part_name || "-"}
                                                      </td>
                                                      <td
                                                        style={
                                                          styles.thirdLevelTd
                                                        }
                                                        title={
                                                          part.qty?.toString() ||
                                                          "0"
                                                        }
                                                      >
                                                        {part.qty || 0}
                                                      </td>
                                                      <td
                                                        style={
                                                          styles.thirdLevelTd
                                                        }
                                                        title={
                                                          part.qty_box?.toString() ||
                                                          "0"
                                                        }
                                                      >
                                                        {part.qty_box || 0}
                                                      </td>
                                                      <td
                                                        style={
                                                          styles.thirdLevelTd
                                                        }
                                                        title={
                                                          part.unit || "PCS"
                                                        }
                                                      >
                                                        {part.unit || "PCS"}
                                                      </td>
                                                      <td
                                                        style={
                                                          styles.thirdLevelTd
                                                        }
                                                        title={(() => {
                                                          const prodDates =
                                                            part.prod_dates ||
                                                            (part.prod_date
                                                              ? [part.prod_date]
                                                              : []);
                                                          if (
                                                            prodDates.length ===
                                                            0
                                                          )
                                                            return "-";
                                                          return prodDates
                                                            .map((d) =>
                                                              formatDate(d),
                                                            )
                                                            .join(", ");
                                                        })()}
                                                      >
                                                        {(() => {
                                                          const prodDates =
                                                            part.prod_dates ||
                                                            (part.prod_date
                                                              ? [part.prod_date]
                                                              : []);
                                                          if (
                                                            prodDates.length ===
                                                            0
                                                          )
                                                            return "-";
                                                          return prodDates
                                                            .map((d) =>
                                                              formatDate(d),
                                                            )
                                                            .join(", ");
                                                        })()}
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
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
            </React.Fragment>
          );
        })}
      </>
    );
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

    const _filteredS = applyFilter(schedules, true);
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
            <td style={styles.tdWithLeftBorder} title={schedule.stock_level || "-"}>{schedule.stock_level || "-"}</td>
            <td style={styles.tdWithLeftBorder} title={schedule.model_name || "-"}>{schedule.model_name || "-"}</td>
            <td style={styles.tdWithLeftBorder} title={schedule.total_vendor || 0}>{schedule.total_vendor || 0}</td>
            <td style={styles.tdWithLeftBorder} title={String(calculateScheduleTotalPallet(schedule))}>{calculateScheduleTotalPallet(schedule)}</td>
            <td style={styles.tdWithLeftBorder} title={String(calculateScheduleTotalItem(schedule))}>{calculateScheduleTotalItem(schedule)}</td>
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

          { }
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
                          <th style={styles.expandedTh}>Action</th>
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
                                {vendor.do_number && vendor.do_number.length > 0
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
                              <td style={styles.expandedTd} title={getVendorTotalPallet(vendor)}>
                                {getVendorTotalPallet(vendor)}
                              </td>
                              <td style={styles.expandedTd} title={String(calculateVendorTotalItem(vendor))}>{calculateVendorTotalItem(vendor)}</td>
                              <td style={styles.expandedTd}>
                                <button
                                  style={styles.addButton}
                                  onClick={() =>
                                    handleOpenAddPart(schedule.id, vendor.id)
                                  }
                                  title="Add Part"
                                >
                                  <Plus size={10} />
                                </button>
                                <button
                                  style={styles.checkButton}
                                  onClick={() =>
                                    handleMoveVendorToReceived(vendor.id)
                                  }
                                  title="Move to Received"
                                >
                                  <CheckCircle size={10} />
                                </button>
                                <button
                                  style={styles.deleteButton}
                                  onClick={() =>
                                    handleDeleteVendor(vendor.id, schedule.id)
                                  }
                                  title="Delete"
                                >
                                  <Trash2 size={10} />
                                </button>
                              </td>
                            </tr>

                            { }
                            {expandedVendorRows[
                              `vendor_${schedule.id}_${vendor.id}`
                            ] &&
                              vendor.parts && (
                                <tr>
                                  <td
                                    colSpan="9"
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
                                          tableConfig.Schedule.partsTable?.cols ||
                                          [],
                                        )}
                                        <thead>
                                          <tr style={styles.expandedTableHeader}>
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
                                            <th style={styles.thirdLevelTh}>
                                              Action
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
                                                        editPartData.qty_box || ""
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
                                                            unit: e.target.value,
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
                                                              newDates[dateIdx] =
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
                                                                  const newDates = (
                                                                    editPartData.prod_dates || [
                                                                      "",
                                                                    ]
                                                                  ).filter(
                                                                    (_, i) =>
                                                                      i !== dateIdx,
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
                                                        editPartData.remark || ""
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
                                                <td style={styles.thirdLevelTd}>
                                                  {editingPartId === part.id ? (
                                                    <>
                                                      <button
                                                        style={styles.saveButton}
                                                        onClick={() =>
                                                          handleSaveEditPart(
                                                            part.id,
                                                          )
                                                        }
                                                        title="Save"
                                                      >
                                                        <Save size={10} />
                                                      </button>
                                                      <button
                                                        style={
                                                          styles.cancelButton
                                                        }
                                                        onClick={
                                                          handleCancelEditPart
                                                        }
                                                        title="Cancel"
                                                      >
                                                        <X size={10} />
                                                      </button>
                                                    </>
                                                  ) : (
                                                    <>
                                                      <button
                                                        style={styles.editButton}
                                                        onClick={() =>
                                                          handleEditPart(
                                                            part,
                                                            vendor.id,
                                                          )
                                                        }
                                                        title="Edit"
                                                      >
                                                        <Pencil size={10} />
                                                      </button>
                                                      <button
                                                        style={
                                                          styles.deleteButton
                                                        }
                                                        onClick={() =>
                                                          handleDeletePart(
                                                            part.id,
                                                          )
                                                        }
                                                        title="Delete"
                                                      >
                                                        <Trash2 size={10} />
                                                      </button>
                                                    </>
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
                  {activeTab === "New" || activeTab === "Schedule"
                    ? "Upload By"
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

        { }
        <div style={styles.actionButtonsGroup}>
          <button
            style={{ ...styles.button, ...styles.primaryButton }}
            onClick={() => navigate("/oversea-schedule/add")}
          >
            <Plus size={16} />
            Create
          </button>
        </div>

        { }
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

        { }
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
                    <th style={styles.thWithLeftBorder}>Action</th>
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
                {renderColgroup(tableConfig.Pass.mainTable.cols)}
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
                    <th style={styles.thWithLeftBorder}>Action</th>
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
            ) : activeTab === "New" ? (
              <table
                style={{
                  ...styles.table,
                  minWidth: "1200px",
                  tableLayout: "fixed",
                }}
              >
                {renderColgroup(tableConfig.New.mainTable.cols)}
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.expandedTh}>No</th>
                    <th style={styles.thWithLeftBorder}>
                      {schedules.length > 1 && (
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={handleSelectAll}
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
                    <th style={styles.thWithLeftBorder}></th>
                    <th style={styles.thWithLeftBorder}>Schedule Date</th>
                    <th style={styles.thWithLeftBorder}>Stock Level</th>
                    <th style={styles.thWithLeftBorder}>Model</th>
                    <th style={styles.thWithLeftBorder}>Total Vendor</th>
                    <th style={styles.thWithLeftBorder}>Total Pallet</th>
                    <th style={styles.thWithLeftBorder}>Total Item</th>
                    <th style={styles.thWithLeftBorder}>Upload By</th>
                  </tr>
                </thead>
                <tbody>{renderNewTab()}</tbody>
              </table>
            ) : (
              <table
                style={{
                  ...styles.table,
                  minWidth: "1200px",
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
                    <th style={styles.thWithLeftBorder}>Action</th>
                  </tr>
                </thead>
                <tbody>{renderScheduleTab()}</tbody>
              </table>
            )}
          </div>

          { }
          {(() => {
            const _rawData = activeTab === "Received" ? receivedVendors
              : activeTab === "IQC Progress" ? iqcProgressVendors
              : activeTab === "Pass" ? passVendors
              : activeTab === "Complete" ? completeVendors
              : schedules;
            const _activeData = applyFilter(_rawData, activeTab === "New" || activeTab === "Schedule");
            const _totalPages = Math.max(1, Math.ceil(_activeData.length / ROWS_PER_PAGE));
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

      { }
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
              onSubmit={handleAddVendorSubmit}
            >
              <div style={vendorDetailStyles.formGroup}>
                <label style={vendorDetailStyles.label}>Trip:</label>
                <select
                  style={vendorDetailStyles.select}
                  value={addVendorFormData.trip}
                  onChange={onTripChange}
                  required
                >
                  <option value="">Select Trip</option>
                  {tripOptions.length === 0 ? (
                    <option value="" disabled>
                      (loading / empty)
                    </option>
                  ) : (
                    tripOptions.map((t) => (
                      <option key={t.id} value={String(t.trip_no)}>
                        {t.trip_no}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div style={vendorDetailStyles.formGroup}>
                <label style={vendorDetailStyles.label}>Arrival Time:</label>
                <input
                  type="time"
                  value={(addVendorFormData.arrivalTime || "").slice(0, 5)}
                  readOnly
                  style={vendorDetailStyles.timeInput}
                  required
                />
              </div>
              <div style={vendorDetailStyles.formGroup}>
                <label style={vendorDetailStyles.label}>Vendor:</label>
                <select
                  style={vendorDetailStyles.select}
                  value={addVendorFormData.vendor}
                  onChange={(e) =>
                    handleAddVendorInputChange("vendor", e.target.value)
                  }
                  required
                >
                  <option value="">Select Vendor</option>
                  {vendorOptions.length === 0 ? (
                    <option value="" disabled>
                      (loading / empty)
                    </option>
                  ) : (
                    vendorOptions.map((v) => {
                      const label = `${v.vendor_code} - ${v.vendor_name}`;
                      return (
                        <option key={v.id} value={label}>
                          {label}
                        </option>
                      );
                    })
                  )}
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
                      onChange={(e) =>
                        handleDoNumberChange(index, e.target.value)
                      }
                      placeholder={`DO Number ${index + 1}`}
                      required
                    />
                    {addVendorFormData.doNumbers.length > 1 && (
                      <button
                        type="button"
                        style={vendorDetailStyles.removeButton}
                        onClick={() => removeDoNumberField(index)}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  style={vendorDetailStyles.addButton}
                  onClick={addDoNumberField}
                >
                  <Plus size={14} /> Add Column
                </button>
              </div>
              <div style={vendorDetailStyles.buttonGroup}>
                <button
                  type="button"
                  onClick={() => {
                    setAddVendorFormData({
                      trip: "",
                      vendor: "",
                      doNumbers: [""],
                      arrivalTime: "",
                    });
                    setAddVendorDetail(false);
                  }}
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

      { }
      {addVendorPartDetail && (
        <div style={vendorPartStyles.popupOverlay}>
          <div style={vendorPartStyles.popupContainer}>
            <div style={vendorPartStyles.popupHeader}>
              <h3 style={vendorPartStyles.popupTitle}>
                Add Vendor Part Details
              </h3>
              <button
                onClick={() => {
                  setAddVendorPartDetail(false);
                  setActiveVendorContext(null);
                  setAddVendorPartFormData({
                    trip: "",
                    vendor: "",
                    doNumbers: [""],
                    arrivalTime: "",
                    parts: [],
                  });
                  setSelectedPartsInPopup([]);
                }}
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
                        e.currentTarget.parentElement.querySelector("input");
                      if (!input) {
                        console.error("Part Code input not found");
                        return;
                      }
                      handleAddPart(input.value);
                      input.value = "";
                    }}
                  >
                    <Plus size={16} />
                    Add
                  </button>
                </div>
              </div>
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
                        <col style={{ width: "2.5%" }} />
                        <col style={{ width: "2.5%" }} />
                        <col style={{ width: "15%" }} />
                        <col style={{ width: "25%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "8%" }} />
                      </colgroup>
                      <thead>
                        <tr style={vendorPartStyles.tableHeader}>
                          <th style={vendorPartStyles.th}>No</th>
                          <th style={vendorPartStyles.th}>
                            {addVendorPartFormData.parts.length > 1 && (
                              <input
                                type="checkbox"
                                onChange={handleSelectAllInPopup}
                                checked={
                                  addVendorPartFormData.parts.length > 0 &&
                                  selectedPartsInPopup.length ===
                                  addVendorPartFormData.parts.length
                                }
                                style={{
                                  cursor: "pointer",
                                  width: "12px",
                                  height: "12px",
                                }}
                              />
                            )}
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
                          <tr></tr>
                        ) : (
                          addVendorPartFormData.parts.map((part, index) => (
                            <tr
                              key={part.id || index}
                              onMouseEnter={(e) =>
                              (e.target.closest("tr").style.backgroundColor =
                                "#c7cde8")
                              }
                              onMouseLeave={(e) =>
                              (e.target.closest("tr").style.backgroundColor =
                                "transparent")
                              }
                            >
                              <td style={vendorPartStyles.tdNumber} title={String(index + 1)}>
                                {index + 1}
                              </td>
                              <td style={styles.tdWithLeftBorder}>
                                <input
                                  type="checkbox"
                                  checked={selectedPartsInPopup.includes(
                                    part.id,
                                  )}
                                  onChange={(e) =>
                                    handlePopupCheckboxChange(e, part.id)
                                  }
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
                                style={vendorPartStyles.td}
                                title={`${part.partCode}`}
                              >
                                {part.partCode}
                              </td>
                              <td
                                style={vendorPartStyles.td}
                                title={`${part.partName || "—"}`}
                              >
                                {part.partName || "—"}
                              </td>
                              <td style={vendorPartStyles.td}>
                                <input
                                  type="number"
                                  value={part.qty || ""}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (
                                      value.includes("e") ||
                                      value.includes("E")
                                    ) {
                                      const cleanValue = value.replace(
                                        /[eE]/g,
                                        "",
                                      );
                                      handlePopupPartQtyChange(
                                        part.id,
                                        cleanValue,
                                      );
                                    } else {
                                      handlePopupPartQtyChange(part.id, value);
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (["e", "E", "+"].includes(e.key)) {
                                      e.preventDefault();
                                    }
                                  }}
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
                                <div>
                                  <div>{part.qtyBox || ""}</div>
                                  {part.qtyPerBoxFromMaster &&
                                    part.qtyPerBoxFromMaster > 0 && (
                                      <div
                                        style={{
                                          fontSize: "9px",
                                          color: "#6b7280",
                                        }}
                                      ></div>
                                    )}
                                </div>
                              </td>
                              <td
                                style={vendorPartStyles.td}
                                title={`${part.unit || "PCS"}`}
                              >
                                {part.unit || "PCS"}
                              </td>
                              <td style={vendorPartStyles.td}>
                                <button
                                  style={vendorPartStyles.deleteButton}
                                  onClick={() => handleRemovePart(part.id)}
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

      { }
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

      { }
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

export default OverseaPartSchedulePage;