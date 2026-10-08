import { Router } from "express";
import { AppointmentController } from "./appointment.controller";

const router = Router();

router.post(
	"/book-appointment",
	// auth(Role.SUPER_ADMIN, Role.ADMIN, Role.DOCTOR, Role.PATIENT),
	AppointmentController.createAppointment,
);

router.get(
	"/book-appointment/payment/callback",
	// auth(Role.SUPER_ADMIN, Role.ADMIN, Role.DOCTOR, Role.PATIENT),
	AppointmentController.bookAppointmentCallback,
);
export const AppointmentRoutes = router;
