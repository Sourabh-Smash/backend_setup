import jwt from "jsonwebtoken";
import { ApiError } from "../uitls/ApiError.js";
import { asyncHandler } from "../uitls/asyncHandler.js";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookie?.accessToken ||
      req.header("Authorization").replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized request!");
    }

    const decodeToken = jwt.decode(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodeToken?._id).select(
      "-password, -refreshToken"
    );
    if (!user) {
      throw new ApiError(401, "Invalid access token!");
    }
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Access Token!");
  }
});
