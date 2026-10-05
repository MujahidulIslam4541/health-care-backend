import type { NextFunction, Request, RequestHandler, Response } from "express";
import  HttpStatus  from "http-status";

export const catchAsync = (fn: RequestHandler) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			await fn(req, res, next);
		} catch (error) {
			console.log(error);

			res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
			    success: false,
			    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
			    message: "Failed to register user",
			    error: (error as Error).message
			})

			next(error);
		}
	};
};
