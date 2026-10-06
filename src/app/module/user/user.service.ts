import type { UploadApiResponse } from "cloudinary"
import { cloudinaryUpload } from "../../lib/cloudinary"
import { prisma } from "../../lib/prisma"

const uploadToCloudinary = (buffer: Buffer): Promise<UploadApiResponse> => {
    return new Promise((resolve, reject) => {
        cloudinaryUpload.cloudinary.uploader
            .upload_stream(
                { resource_type: "image", },
                (error, result) => {
                    if (error || !result) {
                        return reject(error ?? new Error("Cloudinary upload failed"))
                    }
                    resolve(result)
                }
            )
            .end(buffer)
    })
}

const updateProfileImage = async (buffer: Buffer, userId: string) => {
    
    const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { image_public_id: true },
    })

    if (!existingUser) {
        throw new Error("User not found")
    }

    const result = await uploadToCloudinary(buffer)

    // biome-ignore lint/suspicious/noImplicitAnyLet: <explanation>
    let updatedUser
    try {
        updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                image_url: result.secure_url,
                image_public_id: result.public_id,
            },
            omit: { password: true },
        })
    } catch (error) {
        await cloudinaryUpload.cloudinary.uploader.destroy(result.public_id)
        throw error
    }
    if (existingUser.image_public_id) {
        cloudinaryUpload.cloudinary.uploader
            .destroy(existingUser.image_public_id)
            .catch((err) => console.error("Old image delete failed:", err))
    }

    return updatedUser
}

export const userService = { updateProfileImage }