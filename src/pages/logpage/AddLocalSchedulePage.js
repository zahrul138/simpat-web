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

  // ====== FORM ATAS (INPUT HEADER BARU) ======
  const [selectedStockLevel, setSelectedStockLevel] = useState("M101 | SCN-MH");
  const [selectedModel, setSelectedModel] = useState("Veronicas");
  const [scheduleDate, setScheduleDate] = useState("");

  // emp_name user login (ambil dari auth_user di localStorage)
  const [currentEmpName, setCurrentEmpName] = useState("Unknown User");

  useEffect(() => {
    try {
      const u = getAuthUserLocal(); // baca dari localStorage.auth_user
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

      // optional: kalau mau dipakai di tempat lain juga sebagai string
      // localStorage.setItem("emp_name", name || "");
    } catch (err) {
      console.error("Failed reading auth_user from localStorage", err);
      setCurrentEmpName("Unknown User");
    }
  }, []);

  // ====== STATE LIST HEADER & VENDOR DRAFT ======
  // Multi header
  const [headerDrafts, setHeaderDrafts] = useState([]); // [{id, stockLevel, modelName, scheduleDate, uploadByName, createdAt}]
  // Vendor per header: { [headerId]: [ {trip_id, vendor_id, do_numbers[]} ] }
  const [vendorDraftsByHeader, setVendorDraftsByHeader] = useState({});
  const [expandedRows, setExpandedRows] = useState({}); // expand header row
  const [expandedVendorRows, setExpandedVendorRows] = useState({}); // expand vendor row (level 3)
  const [activeVendorContext, setActiveVendorContext] = useState(null);

  // header mana yang sedang ditambah vendor-nya (untuk popup)
  const [activeHeaderIdForVendorForm, setActiveHeaderIdForVendorForm] =
    useState(null);

  // master data
  const [tripOptions, setTripOptions] = useState([]);
  const [vendorOptions, setVendorOptions] = useState([]);

  // ====== POPUP VENDOR DETAIL (LEVEL 2) ======
  const [addVendorDetail, setAddVendorDetail] = useState(false);
  const [addVendorFormData, setAddVendorFormData] = useState({
    trip: "",
    vendor: "",
    doNumbers: [""],
    arrivalTime: "",
  });

  // ====== POPUP VENDOR PART DETAIL (LEVEL 3) – masih mock ======
  const [addVendorPartDetail, setAddVendorPartDetail] = useState(false);
  const [addVendorPartFormData, setAddVendorPartFormData] = useState({
    trip: "",
    vendor: "",
    doNumbers: [""],
    arrivalTime: "",
    parts: [], // Array of {doNumber, partCode, id}
  });

  // ========== INSERT HEADER (TAMBAH ROW BARU DI SCHEDULE LIST) ==========
  async function handleInsertSchedule() {
    try {
      if (!scheduleDate) {
        alert("Pilih Schedule Date dulu");
        return;
      }

      // Validasi FE: Tanggal harus LEBIH BESAR dari hari ini (bukan sama, bukan kurang)
      const sel = new Date(`${scheduleDate}T00:00:00`);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (!(sel instanceof Date) || Number.isNaN(sel.getTime())) {
        alert("Format Schedule Date tidak valid");
        return;
      }
      if (sel <= today) {
        alert("Schedule Date harus lebih besar dari hari ini");
        return;
      }

      // 🚫 CEK DUPLIKAT SCHEDULE DATE DI DATABASE
      const resp = await fetch(
        `${API_BASE}/api/local-schedules/check-date?scheduleDate=${scheduleDate}`
      );
      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.message || "Failed to check schedule date");
      }

      if (data.exists) {
        const [year, month, day] = scheduleDate.split("-");
        const formattedDate = `${day}/${month}/${year}`;

        alert(
          // `❌ Schedule Date ${formattedDate} sudah ada di database!\n\n` +
          //   `Detail Schedule yang sudah ada:\n` +
          //   `• Kode: ${data.schedule.schedule_code}\n` +
          //   `• Stock Level: ${data.schedule.stock_level}\n` +
          //   `• Model: ${data.schedule.model_name}\n\n` +
          //   `Silakan pilih tanggal lain.`
          'Schedule Date has been created. Try creating another Schedule Date.'
        );
        return;
      }

      // 🚫 CEK DUPLIKAT SCHEDULE DATE DI DRAFT
      const isDuplicateDate = headerDrafts.some(
        (hdr) => hdr.scheduleDate === scheduleDate
      );

      if (isDuplicateDate) {
        alert("Schedule Date has been created in draft, try make another");
        return;
      }

      // Jika tidak ada duplikat, buat draft baru
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
      setVendorDraftsByHeader((prev) => ({
        ...prev,
        [newId]: [],
      }));

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
        } else if (vendorsData && vendorsData.success && Array.isArray(vendorsData.data)) {
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
    setAddVendorFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddVendorSubmit = (e) => {
    e.preventDefault();

    if (!activeHeaderIdForVendorForm) {
      alert(
        "Header schedule tidak ditemukan. Klik tombol + pada schedule yang ingin ditambahkan vendor-nya."
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

  async function handleSubmitVendors() {
    try {
      if (!headerDrafts.length) {
        alert("Belum ada draft schedule. Klik Insert dulu.");
        return;
      }

      for (let i = 0; i < headerDrafts.length; i++) {
        const hdr = headerDrafts[i];

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
        if (!resp.ok) {
          throw new Error(
            `Gagal membuat schedule ke-${i + 1}: ${
              data.message || "Failed to create schedule"
            }`
          );
        }

        const scheduleId = data.schedule?.id;
        if (!scheduleId) {
          throw new Error(`Schedule ke-${i + 1}: Schedule ID tidak ditemukan`);
        }

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
          if (!resp2.ok) {
            throw new Error(
              `Gagal menyimpan vendor untuk schedule ke-${i + 1}: ${
                data2.message || "Failed to submit vendors"
              }`
            );
          }

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
              if (!resp3.ok) {
                throw new Error(
                  `Gagal menyimpan parts untuk vendor ke-${j + 1} schedule ke-${
                    i + 1
                  }: ${data3.message || "Failed to submit parts"}`
                );
              }
            }
          }
        }
      }

      alert("Semua schedule, vendor details, dan parts berhasil disimpan.");

      setHeaderDrafts([]);
      setVendorDraftsByHeader({});
      setExpandedRows({});
      setExpandedVendorRows({});
      navigate("/local-schedule");
    } catch (e) {
      alert("Error: " + e.message);
    }
  }

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
            if (key.startsWith(`${rowId}_vendor_`)) {
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

  const openVendorPartDetailPopup = (
    headerId,
    vendorIndex,
    vendorData,
    vendorLabel
  ) => {
    setActiveVendorContext({
      headerId,
      vendorIndex,
      vendorId: vendorData.vendor_id,
      vendorLabel,
      doNumbers: vendorData.do_numbers || [],
    });

    setAddVendorPartFormData({
      trip: "",
      vendor: vendorLabel,
      doNumbers:
        vendorData.do_numbers && vendorData.do_numbers.length
          ? [...vendorData.do_numbers]
          : [""],
      arrivalTime: "",
      parts: vendorData.parts ? [...vendorData.parts] : [],
    });

    setAddVendorPartDetail(true);
  };

  const handleDoNumberChange = (index, value) => {
    const updatedDoNumbers = [...addVendorFormData.doNumbers];
    updatedDoNumbers[index] = value;
    setAddVendorFormData((prev) => ({
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

  const handleAddVendorPartInputChange = (field, value) => {
    setAddVendorPartFormData((prev) => ({
      ...prev,
      [field]: value,
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

  const addVendorPartDoNumberField = () => {
    setAddVendorPartFormData((prev) => ({
      ...prev,
      doNumbers: [...prev.doNumbers, ""],
    }));
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

  const handleAddVendorPartSubmit = (e) => {
    e.preventDefault();

    if (!activeVendorContext) {
      alert("Vendor context tidak ditemukan.");
      return;
    }

    const { headerId, vendorIndex } = activeVendorContext;

    // Update parts di vendorDraftsByHeader
    setVendorDraftsByHeader((prev) => {
      const vendors = [...(prev[headerId] || [])];
      if (!vendors[vendorIndex]) return prev;

      vendors[vendorIndex] = {
        ...vendors[vendorIndex],
        parts: [...addVendorPartFormData.parts],
      };

      return {
        ...prev,
        [headerId]: vendors,
      };
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

    alert("Part details berhasil disimpan ke draft.");
  };

  const handleAddPart = async (rawPartCode) => {
    const partCode = String(rawPartCode || "").trim();
    if (!partCode) return;

    if (!activeVendorContext) {
      alert("Vendor context tidak ditemukan. Buka popup dari baris vendor.");
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

    try {
      const resp = await fetch(
        `${API_BASE}/api/kanban-master/by-part-code?part_code=${encodeURIComponent(
          partCode
        )}`
      );

      if (!resp.ok) {
        throw new Error("Gagal cek Part Code ke server.");
      }

      const json = await resp.json();
      const item = json.item || json.data || json;

      if (!item || !item.part_code) {
        alert("Part code tidak ditemukan di kanban_master.");
        return;
      }

      // Validasi vendor (opsional, bisa di-comment jika tidak diperlukan)
      if (
        activeVendorContext.vendorId &&
        item.vendor_id &&
        Number(item.vendor_id) !== Number(activeVendorContext.vendorId)
      ) {
        alert("Part code in another vendor.");
        return;
      }

      setAddVendorPartFormData((prev) => {
        const already = prev.parts?.some(
          (p) => String(p.partCode) === String(item.part_code)
        );
        if (already) {
          alert("Part code sudah ada di daftar.");
          return prev;
        }

        const newPart = {
          id: Date.now(),
          doNumber: availableDoNumbers[0],
          partCode: item.part_code,
          partName: item.part_name || "",
          qty: item.qty_unit ?? 0,
          qtyBox: item.qty_box ?? 0,
          unit: item.unit || "PCS",
        };

        return {
          ...prev,
          parts: [...(prev.parts || []), newPart],
        };
      });
    } catch (err) {
      console.error(err);
      alert(err.message || "Terjadi kesalahan saat cek Part Code.");
    }
  };

  const handleRemovePart = (partId) => {
    setAddVendorPartFormData((prev) => ({
      ...prev,
      parts: (prev.parts || []).filter((p) => p.id !== partId),
    }));
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

      return {
        ...prev,
        [headerId]: vendors,
      };
    });
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
      marginLeft: "45px",
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

  // ===================== RENDER =====================
  return (
    <div style={styles.pageContainer}>
      <div style={styles.welcomeCard}>
        <div style={styles.gridContainer}>
          {/* CARD ATAS: STOCK LEVEL CONFIGURATION */}
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

          {/* SCHEDULE LIST */}
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
                  <col style={{ width: "1.8%" }} />
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
                  {headerDrafts.length === 0 ? (
                    <tr>
                
                    </tr>
                  ) : (
                    headerDrafts.map((hdr, headerIndex) => {
                      const headerVendors = vendorDraftsByHeader[hdr.id] || [];

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

                          {/* Schedule Date -> format dd/mm/yyyy */}
                          <td style={styles.tdWithLeftBorder}>
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

                          <td style={styles.tdWithLeftBorder}>
                            {hdr.stockLevel}
                          </td>
                          <td style={styles.tdWithLeftBorder}>
                            {hdr.modelName}
                          </td>
                          <td style={styles.tdWithLeftBorder}>
                            {headerVendors.length}
                          </td>
                          <td style={styles.tdWithLeftBorder}>0</td>
                          <td style={styles.tdWithLeftBorder}>0</td>

                          {/* Upload By label: emp_name | yyyy/mm/dd hh:mm */}
                          <td style={styles.tdWithLeftBorder}>
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
                                setAddVendorDetail(true);
                              }}
                              title="Add Vendor Detail"
                            >
                              <Plus size={10} />
                            </button>
                            <button
                              style={styles.deleteButton}
                              onClick={() => {
                                const ok = window.confirm(
                                  "Delete this draft schedule?"
                                );
                                if (!ok) return;

                                // hapus header
                                setHeaderDrafts((prev) =>
                                  prev.filter((h) => h.id !== hdr.id)
                                );
                                // hapus vendor2 nya
                                setVendorDraftsByHeader((prev) => {
                                  const copy = { ...prev };
                                  delete copy[hdr.id];
                                  return copy;
                                });
                                // tutup expansion header
                                setExpandedRows((prev) => {
                                  const copy = { ...prev };
                                  delete copy[hdr.id];
                                  return copy;
                                });
                                // tutup semua expansion vendor di bawah header ini
                                setExpandedVendorRows((prev) => {
                                  const copy = { ...prev };
                                  Object.keys(copy).forEach((key) => {
                                    if (key.startsWith(`${hdr.id}_vendor_`)) {
                                      delete copy[key];
                                    }
                                  });
                                  return copy;
                                });
                              }}
                              title="Delete Schedule"
                            >
                              <Trash2 size={10} />
                            </button>
                          </td>
                        </tr>
                      );

                      // EXPANDED: VENDOR LIST (LEVEL 2) + LEVEL 3 DI BAWAH SETIAP ROW
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
                                  <col style={{ width: "6%" }} />
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
                                      Total Item
                                    </th>
                                    <th style={styles.expandedTh}>Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {headerVendors.length === 0 ? (
                                    <tr>
                                    </tr>
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
                                          <td style={styles.expandedTd}>
                                            {tripLabel}
                                          </td>
                                          <td style={styles.expandedTd}>
                                            {vendorLabel}
                                          </td>
                                          <td style={styles.expandedTd}>
                                            {doJoined}
                                          </td>
                                          <td style={styles.expandedTd}>
                                            {arrival}
                                          </td>
                                          <td style={styles.expandedTd}>0</td>
                                          <td style={styles.expandedTd}>0</td>
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
                                              title="Add Part Details"
                                            >
                                              <Plus size={10} />
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
                                                          >
                                                            {part.partCode}
                                                          </td>
                                                          <td
                                                            style={
                                                              styles.thirdLevelTd
                                                            }
                                                          >
                                                            {part.partName ||
                                                              "—"}
                                                          </td>
                                                          <td
                                                            style={
                                                              styles.thirdLevelTd
                                                            }
                                                          >
                                                            {part.qty ?? 0}
                                                          </td>
                                                          <td
                                                            style={
                                                              styles.thirdLevelTd
                                                            }
                                                          >
                                                            {part.qtyBox ?? 0}
                                                          </td>
                                                          <td
                                                            style={
                                                              styles.thirdLevelTd
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
                                                            >
                                                              <Pencil
                                                                size={10}
                                                              />
                                                            </button>
                                                            <button
                                                              style={
                                                                styles.deleteButton
                                                              }
                                                              onClick={() =>
                                                                handleRemoveVendorPart(
                                                                  hdr.id,
                                                                  idx,
                                                                  part.id
                                                                )
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
                                                    <tr>
                                                    </tr>
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

                      // gabungkan row header + row expanded (kalau ada)
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

          <div style={styles.saveConfiguration}>
            <button
              style={{ ...styles.button, ...styles.primaryButton }}
              onClick={handleSubmitVendors}
            >
              <Save size={16} />
              Input Schedule
            </button>
          </div>
        </div>
      </div>

      {/* POPUP ADD VENDOR DETAIL (LEVEL 2) */}
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
              {/* TRIP (from DB) */}
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

              {/* VENDOR (from DB) */}
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
              <div style={vendorDetailStyles.formGroup}>
                <label style={vendorDetailStyles.label}>Arrival Time:</label>
                <input
                  type="time"
                  value={(addVendorFormData.arrivalTime || "").slice(0, 5)}
                  readOnly
                  title="Auto-filled from selected trip (arv_to)"
                  style={vendorDetailStyles.timeInput}
                  required
                />
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

      {/* POPUP VENDOR PART DETAIL (LEVEL 3) */}
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
                      // SELALU tombol <button>, bukan icon <svg>
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

              {/* {addVendorPartFormData.parts.length > 0 && (
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
              )} */}

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
                          <th style={vendorPartStyles.th}></th>
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
                              colSpan="8"
                              style={{
                                ...vendorPartStyles.td,
                                textAlign: "center",
                              }}
                            >
                              Belum ada part di daftar (input Part Code lalu
                              klik Add).
                            </td>
                          </tr>
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
                              {/* No */}
                              <td style={vendorPartStyles.tdNumber}>
                                {index + 1}
                              </td>

                              {/* Checkbox */}
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

                              {/* Part Code */}
                              <td style={vendorPartStyles.td}>
                                {part.partCode}
                              </td>

                              {/* Part Name */}
                              <td style={vendorPartStyles.td}>
                                {part.partName || "—"}
                              </td>

                              {/* Qty (qty_unit) */}
                              <td style={vendorPartStyles.td}>
                                {part.qty ?? 0}
                              </td>

                              {/* Qty Box */}
                              <td style={vendorPartStyles.td}>
                                {part.qtyBox ?? 0}
                              </td>

                              {/* Unit */}
                              <td style={vendorPartStyles.td}>
                                {part.unit || "PCS"}
                              </td>

                              {/* Action */}
                              <td style={vendorPartStyles.td}>
                                <button
                                  style={vendorPartStyles.deleteButton}
                                  // nanti kalau mau edit qty, isi handler di sini
                                >
                                  <Pencil size={10} />
                                </button>
                                <button
                                  style={vendorPartStyles.deleteButton}
                                  onClick={() => handleRemovePart(part.id)}
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

export default AddLocalSchedulePage;
