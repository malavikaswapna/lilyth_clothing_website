import { useCallback } from 'react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export const useGoogleAuth = () => {
  const { login } = useAuth();

  const signInWithGoogle = useCallback(async () => {
    try {
      // Check if Google API is loaded
      if (!window.google) {
        toast.error('Google services not available');
        return;
      }

      // Initialize Google Sign-In
      await new Promise((resolve) => {
        window.google.accounts.id.initialize({
          client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
          callback: async (response) => {
            try {
              // Decode the JWT token to get user info
              const userInfo = JSON.parse(atob(response.credential.split('.')[1]));
              
              const result = await authAPI.googleAuth({
                googleToken: response.credential,
                firstName: userInfo.given_name,
                lastName: userInfo.family_name,
                email: userInfo.email,
                picture: userInfo.picture
              });

              if (result.data.success) {
                // Set auth state
                localStorage.setItem('token', result.data.token);
                localStorage.setItem('user', JSON.stringify(result.data.user));
                
                // Update auth context (you'll need to add this method)
                await login({ email: userInfo.email, isGoogleAuth: true });
                
                toast.success(result.data.message || 'Welcome!');
                resolve(true);
              }
            } catch (error) {
              toast.error('Google sign-in failed');
              resolve(false);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true
        });

        // Render the sign-in button
        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-button'),
          {
            theme: 'outline',
            size: 'large',
            width: '100%',
            type: 'standard',
            text: 'continue_with'
          }
        );

        resolve();
      });
    } catch (error) {
      console.error('Google auth error:', error);
      toast.error('Failed to initialize Google sign-in');
    }
  }, [login]);

  const promptGoogleSignIn = useCallback(async () => {
    try {
      if (window.google && window.google.accounts) {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // Fallback to click-based sign-in
            const googleButton = document.getElementById('google-signin-button');
            if (googleButton) {
              googleButton.click();
            }
          }
        });
      }
    } catch (error) {
      console.error('Google prompt error:', error);
    }
  }, []);

  return {
    signInWithGoogle,
    promptGoogleSignIn
  };
};