"use client";

import { useState, useEffect, useMemo } from "react";
import { useLocation, Link } from "react-router-dom";

const Sidebar = ({ isVisible, onToggle, currentApplication = "production" }) => {
  const [expandedItems, setExpandedItems] = useState([]); // single-open: akan diisi max 1 title
  const [subMenuHeights, setSubMenuHeights] = useState({});
  const [prevPathname, setPrevPathname] = useState("");
  const location = useLocation();

  /** ================== ICONS ================== */
  const PackageIcon = ({ size = 12 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16.5 9.4 7.55 4.24" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.29,7 12,12 20.71,7" />
      <line x1="12" y1="22" x2="12" y2="12" />
    </svg>
  );
  const FactoryIcon = ({ size = 12 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M17 18h1" /><path d="M12 18h1" /><path d="M7 18h1" />
    </svg>
  );
  const CalculatorIcon = ({ size = 12 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="16" y1="10" x2="8" y2="10" />
      <line x1="8" y1="14" x2="12" y2="14" />
      <line x1="16" y1="14" x2="16" y2="14" />
      <line x1="8" y1="18" x2="12" y2="18" />
      <line x1="16" y1="18" x2="16" y2="18" />
    </svg>
  );
  const ShieldIcon = ({ size = 12 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
  const FileTextIcon = ({ size = 12 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10,9 9,9 8,9" />
    </svg>
  );
  const BarChartIcon = ({ size = 12 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
  const ChevronRightIcon = ({ size = 12 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9,18 15,12 9,6" />
    </svg>
  );
  const ChevronDownIcon = ({ size = 12 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6,9 12,15 18,9" />
    </svg>
  );
  const XIcon = ({ size = 12 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  /** ================== MENU DATA ================== */
  const getMenuItemsByApplication = (app) => {
    const baseItems = {
      production: [
        {
          title: "Production",
          icon: FactoryIcon,
          isActive:
            location.pathname.startsWith("/target-schedule") ||
            location.pathname.startsWith("/production-monitoring"),
          subItems: [
            { title: "Target Schedule", href: "/target-schedule", icon: PackageIcon },
            { title: "Production Monitoring", href: "/production-monitoring", icon: PackageIcon },
          ],
        },
        {
          title: "Local Vendor",
          icon: PackageIcon,
          isActive: location.pathname.startsWith("/received-local"),
          subItems: [{ title: "Local Schedule", href: "/received-local", icon: PackageIcon }],
        },
        {
          title: "Request Part",
          icon: PackageIcon,
          isActive:
            location.pathname.startsWith("/part-enquiry-id") ||
            location.pathname.startsWith("/part-enquiry-non-id"),
          subItems: [
            { title: "Part Enquiry ID", href: "/part-enquiry-id", icon: PackageIcon },
            { title: "Part Enquiry Non- ID", href: "/part-enquiry-non-id", icon: PackageIcon },
          ],
        },
        {
          title: "Part Receiving",
          icon: PackageIcon,
          isActive: location.pathname.startsWith("/part-receive"),
          subItems: [{ title: "Receive Picking List", href: "/part-receive", icon: PackageIcon }],
        },
        {
          title: "Quality Control",
          icon: PackageIcon,
          isActive: location.pathname.startsWith("/return-parts"),
          subItems: [{ title: "Return Parts", href: "/return-parts", icon: PackageIcon }],
        },
      ],

      inventory: [
        {
          title: "Local Parts",
          icon: FactoryIcon,
          isActive:
            location.pathname.startsWith("/local-schedule") ||
            location.pathname.startsWith("/vendor-details") ||
            location.pathname.startsWith("/part-details") ||
            location.pathname.startsWith("/annex-receive"),
            
          subItems: [
            { title: "Local Schedule", href: "/local-schedule", icon: PackageIcon },
            { title: "Vendor Details", href: "/vendor-details", icon: PackageIcon },
            { title: "Part Details", href: "/part-details", icon: PackageIcon },
            { title: "Receive Request", href: "/annex-receive", icon: PackageIcon },
            
          ],
        },
      ],

      quality: [
        {
          title: "Quality Control",
          icon: ShieldIcon,
          isActive: location.pathname.startsWith("/quality"),
          subItems: [
            { title: "Incoming Inspection", href: "/quality/incoming", icon: ShieldIcon },
            { title: "In-Process Inspection", href: "/quality/in-process", icon: ShieldIcon },
            { title: "Final Inspection", href: "/quality/final", icon: ShieldIcon },
          ],
        },
        {
          title: "Quality Reports",
          icon: FileTextIcon,
          isActive: location.pathname.startsWith("/quality-reports"),
          subItems: [
            { title: "Defect Analysis", href: "/quality-reports/defects", icon: BarChartIcon },
            { title: "Quality Metrics", href: "/quality-reports/metrics", icon: BarChartIcon },
          ],
        },
        {
          title: "Request Enquiry",
          icon: ShieldIcon,
          isActive: location.pathname.startsWith("/request-enquiry"),
          subItems: [
            { title: "Receive", href: "/request-enquiry/receive", icon: PackageIcon },
            { title: "Receive IQC", href: "/request-enquiry/receive-iqc", icon: PackageIcon },
          ],
        },
      ],

      system: [
        {
          title: "Management Control",
          icon: ShieldIcon,
          isActive:
            location.pathname.startsWith("/user-control") ||
            location.pathname.startsWith("/user-management"),
          subItems: [
            { title: "Manage User", href: "/user-control", icon: PackageIcon },
            { title: "User List", href: "/user-management", icon: PackageIcon },
          ],
        },
        {
          title: "System Configuration",
          icon: FileTextIcon,
          isActive: location.pathname.startsWith("/system-config"),
          subItems: [
            { title: "General Settings", href: "/system-config/general", icon: BarChartIcon },
            { title: "Access Control", href: "/system-config/access", icon: BarChartIcon },
          ],
        },
        {
          title: "System Reports",
          icon: CalculatorIcon,
          isActive: location.pathname.startsWith("/system-reports"),
          subItems: [
            { title: "Audit Log", href: "/system-reports/audit", icon: FileTextIcon },
            { title: "System Health", href: "/system-reports/health", icon: BarChartIcon },
          ],
        },
      ],
    };

    return baseItems[app] || baseItems.production;
  };

  const menuItems = useMemo(
    () => getMenuItemsByApplication(currentApplication),
    [location.pathname, currentApplication]
  );

  /** ================== EFFECTS ================== */
  useEffect(() => {
    const heights = {};
    menuItems.forEach((item) => {
      if (item.subItems) heights[item.title] = item.subItems.length * 38;
    });
    setSubMenuHeights(heights);
  }, [menuItems]);

  // SINGLE-OPEN ACCORDION: buka satu, tutup yang lain
  const toggleExpanded = (title) => {
    setExpandedItems((prev) => (prev[0] === title ? [] : [title]));
  };

  useEffect(() => {
    // Auto expand parent menu of current route (single-open)
    const currentParentMenu = menuItems.find(
      (item) => item.subItems && item.subItems.some((sub) => sub.href === location.pathname)
    );

    // Special case: expand Production when on /target-schedule/add
    if (location.pathname === "/target-schedule/add") {
      const productionMenu = menuItems.find((item) => item.title === "Production");
      if (productionMenu) {
        setExpandedItems((prev) => (prev[0] === "Production" ? prev : ["Production"]));
      }
      setPrevPathname(location.pathname);
      return;
    }

    if (location.pathname !== prevPathname && currentParentMenu) {
      setExpandedItems((prev) =>
        prev[0] === currentParentMenu.title ? prev : [currentParentMenu.title]
      );
      setPrevPathname(location.pathname);
    }
  }, [location.pathname, menuItems, prevPathname]);

  // hover helpers
  const handleCloseButtonHover = (e, isHover) => {
    e.currentTarget.style.backgroundColor = isHover ? "#475569" : "transparent";
  };
  const handleMenuButtonHover = (e, isHover, isActive = false) => {
    if (!isActive) e.currentTarget.style.backgroundColor = isHover ? "#475569" : "transparent";
  };
  const handleSubMenuButtonHover = (e, isHover) => {
    const to = e.currentTarget.getAttribute("data-to");
    if (location.pathname !== to) {
      e.currentTarget.style.backgroundColor = isHover ? "#475569" : "transparent";
      e.currentTarget.style.color = isHover ? "white" : "#cbd5e1";
    }
  };

  /** ================== STYLES ================== */
  const navbarHeight = 140;
  const styles = {
    sidebar: {
      width: "180px",
      backgroundColor: "#1e293b",
      color: "white",
      minHeight: `calc(100vh - ${navbarHeight}px)`,
      height: `calc(100vh - ${navbarHeight}px)`,
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
      position: "fixed",
      left: 0,
      top: `${navbarHeight}px`,
      transform: isVisible ? "translateX(0)" : "translateX(-100%)",
      transition: "transform 0.3s ease",
      fontFamily: "-apple-system, BlinkMacSystemFont, ...",
      zIndex: 1000,
      overflowY: "auto",
      borderRadius: "0px 2px 0px 0px",
      flexDirection: "column",
      scrollbarGutter: "stable",
    },
    sidebarHeader: {
      padding: "12px",
      borderBottom: "1px solid #475569",
    },
    headerContent: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerTitle: {
      fontSize: "13px",
      fontWeight: "600",
      margin: 0,
    },
    closeButton: {
      backgroundColor: "transparent",
      border: "none",
      color: "white",
      cursor: "pointer",
      padding: "6px",
      borderRadius: "4px",
      fontSize: "12px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "background-color 0.2s ease",
      fontFamily: "inherit",
    },
    nav: {
      padding: "12px",
      flex: 1,
      overflowY: "auto",
      paddingBottom: "50px",
    },
    menuList: { listStyle: "none", padding: 0, margin: 0 },
    menuItem: { marginBottom: "6px" },
    menuButton: {
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 12px",
      borderRadius: "6px",
      backgroundColor: "transparent",
      border: "none",
      color: "white",
      cursor: "pointer",
      fontSize: "11px",
      fontWeight: "500",
      textDecoration: "none",
      transition: "all 0.2s ease",
      fontFamily: "inherit",
      boxSizing: "border-box",
    },
    menuButtonActive: {
      backgroundColor: "#2563eb",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    },
    menuButtonInactive: { color: "#cbd5e1" },
    menuButtonContent: { display: "flex", alignItems: "center", gap: "8px" },
    icon: { display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    chevron: { color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center" },
    subMenu: {
      marginLeft: "20px",
      overflow: "hidden",
      transition: "max-height 0.6s ease, opacity 0.5s ease",
    },
    subMenuItem: { marginBottom: "3px", marginTop: "3px" },
    subMenuButton: {
      width: "100%",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "6px 8px",
      borderRadius: "6px",
      backgroundColor: "transparent",
      border: "none",
      color: "#cbd5e1",
      cursor: "pointer",
      fontSize: "10px",
      textDecoration: "none",
      fontFamily: "inherit",
      boxSizing: "border-box",
      transition: "all 0.1s ease",
    },
    subMenuButtonActive: {
      fontWeight: "600",
      color: "white",
      backgroundColor: "transparent",
    },
  };

  /** ================== SCROLLBAR CSS INJECT ================== */
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .sidebar-scrollbar::-webkit-scrollbar { width: 6px; }
      .sidebar-scrollbar::-webkit-scrollbar-track { background: transparent; }
      .sidebar-scrollbar::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
      .sidebar-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }
      .sidebar-scrollbar { scrollbar-width: thin; scrollbar-color: #475569 transparent; }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  return (
    <aside style={styles.sidebar} className="sidebar-scrollbar">
      {/* Header */}
      <div style={styles.sidebarHeader}>
        <div style={styles.headerContent}>
          <h2 style={styles.headerTitle}>Navigation</h2>
          <button
            onClick={onToggle}
            style={styles.closeButton}
            onMouseEnter={(e) => handleCloseButtonHover(e, true)}
            onMouseLeave={(e) => handleCloseButtonHover(e, false)}
            aria-label="Close sidebar"
          >
            <XIcon size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <nav style={styles.nav}>
          <ul style={styles.menuList}>
            {menuItems.map((item) => {
              const expanded = expandedItems[0] === item.title; // single-open
              return (
                <li key={item.title} style={styles.menuItem}>
                  {/* Parent (toggle only) */}
                  <button
                    type="button"
                    onClick={() => toggleExpanded(item.title)}
                    style={{
                      ...styles.menuButton,
                      ...(item.isActive ? styles.menuButtonActive : styles.menuButtonInactive),
                    }}
                    onMouseEnter={(e) => handleMenuButtonHover(e, true, item.isActive)}
                    onMouseLeave={(e) => handleMenuButtonHover(e, false, item.isActive)}
                    aria-expanded={expanded}
                    aria-controls={`submenu-${item.title}`}
                  >
                    <div style={styles.menuButtonContent}>
                      <span style={styles.icon}><item.icon size={16} /></span>
                      <span>{item.title}</span>
                    </div>
                    <span style={styles.chevron}>
                      {expanded ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
                    </span>
                  </button>

                  {/* Submenu */}
                  <div
                    id={`submenu-${item.title}`}
                    style={{
                      ...styles.subMenu,
                      maxHeight: expanded ? `${subMenuHeights[item.title] || 0}px` : "0px",
                      opacity: expanded ? 1 : 0,
                    }}
                  >
                    {item.subItems?.map((subItem) => {
                      const active = location.pathname === subItem.href;
                      return (
                        <div key={subItem.title} style={styles.subMenuItem}>
                          <Link
                            to={subItem.href}
                            data-to={subItem.href}
                            style={{
                              ...styles.subMenuButton,
                              ...(active ? styles.subMenuButtonActive : null),
                            }}
                            onMouseEnter={(e) => handleSubMenuButtonHover(e, true)}
                            onMouseLeave={(e) => handleSubMenuButtonHover(e, false)}
                          >
                            <span style={styles.icon}><subItem.icon size={12} /></span>
                            <span>{subItem.title}</span>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
