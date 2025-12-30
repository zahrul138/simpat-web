"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MdArrowRight, MdArrowDropDown } from "react-icons/md";
import { Plus, Trash2, Pencil, Save } from "lucide-react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const getAuthUserLocal = () => {
  try {
    return JSON.parse(localStorage.getItem("auth_user") || "null");
  } catch {
    return null;
  }
};

const AddLocalSchedulePage = () => {
  const navigate = useNavigate();
  const [selectedStockLevel, setSelectedStockLevel] = useState("M101 | SCN-MH");
  const [selectedModel, setSelectedModel] = useState("Veronicas");
  const [scheduleDate, setScheduleDate] = useState("");
  const [tooltip, setTooltip] = useState({
    visible: false,
    content: "",
    x: 0,
    y: 0,
  });
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

  // Fungsi untuk menghitung kapasitas box di pallet
  const calculateBoxCapacity = (pallet, boxLength, boxWidth, boxHeight) => {
    // Hitung berapa box yang muat di satu layer pallet
    // Coba kedua orientasi dan ambil yang terbaik

    // Orientasi normal
    const boxesPerLayerNormal = {
      lengthwise: Math.floor(pallet.length / boxLength),
      widthwise: Math.floor(pallet.width / boxWidth),
    };
    const boxesPerLayer1 =
      boxesPerLayerNormal.lengthwise * boxesPerLayerNormal.widthwise;

    // Orientasi diputar 90 derajat
    const boxesPerLayerRotated = {
      lengthwise: Math.floor(pallet.length / boxWidth),
      widthwise: Math.floor(pallet.width / boxLength),
    };
    const boxesPerLayer2 =
      boxesPerLayerRotated.lengthwise * boxesPerLayerRotated.widthwise;

    // Ambil yang terbaik
    const boxesPerLayer = Math.max(boxesPerLayer1, boxesPerLayer2, 1);

    // Hitung tinggi yang tersedia untuk stacking
    const availableHeight = pallet.maxHeight - pallet.baseHeight;
    const maxStackHeight = Math.floor(availableHeight / boxHeight);

    // Gunakan safety factor (80% dari tinggi maksimal)
    const safeStackHeight = Math.max(1, Math.floor(maxStackHeight * 0.8));

    // Total boxes per pallet
    const totalBoxesPerPallet = boxesPerLayer * safeStackHeight;

    return {
      boxesPerLayer,
      maxStackHeight,
      safeStackHeight,
      totalBoxesPerPallet,
      efficiency: boxesPerLayer1 >= boxesPerLayer2 ? "normal" : "rotated",
    };
  };

  // ==================== FUNGSI PERHITUNGAN PALLET SEDERHANA ====================
  // Helper function: hitung kapasitas pallet DENGAN MEMPERTIMBANGKAN BERAT
  const calculatePalletCapacityWithWeight = (
    boxLength,
    boxWidth,
    boxHeight,
    boxWeight, // berat per box (kg)
    palletType,
    totalBoxes
  ) => {
    // Konfigurasi pallet (sudah termasuk maxWeight)
    const palletConfigs = {
      small: {
        length: 96,
        width: 76,
        maxHeight: 150,
        baseHeight: 15,
        maxWeight: 60,
      },
      large: {
        length: 110,
        width: 110,
        maxHeight: 180,
        baseHeight: 15,
        maxWeight: 150,
      },
    };

    const config = palletConfigs[palletType];
    const palletLength = config.length;
    const palletWidth = config.width;
    const availableHeight = config.maxHeight - config.baseHeight;
    const maxWeight = config.maxWeight;

    // Hitung boxes per layer dengan orientasi terbaik
    let bestBoxesPerLayer = 0;
    let bestOrientation = "";

    // Coba semua kombinasi orientasi
    const orientations = [
      { name: "normal", l: boxLength, w: boxWidth },
      { name: "rotated", l: boxWidth, w: boxLength },
      {
        name: "mixed",
        l: Math.max(boxLength, boxWidth),
        w: Math.min(boxLength, boxWidth),
      },
    ];

    for (const orient of orientations) {
      const boxesLengthwise = Math.floor(palletLength / orient.l);
      const boxesWidthwise = Math.floor(palletWidth / orient.w);
      const boxesPerLayer = boxesLengthwise * boxesWidthwise;

      if (boxesPerLayer > bestBoxesPerLayer) {
        bestBoxesPerLayer = boxesPerLayer;
        bestOrientation = orient.name;
      }
    }

    // Untuk large pallet, coba kombinasi mixed orientation
    if (palletType === "large" && bestBoxesPerLayer < 4) {
      // Coba kombinasi: 2 normal + 2 rotated
      const boxesNormal =
        Math.floor(palletLength / boxLength) *
        Math.floor(palletWidth / boxWidth);
      const boxesRotated =
        Math.floor(palletLength / boxWidth) *
        Math.floor(palletWidth / boxLength);

      if (boxesNormal + boxesRotated > bestBoxesPerLayer) {
        bestBoxesPerLayer = Math.min(4, boxesNormal + boxesRotated);
        bestOrientation = "mixed-combination";
      }
    }

    // Hitung max layers berdasarkan tinggi
    const maxLayersByHeight = Math.floor(availableHeight / boxHeight);

    // Tambah 1 layer untuk toleransi (jika memungkinkan)
    let maxLayers = maxLayersByHeight;
    const extraSpace = availableHeight - maxLayersByHeight * boxHeight;
    if (extraSpace >= 10) {
      // Toleransi 10cm
      maxLayers = maxLayersByHeight + 1;
    }

    // Minimum 1 layer
    maxLayers = Math.max(1, maxLayers);

    // Hitung berat per layer
    const weightPerLayer = bestBoxesPerLayer * boxWeight;

    // Hitung max layers berdasarkan berat
    const maxLayersByWeight = Math.floor(maxWeight / weightPerLayer);

    // Ambil yang lebih kecil antara batas tinggi dan batas berat
    const safeLayers = Math.min(maxLayers, maxLayersByWeight);

    // Pastikan minimal 1 layer
    const finalLayers = Math.max(1, safeLayers);

    // Hitung boxes per pallet
    const boxesPerPallet = bestBoxesPerLayer * finalLayers;

    // Hitung berat per pallet
    const weightPerPallet = boxesPerPallet * boxWeight;

    // Pastikan tidak melebihi berat maksimal
    if (weightPerPallet > maxWeight) {
      // Kurangi boxes sampai berat sesuai
      const maxBoxesByWeight = Math.floor(maxWeight / boxWeight);
      const maxLayersByWeightAdjusted = Math.floor(
        maxBoxesByWeight / bestBoxesPerLayer
      );
      const adjustedLayers = Math.max(
        1,
        Math.min(finalLayers, maxLayersByWeightAdjusted)
      );
      const adjustedBoxesPerPallet = bestBoxesPerLayer * adjustedLayers;

      console.log(
        `Weight constraint applied: ${adjustedBoxesPerPallet} boxes per pallet (${adjustedLayers} layers)`
      );

      const palletsNeeded = Math.ceil(totalBoxes / adjustedBoxesPerPallet);
      return {
        boxesPerLayer: bestBoxesPerLayer,
        safeLayers: adjustedLayers,
        boxesPerPallet: adjustedBoxesPerPallet,
        weightPerPallet: adjustedBoxesPerPallet * boxWeight,
        palletsNeeded,
        orientation: bestOrientation,
        weightLimited: weightPerPallet > maxWeight,
      };
    }

    const palletsNeeded = Math.ceil(totalBoxes / boxesPerPallet);

    return {
      boxesPerLayer: bestBoxesPerLayer,
      safeLayers: finalLayers,
      boxesPerPallet,
      weightPerPallet,
      palletsNeeded,
      orientation: bestOrientation,
      weightLimited: false,
    };
  };

  const calculatePalletForVendor = async (headerId, vendorIndex) => {
    try {
      const vendor = vendorDraftsByHeader[headerId]?.[vendorIndex];
      if (!vendor || !vendor.parts || vendor.parts.length === 0) {
        return {
          largePallets: 0,
          smallPallets: 0,
          totalPallets: 0,
          details: [],
          totalWeight: 0,
          weightDistribution: {},
        };
      }

      console.log(`=== CALCULATING PALLET FOR VENDOR ${vendorIndex + 1} ===`);

      // Kelompokkan part berdasarkan placement (ukuran box sama)
      const boxGroups = {};

      // Pertama, kumpulkan semua data part termasuk berat
      for (const part of vendor.parts) {
        const partCode = part.partCode;
        const qtyBox = part.qtyBox || 0;

        if (qtyBox <= 0) continue;

        // Cari placement data
        let placementData = null;
        let partWeight = 0; // Default weight 0 jika tidak ada

        // Coba dari part data dulu
        if (part.placementId) {
          try {
            const placementResp = await fetch(
              `${API_BASE}/api/vendor-placements/${part.placementId}`
            );
            if (placementResp.ok) {
              const result = await placementResp.json();
              placementData = result.data || result;
            }
          } catch (err) {
            console.warn(`Error fetching placement:`, err);
          }
        }

        // Cari berat part dari kanban master
        if (!partWeight && partCode) {
          try {
            const partResp = await fetch(
              `${API_BASE}/api/kanban-master/by-part-code?part_code=${encodeURIComponent(
                partCode
              )}`
            );
            if (partResp.ok) {
              const partResult = await partResp.json();
              const kanbanData =
                partResult.item || partResult.data || partResult;

              // Ambil berat part
              if (kanbanData.part_weight) {
                partWeight = parseFloat(kanbanData.part_weight);

                // Konversi ke kg jika perlu
                if (kanbanData.weight_unit === "g") {
                  partWeight = partWeight / 1000;
                } else if (kanbanData.weight_unit === "lbs") {
                  partWeight = partWeight * 0.453592;
                } else if (kanbanData.weight_unit === "oz") {
                  partWeight = partWeight * 0.0283495;
                }
                // Jika sudah kg, biarkan saja
              }
            }
          } catch (err) {
            console.warn(`Error fetching part weight:`, err);
          }
        }

        if (
          placementData &&
          placementData.length_cm &&
          placementData.width_cm &&
          placementData.height_cm
        ) {
          const boxKey = `${placementData.length_cm}-${placementData.width_cm}-${placementData.height_cm}`;

          if (!boxGroups[boxKey]) {
            boxGroups[boxKey] = {
              boxLength: parseFloat(placementData.length_cm),
              boxWidth: parseFloat(placementData.width_cm),
              boxHeight: parseFloat(placementData.height_cm),
              totalBoxes: 0,
              totalWeight: 0,
              partsList: [],
            };
          }

          boxGroups[boxKey].totalBoxes += qtyBox;
          boxGroups[boxKey].totalWeight += partWeight * qtyBox;
          boxGroups[boxKey].partsList.push({
            partCode,
            qtyBox,
            weightPerBox: partWeight,
            totalWeight: partWeight * qtyBox,
            placementName:
              placementData.placement_name || `Placement ${placementData.id}`,
          });

          console.log(
            `Added ${qtyBox} boxes of ${boxKey} for part ${partCode}, weight: ${partWeight} kg per box`
          );
        }
      }

      console.log("Box groups with weights:", boxGroups);

      let totalLargePallets = 0;
      let totalSmallPallets = 0;
      const partDetails = [];
      let totalWeight = 0;

      // Hitung pallet untuk setiap kelompok box DENGAN MEMPERTIMBANGKAN BERAT
      for (const boxKey in boxGroups) {
        const group = boxGroups[boxKey];
        const {
          boxLength,
          boxWidth,
          boxHeight,
          totalBoxes,
          totalWeight: groupWeight,
          partsList,
        } = group;

        console.log(
          `Processing ${totalBoxes} boxes (${groupWeight.toFixed(
            2
          )} kg) of ${boxLength}x${boxWidth}x${boxHeight}cm`
        );

        if (totalBoxes <= 0) continue;

        totalWeight += groupWeight;

        // Tentukan pallet type berdasarkan dimensi box
        const canFitSmall = canBoxFitPallet(boxLength, boxWidth, 76, 96);
        const canFitLarge = canBoxFitPallet(boxLength, boxWidth, 110, 110);

        let palletType = "oversized";
        let palletInfo = null;

        if (canFitLarge) {
          palletType = "large";
          palletInfo = calculatePalletCapacityWithWeight(
            boxLength,
            boxWidth,
            boxHeight,
            groupWeight / totalBoxes, // weight per box
            "large",
            totalBoxes
          );
        } else if (canFitSmall) {
          palletType = "small";
          palletInfo = calculatePalletCapacityWithWeight(
            boxLength,
            boxWidth,
            boxHeight,
            groupWeight / totalBoxes, // weight per box
            "small",
            totalBoxes
          );
        }

        if (palletInfo) {
          if (palletType === "large") {
            totalLargePallets += palletInfo.palletsNeeded;
          } else if (palletType === "small") {
            totalSmallPallets += palletInfo.palletsNeeded;
          }

          partDetails.push({
            boxSize: `${boxLength}×${boxWidth}×${boxHeight}cm`,
            totalBoxes,
            totalWeight: groupWeight,
            palletType,
            ...palletInfo,
            parts: partsList,
          });

          console.log(
            `Result: ${
              palletInfo.palletsNeeded
            } ${palletType} pallet(s), weight: ${groupWeight.toFixed(2)} kg`
          );
        }
      }

      // Optimasi: gabung small ke large jika efisien
      if (totalSmallPallets >= 2) {
        const largeFromSmall = Math.floor(totalSmallPallets / 2);
        totalLargePallets += largeFromSmall;
        totalSmallPallets = totalSmallPallets % 2;
        console.log(
          `Optimized: ${largeFromSmall} small pallets converted to ${largeFromSmall} large pallet(s)`
        );
      }

      const totalPallets = totalLargePallets + totalSmallPallets;

      console.log(
        `Final result: ${totalPallets} pallets (${totalLargePallets} large, ${totalSmallPallets} small), total weight: ${totalWeight.toFixed(
          2
        )} kg`
      );

      return {
        largePallets: totalLargePallets,
        smallPallets: totalSmallPallets,
        totalPallets,
        totalWeight,
        details: partDetails,
      };
    } catch (error) {
      console.error("Error calculating pallet:", error);
      return {
        largePallets: 0,
        smallPallets: 0,
        totalPallets: 0,
        totalWeight: 0,
        details: [],
      };
    }
  };

  // Helper function: cek apakah box muat di pallet
  const canBoxFitPallet = (boxLength, boxWidth, palletLength, palletWidth) => {
    return (
      (boxLength <= palletLength && boxWidth <= palletWidth) ||
      (boxWidth <= palletLength && boxLength <= palletWidth)
    );
  };

  // Helper function: hitung kapasitas pallet
  const calculatePalletCapacity = (
    boxLength,
    boxWidth,
    boxHeight,
    palletType,
    totalBoxes
  ) => {
    // Konfigurasi pallet
    const palletConfigs = {
      small: { length: 96, width: 76, maxHeight: 170, baseHeight: 15 },
      large: { length: 110, width: 110, maxHeight: 170, baseHeight: 15 },
    };

    const config = palletConfigs[palletType];
    const palletLength = config.length;
    const palletWidth = config.width;
    const availableHeight = config.maxHeight - config.baseHeight;

    // Hitung boxes per layer dengan orientasi terbaik
    let bestBoxesPerLayer = 0;
    let bestOrientation = "";

    // Coba semua kombinasi orientasi
    const orientations = [
      { name: "normal", l: boxLength, w: boxWidth },
      { name: "rotated", l: boxWidth, w: boxLength },
      {
        name: "mixed",
        l: Math.max(boxLength, boxWidth),
        w: Math.min(boxLength, boxWidth),
      },
    ];

    for (const orient of orientations) {
      const boxesLengthwise = Math.floor(palletLength / orient.l);
      const boxesWidthwise = Math.floor(palletWidth / orient.w);
      const boxesPerLayer = boxesLengthwise * boxesWidthwise;

      if (boxesPerLayer > bestBoxesPerLayer) {
        bestBoxesPerLayer = boxesPerLayer;
        bestOrientation = orient.name;
      }
    }

    // Untuk large pallet, coba kombinasi mixed orientation
    if (palletType === "large" && bestBoxesPerLayer < 4) {
      // Coba kombinasi: 2 normal + 2 rotated
      const boxesNormal =
        Math.floor(palletLength / boxLength) *
        Math.floor(palletWidth / boxWidth);
      const boxesRotated =
        Math.floor(palletLength / boxWidth) *
        Math.floor(palletWidth / boxLength);

      if (boxesNormal + boxesRotated > bestBoxesPerLayer) {
        bestBoxesPerLayer = Math.min(4, boxesNormal + boxesRotated);
        bestOrientation = "mixed-combination";
      }
    }

    // Hitung max layers dengan toleransi tinggi
    const maxLayers = Math.floor(availableHeight / boxHeight);

    // Tambah 1 layer untuk toleransi (jika memungkinkan)
    let safeLayers = maxLayers;
    const extraSpace = availableHeight - maxLayers * boxHeight;
    if (extraSpace >= 10) {
      // Toleransi 10cm
      safeLayers = maxLayers + 1;
    }

    // Minimum 1 layer
    safeLayers = Math.max(1, safeLayers);

    const boxesPerPallet = bestBoxesPerLayer * safeLayers;
    const palletsNeeded = Math.ceil(totalBoxes / boxesPerPallet);

    return {
      boxesPerLayer: bestBoxesPerLayer,
      safeLayers,
      boxesPerPallet,
      palletsNeeded,
      orientation: bestOrientation,
    };
  };

  const recalculatePalletForVendor = async (headerId, vendorIndex) => {
    try {
      console.log(
        `Recalculating pallet for vendor ${
          vendorIndex + 1
        } in schedule ${headerId}`
      );

      const result = await calculatePalletForVendor(headerId, vendorIndex);

      setPalletCalculations((prev) => ({
        ...prev,
        [`${headerId}_${vendorIndex}`]: result,
      }));

      console.log(`Pallet result for ${headerId}_${vendorIndex}:`, result);

      return result;
    } catch (error) {
      console.error("Error recalculating pallet:", error);
      setPalletCalculations((prev) => ({
        ...prev,
        [`${headerId}_${vendorIndex}`]: {
          largePallets: 0,
          smallPallets: 0,
          totalPallets: 0,
          details: [],
          summary: "Calculation error",
        },
      }));
      return null;
    }
  };

  const getTotalPalletForVendor = (headerId, vendorIndex) => {
    const palletKey = `${headerId}_${vendorIndex}`;
    const calculation = palletCalculations[palletKey];
    return calculation ? calculation.totalPallets : 0;
  };

  const getPalletCalculationDetails = (headerId, vendorIndex) => {
    const palletKey = `${headerId}_${vendorIndex}`;
    const calculation = palletCalculations[palletKey];

    if (!calculation || calculation.totalPallets === 0) return "0 pallet";

    let details = [];
    if (calculation.largePallets > 0)
      details.push(`${calculation.largePallets} large`);
    if (calculation.smallPallets > 0)
      details.push(`${calculation.smallPallets} small`);

    return details.length > 0 ? details.join(" + ") : "0 pallet";
  };

  const getPalletTooltipDetails = (headerId, vendorIndex) => {
    const palletKey = `${headerId}_${vendorIndex}`;
    const calculation = palletCalculations[palletKey];

    if (!calculation) return "Calculating...";

    const { totalPallets, largePallets, smallPallets } = calculation;

    if (totalPallets === 0) return "0 pallet";

    let details = `Total: ${totalPallets} pallet`;
    if (largePallets > 0) details += ` (${largePallets} large`;
    if (smallPallets > 0) {
      if (largePallets > 0) details += `, ${smallPallets} small)`;
      else details += ` (${smallPallets} small)`;
    } else if (largePallets > 0) {
      details += `)`;
    }

    return details;
  };

  const getPalletTooltipDetailsForHeader = (headerId) => {
    const { totalLarge, totalSmall, total } =
      calculateTotalPalletForHeader(headerId);

    if (total === 0) return "0 pallet";

    let details = `Total: ${total} pallet`;
    if (totalLarge > 0) details += ` (${totalLarge} large`;
    if (totalSmall > 0) {
      if (totalLarge > 0) details += `, ${totalSmall} small)`;
      else details += ` (${totalSmall} small)`;
    } else if (totalLarge > 0) {
      details += `)`;
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

  const handleEditPartClick = (
    headerId,
    vendorIndex,
    partIndex,
    partId,
    currentQty
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
    newQty
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
          partData.partCode
        )}`
      );

      if (!resp.ok) throw new Error("Failed to fetch part details");
      const json = await resp.json();
      const kanbanData = json.item || json.data || json;

      if (!kanbanData) {
        alert("Part details not found in kanban master");
        return;
      }

      // Ambil qty_per_box
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

      // Hitung Qty Box: pembulatan ke atas (ceil)
      const qtyBox = Math.ceil(qty / qtyPerBox);

      console.log(
        `Saving part ${partData.partCode}: qty=${qty}, qtyPerBox=${qtyPerBox}, qtyBox=${qtyBox}`
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
          // Simpan juga berat part jika ada
          partWeight: kanbanData.part_weight || 0,
          weightUnit: kanbanData.weight_unit || "kg",
        };

        newVendors[vendorIndex] = {
          ...newVendors[vendorIndex],
          parts: newParts,
        };
        return { ...prev, [headerId]: newVendors };
      });

      // Trigger perhitungan ulang pallet setelah update qty (DENGAN BERAT)
      await recalculatePalletForVendor(headerId, vendorIndex);

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
    currentQty
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
    newQty
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
          partData.partCode
        )}`
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
        `Saving part ${partData.partCode}: qty=${qty}, qtyPerBox=${qtyPerBox}, qtyBox=${qtyBox}`
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
          placementId: kanbanData.placement_id, // Simpan placementId
        };

        newVendors[vendorIndex] = {
          ...newVendors[vendorIndex],
          parts: newParts,
        };
        return { ...prev, [headerId]: newVendors };
      });

      await recalculatePalletForVendor(headerId, vendorIndex);

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
    partId
  ) => {
    if (e.key === "Enter") {
      handleSaveExpandedPartQty(
        headerId,
        vendorIndex,
        partIndex,
        partId,
        editingExpandedPart.qty
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
    // Hitung ulang pallet setiap kali vendorDraftsByHeader berubah
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
    partId
  ) => {
    if (e.key === "Enter") {
      handleSavePartQty(
        headerId,
        vendorIndex,
        partIndex,
        partId,
        editingPart.qty
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

      const sel = new Date(`${scheduleDate}T00:00:00`);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (!(sel instanceof Date) || Number.isNaN(sel.getTime())) {
        alert("Format Schedule Date not valid");
        return;
      }
      if (sel <= today) {
        alert("The schedule date must be later than today.");
        return;
      }

      const resp = await fetch(
        `${API_BASE}/api/local-schedules/check-date?scheduleDate=${scheduleDate}`
      );
      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.message || "Failed to check schedule date");
      }

      if (data.exists) {
        alert(
          "Schedule Date has been created. Try creating another Schedule Date."
        );
        return;
      }

      const isDuplicateDate = headerDrafts.some(
        (hdr) => hdr.scheduleDate === scheduleDate
      );

      if (isDuplicateDate) {
        alert("Schedule Date has been created in draft, try make another");
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

  const handleAddVendorSubmit = (e) => {
    e.preventDefault();

    if (!activeHeaderIdForVendorForm) {
      alert(
        "Header schedule not found. Click the + button on the schedule to which you want to add a vendor."
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
      (x) => String(x.trip_no) === String(addVendorFormData.trip)
    );
    if (!t?.id) {
      alert("Trip tidak dikenali. Pastikan trip master sudah tersedia.");
      return;
    }

    const vendorLabel = addVendorFormData.vendor;
    const v = vendorOptions.find(
      (x) => `${x.vendor_code} - ${x.vendor_name}` === vendorLabel
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
            do_numbers: clean,
            parts: [],
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

  const autoExpandVendorOnPartAdd = (headerId, vendorIndex) => {
    setExpandedRows((prev) => ({ ...prev, [headerId]: true }));
    const vendorRowId = `${headerId}_vendor_${vendorIndex + 1}`;
    setExpandedVendorRows((prev) => ({ ...prev, [vendorRowId]: true }));
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

    // Hapus juga perhitungan pallet untuk header ini
    setPalletCalculations((prev) => {
      const copy = { ...prev };
      Object.keys(copy).forEach((key) => {
        if (key.startsWith(`${headerId}_`)) delete copy[key];
      });
      return copy;
    });
  };

  async function handleSubmitVendors() {
    try {
      if (!headerDrafts.length) {
        alert("Belum ada draft schedule. Klik Insert dulu.");
        return;
      }
      if (selectedHeaderIds.size === 0) {
        alert("Please select schedule data");
        return;
      }
      const selected = [...selectedHeaderIds].map((id) =>
        headerDrafts.find((x) => x.id === id)
      );

      const tanpaVendor = selected.filter(
        (h) =>
          !h ||
          !vendorDraftsByHeader[h.id] ||
          vendorDraftsByHeader[h.id].length === 0
      );
      if (tanpaVendor.length > 0) {
        alert("Please add vendor details before input");
        return;
      }
      for (const hdr of selected) {
        const vendors = vendorDraftsByHeader[hdr.id] || [];
        for (const vendor of vendors) {
          if (!vendor.parts || vendor.parts.length === 0) {
            alert(
              `Schedule tanggal ${hdr.scheduleDate} memiliki vendor yang belum memiliki parts. Silakan tambahkan part details terlebih dahulu.`
            );
            return;
          }
        }
      }
      for (let i = 0; i < selected.length; i++) {
        const hdr = selected[i];
        const body = {
          stockLevel: hdr.stockLevel,
          modelName: hdr.modelName,
          scheduleDate: hdr.scheduleDate,
          uploadByName: hdr.uploadByName,
        };
        const resp = await fetch(`${API_BASE}/api/local-schedules`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await resp.json();
        if (!resp.ok)
          throw new Error(
            `Gagal membuat schedule: ${
              data.message || "Failed to create schedule"
            }`
          );
        const scheduleId = data.schedule?.id;
        if (!scheduleId) throw new Error(`Schedule ID tidak ditemukan`);

        const vendors = vendorDraftsByHeader[hdr.id] || [];
        if (vendors.length) {
          const vendorPayload = {
            items: vendors.map((vendor) => ({
              trip_id: vendor.trip_id,
              vendor_id: vendor.vendor_id,
              do_numbers: vendor.do_numbers || [],
            })),
          };
          const resp2 = await fetch(
            `${API_BASE}/api/local-schedules/${scheduleId}/vendors/bulk`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(vendorPayload),
            }
          );
          const data2 = await resp2.json();
          if (!resp2.ok)
            throw new Error(
              `Gagal menyimpan vendor: ${
                data2.message || "Failed to submit vendors"
              }`
            );

          for (let j = 0; j < vendors.length; j++) {
            const vendor = vendors[j];
            const vendorId = data2.vendors[j]?.id;
            if (vendorId && vendor.parts && vendor.parts.length > 0) {
              const partsData = vendor.parts.map((part) => ({
                part_code: part.partCode,
                part_name: part.partName || "",
                qty: part.qty || 0,
                qty_box: part.qtyBox || 0,
                unit: part.unit || "PCS",
                do_number: part.doNumber || "",
              }));
              const resp3 = await fetch(
                `${API_BASE}/api/local-schedules/${vendorId}/parts/bulk`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ items: partsData }),
                }
              );
              const data3 = await resp3.json();
              if (!resp3.ok)
                throw new Error(
                  `Gagal menyimpan parts: ${
                    data3.message || "Failed to submit parts"
                  }`
                );
            }
          }
        }
      }

      alert("Semua schedule, vendor details, dan parts berhasil disimpan.");
      const nextHeaders = headerDrafts.filter(
        (h) => !selectedHeaderIds.has(h.id)
      );
      setHeaderDrafts(nextHeaders);
      const nextVendors = { ...vendorDraftsByHeader };
      selectedHeaderIds.forEach((id) => {
        delete nextVendors[id];
      });
      setVendorDraftsByHeader(nextVendors);
      setSelectedHeaderIds(new Set());
      setSelectAll(false);
      setExpandedRows((prev) => {
        const next = { ...prev };
        selectedHeaderIds.forEach((id) => {
          delete next[id];
        });
        return next;
      });
      setExpandedVendorRows((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          selectedHeaderIds.forEach((id) => {
            if (key.startsWith(`${id}_vendor_`)) delete next[key];
          });
        });
        return next;
      });

      // Hapus perhitungan pallet untuk header yang sudah disubmit
      setPalletCalculations((prev) => {
        const next = { ...prev };
        selectedHeaderIds.forEach((id) => {
          Object.keys(next).forEach((key) => {
            if (key.startsWith(`${id}_`)) delete next[key];
          });
        });
        return next;
      });

      navigate("/local-schedule");
    } catch (e) {
      alert("Error: " + e.message);
    }
  }

  const handleUniversalEditPartClick = (
    headerId,
    vendorIndex,
    partIndex,
    partId,
    currentQty,
    source = "expanded"
  ) => {
    if (source === "popup") {
      handleEditPartClick(headerId, vendorIndex, partIndex, partId, currentQty);
    } else {
      handleEditExpandedPartClick(
        headerId,
        vendorIndex,
        partIndex,
        partId,
        currentQty
      );
    }
  };

  const handleUniversalSavePartQty = async (
    headerId,
    vendorIndex,
    partIndex,
    partId,
    newQty,
    source = "expanded"
  ) => {
    if (source === "popup") {
      await handleSavePartQty(headerId, vendorIndex, partIndex, partId, newQty);
    } else {
      await handleSaveExpandedPartQty(
        headerId,
        vendorIndex,
        partIndex,
        partId,
        newQty
      );
    }
  };

  const handleUniversalKeyPress = (
    e,
    headerId,
    vendorIndex,
    partIndex,
    partId,
    source = "expanded"
  ) => {
    if (source === "popup") {
      handleEditPartKeyPress(e, headerId, vendorIndex, partIndex, partId);
    } else {
      handleEditExpandedPartKeyPress(
        e,
        headerId,
        vendorIndex,
        partIndex,
        partId
      );
    }
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

    // Hapus perhitungan pallet untuk vendor ini
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
      vendors[vendorIndex] = {
        ...vendors[vendorIndex],
        parts: (vendors[vendorIndex].parts || []).filter(
          (p) => p.id !== partId
        ),
      };
      return { ...prev, [headerId]: vendors };
    });

    recalculatePalletForVendor(headerId, vendorIndex);
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

  const toggleVendorRowExpansion = (vendorRowId) => {
    setExpandedVendorRows((prev) => ({
      ...prev,
      [vendorRowId]: !prev[vendorRowId],
    }));
  };

  const openVendorPartDetailPopup = (
    headerId,
    vendorIndex,
    vendorData,
    vendorLabel
  ) => {
    autoExpandVendorOnPartAdd(headerId, vendorIndex);
    const existingPartsInVendor = vendorData.parts || [];
    const existingPartCodes = existingPartsInVendor.map((p) => p.partCode);

    setActiveVendorContext({
      headerId,
      vendorIndex,
      vendorId: vendorData.vendor_id,
      vendorLabel,
      doNumbers: vendorData.do_numbers || [],
    });
    const currentPartsInForm = vendorData.parts ? [...vendorData.parts] : [];
    const filteredParts = currentPartsInForm.filter(
      (part) => !existingPartCodes.includes(part.partCode)
    );

    setAddVendorPartFormData({
      trip: "",
      vendor: vendorLabel,
      doNumbers:
        vendorData.do_numbers && vendorData.do_numbers.length
          ? [...vendorData.do_numbers]
          : [""],
      arrivalTime: "",
      parts: filteredParts,
    });
    setSelectedPartsInPopup([]);
    setAddVendorPartDetail(true);
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
        (_, i) => i !== index
      );
      setAddVendorFormData((prev) => ({
        ...prev,
        doNumbers: updatedDoNumbers,
      }));
    }
  };

  const handleAddPart = async (rawPartCode) => {
    const partCode = String(rawPartCode || "").trim();
    if (!partCode) return;
    if (!activeVendorContext) {
      alert("Vendor context tidak ditemukan. Buka popup dari baris vendor.");
      return;
    }

    const existingPartCodes = [];
    const { headerId, vendorIndex } = activeVendorContext;
    const vendorData = vendorDraftsByHeader[headerId]?.[vendorIndex];
    if (vendorData?.parts)
      existingPartCodes.push(...vendorData.parts.map((p) => p.partCode));
    if (addVendorPartFormData.parts)
      existingPartCodes.push(
        ...addVendorPartFormData.parts.map((p) => p.partCode)
      );

    try {
      const resp = await fetch(
        `${API_BASE}/api/kanban-master/qty-per-box?part_code=${encodeURIComponent(
          partCode
        )}`
      );

      if (!resp.ok) throw new Error("Gagal cek Part Code ke server.");
      const json = await resp.json();

      if (!json.success || !json.item) {
        alert("Part code not found atau tidak memiliki qty_per_box.");
        return;
      }

      const item = json.item;

      console.log("API Response with qty_per_box:", item);

      const isDuplicate = existingPartCodes.some(
        (code) => String(code) === String(item.part_code)
      );
      if (isDuplicate) {
        alert("Part already insert in this vendor");
        return;
      }

      if (
        activeVendorContext.vendorId &&
        item.vendor_id &&
        Number(item.vendor_id) !== Number(activeVendorContext.vendorId)
      ) {
        alert("Part code in another vendor.");
        return;
      }

      const availableDoNumbers =
        activeVendorContext.doNumbers && activeVendorContext.doNumbers.length
          ? activeVendorContext.doNumbers.filter((d) => String(d || "").trim())
          : [];
      if (!availableDoNumbers.length) {
        alert(
          "DO Number untuk vendor ini belum ada. Tambahkan dulu di Vendor Detail."
        );
        return;
      }

      let qtyPerBox = item.qty_per_box || 1;

      if (qtyPerBox <= 0) {
        qtyPerBox = 1;
        console.warn(
          `Invalid qty_per_box for part ${item.part_code}: ${item.qty_per_box}, using default 1`
        );
      }

      console.log(`Part ${item.part_code}: qtyPerBox = ${qtyPerBox}`);

      const qty = 0;
      const qtyBox = Math.ceil(qty / qtyPerBox);

      // Ambil berat part
      let partWeight = item.part_weight || 0;
      // Konversi ke kg jika perlu
      if (item.weight_unit === "g") {
        partWeight = partWeight / 1000;
      } else if (item.weight_unit === "lbs") {
        partWeight = partWeight * 0.453592;
      } else if (item.weight_unit === "oz") {
        partWeight = partWeight * 0.0283495;
      }

      console.log(`Part ${item.part_code}: weight = ${partWeight} kg`);

      console.log(
        `Adding part ${item.part_code}: qty=${qty}, qtyPerBox=${qtyPerBox}, qtyBox=${qtyBox}, weight=${partWeight} kg`
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
          partWeight: partWeight, // Simpan berat
          weightUnit: "kg", // Selalu simpan dalam kg
        };
        return { ...prev, parts: [...(prev.parts || []), newPart] };
      });
      setSelectedPartsInPopup([]);
    } catch (err) {
      console.error("Error adding part:", err);
      alert(err.message || "Terjadi kesalahan saat cek Part Code.");
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
                      part.partCode
                    )}`
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
                    error
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

  const handleRemoveVendorPart = (headerId, vendorIndex, partId) => {
    setVendorDraftsByHeader((prev) => {
      const vendors = [...(prev[headerId] || [])];
      if (!vendors[vendorIndex]) return prev;
      vendors[vendorIndex] = {
        ...vendors[vendorIndex],
        parts: (vendors[vendorIndex].parts || []).filter(
          (p) => p.id !== partId
        ),
      };
      return { ...prev, [headerId]: vendors };
    });

    recalculatePalletForVendor(headerId, vendorIndex);
  };

  const handleAddVendorPartSubmit = async (e) => {
    e.preventDefault();
    if (!activeVendorContext) {
      alert("Vendor context tidak ditemukan.");
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
      selectedPartsInPopup.includes(part.id)
    );

    setVendorDraftsByHeader((prev) => {
      const vendors = [...(prev[headerId] || [])];
      if (!vendors[vendorIndex]) return prev;
      const existingParts = vendors[vendorIndex].parts || [];
      const existingPartCodes = existingParts.map((p) => p.partCode);
      const uniquePartsToInsert = partsToInsert.filter(
        (part) => !existingPartCodes.includes(part.partCode)
      );
      vendors[vendorIndex] = {
        ...vendors[vendorIndex],
        parts: [...existingParts, ...uniquePartsToInsert],
      };
      return { ...prev, [headerId]: vendors };
    });
    // Recalculate pallet setelah menambahkan parts
    await recalculatePalletForVendor(headerId, vendorIndex);

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

  useEffect(() => {
    // Hitung ulang pallet setiap kali vendorDraftsByHeader berubah
    const calculateAllPallets = async () => {
      console.log("=== CALCULATING ALL PALLETS ===");

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

  const resetVendorPartForm = () => {
    setAddVendorPartFormData({
      trip: "",
      vendor: "",
      doNumbers: [""],
      arrivalTime: "",
      parts: [],
    });
    setSelectedPartsInPopup([]);
    setActiveVendorContext(null);
  };

  const showTooltip = (e) => {
    e.stopPropagation();
    const target = e.target;
    let content = "";

    // Check for data-tooltip attribute first
    if (target.dataset.tooltip) content = target.dataset.tooltip;
    else if (target.closest("[data-tooltip]"))
      content = target.closest("[data-tooltip]").dataset.tooltip;
    else if (target.title) content = target.title;
    // Check for pallet cell
    else if (
      target.tagName === "TD" &&
      target.textContent.trim().match(/^\d+$/)
    ) {
      const cell = target;
      const row = cell.closest("tr");

      // Try to get pallet information
      if (row) {
        const cells = Array.from(row.querySelectorAll("td"));
        const cellIndex = cells.indexOf(cell);

        // Check if this is the pallet column (usually column 7 or 8)
        if (cellIndex >= 0) {
          const table = row.closest("table");
          if (table) {
            const headers = table.querySelectorAll("thead th");
            if (headers[cellIndex]) {
              const headerText = headers[cellIndex].textContent
                .trim()
                .toLowerCase();
              if (headerText.includes("pallet")) {
                // This is a pallet cell
                if (cell.title) {
                  content = cell.title;
                } else {
                  content = `Total Pallet: ${target.textContent.trim()}`;
                }
              }
            }
          }
        }
      }
    }

    // Check for buttons
    else if (target.tagName === "BUTTON" || target.closest("button")) {
      const button =
        target.tagName === "BUTTON" ? target : target.closest("button");

      if (button.querySelector("svg")) {
        const icon = button.querySelector("svg");

        if (icon.getAttribute("size") === "10") {
          content = "Add";
        } else if (button.classList.contains("delete-button")) {
          content = "Delete";
        } else if (button.querySelector('[data-icon="pencil"]')) {
          content = "Edit";
        } else if (button.querySelector('[data-icon="save"]')) {
          content = "Save";
        } else if (
          button.querySelector('[data-icon="arrow-right"]') ||
          button.querySelector('[data-icon="arrow-drop-down"]')
        ) {
          content = "Expand/collapse details";
        }
      }

      if (!content && button.title) content = button.title;
    }

    // Check for checkboxes
    else if (target.type === "checkbox") {
      content = "Select this row";
    }

    // Default for table cells
    else if (
      (target.tagName === "TD" || target.tagName === "TH") &&
      target.textContent.trim()
    ) {
      content = target.textContent.trim();
    }

    // Fallback
    if (!content) content = "Information";

    const rect = target.getBoundingClientRect();
    setTooltip({
      visible: true,
      content,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
  };

  const hideTooltip = () => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  const handleInputFocus = (e) => {
    e.target.style.borderColor = "#9fa8da";
  };

  const handleInputBlur = (e) => {
    e.target.style.borderColor = "#d1d5db";
  };

  const handleButtonHover = (e, isHover) => {
    e.target.style.backgroundColor = isHover ? "#1d4ed8" : "#2563eb";
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
    // TOOLTIP STYLE (SAMA SEPERTI TARGETSCHEDULEPAGE.JS)
    tooltip: {
      position: "fixed",
      top: tooltip.y,
      left: tooltip.x,
      transform: "translateX(-50%)",
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      color: "white",
      padding: "6px 10px",
      borderRadius: "4px",
      fontSize: "12px",
      fontWeight: "500",
      whiteSpace: "nowrap",
      pointerEvents: "none",
      zIndex: 9999,
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
    tooltip: {
      position: "fixed",
      top: tooltip.y,
      left: tooltip.x,
      transform: "translateX(-50%)",
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      color: "white",
      padding: "6px 10px",
      borderRadius: "4px",
      fontSize: "12px",
      fontWeight: "500",
      whiteSpace: "nowrap",
      pointerEvents: "none",
      zIndex: 9999,
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
                    onChange={(e) => {
                      const v = e.target.value;
                      setSelectedStockLevel(v);
                    }}
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
                        hdr.id
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
                            onMouseEnter={showTooltip}
                            onMouseLeave={hideTooltip}
                          >
                            {(() => {
                              try {
                                const d = new Date(hdr.scheduleDate);
                                if (Number.isNaN(d.getTime())) {
                                  return hdr.scheduleDate || "-";
                                }
                                const pad = (n) => String(n).padStart(2, "0");
                                return `${pad(d.getDate())}/${pad(
                                  d.getMonth() + 1
                                )}/${d.getFullYear()}`;
                              } catch {
                                return hdr.scheduleDate || "-";
                              }
                            })()}
                          </td>

                          <td
                            style={styles.tdWithLeftBorder}
                            onMouseEnter={showTooltip}
                            onMouseLeave={hideTooltip}
                            title={hdr.stockLevel}
                          >
                            {hdr.stockLevel}
                          </td>
                          <td
                            style={styles.tdWithLeftBorder}
                            onMouseEnter={showTooltip}
                            onMouseLeave={hideTooltip}
                            title={hdr.modelName}
                          >
                            {hdr.modelName}
                          </td>
                          <td
                            style={styles.tdWithLeftBorder}
                            onMouseEnter={showTooltip}
                            onMouseLeave={hideTooltip}
                          >
                            {headerVendors.length}
                          </td>
                          <td
                            style={styles.tdWithLeftBorder}
                            onMouseEnter={showTooltip}
                            onMouseLeave={hideTooltip}
                            title={getPalletTooltipDetailsForHeader(hdr.id)}
                          >
                            {headerPalletTotal.total}
                          </td>
                          <td
                            style={styles.tdWithLeftBorder}
                            onMouseEnter={showTooltip}
                            onMouseLeave={hideTooltip}
                          >
                            {calculateTotalPartsForHeader(hdr.id)}
                          </td>

                          <td
                            style={styles.tdWithLeftBorder}
                            onMouseEnter={showTooltip}
                            onMouseLeave={hideTooltip}
                          >
                            {(() => {
                              try {
                                const d = new Date(hdr.createdAt || Date.now());
                                const pad = (n) => String(n).padStart(2, "0");
                                const ts = `${d.getFullYear()}/${pad(
                                  d.getMonth() + 1
                                )}/${pad(d.getDate())} ${pad(
                                  d.getHours()
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
                              onMouseEnter={showTooltip}
                              onMouseLeave={hideTooltip}
                              data-tooltip="Add Vendor"
                            >
                              <Plus size={10} />
                            </button>
                            <button
                              style={styles.deleteButton}
                              onClick={() => handleDeleteHeader(hdr.id)}
                              onMouseEnter={showTooltip}
                              onMouseLeave={hideTooltip}
                              data-tooltip="Delete"
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
                                          Number(t.id) === Number(vd.trip_id)
                                      );
                                      const vendor = vendorOptions.find(
                                        (v) =>
                                          Number(v.id) === Number(vd.vendor_id)
                                      );
                                      const tripLabel = trip?.trip_no || "-";
                                      const vendorLabel = vendor
                                        ? `${vendor.vendor_code} - ${vendor.vendor_name}`
                                        : "-";
                                      const doJoined = (
                                        vd.do_numbers || []
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
                                              "tr"
                                            ).style.backgroundColor = "#c7cde8")
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
                                                  vendorRowId
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
                                            onMouseEnter={showTooltip}
                                            onMouseLeave={hideTooltip}
                                          >
                                            {tripLabel}
                                          </td>
                                          <td
                                            style={styles.expandedTd}
                                            onMouseEnter={showTooltip}
                                            onMouseLeave={hideTooltip}
                                          >
                                            {vendorLabel}
                                          </td>
                                          <td
                                            style={styles.expandedTd}
                                            onMouseEnter={showTooltip}
                                            onMouseLeave={hideTooltip}
                                          >
                                            {doJoined}
                                          </td>
                                          <td
                                            style={styles.expandedTd}
                                            onMouseEnter={showTooltip}
                                            onMouseLeave={hideTooltip}
                                          >
                                            {arrival}
                                          </td>
                                          <td
                                            style={styles.expandedTd}
                                            onMouseEnter={showTooltip}
                                            onMouseLeave={hideTooltip}
                                            title={getPalletTooltipDetails(
                                              hdr.id,
                                              idx
                                            )}
                                            data-tooltip={getPalletTooltipDetails(
                                              hdr.id,
                                              idx
                                            )}
                                          >
                                            {getTotalPalletForVendor(
                                              hdr.id,
                                              idx
                                            )}
                                          </td>
                                          <td
                                            style={styles.expandedTd}
                                            onMouseEnter={showTooltip}
                                            onMouseLeave={hideTooltip}
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
                                                  vendorLabel
                                                )
                                              }
                                              onMouseEnter={showTooltip}
                                              onMouseLeave={hideTooltip}
                                              data-tooltip="Add Part Detail"
                                            >
                                              <Plus size={10} />
                                            </button>

                                            <button
                                              style={styles.deleteButton}
                                              onClick={() =>
                                                handleDeleteVendor(hdr.id, idx)
                                              }
                                              onMouseEnter={showTooltip}
                                              onMouseLeave={hideTooltip}
                                              data-tooltip="Delete Vendor"
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
                                                            {pIndex + 1}
                                                          </td>
                                                          <td
                                                            style={
                                                              styles.thirdLevelTd
                                                            }
                                                            onMouseEnter={
                                                              showTooltip
                                                            }
                                                            onMouseLeave={
                                                              hideTooltip
                                                            }
                                                          >
                                                            {part.partCode}
                                                          </td>
                                                          <td
                                                            style={
                                                              styles.thirdLevelTd
                                                            }
                                                            onMouseEnter={
                                                              showTooltip
                                                            }
                                                            onMouseLeave={
                                                              hideTooltip
                                                            }
                                                            title={`Part Name: ${
                                                              part.partName ||
                                                              "—"
                                                            }`}
                                                          >
                                                            {part.partName ||
                                                              "—"}
                                                          </td>
                                                          <td
                                                            style={
                                                              styles.thirdLevelTd
                                                            }
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
                                                                      e
                                                                    ) =>
                                                                      setEditingExpandedPart(
                                                                        (
                                                                          prev
                                                                        ) => ({
                                                                          ...prev,
                                                                          qty: e
                                                                            .target
                                                                            .value,
                                                                        })
                                                                      )
                                                                    }
                                                                    onKeyDown={(
                                                                      e
                                                                    ) =>
                                                                      handleEditExpandedPartKeyPress(
                                                                        e,
                                                                        hdr.id,
                                                                        idx,
                                                                        pIndex,
                                                                        part.id
                                                                      )
                                                                    }
                                                                    onBlur={() =>
                                                                      handleSaveExpandedPartQty(
                                                                        hdr.id,
                                                                        idx,
                                                                        pIndex,
                                                                        part.id,
                                                                        editingExpandedPart.qty
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
                                                                  <span
                                                                    onMouseEnter={
                                                                      showTooltip
                                                                    }
                                                                    onMouseLeave={
                                                                      hideTooltip
                                                                    }
                                                                  >
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
                                                                      part.qty ??
                                                                      0
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
                                                            onMouseEnter={
                                                              showTooltip
                                                            }
                                                            onMouseLeave={
                                                              hideTooltip
                                                            }
                                                            title={`Quantity Box: ${
                                                              part.qtyBox ?? 0
                                                            }`}
                                                          >
                                                            {part.qtyBox ?? 0}
                                                          </td>
                                                          <td
                                                            style={
                                                              styles.thirdLevelTd
                                                            }
                                                            onMouseEnter={
                                                              showTooltip
                                                            }
                                                            onMouseLeave={
                                                              hideTooltip
                                                            }
                                                            title={`Unit: ${
                                                              part.unit || "PCS"
                                                            }`}
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
                                                                  part.qty || 0
                                                                )
                                                              }
                                                              onMouseEnter={
                                                                showTooltip
                                                              }
                                                              onMouseLeave={
                                                                hideTooltip
                                                              }
                                                              title="Edit quantity"
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
                                                                  part.id
                                                                )
                                                              }
                                                              onMouseEnter={
                                                                showTooltip
                                                              }
                                                              onMouseLeave={
                                                                hideTooltip
                                                              }
                                                              title="Delete part"
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
                                                      )
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
                }}
                onClick={handleSubmitVendors}
              >
                <Save size={16} />
                Input Schedule
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
                  setAddVendorDetail(false);
                  setActiveHeaderIdForVendorForm(null);
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
                    setAddVendorDetail(false);
                    setActiveHeaderIdForVendorForm(null);
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
                                    part.id
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
                                onMouseEnter={showTooltip}
                                onMouseLeave={hideTooltip}
                                data-tooltip={`${part.partCode}`}
                              >
                                {part.partCode}
                              </td>

                              <td
                                style={vendorPartStyles.td}
                                onMouseEnter={showTooltip}
                                onMouseLeave={hideTooltip}
                                data-tooltip={`${part.partName || "—"}`}
                              >
                                {part.partName || "—"}
                              </td>

                              <td style={vendorPartStyles.td}>
                                <input
                                  type="number"
                                  value={part.qty || 0}
                                  onChange={(e) =>
                                    handlePopupPartQtyChange(
                                      part.id,
                                      e.target.value
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
                                  min="0"
                                />
                              </td>

                              <td style={vendorPartStyles.td}>
                                <div>
                                  <div>{part.qtyBox || 0}</div>
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
                                onMouseEnter={showTooltip}
                                onMouseLeave={hideTooltip}
                                data-tooltip={`${part.unit || "PCS"}`}
                              >
                                {part.unit || "PCS"}
                              </td>

                              <td style={vendorPartStyles.td}>
                                <button
                                  style={vendorPartStyles.deleteButton}
                                  onClick={() => handleRemovePart(part.id)}
                                  onMouseEnter={showTooltip}
                                  onMouseLeave={hideTooltip}
                                  data-tooltip="Delete"
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

      <div style={styles.tooltip}>{tooltip.content}</div>
    </div>
  );
};

export default AddLocalSchedulePage;
