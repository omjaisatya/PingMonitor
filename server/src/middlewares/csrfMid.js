export const csrfProtect = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && authHeader.startsWith("Bearer")) {
    return next();
  }

  const tokenFromCookie = req.cookies.pm_csrf_token;
  const tokenFromHeader = req.headers["x-csrf-token"];

  if (!tokenFromCookie) {
    return res.status(403).json({
      message: "CSRF cookie missing",
    });
  }

  if (!tokenFromHeader) {
    return res.status(403).json({
      message: "CSRF header missing",
    });
  }

  if (tokenFromCookie !== tokenFromHeader) {
    return res.status(403).json({
      message: "Invalid CSRF token",
    });
  }

  next();
};
