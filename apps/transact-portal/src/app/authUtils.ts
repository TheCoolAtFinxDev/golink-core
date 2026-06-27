// Firebase is not used — we authenticate against the real backend (transact-api).
// This file is kept as a stub to avoid breaking imports.

const _stub = {
  loginUser: (_email: any, _password: any) => Promise.resolve(null),
  registerUser: (_email: any, _password: any) => Promise.resolve(null),
  logout: () => Promise.resolve(true),
  forgetPassword: (_email: any) => Promise.resolve(true),
  setLoggeedInUser: (_user: any) => {},
  getAuthenticatedUser: () => {
    const user = sessionStorage.getItem('authUser');
    return user ? JSON.parse(user) : null;
  },
};

export const initFirebaseBackend = (_config: any) => _stub;
export const getFirebaseBackend = () => _stub;
