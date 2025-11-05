
export const getToken = () => localStorage.getItem("auth_token");

export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("auth_user") || "null");
  } catch {
    return null;
  }
};

export const isAuthenticated = () => !!getToken();

export const saveAuth = ({ token, user }) => {
  localStorage.setItem("auth_token", token);
  localStorage.setItem("auth_user", JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
};
