import React, { createContext, useContext, useReducer, useEffect } from "react";
import { authAPI } from "../services/api";
import toast from "react-hot-toast";

const AuthContext = createContext();

const initialState = {
  user: null,
  token: localStorage.getItem("token"),
  isAuthenticated: false,
  loading: true,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case "AUTH_START":
      return { ...state, loading: true };
    case "AUTH_SUCCESS":
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
      };
    case "AUTH_FAIL":
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
      };
    case "LOGOUT":
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
      };
    case "UPDATE_USER":
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (token && storedUser) {
        try {
          // Verify token is still valid
          const response = await authAPI.getProfile();
          dispatch({
            type: "AUTH_SUCCESS",
            payload: {
              user: response.data.user,
              token,
            },
          });
        } catch (error) {
          console.log("Token invalid or expired");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          dispatch({ type: "AUTH_FAIL" });
        }
      } else {
        dispatch({ type: "AUTH_FAIL" });
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials) => {
    try {
      dispatch({ type: "AUTH_START" });
      const response = await authAPI.login(credentials);
      const { user, token } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      dispatch({
        type: "AUTH_SUCCESS",
        payload: { user, token },
      });

      toast.success(`Welcome back, ${user.firstName}!`);

      if (user.role === "admin") {
        return { success: true, isAdmin: true };
      }

      return { success: true, isAdmin: false };
    } catch (error) {
      dispatch({ type: "AUTH_FAIL" });
      const message = error.response?.data?.message || "Login failed";
      toast.error(message);
      return { success: false, message };
    }
  };

  const register = async (userData) => {
    try {
      dispatch({ type: "AUTH_START" });
      const response = await authAPI.register(userData);
      const { user, token } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      dispatch({
        type: "AUTH_SUCCESS",
        payload: { user, token },
      });

      toast.success(`Welcome to LILYTH, ${user.firstName}!`);
      return { success: true };
    } catch (error) {
      dispatch({ type: "AUTH_FAIL" });
      const message = error.response?.data?.message || "Registration failed";
      toast.error(message);
      return { success: false, message };
    }
  };

  // ⬅️ NEW: Google registration method (Register page only)
  const googleRegister = async (userData) => {
    try {
      dispatch({ type: "AUTH_START" });
      const response = await authAPI.googleRegister(userData);
      const { user, token } = response.data;

      // Store in localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      // Update state
      dispatch({
        type: "AUTH_SUCCESS",
        payload: { user, token },
      });

      toast.success(`Welcome to LILYTH, ${user.firstName}!`);
      console.log("Google registration successful:", user);
      return { success: true };
    } catch (error) {
      console.error("Google registration error:", error);
      dispatch({ type: "AUTH_FAIL" });
      const message =
        error.response?.data?.message || "Google registration failed";
      toast.error(message);
      return { success: false, message };
    }
  };

  // ⬅️ NEW: Google login method (Login page only)
  const googleLogin = async (userData) => {
    try {
      dispatch({ type: "AUTH_START" });
      const response = await authAPI.googleLogin(userData);
      const { user, token } = response.data;

      // Store in localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      // Update state
      dispatch({
        type: "AUTH_SUCCESS",
        payload: { user, token },
      });

      toast.success(`Welcome back, ${user.firstName}!`);
      console.log("Google login successful:", user);
      return { success: true };
    } catch (error) {
      console.error("Google login error:", error);
      dispatch({ type: "AUTH_FAIL" });
      const message = error.response?.data?.message || "Google login failed";
      toast.error(message);
      return { success: false, message };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    dispatch({ type: "LOGOUT" });
    toast.success("Logged out successfully");
  };

  const updateUser = (userData) => {
    const updatedUser = { ...state.user, ...userData };
    dispatch({ type: "UPDATE_USER", payload: userData });
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

  const value = {
    ...state,
    login,
    register,
    googleRegister, // ⬅️ NEW: For Register page
    googleLogin, // ⬅️ NEW: For Login page
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
