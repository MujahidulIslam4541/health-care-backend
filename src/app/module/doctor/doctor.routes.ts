import { Router } from "express";

import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { DoctorController } from "./doctor.controller";
import { upload } from "../../lib/multer";

const router = Router();

router.post("/apply-doctor", upload.fields([
    {
        name: "resume", maxCount: 1
    },
    {
        name: "additionalFiles",
        maxCount: 10
    }
]),  DoctorController.applyDoctor)
export const DoctorRoutes = router;
