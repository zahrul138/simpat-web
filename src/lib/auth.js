export const saveAuth = ({ token, user }) => {
  sessionStorage.setItem('auth_token', token);
  sessionStorage.setItem('auth_user', JSON.stringify(user));
};

export const getToken = () => sessionStorage.getItem('auth_token');

export const getAuthUser = () => {
  try { 
    return JSON.parse(sessionStorage.getItem('auth_user') || 'null'); 
  }
  catch { 
    return null; 
  }
};

export const clearAuth = () => {
  sessionStorage.removeItem('auth_token');
  sessionStorage.removeItem('auth_user');
};


// export const saveAuth = ({ token, user }) => {
//   localStorage.setItem('auth_token', token);
//   localStorage.setItem('auth_user', JSON.stringify(user));
// };
// export const getToken = () => localStorage.getItem('auth_token');
// export const getAuthUser = () => {
//   try { return JSON.parse(localStorage.getItem('auth_user') || 'null'); }
//   catch { return null; }
// };
// export const clearAuth = () => {
//   localStorage.removeItem('auth_token');
//   localStorage.removeItem('auth_user');
// };