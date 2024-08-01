import db from "../config/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefereshTokens = async (user) => {
  try {
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
      }
    );

    const refreshToken = jwt.sign(
      {
        id: user.id,
      },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
      }
    );

    const [saveUser] = await db.query(
      "UPDATE users SET refreshToken = ? WHERE id = ?",
      [refreshToken, user.id]
    );
    if (saveUser.affectedRows !== 1) {
      throw new ApiError(500, "Failed to store refresh token");
    }
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating referesh and access token"
    );
  }
};

const userRegister = asyncHandler(async (req, res) => {
  // check all field are given or not
  const { name, email, password } = req.body; // multer separate data as req.body and req.file

  if (!name || !email || !password) {
    throw new ApiError(400, "All fields required");
  }

  // user exist or not
  const [existedUser] = await db.query("SELECT * FROM users WHERE email = ?", [
    email,
  ]);

  if (existedUser.length > 0) {
    throw new ApiError(409, "User already Exist");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  //create and save to database
  const [result] = await db.query(
    "INSERT INTO users (name, email, password) VALUES(?, ?, ?)",
    [name, email, hashedPassword]
  );

  if (result.affectedRows !== 1) {
    throw new ApiError(500, "Failed to create user account");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, {}, "User registered Successfully"));
});

const userLogin = asyncHandler(async (req, res) => {
  // check all field are given or not
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "All fields required");
  }

  //check user with the email exist or not
  const [user] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
  if (user.length === 0) {
    throw new ApiError(404, "User does not exist");
  }

  if (user[0]?.block) {
    throw new ApiError(303, "Your account is blocked!");
  }

  //check if he password is valid
  const isPasswordValid = await bcrypt.compare(password, user[0]?.password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password");
  }

  // save refresh token to db and return access and refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
    user[0]
  );

  // option for cookie
  const options = {
    httpOnly: true,
    secure: process.env.DEV_MODE !== "development",
    sameSite: "None", // None for cross-site requests
    maxAge: 24 * 60 * 60 * 1000, // only in milisecond format
  };

  return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: { id: user[0]?.id, name: user[0]?.name, email: user[0]?.email },
          accessToken,
        },
        "User logged In Successfully"
      )
    );
});

const userLogout = asyncHandler(async (req, res) => {
  const [response] = await db.query(
    "UPDATE users SET refreshToken = ? WHERE id=?",
    [null, req?.user?.id]
  );

  if (response?.affectedRows !== 1) {
    throw new ApiError(500, "Failed to logout");
  }

  const options = {
    httpOnly: true,
    secure: process.env.DEV_MODE !== "development",
    sameSite: "None", // None for cross-site requests
  };

  return res
    .status(200)
    .clearCookie("refreshToken", options) //express method
    .json(new ApiResponse(200, {}, "User logged Out"));
});

const allUser = asyncHandler(async (req, res) => {
  const [users] = await db.query(
    "SELECT id, name, email, block, updatedAt FROM users"
  );

  if (users[0].length === 0) {
    throw new ApiError(501, "Something went wrong while getting all users");
  }

  res.json(new ApiResponse(200, users, "All users"));
});

// loged in user info
const getUser = asyncHandler(async (req, res) => {
  const [user] = await db.query(
    "SELECT id, name, email, block, updatedAt FROM users WHERE id = ?",
    [req?.user?.id]
  );

  if (user.length === 0) {
    throw new ApiError(501, "Something went wrong while geting user info");
  }

  res.status(201).json(new ApiResponse(201, { user: user[0] }, "user Info"));
});

const deleteUsers = asyncHandler(async (req, res) => {
  const { userIds } = req.body;
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    throw new ApiError(400, "Invalid user IDs");
  }

  const [result] = await db.query("DELETE FROM users WHERE id IN (?)", [
    userIds,
  ]);

  if (result.affectedRows !== userIds.length) {
    throw new ApiError(500, "Failed to delete all selected users");
  }

  res.status(201).json(new ApiResponse(200, {}, "Users deleted successfully"));
});

// need update
const blockUsers = asyncHandler(async (req, res, next) => {
  const { userIds, block } = req.body;
  if (
    !userIds ||
    !Array.isArray(userIds) ||
    userIds.length === 0 ||
    block === null ||
    block === undefined
  ) {
    throw new ApiError(400, "Invalid user IDs");
  }

  const [result] = await db.query(
    `UPDATE users SET block = ${block} WHERE id IN (?)`,
    [userIds]
  );

  if (result.affectedRows !== userIds.length) {
    throw new ApiError(
      500,
      `Failed to ${block ? "block" : "unblock"}  all selected users`
    );
  }

  res
    .status(201)
    .json(
      new ApiResponse(
        200,
        {},
        `Users ${block ? "blocked" : "unblocked"} successfully`
      )
    );
});

// refresh token rotation and access token generator
const refreshTokenRotation = asyncHandler(async (req, res) => {
  const oldRefreshToken = req.cookies?.refreshToken;

  if (!oldRefreshToken) {
    throw new ApiError(401, "No Refresh Token");
  }

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.DEV_MODE !== "development",
    sameSite: "None", // None for cross-site requests
  });

  //verify the token
  const decodedUser = jwt.verify(
    oldRefreshToken,
    process.env.REFRESH_TOKEN_SECRET,
    (err, userDecoded) => {
      if (err) {
        // console.log("auth error//////////\n", err?.message);
        if (err?.message === "jwt expired") {
          throw new ApiError(403, "Expired RefreshToken token");
        }
        throw new ApiError(403, "Forbidden - Invalid token");
      } else {
        return userDecoded;
      }
    }
  );

  const [user] = await db.query("SELECT * FROM users WHERE id=?", [
    decodedUser.id,
  ]);
  // console.log(user)
  if (user.length === 0) {
    throw new ApiError(401, "User does not exist");
  }
  // console.log(oldRefreshToken !== user?.refreshToken);

  if (oldRefreshToken !== user[0]?.refreshToken) {
    throw new ApiError(403, "Attempt to hack using old refresh token");
  }

  // save refresh token to db and return access and refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
    user[0]
  );

  const options = {
    httpOnly: true,
    secure: process.env.DEV_MODE !== "development",
    sameSite: "None", // None for cross-site requests
    maxAge: 24 * 60 * 60 * 1000, // only in milisecond format
  };

  return res.status(200).cookie("refreshToken", refreshToken, options).json(
    new ApiResponse(
      200,
      {
        accessToken,
      },
      "Access token created from refresh token"
    )
  );
});

export {
  userRegister,
  userLogin,
  refreshTokenRotation,
  userLogout,
  allUser,
  getUser,
  deleteUsers,
  blockUsers,
};
