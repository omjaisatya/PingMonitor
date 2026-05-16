export const getCsrfToken = () => {
  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith("pm_csrf_token="))
      ?.split("=")[1] || null
  );
};

export const clearCsrfToken = () => {
  document.cookie = "pm_csrf_token=; Max-Age=0; path=/; SameSite=Strict";
};
