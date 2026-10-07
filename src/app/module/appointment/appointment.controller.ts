import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import HttpStatus from "http-status";

const createAppointment = catchAsync(async (req: Request, res: Response) => {
	sendResponse(res, {
		statusCode: HttpStatus.CREATED,
		success: true,
		message: "profile image updated",
		data: null,
	});
});

export const AppointmentController = { createAppointment };
