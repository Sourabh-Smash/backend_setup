import { Router } from "express";
import {
  loginUser,
  logoutUser,
  registerUser,
  generateRefreshToken,
  changeCurrentPasswrod,
  getCurrentUser,
  updateUserDetails,
  updateUserAvatar,
  updateUserPhotos,
  getUserChannelProfile,
  getWatchHistory,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);
router.route("/login").post(loginUser);

// secure routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(generateRefreshToken);
router.route("/change-password").get(verifyJWT, changeCurrentPasswrod);
router.route("/get-user").get(verifyJWT, getCurrentUser);
router.route("/update-user-detail").get(verifyJWT, updateUserDetails); // use patch instaed of get or post
router
  .route("/update-user-avatar")
  .get(verifyJWT, upload.single("avatar"), updateUserAvatar); // use patch
router
  .route("/update-user-coverimage")
  .get(verifyJWT, upload.single("coverImage"), updateUserPhotos); // use patch

router.route("/c/:username").get(verifyJWT, getUserChannelProfile);
router.route("/history").get(verifyJWT, getWatchHistory);
export default router;
