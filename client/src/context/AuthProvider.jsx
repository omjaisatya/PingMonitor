import { useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isSessionResolving, setIsSessionResolving] = useState(true);

  useEffect(() => {
    const restoreSession = () => {
      try {
        const cachedProfile = localStorage.getItem("pm-user");
        const cachedJwt = localStorage.getItem("pm-token");

        if (cachedProfile && cachedJwt) {
          setCurrentUser(JSON.parse(cachedProfile));
        }
      } catch (err) {
        console.error(
          "AuthProvider failed to parse cached session payload ->",
          err,
        );
        // clean up potentially corrupted local storage
        localStorage.removeItem("pm-user");
        localStorage.removeItem("pm-token");
      } finally {
        setIsSessionResolving(false);
      }
    };

    restoreSession();
  }, []);

  const establishSession = (userProfile, jwt) => {
    localStorage.setItem("pm-token", jwt);
    localStorage.setItem("pm-user", JSON.stringify(userProfile));
    setCurrentUser(userProfile);
  };

  const terminateSession = () => {
    localStorage.removeItem("pm-token");
    localStorage.removeItem("pm-user");
    setCurrentUser(null);
  };

  const authState = {
    user: currentUser,
    login: establishSession,
    logout: terminateSession,
    loading: isSessionResolving,
  };

  return (
    <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
  );
};
