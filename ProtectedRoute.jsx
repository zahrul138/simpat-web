// ProtectedRoute.jsx (root simpat-web)
import { Navigate } from "react-router-dom";
import { isAuthenticated } from "./src/utils/auth";
import useActiveCheck from "./src/utils/useActiveCheck";

const ProtectedRoute = ({ children }) => {
  useActiveCheck();
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;