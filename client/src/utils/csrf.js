export const getCsrfToken = () => {
  const match = document.cookie.match(/(?:^|;\s*)pm_csrf_token=([^;]*)/);

  return match ? decodeURIComponent(match[1]) : null;
};

export const clearCsrfToken = () => {
  document.cookie = "pm_csrf_token=; Max-Age=0; path=/; SameSite=Strict";
};
