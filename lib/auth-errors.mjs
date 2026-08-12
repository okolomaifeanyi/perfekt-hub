export function mapSupabaseAuthError(error) {
  if (!error || !error.code) {
    return "An unexpected error occurred. Please try again.";
  }

  switch (error.code) {
    case "auth/email-already-in-use":
      return "This email address is already registered. Please use a different one or log in.";
    case "auth/invalid-email":
      return "The email address is not valid. Please check the format.";
    case "auth/operation-not-allowed":
      return "Email/password login is not enabled for this project. Please contact support.";
    case "auth/weak-password":
      return "The password is too weak. Please choose a stronger password (at least 6 characters, with letters, numbers, and symbols).";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    case "auth/user-not-found":
      return "No account found with this email. Please check your spelling or sign up.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/too-many-requests":
      return "Too many failed login attempts. Please try again later.";
    case "auth/network-request-failed":
      return "A network error occurred. Please check your internet connection and try again.";
    case "auth/popup-closed-by-user":
      return "Authentication process cancelled. Please try again.";
    case "auth/cancelled-popup-request":
      return "Login cancelled. Please try again.";
    case "auth/requires-recent-login":
      return "This operation requires re-authentication. Please log in again.";
    case "auth/invalid-credential":
      return "Invalid login credentials. Please check your email and password.";
    case "auth/credential-already-in-use":
      return "This credential (e.g., Google account) is already linked to another user.";
    case "auth/account-exists-with-different-credential":
      return "An account with this email already exists but with a different login method. Please try logging in with the original method.";
    default:
      return "An unknown error occurred. Please try again later.";
  }
}
