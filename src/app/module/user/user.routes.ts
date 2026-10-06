import { Router } from "express";
import { userController } from "./user.controller";
import { upload } from "../../lib/multer";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.patch("/update-profile", upload.single("profile-image"), auth(Role.SUPER_ADMIN, Role.ADMIN, Role.DOCTOR, Role.PATIENT), userController.updateImage)
export const UserRoutes = router;
