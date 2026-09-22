/**
 * ShopSphere — Auth Context
 * Global authentication state management.
 */
import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { authAPI, userAPI } from '../api/client';

const AuthContext = createContext(null);

const initialState = {
  user: null,           // Auth identity (id, email, role)
  profile: null,        // User profile (firstName, lastName, etc.)
  isAuthenticated: false,
  isLoading: true,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload.user, profile: action.payload.profile, isAuthenticated: true, isLoading: false };
    case 'LOGOUT':
      return { ...initialState, isLoading: false };
    case 'SET_PROFILE':
      return { ...state, profile: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize — check for existing session
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }
    (async () => {
      try {
        const [identityRes, profileRes] = await Promise.allSettled([
          authAPI.me(),
          userAPI.getProfile(),
        ]);
        const identity = identityRes.status === 'fulfilled' ? identityRes.value.data : null;
        const profile = profileRes.status === 'fulfilled' ? profileRes.value.data : null;
        if (identity) {
          dispatch({ type: 'SET_USER', payload: { user: identity, profile } });
        } else {
          dispatch({ type: 'LOGOUT' });
        }
      } catch {
        dispatch({ type: 'LOGOUT' });
      }
    })();
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { identity, accessToken, refreshToken } = res.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    // Fetch profile
    let profile = null;
    try {
      const profileRes = await userAPI.getProfile();
      profile = profileRes.data;
    } catch { /* profile may not exist yet */ }

    dispatch({ type: 'SET_USER', payload: { user: identity, profile } });
    return identity;
  }, []);

  const register = useCallback(async (data) => {
    const res = await authAPI.register(data);
    const { identity, accessToken, refreshToken } = res.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    dispatch({ type: 'SET_USER', payload: { user: identity, profile: null } });
    return identity;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try { await authAPI.logout(refreshToken); } catch { /* ignore */ }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    dispatch({ type: 'LOGOUT' });
  }, []);

  const updateProfile = useCallback((profile) => {
    dispatch({ type: 'SET_PROFILE', payload: profile });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
