// src/components/SignIn.jsx - Updated with dark theme
import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import ThemeToggle from "./ThemeToggle";

const useFormValidation = (email, password) => {
  return useMemo(() => {
    const errors = {};

    if (!email) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    return {
      errors,
      isValid: Object.keys(errors).length === 0,
    };
  }, [email, password]);
};

export default function SignIn() {
  const navigate = useNavigate();
  const { signIn, isAuthenticated, loading: authLoading } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});

  const { errors, isValid } = useFormValidation(
    formData.email,
    formData.password
  );

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleInputChange = useCallback(
    field => e => {
      const value = e.target.value;
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));

      if (error) setError("");
    },
    [error]
  );

  const handleInputBlur = useCallback(
    field => () => {
      setTouched(prev => ({
        ...prev,
        [field]: true,
      }));
    },
    []
  );

  const handleSignIn = useCallback(
    async e => {
      e?.preventDefault();

      setTouched({ email: true, password: true });

      if (!isValid) {
        const firstError = errors.email || errors.password;
        setError(firstError);
        return;
      }

      setError("");
      setLoading(true);

      try {
        await signIn(formData.email.trim(), formData.password);
        navigate("/", { replace: true });
      } catch (err) {
        console.error("Sign-in error:", err);

        if (err.message.includes("401") || err.message.includes("Invalid")) {
          setError("Invalid email or password. Please check your credentials.");
        } else if (err.message.includes("Network")) {
          setError(
            "Network error. Please check your connection and try again."
          );
        } else {
          setError(err.message || "Something went wrong. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    },
    [isValid, errors, formData, signIn, navigate]
  );

  const handleKeyPress = useCallback(
    e => {
      if (e.key === "Enter" && !loading) {
        handleSignIn(e);
      }
    },
    [handleSignIn, loading]
  );

  const getFieldError = useCallback(
    field => {
      return touched[field] && errors[field] ? errors[field] : "";
    },
    [touched, errors]
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 dark:bg-gray-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full space-y-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="text-3xl mb-2">🤖</div>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
              Atlas AI
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Sign in to your account
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSignIn}>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email *
              </label>
              <input
                id="email"
                type="email"
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  getFieldError("email")
                    ? "border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500"
                    : "border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                } rounded-md focus:z-10 sm:text-sm`}
                value={formData.email}
                onChange={handleInputChange("email")}
                onBlur={handleInputBlur("email")}
                onKeyPress={handleKeyPress}
                placeholder="Enter your email"
                disabled={loading}
                autoComplete="email"
              />
              {getFieldError("email") && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {getFieldError("email")}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Password *
              </label>
              <input
                id="password"
                type="password"
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  getFieldError("password")
                    ? "border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500"
                    : "border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                } rounded-md focus:z-10 sm:text-sm`}
                value={formData.password}
                onChange={handleInputChange("password")}
                onBlur={handleInputBlur("password")}
                onKeyPress={handleKeyPress}
                placeholder="Enter your password"
                disabled={loading}
                autoComplete="current-password"
              />
              {getFieldError("password") && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {getFieldError("password")}
                </p>
              )}
            </div>

            {error && (
              <div className="bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading || !formData.email || !formData.password}
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                  loading || !formData.email || !formData.password
                    ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed"
                    : "bg-gray-900 dark:bg-indigo-600 hover:bg-gray-800 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-indigo-500"
                }`}
              >
                {loading && (
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                )}
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
