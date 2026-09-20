import { Role } from "../../generated/prisma/enums"
import config from "../config"
import { prisma } from "../lib/prisma"
import bcrypt from "bcryptjs"

export const seedSuperAdmin = async () => {
    try {
        const isSuperAdmin = await prisma.user.findFirst({
            where: {
                role: Role.SUPER_ADMIN
            }
        })

        if (isSuperAdmin) {
            console.log("Super admin already exist")
        }

        const name = config.super_admin_name
        const email = config.super_admin_email
        const password = config.super_admin_password

        

        const hashPassword = await bcrypt.hash(password, Number(config.bcrypt_salt_rounds)
        )


        const superAdmin = await prisma.user.create({
            data: {
                name,
                email,
                password: hashPassword,
                role: Role.SUPER_ADMIN,
                needPasswordChange: false,
                emailVerified: true
            }
        })

        console.log("super admin created ", superAdmin)

    } catch (error) {
        console.log("not find admin", error)

        await prisma.user.delete({
            where: {
                email: config.super_admin_email
            }
        })
    }
}

