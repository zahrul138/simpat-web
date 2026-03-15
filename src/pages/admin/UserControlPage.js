"use client";

import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Plus, Trash2, Pencil, Edit, Eye, EyeOff, Save, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { getToken, clearAuth, getUser } from "../../utils/auth";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";
const PAGE_SIZE = 10;

const UserControlPage = () => {
  const navigate  = useNavigate();
  const location   = useLocation();
  const loggedInId = getUser()?.id;
  const [users, setUsers] = useState([]);
  const [filterKeyword, setFilterKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [tooltip, setTooltip] = useState({
    visible: false,
    content: "",
    x: 0,
    y: 0,
  });

  const [detailModal, setDetailModal] = useState({
    visible: false,
    user: null,
  });
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState(
    location.state?.tab || "Active"
  );

  // ===== Helpers =====
  const getRoleByDepartment = (department) =>
    department === "ADMIN" ? "Admin" : "User";

  const formatDateTime = (dt) => {
    if (!dt) return "-";
    const d = new Date(dt);
    if (isNaN(d.getTime())) return dt;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${day} ${hh}.${mm}`;
  };

  const uploadByText = (u) => {
    const who = u.updatedBy || u.createdBy || "SYSTEM";
    const when = formatDateTime(u.updatedDate || u.updatedAt || u.createdDate);
    return `${who} | ${when}`;
  };

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch(`${API_BASE}/users`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await r.json();
        if (!r.ok) {
          alert(data?.error || "Failed to load users");
          setUsers([]);
          return;
        }
        setUsers(Array.isArray(data) ? data : []);
      } catch {
        alert("Network error, please try again");
        setUsers([]);
      }
    };
    load();
  }, []);

  const filteredUsers = useMemo(() => {
    let filtered = users.filter((u) => {
      const kw = filterKeyword.toLowerCase();
      const matchesKeyword =
        !filterKeyword ||
        u.name?.toLowerCase().includes(kw) ||
        u.username?.toLowerCase().includes(kw) ||
        u.idCard?.toLowerCase().includes(kw);
      const matchesRole = roleFilter === "All" || u.role === roleFilter;
      const matchesStatus = statusFilter === "All" || u.status === statusFilter;
      return matchesKeyword && matchesRole && matchesStatus;
    });

    if (activeTab === "Active")
      filtered = filtered.filter((u) => u.status === "Active");
    if (activeTab === "In-Active")
      filtered = filtered.filter((u) => u.status === "Inactive");
    return filtered;
  }, [users, filterKeyword, roleFilter, statusFilter, activeTab]);

  const activeCount = filteredUsers.filter((u) => u.status === "Active").length;
  const inactiveCount = filteredUsers.filter(
    (u) => u.status === "Inactive"
  ).length;

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE)),
    [filteredUsers.length]
  );

  const pageUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterKeyword, roleFilter, statusFilter, activeTab]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const showTooltip = (e) => {
    let content = "";
    if (e.target.tagName === "BUTTON" || e.target.closest("button")) {
      const button =
        e.target.tagName === "BUTTON" ? e.target : e.target.closest("button");
      if (button.title) content = button.title;
      else content = "Action";
    } else if (e.target.tagName === "TD" || e.target.tagName === "TH") {
      content = e.target.textContent.trim() || "Info";
    }
    const rect = e.target.getBoundingClientRect();
    setTooltip({
      visible: true,
      content,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
  };
  const hideTooltip = () => setTooltip((t) => ({ ...t, visible: false }));

  const handleButtonHover = (e, isHover) => {
    e.currentTarget.style.backgroundColor = isHover ? "#1d4ed8" : "#2563eb";
  };
  const handleTabHover = (e, isHover, isActive) => {
    if (!isActive) e.target.style.color = isHover ? "#2563eb" : "#6b7280";
  };
  const handleInputFocus = (e) => (e.target.style.borderColor = "#9fa8da");
  const handleInputBlur = (e) => (e.target.style.borderColor = "#d1d5db");

  // ===== API actions =====
  const openDetailModal = (user) => {
    setDetailModal({ visible: true, user });
    setEditMode(false);
    setShowPassword(false);
    setEditForm({
      ...user,
      role: user.department === "ADMIN" ? "Admin" : "User",
    });
  };

  const closeDetailModal = () => {
    setDetailModal({ visible: false, user: null });
    setEditMode(false);
    setShowPassword(false);
  };

  const toggleEditMode = () => setEditMode((v) => !v);

  const saveEditedUser = async () => {
    try {
      const payload = {
        idCard: editForm.idCard,
        name: editForm.name,
        username: editForm.username,
        password: editForm.password,
        department: editForm.department,
        role: editForm.role,
        status: editForm.status,
      };
      const r = await fetch(`${API_BASE}/users/${editForm.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        alert(data?.error || "Failed to update user");
        return;
      }
      const nowStr = new Date().toISOString();
      const updater = JSON.parse(sessionStorage.getItem("auth_user") || "null")?.emp_name || "SYSTEM";
      const withMeta = { ...payload, updatedBy: updater, updatedDate: nowStr };
      setUsers((prev) =>
        prev.map((u) => (u.id === editForm.id ? { ...u, ...withMeta } : u))
      );
      setDetailModal((prev) => ({
        ...prev,
        user: { ...prev.user, ...withMeta },
      }));
      setEditMode(false);
      // ── Kick out jika akun sendiri di-set Inactive via modal edit ──
      if (payload.status === "Inactive" && editForm.id === loggedInId) {
        clearAuth();
        navigate("/login");
        return;
      }
      alert("User updated successfully!");
    } catch {
      alert("Network error, please try again");
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      const r = await fetch(`${API_BASE}/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        alert(data?.error || "Failed to delete user");
        return;
      }
      setUsers((prev) => prev.filter((x) => x.id !== id));
    } catch {
      alert("Network error, please try again");
    }
  };

  const toggleUserStatus = async (userId) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    const nextStatus = target.status === "Active" ? "Inactive" : "Active";
    try {
      const r = await fetch(`${API_BASE}/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        alert(data?.error || "Failed to change status");
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: nextStatus } : u))
      );
      setDetailModal((prev) =>
        prev.user && prev.user.id === userId
          ? { ...prev, user: { ...prev.user, status: nextStatus } }
          : prev
      );
      // ── Kick out jika user yang di-deactivate adalah yang sedang login ──
      if (nextStatus === "Inactive" && userId === loggedInId) {
        clearAuth();
        navigate("/login");
      }
    } catch {
      alert("Network error, please try again");
    }
  };

  const handleEditChange = (field, value) => {
    if (field === "department") {
      const role = value === "ADMIN" ? "Admin" : "User";
      setEditForm((prev) => ({ ...prev, department: value, role }));
    } else if (field === "name") {
      const upper = (value || "").toUpperCase();
      setEditForm((prev) => ({ ...prev, name: upper }));
    } else {
      setEditForm((prev) => ({ ...prev, [field]: value }));
    }
  };

  const disabledStyle = { opacity: 0.5, cursor: "not-allowed" };
  const goFirst = () => setCurrentPage(1);
  const goPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));
  const goLast = () => setCurrentPage(totalPages);

  const onPageInputChange = (e) => {
    const onlyDigits = e.target.value.replace(/\D/g, "");
    const num = onlyDigits === "" ? 1 : parseInt(onlyDigits, 10);
    setCurrentPage(Math.min(Math.max(1, num), totalPages));
  };

  // ===== Styles =====
  const modalOverlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    display: detailModal.visible ? "flex" : "none",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
  };
  const modalContentStyle = {
    backgroundColor: "white",
    borderRadius: "8px",
    width: "500px",
    maxWidth: "95vw",
    maxHeight: "92vh",
    overflowY: "auto",
    boxShadow: "0 8px 32px rgba(99, 102, 241, 0.18), 0 2px 8px rgba(0,0,0,0.12)",
    border: "1.5px solid #9fa8da",
  };
  const passwordInputWrapper = {
    display: "flex",
    alignItems: "center",
    position: "relative",
    width: "70%",
  };
  const passwordEyeButton = {
    position: "absolute",
    right: "8px",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px 8px",
    color: "#6b7280",
    fontSize: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
  const modalSelectInput = {
    width: "75%",
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    fontSize: "12px",
    fontFamily: "inherit",
    outline: "none",
    backgroundColor: "white",
    cursor: "pointer",
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
    title: { fontSize: "20px", fontWeight: "600", color: "#1f2937", margin: 0 },
    filterRow: {
      display: "grid",
      alignItems: "center",
      gap: "12px",
      marginBottom: "16px",
    },
    inputGroup: { display: "flex", alignItems: "center", gap: "8px" },
    label: { fontSize: "12px", color: "#374151", fontWeight: "500" },
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
      backgroundColor: "#e0e7ff",
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
    statusButton: {
      backgroundColor: "#e0e7ff",
      color: "black",
      padding: "2px 6px",
      fontSize: "10px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      marginLeft: "4px",
    },
    tooltip: {
      position: "fixed",
      top: tooltip.y,
      left: tooltip.x,
      backgroundColor: "rgba(0,0,0,0.8)",
      color: "#fff",
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
      boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
    },
    modalOverlay: modalOverlayStyle,
    modalContent: modalContentStyle,
    modalHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: "#e0e7ff",
      borderBottom: "1.5px solid #9fa8da",
      padding: "12px 20px",
      borderRadius: "6px 6px 0 0",
    },
    modalHeaderTitle: {
      fontSize: "14px",
      fontWeight: "700",
      color: "#374151",
      margin: 0,
      letterSpacing: "0.01em",
    },
    modalCloseBtn: {
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
    modalBody: {
      padding: "18px 20px 4px 20px",
    },
    modalSectionTitle: {
      fontSize: "11px",
      fontWeight: "700",
      color: "#2563eb",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      marginBottom: "10px",
      paddingBottom: "5px",
      borderBottom: "1px solid #e0e7ff",
    },
    modalField: {
      display: "grid",
      gridTemplateColumns: "115px 1fr",
      alignItems: "center",
      marginBottom: "9px",
      gap: "8px",
    },
    modalLabel: {
      fontSize: "11px",
      fontWeight: "600",
      color: "#4b5563",
    },
    modalValue: {
      fontSize: "12px",
      color: "#374151",
      padding: "0 8px",
      height: "30px",
      lineHeight: "30px",
      backgroundColor: "#f9fafb",
      borderRadius: "4px",
      border: "1px solid #9fa8da",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    modalInput: {
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
    modalFooter: {
      display: "flex",
      justifyContent: "flex-end",
      gap: "8px",
      padding: "12px 20px",
      backgroundColor: "#e0e7ff",
      borderTop: "1.5px solid #9fa8da",
      borderRadius: "0 0 6px 6px",
      marginTop: "16px",
    },
    saveButton: {
      backgroundColor: "#10b981",
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
    editButtonModal: {
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
    cancelButton: {
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
    roleInfo: {
      marginTop: "4px",
      fontSize: "10px",
      color: "#6b7280",
      fontStyle: "italic",
    },
  };

  return (
    <div style={styles.pageContainer}>
      <Helmet>
        <title>Management Control | Manage User</title>
      </Helmet>

      <div style={styles.welcomeCard}>
        <div style={styles.combinedHeaderFilter}>
          <div style={styles.headerRow}>
            <h1 style={styles.title}>Manage User</h1>
          </div>

          <div style={styles.filterRow}>
            <div style={styles.inputGroup}>
              <span style={styles.label}>Search By</span>
              <select
                style={styles.select}
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              >
                <option value="All">All Roles</option>
                <option value="User">User</option>
                <option value="Admin">Admin</option>
              </select>
              <select
                style={styles.select}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <input
                type="text"
                style={styles.input}
                placeholder="Search by name, username, or ID card"
                value={filterKeyword}
                onChange={(e) => setFilterKeyword(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
              <button
                style={styles.button}
                onMouseEnter={(e) => handleButtonHover(e, true)}
                onMouseLeave={(e) => handleButtonHover(e, false)}
              >
                Search
              </button>
            </div>
          </div>
        </div>

        <div style={styles.actionButtonsGroup}>
          <button
            style={{
              ...styles.button,
              backgroundColor: "#2563eb",
              color: "white",
            }}
            onMouseEnter={(e) => handleButtonHover(e, true)}
            onMouseLeave={(e) => handleButtonHover(e, false)}
            onClick={() => navigate("/create-user")}
          >
            <Plus size={16} />
            Create New User
          </button>
        </div>

        <div style={styles.tabsContainer}>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "Active" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("Active")}
            onMouseEnter={(e) =>
              handleTabHover(e, true, activeTab === "Active")
            }
            onMouseLeave={(e) =>
              handleTabHover(e, false, activeTab === "Active")
            }
          >
            Active 
          </button>

          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === "In-Active" && styles.tabButtonActive),
            }}
            onClick={() => setActiveTab("In-Active")}
            onMouseEnter={(e) =>
              handleTabHover(e, true, activeTab === "In-Active")
            }
            onMouseLeave={(e) =>
              handleTabHover(e, false, activeTab === "In-Active")
            }
          >
            In-Active
          </button>
        </div>

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
                <col style={{ width: "27px" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "25%" }} />
                <col style={{ width: "6%" }} />
              </colgroup>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.thWithLeftBorder}>No</th>
                  <th style={styles.thWithLeftBorder}>ID Card</th>
                  <th style={styles.thWithLeftBorder}>Employee</th>
                  <th style={styles.thWithLeftBorder}>Username</th>
                  <th style={styles.thWithLeftBorder}>Department</th>
                  <th style={styles.thWithLeftBorder}>Role</th>
                  <th style={styles.thWithLeftBorder}>Status</th>
                  <th style={styles.thWithLeftBorder}>Upload By</th>
                  <th style={styles.thWithLeftBorder}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  pageUsers.map((user, index) => (
                    <tr
                      key={user.id}
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
                          ...styles.tdWithLeftBorder,
                          ...styles.emptyColumn,
                        }}
                      >
                        {(currentPage - 1) * PAGE_SIZE + index + 1}
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                        title={user.idCard || ""}
                      >
                        {user.idCard}
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                        title={user.name || ""}
                      >
                        {user.name}
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                        title={user.username || ""}
                      >
                        {user.username}
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                        title={user.department || ""}
                      >
                        {user.department}
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                        title={user.role || ""}
                      >
                        {user.role}
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                        title={user.status || ""}
                      >
                        <span
                          style={{
                            color:
                              user.status === "Active" ? "#10b981" : "#ef4444",
                            fontWeight: "500",
                          }}
                        >
                          {user.status}
                        </span>
                        <button
                          style={styles.statusButton}
                          onClick={() => toggleUserStatus(user.id)}
                          title={`Set to ${user.status === "Active" ? "Inactive" : "Active"
                            }`}
                        >
                          {user.status === "Active" ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                        title={uploadByText(user)}
                      >
                        {uploadByText(user)}
                      </td>
                      <td style={styles.tdWithLeftBorder}>
                        <button
                          style={styles.editButton}

                          onClick={() => openDetailModal(user)}
                          title="Edit"
                        >
                          <Edit size={10} />
                        </button>
                        <button
                          style={styles.deleteButton}
                          onClick={() => deleteUser(user.id)}
                          title="Delete"
                        >
                          <Trash2 size={10} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                   
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={styles.paginationBar}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                style={{
                  ...styles.paginationButton,
                  ...(currentPage === 1 ? disabledStyle : {}),
                }}
                onClick={goFirst}
                disabled={currentPage === 1}
              >
                {"<<"}
              </button>

              <button
                style={{
                  ...styles.paginationButton,
                  ...(currentPage === 1 ? disabledStyle : {}),
                }}
                onClick={goPrev}
                disabled={currentPage === 1}
              >
                {"<"}
              </button>

              <span>Page</span>

              <input
                type="text"
                value={String(currentPage)}
                onChange={onPageInputChange}
                style={styles.paginationInput}
              />

              <span>of {totalPages}</span>

              <button
                style={{
                  ...styles.paginationButton,
                  ...(currentPage === totalPages ? disabledStyle : {}),
                }}
                onClick={goNext}
                disabled={currentPage === totalPages}
              >
                {">"}
              </button>

              <button
                style={{
                  ...styles.paginationButton,
                  ...(currentPage === totalPages ? disabledStyle : {}),
                }}
                onClick={goLast}
                disabled={currentPage === totalPages}
              >
                {">>"}
              </button>
            </div>
            <span>Total: {filteredUsers.length} row</span>
          </div>
        </div>
      </div>
      <div
        style={styles.modalOverlay}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeDetailModal();
        }}
      >
        <div style={styles.modalContent}>
          {detailModal.visible && detailModal.user && (
            <>
              <div style={styles.modalHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={styles.modalHeaderTitle}>
                    {editMode ? "Edit User" : "User Detail"}
                  </span>
                  {editMode && (
                    <span style={{
                      fontSize: "10px",
                      fontWeight: "700",
                      color: "#065f46",
                      backgroundColor: "#d1fae5",
                      border: "1px solid #10b981",
                      borderRadius: "4px",
                      padding: "1px 7px",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}>
                      Editing
                    </span>
                  )}
                </div>
                <button style={styles.modalCloseBtn} onClick={closeDetailModal}>
                  <X size={16} />
                </button>
              </div>

              {/* ── Body ── */}
              <div style={styles.modalBody}>

                {/* Section: Identity */}
                <div style={styles.modalSectionTitle}>Identity</div>

                <div style={styles.modalField}>
                  <label style={styles.modalLabel}>ID Card</label>
                  {editMode ? (
                    <input
                      type="text"
                      style={styles.modalInput}
                      value={editForm.idCard || ""}
                      onChange={(e) => handleEditChange("idCard", e.target.value)}
                    />
                  ) : (
                    <div style={styles.modalValue}>{detailModal.user.idCard}</div>
                  )}
                </div>

                <div style={styles.modalField}>
                  <label style={styles.modalLabel}>Employee</label>
                  {editMode ? (
                    <input
                      type="text"
                      style={{ ...styles.modalInput, textTransform: "uppercase" }}
                      value={editForm.name || ""}
                      onChange={(e) => handleEditChange("name", e.target.value)}
                    />
                  ) : (
                    <div style={styles.modalValue}>{detailModal.user.name}</div>
                  )}
                </div>

                <div style={styles.modalField}>
                  <label style={styles.modalLabel}>Department</label>
                  {editMode ? (
                    <select
                      style={{ ...styles.modalInput, cursor: "pointer" }}
                      value={editForm.department || "SCN-MH"}
                      onChange={(e) => handleEditChange("department", e.target.value)}
                    >
                      <option value="SCN-MH">SCN-MH</option>
                      <option value="SCN-LOG">SCN-LOG</option>
                      <option value="SCN-IQC">SCN-IQC</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  ) : (
                    <div style={styles.modalValue}>{detailModal.user.department}</div>
                  )}
                </div>


                {/* Section: Account */}
                <div style={{ ...styles.modalSectionTitle, marginTop: "14px" }}>Account</div>

                <div style={styles.modalField}>
                  <label style={styles.modalLabel}>Username</label>
                  {editMode ? (
                    <input
                      type="text"
                      style={styles.modalInput}
                      value={editForm.username || ""}
                      onChange={(e) => handleEditChange("username", e.target.value)}
                    />
                  ) : (
                    <div style={styles.modalValue}>{detailModal.user.username}</div>
                  )}
                </div>

                <div style={styles.modalField}>
                  <label style={styles.modalLabel}>Password</label>
                  {editMode ? (
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                      <input
                        type={showPassword ? "text" : "password"}
                        style={{ ...styles.modalInput, paddingRight: "32px" }}
                        value={editForm.password || ""}
                        onChange={(e) => handleEditChange("password", e.target.value)}
                      />
                      <button
                        style={{ position: "absolute", right: "6px", background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex", alignItems: "center", padding: 0 }}
                        onClick={() => setShowPassword(!showPassword)}
                        type="button"
                      >
                        {showPassword ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                    </div>
                  ) : (
                    <div style={styles.modalValue}>{detailModal.user.password}</div>
                  )}
                </div>

                <div style={styles.modalField}>
                  <label style={styles.modalLabel}>Status</label>
                  {editMode ? (
                    <select
                      style={{ ...styles.modalInput, cursor: "pointer" }}
                      value={editForm.status || "Active"}
                      onChange={(e) => handleEditChange("status", e.target.value)}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  ) : (
                    <div style={{
                      ...styles.modalValue,
                      color: detailModal.user.status === "Active" ? "#16a34a" : "#dc2626",
                      fontWeight: "600",
                    }}>
                      {detailModal.user.status}
                    </div>
                  )}
                </div>

              </div>

              {/* ── Footer ── */}
              <div style={styles.modalFooter}>
                {editMode ? (
                  <>
                    <button
                      style={styles.cancelButton}
                      onClick={toggleEditMode}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
                    >
                      Cancel
                    </button>
                    <button
                      style={styles.saveButton}
                      onClick={saveEditedUser}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#059669")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#10b981")}
                    >
                      <Save size={13} />
                      Save Changes
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      style={styles.cancelButton}
                      onClick={closeDetailModal}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
                    >
                      Close
                    </button>
                    <button
                      style={styles.editButtonModal}
                      onClick={toggleEditMode}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1d4ed8")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#2563eb")}
                    >
                      <Pencil size={13} />
                      Edit User
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tooltip */}
      <div
        style={{
          position: "fixed",
          top: tooltip.y,
          left: tooltip.x,
          backgroundColor: "rgba(0,0,0,0.8)",
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
          boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
        }}
      >
        {tooltip.content}
      </div>
    </div>
  );
};

export default UserControlPage;