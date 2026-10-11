import { prisma } from "../../lib/prisma";
import {
    uploadToCloudinary,
    uploadMultipleToCloudinary,
    deleteFromCloudinary,
} from "../../lib/cloudinaryHelper";
import { DoctorVerificationStatus, Role } from "../../../generated/prisma/enums";
import bcrypt from "bcryptjs";
import config from "../../config";
import crypto from "crypto"
import { redisClient } from "../../lib/redis";
import path from "path";
import { transporter } from "../../lib/nodemailer";
import ejs from "ejs"

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

    const otpExpire = 60 * 60

    const applyDoctorOtpKey = `apply-doctor-otp:${payload
        .user.email
        }`
    const registrationOtp = await crypto.randomInt(100000, 1000000).toString()

    await redisClient.set(applyDoctorOtpKey, registrationOtp, {
        expiration: {
            type: "EX",
            value: otpExpire
        }
    })

    const filePath = path.join(process.cwd(), "src/app/templates/registration-otp.ejs")

    const html = await ejs.renderFile(filePath, { otp: registrationOtp, name, appName: "Health-care", expiresIn: 5 })

    await transporter.sendMail({
        from: config.smtp_sender,
        to: payload.user.email,
        subject: "doctor apply success please verified your email ",
        html
    })
    return createDoctor;
};

const verifiedDoctor = async (payload: any) => {
    const { email, otp } = payload;
    if (!email || !otp) {
        throw new Error("Please provide email and otp")
    }

    const isExistUser = await prisma.user.findUnique({
        where: {
            email: email,
            role: Role.DOCTOR
        }
    })

    if (!isExistUser) {
        throw new Error("doctor not found")
    }

    const applyDoctorOtpKey = `apply-doctor-otp:${email}`

    const redisOtp = await redisClient.get(applyDoctorOtpKey)

    if (!redisOtp || redisOtp !== otp) {
        throw new Error("your otp is not valid ")
    }

    const verifiedDoctor = await prisma.user.update({
        where: {
            id: isExistUser.id
        },
        data: {
            emailVerified: true
        },
        omit: {
            password: true
        },
        include: {
            doctor: true
        }
    })


    await redisClient.del(applyDoctorOtpKey)

    return verifiedDoctor
}

const approvedDoctor = async (payload: any, user: any) => {
    const { doctorId, verificationStatus, rejectionResean } = payload;

    const existingDoctor = await prisma.doctor.findUnique({
        where: {
            id: doctorId
        }, include: { user: true }
    })

    if (!existingDoctor) {
        throw new Error("Doctor application not found ")
    }
    if (existingDoctor.user.status === "DELETED") {
        throw new Error("doctor verification status already deleted")
    }
    if (!existingDoctor.user?.emailVerified) {
        throw new Error("doctor email is not verified please wait for doctor email verification")
    }

    if (existingDoctor.status !== DoctorVerificationStatus.PENDING) {
        throw new Error(`Doctor status already has been ${existingDoctor.status}`)
    }

    if (verificationStatus === DoctorVerificationStatus.REJECTED && !rejectionResean) {
        throw new Error("rejection reason is required .")
    }

    const updateDoctorStatus = await prisma.doctor.update({
        where: { id: existingDoctor.id },
        data: {
            status: verificationStatus,
            rejectionReason: verificationStatus === DoctorVerificationStatus.REJECTED ? rejectionResean : null,
            reviewedBy: user.id,
            reviewedAt: new Date()
        }
    })

    const isApproved = verificationStatus === DoctorVerificationStatus.VERIFIED;

    const templatesPath = path.join(
        process.cwd(),
        `src/app/templates/${isApproved ? "doctor-approved.ejs" : "doctor-reject.ejs"}`
    );
    const templatesData = {
        name: updateDoctorStatus.name,
        rejectionReason: updateDoctorStatus.rejectionReason
    }

    const html = await ejs.renderFile(templatesPath, templatesData)

    await transporter.sendMail({
        from: config.smtp_sender,
        to: updateDoctorStatus.email,
        subject: isApproved ? "Your Application has been verified" : "Your Application has been Reject",
        html
    })


    return updateDoctorStatus;

}

const getAllDoctors = async () => {
    const response = await prisma.doctor.findMany()
    return response
}

export const DoctorService = { applyDoctor, verifiedDoctor, approvedDoctor,getAllDoctors };
