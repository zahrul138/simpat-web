export const getToken = () => sessionStorage.getItem("auth_token");

export const getUser = () => {
  try {
    return JSON.parse(sessionStorage.getItem("auth_user") || "null");
  } catch {
    return null;
  }
};

export const isAuthenticated = () => !!getToken();

export const saveAuth = ({ token, user }) => {
  sessionStorage.setItem("auth_token", token);
  sessionStorage.setItem("auth_user", JSON.stringify(user));
};

export const clearAuth = () => {
  sessionStorage.removeItem("auth_token");
  sessionStorage.removeItem("auth_user");
};