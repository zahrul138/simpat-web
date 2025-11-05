"use client";

import { Helmet } from "react-helmet";
import { getUser } from "../utils/auth";

const LandingPage = ({ currentDepartment = "SCN-MH" }) => {
  const user = getUser();
  const dept = user?.dept_code || currentDepartment;
  const styles = {
    pageContainer: {
      minHeight: "20vh",
      backgroundColor: "#f8fafc",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      padding: "20px",
    },
    welcomeText: { fontSize: "24px", fontWeight: "600", color: "#1f2937", margin: "0" },
    departmentText: { fontSize: "16px", color: "#6b7280", margin: "8px 0 0 0" },
  };

  return (
    <div style={styles.pageContainer}>
      <Helmet><title>SIMPAT | Dashboard</title></Helmet>
      <h1 style={styles.welcomeText}>WELCOME TO SIMPAT</h1>
      <p style={styles.departmentText}>YOU LOGIN AS {dept}</p>
    </div>
  );
};

export default LandingPage;
