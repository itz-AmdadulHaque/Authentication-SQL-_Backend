import {Router} from "express"
import { userRegister, userLogin, refreshTokenRotation, userLogout, allUser, getUser, deleteUsers, blockUsers } from "../controllers/user.controller.js"
import { verifyJwt } from "../middleware/auth.middleware.js"
const router = Router()

router.route("/register").post(userRegister) 
router.route("/login").post(userLogin)

// refresh token rotation
router.route("/refresh").get(refreshTokenRotation)

// protected route
router.route("/allUser").get(verifyJwt, allUser, userLogout);
router.route("/").get(verifyJwt, getUser, userLogout);
router.route("/deleteAccount").delete(verifyJwt, deleteUsers, userLogout);
router.route("/blockAccount").put(verifyJwt, blockUsers, userLogout);  //block or unblock
router.route("/logout").get(verifyJwt, userLogout)


export default router