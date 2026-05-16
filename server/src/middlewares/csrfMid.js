export const csrfProtect = (req, res, next) => {
  const tokenFromCookie = req.cookies["pm_csrf_token"];
  const tokenFromHeader = req.headers["x-csrf-token"];

  if (!tokenFromCookie || tokenFromCookie !== tokenFromHeader) {
    return res.status(403).json({ message: "Invalid CSRF token" });
  }
  next();
};
