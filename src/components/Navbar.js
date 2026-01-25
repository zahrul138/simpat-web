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

// helper auth
const getAuthUser = () => {
  try {
    return JSON.parse(localStorage.getItem("auth_user") || "null");
  } catch {
    return null;
  }
};
const clearAuth = () => {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
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
    currentApplication || "production"
  );
  const [selectedDepartment, setSelectedDepartment] = useState(
    currentDepartment || "SCN-MH"
  );

  const authUser = getAuthUser();
  const isAdmin = authUser?.role === "Admin";
  const displayName = authUser?.emp_name || authUser?.name || "User";

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    timerService.start();

    const unsubscribe = timerService.subscribe((newTime) => {
      setCurrentTime(newTime);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authUser) {
      setSelectedApplication(
        authUser.dept_app || currentApplication || "production"
      );
      setSelectedDepartment(
        authUser.dept_code || currentDepartment || "SCN-MH"
      );
    }
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (currentApplication) setSelectedApplication(currentApplication);
  }, [currentApplication]);

  useEffect(() => {
    if (currentDepartment) setSelectedDepartment(currentDepartment);
  }, [currentDepartment]);

  const applicationDepartments = {
    production: ["SCN-MH"],
    inventory: ["SCN-LOG"],
    quality: ["SCN-IQC"],
    system: ["ADMIN"],
  };

  const applicationNames = {
    production: "Production Management",
    inventory: "Inventory Control",
    quality: "Quality Assurance",
    system: "System Management",
  };

  const handleApplicationChange = (e) => {
    const newApp = e.target.value;
    setSelectedApplication(newApp);
    const defaultDept = applicationDepartments[newApp][0];
    setSelectedDepartment(defaultDept);
    onApplicationChange?.(newApp, defaultDept);
  };

  const handleDepartmentChange = (e) => {
    const newDept = e.target.value;
    setSelectedDepartment(newDept);
    onApplicationChange?.(selectedApplication, newDept);
  };

  const onLogout = () => {
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
    greenBadge: {
      backgroundColor: "#dcfce7",
      color: "#166534",
    },
    blueBadge: {
      backgroundColor: "#dbeafe",
      color: "#1e40af",
    },
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
    controlsSection: {
      display: "flex",
      alignItems: "center",
      gap: "24px",
    },
    controlGroup: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    label: {
      fontSize: "12px",
      fontWeight: "500",
      color: "#374151",
    },
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
    periodText: {
      fontSize: "12px",
      fontWeight: "500",
      color: "#475569",
    },
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
      height: "32px",
      justifyContent: "center",
      boxSizing: "border-box",
    },
    editIconContainerHover: {
      backgroundColor: "#1d4ed8",
      width: "55px",
      justifyContent: "flex-start",
      paddingLeft: "12px",
    },
    editIcon: {
      fontSize: "16px",
      flexShrink: 0,
    },
    arrowIndicator: {
      opacity: 0,
      width: 0,
      transition: "all 0.2s ease",
      fontWeight: "bold",
      overflow: "hidden",
    },
    arrowIndicatorVisible: {
      opacity: 1,
      width: "20px",
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
                  "/placeholder.svg?height=48&width=48&query=SIMKOM Logo" ||
                  "/placeholder.svg" ||
                  "/placeholder.svg"
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
            </span>{" "}
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
              Online: 1247
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
              onClick={onLogout}
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
                <option value="production">
                  {applicationNames.production}
                </option>
                <option value="inventory">{applicationNames.inventory}</option>
                <option value="quality">{applicationNames.quality}</option>
                <option value="system">{applicationNames.system}</option>
              </select>
            </div>
            <div style={styles.controlGroup}>
              <label style={styles.label}>Department</label>
              <select
                style={styles.select}
                value={isAdmin ? "ADMIN" : selectedDepartment}
                onChange={handleDepartmentChange}
                disabled={!isAdmin} // non-admin dikunci
              >
                {applicationDepartments[selectedApplication].map((d) => (
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
