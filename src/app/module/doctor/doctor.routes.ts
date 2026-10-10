import { Router } from "express";

import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { DoctorController } from "./doctor.controller";

const router = Router();

router.post("/apply-doctor", auth(Role.DOCTOR), DoctorController.applyDoctor)
export const DoctorRoutes = router;
