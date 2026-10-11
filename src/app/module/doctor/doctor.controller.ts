import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import HttpStatus from "http-status";
import { DoctorService } from "./doctor.service";

const applyDoctor = catchAsync(async (req: Request, res: Response) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    // console.log({ files });
    const resume = files?.["resume"] ? files["resume"][0] : undefined;
    const additionalFiles = files?.["additionalFiles"] || [];
    const payload = JSON.parse(req.body.data);

    console.log(req.body, resume, additionalFiles);

    const result = await DoctorService.applyDoctor(
        payload,
        resume,
        additionalFiles,
    );

    sendResponse(res, {
        statusCode: HttpStatus.CREATED,
        success: true,
        message: "doctor apply success please wait for admin verification",
        data: result,
    });
});

const verifiedDoctor = catchAsync(async (req: Request, res: Response) => {

    const payload = req.body
    const result = await DoctorService.verifiedDoctor(
        payload
    );

    sendResponse(res, {
        statusCode: HttpStatus.CREATED,
        success: true,
        message: "doctor apply success please wait for admin verification",
        data: result,
    });
});

const approvedDoctor = catchAsync(async (req: Request, res: Response) => {

    const payload = req.body
    const user = req.user
    const result = await DoctorService.approvedDoctor(
        payload, user
    );

    sendResponse(res, {
        statusCode: HttpStatus.CREATED,
        success: true,
        message: "doctor verification success",
        data: result,
    });
});

const getAllDoctors = catchAsync(async (req: Request, res: Response) => {
    const result = await DoctorService.getAllDoctors()

    sendResponse(res, {
        statusCode: HttpStatus.CREATED,
        success: true,
        message: "Retrieve All Doctors",
        data: result,
    });
})

export const DoctorController = { applyDoctor, verifiedDoctor, approvedDoctor,getAllDoctors };
