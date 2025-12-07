"use client";

import { useState, useEffect } from "react";
import { clearAuth } from "./lib/auth";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import LandingPage from "./components/LandingPage";

import LoginPage from "./pages/LoginPage";

import ComponentMasterPage from "./pages/mhpage/ComponentMasterPage";

// Halaman SCN-MH (Production Management)
import ProductionMonitoringPage from "./pages/mhpage/ProductionMonitoringPage";
import TargetSchedulePage from "./pages/mhpage/TargetSchedulePage";
import AddTargetSchedulePage from "./pages/mhpage/AddTargetSchedulePage";
import ReceivedLocalSchedulePage from "./pages/mhpage/ReceivedLocalSchedulePage";
import ReturnPartsPage from "./pages/mhpage/ReturnPartsPage";

import LocalSchedulePage from "./pages/logpage/LocalSchedulePage";
import AddLocalSchedulePage from "./pages/logpage/AddLocalSchedulePage";

import IQCLocalPage from "./pages/iqcpage/IQCLocalPage";
import PartsEnquiryIdPage from "./pages/mhpage/PartsEnquiryIdPage";
import AddPartsEnquiryIdPage from "./pages/mhpage/AddPartsEnquiryIdPage";
import AddPartsEnquiryNonIdPage from "./pages/mhpage/AddPartsEnquiryNonIdPage";
import PartsEnquiryNonIdPage from "./pages/mhpage/PartsEnquiryNonIdPage";
import UploadKanbanIdPage from "./pages/mhpage/UploadKanbanIdPage";
import PartsReceivePage from "./pages/mhpage/PartsReceivePage";
import AnnexReceivePage from "./pages/logpage/AnnexReceivePage";
import VendorDetailsPage from "./pages/logpage/VendorDetailsPage";
import AddVendorPage from "./pages/logpage/AddVendorPage";
import PartDetailsPage from "./pages/logpage/PartDetailsPage";
import AddPartsPage from "./pages/logpage/AddPartsPage";

import UserControlPage from "./pages/admin/UserControlPage";
import CreateUserPage from "./pages/admin/CreateUserPage";
import timerService from "./utils/TimerService";

import { getUser as getAuthUser } from "./utils/auth";

const MainLayout = ({
  children,
  toggleSidebar,
  sidebarVisible,
  currentApplication,
  currentDepartment,
  onApplicationChange,
}) => {
  const navbarHeight = 110;

  const styles = {
    container: {
      minHeight: "100vh",
      backgroundColor: "#f9fafb",
      fontFamily: "-apple-system, BlinkMacSystemFont, ...",
    },
    layout: {
      display: "flex",
      transition: "margin-left 0.3s ease",
      marginLeft: sidebarVisible ? "200px" : "20px",
      marginTop: navbarHeight + "px",
    },
    mainContent: {
      flex: 1,
      overflow: "hidden",
    },
  };

  return (
    <div style={styles.container}>
      <Navbar
        onToggleSidebar={toggleSidebar}
        sidebarVisible={sidebarVisible}
        onApplicationChange={onApplicationChange}
        currentApplication={currentApplication}
        currentDepartment={currentDepartment}
      />
      <div style={styles.layout}>
        <Sidebar
          isVisible={sidebarVisible}
          onToggle={toggleSidebar}
          currentApplication={currentApplication}
        />
        <main style={styles.mainContent}>{children}</main>
      </div>
    </div>
  );
};

const Protected = ({ children }) => {
  const u = getAuthUser();
  return u ? children : <Navigate to="/login" replace />;
};

const LayoutHandler = () => {
  const location = useLocation();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [currentApplication, setCurrentApplication] = useState("production");
  const [currentDepartment, setCurrentDepartment] = useState("SCN-MH");

  const authUser = getAuthUser();

  useEffect(() => {
    if (authUser) {
      setCurrentApplication(authUser.dept_app || "production");
      setCurrentDepartment(authUser.dept_code || "SCN-MH");
    }
  }, [authUser?.dept_app, authUser?.dept_code]);

  useEffect(() => {
    const map = {
      "/user-control": { app: "system", dept: "ADMIN" },
      "/create-user": { app: "system", dept: "ADMIN" },
      "/landing-page": {
        app: authUser?.dept_app || "production",
        dept: authUser?.dept_code || "SCN-MH",
      },
    };
    const path = location.pathname;
    const matched = Object.keys(map).find((r) => path.startsWith(r));
    if (matched) {
      setCurrentApplication(map[matched].app);
      setCurrentDepartment(map[matched].dept);
    }
  }, [location.pathname, authUser?.dept_app, authUser?.dept_code]);

  const toggleSidebar = () => setSidebarVisible((v) => !v);
  const handleApplicationChange = (app, dept) => {
    setCurrentApplication(app);
    setCurrentDepartment(dept);
  };

  useEffect(() => {
    const path = location.pathname;
    const routeMapping = {
      // Production Management routes
      "/target-schedule": { app: "production", dept: "SCN-MH" },
      "/control-part": { app: "production", dept: "SCN-MH" },
      "/component-master": { app: "production", dept: "SCN-MH" },
      "/part-enquiry-id": { app: "production", dept: "SCN-MH" },
      "/part-enquiry-non-id": { app: "production", dept: "SCN-MH" },
      "/part-receive": { app: "production", dept: "SCN-MH" },
      "/upload-kanban": { app: "production", dept: "SCN-MH" },
      "/return-parts": { app: "production", dept: "SCN-MH" },

      // Inventory Control routes
      "/local-schedule": { app: "inventory", dept: "SCN-LOG" },
      "/annex-receive": { app: "inventory", dept: "SCN-LOG" },
      "/vendor-details": { app: "inventory", dept: "SCN-LOG" },
      "/part-details": { app: "inventory", dept: "SCN-LOG" },

      // Quality Assurance routes
      "/iqc-local": { app: "quality", dept: "SCN-IQC" },
      "/quality": { app: "quality", dept: "SCN-IQC" },

      // System Management routes
      "/user-control": { app: "system", dept: "ADMIN" },
      "/user-management": { app: "system", dept: "ADMIN" },
      "/system-config": { app: "system", dept: "ADMIN" },

      // Default fallback
      "/dashboard": { app: "production", dept: "SCN-MH" },
    };

    const matchedRoute = Object.keys(routeMapping).find((route) =>
      path.startsWith(route)
    );

    if (matchedRoute) {
      const { app, dept } = routeMapping[matchedRoute];
      setCurrentApplication(app);
      setCurrentDepartment(dept);
    }
  }, [location.pathname]);

  const handleNavigationBasedOnApp = (app) => {
    const defaultRoutes = {
      production: "/target-schedule",
      inventory: "/inventory/stock",
      quality: "/quality/incoming",
    };
  };

  return (
    <MainLayout
      toggleSidebar={toggleSidebar}
      sidebarVisible={sidebarVisible}
      currentApplication={currentApplication}
      currentDepartment={currentDepartment}
      onApplicationChange={handleApplicationChange}
    >
      {location.pathname === "/landing-page" ? (
        <LandingPage currentDepartment={currentDepartment} />
      ) : (
        <div></div>
      )}
      {location.pathname === "/component-master" ? (
        <ComponentMasterPage />
      ) : (
        <div></div>
      )}
      {location.pathname === "/target-schedule" ? (
        <TargetSchedulePage />
      ) : (
        <div></div>
      )}
      {location.pathname === "/production-monitoring" ? (
        <ProductionMonitoringPage />
      ) : (
        <div></div>
      )}
      {location.pathname === "/target-schedule/add" ? (
        <AddTargetSchedulePage />
      ) : (
        <div></div>
      )}
      {location.pathname === "/local-schedule" && <LocalSchedulePage />}
      {location.pathname === "/local-schedule/add" && <AddLocalSchedulePage />}
      {location.pathname === "/vendor-details" && <VendorDetailsPage />}
      {location.pathname === "/vendor-parts/add-vendor" && <AddVendorPage />}
      {location.pathname === "/part-details" && <PartDetailsPage />}
      {location.pathname === "/vendor-parts/add-parts" && <AddPartsPage />}
      {location.pathname === "/received-local" && <ReceivedLocalSchedulePage />}
      {location.pathname === "/iqc-local" && <IQCLocalPage />}

      {location.pathname === "/part-enquiry-id" && <PartsEnquiryIdPage />}
      {location.pathname === "/part-enquiry-id/add" && (
        <AddPartsEnquiryIdPage />
      )}
      {location.pathname === "/part-enquiry-non-id/add" && (
        <AddPartsEnquiryNonIdPage />
      )}
      {location.pathname === "/part-enquiry-id/upload" && (
        <UploadKanbanIdPage />
      )}
      {location.pathname === "/part-enquiry-non-id" && (
        <PartsEnquiryNonIdPage />
      )}
      {location.pathname === "/part-receive" && <PartsReceivePage />}
      {location.pathname === "/annex-receive" && <AnnexReceivePage />}
      {location.pathname === "/return-parts" && <ReturnPartsPage />}

      {location.pathname === "/user-control" && <UserControlPage />}
      {location.pathname === "/create-user" && <CreateUserPage />}
    </MainLayout>
  );
};

const App = () => {
  useEffect(() => {
    if (!sessionStorage.getItem("__boot_cleared")) {
      sessionStorage.setItem("__boot_cleared", "1");
    }
    timerService.start();
    console.log("[App] TimerService started");
    return () => {
      timerService.stop();
      console.log("[App] TimerService stopped");
    };
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route
          path="/*"
          element={
            <Protected>
              <LayoutHandler />
            </Protected>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
