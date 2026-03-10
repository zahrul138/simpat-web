"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import timerService from "../utils/TimerService";

import {
  FaRegEdit,
  FaCalendarAlt,
  FaClock,
  FaUserCircle,
} from "react-icons/fa";
import LogoSimkom from "../assets/images/logo-simkom.png";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const APPLICATION_DEPARTMENTS = {
  production: ["SCN-MH"],
  inventory: ["SCN-LOG"],
  quality: ["SCN-IQC"],
  system: ["ADMIN"],
};

const APPLICATION_NAMES = {
  production: "Production Management",
  inventory: "Inventory Control",
  quality: "Quality Assurance",
  system: "System Management",
};

const PAGE_OPTIONS = {
  "SCN-MH": [
    { value: "/target-schedule", label: "Target Schedule" },
    { value: "/target-scanning", label: "Target Scanning" },
    { value: "/production-monitoring", label: "Production Monitoring" },
    { value: "/mh-local-schedule", label: "Local Schedule" },
    { value: "/part-enquiry-non-id", label: "Request Parts" },
    { value: "/stock-overview-mh", label: "Stock Overview" },
    { value: "/return-parts", label: "Return Parts" },
  ],
  "SCN-LOG": [
    { value: "/local-schedule", label: "Local Schedule" },
    { value: "/oversea-schedule", label: "Oversea Schedule" },
    { value: "/storage-inventory", label: "Storage Inventory" },
    { value: "/stock-overview", label: "Stock Overview" },
    { value: "/part-details", label: "Part Details" },
    { value: "/vendor-details", label: "Vendor Details" },
    { value: "/vendor-placement", label: "Vendor Placement" },
    { value: "/receive-request", label: "Receive Request" },
    { value: "/rtv-part", label: "RTV Control" },
  ],
  "SCN-IQC": [
    { value: "/qc-local-schedule", label: "QC Local Schedule" },
    { value: "/qc-oversea-schedule", label: "QC Oversea Schedule" },
    { value: "/qc-part", label: "Quality Parts" },
    { value: "/qc-return-parts", label: "QC Return Parts" },
  ],
  ADMIN: [
    { value: "/user-control", label: "Manage User" },
    { value: "/user-management", label: "User List" },
  ],
};

const getAuthUser = () => {
  try {
    return JSON.parse(sessionStorage.getItem("auth_user") || "null");
  } catch {
    return null;
  }
};

const clearAuth = () => {
  sessionStorage.removeItem("auth_token");
  sessionStorage.removeItem("auth_user");
};

const getPageOptions = (deptCode) => {
  const key = (deptCode || "").toUpperCase();
  if (PAGE_OPTIONS[key]) return PAGE_OPTIONS[key];
  return Object.values(PAGE_OPTIONS).flat();
};

const Navbar = ({
  onToggleSidebar,
  sidebarVisible,
  onApplicationChange,
  currentApplication,
  currentDepartment,
}) => {
  const navbarHeight = 120;
  const navigate = useNavigate();

  const [selectedApplication, setSelectedApplication] = useState(
    currentApplication || "production",
  );
  const [selectedDepartment, setSelectedDepartment] = useState(
    currentDepartment || "SCN-MH",
  );
  const [currentTime, setCurrentTime] = useState(new Date());
  const [onlineCount, setOnlineCount] = useState(1);

  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackDesc, setFeedbackDesc] = useState("");
  const [feedbackLocation, setFeedbackLocation] = useState("");
  const [feedbackPhotos, setFeedbackPhotos] = useState([]);
  const [isSending, setIsSending] = useState(false);

  const authUser = getAuthUser();
  const isAdmin = authUser?.role === "Admin";
  const displayName = authUser?.emp_name || authUser?.name || "User";

  useEffect(() => {
    timerService.start();
    const unsubscribe = timerService.subscribe((newTime) =>
      setCurrentTime(newTime),
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (authUser) {
      setSelectedApplication(
        authUser.dept_app || currentApplication || "production",
      );
      setSelectedDepartment(
        authUser.dept_code || currentDepartment || "SCN-MH",
      );
    }
  }, []);

  useEffect(() => {
    if (currentApplication) setSelectedApplication(currentApplication);
  }, [currentApplication]);

  useEffect(() => {
    if (currentDepartment) setSelectedDepartment(currentDepartment);
  }, [currentDepartment]);

  useEffect(() => {
    const sendHeartbeat = async () => {
      const user = getAuthUser();
      if (!user) return;
      try {
        await fetch(`${API_BASE}/api/active-sessions/heartbeat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id || user.emp_id || user.username,
            empName: user.emp_name || user.name || "Unknown",
          }),
        });
      } catch {}
    };

    const fetchCount = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/active-sessions/count`);
        const data = await res.json();
        if (data.onlineCount !== undefined) setOnlineCount(data.onlineCount);
      } catch {}
    };

    sendHeartbeat();
    fetchCount();

    const heartbeatInterval = setInterval(sendHeartbeat, 30000);
    const countInterval = setInterval(fetchCount, 5000);
    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(countInterval);
    };
  }, []);

  const handleApplicationChange = (e) => {
    const newApp = e.target.value;
    const newDept = APPLICATION_DEPARTMENTS[newApp][0];
    setSelectedApplication(newApp);
    setSelectedDepartment(newDept);
    onApplicationChange?.(newApp, newDept);
  };

  const handleDepartmentChange = (e) => {
    const newDept = e.target.value;
    setSelectedDepartment(newDept);
    onApplicationChange?.(selectedApplication, newDept);
  };

  const handleLogout = () => {
    const user = getAuthUser();
    if (user) {
      fetch(`${API_BASE}/api/active-sessions/logout`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id || user.emp_id || user.username,
        }),
      }).catch(() => {});
    }
    clearAuth();
    navigate("/login");
  };

  const handleToggleButtonHover = (e, isHover) => {
    const button = e.currentTarget;
    const tab = button.querySelector(".bookmark-tab");
    if (isHover) {
      Object.assign(button.style, styles.toggleButtonHover);
      if (tab) {
        tab.style.borderLeftColor = styles.bookmarkTabHover.borderLeftColor;
        tab.style.borderRightColor = styles.bookmarkTabHover.borderRightColor;
      }
    } else {
      button.style.backgroundColor = styles.toggleButton.backgroundColor;
      button.style.transform = styles.toggleButton.transform;
      if (tab) {
        tab.style.borderLeftColor = styles.bookmarkTab.borderLeftColor;
        tab.style.borderRightColor = styles.bookmarkTab.borderRightColor;
      }
    }
  };

  const handleOpenFeedback = () => {
    setFeedbackDesc("");
    setFeedbackLocation("");
    setFeedbackPhotos([]);
    setShowFeedback(true);
  };

  const handlePhotoAdd = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (feedbackPhotos.length >= 4) return;
    const preview = URL.createObjectURL(file);
    setFeedbackPhotos((prev) => [...prev, { file, preview }]);
    e.target.value = "";
  };

  const handlePhotoRemove = (index) => {
    setFeedbackPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendFeedback = async () => {
    if (!feedbackDesc.trim() && feedbackPhotos.length === 0) {
      alert("Harap isi deskripsi atau lampirkan foto terlebih dahulu.");
      return;
    }
    setIsSending(true);
    try {
      const token = sessionStorage.getItem("auth_token");

      const toBase64 = (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

      const photos = await Promise.all(
        feedbackPhotos.map((p) => toBase64(p.file)),
      );

      const res = await fetch(`${API_BASE}/user-feedbacks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          emp_id: authUser?.emp_id || "",
          emp_name: authUser?.emp_name || authUser?.name || "",
          department: authUser?.dept_code || selectedDepartment || "",
          problem_location: feedbackLocation || "",
          description: feedbackDesc.trim(),
          photos,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      alert("Feedback successfully submitted!");
      setShowFeedback(false);
    } catch {
      alert("Failed to send feedback, please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const styles = {
    toggleButton: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 20px 8px 12px",
      backgroundColor: "#1e293b",
      color: "white",
      border: "none",
      cursor: "pointer",
      margin: "0",
      fontSize: "12px",
      transition: "all 0.3s ease",
      fontFamily: "inherit",
      position: "fixed",
      left: sidebarVisible ? "288px" : "-12px",
      top: navbarHeight + 25 + "px",
      zIndex: 1001,
      clipPath:
        "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)",
      boxShadow: "2px 2px 8px rgba(0, 0, 0, 0.2)",
      minWidth: "10px",
      transform: sidebarVisible ? "translateX(0)" : "translateX(8px)",
    },
    toggleButtonHover: {
      backgroundColor: "#2563eb",
      transform: sidebarVisible ? "translateX(-4px)" : "translateX(12px)",
    },
    bookmarkTab: {
      position: "absolute",
      top: "-8px",
      right: "8px",
      width: "0",
      height: "0",
      borderLeft: "8px solid #dc2626",
      borderRight: "8px solid #dc2626",
      borderTop: "8px solid transparent",
      transition: "all 0.3s ease",
    },
    bookmarkTabHover: {
      borderLeftColor: "#b91c1c",
      borderRightColor: "#b91c1c",
    },
    header: {
      backgroundColor: "white",
      borderBottom: "1px solid #e5e7eb",
      padding: "12px 24px",
      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1002,
      height: "115px",
    },
    topRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    logoSection: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    logo: {
      marginLeft: "10px",
      height: "60px",
      width: "60px",
      objectFit: "contain",
    },
    systemName: {
      fontSize: "20px",
      fontWeight: "bold",
      color: "#0f172a",
      letterSpacing: "0.025em",
      margin: 0,
    },
    systemSubtitle: {
      fontSize: "12px",
      color: "#2563eb",
      fontWeight: "500",
      margin: 0,
    },
    systemInfo: {
      display: "flex",
      alignItems: "center",
      gap: "24px",
      fontSize: "12px",
      color: "#4b5563",
    },
    badge: {
      padding: "4px 8px",
      borderRadius: "4px",
      fontSize: "12px",
      fontWeight: "500",
    },
    greenBadge: { backgroundColor: "#dcfce7", color: "#166534" },
    blueBadge: { backgroundColor: "#dbeafe", color: "#1e40af" },

    logoutButton: {
      padding: "4px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      backgroundColor: "white",
      cursor: "pointer",
      fontSize: "12px",
      transition: "all 0.2s ease",
      fontFamily: "inherit",
    },
    logoutButtonHover: {
      backgroundColor: "#f3f4f6",
      borderColor: "#9ca3af",
    },
    secondRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: "8px",
      paddingTop: "8px",
      borderTop: "1px solid #f3f4f6",
    },
    controlsSection: { display: "flex", alignItems: "center", gap: "24px" },
    controlGroup: { display: "flex", alignItems: "center", gap: "8px" },
    label: { fontSize: "12px", fontWeight: "500", color: "#374151" },
    select: {
      height: "28px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      padding: "0 8px",
      fontSize: "12px",
      backgroundColor: "white",
      cursor: "pointer",
      fontFamily: "inherit",
    },
    rightInfo: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
      fontSize: "12px",
      color: "#4b5563",
    },
    formBadge: {
      backgroundColor: "#f3f4f6",
      padding: "4px 8px",
      borderRadius: "4px",
      fontSize: "12px",
    },
    editIconContainer: {
      display: "inline-flex",
      alignItems: "center",
      backgroundColor: "#2563eb",
      color: "white",
      borderRadius: "4px",
      padding: "6px",
      cursor: "pointer",
      transition: "all 0.2s ease",
      overflow: "hidden",
      width: "32px",
      height: "28px",
      justifyContent: "center",
      boxSizing: "border-box",
    },
    editIconContainerHover: {
      backgroundColor: "#1d4ed8",
      width: "45px",
      justifyContent: "flex-start",
      paddingLeft: "11px",
    },
    editIcon: { fontSize: "12px", flexShrink: 0 },
    arrowIndicator: {
      opacity: 0,
      width: 0,
      transition: "all 0.2s ease",
      fontWeight: "bold",
      overflow: "hidden",
    },
    arrowIndicatorVisible: { opacity: 1, width: "20px" },

    periodBar: {
      backgroundColor: "#f1f5f9",
      padding: "12px 24px",
      borderBottom: "1px solid #cbd5e1",
    },
    periodContent: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    periodText: { fontSize: "12px", fontWeight: "500", color: "#475569" },
    statusInfo: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
      fontSize: "12px",
      color: "#64748b",
    },
    statusBadge: {
      backgroundColor: "#dcfce7",
      color: "#166534",
      padding: "4px 8px",
      borderRadius: "4px",
    },
    menuIcon: {
      width: "12px",
      height: "14px",
      stroke: "currentColor",
      strokeWidth: "2",
      fill: "none",
    },
    feedbackOverlay: {
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
    },
    feedbackContainer: {
      backgroundColor: "white",
      borderRadius: "10px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
      width: "460px",
      padding: "24px",
      fontFamily: "inherit",
    },
  };

  return (
    <>
      <header style={styles.header}>
        <div style={styles.topRow}>
          <div style={styles.logoSection}>
            <div style={styles.logoContainer}>
              <img
                src={
                  LogoSimkom ||
                  "/placeholder.svg?height=48&width=48&query=SIMKOM Logo"
                }
                alt="SIMKOM Logo"
                style={styles.logo}
              />
            </div>
            <div>
              <h1 style={styles.systemName}>SIMPAT</h1>
              <p style={styles.systemSubtitle}> Scanner Control Part System</p>
            </div>
          </div>

          <div style={styles.systemInfo}>
            <span style={{ ...styles.badge, ...styles.greenBadge }}>
              FY-2026
            </span>
            |
            <span
              style={{
                fontWeight: "500",
                color: "#111827",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FaCalendarAlt style={{ fontSize: "12px" }} />
              {currentTime.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            |
            <span
              style={{
                fontWeight: "500",
                color: "#111827",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FaClock style={{ fontSize: "12px" }} />
              {currentTime.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hourCycle: "h23",
              })}
            </span>
            |
            <span style={{ ...styles.badge, ...styles.blueBadge }}>
              Online: {onlineCount}
            </span>
            |
            <span
              className="userName"
              style={{
                fontWeight: "650",
                color: "#111827",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FaUserCircle style={{ fontSize: "14px" }} />
              {displayName}
            </span>
            |
            <button
              style={styles.logoutButton}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor =
                  styles.logoutButtonHover.backgroundColor;
                e.target.style.borderColor =
                  styles.logoutButtonHover.borderColor;
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "white";
                e.target.style.borderColor = "#d1d5db";
              }}
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>

        <div style={styles.secondRow}>
          <div style={styles.controlsSection}>
            <div style={styles.controlGroup}>
              <label style={styles.label}>Application</label>
              <select
                style={styles.select}
                value={selectedApplication}
                onChange={handleApplicationChange}
                disabled={!isAdmin}
              >
                {Object.entries(APPLICATION_NAMES).map(([key, name]) => (
                  <option key={key} value={key}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.controlGroup}>
              <label style={styles.label}>Department</label>
              <select
                style={styles.select}
                value={isAdmin ? "ADMIN" : selectedDepartment}
                onChange={handleDepartmentChange}
                disabled={!isAdmin}
              >
                {APPLICATION_DEPARTMENTS[selectedApplication].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.rightInfo}>
            <span style={{ fontWeight: "500" }}>Main Menu SIMKOM</span>
            <span style={styles.formBadge}>Form No: 1</span>
            <div
              style={styles.editIconContainer}
              title="Send Feedback"
              onClick={handleOpenFeedback}
              onMouseEnter={(e) => {
                e.currentTarget.style.width =
                  styles.editIconContainerHover.width;
                e.currentTarget.style.justifyContent =
                  styles.editIconContainerHover.justifyContent;
                e.currentTarget.style.paddingLeft =
                  styles.editIconContainerHover.paddingLeft;
                e.currentTarget.querySelector("span").style.opacity =
                  styles.arrowIndicatorVisible.opacity;
                e.currentTarget.querySelector("span").style.width =
                  styles.arrowIndicatorVisible.width;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.width = styles.editIconContainer.width;
                e.currentTarget.style.justifyContent =
                  styles.editIconContainer.justifyContent;
                e.currentTarget.style.paddingLeft =
                  styles.editIconContainer.padding;
                e.currentTarget.querySelector("span").style.opacity =
                  styles.arrowIndicator.opacity;
                e.currentTarget.querySelector("span").style.width =
                  styles.arrowIndicator.width;
              }}
            >
              <FaRegEdit style={styles.editIcon} />
              <span style={styles.arrowIndicator}>
                {">"}
                {">"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {showFeedback && (
        <div
          style={styles.feedbackOverlay}
          onClick={() => setShowFeedback(false)}
        >
          <div
            style={styles.feedbackContainer}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "20px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <FaRegEdit style={{ color: "#2563eb", fontSize: "16px" }} />
                <h3
                  style={{
                    margin: 0,
                    fontSize: "15px",
                    fontWeight: "700",
                    color: "#111827",
                  }}
                >
                  Send Feedback
                </h3>
              </div>
              <button
                onClick={() => setShowFeedback(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "18px",
                  cursor: "pointer",
                  color: "#6b7280",
                  lineHeight: 1,
                }}
              >
                x
              </button>
            </div>
            <div
              style={{
                backgroundColor: "#f8faff",
                border: "1px solid #e0e7ff",
                borderRadius: "8px",
                padding: "12px 16px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <FaUserCircle
                  style={{ fontSize: "32px", color: "#2563eb", flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#111827",
                    }}
                  >
                    {authUser?.emp_name || authUser?.name || "-"}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#6b7280",
                      marginTop: "2px",
                    }}
                  >
                    {authUser?.dept_code || selectedDepartment || "-"}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#9ca3af",
                    textAlign: "right",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      display: "block",
                      marginBottom: "2px",
                    }}
                  >
                    ID
                  </span>
                  <span style={{ fontWeight: "600", color: "#6b7280" }}>
                    {authUser?.emp_id || "-"}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ marginBottom: "14px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Problem Location
              </label>
              <select
                value={feedbackLocation}
                onChange={(e) => setFeedbackLocation(e.target.value)}
                style={{
                  width: "100%",
                  height: "34px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  padding: "0 10px",
                  fontSize: "12px",
                  fontFamily: "inherit",
                  color: feedbackLocation ? "#374151" : "#9ca3af",
                  backgroundColor: "white",
                  boxSizing: "border-box",
                }}
              >
                <option value="">-- Select page --</option>
                {getPageOptions(authUser?.dept_code).map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Describe the issue or feedback
              </label>
              <textarea
                rows={4}
                placeholder="Write your problems or suggestions here..."
                value={feedbackDesc}
                onChange={(e) => setFeedbackDesc(e.target.value)}
                style={{
                  width: "100%",
                  resize: "vertical",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  padding: "10px 12px",
                  fontSize: "12px",
                  fontFamily: "inherit",
                  color: "#374151",
                  outline: "none",
                  boxSizing: "border-box",
                  lineHeight: "1.5",
                }}
              />
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Attach Photo
                <span style={{ fontWeight: "400", color: "#9ca3af" }}>
                  {" "}
                  (optional, max 4)
                </span>
              </label>
              <input
                type="file"
                accept="image/*"
                id="feedback-photo-input"
                style={{ display: "none" }}
                onChange={handlePhotoAdd}
              />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "8px",
                }}
              >
                {feedbackPhotos.map((p, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img
                      src={p.preview}
                      alt={`photo-${i + 1}`}
                      style={{
                        width: "100%",
                        height: "72px",
                        objectFit: "cover",
                        borderRadius: "6px",
                        border: "1px solid #e5e7eb",
                        display: "block",
                      }}
                    />
                    <button
                      onClick={() => handlePhotoRemove(i)}
                      style={{
                        position: "absolute",
                        top: "3px",
                        right: "3px",
                        background: "rgba(0,0,0,0.55)",
                        border: "none",
                        borderRadius: "50%",
                        color: "white",
                        width: "18px",
                        height: "18px",
                        fontSize: "11px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        lineHeight: 1,
                      }}
                    >
                      x
                    </button>
                  </div>
                ))}
                {feedbackPhotos.length < 4 && (
                  <label
                    htmlFor="feedback-photo-input"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "72px",
                      border: "1px dashed #d1d5db",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "11px",
                      color: "#9ca3af",
                      backgroundColor: "#fafafa",
                      gap: "4px",
                    }}
                  >
                    <span style={{ fontSize: "20px", lineHeight: 1 }}>+</span>
                    <span>Add Photo</span>
                  </label>
                )}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
              }}
            >
              <button
                onClick={() => setShowFeedback(false)}
                style={{
                  padding: "7px 18px",
                  border: "1px solid #d1d5db",
                  borderRadius: "5px",
                  backgroundColor: "white",
                  color: "#374151",
                  fontSize: "12px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
              <button
                disabled={isSending}
                onClick={handleSendFeedback}
                style={{
                  padding: "7px 18px",
                  border: "none",
                  borderRadius: "5px",
                  backgroundColor: isSending ? "#93c5fd" : "#2563eb",
                  color: "white",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: isSending ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {isSending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={styles.periodBar}>
        <div style={styles.periodContent}>
          <span style={styles.periodText}>
            Current Period: 2025-07-01 - 2025-09-30
          </span>
          <div style={styles.statusInfo}>
            <span style={styles.statusBadge}>System Online</span> |
            <span>Last Update: 2025-08-01 18:19</span>
          </div>
        </div>
      </div>
      {!sidebarVisible && (
        <div>
          <button
            onClick={onToggleSidebar}
            style={styles.toggleButton}
            onMouseEnter={(e) => handleToggleButtonHover(e, true)}
            onMouseLeave={(e) => handleToggleButtonHover(e, false)}
          >
            <div className="bookmark-tab" style={styles.bookmarkTab}></div>
            <svg style={styles.menuIcon} viewBox="0 0 24 24">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
};

export default Navbar;
