/**
 * Authentication helpers and token persistence utilities.
 */
export {
  getAuthToken,
  setAuthToken,
  getActiveBusinessId,
  setActiveBusinessId,
} from "./api/client";

export {
  authApi,
  isUserAuthenticated,
  getStoredUser,
  getStoredBusiness,
  setStoredSession,
  updateStoredBusiness,
} from "./api/authApi";
