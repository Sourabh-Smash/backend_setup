import { asyncHandler } from "../uitls/asyncHandler.js";
import { ApiError } from "../uitls/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../uitls/cloudniary.js";
import { ApiResponse } from "../uitls/ApiResponse.js";
import jwt from "jsonwebtoken";
const generateRefreshTokenAndAccessToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refereshToken = user.generateRefreshToken();
    user.refereshToken = refereshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refereshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went woring while generating access and refresh token"
    );
  }
};
const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // do validation
  // check if user already exists
  // check imgs/ avatar
  // upload avatar to cloudnary
  // crate user object in db
  // remove pass & refresh token from response
  // check user already created
  // return response

  //   console.log("req body response : ", req.body);
  const { email, username, fullname, password } = req.body;
  //   console.log("email : ", email);

  // validation
  if (
    [email, username, fullname, password].some(
      (field) => !field || field.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fileds are required");
  }

  // check user already exists
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists ");
  }

  // check for images and avatar
  //   console.log("upload files response : ", req.files);

  let avatarLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.avatar) &&
    req.files.avatar.length > 0
  ) {
    avatarLocalPath = req.files?.avatar[0]?.path;
  }
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files?.coverImage[0]?.path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  // upload images and avatar to coludinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  // create user in db
  const user = await User.create({
    fullname,
    email,
    username: username.toLowerCase(),
    password,
    avatar: avatar?.url,
    coverImage: coverImage?.url || "",
  });

  // remove pass & refresh token from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // check user already created
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while regestring user");
  }
  // return response
  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User successfully Registered!"));
});

const loginUser = asyncHandler(async (req, res) => {
  // receive data from frontend
  // vlaidate those inputs
  // check if users exists
  // validate password
  // send access & refresh token
  // send cookies

  // receive data from frontend
  const { email, username, password } = req.body;
  console.log(req.body);
  console.log("\n values are : ", username, email, password);
  // vlaidate those inputs
  if (
    [email, username, password].some((field) => !field || field.trim() === "")
  ) {
    throw new ApiError(400, "All fileds are required");
  }
  // check if users exists
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User not found!");
  }
  // check if password correct or not
  const isPasswordCorrect = await user.isPasswordCorrect(password);
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid User crediatals");
  }

  // set access and refresh token
  const { accessToken, refereshToken } =
    await generateRefreshTokenAndAccessToken(user._id);

  const loggedInUser = await User.findById(user._id).select(
    "-password,-refreshToken"
  );
  console.log(loggedInUser);
  const options = {
    httpOnly: true,
    secure: true,
  };
  // send cookies with access and refresh token
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refereshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refereshToken },
        "User loggedIn successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findOneAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  res
    .status(200)
    .clearCookie("refreshToken", options)
    .clearCookie("accessToken", options)
    .json(new ApiResponse(200, {}, "User logged out succesfully"));
});

const generateRefreshToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token not found");
  }

  try {
    const decodeIncomingRefreshToken = jwt.verify(
      generateRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodeIncomingRefreshToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (user?.refereshToken !== decodeIncomingRefreshToken) {
      throw new ApiError(401, "Refresh token not found login agian");
    }

    const { accessToken, refereshToken } =
      await generateRefreshTokenAndAccessToken(user?._id);
    const options = {
      httpOnly: true,
      secure: true,
    };
    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refereshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refereshToken },
          "refresh token refreshed sucessuflly"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

export { registerUser, loginUser, logoutUser, generateRefreshToken };
