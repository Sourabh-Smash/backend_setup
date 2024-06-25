import { asyncHandler } from "../uitls/asyncHandler.js";
import { ApiError } from "../uitls/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../uitls/cloudniary.js";
import { ApiResponse } from "../uitls/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
// refreshToken

const generateRefreshTokenAndAccessToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
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
  const existingUserEmail = await User.findOne({ email });
  if (existingUserEmail) {
    throw new ApiError(401, "User with this email alredy exists");
  }
  const existingUserUsername = await User.findOne({ username });
  if (existingUserUsername) {
    throw new ApiError(401, "User with this username alredy exists");
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
    avatar: avatar?.url || "",
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
  const { accessToken, refreshToken } =
    await generateRefreshTokenAndAccessToken(user._id);

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
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
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User loggedIn successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findOneAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
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
  console.log("refresh token:", incomingRefreshToken);
  try {
    const decodeIncomingRefreshToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    console.log("decoded token : ", decodeIncomingRefreshToken);
    const user = await User.findById(decodeIncomingRefreshToken?._id);
    console.log(user);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }
    console.log("user refresh token is : ", user?.refreshToken);
    if (user?.refreshToken !== incomingRefreshToken) {
      throw new ApiError(401, "Refresh token not found login agian");
    }

    const { accessToken, refreshToken } =
      await generateRefreshTokenAndAccessToken(user?._id);
    const options = {
      httpOnly: true,
      secure: true,
    };
    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "refresh token refreshed sucessuflly"
        )
      );
  } catch (error) {
    throw new ApiError(
      401,
      error?.message || "something went wrong while precessing refresh token"
    );
  }
});

const changeCurrentPasswrod = asyncHandler(async (req, res) => {
  // take values from Ui
  // do input validation
  // compate UI password from user password
  // then update password in db

  // take values from Ui
  const { oldPassword, newPassword, confirmNewPassword } = req.body;
  if (
    [oldPassword, newPassword, confirmNewPassword].some(
      (field) => !field || field.trim() === ""
    )
  ) {
    // do input validation
    throw new ApiError(401, "Enter correct input fields");
  }
  if (newPassword !== confirmNewPassword) {
    throw new ApiError(401, "Enter correct confirm password fields");
  }

  // take password from user in db
  const user = await User.findById(req.user?._id);
  // console.log(user);
  if (!user) {
    throw new ApiError(404, "user not found");
  }
  // check if new password entered matches with password in db or not
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  console.log("isPasswordCorrect : ", isPasswordCorrect);
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Enter correct old password");
  }
  // update password in db
  user.password = confirmNewPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id).select(
    "-possword -refreshToken"
  );
  // console.log(user);
  if (!user) {
    throw new ApiError(404, "User not found ");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, user, "User fetched successfully"));
});

const updateUserDetails = asyncHandler(async (req, res) => {
  // receive user detail from backend
  const { fullname, email } = req.body;
  if ([fullname, email].some((field) => !field || field.trim() === "")) {
    throw new ApiError(401, "enter valid fullname and email");
  }
  // receive user from db
  const getUserEmail = await User.findById(req.user?._id);
  if (email === getUserEmail?.email) {
    throw new ApiError(404, "new email should be different from current email");
  }
  const checkEmail = await User.findOne({ email });
  if (checkEmail) {
    throw new ApiError(404, "User with this email already exists");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email,
      },
    },
    {
      new: true,
    }
  ).select("-password");
  // check if db query failed
  if (!user) {
    throw new ApiError(401, "Error receiving User for updating data");
  }
  res
    .status(200)
    .json(
      new ApiResponse(200, { user }, "Email and fullname updated successuflly")
    );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatar = req.file;
  // console.log(req.file);
  if (!avatar) {
    throw new ApiError(404, "avatar not found");
  }
  const avatarOnCloudinary = await uploadOnCloudinary(avatar?.path);
  // console.log(avatarOnCloudinary);
  if (!avatarOnCloudinary) {
    throw new ApiError(404, "cloudinary avatar not found");
  }
  const user = await User.findOneAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatarOnCloudinary?.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");
  if (!user) {
    throw new ApiError(404, "user not found");
  }
  res.status(200).json(new ApiResponse(200, user, "success updated avatar"));
});

const updateUserPhotos = asyncHandler(async (req, res) => {
  const coverImage = req.file;
  // console.log(req.file);
  if (!coverImage) {
    throw new ApiError(404, "coverImage not found");
  }
  const coverImageOnCloudinary = await uploadOnCloudinary(coverImage?.path);
  // console.log(coverImageOnCloudinary);
  if (!coverImageOnCloudinary) {
    throw new ApiError(404, "cloudinary coverImage not found");
  }
  const user = await User.findOneAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImageOnCloudinary?.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");
  if (!user) {
    throw new ApiError(404, "user not found");
  }
  res
    .status(200)
    .json(new ApiResponse(200, user, "success updated coverImage"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "Username is missing");
  }
  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribeTo",
      },
    },
    {
      $addFields: {
        subscriberCount: {
          $size: "$subscribers",
        },
        channelSubscribedToCount: {
          $size: "$subscribeTo",
        },
        isSuscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        subscriberCount: 1,
        channelSubscribedToCount: 1,
        isSuscribed: 1,
      },
    },
  ]);
  console.log(channel);
  if (!channel?.length) {
    throw new ApiError(404, "Cannel doesnt exits");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  //? what do we get in req.user?._id? in this we dont get id we get string , read more about this that how mongoose orm is used here
  const user = await User.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(req.user?._id) },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    fullname: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch history send successfully"
      )
    );
});
export {
  registerUser,
  loginUser,
  logoutUser,
  generateRefreshToken,
  changeCurrentPasswrod,
  getCurrentUser,
  updateUserDetails,
  updateUserAvatar,
  updateUserPhotos,
  getUserChannelProfile,
  getWatchHistory,
};
