// src/routes/PublicRoute.jsx
import { Navigate } from "react-router-dom";
import { isAuthenticated } from "./utils/auth";

const PublicRoute = ({ children }) => {
  return isAuthenticated() ? <Navigate to="/" replace /> : children;
};

export default PublicRoute;
