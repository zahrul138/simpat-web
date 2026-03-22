"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MdArrowRight, MdArrowDropDown } from "react-icons/md";
import { Plus, Trash2, Pencil, Save } from "lucide-react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const getAuthUserLocal = () => {
  try {
    return JSON.parse(sessionStorage.getItem("auth_user") || "null");
  } catch {
    return null;
  }
};

const AddOverseaPartSchedulePage = () => {
  const navigate = useNavigate();
  const [selectedStockLevel, setSelectedStockLevel] =
    useState("M136 | SCN-LOG");
  const [selectedModel, setSelectedModel] = useState("Veronicas");
  const [scheduleDate, setScheduleDate] = useState("");
  const [currentEmpName, setCurrentEmpName] = useState("Unknown User");
  const [headerDrafts, setHeaderDrafts] = useState([]);
  const [vendorDraftsByHeader, setVendorDraftsByHeader] = useState({});
  const [expandedRows, setExpandedRows] = useState({});
  const [expandedVendorRows, setExpandedVendorRows] = useState({});
  const [activeVendorContext, setActiveVendorContext] = useState(null);
  const [selectedHeaderIds, setSelectedHeaderIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [selectedPartsInPopup, setSelectedPartsInPopup] = useState([]);
  const [activeHeaderIdForVendorForm, setActiveHeaderIdForVendorForm] =
    useState(null);
  const [tripOptions, setTripOptions] = useState([]);
  const [vendorOptions, setVendorOptions] = useState([]);
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
    parts: [],
  });

  const [editingPart, setEditingPart] = useState({
    headerId: null,
    vendorIndex: null,
    partIndex: null,
    partId: null,
    qty: "",
    showInput: false,
  });
  const [loadingParts, setLoadingParts] = useState({});
  const [palletCalculations, setPalletCalculations] = useState({});

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingExpandedPart, setEditingExpandedPart] = useState({
    headerId: null,
    vendorIndex: null,
    partIndex: null,
    partId: null,
    qty: "",
    showInput: false,
  });

  useEffect(() => {
    try {
      const u = getAuthUserLocal();
      if (!u) {
        setCurrentEmpName("Unknown User");
        return;
      }
      const name =
        u.emp_name ||
        u.employeeName ||
        u.fullname ||
        u.name ||
        u.username ||
        "";
      setCurrentEmpName(name || "Unknown User");
    } catch (err) {
      console.error("Failed reading auth_user from localStorage", err);
      setCurrentEmpName("Unknown User");
    }
  }, []);

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
        `Total box: ${totalBoxesAll}, Total berat: ${totalWeightAll.toFixed(
          2,
        )}kg`,
      );
      console.log(`Kelompok box:`, Object.keys(boxGroups).length);

      let totalLargePallets = 0;
      let totalSmallPallets = 0;
      const palletDetails = [];

      const sortedKeys = Object.keys(boxGroups).sort();

      for (const key of sortedKeys) {
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
          palletType,
        );

        console.log(`  ${palletType} pallet capacity:`);
        console.log(`    Max boxes per pallet: ${capacity.maxBoxesPerPallet}`);
        console.log(
          `    Weight per pallet: ${capacity.weightPerPallet.toFixed(2)}kg`,
        );

        const palletsNeeded = Math.ceil(
          group.totalBoxes / capacity.maxBoxesPerPallet,
        );

        console.log(`  Pallets needed: ${palletsNeeded}`);

        let remainingBoxes = group.totalBoxes;
        for (let i = 0; i < palletsNeeded; i++) {
          const boxesInThisPallet = Math.min(
            remainingBoxes,
            capacity.maxBoxesPerPallet,
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

    const sortedKeys = Object.keys(boxGroups).sort();

    for (const key of sortedKeys) {
      const group = boxGroups[key];
      if (group.totalBoxes <= 0) continue;

      const avgWeightPerBox = group.totalWeight / group.totalBoxes;

      const largeCapacity = calculateMaxBoxesInPallet(
        { length: group.length, width: group.width, height: group.height, weight: avgWeightPerBox },
        "large",
      );
      const smallCapacity = calculateMaxBoxesInPallet(
        { length: group.length, width: group.width, height: group.height, weight: avgWeightPerBox },
        "small",
      );

      let palletType = "large";
      let capacity = largeCapacity;

      const fitsLarge = canBoxFitPallet(group.length, group.width, 110, 110);
      const fitsSmall = canBoxFitPallet(group.length, group.width, 96, 76);

      if (!fitsLarge && fitsSmall) {
        palletType = "small";
        capacity = smallCapacity;
      }

      const palletsNeeded = Math.ceil(group.totalBoxes / capacity.maxBoxesPerPallet);

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

  const recalculatePalletForVendor = async (headerId, vendorIndex) => {
    try {
      console.log(`Recalculating pallet untuk vendor ${vendorIndex + 1}`);

      const vendor = vendorDraftsByHeader[headerId]?.[vendorIndex];
      if (!vendor || !vendor.parts || vendor.parts.length === 0) {
        setPalletCalculations((prev) => ({
          ...prev,
          [`${headerId}_${vendorIndex}`]: {
            largePallets: 0,
            smallPallets: 0,
            totalPallets: 0,
            details: [],
            totalWeight: 0,
            optimized: false,
          },
        }));
        return;
      }

      const boxData = [];
      let totalBoxes = 0;
      let totalWeight = 0;

      for (const part of vendor.parts) {
        const partCode = part.partCode;
        const qtyBox = part.qtyBox || 0;

        if (qtyBox <= 0) continue;

        try {

          const placementResp = await fetch(
            `${API_BASE}/api/kanban-master/placement-details?part_code=${encodeURIComponent(
              partCode,
            )}`,
          );

          if (placementResp.ok) {
            const result = await placementResp.json();
            const placementData = result.item || result.data;

            if (
              placementData &&
              placementData.length_cm &&
              placementData.width_cm &&
              placementData.height_cm
            ) {
              const boxLength = parseFloat(placementData.length_cm);
              const boxWidth = parseFloat(placementData.width_cm);
              const boxHeight = parseFloat(placementData.height_cm);
              const boxWeight = parseFloat(placementData.part_weight || 0);

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
            }
          }
        } catch (error) {
          console.warn(`Error fetching placement for part ${partCode}:`, error);
        }
      }

      console.log(
        `Total boxes collected: ${totalBoxes}, Total weight: ${totalWeight.toFixed(2)}kg`,
      );

      if (boxData.length === 0) {
        console.log(`No box data collected, setting total pallet to 0`);
        setPalletCalculations((prev) => ({
          ...prev,
          [`${headerId}_${vendorIndex}`]: {
            largePallets: 0,
            smallPallets: 0,
            totalPallets: 0,
            details: [],
            totalWeight: 0,
            optimized: false,
          },
        }));
        return;
      }

      const result = await calculateOptimizedMixedPallet(boxData);

      setPalletCalculations((prev) => ({
        ...prev,
        [`${headerId}_${vendorIndex}`]: {
          ...result,
          totalBoxes,
          totalWeight,
        },
      }));

      console.log(
        `Pallet calculation result for vendor ${vendorIndex + 1}:`,
        result,
      );
    } catch (error) {
      console.error("Error in pallet calculation:", error);
    }
  };

  const getTotalPalletForVendor = (headerId, vendorIndex) => {
    const palletKey = `${headerId}_${vendorIndex}`;
    const calculation = palletCalculations[palletKey];
    return calculation ? calculation.totalPallets : 0;
  };

  const getPalletTooltipDetails = (headerId, vendorIndex) => {
    const palletKey = `${headerId}_${vendorIndex}`;
    const calculation = palletCalculations[palletKey];

    if (!calculation) return "Calculating...";

    const { totalPallets, largePallets, smallPallets } = calculation;

    if (totalPallets === 0) return "0 pallet";

    let details = `Total Pallet: ${totalPallets}`;
    if (largePallets > 0 || smallPallets > 0) {
      details += ` (${largePallets} large, ${smallPallets} small)`;
    }
    return details;
  };

  const handleEditPartClick = (
    headerId,
    vendorIndex,
    partIndex,
    partId,
    currentQty,
  ) => {
    setEditingPart({
      headerId,
      vendorIndex,
      partIndex,
      partId,
      qty: currentQty.toString(),
      showInput: true,
    });
  };

  const handleSavePartQty = async (
    headerId,
    vendorIndex,
    partIndex,
    partId,
    newQty,
  ) => {
    try {
      const qty = parseInt(newQty);
      if (isNaN(qty) || qty < 0) {
        alert("Qty must be a valid positive number");
        return;
      }

      setLoadingParts((prev) => ({ ...prev, [partId]: true }));

      const partData =
        vendorDraftsByHeader[headerId]?.[vendorIndex]?.parts?.[partIndex];
      if (!partData?.partCode) {
        alert("Part data not found");
        return;
      }

      const resp = await fetch(
        `${API_BASE}/api/kanban-master/by-part-code?part_code=${encodeURIComponent(
          partData.partCode,
        )}`,
      );

      if (!resp.ok) throw new Error("Failed to fetch part details");
      const json = await resp.json();
      const kanbanData = json.item || json.data || json;

      if (!kanbanData) {
        alert("Part details not found in kanban master");
        return;
      }

      let qtyPerBox = 1;
      if (
        kanbanData.qty_per_box !== undefined &&
        kanbanData.qty_per_box !== null
      ) {
        qtyPerBox = Number(kanbanData.qty_per_box);
      } else if (
        partData.qtyPerBoxFromMaster !== undefined &&
        partData.qtyPerBoxFromMaster !== null
      ) {
        qtyPerBox = Number(partData.qtyPerBoxFromMaster);
      } else if (
        kanbanData.qty_unit &&
        kanbanData.qty_box &&
        kanbanData.qty_box > 0
      ) {
        qtyPerBox = Math.ceil(kanbanData.qty_unit / kanbanData.qty_box);
      }

      qtyPerBox = Math.max(1, qtyPerBox);

      const qtyBox = Math.ceil(qty / qtyPerBox);

      console.log(
        `Saving part ${partData.partCode}: qty=${qty}, qtyPerBox=${qtyPerBox}, qtyBox=${qtyBox}`,
      );

      setVendorDraftsByHeader((prev) => {
        const newVendors = [...(prev[headerId] || [])];
        if (!newVendors[vendorIndex]) return prev;

        const newParts = [...(newVendors[vendorIndex].parts || [])];
        newParts[partIndex] = {
          ...newParts[partIndex],
          qty: qty,
          qtyBox: qtyBox,
          qtyPerBoxFromMaster: qtyPerBox,
          placementId: kanbanData.placement_id,
          partWeight: kanbanData.part_weight || 0,
          weightUnit: kanbanData.weight_unit || "kg",
        };

        newVendors[vendorIndex] = {
          ...newVendors[vendorIndex],
          parts: newParts,
        };

        const hasNonZeroQty = newParts.some((p) => (p.qtyBox || 0) > 0);

        if (!hasNonZeroQty) {

          setPalletCalculations((prevCalc) => ({
            ...prevCalc,
            [`${headerId}_${vendorIndex}`]: {
              largePallets: 0,
              smallPallets: 0,
              totalPallets: 0,
              details: [],
              totalWeight: 0,
              totalBoxes: 0,
              optimized: false,
            },
          }));
        } else {

          setTimeout(() => {
            recalculatePalletForVendor(headerId, vendorIndex);
          }, 100);
        }

        return { ...prev, [headerId]: newVendors };
      });

      setEditingPart({
        headerId: null,
        vendorIndex: null,
        partIndex: null,
        partId: null,
        qty: "",
        showInput: false,
      });
      setLoadingParts((prev) => ({ ...prev, [partId]: false }));
    } catch (error) {
      console.error("Error saving part qty:", error);
      alert("Failed to save qty: " + error.message);
      setLoadingParts((prev) => ({ ...prev, [partId]: false }));
    }
  };

  const handleEditExpandedPartClick = (
    headerId,
    vendorIndex,
    partIndex,
    partId,
    currentQty,
  ) => {
    setEditingExpandedPart({
      headerId,
      vendorIndex,
      partIndex,
      partId,
      qty: currentQty.toString(),
      showInput: true,
    });
  };

  const handleSaveExpandedPartQty = async (
    headerId,
    vendorIndex,
    partIndex,
    partId,
    newQty,
  ) => {
    try {
      const qty = parseInt(newQty);
      if (isNaN(qty) || qty < 0) {
        alert("Qty must be a valid positive number");
        return;
      }

      setLoadingParts((prev) => ({ ...prev, [partId]: true }));

      const partData =
        vendorDraftsByHeader[headerId]?.[vendorIndex]?.parts?.[partIndex];

      if (!partData?.partCode) {
        alert("Part data not found");
        return;
      }

      const resp = await fetch(
        `${API_BASE}/api/kanban-master/qty-per-box?part_code=${encodeURIComponent(
          partData.partCode,
        )}`,
      );

      if (!resp.ok) throw new Error("Failed to fetch part details");
      const json = await resp.json();
      const kanbanData = json.item || json.data || json;

      if (!kanbanData) {
        alert("Part details not found in kanban master");
        return;
      }

      let qtyPerBox = 1;
      if (
        kanbanData.qty_per_box !== undefined &&
        kanbanData.qty_per_box !== null
      ) {
        qtyPerBox = Number(kanbanData.qty_per_box);
      } else if (
        partData.qtyPerBoxFromMaster !== undefined &&
        partData.qtyPerBoxFromMaster !== null
      ) {
        qtyPerBox = Number(partData.qtyPerBoxFromMaster);
      } else if (
        kanbanData.qty_unit &&
        kanbanData.qty_box &&
        kanbanData.qty_box > 0
      ) {
        qtyPerBox = Math.ceil(kanbanData.qty_unit / kanbanData.qty_box);
      }

      qtyPerBox = Math.max(1, qtyPerBox);

      const qtyBox = Math.ceil(qty / qtyPerBox);

      console.log(
        `Saving part ${partData.partCode}: qty=${qty}, qtyPerBox=${qtyPerBox}, qtyBox=${qtyBox}`,
      );

      setVendorDraftsByHeader((prev) => {
        const newVendors = [...(prev[headerId] || [])];
        if (!newVendors[vendorIndex]) return prev;

        const newParts = [...(newVendors[vendorIndex].parts || [])];
        newParts[partIndex] = {
          ...newParts[partIndex],
          qty: qty,
          qtyBox: qtyBox,
          qtyPerBoxFromMaster: qtyPerBox,
          placementId: kanbanData.placement_id,
        };

        newVendors[vendorIndex] = {
          ...newVendors[vendorIndex],
          parts: newParts,
        };

        const hasNonZeroQty = newParts.some((p) => (p.qtyBox || 0) > 0);

        if (!hasNonZeroQty) {

          setPalletCalculations((prevCalc) => ({
            ...prevCalc,
            [`${headerId}_${vendorIndex}`]: {
              largePallets: 0,
              smallPallets: 0,
              totalPallets: 0,
              details: [],
              totalWeight: 0,
              totalBoxes: 0,
              optimized: false,
            },
          }));
        } else {

          setTimeout(() => {
            recalculatePalletForVendor(headerId, vendorIndex);
          }, 100);
        }

        return { ...prev, [headerId]: newVendors };
      });

      setEditingExpandedPart({
        headerId: null,
        vendorIndex: null,
        partIndex: null,
        partId: null,
        qty: "",
        showInput: false,
      });
      setLoadingParts((prev) => ({ ...prev, [partId]: false }));
    } catch (error) {
      console.error("Error saving expanded part qty:", error);
      alert("Failed to save qty: " + error.message);
      setLoadingParts((prev) => ({ ...prev, [partId]: false }));
    }
  };

  const handleEditExpandedPartKeyPress = (
    e,
    headerId,
    vendorIndex,
    partIndex,
    partId,
  ) => {
    if (e.key === "Enter") {
      handleSaveExpandedPartQty(
        headerId,
        vendorIndex,
        partIndex,
        partId,
        editingExpandedPart.qty,
      );
    } else if (e.key === "Escape") {
      setEditingExpandedPart({
        headerId: null,
        vendorIndex: null,
        partIndex: null,
        partId: null,
        qty: "",
        showInput: false,
      });
    }
  };

  useEffect(() => {

    headerDrafts.forEach((header) => {
      const vendors = vendorDraftsByHeader[header.id] || [];
      vendors.forEach((_, vendorIndex) => {
        recalculatePalletForVendor(header.id, vendorIndex);
      });
    });
  }, [vendorDraftsByHeader]);

  const handleEditPartKeyPress = (
    e,
    headerId,
    vendorIndex,
    partIndex,
    partId,
  ) => {
    if (e.key === "Enter") {
      handleSavePartQty(
        headerId,
        vendorIndex,
        partIndex,
        partId,
        editingPart.qty,
      );
    } else if (e.key === "Escape") {
      setEditingPart({
        headerId: null,
        vendorIndex: null,
        partIndex: null,
        partId: null,
        qty: "",
        showInput: false,
      });
    }
  };

  const handlePopupPartQtyChange = (partId, newQty) => {
    console.log("Changing qty for part", partId, "to", newQty);

    setAddVendorPartFormData((prev) => {
      const updatedParts = (prev.parts || []).map((part) => {
        if (part.id === partId) {
          const qty = parseInt(newQty) || 0;
          const qtyPerBox = part.qtyPerBoxFromMaster || 1;
          const qtyBox = Math.ceil(qty / qtyPerBox);

          console.log(`Calculated qtyBox: ${qty} / ${qtyPerBox} = ${qtyBox}`);

          return {
            ...part,
            qty: qty,
            qtyBox: qtyBox,
          };
        }
        return part;
      });

      return {
        ...prev,
        parts: updatedParts,
      };
    });
  };

  async function handleInsertSchedule() {
    try {
      if (!scheduleDate) {
        alert("Please fill the data first ");
        return;
      }

      const createdAt = new Date().toISOString();
      const newId = `draft-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const newHeader = {
        id: newId,
        stockLevel: selectedStockLevel,
        modelName: selectedModel,
        scheduleDate,
        uploadByName: currentEmpName,
        createdAt,
      };

      setHeaderDrafts((prev) => [...prev, newHeader]);
      setVendorDraftsByHeader((prev) => ({ ...prev, [newId]: [] }));
    } catch (e) {
      alert("Error: " + e.message);
    }
  }

  const calculateAndSendPalletData = (headerId) => {
    const vendors = vendorDraftsByHeader[headerId] || [];
    let totalPalletForSchedule = 0;
    let totalItemForSchedule = 0;

    const vendorDataWithPallets = vendors.map((vendor, vendorIndex) => {
      const palletKey = `${headerId}_${vendorIndex}`;
      const palletCalculation = palletCalculations[palletKey] || {};
      const totalPalletForVendor = palletCalculation.totalPallets || 0;
      const totalItemForVendor = vendor.parts?.length || 0;

      totalPalletForSchedule += totalPalletForVendor;
      totalItemForSchedule += totalItemForVendor;

      return {
        ...vendor,
        totalPallet: totalPalletForVendor,
        totalItem: totalItemForVendor,
      };
    });

    return {
      totalPalletForSchedule,
      totalItemForSchedule,
      vendorDataWithPallets,
    };
  };

  const handleSubmitScheduleToDatabase = async () => {
    try {
      if (selectedHeaderIds.size === 0) {
        alert("Please select schedule data to submit");
        return;
      }

      const selectedSchedules = [...selectedHeaderIds].map((id) =>
        headerDrafts.find((h) => h.id === id),
      );

      for (const schedule of selectedSchedules) {
        const scheduleVendors = vendorDraftsByHeader[schedule.id] || [];
        if (scheduleVendors.length === 0) {
          alert(
            `Schedule for ${schedule.scheduleDate} has no vendors. Please add vendors before submitting.`,
          );
          return;
        }

        for (const vendor of scheduleVendors) {
          if (!vendor.parts || vendor.parts.length === 0) {
            alert(
              `Schedule for ${schedule.scheduleDate} has vendors without parts. Please add parts before submitting.`,
            );
            return;
          }
        }
      }

      setIsSubmitting(true);
      const results = [];
      const errors = [];

      for (const schedule of selectedSchedules) {
        try {
          console.log(`Processing schedule for ${schedule.scheduleDate}`);

          const vendorsForThisSchedule =
            vendorDraftsByHeader[schedule.id] || [];

          const scheduleTotals = calculateAndSendPalletData(schedule.id);

          const schedulePayload = {
            stockLevel: schedule.stockLevel,
            modelName: schedule.modelName,
            scheduleDate: schedule.scheduleDate,
            uploadByName: schedule.uploadByName || currentEmpName,
            totalVendor: vendorsForThisSchedule.length,
            totalPallet: scheduleTotals.totalPalletForSchedule,
            totalItem: scheduleTotals.totalItemForSchedule,
          };

          console.log("Creating schedule header:", schedulePayload);

          const scheduleResponse = await fetch(
            `${API_BASE}/api/oversea-schedules`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(schedulePayload),
            },
          );

          if (!scheduleResponse.ok) {
            const errorData = await scheduleResponse.json();
            throw new Error(
              errorData.message ||
                `Failed to create schedule: ${scheduleResponse.status}`,
            );
          }

          const scheduleData = await scheduleResponse.json();
          const createdScheduleId = scheduleData.schedule?.id;

          if (!createdScheduleId) {
            throw new Error("No schedule ID returned from server");
          }

          console.log(`Schedule created with ID: ${createdScheduleId}`);

          if (vendorsForThisSchedule.length > 0) {
            const vendorPayload = {
              items: vendorsForThisSchedule.map((vendor, vendorIndex) => {

                const palletKey = `${schedule.id}_${vendorIndex}`;
                const palletCalculation = palletCalculations[palletKey] || {};
                const totalPalletForVendor =
                  palletCalculation.totalPallets || 0;

                const totalItemForVendor = vendor.parts?.length || 0;

                return {
                  tripId: vendor.trip_id,
                  vendorId: vendor.vendor_id,
                  doNumbers: vendor.do_number || [],
                  arrivalTime: vendor.arrivalTime || null,
                  totalPallet: totalPalletForVendor,
                  totalItem: totalItemForVendor,
                };
              }),
            };

            console.log("Adding vendors:", vendorPayload);

            const vendorResponse = await fetch(
              `${API_BASE}/api/oversea-schedules/${createdScheduleId}/vendors/bulk`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(vendorPayload),
              },
            );

            const vendorData = await vendorResponse.json();

            if (!vendorResponse.ok) {
              throw new Error(
                vendorData.message ||
                  `Failed to add vendors: ${vendorResponse.status}`,
              );
            }

            const vendorIds = vendorData.vendorIds || [];
            console.log(`Vendors added: ${vendorIds.length}`, vendorIds);

            for (let i = 0; i < vendorsForThisSchedule.length; i++) {
              const vendor = vendorsForThisSchedule[i];
              const vendorId = vendorIds[i];

              if (vendorId && vendor.parts && vendor.parts.length > 0) {

                const partsData = vendor.parts.map((part) => ({
                  partCode: part.partCode,
                  partName: part.partName || "",
                  quantity: part.qty || 0,
                  quantityBox: part.qtyBox || 0,
                  unit: part.unit || "PCS",
                  doNumber: part.doNumber || "",
                }));

                console.log(
                  `Adding ${partsData.length} parts to vendor ${vendorId}:`,
                  partsData,
                );

                const partsResponse = await fetch(
                  `${API_BASE}/api/oversea-schedules/${vendorId}/parts/bulk`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ items: partsData }),
                  },
                );

                const partsResult = await partsResponse.json();

                if (!partsResponse.ok) {
                  console.error(
                    `Failed to add parts to vendor ${vendorId}:`,
                    partsResult,
                  );
                  throw new Error(
                    partsResult.message ||
                      `Failed to add parts: ${partsResponse.status}`,
                  );
                }

                console.log(
                  `Parts added successfully to vendor ${vendorId}:`,
                  partsResult,
                );
              }
            }
          }

          results.push({
            scheduleId: createdScheduleId,
            scheduleDate: schedule.scheduleDate,
            success: true,
          });

          console.log(
            `Schedule ${schedule.scheduleDate} successfully submitted`,
          );
        } catch (error) {
          console.error(
            `Error submitting schedule ${schedule.scheduleDate}:`,
            error,
          );
          errors.push({
            scheduleDate: schedule.scheduleDate,
            error: error.message,
          });
        }
      }

      if (errors.length > 0) {
        alert(
          `Successfully submitted ${results.length} schedule(s).\n` +
            `Failed to submit ${errors.length} schedule(s):\n` +
            errors.map((e) => `- ${e.scheduleDate}: ${e.error}`).join("\n"),
        );
      } else {
        alert(`Successfully submitted ${results.length} schedule(s).`);
      }

      const successfulScheduleIds = results
        .map(
          (r) =>
            headerDrafts.find((h) => h.scheduleDate === r.scheduleDate)?.id,
        )
        .filter((id) => id);

      setHeaderDrafts((prev) =>
        prev.filter((h) => !successfulScheduleIds.includes(h.id)),
      );

      setVendorDraftsByHeader((prev) => {
        const newDrafts = { ...prev };
        successfulScheduleIds.forEach((id) => {
          delete newDrafts[id];
        });
        return newDrafts;
      });

      setSelectedHeaderIds((prev) => {
        const newSet = new Set(prev);
        successfulScheduleIds.forEach((id) => newSet.delete(id));
        return newSet;
      });

      navigate("/oversea-schedule");
    } catch (error) {
      console.error("Error in handleSubmitScheduleToDatabase:", error);
      alert(`Failed to submit schedules: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHeader = (headerId) => {
    setHeaderDrafts((prev) => prev.filter((h) => h.id !== headerId));
    setVendorDraftsByHeader((prev) => {
      const copy = { ...prev };
      delete copy[headerId];
      return copy;
    });
    setExpandedRows((prev) => {
      const copy = { ...prev };
      delete copy[headerId];
      return copy;
    });
    setExpandedVendorRows((prev) => {
      const copy = { ...prev };
      Object.keys(copy).forEach((key) => {
        if (key.startsWith(`${headerId}_vendor_`)) delete copy[key];
      });
      return copy;
    });
    setSelectedHeaderIds((prev) => {
      const next = new Set(prev);
      next.delete(headerId);
      return next;
    });

    setPalletCalculations((prev) => {
      const copy = { ...prev };
      Object.keys(copy).forEach((key) => {
        if (key.startsWith(`${headerId}_`)) delete copy[key];
      });
      return copy;
    });
  };

  const handleDeleteVendor = (headerId, vendorIndex) => {
    setVendorDraftsByHeader((prev) => {
      const vendors = [...(prev[headerId] || [])];
      vendors.splice(vendorIndex, 1);
      return { ...prev, [headerId]: vendors };
    });
    const vendorRowId = `${headerId}_vendor_${vendorIndex + 1}`;
    setExpandedVendorRows((prev) => {
      const next = { ...prev };
      delete next[vendorRowId];
      return next;
    });

    setPalletCalculations((prev) => {
      const next = { ...prev };
      delete next[`${headerId}_${vendorIndex}`];
      return next;
    });
  };

  const handleDeletePart = (headerId, vendorIndex, partId) => {
    setVendorDraftsByHeader((prev) => {
      const vendors = [...(prev[headerId] || [])];
      if (!vendors[vendorIndex]) return prev;

      const updatedParts = (vendors[vendorIndex].parts || []).filter(
        (p) => p.id !== partId,
      );

      vendors[vendorIndex] = {
        ...vendors[vendorIndex],
        parts: updatedParts,
      };

      if (updatedParts.length === 0) {
        setPalletCalculations((prevCalc) => ({
          ...prevCalc,
          [`${headerId}_${vendorIndex}`]: {
            largePallets: 0,
            smallPallets: 0,
            totalPallets: 0,
            details: [],
            totalWeight: 0,
            totalBoxes: 0,
            optimized: false,
          },
        }));
      } else {

        setTimeout(() => {
          recalculatePalletForVendor(headerId, vendorIndex);
        }, 100);
      }

      return { ...prev, [headerId]: vendors };
    });
  };

  useEffect(() => {
    if (addVendorDetail) {
      (async () => {
        try {
          const [tRes, vRes] = await Promise.all([
            fetch(`${API_BASE}/api/masters/trips`),
            fetch(`${API_BASE}/api/vendors`),
          ]);

          const tripsData = await tRes.json();
          const vendorsData = await vRes.json();

          setTripOptions(Array.isArray(tripsData) ? tripsData : []);

          let vendorsArray = [];
          if (Array.isArray(vendorsData)) {
            vendorsArray = vendorsData;
          } else if (vendorsData && Array.isArray(vendorsData.data)) {
            vendorsArray = vendorsData.data;
          } else if (
            vendorsData &&
            vendorsData.success &&
            Array.isArray(vendorsData.data)
          ) {
            vendorsArray = vendorsData.data;
          }

          console.log("Vendors data:", vendorsArray);
          setVendorOptions(vendorsArray);
        } catch (error) {
          console.error("Error fetching master data:", error);
          setTripOptions([]);
          setVendorOptions([]);
        }
      })();
    }
  }, [addVendorDetail]);

  function onTripChange(e) {
    const tripLabel = e.target.value;
    handleAddVendorInputChange("trip", tripLabel);
    const t = tripOptions.find((x) => String(x.trip_no) === String(tripLabel));
    if (t?.arv_to) {
      handleAddVendorInputChange("arrivalTime", t.arv_to);
    }
  }

  const handleAddVendorInputChange = (field, value) => {
    setAddVendorFormData((prev) => ({ ...prev, [field]: value }));
  };

  const autoExpandHeaderOnVendorAdd = (headerId) => {
    setExpandedRows((prev) => ({ ...prev, [headerId]: true }));
  };

  const autoExpandVendorOnPartAdd = (headerId, vendorIndex) => {
    setExpandedRows((prev) => ({ ...prev, [headerId]: true }));
    const vendorRowId = `${headerId}_vendor_${vendorIndex + 1}`;
    setExpandedVendorRows((prev) => ({ ...prev, [vendorRowId]: true }));
  };

  const toggleRowExpansion = (rowId) => {
    setExpandedRows((prev) => {
      const newExpandedRows = { ...prev, [rowId]: !prev[rowId] };
      if (prev[rowId]) {
        setExpandedVendorRows((prevVendor) => {
          const newVendorRows = { ...prevVendor };
          Object.keys(newVendorRows).forEach((key) => {
            if (key.startsWith(`${rowId}_vendor_`)) delete newVendorRows[key];
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

    if (!activeHeaderIdForVendorForm) {
      alert(
        "Header schedule not found. Click the + button on the schedule to which you want to add a vendor.",
      );
      return;
    }

    const clean = (addVendorFormData.doNumbers || [])
      .map((s) => String(s || "").trim())
      .filter(Boolean);
    if (
      !addVendorFormData.trip ||
      !addVendorFormData.vendor ||
      clean.length === 0
    ) {
      alert("Trip, Vendor, dan minimal 1 DO wajib diisi.");
      return;
    }

    const dup = clean.filter((v, i, a) => a.indexOf(v) !== i);
    if (dup.length) {
      alert("DO Number duplikat di form: " + [...new Set(dup)].join(", "));
      return;
    }

    const t = tripOptions.find(
      (x) => String(x.trip_no) === String(addVendorFormData.trip),
    );
    if (!t?.id) {
      alert("Trip tidak dikenali. Pastikan trip master sudah tersedia.");
      return;
    }

    const vendorLabel = addVendorFormData.vendor;
    const v = vendorOptions.find(
      (x) => `${x.vendor_code} - ${x.vendor_name}` === vendorLabel,
    );
    if (!v?.id) {
      alert("Vendor tidak dikenali. Pastikan vendor master sudah tersedia.");
      return;
    }

    const headerId = activeHeaderIdForVendorForm;
    autoExpandHeaderOnVendorAdd(headerId);

    setVendorDraftsByHeader((prev) => {
      const existing = prev[headerId] || [];
      return {
        ...prev,
        [headerId]: [
          ...existing,
          {
            trip_id: Number(t.id),
            vendor_id: Number(v.id),
            do_number: clean,
            parts: [],
            schedule_date_ref: headerDrafts.find((h) => h.id === headerId)
              ?.scheduleDate,
            stock_level_ref: headerDrafts.find((h) => h.id === headerId)
              ?.stockLevel,
            model_name_ref: headerDrafts.find((h) => h.id === headerId)
              ?.modelName,
            arrival_time: t.arv_to,
          },
        ],
      };
    });

    setAddVendorDetail(false);
    setActiveHeaderIdForVendorForm(null);
    setAddVendorFormData({
      trip: "",
      vendor: "",
      doNumbers: [""],
      arrivalTime: "",
    });
  };

  const openVendorPartDetailPopup = (
    headerId,
    vendorIndex,
    vendorData,
    vendorLabel,
  ) => {
    autoExpandVendorOnPartAdd(headerId, vendorIndex);
    const existingPartsInVendor = vendorData.parts || [];
    const existingPartCodes = existingPartsInVendor.map((p) => p.partCode);

    setActiveVendorContext({
      headerId,
      vendorIndex,
      vendorId: vendorData.vendor_id,
      vendorLabel,
      doNumbers: vendorData.do_number || [],
    });
    const currentPartsInForm = vendorData.parts ? [...vendorData.parts] : [];
    const filteredParts = currentPartsInForm.filter(
      (part) => !existingPartCodes.includes(part.partCode),
    );

    setAddVendorPartFormData({
      trip: "",
      vendor: vendorLabel,
      doNumbers:
        vendorData.do_number && vendorData.do_number.length
          ? [...vendorData.do_number]
          : [""],
      arrivalTime: "",
      parts: filteredParts,
    });
    setSelectedPartsInPopup([]);
    setAddVendorPartDetail(true);
  };

  const handleAddPart = async (rawPartCode) => {
    const partCode = String(rawPartCode || "").trim();
    if (!partCode) return;
    if (!activeVendorContext) {
      alert("Vendor context not found. Open popup from vendor row.");
      return;
    }

    const existingPartCodes = [];
    const { headerId, vendorIndex } = activeVendorContext;
    const vendorData = vendorDraftsByHeader[headerId]?.[vendorIndex];
    if (vendorData?.parts)
      existingPartCodes.push(...vendorData.parts.map((p) => p.partCode));
    if (addVendorPartFormData.parts)
      existingPartCodes.push(
        ...addVendorPartFormData.parts.map((p) => p.partCode),
      );

    try {
      const resp = await fetch(
        `${API_BASE}/api/kanban-master/qty-per-box?part_code=${encodeURIComponent(
          partCode,
        )}`,
      );

      if (!resp.ok) throw new Error("Failed to check Part Code.");
      const json = await resp.json();

      if (!json.success || !json.item) {
        alert("Part code not found.");
        return;
      }

      const item = json.item;

      console.log("API Response with qty_per_box:", item);

      const isDuplicate = existingPartCodes.some(
        (code) => String(code) === String(item.part_code),
      );
      if (isDuplicate) {
        alert("Part already inserted in this vendor");
        return;
      }

      if (
        activeVendorContext.vendorId &&
        item.vendor_id &&
        Number(item.vendor_id) !== Number(activeVendorContext.vendorId)
      ) {
        alert("Part code belongs to another vendor.");
        return;
      }

      const availableDoNumbers =
        activeVendorContext.doNumbers && activeVendorContext.doNumbers.length
          ? activeVendorContext.doNumbers.filter((d) => String(d || "").trim())
          : [];
      if (!availableDoNumbers.length) {
        alert(
          "DO Number for this vendor is not available. Please add it first in Vendor Detail.",
        );
        return;
      }

      let qtyPerBox = item.qty_per_box || 1;

      if (qtyPerBox <= 0) {
        qtyPerBox = 1;
        console.warn(
          `Invalid qty_per_box for part ${item.part_code}: ${item.qty_per_box}, using default 1`,
        );
      }

      console.log(`Part ${item.part_code}: qtyPerBox = ${qtyPerBox}`);

      const qty = 0;
      const qtyBox = Math.ceil(qty / qtyPerBox);

      let partWeight = item.part_weight || 0;
      if (item.weight_unit === "g") {
        partWeight = partWeight / 1000;
      } else if (item.weight_unit === "lbs") {
        partWeight = partWeight * 0.453592;
      } else if (item.weight_unit === "oz") {
        partWeight = partWeight * 0.0283495;
      }

      console.log(`Part ${item.part_code}: weight = ${partWeight} kg`);

      console.log(
        `Adding part ${item.part_code}: qty=${qty}, qtyPerBox=${qtyPerBox}, qtyBox=${qtyBox}, weight=${partWeight} kg`,
      );

      setAddVendorPartFormData((prev) => {
        const newPart = {
          id: Date.now(),
          doNumber: availableDoNumbers[0],
          partCode: item.part_code,
          partName: item.part_name || "",
          qty: qty,
          qtyBox: qtyBox,
          unit: item.unit || "PCS",
          qtyPerBoxFromMaster: qtyPerBox,
          placementId: item.placement_id,
          partWeight: partWeight,
          weightUnit: "kg",
        };
        return { ...prev, parts: [...(prev.parts || []), newPart] };
      });
      setSelectedPartsInPopup([]);
    } catch (err) {
      console.error("Error adding part:", err);
      alert(err.message || "Error occurred while checking Part Code.");
    }
  };

  const handleAddVendorPartSubmit = async (e) => {
    e.preventDefault();
    if (!activeVendorContext) {
      alert("Vendor context not found.");
      return;
    }
    if (
      addVendorPartFormData.parts.length > 0 &&
      selectedPartsInPopup.length === 0
    ) {
      alert("Select part before insert");
      return;
    }
    const { headerId, vendorIndex } = activeVendorContext;
    autoExpandVendorOnPartAdd(headerId, vendorIndex);
    const partsToInsert = addVendorPartFormData.parts.filter((part) =>
      selectedPartsInPopup.includes(part.id),
    );

    setVendorDraftsByHeader((prev) => {
      const vendors = [...(prev[headerId] || [])];
      if (!vendors[vendorIndex]) return prev;
      const existingParts = vendors[vendorIndex].parts || [];
      const existingPartCodes = existingParts.map((p) => p.partCode);
      const uniquePartsToInsert = partsToInsert.filter(
        (part) => !existingPartCodes.includes(part.partCode),
      );
      vendors[vendorIndex] = {
        ...vendors[vendorIndex],
        parts: [...existingParts, ...uniquePartsToInsert],
      };

      setTimeout(() => {
        recalculatePalletForVendor(headerId, vendorIndex);
      }, 0);

      return { ...prev, [headerId]: vendors };
    });

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
  };

  const calculateTotalPartsForHeader = (headerId) => {
    const vendors = vendorDraftsByHeader[headerId] || [];
    let totalParts = 0;
    vendors.forEach((vendor) => {
      if (vendor.parts && Array.isArray(vendor.parts))
        totalParts += vendor.parts.length;
    });
    return totalParts;
  };

  const calculateTotalPartsForVendor = (vendorData) => {
    if (!vendorData || !vendorData.parts || !Array.isArray(vendorData.parts))
      return 0;
    return vendorData.parts.length;
  };

  const getPalletTooltipDetailsForHeader = (headerId) => {
    const { totalLarge, totalSmall, total } =
      calculateTotalPalletForHeader(headerId);

    if (total === 0) return "0 pallet";

    let details = `Total Pallet: ${total}`;
    if (totalLarge > 0 || totalSmall > 0) {
      details += ` (${totalLarge} large, ${totalSmall} small)`;
    }
    return details;
  };

  const calculateTotalPalletForHeader = (headerId) => {
    const vendors = vendorDraftsByHeader[headerId] || [];
    let totalLarge = 0;
    let totalSmall = 0;
    let total = 0;
    let totalWeight = 0;

    vendors.forEach((_, vendorIndex) => {
      const palletKey = `${headerId}_${vendorIndex}`;
      const calculation = palletCalculations[palletKey];
      if (calculation) {
        totalLarge += calculation.largePallets;
        totalSmall += calculation.smallPallets;
        total += calculation.totalPallets;
        totalWeight += calculation.totalWeight || 0;
      }
    });

    return { totalLarge, totalSmall, total, totalWeight };
  };

  useEffect(() => {
    const syncLoadingState = () => {};

    syncLoadingState();
  }, [loadingParts]);

  useEffect(() => {
    return () => {
      setEditingPart({
        headerId: null,
        vendorIndex: null,
        partIndex: null,
        partId: null,
        qty: "",
        showInput: false,
      });
      setEditingExpandedPart({
        headerId: null,
        vendorIndex: null,
        partIndex: null,
        partId: null,
        qty: "",
        showInput: false,
      });
      setLoadingParts({});
    };
  }, []);

  const toggleHeaderCheckbox = (headerId, checked) => {
    setSelectedHeaderIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(headerId);
      else next.delete(headerId);
      if (checked && next.size === headerDrafts.length) setSelectAll(true);
      else if (!checked) setSelectAll(false);
      return next;
    });
  };

  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      const allIds = new Set(headerDrafts.map((h) => h.id));
      setSelectedHeaderIds(allIds);
    } else {
      setSelectedHeaderIds(new Set());
    }
  };

  useEffect(() => {
    if (
      headerDrafts.length > 0 &&
      selectedHeaderIds.size === headerDrafts.length
    )
      setSelectAll(true);
    else setSelectAll(false);
  }, [selectedHeaderIds, headerDrafts]);

  const handleDoNumberChange = (index, value) => {
    const updatedDoNumbers = [...addVendorFormData.doNumbers];
    updatedDoNumbers[index] = value;
    setAddVendorFormData((prev) => ({ ...prev, doNumbers: updatedDoNumbers }));
  };

  const addDoNumberField = () => {
    setAddVendorFormData((prev) => ({
      ...prev,
      doNumbers: [...prev.doNumbers, ""],
    }));
  };

  const removeDoNumberField = (index) => {
    if (addVendorFormData.doNumbers.length > 1) {
      const updatedDoNumbers = addVendorFormData.doNumbers.filter(
        (_, i) => i !== index,
      );
      setAddVendorFormData((prev) => ({
        ...prev,
        doNumbers: updatedDoNumbers,
      }));
    }
  };

  useEffect(() => {
    const initializePartsWithQtyPerBox = async () => {
      for (const headerId in vendorDraftsByHeader) {
        const vendors = vendorDraftsByHeader[headerId];
        for (let i = 0; i < vendors.length; i++) {
          const vendor = vendors[i];
          if (vendor.parts && vendor.parts.length > 0) {
            for (let j = 0; j < vendor.parts.length; j++) {
              const part = vendor.parts[j];
              if (!part.qtyPerBoxFromMaster && part.partCode) {
                try {
                  const resp = await fetch(
                    `${API_BASE}/api/kanban-master/by-part-code?part_code=${encodeURIComponent(
                      part.partCode,
                    )}`,
                  );
                  if (resp.ok) {
                    const data = await resp.json();
                    const kanbanData = data.item || data.data || data;
                    if (kanbanData && kanbanData.qty_per_box) {
                      setVendorDraftsByHeader((prev) => {
                        const newVendors = [...(prev[headerId] || [])];
                        if (!newVendors[i]) return prev;

                        const newParts = [...(newVendors[i].parts || [])];
                        newParts[j] = {
                          ...newParts[j],
                          qtyPerBoxFromMaster: kanbanData.qty_per_box,
                          placementId: kanbanData.placement_id,
                        };

                        newVendors[i] = { ...newVendors[i], parts: newParts };
                        return { ...prev, [headerId]: newVendors };
                      });
                    }
                  }
                } catch (error) {
                  console.error(
                    "Error fetching qty_per_box for part:",
                    part.partCode,
                    error,
                  );
                }
              }
            }
          }
        }
      }
    };

    if (Object.keys(vendorDraftsByHeader).length > 0) {
      initializePartsWithQtyPerBox();
    }
  }, [vendorDraftsByHeader]);

  const handlePopupCheckboxChange = (e, partId) => {
    if (e.target.checked) setSelectedPartsInPopup((prev) => [...prev, partId]);
    else setSelectedPartsInPopup((prev) => prev.filter((id) => id !== partId));
  };

  const handleSelectAllInPopup = (e) => {
    if (e.target.checked) {
      const allPartIds = addVendorPartFormData.parts.map((part) => part.id);
      setSelectedPartsInPopup(allPartIds);
    } else setSelectedPartsInPopup([]);
  };

  const handleRemovePart = (partId) => {
    setAddVendorPartFormData((prev) => ({
      ...prev,
      parts: (prev.parts || []).filter((p) => p.id !== partId),
    }));
    setSelectedPartsInPopup((prev) => prev.filter((id) => id !== partId));
  };

  useEffect(() => {
    const calculateAllPallets = async () => {
      console.log("=== CALCULATING ALL PALLETS WITH OPTIMIZATION ===");

      for (const header of headerDrafts) {
        const vendors = vendorDraftsByHeader[header.id] || [];

        for (let i = 0; i < vendors.length; i++) {
          await recalculatePalletForVendor(header.id, i);
        }
      }
    };

    if (headerDrafts.length > 0) {
      calculateAllPallets();
    }
  }, [vendorDraftsByHeader]);

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
      marginLeft: "76.1px",
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
    cellContent: {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
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
      width: "96.5%",
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
                    onChange={(e) => {
                      const v = e.target.value;
                      setSelectedStockLevel(v);
                    }}
                  >
                    <option value="M101 | SCN-MH">M136 | SCN-LOG</option>
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
                    onChange={(e) => {
                      const v = e.target.value;
                      setSelectedModel(v);
                    }}
                  >
                    <option value="Veronicas">Veronicas</option>
                    <option value="Heracles">Heracles</option>
                  </select>
                  <div style={styles.actionButtonsGroup}>
                    <button
                      style={{ ...styles.button, ...styles.primaryButton }}
                      onClick={handleInsertSchedule}
                    >
                      <Plus size={16} />
                      Insert
                    </button>
                  </div>
                </div>
              </div>
              <div style={{ flex: "2", display: "grid" }}>
                <div>
                  <label htmlFor="uploadBy" style={styles.label}>
                    Upload By
                  </label>
                  <input
                    id="uploadBy"
                    type="text"
                    style={styles.input}
                    value={currentEmpName}
                    readOnly
                  />
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
                    onChange={(e) => {
                      const v = e.target.value;
                      setScheduleDate(v);
                    }}
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
                  <col style={{ width: "26px" }} />
                  <col style={{ width: "2.4%" }} />
                  <col style={{ width: "25px" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "25%" }} />
                  <col style={{ width: "7%" }} />
                </colgroup>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.expandedTh}>No</th>
                    <th style={styles.thWithLeftBorder}>
                      {headerDrafts.length > 1 && (
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          style={{
                            margin: "0 auto",
                            display: "block",
                            cursor: "pointer",
                            width: "12px",
                            height: "12px",
                          }}
                          title="Select All"
                        />
                      )}
                    </th>
                    <th style={styles.thWithLeftBorder}></th>
                    <th style={styles.thWithLeftBorder}>Schedule Date</th>
                    <th style={styles.thWithLeftBorder}>Stock Level</th>
                    <th style={styles.thWithLeftBorder}>Model</th>
                    <th style={styles.thWithLeftBorder}>Total Vendor</th>
                    <th style={styles.thWithLeftBorder}>Total Pallet</th>
                    <th style={styles.thWithLeftBorder}>Total Part</th>
                    <th style={styles.thWithLeftBorder}>Upload By</th>
                    <th style={styles.thWithLeftBorder}>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {headerDrafts.length === 0 ? (
                    <tr></tr>
                  ) : (
                    headerDrafts.map((hdr, headerIndex) => {
                      const headerVendors = vendorDraftsByHeader[hdr.id] || [];
                      const headerPalletTotal = calculateTotalPalletForHeader(
                        hdr.id,
                      );

                      const headerRow = (
                        <tr
                          key={`hdr-${hdr.id}`}
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
                            {headerIndex + 1}
                          </td>
                          <td style={styles.tdWithLeftBorder}>
                            <input
                              type="checkbox"
                              checked={selectedHeaderIds.has(hdr.id)}
                              onChange={(e) =>
                                toggleHeaderCheckbox(hdr.id, e.target.checked)
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
                            style={{
                              ...styles.tdWithLeftBorder,
                              ...styles.emptyColumn,
                            }}
                          >
                            <button
                              style={styles.arrowButton}
                              onClick={() => toggleRowExpansion(hdr.id)}
                            >
                              {expandedRows[hdr.id] ? (
                                <MdArrowDropDown style={styles.arrowIcon} />
                              ) : (
                                <MdArrowRight style={styles.arrowIcon} />
                              )}
                            </button>
                          </td>

                          <td
                            style={styles.tdWithLeftBorder}
                            title={(() => {
                              try {
                                const d = new Date(hdr.scheduleDate);
                                if (Number.isNaN(d.getTime()))
                                  return hdr.scheduleDate || "-";
                                const pad = (n) => String(n).padStart(2, "0");
                                return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
                              } catch {
                                return hdr.scheduleDate || "-";
                              }
                            })()}
                          >
                            {(() => {
                              try {
                                const d = new Date(hdr.scheduleDate);
                                if (Number.isNaN(d.getTime())) {
                                  return hdr.scheduleDate || "-";
                                }
                                const pad = (n) => String(n).padStart(2, "0");
                                return `${pad(d.getDate())}/${pad(
                                  d.getMonth() + 1,
                                )}/${d.getFullYear()}`;
                              } catch {
                                return hdr.scheduleDate || "-";
                              }
                            })()}
                          </td>

                          <td
                            style={styles.tdWithLeftBorder}
                            title={hdr.stockLevel}
                          >
                            {hdr.stockLevel}
                          </td>
                          <td
                            style={styles.tdWithLeftBorder}
                            title={hdr.modelName}
                          >
                            {hdr.modelName}
                          </td>
                          <td
                            style={styles.tdWithLeftBorder}
                            title={headerVendors.length}
                          >
                            {headerVendors.length}
                          </td>
                          <td
                            style={styles.tdWithLeftBorder}
                            title={getPalletTooltipDetailsForHeader(hdr.id)}
                          >
                            {headerPalletTotal.total}
                          </td>
                          <td
                            style={styles.tdWithLeftBorder}
                            title={calculateTotalPartsForHeader(hdr.id)}
                          >
                            {calculateTotalPartsForHeader(hdr.id)}
                          </td>

                          <td
                            style={styles.tdWithLeftBorder}
                            title={(() => {
                              try {
                                const d = new Date(hdr.createdAt || Date.now());
                                const pad = (n) => String(n).padStart(2, "0");
                                const ts = `${d.getFullYear()}/${pad(
                                  d.getMonth() + 1,
                                )}/${pad(d.getDate())} ${pad(
                                  d.getHours(),
                                )}:${pad(d.getMinutes())}`;
                                return `${hdr.uploadByName} | ${ts}`;
                              } catch {
                                return hdr.uploadByName;
                              }
                            })()}
                          >
                            {(() => {
                              try {
                                const d = new Date(hdr.createdAt || Date.now());
                                const pad = (n) => String(n).padStart(2, "0");
                                const ts = `${d.getFullYear()}/${pad(
                                  d.getMonth() + 1,
                                )}/${pad(d.getDate())} ${pad(
                                  d.getHours(),
                                )}:${pad(d.getMinutes())}`;
                                return `${hdr.uploadByName} | ${ts}`;
                              } catch {
                                return hdr.uploadByName;
                              }
                            })()}
                          </td>

                          <td style={styles.tdWithLeftBorder}>
                            <button
                              style={styles.addButton}
                              onClick={() => {
                                setActiveHeaderIdForVendorForm(hdr.id);
                                autoExpandHeaderOnVendorAdd(hdr.id);
                                setAddVendorDetail(true);
                              }}
                              title="Add Vendor"
                            >
                              <Plus size={10} />
                            </button>
                            <button
                              style={styles.deleteButton}
                              onClick={() => handleDeleteHeader(hdr.id)}
                              title="Delete"
                            >
                              <Trash2 size={10} />
                            </button>
                          </td>
                        </tr>
                      );

                      const expandedRow = expandedRows[hdr.id] ? (
                        <tr key={`hdr-${hdr.id}-expanded`}>
                          <td
                            colSpan="11"
                            style={{ padding: 0, border: "none" }}
                          >
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
                                  <col style={{ width: "9%" }} />
                                </colgroup>
                                <thead>
                                  <tr style={styles.expandedTableHeader}>
                                    <th style={styles.expandedTh}>No</th>
                                    <th style={styles.expandedTh}></th>
                                    <th style={styles.expandedTh}>Trip</th>
                                    <th style={styles.expandedTh}>
                                      Vendor Name
                                    </th>
                                    <th style={styles.expandedTh}>DO Number</th>
                                    <th style={styles.expandedTh}>
                                      Arrival Time
                                    </th>
                                    <th style={styles.expandedTh}>
                                      Total Pallet
                                    </th>
                                    <th style={styles.expandedTh}>
                                      Total Part
                                    </th>
                                    <th style={styles.expandedTh}>Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {headerVendors.length === 0 ? (
                                    <tr></tr>
                                  ) : (
                                    headerVendors.map((vd, idx) => {
                                      const trip = tripOptions.find(
                                        (t) =>
                                          Number(t.id) === Number(vd.trip_id),
                                      );
                                      const vendor = vendorOptions.find(
                                        (v) =>
                                          Number(v.id) === Number(vd.vendor_id),
                                      );
                                      const tripLabel = trip?.trip_no || "-";
                                      const vendorLabel = vendor
                                        ? `${vendor.vendor_code} - ${vendor.vendor_name}`
                                        : "-";
                                      const doJoined = (
                                        vd.do_number || []
                                      ).join(" | ");
                                      const arrival = trip?.arv_to || "-";
                                      const vendorRowId = `${hdr.id}_vendor_${
                                        idx + 1
                                      }`;

                                      const vendorRow = (
                                        <tr
                                          key={`${vendorRowId}-row`}
                                          onMouseEnter={(e) =>
                                            (e.target.closest(
                                              "tr",
                                            ).style.backgroundColor = "#c7cde8")
                                          }
                                          onMouseLeave={(e) =>
                                            (e.target.closest(
                                              "tr",
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
                                            {idx + 1}
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
                                                toggleVendorRowExpansion(
                                                  vendorRowId,
                                                )
                                              }
                                            >
                                              {expandedVendorRows[
                                                vendorRowId
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
                                          <td
                                            style={styles.expandedTd}
                                            title={tripLabel}
                                          >
                                            {tripLabel}
                                          </td>
                                          <td
                                            style={styles.expandedTd}
                                            title={vendorLabel}
                                          >
                                            {vendorLabel}
                                          </td>
                                          <td
                                            style={styles.expandedTd}
                                            title={doJoined}
                                          >
                                            {doJoined}
                                          </td>
                                          <td
                                            style={styles.expandedTd}
                                            title={arrival}
                                          >
                                            {arrival}
                                          </td>
                                          <td
                                            style={styles.expandedTd}
                                            title={getPalletTooltipDetails(
                                              hdr.id,
                                              idx,
                                            )}
                                          >
                                            {getTotalPalletForVendor(
                                              hdr.id,
                                              idx,
                                            )}
                                          </td>
                                          <td
                                            style={styles.expandedTd}
                                            title={calculateTotalPartsForVendor(
                                              vd,
                                            )}
                                          >
                                            {calculateTotalPartsForVendor(vd)}
                                          </td>
                                          <td style={styles.expandedTd}>
                                            <button
                                              style={styles.addButton}
                                              onClick={() =>
                                                openVendorPartDetailPopup(
                                                  hdr.id,
                                                  idx,
                                                  vd,
                                                  vendorLabel,
                                                )
                                              }
                                              title="Add Part Detail"
                                            >
                                              <Plus size={10} />
                                            </button>

                                            <button
                                              style={styles.deleteButton}
                                              onClick={() =>
                                                handleDeleteVendor(hdr.id, idx)
                                              }
                                              title="Delete"
                                            >
                                              <Trash2 size={10} />
                                            </button>
                                          </td>
                                        </tr>
                                      );

                                      const partRow = expandedVendorRows[
                                        vendorRowId
                                      ] ? (
                                        <tr key={`${vendorRowId}-parts`}>
                                          <td
                                            colSpan="9"
                                            style={{
                                              padding: 0,
                                              border: "none",
                                            }}
                                          >
                                            <div
                                              style={
                                                styles.thirdLevelTableContainer
                                              }
                                            >
                                              <table
                                                style={styles.thirdLevelTable}
                                              >
                                                <colgroup>
                                                  <col
                                                    style={{ width: "1.5%" }}
                                                  />
                                                  <col
                                                    style={{ width: "10%" }}
                                                  />
                                                  <col
                                                    style={{ width: "20%" }}
                                                  />
                                                  <col
                                                    style={{ width: "8%" }}
                                                  />
                                                  <col
                                                    style={{ width: "8%" }}
                                                  />
                                                  <col
                                                    style={{ width: "8%" }}
                                                  />
                                                  <col
                                                    style={{ width: "5%" }}
                                                  />
                                                </colgroup>
                                                <thead>
                                                  <tr
                                                    style={
                                                      styles.thirdLevelTableHeader
                                                    }
                                                  >
                                                    <th
                                                      style={styles.expandedTh}
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
                                                      Action
                                                    </th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {Array.isArray(vd.parts) &&
                                                  vd.parts.length > 0 ? (
                                                    vd.parts.map(
                                                      (part, pIndex) => (
                                                        <tr
                                                          key={`${vendorRowId}-part-${
                                                            part.id || pIndex
                                                          }`}
                                                          onMouseEnter={(e) =>
                                                            (e.target.closest(
                                                              "tr",
                                                            ).style.backgroundColor =
                                                              "#c7cde8")
                                                          }
                                                          onMouseLeave={(e) =>
                                                            (e.target.closest(
                                                              "tr",
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
                                                            {pIndex + 1}
                                                          </td>
                                                          <td
                                                            style={
                                                              styles.thirdLevelTd
                                                            }
                                                            title={
                                                              part.partCode
                                                            }
                                                          >
                                                            {part.partCode}
                                                          </td>
                                                          <td
                                                            style={
                                                              styles.thirdLevelTd
                                                            }
                                                            title={
                                                              part.partName ||
                                                              "—"
                                                            }
                                                          >
                                                            {part.partName ||
                                                              "—"}
                                                          </td>
                                                          <td
                                                            style={
                                                              styles.thirdLevelTd
                                                            }
                                                            title={String(
                                                              part.qty ?? 0,
                                                            )}
                                                          >
                                                            {(() => {
                                                              const isEditing =
                                                                editingExpandedPart.showInput &&
                                                                editingExpandedPart.headerId ===
                                                                  hdr.id &&
                                                                editingExpandedPart.vendorIndex ===
                                                                  idx &&
                                                                editingExpandedPart.partIndex ===
                                                                  pIndex;

                                                              if (isEditing) {
                                                                return (
                                                                  <input
                                                                    type="number"
                                                                    value={
                                                                      editingExpandedPart.qty
                                                                    }
                                                                    onChange={(
                                                                      e,
                                                                    ) =>
                                                                      setEditingExpandedPart(
                                                                        (
                                                                          prev,
                                                                        ) => ({
                                                                          ...prev,
                                                                          qty: e
                                                                            .target
                                                                            .value,
                                                                        }),
                                                                      )
                                                                    }
                                                                    onKeyDown={(
                                                                      e,
                                                                    ) =>
                                                                      handleEditExpandedPartKeyPress(
                                                                        e,
                                                                        hdr.id,
                                                                        idx,
                                                                        pIndex,
                                                                        part.id,
                                                                      )
                                                                    }
                                                                    onBlur={() =>
                                                                      handleSaveExpandedPartQty(
                                                                        hdr.id,
                                                                        idx,
                                                                        pIndex,
                                                                        part.id,
                                                                        editingExpandedPart.qty,
                                                                      )
                                                                    }
                                                                    autoFocus
                                                                    style={{
                                                                      width:
                                                                        "60px",
                                                                      padding:
                                                                        "2px",
                                                                      fontSize:
                                                                        "12px",
                                                                      textAlign:
                                                                        "center",
                                                                      border:
                                                                        "1px solid #9fa8da",
                                                                      borderRadius:
                                                                        "3px",
                                                                    }}
                                                                    min="0"
                                                                  />
                                                                );
                                                              } else {
                                                                return (
                                                                  <span>
                                                                    {loadingParts[
                                                                      part.id
                                                                    ] ? (
                                                                      <span
                                                                        style={{
                                                                          fontSize:
                                                                            "10px",
                                                                          color:
                                                                            "#6b7280",
                                                                        }}
                                                                      >
                                                                        ...
                                                                      </span>
                                                                    ) : (
                                                                      (part.qty ??
                                                                      0)
                                                                    )}
                                                                  </span>
                                                                );
                                                              }
                                                            })()}
                                                          </td>
                                                          <td
                                                            style={
                                                              styles.thirdLevelTd
                                                            }
                                                            title={
                                                              part.qtyBox ?? 0
                                                            }
                                                          >
                                                            {part.qtyBox ?? 0}
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
                                                          >
                                                            <button
                                                              style={
                                                                styles.deleteButton
                                                              }
                                                              onClick={() =>
                                                                handleEditExpandedPartClick(
                                                                  hdr.id,
                                                                  idx,
                                                                  pIndex,
                                                                  part.id,
                                                                  part.qty || 0,
                                                                )
                                                              }
                                                              title="Edit"
                                                              disabled={
                                                                loadingParts[
                                                                  part.id
                                                                ]
                                                              }
                                                            >
                                                              {loadingParts[
                                                                part.id
                                                              ] ? (
                                                                <span
                                                                  style={{
                                                                    fontSize:
                                                                      "8px",
                                                                  }}
                                                                >
                                                                  ...
                                                                </span>
                                                              ) : (
                                                                <Pencil
                                                                  size={10}
                                                                />
                                                              )}
                                                            </button>
                                                            <button
                                                              style={
                                                                styles.deleteButton
                                                              }
                                                              onClick={() =>
                                                                handleDeletePart(
                                                                  hdr.id,
                                                                  idx,
                                                                  part.id,
                                                                )
                                                              }
                                                              title="Delete"
                                                              disabled={
                                                                loadingParts[
                                                                  part.id
                                                                ]
                                                              }
                                                            >
                                                              <Trash2
                                                                size={10}
                                                              />
                                                            </button>
                                                          </td>
                                                        </tr>
                                                      ),
                                                    )
                                                  ) : (
                                                    <tr></tr>
                                                  )}
                                                </tbody>
                                              </table>
                                            </div>
                                          </td>
                                        </tr>
                                      ) : null;
                                      return [vendorRow, partRow];
                                    })
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      ) : null;
                      return [headerRow, expandedRow];
                    })
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

          {headerDrafts.length > 0 && (
            <div style={styles.saveConfiguration}>
              <button
                style={{
                  ...styles.button,
                  ...styles.primaryButton,
                  opacity: isSubmitting ? 0.7 : 1,
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                }}
                onClick={handleSubmitScheduleToDatabase}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span style={{ fontSize: "12px" }}>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Input Schedule
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {addVendorDetail && (
        <div style={vendorDetailStyles.popupOverlay}>
          <div style={vendorDetailStyles.popupContainer}>
            <div style={vendorDetailStyles.popupHeader}>
              <h3 style={vendorDetailStyles.popupTitle}>Add Vendor Detail</h3>
              <button
                onClick={() => {
                  setAddVendorFormData({
                    trip: "",
                    vendor: "",
                    doNumbers: [""],
                    arrivalTime: "",
                  });
                  setAddVendorDetail(false);
                }}
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
                  onChange={onTripChange}
                  style={vendorDetailStyles.select}
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
                  value={addVendorFormData.vendor}
                  onChange={(e) =>
                    handleAddVendorInputChange("vendor", e.target.value)
                  }
                  style={vendorDetailStyles.select}
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
                  Add Column
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
                              <td style={vendorPartStyles.tdNumber}>
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
    </div>
  );
};

export default AddOverseaPartSchedulePage;