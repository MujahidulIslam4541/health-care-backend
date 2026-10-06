import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import HttpStatus from "http-status";
import { userService } from "./user.service";

const updateImage = catchAsync(async (req: Request, res: Response) => {

    if (!req.file?.buffer) {
        throw new Error("Profile image is required");
    }
    const userId=req.user?.userId;

     await userService.updateProfileImage(req.file?.buffer,userId as string)

    sendResponse(res, {
        statusCode: HttpStatus.CREATED,
        success: true,
        message: "profile image updated",
        data: null
    });
});


export const userController = { updateImage }