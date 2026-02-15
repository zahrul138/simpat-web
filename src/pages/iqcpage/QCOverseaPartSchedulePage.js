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
  RotateCcw,
  Calendar,
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
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());

  // PERMISSIONS
  const canCreateSchedule = true;
  const canDeleteSchedule = true;
  const canEditSchedule = true;
  const canEditPartsInSchedule = true;

  // STATE UNTUK DATA
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedScheduleIds, setSelectedScheduleIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [expandedVendorRows, setExpandedVendorRows] = useState({});
  const [activeTab, setActiveTab] = useState("Schedule");

  // STATE FOR PALLET CALCULATIONS
  const [palletCalculations, setPalletCalculations] = useState({});

  // PALLET CONFIGURATION
  const palletConfig = {
    large: {
      width: 110,
      length: 110,
      maxHeight: 170,
      baseHeight: 15,
      maxWeight: 150,
      name: "Large Pallet (110x110)",
    },
    small: {
      width: 76,
      length: 96,
      maxHeight: 150,
      baseHeight: 15,
      maxWeight: 60,
      name: "Small Pallet (76x96)",
    },
  };

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
    parts: [],
  });
  const [partSearchInput, setPartSearchInput] = useState("");

  // STATE FOR TABS
  const [receivedVendors, setReceivedVendors] = useState([]);
  const [iqcProgressVendors, setIqcProgressVendors] = useState([]);
  const [editingIqcPartId, setEditingIqcPartId] = useState(null);
  const [editIqcPartData, setEditIqcPartData] = useState({});
  const [qcChecksComplete, setQcChecksComplete] = useState([]);
  const [passVendors, setPassVendors] = useState([]);
  const [editingPassPartId, setEditingPassPartId] = useState(null);
  const [editPassPartData, setEditPassPartData] = useState({});
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
          "26px", // No
          "26px", // Arrow
          "25%", // Vendor
          "15%", // DO Number
          "10%", // Total Pallet
          "10%", // Total Item
          "12%", // Schedule Date
          "12%", // Stock Level
          "10%", // Model
          "25%", // Move By
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
          "26px", // No
          "26px", // Arrow
          "25%", // Vendor
          "12%", // DO Number
          "8%", // Total Pallet
          "8%", // Total Item
          "15%", // Schedule Date
          "10%", // Stock Level
          "10%", // Model
          "10%", // Complete By
          "12%", // Complete At
          "25%"
        ],
      },
      partsTable: {
        marginLeft: "51.8px",
        cols: ["3%", "12%", "25%", "8%", "8%", "7%", "20%", "7%", "20%", "15%", "9%"],
      },
    },
    Pass: {
      mainTable: {
        cols: [
          "26px", // No
          "26px", // Arrow
          "14%", // Vendor
          "11%", // DO Number
          "7%", // Total Pallet
          "7%", // Total Item
          "10%", // Schedule Date
          "7%", // Stock Level
          "9%", // Model
          "10%", // Pass By
          "11%", // Pass At
          "7%", // Action
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
          "20%",
        ],
      },
    },
    Complete: {
      mainTable: {
        cols: [
          "26px", // No
          "26px", // Arrow
          "25%", // Vendor
          "12%", // DO Number
          "8%", // Total Pallet
          "8%", // Total Item
          "15%", // Schedule Date
          "10%", // Stock Level
          "10%", // Model
          "10%", // Complete By
          "12%", // Complete At
          "25%"
        ],
      },
      partsTable: {
        marginLeft: "51.8px",
        cols: ["3%", "12%", "25%", "8%", "8%", "7%", "20%", "7%", "20%", "15%",],
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

  // Check if prod_date is complete in qc_checks
  const isProductionDateComplete = (partCode, prodDate) => {
    if (!partCode || !prodDate || !qcChecksComplete.length) return false;
    return qcChecksComplete.some(
      (qc) =>
        qc.part_code === partCode &&
        qc.production_date === prodDate &&
        qc.status === "Complete",
    );
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

  // ====== PALLET CALCULATION HELPER FUNCTIONS ======

  // Helper: cek apakah box muat di pallet (dengan mempertimbangkan rotasi)
  const canBoxFitPallet = (boxLength, boxWidth, palletLength, palletWidth) => {
    return (
      (boxLength <= palletLength && boxWidth <= palletWidth) ||
      (boxWidth <= palletLength && boxLength <= palletWidth)
    );
  };

  // Fungsi untuk menghitung kapasitas maksimal box dalam pallet
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

    // Hitung boxes per layer dengan orientasi terbaik
    let bestBoxesPerLayer = 0;

    // Coba orientasi normal
    const boxesLengthwiseNormal = Math.floor(config.length / box.length);
    const boxesWidthwiseNormal = Math.floor(config.width / box.width);
    const boxesPerLayerNormal = boxesLengthwiseNormal * boxesWidthwiseNormal;

    // Coba orientasi rotated
    const boxesLengthwiseRotated = Math.floor(config.length / box.width);
    const boxesWidthwiseRotated = Math.floor(config.width / box.length);
    const boxesPerLayerRotated = boxesLengthwiseRotated * boxesWidthwiseRotated;

    // Ambil yang terbaik
    if (boxesPerLayerNormal >= boxesPerLayerRotated) {
      bestBoxesPerLayer = boxesPerLayerNormal;
    } else {
      bestBoxesPerLayer = boxesPerLayerRotated;
    }

    // Untuk large pallet, coba kombinasi mixed jika kurang dari 4
    if (palletType === "large" && bestBoxesPerLayer < 4) {
      const boxesMixed = boxesPerLayerNormal + boxesPerLayerRotated;
      if (boxesMixed > bestBoxesPerLayer) {
        bestBoxesPerLayer = Math.min(4, boxesMixed);
      }
    }

    // Hitung maksimal layers berdasarkan tinggi
    const maxLayersByHeight = Math.floor(availableHeight / box.height);
    const safeLayersByHeight = Math.max(1, maxLayersByHeight - 1);

    // Hitung berat per layer
    const weightPerLayer = bestBoxesPerLayer * box.weight;

    // Hitung maksimal layers berdasarkan berat
    const maxLayersByWeight = Math.floor(config.maxWeight / weightPerLayer);

    // Ambil yang lebih kecil antara batas tinggi dan batas berat
    const safeLayers = Math.min(safeLayersByHeight, maxLayersByWeight);
    const finalLayers = Math.max(1, safeLayers);

    // Total boxes per pallet berdasarkan dimensi
    const maxBoxesByDimension = bestBoxesPerLayer * finalLayers;

    // Hitung max boxes berdasarkan berat saja
    const maxBoxesByWeight = Math.floor(config.maxWeight / box.weight);

    // Ambil yang lebih kecil (dimensi ATAU berat yang membatasi)
    const maxBoxesPerPallet = Math.min(maxBoxesByDimension, maxBoxesByWeight);

    return {
      maxBoxesPerPallet: Math.max(1, maxBoxesPerPallet),
      boxesPerLayer: bestBoxesPerLayer,
      maxLayers: finalLayers,
    };
  };

  // Fungsi optimasi untuk mixing pallet
  const optimizePalletMixing = (palletDetails) => {
    if (palletDetails.length <= 1) return palletDetails;

    const optimized = [...palletDetails];

    // Coba gabung pallet yang sama type dan masih ada space
    for (let i = 0; i < optimized.length; i++) {
      for (let j = i + 1; j < optimized.length; j++) {
        const palletA = optimized[i];
        const palletB = optimized[j];

        // Hanya gabung jika type sama
        if (palletA.palletType !== palletB.palletType) continue;

        const maxWeight = palletA.palletType === "large" ? 150 : 60;
        const combinedWeight = palletA.totalWeight + palletB.totalWeight;
        const combinedBoxes = palletA.boxesCount + palletB.boxesCount;

        // Cek apakah bisa digabung (berat dan kapasitas)
        if (combinedWeight <= maxWeight && combinedBoxes <= palletA.capacity) {
          // Gabungkan ke palletA
          palletA.boxesCount = combinedBoxes;
          palletA.totalWeight = combinedWeight;

          // Hapus palletB
          optimized.splice(j, 1);
          j--; // Adjust index karena array berubah
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

      // 1. Kumpulkan data box berdasarkan ukuran
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

      // 2. Hitung pallet untuk setiap kelompok box
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

        // Cek apakah muat di small pallet
        const fitsSmall = canBoxFitPallet(group.length, group.width, 96, 76);
        const fitsLarge = canBoxFitPallet(group.length, group.width, 110, 110);

        let palletType = "large";
        if (!fitsLarge && fitsSmall) {
          palletType = "small";
        }

        // Hitung kapasitas untuk pallet type yang dipilih
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

        // Hitung berapa pallet dibutuhkan
        const palletsNeeded = Math.ceil(
          group.totalBoxes / capacity.maxBoxesPerPallet
        );

        console.log(`  Pallets needed: ${palletsNeeded}`);

        // Distribusikan ke pallet-pallet
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

      // 3. Coba optimasi mixing untuk box yang underutilized
      const optimizedPallets = optimizePalletMixing(palletDetails);

      // 4. Hitung hasil akhir
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
      // Fallback ke perhitungan sederhana
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

    // Kelompokkan box berdasarkan ukuran
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

      // Pilih pallet type
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

      // Hitung pallet yang dibutuhkan
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

    // Optimasi: gabung small pallets jika bisa
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

  // Fungsi untuk mendapatkan dimensi box dari part
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

  // FUNGSI BARU: recalculatePalletForVendor - sama seperti di OverseaPartSchedulePage.js
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

      // Collect box data dengan placement details
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

          // Tambahkan box sebanyak qtyBox
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

      // Hitung pallet dengan optimasi
      const result = await calculateOptimizedMixedPallet(boxData);

      console.log(`[Recalc] Vendor ${vendorId} result:`, result);

      setPalletCalculations((prev) => ({
        ...prev,
        [vendorId]: result,
      }));

      return result;
    } catch (error) {
      console.error(`[Recalc] Error for vendor ${vendorId}:`, error);

      // Fallback: hitung dari qty_box
      let totalQtyBox = 0;
      if (parts && Array.isArray(parts)) {
        parts.forEach((part) => {
          totalQtyBox += parseInt(part.qty_box || part.quantity_box || 0);
        });
      }

      const fallbackResult = {
        largePallets: 0,
        smallPallets: totalQtyBox, // fallback: 1 box = 1 small pallet
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

  // Async function untuk menghitung pallet dengan placement data
  const calculateVendorPalletWithPlacement = async (vendor) => {
    if (!vendor || !vendor.parts || vendor.parts.length === 0) {
      return {
        largePallets: 0,
        smallPallets: 0,
        totalPallets: 0,
        totalWeight: 0,
      };
    }

    try {
      const boxGroups = {};
      let totalWeight = 0;

      for (const part of vendor.parts) {
        const partCode = part.part_code || part.partCode;
        const qtyBox = Number(part.qty_box || part.quantity_box || 0);

        if (qtyBox <= 0 || !partCode) continue;

        let placementData = null;
        let partWeight = 0;

        // Fetch placement data dari API
        try {
          const placementResp = await fetch(
            `${API_BASE}/api/kanban-master/placement-details?part_code=${encodeURIComponent(partCode)}`,
          );
          if (placementResp.ok) {
            const result = await placementResp.json();
            placementData = result.item || result.data;

            if (placementData?.part_weight) {
              partWeight = parseFloat(placementData.part_weight);
              // Convert to kg if needed
              if (placementData.weight_unit === "g") {
                partWeight = partWeight / 1000;
              } else if (placementData.weight_unit === "lbs") {
                partWeight = partWeight * 0.453592;
              }
            }
          }
        } catch (err) {
          console.warn(`Error fetching placement for ${partCode}:`, err);
        }

        // Jika ada data dimensi, gunakan untuk kalkulasi
        if (
          placementData &&
          placementData.length_cm &&
          placementData.width_cm &&
          placementData.height_cm
        ) {
          const boxKey = `${placementData.length_cm}x${placementData.width_cm}x${placementData.height_cm}`;

          if (!boxGroups[boxKey]) {
            boxGroups[boxKey] = {
              totalBoxes: 0,
              totalWeight: 0,
              length: parseFloat(placementData.length_cm),
              width: parseFloat(placementData.width_cm),
              height: parseFloat(placementData.height_cm),
            };
          }

          boxGroups[boxKey].totalBoxes += qtyBox;
          boxGroups[boxKey].totalWeight += partWeight * qtyBox;
          totalWeight += partWeight * qtyBox;
        }
      }

      // Jika tidak ada data placement, fallback ke qty_box
      if (Object.keys(boxGroups).length === 0) {
        let totalQtyBox = 0;
        vendor.parts.forEach((part) => {
          totalQtyBox += Number(part.qty_box || part.quantity_box || 0);
        });
        return {
          largePallets: 0,
          smallPallets: 0,
          totalPallets: totalQtyBox, // Fallback: 1 box = 1 pallet (simplified)
          totalWeight: 0,
          isFallback: true,
        };
      }

      // Hitung pallet untuk setiap kelompok box
      let totalLargePallets = 0;
      let totalSmallPallets = 0;

      for (const key in boxGroups) {
        const group = boxGroups[key];
        if (group.totalBoxes <= 0) continue;

        const avgWeightPerBox = group.totalWeight / group.totalBoxes || 0.5;

        // Cek apakah muat di pallet
        const fitsLarge = canBoxFitPallet(group.length, group.width, 110, 110);
        const fitsSmall = canBoxFitPallet(group.length, group.width, 96, 76);

        let palletType = "large";
        if (!fitsLarge && fitsSmall) {
          palletType = "small";
        }

        // Hitung kapasitas
        const capacity = calculateMaxBoxesInPallet(
          {
            length: group.length,
            width: group.width,
            height: group.height,
            weight: avgWeightPerBox,
          },
          palletType,
        );

        // Hitung pallet yang dibutuhkan
        const palletsNeeded = Math.ceil(
          group.totalBoxes / capacity.maxBoxesPerPallet,
        );

        if (palletType === "large") {
          totalLargePallets += palletsNeeded;
        } else {
          totalSmallPallets += palletsNeeded;
        }
      }

      // Optimasi: gabung small pallets jika bisa
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
      };
    } catch (error) {
      console.error("Error calculating pallet:", error);
      // Fallback
      let totalQtyBox = 0;
      vendor.parts.forEach((part) => {
        totalQtyBox += Number(part.qty_box || part.quantity_box || 0);
      });
      return {
        largePallets: 0,
        smallPallets: 0,
        totalPallets: totalQtyBox,
        totalWeight: 0,
        isFallback: true,
      };
    }
  };

  // Kalkulasi Total Pallet untuk vendor - menggunakan palletCalculations jika tersedia
  const getVendorTotalPallet = (vendor) => {
    // CRITICAL: PRIORITIZE DATABASE VALUE
    // Always use vendor.total_pallet from database if available
    if (vendor.total_pallet !== undefined && vendor.total_pallet !== null) {
      return vendor.total_pallet;
    }

    // Fallback 1: Use calculation if available
    const vendorId = vendor.id;
    const calculation = palletCalculations[vendorId];
    if (calculation && calculation.totalPallets !== undefined) {
      return calculation.totalPallets;
    }

    // Fallback 2: Calculate from qty_box
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

  // Alias untuk backward compatibility
  const calculateVendorTotalPallet = getVendorTotalPallet;

  const calculateVendorTotalItem = (vendor) => {
    if (!vendor || !vendor.parts || vendor.parts.length === 0) {
      return vendor?.total_item || 0;
    }

    return vendor.parts.length;
  };

  // Kalkulasi Total Pallet untuk schedule (aggregate dari semua vendor)
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

  // Kalkulasi Total Item untuk schedule (aggregate dari semua vendor)
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

  // Effect untuk menghitung pallet dengan placement data saat schedules berubah
  useEffect(() => {
    const calculateAllPallets = async () => {
      console.log("=== CALCULATING ALL PALLETS (QC) ===");

      // 1. Hitung untuk semua vendors di schedules (tab New dan Schedule)
      for (const schedule of schedules) {
        if (!schedule.vendors || schedule.vendors.length === 0) continue;

        for (const vendor of schedule.vendors) {
          // PERBAIKAN: Selalu hitung ulang menggunakan recalculatePalletForVendor
          if (vendor.parts && vendor.parts.length > 0) {
            console.log(`[Auto Calc] Schedule vendor ${vendor.id}`);
            await recalculatePalletForVendor(vendor.id, vendor.parts);
          }
        }
      }

      // 2. Hitung untuk received vendors
      if (activeTab === "Received") {
        for (const vendor of receivedVendors) {
          if (vendor.parts && vendor.parts.length > 0) {
            console.log(`[Auto Calc] Received vendor ${vendor.id}`);
            await recalculatePalletForVendor(vendor.id, vendor.parts);
          }
        }
      }

      // 3. Hitung untuk IQC Progress vendors
      if (activeTab === "IQC Progress") {
        for (const vendor of iqcProgressVendors) {
          if (vendor.parts && vendor.parts.length > 0) {
            console.log(`[Auto Calc] IQC Progress vendor ${vendor.id}`);
            await recalculatePalletForVendor(vendor.id, vendor.parts);
          }
        }
      }

      // 4. Hitung untuk Pass vendors
      if (activeTab === "Pass") {
        for (const vendor of passVendors) {
          if (vendor.parts && vendor.parts.length > 0) {
            console.log(`[Auto Calc] Pass vendor ${vendor.id}`);
            await recalculatePalletForVendor(vendor.id, vendor.parts);
          }
        }
      }

      // 5. Hitung untuk Complete vendors
      if (activeTab === "Complete") {
        for (const vendor of completeVendors) {
          if (vendor.parts && vendor.parts.length > 0) {
            console.log(`[Auto Calc] Complete vendor ${vendor.id}`);
            await recalculatePalletForVendor(vendor.id, vendor.parts);
          }
        }
      }
    };

    calculateAllPallets();
  }, [schedules, receivedVendors, iqcProgressVendors, passVendors, completeVendors, activeTab]);

  // ====== API FUNCTIONS ======

  // Fetch schedules based on active tab
  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API_BASE}/api/oversea-schedules?status=${activeTab}`;

      if (filters.dateFrom) url += `&date_from=${filters.dateFrom}`;
      if (filters.dateTo) url += `&date_to=${filters.dateTo}`;
      if (filters.vendorName)
        url += `&vendor_name=${encodeURIComponent(filters.vendorName)}`;
      if (filters.partCode)
        url += `&part_code=${encodeURIComponent(filters.partCode)}`;

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
  }, [activeTab, filters]);

  // Fetch received vendors
  const fetchReceivedVendors = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/oversea-schedules/received-vendors`,
      );
      const data = await response.json();
      console.log("Received vendors API response:", data);

      // API returns { vendors: [...] } format
      if (data.vendors) {
        console.log("Setting receivedVendors from data.vendors:", data.vendors);
        setReceivedVendors(data.vendors || []);
      } else if (data.success && data.data) {
        // Fallback for { success: true, data: [...] } format
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

  // Fetch IQC Progress vendors
  const fetchIqcProgressVendors = useCallback(async () => {
    setLoading(true);
    try {
      const [vendorsRes, qcRes] = await Promise.all([
        fetch(`${API_BASE}/api/oversea-schedules/iqc-progress-vendors`),
        fetch(`${API_BASE}/api/qc-checks?status=Complete`),
      ]);

      const vendorsData = await vendorsRes.json();
      const qcData = await qcRes.json();

      // API returns { vendors: [...] } format
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

  // Fetch Sample vendors
  const fetchPassVendors = useCallback(async () => {
    setLoading(true);
    try {
      const [vendorsRes, qcRes] = await Promise.all([
        fetch(`${API_BASE}/api/oversea-schedules/sample-vendors`),
        fetch(`${API_BASE}/api/qc-checks?status=Complete`),
      ]);

      const vendorsData = await vendorsRes.json();
      const qcData = await qcRes.json();

      // API returns { vendors: [...] } format
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

  // Fetch Complete vendors
  const fetchCompleteVendors = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/oversea-schedules/complete-vendors`,
      );
      const data = await response.json();

      // API returns { vendors: [...] } format
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

  // Fetch trips for add vendor
  const fetchTrips = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/trips`);
      const data = await response.json();
      if (data.success) {
        setTripOptions(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching trips:", error);
    }
  };

  // Fetch vendors for add vendor
  const fetchVendors = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/vendor-detail`);
      const data = await response.json();
      if (data.success) {
        setVendorOptions(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
    }
  };

  // Effect to fetch data based on active tab
  useEffect(() => {
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

  // ====== HANDLER FUNCTIONS ======

  // Handle search
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

  // Handle select all checkbox
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedScheduleIds(new Set());
    } else {
      const allIds = new Set(schedules.map((s) => s.id));
      setSelectedScheduleIds(allIds);
    }
    setSelectAll(!selectAll);
  };

  // Handle individual checkbox
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

  // Move selected schedules from New to Schedule
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
            status: "Schedule", // Ini akan diubah ke "Scheduled" di backend
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

  // Move vendor to Received (from Schedule tab) - DISABLED FOR QC PAGE
  const handleMoveVendorToReceived = async (vendorId) => {
    // Disabled for QC page - this action is only available on OverseaPartSchedulePage
    return;
  };

  // Approve vendor (from Received to IQC Progress + add stock) - DISABLED FOR QC PAGE
  const handleApproveVendor = async (vendorId) => {
    // Disabled for QC page - this action is only available on OverseaPartSchedulePage
    return;
  };

  // Move vendor from IQC Progress to Pass
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

  // Move vendor from Pass to Complete
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
      } else {
        throw new Error(result.message || "Failed to move vendor");
      }
    } catch (error) {
      alert("Failed to move vendor: " + error.message);
    }
  };

  // ====== IQC PROGRESS TAB - EDIT PART HANDLERS ======
  const handleEditIqcPart = (part) => {
    setEditingIqcPartId(part.id);

    const existingDates = part.prod_dates ? [...part.prod_dates] : [];
    if (
      part.prod_date &&
      !existingDates.includes(part.prod_date.split("T")[0])
    ) {
      existingDates.unshift(part.prod_date.split("T")[0]);
    }

    // DAPATKAN STATUS YANG SEBENARNYA DARI DATABASE
    const statusFromDB = part.status || ""; // ← Ambil langsung dari data part

    setEditIqcPartData({
      status: statusFromDB, // ← GUNAKAN STATUS DARI DATABASE, bukan autoStatus
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
      // Filter out empty dates
      const validDates = (editIqcPartData.prod_dates || []).filter(
        (d) => d && d.trim() !== "",
      );

      if (validDates.length === 0) {
        alert("Error: Please add at least one production date.");
        return;
      }

      // Remove duplicate dates
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
        alert("Part updated successfully!");
      } else {
        throw new Error(result.message || "Failed to update part");
      }
    } catch (error) {
      console.error("Error saving part:", error);
      alert("Failed to update part: " + error.message);
    }
  };

  // Delete schedule - DISABLED FOR QC PAGE
  const handleDeleteSchedule = async (scheduleId) => {
    // Disabled for QC page - this action is only available on OverseaPartSchedulePage
    return;
  };

  // Delete vendor - DISABLED FOR QC PAGE
  const handleDeleteVendor = async (vendorId, scheduleId) => {
    // Disabled for QC page - this action is only available on OverseaPartSchedulePage
    return;
  };

  // Delete part - DISABLED FOR QC PAGE
  const handleDeletePart = async (partId) => {
    // Disabled for QC page - this action is only available on OverseaPartSchedulePage
    return;
  };

  // ====== EDIT PART (for Schedule tab) - DISABLED FOR QC PAGE ======
  const handleEditPart = (part, vendorId) => {
    // Disabled for QC page - this action is only available on OverseaPartSchedulePage
    return;
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
    // Disabled for QC page - this action is only available on OverseaPartSchedulePage
    return;
  };

  // Return vendor from Received back to Schedule - DISABLED FOR QC PAGE
  const handleReturnVendor = async (vendorId) => {
    // Disabled for QC page - this action is only available on OverseaPartSchedulePage
    return;
  };

  // Open production dates popup
  const handleOpenProdDatesPopup = (part) => {
    setActiveProdDatesPart(part);
    const existingDates =
      part.prod_dates || (part.prod_date ? [part.prod_date] : []);
    setTempProdDates(existingDates.length > 0 ? existingDates : [""]);
    setShowProdDatesPopup(true);
  };

  // Save production dates
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

  // Add sample date
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

  // Open Add Vendor popup - DISABLED FOR QC PAGE
  const handleOpenAddVendor = (scheduleId) => {
    // Disabled for QC page - this action is only available on OverseaPartSchedulePage
    return;
  };

  // Handle trip selection
  const handleTripChange = (tripId) => {
    const selectedTrip = tripOptions.find((t) => t.id === parseInt(tripId));
    setAddVendorFormData((prev) => ({
      ...prev,
      trip: tripId,
      arrivalTime: selectedTrip?.arv_to || "",
    }));
  };

  // Add DO number field
  const handleAddDoNumber = () => {
    setAddVendorFormData((prev) => ({
      ...prev,
      doNumbers: [...prev.doNumbers, ""],
    }));
  };

  // Remove DO number field
  const handleRemoveDoNumber = (index) => {
    setAddVendorFormData((prev) => ({
      ...prev,
      doNumbers: prev.doNumbers.filter((_, i) => i !== index),
    }));
  };

  // Submit add vendor - DISABLED FOR QC PAGE
  const handleSubmitAddVendor = async (e) => {
    e.preventDefault();
    // Disabled for QC page - this action is only available on OverseaPartSchedulePage
    return;
  };

  // Open Add Part popup - DISABLED FOR QC PAGE
  const handleOpenAddPart = (scheduleId, vendorId) => {
    // Disabled for QC page - this action is only available on OverseaPartSchedulePage
    return;
  };

  // Search part by code
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
        // Check if part already exists
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

  // Update part qty in popup
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

  // Remove part from popup list
  const handleRemovePartFromPopup = (partId) => {
    setAddVendorPartFormData((prev) => ({
      ...prev,
      parts: prev.parts.filter((p) => p.id !== partId),
    }));
  };

  // Toggle part selection in popup
  const handlePopupCheckboxChange = (partId) => {
    setSelectedPartsInPopup((prev) => {
      if (prev.includes(partId)) {
        return prev.filter((id) => id !== partId);
      }
      return [...prev, partId];
    });
  };

  // Submit add parts - DISABLED FOR QC PAGE
  const handleSubmitAddParts = async (e) => {
    e.preventDefault();
    // Disabled for QC page - this action is only available on OverseaPartSchedulePage
    return;
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

  // Tab names (tanpa Today)
  const tabNames = ["Schedule", "Received", "IQC Progress", "Pass", "Complete"];

  // ====== RENDER FUNCTIONS FOR EACH TAB ======

  // Render Received Tab
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

    return receivedVendors.map((vendor, index) => (
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
          <td style={styles.tdWithLeftBorder} title={vendor.do_numbers || "-"}>
            {vendor.do_numbers || "-"}
          </td>
          <td style={styles.tdWithLeftBorder}>{vendor.total_pallet || 0}</td>
          <td style={styles.tdWithLeftBorder}>{vendor.total_item || 0}</td>
          <td style={styles.tdWithLeftBorder}>
            {formatDate(vendor.schedule_date_ref || vendor.schedule_date)}
          </td>
          <td style={styles.tdWithLeftBorder}>
            {vendor.stock_level_ref || vendor.stock_level || "-"}
          </td>
          <td style={styles.tdWithLeftBorder}>
            {vendor.model_name_ref ||
              vendor.schedule_model_name ||
              vendor.model_name ||
              "-"}
          </td>
          <td style={styles.tdWithLeftBorder}>
            {vendor.move_by_name || "-"} | {formatDateTime(vendor.move_at)}
          </td>
          {/* <td style={styles.tdWithLeftBorder}>
            <button style={styles.checkButton} onClick={() => handleApproveVendor(vendor.id)} title="Approve">
              <Check size={10} />
            </button>
            <button style={styles.returnButton} onClick={() => handleReturnVendor(vendor.id)} title="Return">
              <RotateCcw size={10} />
            </button>
            <button style={styles.deleteButton} onClick={() => handleDeleteVendor(vendor.id, null)} title="Delete">
              <Trash2 size={10} />
            </button>
          </td> */}
        </tr>

        {/* Expanded Parts */}
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
                          <td style={styles.thirdLevelTd}>{part.part_code}</td>
                          <td style={styles.thirdLevelTd}>
                            {part.part_name || "-"}
                          </td>
                          <td style={styles.thirdLevelTd}>
                            {part.qty || part.quantity || 0}
                          </td>
                          <td style={styles.thirdLevelTd}>
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

  // Render IQC Progress Tab
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

    return iqcProgressVendors.map((vendor, index) => (
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
          <td style={styles.tdWithLeftBorder} title={vendor.do_numbers || "-"}>
            {vendor.do_numbers || "-"}
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
          {/* Action - REMOVED: Auto move to Pass via QC checks approval */}
          {/*
          <td style={styles.tdWithLeftBorder} title="Move to Pass">
            <button
              style={styles.checkButton}
              onClick={() => handleMoveVendorToPass(vendor.id)}
              title="Move to Pass"
            >
              <Check size={10} />
            </button>
          </td>
          */}
        </tr>

        {/* Expanded Parts */}
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
                            {/* Prod Date with inline editing */}
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
                            {/* Sample Dates - ALWAYS show ALL dates (even if approved) */}
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
                            {/* Remark with inline editing */}
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
                            {/* Action: Edit/Delete untuk vendor part detail */}
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

  // Render Pass Tab - EXACT SAME as IQC Progress Tab
  // Only difference: data source (passVendors) and Approve By shows Pass timestamp
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

    return passVendors.map((vendor, index) => (
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
          <td style={styles.tdWithLeftBorder} title={vendor.do_numbers || "-"}>
            {vendor.do_numbers || "-"}
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

          {/* Approve By - Shows when vendor moved to Pass (Sample timestamp) */}
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

        {/* Expanded Parts - EXACT SAME as IQC Progress */}
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
                            {/* Prod Date - display all dates (no inline editing) */}
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

                            {/* Status - Display only (no inline editing) */}
                            <td
                              style={styles.thirdLevelTd}
                              title={displayStatus || "-"}
                            >
                              <span style={styles.statusBadge}>
                                {displayStatus || "-"}
                              </span>
                            </td>

                            {/* Sample Dates - ALWAYS show ALL dates (even if approved) */}
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

                            {/* Remark - Display only (no inline editing) */}
                            <td
                              style={styles.thirdLevelTd}
                              title={part.remark || "-"}
                            >
                              <span style={styles.remarkText}>
                                {part.remark || "-"}
                              </span>
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

  // Render Complete Tab
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

    return completeVendors.map((vendor, index) => (
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
          <td style={styles.tdWithLeftBorder} title={vendor.do_numbers || "-"}>
            {vendor.do_numbers || "-"}
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

          {/* Complete By - Combined name and timestamp */}
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

        {/* Expanded Parts */}
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
                            <td style={styles.thirdLevelTd}>
                              {part.part_code}
                            </td>
                            <td style={styles.thirdLevelTd}>
                              {part.part_name || "-"}
                            </td>
                            <td style={styles.thirdLevelTd}>{part.qty || 0}</td>
                            <td style={styles.thirdLevelTd}>
                              {part.qty_box || 0}
                            </td>
                            <td style={styles.thirdLevelTd}>
                              {part.unit || "PCS"}
                            </td>

                            {/* Prod Date - display only (no inline editing) */}
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

                            {/* Status - Display only (no inline editing) */}
                            <td
                              style={styles.thirdLevelTd}
                              title={sampleStatus.status || "-"}
                            >
                              <span style={styles.statusBadge}>
                                {sampleStatus.status}
                              </span>
                            </td>

                            {/* Sample - ALWAYS show ALL dates (even if approved) */}
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

                            {/* Remark - Display only (no inline editing) */}
                            <td
                              style={styles.thirdLevelTd}
                              title={part.remark || "-"}
                            >
                              <span style={styles.remarkText}>
                                {part.remark || "-"}
                              </span>
                            </td>

                            {/* Action - Edit button only */}
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

  // Render Schedule Tab
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

    return schedules.map((schedule, index) => {
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
            <td style={styles.tdWithLeftBorder}>
              {formatDate(schedule.schedule_date)}
            </td>
            <td style={styles.tdWithLeftBorder}>
              {schedule.stock_level || "-"}
            </td>
            <td style={styles.tdWithLeftBorder}>
              {schedule.model_name || "-"}
            </td>
            <td style={styles.tdWithLeftBorder}>
              {schedule.total_vendor || 0}
            </td>
            <td style={styles.tdWithLeftBorder}>
              {calculateScheduleTotalPallet(schedule)}
            </td>
            <td style={styles.tdWithLeftBorder}>
              {calculateScheduleTotalItem(schedule)}
            </td>
            <td style={styles.tdWithLeftBorder}>
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

          {/* Expanded Vendor Row */}
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
                              <td style={styles.expandedTd}>
                                {vendor.trip_code || "-"}
                              </td>
                              <td style={styles.expandedTd}>
                                {vendor.vendor_name ||
                                  (vendor.vendor_code
                                    ? `Vendor ${vendor.vendor_code}`
                                    : "-")}
                              </td>
                              <td style={styles.expandedTd}>
                                {vendor.do_numbers &&
                                  vendor.do_numbers.length > 0
                                  ? Array.isArray(vendor.do_numbers)
                                    ? vendor.do_numbers.join(", ")
                                    : vendor.do_numbers
                                  : "-"}
                              </td>
                              <td style={styles.expandedTd}>
                                {vendor.trip_arrival_time ||
                                  vendor.arrival_time ||
                                  "-"}
                              </td>
                              <td style={styles.expandedTd}>
                                {" "}
                                {getVendorTotalPallet(vendor)}
                              </td>
                              <td style={styles.expandedTd}>
                                {calculateVendorTotalItem(vendor)}
                              </td>

                            </tr>

                            {/* Expanded Parts Row */}
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
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))
                }
              />
              <span style={styles.label}>Date To</span>
              <input
                type="date"
                style={styles.input}
                value={filters.dateTo}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, dateTo: e.target.value }))
                }
              />
            </div>
            <div style={styles.inputGroup}>
              <span style={styles.label}>Search By</span>
              <input
                type="text"
                style={styles.input}
                placeholder="Vendor Name"
                value={filters.vendorName}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    vendorName: e.target.value,
                  }))
                }
              />
              <input
                type="text"
                style={styles.input}
                placeholder="Part Code"
                value={filters.partCode}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, partCode: e.target.value }))
                }
              />
              <button style={styles.button} onClick={handleSearch}>
                Search
              </button>
            </div>
          </div>
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

        {/* Table Container */}
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
                    {/* <th style={styles.thWithLeftBorder}>Action</th> */}
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
                    {/* <th style={styles.thWithLeftBorder}>Action</th> */}
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

      {/* Add Vendor Popup */}
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

      {/* Add Part Popup */}
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
                              <td style={vendorPartStyles.td}>
                                {part.qtyBox || ""}
                              </td>
                              <td style={vendorPartStyles.td}>
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

      {/* Add Sample Date Popup */}
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