"use client"
import { useNavigate } from "react-router-dom"
import LogoSimkom from "../assets/images/logo-simkom.png"

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";
const saveAuth = ({ token, user }) => {
  localStorage.setItem("auth_token", token);
  localStorage.setItem("auth_user", JSON.stringify(user));
};

const Button = ({ children, type, style, onMouseEnter, onMouseLeave, onClick }) => (
  <button type={type} style={style} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={onClick}>
    {children}
  </button>
)

const Input = ({ id, type, placeholder, required, style }) => (
  <input id={id} type={type} placeholder={placeholder} required style={style} />
)

const Label = ({ htmlFor, children, style }) => (
  <label htmlFor={htmlFor} style={style}>
    {children}
  </label>
)

const Card = ({ children, style }) => <div style={style}>{children}</div>
const CardHeader = ({ children, className }) => <div className={className}>{children}</div>
const CardTitle = ({ children, style }) => <h2 style={style}>{children}</h2>
const CardDescription = ({ children, style }) => <p style={style}>{children}</p>
const CardContent = ({ children }) => <div>{children}</div>

const LoginPage = () => {
  const navigate = useNavigate()
  const styles = {
    container: {
      minHeight: "100vh",
      backgroundColor: "#f0f2f5",
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "32px",
    },
    card: {
      backgroundColor: "white",
      borderRadius: "12px",
      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 10px -2px rgba(0, 0, 0, 0.05)",
      border: "1px solid #e2e8f0",
      maxWidth: "400px",
      width: "80%",
      padding: "40px",
    },
    logoSection: {
      marginBottom: "40px",
      textAlign: "center",
    },
    logoContainer: {
      backgroundColor: "transparent",
      padding: "0",
      borderRadius: "0",
      width: "120px",
      height: "120px",
      margin: "0 auto 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    logo: {
      marginTop: "60px",
      height: "120%",
      width: "120%",
      objectFit: "contain",
    },
    title: {
      fontSize: "28px",
      fontWeight: "bold",
      color: "#1a202c",
      marginBottom: "8px",
      letterSpacing: "0.025em",
    },
    description: {
      fontSize: "15px",
      color: "#718096",
      marginBottom: "0",
    },
    label: {
      fontSize: "14px",
      fontWeight: "600",
      color: "#2d3748",
      marginBottom: "6px",
      display: "block",
    },
    input: {
      height: "48px",
      border: "1px solid #cbd5e1",
      borderRadius: "8px",
      padding: "0 16px",
      fontSize: "16px",
      backgroundColor: "white",
      fontFamily: "inherit",
      width: "100%",
      boxSizing: "border-box",
    },
    buttonPrimary: {
      backgroundColor: "#2563eb",
      color: "white",
      border: "none",
      padding: "14px 28px",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "16px",
      fontWeight: "600",
      transition: "all 0.2s ease",
      fontFamily: "inherit",
      width: "100%",
      boxSizing: "border-box",
    },
    buttonPrimaryHover: {
      backgroundColor: "#1d4ed8",
      boxShadow: "0 4px 10px -2px rgba(37, 99, 235, 0.3)",
    },
    link: {
      color: "#2563eb",
      textDecoration: "none",
      fontSize: "14px",
      fontWeight: "500",
      transition: "text-decoration 0.2s ease",
    },
    linkHover: {
      textDecoration: "underline",
    },
  }

  const handleButtonHover = (e, isHover) => {
    e.currentTarget.style.backgroundColor = isHover
      ? styles.buttonPrimaryHover.backgroundColor
      : styles.buttonPrimary.backgroundColor
    e.currentTarget.style.boxShadow = isHover ? styles.buttonPrimaryHover.boxShadow : "none"
  }

  const handleLinkHover = (e, isHover) => {
    e.currentTarget.style.textDecoration = isHover ? styles.linkHover.textDecoration : styles.link.textDecoration
  }

  const handleLogin = async () => {
    const username = document.getElementById("username")?.value?.trim();
    const password = document.getElementById("password")?.value?.trim();
    if (!username || !password) { alert("Username/Password wajib diisi"); return; }

    try {
      const r = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await r.json();
      if (!r.ok) { alert(data?.error || "Login gagal"); return; }
      saveAuth(data);              // { token, user }
      navigate("/landing-page");
    } catch (e) {
      alert("Network error");
    }
  };

  return (
    <div style={styles.container}>
      <Card style={styles.card}>
        <CardHeader className="space-y-1">
          <div style={styles.logoSection}>
            <div style={styles.logoContainer}>
              <img
                src={LogoSimkom || "/placeholder.svg?height=48&width=48&query=SIMKOM Logo"}
                alt="SIMKOM Logo"
                style={styles.logo}
              />
            </div>
            <CardTitle style={styles.title}>Login</CardTitle>
            <CardDescription style={styles.description}>Access your account</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <Label htmlFor="username" style={styles.label}>Username</Label>
              <Input id="username" type="username" placeholder="Enter Username" required style={styles.input} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Label htmlFor="password" style={styles.label}>Password</Label>
              </div>
              <Input id="password" type="password" placeholder="Enter Password" required style={styles.input} />
            </div>
            <a
              href=""
              style={styles.link}
              onMouseEnter={(e) => handleLinkHover(e, true)}
              onMouseLeave={(e) => handleLinkHover(e, false)}
            >
              Restart password
            </a>
            <Button
              type="button"
              style={styles.buttonPrimary}
              onMouseEnter={(e) => handleButtonHover(e, true)}
              onMouseLeave={(e) => handleButtonHover(e, false)}
              onClick={handleLogin}
            >
              Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default LoginPage
