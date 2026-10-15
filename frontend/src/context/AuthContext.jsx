import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getCurrentCustomer, loginCustomer as loginCustomerApi, logoutCustomer as logoutCustomerApi } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const profile = await getCurrentCustomer();
      setCustomer(profile);
      return profile;
    } catch {
      setCustomer(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (credentials) => {
    const data = await loginCustomerApi(credentials);
    try {
      const profile = await getCurrentCustomer();
      setCustomer(profile);
    } catch {
      if (data?.customer) {
        setCustomer(data.customer);
      }
    }
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutCustomerApi();
    } finally {
      setCustomer(null);
    }
  }, []);

  const value = {
    customer,
    loading,
    isAuthenticated: Boolean(customer),
    checkAuth,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
}
