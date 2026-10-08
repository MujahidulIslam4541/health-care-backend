import { Router } from "express";
import { AppointmentController } from "./appointment.controller";

const router = Router();

router.post(
	"/book-appointment",
	// auth(Role.SUPER_ADMIN, Role.ADMIN, Role.DOCTOR, Role.PATIENT),
	AppointmentController.createAppointment,
);
export const AppointmentRoutes = router;
