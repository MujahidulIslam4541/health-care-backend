import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { AppointmentController } from "./appointment.controller";

const router = Router();

router.patch(
	"/update-profile",
	auth(Role.SUPER_ADMIN, Role.ADMIN, Role.DOCTOR, Role.PATIENT),
	AppointmentController.createAppointment,
);
export const UserRoutes = router;
