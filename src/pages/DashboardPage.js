"use client"

import logoSimkom from "../assets/images/logo-simkom.png"

const DashboardPage = () => {
  const styles = {
    welcomeCard: {
      backgroundColor: "white",
      borderRadius: "8px",
      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
      border: "1px solid #cbd5e1",
      padding: "32px",
    },
    welcomeContent: {
      textAlign: "center",
      maxWidth: "512px",
      margin: "0 auto",
    },
    logoSection: {
      marginBottom: "24px",
    },
    logoContainer: {
      backgroundColor: "#f8fafc",
      padding: "16px",
      borderRadius: "50%",
      width: "80px",
      height: "80px",
      margin: "0 auto 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    logo: {
      height: "48px",
      width: "48px",
      objectFit: "contain",
    },
    welcomeTitle: {
      fontSize: "30px",
      fontWeight: "bold",
      color: "#0f172a",
      marginBottom: "8px",
      letterSpacing: "0.025em",
    },
    welcomeSubtitle: {
      fontSize: "18px",
      color: "#64748b",
      marginBottom: "32px",
    },
    statsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: "24px",
      marginBottom: "32px",
    },
    statCard: {
      backgroundColor: "#f8fafc",
      padding: "16px",
      borderRadius: "8px",
    },
    statValue: {
      fontSize: "24px",
      fontWeight: "bold",
      color: "#0f172a",
      margin: "0 0 4px 0",
    },
    statLabel: {
      fontSize: "14px",
      color: "#64748b",
      margin: 0,
    },
    buttonGroup: {
      display: "flex",
      justifyContent: "center",
      gap: "16px",
    },
    primaryButton: {
      backgroundColor: "#2563eb",
      color: "white",
      border: "none",
      padding: "12px 24px",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "500",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      transition: "all 0.2s ease",
      fontFamily: "inherit",
    },
    primaryButtonHover: {
      backgroundColor: "#1d4ed8",
    },
    secondaryButton: {
      backgroundColor: "white",
      color: "#374151",
      border: "1px solid #d1d5db",
      padding: "12px 24px",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "500",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      transition: "all 0.2s ease",
      fontFamily: "inherit",
    },
    secondaryButtonHover: {
      backgroundColor: "#f3f4f6",
      borderColor: "#9ca3af",
    },
    buttonIcon: {
      width: "16px",
      height: "16px",
      stroke: "currentColor",
      strokeWidth: "2",
      fill: "none",
    },
  }

  const handlePrimaryButtonHover = (e, isHover) => {
    if (isHover) {
      e.target.style.backgroundColor = styles.primaryButtonHover.backgroundColor
    } else {
      e.target.style.backgroundColor = styles.primaryButton.backgroundColor
    }
  }

  const handleSecondaryButtonHover = (e, isHover) => {
    if (isHover) {
      e.target.style.backgroundColor = styles.secondaryButtonHover.backgroundColor
      e.target.style.borderColor = styles.secondaryButtonHover.borderColor
    } else {
      e.target.style.backgroundColor = styles.secondaryButton.backgroundColor
      e.target.style.borderColor = "#d1d5db"
    }
  }

  return (
    <div style={styles.welcomeSection}>
      <div style={styles.welcomeCard}>
        <div style={styles.welcomeContent}>
          <div style={styles.logoSection}>
            <div style={styles.logoContainer}>
              <img
                src={logoSimkom || "/placeholder.svg?height=48&width=48&query=SIMKOM Logo"}
                alt="SIMKOM Logo"
                style={styles.logo}
              />
            </div>
            <h1 style={styles.welcomeTitle}>Welcome to SIMKOM</h1>
            <p style={styles.welcomeSubtitle}>Production Component Management Information System</p>
          </div>

          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statValue}>1,847</div>
              <div style={styles.statLabel}>Total Components</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statValue}>23</div>
              <div style={styles.statLabel}>Production Lines</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statValue}>98.5%</div>
              <div style={styles.statLabel}>Quality Rate</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statValue}>1,247</div>
              <div style={styles.statLabel}>Active Users</div>
            </div>
          </div>

          <div style={styles.buttonGroup}>
            <button
              style={styles.primaryButton}
              onMouseEnter={(e) => handlePrimaryButtonHover(e, true)}
              onMouseLeave={(e) => handlePrimaryButtonHover(e, false)}
            >
              <svg style={styles.buttonIcon} viewBox="0 0 24 24">
                <line x1="12" y1="20" x2="12" y2="10" />
                <line x1="18" y1="20" x2="18" y2="4" />
                <line x1="6" y1="20" x2="6" y2="16" />
              </svg>
              View Dashboard
            </button>
            <button
              style={styles.secondaryButton}
              onMouseEnter={(e) => handleSecondaryButtonHover(e, true)}
              onMouseLeave={(e) => handleSecondaryButtonHover(e, false)}
            >
              <svg style={styles.buttonIcon} viewBox="0 0 24 24">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14,2 14,8 20,8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10,9 9,9 8,9" />
              </svg>
              Generate Report
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage