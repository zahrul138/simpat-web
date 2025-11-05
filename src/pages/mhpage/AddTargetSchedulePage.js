"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Save, Trash2, Plus } from "lucide-react";
import { Helmet } from "react-helmet";
import { MdArrowRight, MdArrowDropDown } from "react-icons/md";

/** ========= FE CONFIG ========= **/
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";
const R_CAPACITY = 16; // kapasitas pallet R default
const CUSTOMER_CACHE_KEY = "customerMaster:v1";

// >>> NEW: centralize endpoints biar ga hard-code berserak
const API = {
  schedules: {
    base: "/api/production-schedules",
    create: () => "/api/production-schedules",
    detail: (id) => `/api/production-schedules/${id}`,
    list: (q) => `/api/production-schedules?${new URLSearchParams(q || {})}`,
  },
  customers: {
    activeMinimal: "/api/customers/active-minimal",
  },
};

// >>> NEW: tiny HTTP client (auto set token + JSON)
const http = async (path, { method = "GET", body, headers } = {}) => {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    const msg = data?.message || text || `HTTP ${res.status}`;
    const detail = data?.detail ? `\nDetail: ${data.detail}` : "";
    const err = new Error(`${msg}${detail}`);
    err.status = res.status;
    err.data = data;
    err.raw = text;
    throw err;
  }
  return data;
};

// >> Kontrol restore data lokal (biar tabel gak muncul sebelum Insert)
const RESTORE_FROM_LOCALSTORAGE = false;

// Safe reader untuk auth user tanpa import (biar gak ribet path)
const getAuthUserLocal = () => {
  try {
    return JSON.parse(localStorage.getItem("auth_user") || "null");
  } catch {
    return null;
  }
};

// Format YYYY-MM-DD -> DD/MM/YYYY
const toDDMMYYYY = (iso) => {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const nowHHmm = () => {
  const n = new Date();
  const hh = String(n.getHours()).padStart(2, "0");
  const mm = String(n.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

// ==== Helper buat ambil created_by (kalau ada di auth_user) ====
const getCreatorId = () => {
  try {
    const u = getAuthUserLocal();
    // ambil yang ada aja, tanpa hard-code
    return (
      u?.id || u?.emp_id || u?.employeeId || u?.employee_id || u?.userId || null
    );
  } catch {
    return null;
  }
};

// Pallet Type FE -> DB ("Pallet R"/"Pallet W" -> "R"/"W")
const toDbPalletType = (label) => {
  const s = String(label || "").toLowerCase();
  if (s.includes("pallet w") || s === "w") return "W";
  return "R";
};

const stripNullish = (obj) => {
  if (Array.isArray(obj)) return obj.map(stripNullish).filter((v) => v != null);
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => v != null)
        .map(([k, v]) => [k, stripNullish(v)])
    );
  }
  return obj;
};

const buildScheduleBody = (header) => {
  const creatorId = getCreatorId();
  const payload = {
    lineCode: header.line,
    shiftTime: header.shiftTime,
    targetDate: header.date,
  //  ...(creatorId ? { createdBy: String(creatorId) } : {}),
    ...(creatorId ? { createdBy: creatorId } : {}),
    details: (header.details || []).map((d, i) => ({
      customerName: d.customer || null,
      materialCode: d.materialCode || null,
      inputQuantity: Number(d.input) || 0,
      palletType: toDbPalletType(d.palletType),
      isAutoSplit: false,
      originalInput: null,
      sequenceNumber: i + 1,
      poNumber: (d.poNumber || "").trim() || null,
      palletStatus: "Pending",
      model: d.model || "Veronicas", // PASTIKAN ini dikirim
      description: d.description || "", // PASTIKAN ini dikirim
    })),
  };
  return stripNullish(payload);
};

// >>> UPDATED: POST satu header via http() + API map
const postOneSchedule = async (header) => {
  const token = localStorage.getItem("auth_token");
  if (!token) {
    throw new Error("Token login tidak ada. Silakan login ulang.");
  }
  const body = buildScheduleBody(header);
  console.log(
    "[POST] /api/production-schedules",
    JSON.stringify(body, null, 2)
  ); // Detailed log
  return http(API.schedules.create(), { method: "POST", body });
};

// Submit semua header yang dicentang (sekuensial biar error-nya ketahuan)
const submitSelectedHeadersToServer = async (headers) => {
  const results = [];
  for (const h of headers) {
    const r = await postOneSchedule(h);
    results.push({ header: h, response: r });
  }
  return results;
};

const AddTargetSchedulePage = () => {
  const navigate = useNavigate();

  /** ======== STATE EXISTING (style & UI dipertahankan) ======== **/
  const [isAdmin, setIsAdmin] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [navbarTotalHeight, setNavbarTotalHeight] = useState(60);
  const [selectedHeaderIds, setSelectedHeaderIds] = useState(new Set());

  // MAIN DATA: header schedules + details
  const [savedProductionSchedules, setSavedProductionSchedules] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});

  // Modal Add Customer Detail
  const [addCustomerDetail, setAddCustomerDetail] = useState(false);
  const [activeHeaderId, setActiveHeaderId] = useState(null);

  // Form modal (pakai key lama supaya tampilan/label tetap)
  const [addCustomerFormData, setAddCustomerFormData] = useState({
    partCode: "", // => Customer
    partName: "", // => Material Code
    model: "Veronicas", // tambahan: select model (Veronicas / Heracles)
    quantity: "", // => Input
    poNumber: "",
    description: "",
  });

  // Form header
  const [selectedShiftTime, setSelectedShiftTime] = useState("06:30 - 18:30");
  const [targetDateFrom, setTargetDateFrom] = useState("");
  const [creatorName, setCreatorName] = useState(() => {
    const u = getAuthUserLocal();
    return (
      u?.emp_name ||
      u?.employeeName ||
      u?.fullname ||
      u?.name ||
      u?.username ||
      "—"
    );
  });

  // Request date (display)
  const [currentDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  // Tooltip (dipertahankan)
  const [tooltip, setTooltip] = useState({
    visible: false,
    content: "",
    x: 0,
    y: 0,
  });

  const toggleHeaderCheckbox = (headerId, checked) => {
    setSelectedHeaderIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(headerId);
      else next.delete(headerId);
      return next;
    });
  };

  /** ======== MASTER CUSTOMER (ambil dari DB, cache, fallback dimatikan) ======== **/
  const [customerMap, setCustomerMap] = useState({});
  const [customerList, setCustomerList] = useState([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerError, setCustomerError] = useState(null);

  const buildCustomerMap = (rows) => {
    const map = {};
    rows.forEach((r) => {
      const name =
        r.cust_name ??
        r.cust ??
        r.customer ??
        r.custname ??
        r.customer_name ??
        r.name;
      if (!name) return;
      map[name] = {
        mat_code: r.mat_code ?? r.material_code ?? r.matCode ?? "",
        model_name: r.model_name ?? r.model ?? "",
        default_pallet_type: r.default_pallet_type ?? r.pallet_type ?? "R",
        pallet_capacity: Number(
          r.pallet_capacity ??
            r.capacity ??
            (r.default_pallet_type === "W" ? 32 : 16)
        ),
        min_pallet_w_quantity:
          r.min_pallet_w_quantity != null ? Number(r.min_pallet_w_quantity) : 5,
      };
    });
    return map;
  };

  const setFromMap = (map) => {
    setCustomerMap(map);
    const list = Object.keys(map).map((k) => ({ cust_name: k, ...map[k] }));
    setCustomerList(list);
  };

  // >>> UPDATED: pakai http() + API.customers.activeMinimal
  const loadCustomers = async () => {
    setCustomerLoading(true);
    setCustomerError(null);
    try {
      const rows = await http(API.customers.activeMinimal);
      if (!Array.isArray(rows)) throw new Error("Invalid payload");
      const map = buildCustomerMap(rows);
      if (Object.keys(map).length === 0) {
        throw new Error("Empty dataset");
      }
      // success -> set & cache
      setFromMap(map);
      localStorage.setItem(CUSTOMER_CACHE_KEY, JSON.stringify(map));
    } catch (err) {
      console.warn("[customers] load failed:", err);
      setCustomerMap({});
      setCustomerList([]);
      setCustomerError(
        err?.message === "Empty dataset"
          ? "Customer list kosong dari API."
          : "Gagal memuat customer."
      );
    } finally {
      setCustomerLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    // coba cache dulu (hanya dari hasil fetch sukses sebelumnya)
    const cached = localStorage.getItem(CUSTOMER_CACHE_KEY);
    if (cached) {
      try {
        const map = JSON.parse(cached);
        if (mounted && map && typeof map === "object") {
          setFromMap(map);
        }
      } catch {}
    }

    // selalu coba refresh dari API (biar up-to-date)
    loadCustomers();

    return () => {
      mounted = false;
    };
  }, []);

  /** ======== LOAD & TOAST ======== **/
  useEffect(() => {
    if (!RESTORE_FROM_LOCALSTORAGE) {
      localStorage.removeItem("productionSchedules");
      return;
    }
    const stored = localStorage.getItem("productionSchedules");
    if (stored) {
      try {
        setSavedProductionSchedules(JSON.parse(stored));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => {
      setToastMessage(null);
      setToastType(null);
    }, 3000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  /** ======== EXPAND / TOOLTIP (dipertahankan) ======== **/
  const toggleRowExpansion = (rowId) =>
    setExpandedRows((prev) => ({ ...prev, [rowId]: !prev[rowId] }));

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
            if (button.querySelector('[size="10"]')) content = "Add";
            else content = "Perluas/sembunyikan detail";
          }
        }
      }
    } else if (e.target.type === "checkbox") {
      content = "Pilih baris ini";
    } else if (e.target.tagName === "TD" || e.target.tagName === "TH") {
      content = e.target.textContent.trim() || "Informasi";
    }
    const rect = e.target.getBoundingClientRect();
    setTooltip({
      visible: true,
      content: content || "Informasi",
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
  };
  const hideTooltip = () => setTooltip((t) => ({ ...t, visible: false }));

  /** ======== INSERT HEADER (Create Schedule -> Insert) ======== **/
  const handleInsertHeader = () => {
    if (!targetDateFrom) {
      alert("Pilih Target Date dulu.");
      return;
    }

    // Request Date (today) vs Target Date
    const toYMD = (d) => {
      const yy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yy}-${mm}-${dd}`;
    };
    const todayStr = toYMD(new Date()); // "YYYY-MM-DD"
    const td = new Date(`${targetDateFrom}T00:00:00`);
    const ty = new Date(`${todayStr}T00:00:00`);

    // Block: targetDateFrom <= today
    if (td <= ty) {
      alert("Target Date harus lebih besar dari Request Date (hari ini).");
      return;
    }

    // Block: duplikat header (date+line+shift)
    const line = "B1";
    const exists = savedProductionSchedules.some(
      (h) =>
        h.date === targetDateFrom &&
        h.line === line &&
        h.shiftTime === selectedShiftTime
    );
    if (exists) {
      alert(
        `Header sudah ada untuk:\n- Tanggal: ${toDDMMYYYY(
          targetDateFrom
        )}\n- Line: ${line}\n- Shift: ${selectedShiftTime}`
      );
      return;
    }

    // OK → buat header lokal
    const id = Date.now();
    const creatorId = getCreatorId(); 
    const creatorName = getAuthUserLocal()?.emp_name || "Unknown";
    // const createdByDisplay = `${creatorName} | ${currentDate} ${nowHHmm()}`;
    const header = {
      id,
      date: targetDateFrom,
      line,
      shiftTime: selectedShiftTime,
      total_input: 0,
      total_customer: 0,
      total_model: 0,
      total_pallet: 0,
      // createdBy: createdByDisplay,
      createdBy: creatorId,
      createdByDisplay: `${creatorName} | ${currentDate} ${nowHHmm()}`,
      details: [],
    };

    const next = [...savedProductionSchedules, header];
    setSavedProductionSchedules(next);
    localStorage.setItem("productionSchedules", JSON.stringify(next));

    setToastMessage("Schedule header berhasil ditambahkan.");
    setToastType("success");

    // reset ringan
    handleAddClick();
  };

  /** ======== DELETE HEADER / DETAIL ======== **/
  const handleDeleteHeader = (id) => {
    const next = savedProductionSchedules.filter((h) => h.id !== id);
    setSavedProductionSchedules(next);
    localStorage.setItem("productionSchedules", JSON.stringify(next));
    setToastMessage("Schedule header dihapus.");
    setToastType("success");
  };

  const handleDeleteDetail = (headerId, idx) => {
    const hIdx = savedProductionSchedules.findIndex((h) => h.id === headerId);
    if (hIdx === -1) return;
    const header = { ...savedProductionSchedules[hIdx] };
    header.details = header.details.filter((_, i) => i !== idx);
    recalcHeaderTotals(header);
    const next = [...savedProductionSchedules];
    next[hIdx] = header;
    setSavedProductionSchedules(next);
    localStorage.setItem("productionSchedules", JSON.stringify(next));
  };

  /** ======== POPUP ADD CUSTOMER DETAIL ======== **/
  const openThirdLevelPopup = (headerId) => {
    setActiveHeaderId(headerId);
    setAddCustomerDetail(true);
  };

  const handleAddCustomerInputChange = (field, value) => {
    setAddCustomerFormData((prev) => {
      const updated = { ...prev };

      if (field === "partCode") {
        // partCode = Customer
        updated.partCode = value;
        const meta = (customerMap && customerMap[value]) || {};
        updated.partName = meta.mat_code || ""; // auto set material code
        return updated;
      }

      if (field === "partName") {
        updated.partName = value; // manual override
        return updated;
      }

      if (field === "model") {
        updated.model = value; // Veronicas / Heracles
        return updated;
      }

      if (field === "input") {
        updated.quantity = value; // map ke quantity agar tampilan form tetap
        return updated;
      }

      updated[field] = value; // poNumber / description
      return updated;
    });
  };

  const handleAddCustomerSubmit = (e) => {
    e.preventDefault();
    if (!activeHeaderId) return;

    const payload = {
      customer: addCustomerFormData.partCode,
      materialCode: addCustomerFormData.partName,
      model: addCustomerFormData.model || "Veronicas",
      input: Number(addCustomerFormData.quantity || 0),
      poNumber: addCustomerFormData.poNumber || "",
      description: addCustomerFormData.description || "",
    };

    if (!payload.customer) {
      alert("Pilih Customer terlebih dahulu.");
      return;
    }
    if (!payload.input || payload.input <= 0) {
      alert("Input harus lebih dari 0.");
      return;
    }

    const hIdx = savedProductionSchedules.findIndex(
      (h) => h.id === activeHeaderId
    );
    if (hIdx === -1) return;

    const header = {
      ...savedProductionSchedules[hIdx],
      details: [...(savedProductionSchedules[hIdx].details || [])],
    };

    // ✳️ Cek: PO duplikat untuk CUSTOMER yang sama (case-insensitive)
    const poKey = (payload.poNumber || "").trim().toLowerCase();
    if (poKey) {
      const already = header.details.some(
        (d) =>
          (d.customer || "").trim() === (payload.customer || "").trim() &&
          (d.poNumber || "").trim().toLowerCase() === poKey
      );
      if (already) {
        alert(
          `PO Number "${payload.poNumber}" sudah ada untuk customer "${payload.customer}".`
        );
        return; // stop submit
      }
    }

    // lanjut split & push
    pushGenericSplit(header, payload);
    recalcHeaderTotals(header);

    const next = [...savedProductionSchedules];
    next[hIdx] = header;
    setSavedProductionSchedules(next);
    localStorage.setItem("productionSchedules", JSON.stringify(next));

    setAddCustomerDetail(false);
    setAddCustomerFormData({
      partCode: "",
      partName: "",
      model: "Veronicas",
      quantity: "",
      poNumber: "",
      description: "",
    });
  };

  const handleInsertSchedule = async () => {
    // belum ada header sama sekali
    if (!savedProductionSchedules || savedProductionSchedules.length === 0) {
      alert(
        "Belum ada schedule yang dibuat. Klik Insert dulu untuk bikin header."
      );
      return;
    }

    // belum pilih (centang) header mana yang mau di-insert
    if (selectedHeaderIds.size === 0) {
      alert(
        "Pilih minimal 1 schedule (centang checkbox) sebelum Insert Schedule."
      );
      return;
    }

    // wajib punya detail
    const selected = [...selectedHeaderIds].map((id) =>
      savedProductionSchedules.find((x) => x.id === id)
    );
    const tanpaDetail = selected.filter(
      (h) => !h || !Array.isArray(h.details) || h.details.length === 0
    );
    if (tanpaDetail.length > 0) {
      alert(
        "Ada schedule yang belum punya detail. Tambahkan detail dulu sebelum Insert Schedule."
      );
      return;
    }

    // validasi Target Date > Request Date + tidak duplikat di lokal (safety FE)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const h of selected) {
      const td = new Date(`${h.date}T00:00:00`);
      if (td <= today) {
        alert(
          `Target Date ${toDDMMYYYY(
            h.date
          )} harus lebih besar dari Request Date (hari ini).`
        );
        return;
      }
      const dupeLocal = savedProductionSchedules.some(
        (x) =>
          x !== h &&
          x.date === h.date &&
          x.line === h.line &&
          x.shiftTime === h.shiftTime
      );
      if (dupeLocal) {
        alert(
          `Duplikat header lokal terdeteksi untuk ${toDDMMYYYY(h.date)} | ${
            h.line
          } | ${h.shiftTime}.`
        );
        return;
      }
    }

    try {
      // kirim ke server (sekuensial)
      const results = await submitSelectedHeadersToServer(selected);

      // Bersihkan yang sudah sukses dari state lokal
      const postedIds = new Set(selected.map((h) => h.id));
      const remaining = savedProductionSchedules.filter(
        (h) => !postedIds.has(h.id)
      );
      setSavedProductionSchedules(remaining);
      localStorage.setItem("productionSchedules", JSON.stringify(remaining));
      setSelectedHeaderIds(new Set());

      // info sukses
      const okList = results
        .map(
          (r) =>
            `• ${toDDMMYYYY(r.header.date)} | ${r.header.line} | ${
              r.header.shiftTime
            } → ${r.response.code}`
        )
        .join("\n");
      alert(`Berhasil menyimpan ke DB:\n${okList}`);
    } catch (err) {
      alert(err.message || "Gagal menyimpan schedule.");
    }
  };

  /** ======== SPLIT LOGIC (data-driven dari DB) ======== **/
  const pushGenericSplit = (header, payload) => {
    const meta = (customerMap && customerMap[payload.customer]) || {};
    const defType = meta.default_pallet_type || "R";
    const cap = Number(meta.pallet_capacity) || (defType === "W" ? 32 : 16);
    const minW = Number(meta.min_pallet_w_quantity ?? 5);

    const cloneRow = (overrides) => ({
      materialCode: payload.materialCode,
      customer: payload.customer,
      model: payload.model, // PASTIKAN model dikirim
      description: payload.description, // PASTIKAN description dikirim
      input: overrides.input,
      poNumber: payload.poNumber,
      palletType: overrides.palletType,
      palletUse: 1,
    });

    if (defType === "W") {
      const existed = header.details
        .filter(
          (d) =>
            d.customer === payload.customer &&
            d.poNumber === payload.poNumber &&
            d.palletType === "Pallet W"
        )
        .reduce((a, b) => a + (Number(b.input) || 0), 0);

      let remaining = Number(payload.input) || 0;

      if (existed === 0 && remaining <= cap) {
        if (remaining < minW) {
          header.details.push(
            cloneRow({ input: remaining, palletType: "Pallet R" })
          );
        } else {
          header.details.push(
            cloneRow({ input: remaining, palletType: "Pallet W" })
          );
        }
        return;
      }

      const roomW = Math.max(0, cap - existed);
      if (roomW > 0) {
        const chunk = Math.min(roomW, remaining);
        if (chunk > 0) {
          header.details.push(
            cloneRow({ input: chunk, palletType: "Pallet W" })
          );
          remaining -= chunk;
        }
      }

      while (remaining > 0) {
        if (remaining < minW) {
          header.details.push(
            cloneRow({ input: remaining, palletType: "Pallet R" })
          );
          remaining = 0;
        } else if (remaining <= cap) {
          header.details.push(
            cloneRow({ input: remaining, palletType: "Pallet W" })
          );
          remaining = 0;
        } else {
          header.details.push(cloneRow({ input: cap, palletType: "Pallet W" }));
          remaining -= cap;
        }
      }
    } else {
      // Default R: pecah per 16
      let remaining = Number(payload.input) || 0;
      while (remaining > 0) {
        const chunk = Math.min(R_CAPACITY, remaining);
        header.details.push(cloneRow({ input: chunk, palletType: "Pallet R" }));
        remaining -= chunk;
      }
    }
  };

  const recalcHeaderTotals = (header) => {
    const inputs = header.details.map((d) => Number(d.input) || 0);
    header.total_input = inputs.reduce((a, b) => a + b, 0);
    header.total_customer = new Set(header.details.map((d) => d.customer)).size;
    header.total_model = new Set(header.details.map((d) => d.model)).size;
    header.total_pallet = header.details.length;
  };

  /** ======== RESET BUTTON (dipertahankan perilakunya) ======== **/
  const handleAddClick = () => {
    setSelectedShiftTime("06:30 - 18:30");
    setTargetDateFrom("");
  };

  /** ======== STYLES (ASLI, JANGAN DIUBAH) ======== **/
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
      border: "1px solid #e5e7eb",
      padding: "32px",
    },
    card: {
      backgroundColor: "white",
      padding: "24px",
      borderRadius: "8px",
      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
      border: "1px solid #e5e7eb",
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
    title: { fontSize: "20px", fontWeight: "600", color: "#1f2937", margin: 0 },
    gridContainer: { display: "grid", gridTemplateColumns: "1fr", gap: "10px" },
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
      outline: "none",
      backgroundColor: "#f3f4f6",
      padding: "8px 12px",
      fontSize: "12px",
      alignItems: "center",
      color: "#374151",
      fontFamily: "inherit",
      margin: 0,
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
    primaryButton: { backgroundColor: "#2563eb", color: "white" },
    primaryButtonHover: { backgroundColor: "#1d4ed8" },
    actionButtonsGroup: {
      display: "flex",
      gap: "8px",
      marginBottom: "10px",
      marginTop: "10px",
    },
    sectionDivider: { paddingTop: "16px", marginTop: "16px" },
    verticalDivider: {
      width: "1px",
      backgroundColor: "#e5e7eb",
      margin: "0 8px",
    },
    toastContainer: {
      position: "fixed",
      bottom: "16px",
      right: "16px",
      padding: "16px",
      borderRadius: "6px",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      color: "white",
      zIndex: 1000,
    },
    toastSuccess: { backgroundColor: "#22c55e" },
    toastError: { backgroundColor: "#ef4444" },
    dateRangeGroup: { display: "flex", alignItems: "center", gap: "16px" },
    dateInput: { width: "7rem" },
    emptyColumn: {
      width: "auto",
      minWidth: "auto",
      maxWidth: "auto",
      padding: "0",
      textAlign: "center",
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
    table: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" },
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
      marginLeft: "68.5px",
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
      backgroundColor: "white",
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
    arrowIcon: { fontSize: "25px", color: "#9fa8da" },
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
  };

  const customerDetailStyles = {
    popupOverlay: {
      position: "fixed",
      top: 130,
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
    form: { marginTop: "16px" },
    formGroup: { marginBottom: "16px" },
    label: { display: "block", marginBottom: "4px", fontWeight: "500" },
    select: {
      width: "100%",
      padding: "8px",
      border: "1px solid #d1d5db",
      backgroundColor: "#f3f4f6",
      borderRadius: "4px",
    },
    input: {
      width: "97%",
      padding: "8px",
      border: "1px solid #d1d5db",
      backgroundColor: "#f3f4f6",
      borderRadius: "4px",
    },
    buttonGroup: {
      display: "flex",
      gap: "8px",
      justifyContent: "flex-end",
      marginTop: "20px",
    },
    cancelButton: {
      padding: "8px 16px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      background: "white",
      color: "#374151",
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

  const handleButtonHover = (e, isHover, type) => {
    if (type === "search") {
      e.target.style.backgroundColor = isHover ? "#1d4ed8" : "#2563eb";
    } else if (type === "pagination") {
      e.target.style.backgroundColor = isHover ? "#2563eb" : "transparent";
      e.target.style.color = isHover ? "white" : "#374151";
    }
  };

  const handleTabHover = (e, isHover, isActive) => {
    if (!isActive) {
      e.target.style.color = isHover
        ? styles.tabButtonHover?.color || "#2563eb"
        : styles.tabButton?.color || "#6b7280";
    }
  };

  /** ====================== RENDER ====================== **/
  return (
    <div style={styles.pageContainer}>
      <div>
        <Helmet>
          <title>Production | Target Schedule/Add</title>
        </Helmet>
      </div>
      <div style={styles.welcomeCard}>
        <div style={styles.gridContainer}>
          {/* ====== Create Schedule Card ====== */}
          <div style={styles.card}>
            <div style={{ marginBottom: "24px" }}>
              <h1 style={styles.title}>Create Schedule</h1>
            </div>
            <div style={{ display: "flex" }}>
              <div style={{ flex: "1", display: "grid", gap: "20px" }}>
                <div>
                  {/* A11y fix: pair label + input */}
                  <label htmlFor="targetDate" style={styles.label}>
                    Target Date
                  </label>
                  <div style={styles.dateRangeGroup}>
                    <input
                      id="targetDate"
                      type="date"
                      style={{ ...styles.input, ...styles.dateInput }}
                      value={targetDateFrom}
                      onChange={(e) => setTargetDateFrom(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="shiftTime" style={styles.label}>
                    Shift Time
                  </label>
                  <select
                    id="shiftTime"
                    style={styles.select}
                    value={selectedShiftTime}
                    onChange={(e) => setSelectedShiftTime(e.target.value)}
                  >
                    <option value="06:30 - 15:30">06:30 - 15:30</option>
                    <option value="06:30 - 15:45">06:30 - 15:45</option>
                    <option value="06:30 - 18:30">06:30 - 18:30</option>
                  </select>
                </div>
                <div style={styles.actionButtonsGroup}>
                  <button
                    style={{ ...styles.button, ...styles.primaryButton }}
                    onMouseEnter={(e) => handleButtonHover(e, true, "search")}
                    onMouseLeave={(e) => handleButtonHover(e, false, "search")}
                    onClick={handleInsertHeader}
                  >
                    <Plus size={16} />
                    Insert
                  </button>
                </div>
              </div>
              <div
                style={{
                  flex: "2",
                  display: "grid",
                  gap: "20px",
                  paddingBottom: "70px",
                }}
              >
                <div>
                  {/* A11y fix: ini display doang, jangan pakai <label> */}
                  <div style={styles.label}>Request Date</div>
                  <p style={styles.dateDisplay}>{currentDate}</p>
                </div>
                <div>
                  <label htmlFor="createBy" style={styles.label}>
                    Create By
                  </label>
                  <select
                    id="createBy"
                    style={styles.select}
                    value={creatorName}
                    onChange={(e) => setCreatorName(e.target.value)}
                  >
                    <option value={creatorName}>{creatorName}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ====== Schedule List Table ====== */}
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
                  <col style={{ width: "25px" }} />
                  <col style={{ width: "3.3%" }} />
                  <col style={{ width: "23px" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "25%" }} />
                  <col style={{ width: "12%" }} />
                </colgroup>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.expandedTh}>No</th>
                    <th style={styles.thWithLeftBorder}></th>
                    <th style={styles.thWithLeftBorder}></th>
                    <th style={styles.thWithLeftBorder}>Date</th>
                    <th style={styles.thWithLeftBorder}>Line</th>
                    <th style={styles.thWithLeftBorder}>Shift Time</th>
                    <th style={styles.thWithLeftBorder}>Total Input</th>
                    <th style={styles.thWithLeftBorder}>Total Customer</th>
                    <th style={styles.thWithLeftBorder}>Total Model</th>
                    <th style={styles.thWithLeftBorder}>Total Pallet</th>
                    <th style={styles.thWithLeftBorder}>Created By</th>
                    <th style={styles.thWithLeftBorder}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {savedProductionSchedules.length === 0 ? (
                    <tr>
                      <td
                        colSpan="12"
                        style={{
                          ...styles.tdWithLeftBorder,
                          textAlign: "center",
                          color: "#9ca3af",
                        }}
                      >
                        No schedules yet — click Insert to create one.
                      </td>
                    </tr>
                  ) : (
                    savedProductionSchedules.map((h, idx) => (
                      <FragmentLike key={h.id}>
                        <tr
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
                            {idx + 1}
                          </td>
                          <td style={styles.tdWithLeftBorder}>
                            <input
                              type="checkbox"
                              checked={selectedHeaderIds.has(h.id)}
                              onChange={(e) =>
                                toggleHeaderCheckbox(h.id, e.target.checked)
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
                              onClick={() => toggleRowExpansion(h.id)}
                            >
                              {expandedRows[h.id] ? (
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
                            {toDDMMYYYY(h.date)}
                          </td>
                          <td
                            style={styles.tdWithLeftBorder}
                            onMouseEnter={showTooltip}
                            onMouseLeave={hideTooltip}
                          >
                            {h.line}
                          </td>
                          <td
                            style={styles.tdWithLeftBorder}
                            onMouseEnter={showTooltip}
                            onMouseLeave={hideTooltip}
                          >
                            {h.shiftTime}
                          </td>
                          <td
                            style={styles.tdWithLeftBorder}
                            onMouseEnter={showTooltip}
                            onMouseLeave={hideTooltip}
                          >
                            {h.total_input || 0}
                          </td>
                          <td
                            style={styles.tdWithLeftBorder}
                            onMouseEnter={showTooltip}
                            onMouseLeave={hideTooltip}
                          >
                            {h.total_customer || 0}
                          </td>
                          <td
                            style={styles.tdWithLeftBorder}
                            onMouseEnter={showTooltip}
                            onMouseLeave={hideTooltip}
                          >
                            {h.total_model || 0}
                          </td>
                          <td
                            style={styles.tdWithLeftBorder}
                            onMouseEnter={showTooltip}
                            onMouseLeave={hideTooltip}
                          >
                            {h.total_pallet || 0}
                          </td>
                          <td
                            style={styles.tdWithLeftBorder}
                            onMouseEnter={showTooltip}
                            onMouseLeave={hideTooltip}
                          >
                            {/* {h.createdBy} */}
                            {h.createdByDisplay || h.createdBy}
                          </td>
                          <td style={styles.tdWithLeftBorder}>
                            <button
                              style={styles.addButton}
                              onClick={() => openThirdLevelPopup(h.id)}
                              onMouseEnter={showTooltip}
                              onMouseLeave={hideTooltip}
                            >
                              <Plus size={10} />
                            </button>
                            <button
                              style={styles.deleteButton}
                              onClick={() => handleDeleteHeader(h.id)}
                              onMouseEnter={showTooltip}
                              onMouseLeave={hideTooltip}
                            >
                              <Trash2 size={10} />
                            </button>
                          </td>
                        </tr>

                        {expandedRows[h.id] && (
                          <tr>
                            <td
                              colSpan="11"
                              style={{ padding: 0, border: "none" }}
                            >
                              <div style={styles.expandedTableContainer}>
                                <table style={styles.expandedTable}>
                                  <colgroup>
                                    <col style={{ width: "25px" }} />
                                    <col style={{ width: "15%" }} />
                                    <col style={{ width: "15%" }} />
                                    <col style={{ width: "15%" }} />
                                    <col style={{ width: "20%" }} />
                                    <col style={{ width: "10%" }} />
                                    <col style={{ width: "15%" }} />
                                    <col style={{ width: "15%" }} />
                                    <col style={{ width: "10%" }} />
                                    <col style={{ width: "7%" }} />
                                  </colgroup>
                                  <thead>
                                    <tr style={styles.expandedTableHeader}>
                                      <th style={styles.expandedTh}>No</th>
                                      <th style={styles.expandedTh}>
                                        Material Code
                                      </th>
                                      <th style={styles.expandedTh}>
                                        Customer
                                      </th>
                                      <th style={styles.expandedTh}>Model</th>
                                      <th style={styles.expandedTh}>
                                        Description
                                      </th>
                                      <th style={styles.expandedTh}>Input</th>
                                      <th style={styles.expandedTh}>
                                        PO Number
                                      </th>
                                      <th style={styles.expandedTh}>
                                        Pallet Type
                                      </th>
                                      <th style={styles.expandedTh}>
                                        Pallet Use
                                      </th>
                                      <th style={styles.expandedTh}>Action</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(!h.details || h.details.length === 0) && (
                                      <tr>
                                        <td
                                          colSpan="10"
                                          style={{
                                            ...styles.expandedTd,
                                            textAlign: "center",
                                          }}
                                        >
                                          Details not yet added.
                                        </td>
                                      </tr>
                                    )}
                                    {h.details?.map((d, i) => (
                                      <tr
                                        key={`${h.id}-${i}`}
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
                                          {i + 1}
                                        </td>
                                        <td style={styles.expandedTd}>
                                          {d.materialCode}
                                        </td>
                                        <td style={styles.expandedTd}>
                                          {d.customer}
                                        </td>
                                        <td style={styles.expandedTd}>
                                          {d.model}
                                        </td>
                                        <td style={styles.expandedTd}>
                                          {d.description}
                                        </td>
                                        <td style={styles.expandedTd}>
                                          {d.input}
                                        </td>
                                        <td style={styles.expandedTd}>
                                          {d.poNumber}
                                        </td>
                                        <td style={styles.expandedTd}>
                                          {d.palletType}
                                        </td>
                                        <td style={styles.expandedTd}>
                                          {d.palletUse}
                                        </td>
                                        <td style={styles.expandedTd}>
                                          <button
                                            style={styles.deleteButton}
                                            onClick={() =>
                                              handleDeleteDetail(h.id, i)
                                            }
                                          >
                                            <Trash2 size={10} />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </FragmentLike>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination (dummy, dipertahankan) */}
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
        </div>

        <div style={styles.saveConfiguration}>
          <button
            style={{ ...styles.button, ...styles.primaryButton }}
            onMouseEnter={(e) => handleButtonHover(e, true, "search")}
            onMouseLeave={(e) => handleButtonHover(e, false, "search")}
            onClick={handleInsertSchedule}
          >
            <Save size={16} />
            Insert Schedule
          </button>
        </div>
      </div>

      {/* ====== POPUP ADD CUSTOMER DETAIL ====== */}
      {addCustomerDetail && (
        <div style={customerDetailStyles.popupOverlay}>
          <div style={customerDetailStyles.popupContainer}>
            <div style={customerDetailStyles.popupHeader}>
              <h3 style={customerDetailStyles.popupTitle}>
                Add Customer Detail
              </h3>
              <div>
                {/* Reload tanpa ubah style global */}
                <button
                  type="button"
                  onClick={loadCustomers}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "#3b82f6",
                    fontWeight: 600,
                  }}
                  title="Reload customers"
                >
                  ↻ Reload
                </button>
                <button
                  style={customerDetailStyles.closeButton}
                  onClick={() => setAddCustomerDetail(false)}
                >
                  ×
                </button>
              </div>
            </div>
            <form
              onSubmit={handleAddCustomerSubmit}
              style={customerDetailStyles.form}
            >
              <div style={customerDetailStyles.formGroup}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <label style={customerDetailStyles.label}>Customer:</label>
                  {customerLoading && (
                    <span style={{ fontSize: 12, color: "#6b7280" }}>
                      Loading…
                    </span>
                  )}
                  {!customerLoading && customerError && (
                    <span style={{ fontSize: 12, color: "#ef4444" }}>
                      {customerError}
                    </span>
                  )}
                </div>
                <select
                  value={addCustomerFormData.partCode}
                  onChange={(e) =>
                    handleAddCustomerInputChange("partCode", e.target.value)
                  }
                  style={customerDetailStyles.select}
                  required
                  disabled={
                    customerLoading ||
                    (!!customerError && customerList.length === 0)
                  }
                >
                  {customerLoading ? (
                    <option value="">Loading…</option>
                  ) : customerError && customerList.length === 0 ? (
                    <option value="">Failed to load customers</option>
                  ) : (
                    <>
                      <option value="">Select Customer</option>
                      {customerList.map((c) => (
                        <option key={c.cust_name} value={c.cust_name}>
                          {c.cust_name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              <div style={customerDetailStyles.formGroup}>
                <label style={customerDetailStyles.label}>Material Code:</label>
                <input
                  type="text"
                  value={addCustomerFormData.partName}
                  onChange={(e) =>
                    handleAddCustomerInputChange("partName", e.target.value)
                  }
                  placeholder="Material code will be set automatically"
                  style={customerDetailStyles.input}
                />
              </div>

              {/* Tambahan: Model select (Veronicas / Heracles) */}
              <div style={customerDetailStyles.formGroup}>
                <label style={customerDetailStyles.label}>Model:</label>
                <select
                  value={addCustomerFormData.model}
                  onChange={(e) =>
                    handleAddCustomerInputChange("model", e.target.value)
                  }
                  style={customerDetailStyles.select}
                >
                  <option value="Veronicas">Veronicas</option>
                  <option value="Heracles">Heracles</option>
                </select>
              </div>

              <div style={customerDetailStyles.formGroup}>
                <label style={customerDetailStyles.label}>Input:</label>
                <input
                  type="number"
                  value={addCustomerFormData.quantity}
                  onChange={(e) =>
                    handleAddCustomerInputChange("input", e.target.value)
                  }
                  placeholder="Enter Input"
                  style={customerDetailStyles.input}
                  required
                />
              </div>

              <div style={customerDetailStyles.formGroup}>
                <label style={customerDetailStyles.label}>PO Number:</label>
                <input
                  type="text"
                  value={addCustomerFormData.poNumber || ""}
                  onChange={(e) =>
                    handleAddCustomerInputChange("poNumber", e.target.value)
                  }
                  placeholder="Enter PO number"
                  style={customerDetailStyles.input}
                />
              </div>

              <div style={customerDetailStyles.formGroup}>
                <label style={customerDetailStyles.label}>Description:</label>
                <input
                  type="text"
                  value={addCustomerFormData.description || ""}
                  onChange={(e) =>
                    handleAddCustomerInputChange("description", e.target.value)
                  }
                  placeholder="Enter description"
                  style={customerDetailStyles.input}
                />
              </div>

              <div style={customerDetailStyles.buttonGroup}>
                <button
                  type="button"
                  onClick={() => setAddCustomerDetail(false)}
                  style={customerDetailStyles.cancelButton}
                >
                  Cancel
                </button>
                <button type="submit" style={customerDetailStyles.submitButton}>
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tooltip */}
      <div style={styles.tooltip}>{tooltip.content}</div>
    </div>
  );
};

/** Helper mini utk fragment tanpa import React.Fragment */
const FragmentLike = ({ children }) => children;

export default AddTargetSchedulePage;
