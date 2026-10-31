const AUTH_COOKIE_NAME = "canteenAuth";
const COOKIE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const isDevelopment = () => process.env.NODE_ENV === "development";

const authCookieOptions = () => ({
  httpOnly: true,
  secure: !isDevelopment(),
  sameSite: isDevelopment() ? "lax" : "none",
  path: "/",
  maxAge: COOKIE_TTL_MS,
});

const readAuthCookie = (req) => {
  const cookieHeader = req.headers.cookie || "";
  const pair = cookieHeader.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${AUTH_COOKIE_NAME}=`));
  if (!pair) return null;
  try {
    return decodeURIComponent(pair.slice(AUTH_COOKIE_NAME.length + 1));
  } catch {
    return null;
  }
};

const setAuthCookie = (res, token) =>
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions());

const clearAuthCookie = (res) => {
  const { maxAge, ...options } = authCookieOptions();
  res.clearCookie(AUTH_COOKIE_NAME, options);
};

module.exports = { AUTH_COOKIE_NAME, authCookieOptions, readAuthCookie, setAuthCookie, clearAuthCookie };
