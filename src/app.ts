import cookieParser from "cookie-parser";
import cors from "cors";
import express, {
	NextFunction,
	type Application,
	type Request,
	type Response,
} from "express";
import httpStatus from "http-status";
import { AuthRoutes } from "./app/module/auth/auth.route";
import config from "./app/config";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { UserRoutes } from "./app/module/user/user.routes";
import { getBkashIdToken } from "./app/lib/bkash";
import { AppointmentRoutes } from "./app/module/appointment/appointement.routes";
import { DoctorRoutes } from "./app/module/doctor/doctor.routes";

const app: Application = express();

app.use(
	cors({
		origin: config.frontend_url,
		credentials: true,
	}),
);

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/user", UserRoutes);
app.use("/api/v1/appointment", AppointmentRoutes);
app.use("/api/v1/doctor",DoctorRoutes)

// Basic route
app.get("/", async (req: Request, res: Response) => {
	res.status(httpStatus.OK).json({
		success: true,
		message: "Welcome to PH Healthcare System Backend",
	});
});

app.get("/test", async (req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await getBkashIdToken();
		// console.log("bkash grant id token", result);
		res.status(httpStatus.OK).json({ success: true, data: result });
	} catch (error) {
		console.error("bkash error:", error);
		next(error);
	}
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
