// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import Cookies from "js-cookie";
import apiService from "../services/apiService";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = Cookies.get("token");
      const storedUser = Cookies.get("user");

      if (storedToken) {
        setToken(storedToken);
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch (e) {
            console.error("Error parsing stored user:", e);
          }
        }

        try {
          const profile = await apiService.getProfile();
          if (profile.success) {
            setUser(profile.data);
          }
        } catch (error) {
          console.error("Token validation failed:", error);
          signOut();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const signIn = async (email, password) => {
    try {
      const response = await apiService.signIn(email, password);

      if (response.success && response.data.token) {
        const { token: newToken, user: userData } = response.data;

        Cookies.set("token", newToken, {
          path: "/",
          secure: process.env.NODE_ENV === "production",
          sameSite: "Lax",
          expires: 30,
        });

        const userInfo = {
          id: userData.id,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
        };

        Cookies.set("user", JSON.stringify(userInfo), {
          path: "/",
          secure: process.env.NODE_ENV === "production",
          sameSite: "Lax",
          expires: 30,
        });

        setToken(newToken);
        setUser(userInfo);

        return response;
      }

      throw new Error("Invalid response format");
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await apiService.signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      Cookies.remove("token");
      Cookies.remove("user");
      setToken(null);
      setUser(null);
    }
  };

  const value = {
    user,
    token,
    loading,
    signIn,
    signOut,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
