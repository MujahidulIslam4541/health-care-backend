import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import HttpStatus from "http-status";
import { AppointmentService } from "./appointment.service";

const createAppointment = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	const user = req.user!
	const result = await AppointmentService.createAppointment(payload, user);
	sendResponse(res, {
		statusCode: HttpStatus.CREATED,
		success: true,
		message: "Bkash payment created ",
		data: result,
	});
});


const bookAppointmentCallback = catchAsync(async (req: Request, res: Response) => {

	const { executedPaymentResult, redirectUrl } = await AppointmentService.bookAppointmentCallback(req.query);

	res.redirect(redirectUrl)

	// console.log("payment exicute response", result)
	// sendResponse(res, {
	// 	statusCode: HttpStatus.CREATED,
	// 	success: true,
	// 	message: "Bkash payment callback redirect success",
	// 	data: result,
	// });
});

export const AppointmentController = { createAppointment, bookAppointmentCallback };
