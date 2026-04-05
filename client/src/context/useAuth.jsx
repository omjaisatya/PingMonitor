import { useContext } from "react";
import { AuthContext } from "./AuthContext";

export const useAuth = () => {
  const contextInstance = useContext(AuthContext);

  if (!contextInstance) {
    throw new Error("useAuth hook must be wrapped inside AuthProvider");
  }

  return contextInstance;
};
