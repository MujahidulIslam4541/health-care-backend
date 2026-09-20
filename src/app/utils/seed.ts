import bcrypt from "bcryptjs";
import { Role } from "../../generated/prisma/enums";
import config from "../config";
import { prisma } from "../lib/prisma";

export const seedSuperAdmin = async () => {
    try {
        const isSuperAdmin = await prisma.user.findUnique({
            where: {
                email: config.super_admin_email,
            },
        });

        if (isSuperAdmin) {
            console.log("Super admin already exists");
            return;
        }

        const name = config.super_admin_name;
        const email = config.super_admin_email;
        const password = config.super_admin_password;

        const hashPassword = await bcrypt.hash(
            password,
            Number(config.bcrypt_salt_rounds),
        );

        const superAdmin = await prisma.user.create({
            data: {
                name,
                email,
                password: hashPassword,
                role: Role.SUPER_ADMIN,
                needPasswordChange: false,
                emailVerified: true,
            },
        });

        console.log("Super admin created:", superAdmin);
    } catch (error) {
        console.log("Error creating super admin:", error);
    }
};

export const seedAdmin = async () => {
    try {
        const name = config.admin_name;
        const email = config.admin_email;
        const password = config.admin_password;

        const isAdmin = await prisma.user.findUnique({
            where: {
                email,
            },
        });

        if (isAdmin) {
            console.log("Admin already exists");
            return;
        }

        const hashPassword = await bcrypt.hash(
            password,
            Number(config.bcrypt_salt_rounds),
        );

        const admin = await prisma.user.create({
            data: {
                name,
                email,
                password: hashPassword,
                role: Role.ADMIN,
                needPasswordChange: false,
                emailVerified: true,
            },
        });

        console.log("Admin created:", admin);
    } catch (error) {
        console.log("Error creating admin:", error);
    }
};
