"use client";
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

// Hook to use auth anywhere
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);



 
  const login = async (formData) => {
    const res = await fetch("http://localhost:3001/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, message: data.message };
    }

    setUser(data.user);
    setToken(data.token);
    localStorage.setItem("token", data.token);

    return { success: true };
  };

  
  const signup = async (formData) => {
    const res = await fetch("http://localhost:3001/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, message: data.message };
    }

    setUser(data.user);
    setToken(data.token);
    localStorage.setItem("token", data.token);

    return { success: true };
  };

  
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        loading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};