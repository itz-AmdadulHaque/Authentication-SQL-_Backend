import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import db from "../config/db.js";

const isBlock = asyncHandler(async (req, res, next) => {
  const cookies = req.cookies;
  if (!cookies?.refreshToken) return res.sendStatus(204); //No content
  const oldRefreshToken = cookies.refreshToken;

  const [user] = await db.query(
    "SELECT refreshToken, block FROM users WHERE id = ?",
    [req?.user?.id]
  );

  const options = {
    httpOnly: true,
    secure: process.env.DEV_MODE !== "development",
    sameSite: 'None', // None for cross-site requests
  };

  if (user.length === 0) {
    res.clearCookie("refreshToken", options);
    throw new ApiError(401, "User Does not Exist");
  }

  if (oldRefreshToken !== user[0]?.refreshToken) {
    res.clearCookie("refreshToken", options);
    throw new ApiError(401, "Invalid token");
  }

  if (user[0]?.block) {
    res.clearCookie("refreshToken", options);
    throw new ApiError(401, "Your account is Blocked!");
  }
  next();
});

export { isBlock };
