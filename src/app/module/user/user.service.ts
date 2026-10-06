import { cloudinaryUpload } from "../../lib/cloudinary"
import { prisma } from "../../lib/prisma"

const updateProfileImage = async (buffer: Buffer, userId: string) => {
    cloudinaryUpload.cloudinary.uploader.upload_stream(
        {
            resource_type: "auto"
        },
        async (error, result) => {
            if (error) {
                throw new Error(error.message)
            }
            console.log(result?.secure_url)
            const updatedUser = await prisma.user.update({
                where: {
                    id: userId
                },
                data: {
                    image_url: result?.secure_url,
                    image_public_id: result?.public_id
                }
            })

            console.log(updatedUser)
            return result
        }
    ).end(buffer)
}

export const userService = { updateProfileImage }