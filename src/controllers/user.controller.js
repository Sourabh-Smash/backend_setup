import { asyncHandler } from "../uitls/asyncHandler.js";
import { ApiError } from "../uitls/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../uitls/cloudniary.js";
import { ApiResponse } from "../uitls/ApiResponse.js";
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

  console.log("req body response : ", req.body);
  const { email, username, fullname, password } = req.body;
  console.log("email : ", email);

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

export { registerUser };
