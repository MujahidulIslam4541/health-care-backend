import bcrypt from "bcryptjs";
import path from "path";
import ejs from "ejs"
import type { JwtPayload, SignOptions } from "jsonwebtoken";
import {
	AuthProvider,
	Role,
	UserStatus,
} from "../../../generated/prisma/enums";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { jwtUtils } from "../../utils/jwt";
import type {
	googleClientPayload,
	IForgotPassword,
	ILoginUserPayload,
	IRegisterPatientPayload,
	IRequestUser,
	IResetPassword,
	IVerifiedRegisterPatientPayload,
} from "./auth.interface";
import { OAuth2Client, type TokenPayload } from "google-auth-library";
import { googleClient } from "../../middleware/googleAuth";
import crypto, { randomBytes } from "crypto"
import { redisClient } from "../../lib/redis";
import { error } from "console";
import { transporter } from "../../lib/nodemailer";

const registerPatient = async (payload: IRegisterPatientPayload) => {
	const { name, password } = payload;
	const email = payload.email.trim().toLowerCase();

	const isUserExists = await prisma.user.findUnique({
		where: { email },
	});

	if (isUserExists) {
		throw new Error("User with this email already exists");
	}

	const hashedPassword = await bcrypt.hash(password, 8);

	const otpExpire = 5 * 60

	const registrationOtpKey = `registration-otp-key:${email}`
	const registrationOtp = await crypto.randomInt(100000, 1000000).toString()

	await redisClient.set(registrationOtpKey, registrationOtp, {
		expiration: {
			type: "EX",
			value: otpExpire
		}
	})

	const registrationDataKey = `registration-data-key:${email}`
	const redisPatientData = {
		name,
		email,
		password: hashedPassword
	}

	await redisClient.set(registrationDataKey, JSON.stringify(redisPatientData), {
		expiration: {
			type: "EX",
			value: otpExpire
		}
	})

	const filePath = path.join(process.cwd(), "src/app/templates/registration-otp.ejs")

	const html = await ejs.renderFile(filePath, { otp: registrationOtp, name, appName: "Health-care", expiresIn: 5 })

	await transporter.sendMail({
		from: config.smtp_sender,
		to: email,
		subject: "forgot password otp send",
		html
	})

};

const verifyRegistration = async (payload: IVerifiedRegisterPatientPayload) => {
	const otp = payload.otp

	const email = payload.email.trim().toLowerCase();

	const isExistUser = await prisma.user.findUnique({
		where: { email },
	});

	if (isExistUser?.emailVerified) {
		throw new Error("email already verified");
	}


	if (isExistUser?.status === UserStatus.BLOCKED) {
		throw new Error("User is blocked");
	}

	if (isExistUser?.isDeleted || isExistUser?.status === UserStatus.DELETED) {
		throw new Error("User is deleted");
	}


	const registrationOtpKey = `registration-otp-key:${email}`

	const redisOtp = await redisClient.get(registrationOtpKey)

	if (!redisOtp || redisOtp !== otp) {
		throw new Error("your otp is not valid ")
	}
	await redisClient.del(registrationOtpKey)

	const registrationDataKey = `registration-data-key:${email}`

	const redisPatientData = await redisClient.get(registrationDataKey)

	if (!redisPatientData) {
		throw new Error("redis data not found")
	}

	const redisPayload: IRegisterPatientPayload = JSON.parse(redisPatientData)


	const createdUser = await prisma.user.create({
		data: {
			name: redisPayload.name,
			email: redisPayload.email,
			password: redisPayload.password,
			role: Role.PATIENT,
			status: UserStatus.ACTIVE,
			emailVerified: true,
			patient: {
				create: { name: redisPayload.name, email: redisPayload.email },
			},
		},
		omit: { password: true },
		include: { patient: true },
	});

	await redisClient.del(registrationDataKey)

	const { patient, ...user } = createdUser;

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	const filePath = path.join(process.cwd(), "src/app/templates/registration-success.ejs")

	const html = await ejs.renderFile(filePath, { name:user.name, appName: "Health-care"})

	await transporter.sendMail({
		from: config.smtp_sender,
		to: email,
		subject: "your account is successfully created ",
		html
	})

	return {
		user,
		patient,
		accessToken,
		refreshToken,
	};


	



}

const loginUser = async (payload: ILoginUserPayload) => {
	const { password } = payload;
	const email = payload.email.trim().toLowerCase();

	const user = await prisma.user.findUnique({
		where: { email },
	});

	if (!user) {
		throw new Error("User not found");
	}

	if (user.status === UserStatus.BLOCKED) {
		throw new Error("User is blocked");
	}

	if (user.isDeleted || user.status === UserStatus.DELETED) {
		throw new Error("User is deleted");
	}

	if (!user.password || user.authProvider === AuthProvider.GOOGLE) {
		throw new Error(
			"This account was registered using Google. Please log in with Google.",
		);
	}

	const isPasswordMatched = await bcrypt.compare(password, user.password);

	if (!isPasswordMatched) {
		throw new Error("Invalid credentials");
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		accessToken,
		refreshToken,
	};
};

const getMe = async (user: IRequestUser) => {
	const isUserExists = await prisma.user.findUnique({
		where: {
			id: user.userId,
		},
		include: {
			patient: true,
		},
		omit: {
			password: true,
		},
	});

	if (!isUserExists) {
		throw new Error("User not found");
	}

	return isUserExists;
};

const refreshToken = async (token: string) => {
	const verifiedRefreshToken = jwtUtils.verifyToken(
		token,
		config.jwt_refresh_secret,
	);

	if (!verifiedRefreshToken.success || !verifiedRefreshToken.data) {
		throw new Error(
			config.node_env === "development"
				? verifiedRefreshToken.error
				: "Invalid refresh token",
		);
	}

	const data = verifiedRefreshToken.data as JwtPayload;

	const user = await prisma.user.findUnique({
		where: { id: data.userId },
	});

	if (!user || user.isDeleted || user.status !== UserStatus.ACTIVE) {
		throw new Error("User is inactive or not found");
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		accessToken,
		refreshToken,
	};
};

const googleLogin = async (payload: googleClientPayload) => {
	let googleTokenPayload: TokenPayload | undefined | null = null;

	try {
		const googleTokenTicket = googleClient.verifyIdToken({
			idToken: payload.idToken,
			audience: config.google_client_id,
		});
		googleTokenPayload = (await googleTokenTicket).getPayload();

	} catch (error) {
		console.log("google id token verification failed", error);
		throw new Error("google id token verification failed");
	}

	if (!googleTokenPayload) {
		throw new Error("google id token verification failed");
	}

	if (!googleTokenPayload.email || !googleTokenPayload.name) {
		throw new Error("user name and email not found");
	}

	const email = googleTokenPayload.email;


	let user = await prisma.user.findUnique({
		where: { email },
	});

	if (user && user.role !== Role.PATIENT) {
		throw new Error("This email is registered with a different role");
	}

	if (user) {
		if (user.status === UserStatus.BLOCKED) {
			throw new Error("User is blocked");
		}
		if (user.isDeleted || user.status === UserStatus.DELETED) {
			throw new Error("User is deleted");
		}

		if (!user.googleId) {
			user = await prisma.user.update({
				where: { id: user.id },
				data: {
					googleId: googleTokenPayload.sub,
					emailVerified: true,
				},
			});
		}
	} else {
		user = await prisma.user.create({
			data: {
				name: googleTokenPayload.name,
				email,
				googleId: googleTokenPayload.sub,
				role: Role.PATIENT,
				authProvider: AuthProvider.GOOGLE,
				emailVerified: true,
				patient: {
					create: {
						name: googleTokenPayload.name,
						email,
					},
				},
			},
		});
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return { accessToken, refreshToken };
};

const forgotPassword = async (payload: IForgotPassword) => {
	const { email } = payload

	const isExistUser = await prisma.user.findUnique({
		where: {
			email
		}
	})

	if (!isExistUser || isExistUser.status === "BLOCKED" || isExistUser.isDeleted || isExistUser.status === "DELETED" || isExistUser.authProvider !== "LOCAL") {
		throw new Error("user not exist or deleted or blocked ")
	}

	const otp = crypto.randomInt(100000, 1000000).toString()
	const key = `forgot-password-otp:${isExistUser.email}`

	await redisClient.set(key, otp, {
		expiration: {
			type: "EX",
			value: 5 * 60
		}
	})

	const filePath = path.join(process.cwd(), "src/app/templates/forgote-password.ejs")

	const html = await ejs.renderFile(filePath, { otp, name: isExistUser.name, appName: "Health-care", expiresIn: 5 })

	await transporter.sendMail({
		from: config.smtp_sender,
		to: isExistUser.email,
		subject: "forgot password otp send",
		html
	})

}

const resetPassword = async (payload: IResetPassword) => {
	const { email, otp, newPassword } = payload

	const isExistUser = await prisma.user.findUnique({
		where: {
			email
		}
	})

	if (!isExistUser || isExistUser.status === "BLOCKED" || isExistUser.isDeleted || isExistUser.status === "DELETED" || isExistUser.authProvider !== "LOCAL") {
		throw new Error("user not exist or deleted or blocked ")
	}
	const key = `forgot-password-otp:${isExistUser.email}`

	const redisOtp = await redisClient.get(key)

	if (!redisOtp || redisOtp !== otp) {
		throw new Error("your otp is not valid ")
	}
	const hashedPassword = await bcrypt.hash(newPassword, Number(config.bcrypt_salt_rounds))

	await prisma.user.update({
		where: { email: isExistUser.email },
		data: {
			password: hashedPassword
		}
	})

	await redisClient.del([key])

	const filePath = path.join(process.cwd(), "src/app/templates/reset-password.ejs")

	const html = await ejs.renderFile(filePath, {
		name: isExistUser.name,
		appName: "Health Care",
		supportEmail: config.smtp_sender,
		changedAt: new Date().toLocaleString("en-GB", {
			timeZone: "Asia/Dhaka",
			dateStyle: "medium",
			timeStyle: "short",
		}),
	})

	await transporter.sendMail({
		from: config.smtp_sender,
		to: isExistUser.email,
		subject: "your password changed",
		html
	})
}


export const AuthService = {
	registerPatient,
	verifyRegistration,
	loginUser,
	getMe,
	refreshToken,
	googleLogin,
	forgotPassword,
	resetPassword
};
