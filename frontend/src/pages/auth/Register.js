//src/pages/auth/Register.js
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/common/Button";
import GoogleSignIn from "../../components/auth/GoogleSignIn";
import BackgroundWrapper from "../../components/common/BackgroundWrapper";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Auth.css";

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register: registerUser, loading } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
  } = useForm();

  const password = watch("password");

  const onSubmit = async (data) => {
    console.log("=== REGISTRATION DEBUG ===");
    console.log("1. Form data:", data);

    try {
      const result = await registerUser({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
      });

      console.log("2. Registration result:", result);
      console.log("3. Result success:", result.success);

      if (result.success) {
        console.log("4. Registration successful");

        // ✅ NEW: Check if this was a guest conversion
        if (result.data?.isConvertedGuest && result.data?.ordersLinked > 0) {
          console.log(
            "5. Guest user converted with orders:",
            result.data.ordersLinked
          );
          toast.success(
            `Welcome back! ${result.data.ordersLinked} previous order${
              result.data.ordersLinked > 1 ? "s" : ""
            } linked to your account.`,
            {
              duration: 5000,
              position: "top-center",
            }
          );
        } else {
          console.log("5. New user registration");
          toast.success(result.message || "Account created successfully!", {
            duration: 4000,
          });
        }

        console.log("6. Navigating to home...");
        navigate("/");
        console.log("7. Navigation complete");
      } else {
        console.log("4. Registration failed:", result.message);
        setError("root", { message: result.message });
        toast.error(result.message || "Registration failed");
      }
    } catch (error) {
      console.error("Registration caught error:", error);
      const errorMessage =
        error.response?.data?.message || "An unexpected error occurred";
      setError("root", { message: errorMessage });
      toast.error(errorMessage);
    }
  };

  return (
    <BackgroundWrapper>
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <button onClick={() => navigate(-1)} className="back-btn">
              <ArrowLeft size={20} />
            </button>
            <h1 className="auth-title">Create Account</h1>
            <div></div>
          </div>

          <div className="auth-content">
            <div className="auth-form-container">
              <div className="auth-welcome">
                <h2>Join Lilyth</h2>
                <p>
                  Create your account to discover fashion that fits your unique
                  style
                </p>
              </div>

              {/* ⬅️ Google Sign Up Button */}
              <GoogleSignIn mode="register" />

              <div className="divider">
                <span>OR</span>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
                {errors.root && (
                  <div className="error-message">{errors.root.message}</div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="firstName" className="form-label">
                      First Name
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      className={`form-control ${
                        errors.firstName ? "error" : ""
                      }`}
                      {...register("firstName", {
                        required: "First name is required",
                        minLength: {
                          value: 2,
                          message: "First name must be at least 2 characters",
                        },
                      })}
                    />
                    {errors.firstName && (
                      <span className="form-error">
                        {errors.firstName.message}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="lastName" className="form-label">
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      className={`form-control ${
                        errors.lastName ? "error" : ""
                      }`}
                      {...register("lastName", {
                        required: "Last name is required",
                        minLength: {
                          value: 2,
                          message: "Last name must be at least 2 characters",
                        },
                      })}
                    />
                    {errors.lastName && (
                      <span className="form-error">
                        {errors.lastName.message}
                      </span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="email" className="form-label">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    className={`form-control ${errors.email ? "error" : ""}`}
                    {...register("email", {
                      required: "Email is required",
                      pattern: {
                        value: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                        message: "Please enter a valid email address",
                      },
                    })}
                  />
                  {errors.email && (
                    <span className="form-error">{errors.email.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="password" className="form-label">
                    Password
                  </label>
                  <div className="password-input">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      className={`form-control ${
                        errors.password ? "error" : ""
                      }`}
                      {...register("password", {
                        required: "Password is required",
                        minLength: {
                          value: 6,
                          message: "Password must be at least 6 characters",
                        },
                      })}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {errors.password && (
                    <span className="form-error">
                      {errors.password.message}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword" className="form-label">
                    Confirm Password
                  </label>
                  <div className="password-input">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      className={`form-control ${
                        errors.confirmPassword ? "error" : ""
                      }`}
                      {...register("confirmPassword", {
                        required: "Please confirm your password",
                        validate: (value) =>
                          value === password || "Passwords do not match",
                      })}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={20} />
                      ) : (
                        <Eye size={20} />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <span className="form-error">
                      {errors.confirmPassword.message}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      {...register("agreeToTerms", {
                        required: "You must agree to the terms and conditions",
                      })}
                    />
                    <span className="checkbox-text">
                      I agree to the{" "}
                      <Link to="/legal/terms" className="inline-link">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link to="/legal/privacy" className="inline-link">
                        Privacy Policy
                      </Link>
                    </span>
                  </label>
                  {errors.agreeToTerms && (
                    <span className="form-error">
                      {errors.agreeToTerms.message}
                    </span>
                  )}
                </div>

                <Button
                  type="submit"
                  className="auth-submit-btn"
                  loading={loading}
                  disabled={loading}
                >
                  Create Account
                </Button>
              </form>

              <div className="auth-footer">
                <p>
                  Already have an account?{" "}
                  <Link to="/login" className="auth-link">
                    Sign In
                  </Link>
                </p>
              </div>
            </div>

            <div className="auth-image">
              <img
                src="https://i.pinimg.com/736x/66/33/88/6633880802d4772e3bbc72446ff3d6e6.jpg"
                alt="Fashion"
                className="auth-bg-image"
              />
            </div>
          </div>
        </div>
      </div>
    </BackgroundWrapper>
  );
};

export default Register;
