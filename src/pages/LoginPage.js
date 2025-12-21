"use client";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LogoSimkom from "../assets/images/logo-simkom.png";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";
const saveAuth = ({ token, user }) => {
  localStorage.setItem("auth_token", token);
  localStorage.setItem("auth_user", JSON.stringify(user));
};

const Button = ({
  children,
  type,
  style,
  onMouseEnter,
  onMouseLeave,
  onClick,
}) => (
  <button
    type={type}
    style={style}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    onClick={onClick}
  >
    {children}
  </button>
);

const Input = ({ id, type, placeholder, required, style, onKeyPress, name, value, onChange }) => (
  <input 
    id={id} 
    type={type} 
    placeholder={placeholder} 
    required 
    style={style} 
    onKeyPress={onKeyPress}
    name={name}
    value={value}
    onChange={onChange}
  />
);

const Label = ({ htmlFor, children, style }) => (
  <label htmlFor={htmlFor} style={style}>
    {children}
  </label>
);

const Card = ({ children, style }) => <div style={style}>{children}</div>;
const CardHeader = ({ children, className }) => (
  <div className={className}>{children}</div>
);
const CardTitle = ({ children, style }) => <h2 style={style}>{children}</h2>;
const CardDescription = ({ children, style }) => (
  <p style={style}>{children}</p>
);
const CardContent = ({ children }) => <div>{children}</div>;

const LoginPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });

  const styles = {
    container: {
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "32px",
      minHeight: "100vh",
      boxSizing: "border-box",
      width: "100%",
    },
    card: {
      backgroundColor: "white",
      borderRadius: "12px",
      boxShadow:
        "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 10px -2px rgba(0, 0, 0, 0.05)",
      border: "1px solid #e2e8f0",
      maxWidth: "300px",
      width: "80%",
      padding: "40px",
    },
    logoSection: {
      textAlign: "center",
    },
    logoContainer: {
      backgroundColor: "transparent",
      padding: "0",
      borderRadius: "0",
      width: "120px",
      height: "120px",
      margin: "0 auto 0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    logo: {
      marginTop: "40px",
      height: "100%",
      width: "100%",
      objectFit: "contain",
    },
    title: {
      fontSize: "28px",
      fontWeight: "bold",
      color: "#1a202c",
      marginBottom: "14px",
      letterSpacing: "0.025em",
    },
    description: {
      fontSize: "15px",
      color: "#718096",
      marginBottom: "10px",
    },
    label: {
      fontSize: "14px",
      fontWeight: "600",
      color: "#2d3748",
      display: "block",
    },
    input: {
      height: "35px",
      border: "1px solid #cbd5e1",
      borderRadius: "8px",
      padding: "0 16px",
      fontSize: "16px",
      backgroundColor: "white",
      fontFamily: "inherit",
      width: "100%",
      boxSizing: "border-box",
    },
    passwordContainer: {
      position: "relative",
      width: "100%",
    },
    passwordInput: {
      height: "35px",
      border: "1px solid #cbd5e1",
      borderRadius: "8px",
      padding: "0 40px 0 16px", // Extra padding untuk icon mata
      fontSize: "16px",
      backgroundColor: "white",
      fontFamily: "inherit",
      width: "100%",
      boxSizing: "border-box",
    },
    toggleButton: {
      position: "absolute",
      right: "10px",
      top: "50%",
      transform: "translateY(-50%)",
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "4px",
      color: "#64748b",
      fontSize: "16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "color 0.2s ease",
    },
    toggleButtonHover: {
      color: "#2563eb",
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
  };

  const handleButtonHover = (e, isHover) => {
    e.currentTarget.style.backgroundColor = isHover
      ? styles.buttonPrimaryHover.backgroundColor
      : styles.buttonPrimary.backgroundColor;
    e.currentTarget.style.boxShadow = isHover
      ? styles.buttonPrimaryHover.boxShadow
      : "none";
  };

  const handleToggleHover = (e, isHover) => {
    e.currentTarget.style.color = isHover
      ? styles.toggleButtonHover.color
      : styles.toggleButton.color;
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleLogin = async (event) => {
    // Mencegah form submit default
    if (event) event.preventDefault();
    
    const username = formData.username.trim();
    const password = formData.password.trim();
    
    if (!username || !password) {
      alert("Username/Password wajib diisi");
      return;
    }

    try {
      const r = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await r.json();
      if (!r.ok) {
        alert(data?.error || "Login gagal");
        return;
      }
      saveAuth(data);
      navigate("/landing-page");
    } catch (e) {
      alert("Network error");
    }
  };

  // Handler untuk tombol Enter di keyboard
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin(e);
    }
  };

  return (
    <div style={{ backgroundColor: "#f0f2f5" }}>
      <div style={styles.container}>
        <Card style={styles.card}>
          <CardHeader className="space-y-1">
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
              <CardTitle style={styles.title}>Login</CardTitle>
              <CardDescription style={styles.description}>
                Access your account
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form 
              onSubmit={handleLogin}
              style={{ display: "flex", flexDirection: "column", gap: "24px" }}
            >
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                <Label htmlFor="username" style={styles.label}>
                  Username
                </Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Enter Username"
                  required
                  style={styles.input}
                  onKeyPress={handleKeyPress}
                  value={formData.username}
                  onChange={handleInputChange}
                />
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Label htmlFor="password" style={styles.label}>
                    Password
                  </Label>
                </div>
                <div style={styles.passwordContainer}>
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter Password"
                    required
                    style={styles.passwordInput}
                    onKeyPress={handleKeyPress}
                    value={formData.password}
                    onChange={handleInputChange}
                  />
                  <button
                    type="button"
                    style={styles.toggleButton}
                    onClick={togglePasswordVisibility}
                    onMouseEnter={(e) => handleToggleHover(e, true)}
                    onMouseLeave={(e) => handleToggleHover(e, false)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      // Icon mata tertutup (hide)
                      <svg 
                        width="15" 
                        height="15" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                      >
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      // Icon mata terbuka (show)
                      <svg 
                        width="15" 
                        height="15" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                style={styles.buttonPrimary}
                onMouseEnter={(e) => handleButtonHover(e, true)}
                onMouseLeave={(e) => handleButtonHover(e, false)}
              >
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;