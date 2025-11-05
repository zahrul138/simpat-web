"use client";

import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Plus, Trash2, Pencil, Edit, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";
const getToken = () => localStorage.getItem("auth_token");
const PAGE_SIZE = 10;

const UserControlPage = () => {
  const navigate = useNavigate();
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
  const [activeTab, setActiveTab] = useState("Active");

  // ===== Helpers =====
  const getRoleByDepartment = (department) =>
    department === "ADMIN" ? "Admin" : "User";

  const formatDateTime = (dt) => {
    if (!dt) return "-";
    const d = new Date(dt);
    if (isNaN(d.getTime())) return dt; // kalau backend udah kirim string siap pakai
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${day} ${hh}.${mm}`;
  };

  const createdText = (u) => {
    const creator =
      u.createdBy || u.created_by || u.creator_name || u.createdby || "SYSTEM";
    const when = formatDateTime(u.createdDate || u.created_at || u.createdAt);
    return `${creator} | ${when}`;
  };

  // ===== Load dari API sekali di mount =====
  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch(`${API_BASE}/users`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await r.json();
        if (!r.ok) {
          alert(data?.error || "Load users gagal");
          setUsers([]);
          return;
        }
        setUsers(Array.isArray(data) ? data : []);
      } catch {
        alert("Network error");
        setUsers([]);
      }
    };
    load();
  }, []);

  // ===== Filtering + Tabs =====
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

  // total halaman
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE)),
    [filteredUsers.length]
  );

  // data untuk halaman aktif
  const pageUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, currentPage]);

  // reset ke page 1 kalau filter/tab berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [filterKeyword, roleFilter, statusFilter, activeTab]);

  // clamp halaman kalau totalPages mengecil (misal habis delete)
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  // ===== Tooltip =====
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

  // ===== UI hover helpers =====
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
    setEditForm({ ...user });
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
        password: editForm.password, // plain
        department: editForm.department, // dept_code
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
        alert(data?.error || "Update gagal");
        return;
      }
      // update local list + modal content
      setUsers((prev) =>
        prev.map((u) => (u.id === editForm.id ? { ...u, ...payload } : u))
      );
      setDetailModal((prev) => ({
        ...prev,
        user: { ...prev.user, ...payload },
      }));
      setEditMode(false);
      alert("User updated successfully!");
    } catch {
      alert("Network error");
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
        alert(data?.error || "Delete gagal");
        return;
      }
      setUsers((prev) => prev.filter((x) => x.id !== id));
    } catch {
      alert("Network error");
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
        alert(data?.error || "Gagal mengubah status");
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: nextStatus } : u))
      );
      // kalau lagi kebuka modal dan user sama, sinkronkan juga
      setDetailModal((prev) =>
        prev.user && prev.user.id === userId
          ? { ...prev, user: { ...prev.user, status: nextStatus } }
          : prev
      );
    } catch {
      alert("Network error");
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

  // ===== Styles (dipertahankan sesuai UI yang oke) =====
  const modalOverlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: detailModal.visible ? "flex" : "none",
    justifyContent: "center",
    alignItems: "flex-start",
    zIndex: 1000,
    overflowY: "auto",
    padding: "20px 0",
  };
  const modalContentStyle = {
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "24px",
    width: "500px",
    maxWidth: "90vw",
    maxHeight: "calc(90vh - 40px)",
    overflow: "auto",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
    marginTop: "130px",
    marginBottom: "10px",
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
    modalField: { marginBottom: "10px" },
    modalLabel: {
      fontSize: "12px",
      fontWeight: "600",
      color: "#374151",
      display: "block",
      marginBottom: "6px",
    },
    modalValue: {
      fontSize: "12px",
      color: "#6b7280",
      padding: "8px 12px",
      backgroundColor: "#f9fafb",
      borderRadius: "4px",
    },
    modalInput: {
      width: "70%",
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      fontSize: "12px",
      fontFamily: "inherit",
      outline: "none",
    },
    modalActions: {
      display: "flex",
      gap: "12px",
      justifyContent: "flex-end",
      marginTop: "24px",
      paddingTop: "16px",
      borderTop: "1px solid #e5e7eb",
    },
    saveButton: {
      backgroundColor: "#10b981",
      color: "white",
      padding: "8px 16px",
      border: "none",
      borderRadius: "4px",
      fontSize: "12px",
      fontWeight: "500",
      cursor: "pointer",
      transition: "background-color 0.2s ease",
    },
    editButtonModal: {
      backgroundColor: "#2563eb",
      color: "white",
      padding: "8px 16px",
      border: "none",
      borderRadius: "4px",
      fontSize: "12px",
      fontWeight: "500",
      cursor: "pointer",
      transition: "background-color 0.2s ease",
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    cancelButton: {
      backgroundColor: "#f3f4f6",
      color: "#374151",
      padding: "8px 16px",
      border: "none",
      borderRadius: "4px",
      fontSize: "12px",
      fontWeight: "500",
      cursor: "pointer",
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
            Active ({activeCount})
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
            In-Active ({inactiveCount})
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
                <col style={{ width: "15%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "5%" }} />
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
                  <th style={styles.thWithLeftBorder}>Created</th>
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
                        onMouseEnter={showTooltip}
                        onMouseLeave={hideTooltip}
                      >
                        {user.idCard}
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                        onMouseEnter={showTooltip}
                        onMouseLeave={hideTooltip}
                      >
                        {user.name}
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                        onMouseEnter={showTooltip}
                        onMouseLeave={hideTooltip}
                      >
                        {user.username}
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                        onMouseEnter={showTooltip}
                        onMouseLeave={hideTooltip}
                      >
                        {user.department}
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                        onMouseEnter={showTooltip}
                        onMouseLeave={hideTooltip}
                      >
                        {user.role}
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                        onMouseEnter={showTooltip}
                        onMouseLeave={hideTooltip}
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
                          title={`Set to ${
                            user.status === "Active" ? "Inactive" : "Active"
                          }`}
                        >
                          {user.status === "Active" ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                      <td
                        style={styles.tdWithLeftBorder}
                        onMouseEnter={showTooltip}
                        onMouseLeave={hideTooltip}
                      >
                        {createdText(user)}
                      </td>
                      <td style={styles.tdWithLeftBorder}>
                        <button
                          style={styles.editButton}
                          onMouseEnter={showTooltip}
                          onMouseLeave={hideTooltip}
                          onClick={() => openDetailModal(user)}
                          title="Edit User"
                        >
                          <Edit size={10} />
                        </button>
                        <button
                          style={styles.deleteButton}
                          onMouseEnter={showTooltip}
                          onMouseLeave={hideTooltip}
                          onClick={() => deleteUser(user.id)}
                          title="Delete User"
                        >
                          <Trash2 size={10} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="9"
                      style={{
                        ...styles.tdWithLeftBorder,
                        textAlign: "center",
                        color: "#9ca3af",
                      }}
                    >
                      {users.length === 0
                        ? "No data has been created"
                        : "No users match your search criteria"}
                    </td>
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

      {/* Detail/Edit Modal */}
      <div
        style={styles.modalOverlay}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeDetailModal();
        }}
      >
        <div style={styles.modalContent}>
          {detailModal.visible && detailModal.user && (
            <div>
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
                <label style={styles.modalLabel}>Username</label>
                {editMode ? (
                  <input
                    type="text"
                    style={styles.modalInput}
                    value={editForm.username || ""}
                    onChange={(e) =>
                      handleEditChange("username", e.target.value)
                    }
                  />
                ) : (
                  <div style={styles.modalValue}>
                    {detailModal.user.username}
                  </div>
                )}
              </div>

              <div style={styles.modalField}>
                <label style={styles.modalLabel}>Password</label>
                {editMode ? (
                  <div style={passwordInputWrapper}>
                    <input
                      type={showPassword ? "text" : "password"}
                      style={{
                        ...styles.modalInput,
                        paddingRight: "36px",
                        width: "100%",
                      }}
                      value={editForm.password || ""}
                      onChange={(e) =>
                        handleEditChange("password", e.target.value)
                      }
                    />
                    <button
                      style={passwordEyeButton}
                      onClick={() => setShowPassword(!showPassword)}
                      type="button"
                      title={showPassword ? "Hide" : "Show"}
                    >
                      {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                  </div>
                ) : (
                  <div style={styles.modalValue}>
                    {detailModal.user.password}
                  </div>
                )}
              </div>

              <div style={styles.modalField}>
                <label style={styles.modalLabel}>Department</label>
                {editMode ? (
                  <select
                    style={modalSelectInput}
                    value={editForm.department || "SCN-MH"}
                    onChange={(e) =>
                      handleEditChange("department", e.target.value)
                    }
                  >
                    <option value="SCN-MH">SCN-MH</option>
                    <option value="SCN-LOG">SCN-LOG</option>
                    <option value="SCN-IQC">SCN-IQC</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                ) : (
                  <div style={styles.modalValue}>
                    {detailModal.user.department}
                  </div>
                )}
              </div>

              <div style={styles.modalField}>
                <label style={styles.modalLabel}>Role</label>
                {editMode ? (
                  <select
                    style={modalSelectInput}
                    value={editForm.role || "User"}
                    onChange={(e) => handleEditChange("role", e.target.value)}
                  >
                    <option value="User">User</option>
                    <option value="Admin">Admin</option>
                  </select>
                ) : (
                  <div style={styles.modalValue}>{detailModal.user.role}</div>
                )}
              </div>

              <div style={styles.modalField}>
                <label style={styles.modalLabel}>Status</label>
                {editMode ? (
                  <select
                    style={modalSelectInput}
                    value={editForm.status || "Active"}
                    onChange={(e) => handleEditChange("status", e.target.value)}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                ) : (
                  <div style={styles.modalValue}>{detailModal.user.status}</div>
                )}
              </div>

              <div style={styles.modalField}>
                <label style={styles.modalLabel}>Created</label>
                <div style={styles.modalValue}>
                  {createdText(detailModal.user)}
                </div>
              </div>

              <div style={styles.modalActions}>
                {editMode ? (
                  <>
                    <button
                      style={styles.saveButton}
                      onClick={saveEditedUser}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#059669")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "#10b981")
                      }
                    >
                      Save Changes
                    </button>
                    <button
                      style={styles.cancelButton}
                      onClick={toggleEditMode}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#e5e7eb")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "#f3f4f6")
                      }
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    style={styles.editButtonModal}
                    onClick={toggleEditMode}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "#1d4ed8")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "#2563eb")
                    }
                  >
                    <Pencil size={14} />
                    Edit User
                  </button>
                )}
                <button
                  style={styles.cancelButton}
                  onClick={closeDetailModal}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "#e5e7eb")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "#f3f4f6")
                  }
                >
                  Close
                </button>
              </div>
            </div>
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
