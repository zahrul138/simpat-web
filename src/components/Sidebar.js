"use client";

import { useState, useEffect, useMemo } from "react";
import { useLocation, Link } from "react-router-dom";

const Sidebar = ({
  isVisible,
  onToggle,
  currentApplication = "production",
}) => {
  const [expandedItems, setExpandedItems] = useState([]);
  const [subMenuHeights, setSubMenuHeights] = useState({});
  const [prevPathname, setPrevPathname] = useState("");
  const location = useLocation();

  const PackageIcon = ({ size = 12 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M16.5 9.4 7.55 4.24" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.29,7 12,12 20.71,7" />
      <line x1="12" y1="22" x2="12" y2="12" />
    </svg>
  );
  const FactoryIcon = ({ size = 12 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M17 18h1" />
      <path d="M12 18h1" />
      <path d="M7 18h1" />
    </svg>
  );
  const CalculatorIcon = ({ size = 12 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
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
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
  const FileTextIcon = ({ size = 12 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10,9 9,9 8,9" />
    </svg>
  );
  const BarChartIcon = ({ size = 12 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
  const ChevronRightIcon = ({ size = 12 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="9,18 15,12 9,6" />
    </svg>
  );
  const ChevronDownIcon = ({ size = 12 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="6,9 12,15 18,9" />
    </svg>
  );
  const XIcon = ({ size = 12 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  // Production icons
  const CalendarIcon = ({ size = 12 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );

  const MonitorIcon = ({ size = 12 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );

  const SearchIcon = ({ size = 12 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );

  const BadgeIcon = ({ size = 12 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3.85 8.75a4 4 0 0 0 4.12-4.75A4 4 0 0 1 12 4a4 4 0 0 1 3.97 3a4 4 0 0 0 4.12 4.75" />
      <path d="M16 14.15a7 7 0 1 1-8 0" />
    </svg>
  );

  const QuestionIcon = ({ size = 12 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );

  const TruckIcon = ({ size = 12 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="1" y="6" width="22" height="12" rx="1" />
      <path d="M7 12h10M17 12v4M7 16h10" />
      <circle cx="5.5" cy="19.5" r="2.5" />
      <circle cx="18.5" cy="19.5" r="2.5" />
    </svg>
  );

  const InboxIcon = ({ size = 12 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="22 12 18 12 15 21 9 21 6 12 2 12" />
      <path d="M9 11V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v5" />
    </svg>
  );

  const CheckIcon = ({ size = 12 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );

  const UndoIcon = ({ size = 12 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
    </svg>
  );

  // Inventory icons
  const WarehouseIcon = ({ size = 12 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
      <polyline points="3 9 21 9" />
    </svg>
  );

  const ClockIcon = ({ size = 12 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );

  const ShipIcon = ({ size = 12 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M2 21c.6.5 1.2 1 2.5 1h15c1.3 0 1.9-.5 2.5-1M2 19h20M17 21v-4M7 21v-4M12 21v-4" />
      <path d="M20.92 5.64l-10-3.07a3 3 0 0 0-1.84 0l-10 3.07A2 2 0 0 0 2 7.5V13a8 8 0 0 0 16 0V7.5a2 2 0 0 0-1.08-1.86z" />
    </svg>
  );

  const DatabaseIcon = ({ size = 12 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5c0 1.657 4.03 3 9 3s9-1.343 9-3" />
      <path d="M3 5v8c0 1.657 4.03 3 9 3s9-1.343 9-3V5" />
      <path d="M3 13c0 1.657 4.03 3 9 3s9-1.343 9-3" />
    </svg>
  );

  const InfoIcon = ({ size = 12 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );

  const BuildingIcon = ({ size = 12 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
      <rect x="5" y="5" width="2" height="2" />
      <rect x="12" y="5" width="2" height="2" />
      <rect x="17" y="5" width="2" height="2" />
    </svg>
  );

  const MapPinIcon = ({ size = 12 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );

  const EyeIcon = ({ size = 12 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  // System icons
  const UsersIcon = ({ size = 12 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );

  const SettingsIcon = ({ size = 12 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24" />
    </svg>
  );

  const LockIcon = ({ size = 12 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );

  const ScrollIcon = ({ size = 12 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="16" y2="14" />
    </svg>
  );

  const HeartIcon = ({ size = 12 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );

  const SlidersIcon = ({ size = 12 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <circle cx="4" cy="17.5" r="1.5" />
      <circle cx="12" cy="10.5" r="1.5" />
      <circle cx="20" cy="14.5" r="1.5" />
    </svg>
  );

  // Helper function to check if path matches, including add sub-routes
  const isPathActive = (basePath) => {
    return (
      location.pathname === basePath ||
      location.pathname.startsWith(basePath + "/")
    );
  };

  // Helper function untuk mengecek apakah path yang sedang aktif termasuk parent atau child (add) pages
  const isParentOrChildActive = (basePath) => {
    // Mapping khusus untuk path add yang tidak mengikuti pola standard basePath/add
    const addPathMapping = {
      "/part-details": "/add-parts",
      "/vendor-details": "/add-vendor",
    };

    return (
      location.pathname === basePath ||
      location.pathname === basePath + "/add" ||
      location.pathname === addPathMapping[basePath] ||
      location.pathname.startsWith(basePath + "/")
    );
  };

  const getMenuItemsByApplication = (app) => {
    const baseItems = {
      production: [
        {
          title: "Production",
          icon: FactoryIcon,
          isActive:
            isPathActive("/target-schedule") ||
            isPathActive("/production-monitoring"),
          subItems: [
            {
              title: "Target Schedule",
              href: "/target-schedule",
              icon: CalendarIcon,
            },
            {
              title: "Production Monitoring",
              href: "/production-monitoring",
              icon: MonitorIcon,
            },
          ],
        },
        {
          title: "Local Vendor",
          icon: TruckIcon,
          isActive: location.pathname.startsWith("/mh-local-schedule"),
          subItems: [
            {
              title: "Local Schedule",
              href: "/mh-local-schedule",
              icon: ClockIcon,
            },
          ],
        },
        {
          title: "Request Part",
          icon: SearchIcon,
          isActive:
            location.pathname.startsWith("/part-enquiry-id") ||
            location.pathname.startsWith("/part-enquiry-non-id"),
          subItems: [
            {
              title: "Part Enquiry ID",
              href: "/part-enquiry-id",
              icon: BadgeIcon,
            },
            {
              title: "Part Enquiry Non- ID",
              href: "/part-enquiry-non-id",
              icon: QuestionIcon,
            },
          ],
        },
        {
          title: "Part Receiving",
          icon: InboxIcon,
          isActive: location.pathname.startsWith("/part-receive"),
          subItems: [
            {
              title: "Receive Picking List",
              href: "/part-receive",
              icon: PackageIcon,
            },
          ],
        },
        {
          title: "Quality Control",
          icon: ShieldIcon,
          isActive: location.pathname.startsWith("/return-parts"),
          subItems: [
            { title: "Return Parts", href: "/return-parts", icon: UndoIcon },
          ],
        },
      ],

      inventory: [
        {
          title: "Local Parts",
          icon: WarehouseIcon,
          isActive:
            isParentOrChildActive("/local-schedule") ||
            isParentOrChildActive("/oversea-schedule") ||
            isParentOrChildActive("/part-details") ||
            isParentOrChildActive("/vendor-details") ||
            isParentOrChildActive("/vendor-placement") ||
            isPathActive("/annex-receive") ||
            isPathActive("/stock-overview") ||
            isPathActive("/storage-inventory"),

          subItems: [
            {
              title: "Local Schedule",
              href: "/local-schedule",
              icon: ClockIcon,
            },
            {
              title: "Oversea Schedule",
              href: "/oversea-schedule",
              icon: ShipIcon,
            },
            {
              title: "Storage Inventory",
              href: "/storage-inventory",
              icon: DatabaseIcon,
            },
            {
              title: "Part Details",
              href: "/part-details",
              icon: InfoIcon,
            },
            {
              title: "Vendor Details",
              href: "/vendor-details",
              icon: BuildingIcon,
            },
            {
              title: "Vendor Placement",
              href: "/vendor-placement",
              icon: MapPinIcon,
            },
            {
              title: "Stock Overview",
              href: "/stock-overview",
              icon: EyeIcon,
            },
            {
              title: "Receive Request",
              href: "/annex-receive",
              icon: InboxIcon,
            },
          ],
        },
      ],

      quality: [
        {
          title: "Local Schedule",
          icon: ClockIcon,
          isActive:
            isPathActive("/qc-local-schedule") ||
            isPathActive("/qc-part"),

          subItems: [
            {
              title: "Local Schedule",
              href: "/qc-local-schedule",
              icon: CalendarIcon,
            },
            {
              title: "Quality Parts",
              href: "/qc-part",
              icon: CheckIcon,
            },
          ],
        },
      ],

      system: [
        {
          title: "Management Control",
          icon: LockIcon,
          isActive:
            isPathActive("/user-control") ||
            isPathActive("/user-management"),
          subItems: [
            { title: "Manage User", href: "/user-control", icon: UsersIcon },
            { title: "User List", href: "/user-management", icon: ScrollIcon },
          ],
        },
        {
          title: "System Configuration",
          icon: SettingsIcon,
          isActive: isPathActive("/system-config"),
          subItems: [
            {
              title: "General Settings",
              href: "/system-config/general",
              icon: SlidersIcon,
            },
            {
              title: "Access Control",
              href: "/system-config/access",
              icon: LockIcon,
            },
          ],
        },
        {
          title: "System Reports",
          icon: BarChartIcon,
          isActive: isPathActive("/system-reports"),
          subItems: [
            {
              title: "Audit Log",
              href: "/system-reports/audit",
              icon: ScrollIcon,
            },
            {
              title: "System Health",
              href: "/system-reports/health",
              icon: HeartIcon,
            },
          ],
        },
      ],
    };

    return baseItems[app] || baseItems.production;
  };

  const menuItems = useMemo(
    () => getMenuItemsByApplication(currentApplication),
    [location.pathname, currentApplication],
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
      (item) =>
        item.subItems &&
        item.subItems.some((sub) => sub.href === location.pathname || location.pathname === sub.href + "/add"),
    );

    // Special case: expand Production when on /target-schedule/add
    if (location.pathname === "/target-schedule/add") {
      const productionMenu = menuItems.find(
        (item) => item.title === "Production",
      );
      if (productionMenu) {
        setExpandedItems((prev) =>
          prev[0] === "Production" ? prev : ["Production"],
        );
      }
      setPrevPathname(location.pathname);
      return;
    }

    if (location.pathname !== prevPathname && currentParentMenu) {
      setExpandedItems((prev) =>
        prev[0] === currentParentMenu.title ? prev : [currentParentMenu.title],
      );
      setPrevPathname(location.pathname);
    }
  }, [location.pathname, menuItems, prevPathname]);

  // hover helpers
  const handleCloseButtonHover = (e, isHover) => {
    e.currentTarget.style.backgroundColor = isHover ? "#475569" : "transparent";
  };
  const handleMenuButtonHover = (e, isHover, isActive = false) => {
    if (!isActive)
      e.currentTarget.style.backgroundColor = isHover
        ? "#475569"
        : "transparent";
  };

  const handleSubMenuButtonHover = (e, isHover) => {
    const to = e.currentTarget.getAttribute("data-to");
    const isActive = location.pathname === to || location.pathname === to + "/add";

    if (isActive) {
      e.currentTarget.style.backgroundColor = "#475569";
      e.currentTarget.style.color = "white";
    } else {
      e.currentTarget.style.backgroundColor = isHover
        ? "#475569"
        : "transparent";
      e.currentTarget.style.color = isHover ? "white" : "#cbd5e1";
    }
  };

  useEffect(() => {
    const resetSubMenuButtons = () => {
      const buttons = document.querySelectorAll("[data-to]");
      buttons.forEach((button) => {
        const href = button.getAttribute("data-to");
        const isActive = location.pathname === href || location.pathname === href + "/add";

        if (!isActive) {
          button.style.backgroundColor = "transparent";
          button.style.color = "#cbd5e1";
        } else {
          button.style.backgroundColor = "#475569";
          button.style.color = "white";
        }
      });
    };
    resetSubMenuButtons();
  }, [location.pathname]);

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
    icon: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    chevron: {
      color: "#94a3b8",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
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
      backgroundColor: "#475569",
    },
  };

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
    return () => {
      document.head.removeChild(style);
    };
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
              const expanded = expandedItems[0] === item.title;
              return (
                <li key={item.title} style={styles.menuItem}>
                  {/* Parent (toggle only) */}
                  <button
                    type="button"
                    onClick={() => toggleExpanded(item.title)}
                    style={{
                      ...styles.menuButton,
                      ...(item.isActive
                        ? styles.menuButtonActive
                        : styles.menuButtonInactive),
                    }}
                    onMouseEnter={(e) =>
                      handleMenuButtonHover(e, true, item.isActive)
                    }
                    onMouseLeave={(e) =>
                      handleMenuButtonHover(e, false, item.isActive)
                    }
                    aria-expanded={expanded}
                    aria-controls={`submenu-${item.title}`}
                  >
                    <div style={styles.menuButtonContent}>
                      <span style={styles.icon}>
                        <item.icon size={16} />
                      </span>
                      <span>{item.title}</span>
                    </div>
                    <span style={styles.chevron}>
                      {expanded ? (
                        <ChevronDownIcon size={14} />
                      ) : (
                        <ChevronRightIcon size={14} />
                      )}
                    </span>
                  </button>

                  {/* Submenu */}
                  <div
                    id={`submenu-${item.title}`}
                    style={{
                      ...styles.subMenu,
                      maxHeight: expanded
                        ? `${subMenuHeights[item.title] || 0}px`
                        : "0px",
                      opacity: expanded ? 1 : 0,
                    }}
                  >
                    {item.subItems?.map((subItem) => {
                      const active = location.pathname === subItem.href || location.pathname === subItem.href + "/add";
                      return (
                        <div key={subItem.title} style={styles.subMenuItem}>
                          <Link
                            to={subItem.href}
                            data-to={subItem.href}
                            style={{
                              ...styles.subMenuButton,
                              ...(active ? styles.subMenuButtonActive : null),
                            }}
                            onMouseEnter={(e) =>
                              handleSubMenuButtonHover(e, true)
                            }
                            onMouseLeave={(e) =>
                              handleSubMenuButtonHover(e, false)
                            }
                          >
                            <span style={styles.icon}>
                              <subItem.icon size={12} />
                            </span>
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
