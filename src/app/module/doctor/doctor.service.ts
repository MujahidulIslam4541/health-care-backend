import { prisma } from "../../lib/prisma";
import {
	uploadToCloudinary,
	uploadMultipleToCloudinary,
	deleteFromCloudinary,
} from "../../lib/cloudinaryHelper";
import { Role } from "../../../generated/prisma/enums";
import bcrypt from "bcryptjs";
import config from "../../config";

const applyDoctor = async (
	payload: any,
	resume: Express.Multer.File | undefined,
	additionalFiles: Express.Multer.File[] = [],
) => {
	const existingUser = await prisma.user.findUnique({
		where: { email: payload.user.email },
	});

	if (existingUser) {
		throw new Error(
			"This email already exists, please login or try a new email",
		);
	}

	if (!resume) {
		throw new Error("Resume is required");
	}

	const resumeUpload = await uploadToCloudinary(resume, {
		folder: "doctors/resumes",
	});
	const additionalUploads = await uploadMultipleToCloudinary(additionalFiles, {
		folder: "doctors/additional",
	});

	const hashPassword = await bcrypt.hash(
		payload.user.password,
		Number(config.bcrypt_salt_rounds),
	);

	const createDoctor = await prisma.user.create({
		data: {
			...payload.user,
			password: hashPassword,
			role: Role.DOCTOR,
			needPasswordChange: true,
			doctor: {
				create: {
					name: payload.user.name,
					email: payload.user.email,
					...payload.doctor,
					resume: resumeUpload.secure_url,
					resume_public_id: resumeUpload.public_id,
					additionalDocuments: additionalUploads.map((f) => ({
						url: f.secure_url,
						public_id: f.public_id,
					})),
				},
			},
		},
		include: { doctor: true },
	});

	return createDoctor;
};

export const DoctorService = { applyDoctor };
