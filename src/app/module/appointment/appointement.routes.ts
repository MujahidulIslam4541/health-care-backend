import { Router } from "express";
import { AppointmentController } from "./appointment.controller";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.post(
	"/book-appointment",
	auth(Role.PATIENT),
	AppointmentController.createAppointment,
);

router.post(
	"/pay-appointment",
	auth(Role.PATIENT),
	AppointmentController.payAppointment,
);
router.post(
	"/cancel-appointment",
	auth(Role.PATIENT),
	AppointmentController.cancelAppointment,
);

router.get(
	"/book-appointment/payment/callback",
	// auth(Role.SUPER_ADMIN, Role.ADMIN, Role.DOCTOR, Role.PATIENT),
	AppointmentController.bookAppointmentCallback,
);
export const AppointmentRoutes = router;
