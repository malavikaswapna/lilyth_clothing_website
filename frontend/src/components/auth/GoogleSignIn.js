import React, { useState } from "react";
import { signInWithPopup, getIdToken } from "firebase/auth";
import { auth, googleProvider } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const GoogleSignIn = ({
  disabled = false,
  mode = "login", // 'login' or 'register'
  buttonText,
}) => {
  const [loading, setLoading] = useState(false);
  const { googleRegister, googleLogin } = useAuth(); // ⬅️ Use both methods from context
  const navigate = useNavigate();

  // Set default button text based on mode
  const defaultButtonText =
    mode === "register" ? "Sign up with Google" : "Continue with Google";

  const finalButtonText = buttonText || defaultButtonText;

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Firebase ID token
      const idToken = await getIdToken(user, true);

      console.log("Firebase user:", user);
      console.log("ID token received");

      // ⬅️ IMPORTANT: Use different AuthContext method based on mode
      let authResult;
      if (mode === "register") {
        authResult = await googleRegister({ idToken });
      } else {
        authResult = await googleLogin({ idToken });
      }

      if (authResult.success) {
        // Success! AuthContext has already updated state and shown toast
        navigate("/");
      }
      // Error handling is done in AuthContext methods
    } catch (error) {
      console.error("Google sign-in error:", error);

      let errorMessage = "Failed to sign in with Google";

      // Handle Firebase popup errors
      if (error.code) {
        switch (error.code) {
          case "auth/popup-closed-by-user":
            errorMessage = "Sign-in was cancelled";
            break;
          case "auth/popup-blocked":
            errorMessage =
              "Pop-up was blocked. Please allow pop-ups for this site.";
            break;
          case "auth/network-request-failed":
            errorMessage = "Network error. Please check your connection.";
            break;
          case "auth/too-many-requests":
            errorMessage = "Too many attempts. Please try again later.";
            break;
          default:
            errorMessage = `Authentication error: ${error.code}`;
        }
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      className="google-btn"
      onClick={handleGoogleSignIn}
      disabled={disabled || loading}
    >
      {loading ? (
        <div
          className="spinner"
          style={{ width: "20px", height: "20px" }}
        ></div>
      ) : (
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          style={{ marginRight: "8px" }}
        >
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      )}
      {loading ? "Processing..." : finalButtonText}
    </button>
  );
};

export default GoogleSignIn;
