import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const verifyJwt = asyncHandler(async (req, res, next) => {
  // get access token from request header
  const authHeader = req.headers.authorization || req.headers.Authorization;

  // send request from frontend with header authorization, `Bearer ${token}`
  if (!authHeader?.startsWith("Bearer")) {
    throw new ApiError(401, "Invalid Token Bearer");
  }

  const accessToken = authHeader.split(" ")[1];

  //verify the token
  jwt.verify(
    accessToken,
    process.env.ACCESS_TOKEN_SECRET,
    (err, userDecoded) => {
      if (err) {
        // console.log("//auth error: \n", err?.message);
        throw new ApiError(403, "Expired access token");
      }

      // add 'user' property to req object
      req.user = {
        id: userDecoded?.id,
        name: userDecoded?.name,
        email: userDecoded?.email,
      };

      next();
    }
  );
});

export { verifyJwt };
