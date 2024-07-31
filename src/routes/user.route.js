import {Router} from "express"
import { userRegister, userLogin, refreshTokenRotation, userLogout, allUser, getUser, deleteUsers, blockUsers } from "../controllers/user.controller.js"
import { verifyJwt } from "../middleware/auth.middleware.js"
import { isBlock } from "../middleware/block.middleware.js"
const router = Router()

router.route("/register").post(userRegister) 
router.route("/login").post(userLogin)

// refresh token rotation
router.route("/refresh").get(refreshTokenRotation)

// protected route
router.route("/allUser").get(verifyJwt,isBlock, allUser);
router.route("/").get(verifyJwt,isBlock, getUser);
router.route("/deleteAccount").delete(verifyJwt,isBlock, deleteUsers);
router.route("/blockAccount").put(verifyJwt,isBlock, blockUsers);  //block or unblock
router.route("/logout").get(verifyJwt, userLogout)


export default router