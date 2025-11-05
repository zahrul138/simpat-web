"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Save, Trash2, Eye, EyeOff, Plus, CloudUpload } from "lucide-react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";
const getToken = () => localStorage.getItem("auth_token");

// ===== helpers umum =====
const onlyDigits = (s) => (s || "").replace(/\D+/g, "");
const capFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "");
const getFirstName = (employeeUpper) => {
  const trimmed = (employeeUpper || "").trim();
  if (!trimmed) return "";
  const first = trimmed.split(/\s+/)[0];
  return capFirst(first);
};
const usernameFromIdCard = (idCard) => (idCard ? `peb.${idCard}` : "");
const last3 = (idCard) => (idCard || "").slice(-3);
const passwordFrom = (employeeUpper, idCard) => {
  const fn = getFirstName(employeeUpper);
  const d3 = last3(idCard);
  return fn && d3 ? `${fn}${d3}` : fn || "";
};
// ambil emp_name display dari user login (Navbar)
const getDisplayName = () => {
  try {
    const u = JSON.parse(localStorage.getItem("auth_user") || "null");
    return u?.emp_name || u?.name || "ADMIN";
  } catch {
    return "ADMIN";
  }
};

const CreateUserPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    idCard: "",
    employeeName: "",
    username: "",
    password: "",
    department: "SCN-MH",
  });

  const [tempUsers, setTempUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [showPassword, setShowPassword] = useState(false);

  const [currentDateTime] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    return {
      full: `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`, // YYYY-MM-DD HH:mm:ss
      fullMinute: `${year}-${month}-${day} ${hours}:${minutes}`,      // YYYY-MM-DD HH:mm
      dateOnly: `${year}-${month}-${day}`,
    };
  });

  const getRoleByDepartment = (department) => (department === "ADMIN" ? "Admin" : "User");

  const handleInputFocus = (e) => (e.target.style.borderColor = "#9fa8da");
  const handleInputBlur = (e) => (e.target.style.borderColor = "#d1d5db");

  const handleButtonHover = (e, isHover, type) => {
    if (type === "primary") e.currentTarget.style.backgroundColor = isHover ? "#1d4ed8" : "#2563eb";
  };
  const togglePasswordVisibility = () => setShowPassword((v) => !v);

  // ID Card: angka saja, max 7; auto username & password
  const onChangeIdCard = (e) => {
    const digits = onlyDigits(e.target.value).slice(0, 7);
    const autoUser = usernameFromIdCard(digits);
    const autoPass = passwordFrom(form.employeeName, digits);
    setForm((prev) => ({
      ...prev,
      idCard: digits,
      username: autoUser,
      password: autoPass,
    }));
  };

  // Employee: selalu UPPERCASE; auto password
  const onChangeEmployee = (e) => {
    const upper = (e.target.value || "").toUpperCase();
    const autoPass = passwordFrom(upper, form.idCard);
    setForm((prev) => ({
      ...prev,
      employeeName: upper,
      password: autoPass,
    }));
  };

  // Username dikunci ke peb.{idCard}
  const onChangeUsername = () => {};

  const createUser = () => {
    if (!form.idCard.trim() || !form.employeeName.trim() || !form.password.trim()) {
      alert("Please complete all required fields.");
      return;
    }
    if (form.idCard.length !== 7) {
      alert("ID Card harus tepat 7 digit.");
      return;
    }
    const mustUsername = usernameFromIdCard(form.idCard);
    const creator = getDisplayName();

    const role = getRoleByDepartment(form.department);
    const newUser = {
      id: Date.now(),
      idCard: form.idCard,
      name: form.employeeName,
      username: mustUsername,
      password: form.password, // plain
      department: form.department,
      email: `${mustUsername}@company.com`,
      role,
      status: "Active",
      createdBy: creator,                     // << emp_name admin
      createdAt: currentDateTime.fullMinute,  // << YYYY-MM-DD HH:mm
      createdDate: currentDateTime.full,      // (keep kalau mau dipakai)
    };

    setTempUsers((prev) => [...prev, newUser]);
    setForm({ idCard: "", employeeName: "", username: "", password: "", department: "SCN-MH" });
  };

  const toggleUserSelection = (userId) => {
    const next = new Set(selectedUsers);
    next.has(userId) ? next.delete(userId) : next.add(userId);
    setSelectedUsers(next);
  };

  const saveSelectedUsers = async () => {
    if (selectedUsers.size === 0) { alert("Please select at least one user to save."); return; }

    const selected = tempUsers.filter((u) => selectedUsers.has(u.id));
    const invalid = selected.find((u) => !u.idCard || u.idCard.length !== 7);
    if (invalid) {
      alert(`User dengan ID Card tidak valid (harus 7 digit): ${invalid.name || invalid.username}`);
      return;
    }

    const usersToSave = selected.map((u) => ({
      idCard: u.idCard,
      name: u.name,
      username: u.username,
      password: u.password,
      department: u.department,
      role: u.role,
      status: u.status,
      createdBy: u.createdBy,        // << ikut kirim ke BE
    }));

    try {
      const r = await fetch(`${API_BASE}/users/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ users: usersToSave }),
      });
      const data = await r.json();
      if (!r.ok) { alert(data?.error || "Bulk create gagal"); return; }
      alert(`${usersToSave.length} user(s) successfully created!`);
      navigate("/user-control");
    } catch {
      alert("Network error");
    }
  };

  const deleteUser = (userId) => {
    setTempUsers((prev) => prev.filter((u) => u.id !== userId));
    const next = new Set(selectedUsers);
    next.delete(userId);
    setSelectedUsers(next);
  };

  const selectAllUsers = () => {
    if (selectedUsers.size === tempUsers.length) setSelectedUsers(new Set());
    else setSelectedUsers(new Set(tempUsers.map((u) => u.id)));
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
    title: {
      fontSize: "20px",
      fontWeight: "600",
      color: "#1f2937",
      margin: 0,
      marginBottom: "24px",
    },
    card: {
      backgroundColor: "white",
      padding: "24px",
      borderRadius: "8px",
      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
      border: "1px solid #e5e7eb",
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
      outline: "none",
      backgroundColor: "#f3f4f6",
      padding: "8px 12px",
      fontSize: "12px",
      alignItems: "center",
      color: "#374151",
      fontFamily: "inherit",
      margin: 0,
    },
    passwordInputContainer: {
      position: "relative",
      display: "inline-block",
    },
    passwordInput: {
      display: "flex",
      height: "1rem",
      width: "7.3rem",
      borderRadius: "6px",
      border: "1px solid #d1d5db",
      outline: "none",
      backgroundColor: "#f3f4f6",
      padding: "8px 35px 8px 12px",
      fontSize: "12px",
      alignItems: "center",
      color: "#374151",
      fontFamily: "inherit",
      margin: 0,
    },
    eyeIcon: {
      position: "absolute",
      right: "8px",
      top: "50%",
      transform: "translateY(-50%)",
      cursor: "pointer",
      color: "#6b7280",
      backgroundColor: "transparent",
      border: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "4px",
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
      marginBottom: "10px",
      marginTop: "10px",
    },
    h2: {
      fontSize: "18px",
      fontWeight: "600",
      marginBottom: "5px",
      color: "#4b5563",
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
    emptyColumn: {
      width: "auto",
      minWidth: "auto",
      maxWidth: "auto",
      padding: "0",
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
      marginLeft: "4px",
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
    saveConfiguration: {
      display: "flex",
      gap: "8px",
      marginTop: "10px",
      marginLeft: "13px",
    },
    selectAllContainer: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginBottom: "10px",
      marginLeft: "13px",
    },
    selectAllCheckbox: {
      cursor: "pointer",
      width: "14px",
      height: "14px",
    },
    selectAllLabel: {
      fontSize: "12px",
      color: "#374151",
      fontWeight: "500",
    },
    roleBadge: {
      padding: "2px 6px",
      borderRadius: "4px",
      fontSize: "10px",
      fontWeight: "600",
      textTransform: "uppercase",
    },
    adminBadge: {
      backgroundColor: "#dc2626",
      color: "white",
    },
    userBadge: {
      backgroundColor: "#059669",
      color: "white",
    },
  };

  return (
    <div style={styles.pageContainer}>
      <Helmet>
        <title>Admin | Create User</title>
      </Helmet>

      <div style={styles.welcomeCard}>
        <h1 style={styles.title}>Create New User</h1>

        <div style={styles.card}>
          <div style={{ display: "flex" }}>
            {/* Left column */}
            <div style={{ flex: "1", display: "grid", gap: "20px" }}>
              <div>
                <label style={styles.label}>ID Card *</label>
                <input
                  style={styles.input}
                  value={form.idCard}
                  onChange={onChangeIdCard}
                  placeholder="Enter ID Card"
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={7}
                />
              </div>

              <div>
                <label style={styles.label}>Employee *</label>
                <input
                  style={styles.input}
                  value={form.employeeName}
                  onChange={onChangeEmployee}
                  placeholder="Enter employee name"
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
              </div>

              <div>
                <label style={styles.label}>Department *</label>
                <select
                  style={styles.select}
                  value={form.department}
                  onChange={(e)=>setForm({...form,department:e.target.value})}
                >
                  <option value="SCN-MH" style={optionStyle}>SCN-MH</option>
                  <option value="SCN-LOG" style={optionStyle}>SCN-LOG</option>
                  <option value="SCN-IQC" style={optionStyle}>SCN-IQC</option>
                  <option value="ADMIN" style={optionStyle}>ADMIN</option>
                </select>
                <div style={{ marginTop: "4px", fontSize: "10px", color: "#6b7280" }} />
              </div>

              {/* Create button */}
              <div style={styles.actionButtonsGroup}>
                <button
                  style={{ ...styles.button, ...styles.primaryButton }}
                  onClick={createUser}
                  onMouseEnter={(e) => handleButtonHover(e, true, "primary")}
                  onMouseLeave={(e) => handleButtonHover(e, false, "primary")}
                >
                  <Plus size={16} />
                  Add to List
                </button>
              </div>
            </div>

            {/* Right column */}
            <div style={{ flex: "2", display: "grid", gap: "20px", paddingBottom: "70px" }}>
              <div>
                <label style={styles.label}>Username *</label>
                <input
                  style={styles.input}
                  value={form.username}
                  onChange={onChangeUsername}
                  placeholder="peb.XXXXXXX"
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  readOnly
                />
              </div>

              <div>
                <label style={styles.label}>Password *</label>
                <div style={styles.passwordInputContainer}>
                  <input
                    style={styles.passwordInput}
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder="Enter password"
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  />
                  <button
                    type="button"
                    style={styles.eyeIcon}
                    onClick={togglePasswordVisibility}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={styles.label}>Account Created</label>
                <p style={styles.dateDisplay}>{currentDateTime.dateOnly}</p>
              </div>
            </div>
          </div>
        </div>

        <h2 style={styles.h2}>User List</h2>

        <div style={styles.tableContainer}>
          <div style={styles.tableBodyWrapper}>
            <table style={{ ...styles.table, minWidth: "900px" }}>
              <colgroup>
                <col style={{ width: "28px" }} />
                <col style={{ width: "3.3%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "5%" }} />
              </colgroup>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.thWithLeftBorder}>No</th>
                  <th style={styles.thWithLeftBorder}>
                    <input
                      type="checkbox"
                      style={{ margin: "0 auto", display: "block", cursor: "pointer", width: "13px", height: "13px" }}
                      checked={selectedUsers.size === tempUsers.length && tempUsers.length > 0}
                      onChange={selectAllUsers}
                    />
                  </th>
                  <th style={styles.thWithLeftBorder}>ID Card</th>
                  <th style={styles.thWithLeftBorder}>Employee</th>
                  <th style={styles.thWithLeftBorder}>Username</th>
                  <th style={styles.thWithLeftBorder}>Password</th>
                  <th style={styles.thWithLeftBorder}>Department</th>
                  <th style={styles.thWithLeftBorder}>Role</th>
                  <th style={styles.thWithLeftBorder}>Created</th>
                  <th style={styles.thWithLeftBorder}></th>
                </tr>
              </thead>
              <tbody>
                {tempUsers.length > 0 ? (
                  tempUsers.map((user, index) => (
                    <tr
                      key={user.id}
                      onMouseEnter={(e) => (e.target.closest("tr").style.backgroundColor = "#c7cde8")}
                      onMouseLeave={(e) => (e.target.closest("tr").style.backgroundColor = "transparent")}
                    >
                      <td style={{ ...styles.tdWithLeftBorder, ...styles.emptyColumn }}>{index + 1}</td>
                      <td style={styles.tdWithLeftBorder}>
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          style={{ margin: "0 auto", display: "block", cursor: "pointer", width: "12px", height: "12px" }}
                        />
                      </td>
                      <td style={styles.tdWithLeftBorder}>{user.idCard}</td>
                      <td style={styles.tdWithLeftBorder}>{user.name}</td>
                      <td style={styles.tdWithLeftBorder}>{user.username}</td>
                      <td style={styles.tdWithLeftBorder}>{user.password}</td>
                      <td style={styles.tdWithLeftBorder}>{user.department}</td>
                      <td style={styles.tdWithLeftBorder}>
                        <span style={{ ...styles.roleBadge, ...(user.role === "Admin" ? styles.adminBadge : styles.userBadge) }}>
                          {user.role}
                        </span>
                      </td>
                      {/* === Created: "createdBy | YYYY-MM-DD HH:mm" === */}
                      <td style={styles.tdWithLeftBorder}>
                        {user.createdBy} | {user.createdAt}
                      </td>
                      <td style={styles.tdWithLeftBorder}>
                        <button style={styles.deleteButton} onClick={() => deleteUser(user.id)}>
                          <Trash2 size={10} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="10" style={{ ...styles.tdWithLeftBorder, textAlign: "center", color: "#9ca3af" }}>
                      No data has been created
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={styles.paginationBar}>
            <span>Total: {tempUsers.length} user(s)</span>
            {tempUsers.length > 0 && <span>Selected: {selectedUsers.size} user(s)</span>}
          </div>
        </div>

        {tempUsers.length > 0 && (
          <div style={styles.saveConfiguration}>
            <button
              style={{ ...styles.button, ...styles.primaryButton }}
              onMouseEnter={(e) => handleButtonHover(e, true, "primary")}
              onMouseLeave={(e) => handleButtonHover(e, false, "primary")}
              onClick={saveSelectedUsers}
            >
              <CloudUpload size={16} />
              Create Selected Users ({selectedUsers.size})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateUserPage;
