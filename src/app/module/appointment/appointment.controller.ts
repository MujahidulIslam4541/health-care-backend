import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import HttpStatus from "http-status";
import { AppointmentService } from "./appointment.service";

const createAppointment = catchAsync(async (req: Request, res: Response) => {
	const result = await AppointmentService.createAppointment();
	sendResponse(res, {
		statusCode: HttpStatus.CREATED,
		success: true,
		message: "Bkash payment created ",
		data: result,
	});
});

export const AppointmentController = { createAppointment };
