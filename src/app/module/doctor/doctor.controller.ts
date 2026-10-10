import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import HttpStatus from "http-status";
import { DoctorService } from "./doctor.service";


const applyDoctor = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;

    const result = await DoctorService.applyDoctor(payload)

    sendResponse(res, {
        statusCode: HttpStatus.CREATED,
        success: true,
        message: "doctor apply success please wait for admin verification",
        data: result
    });
});


export const DoctorController = { applyDoctor }