import { prisma } from "../../lib/prisma";
import {
	uploadToCloudinary,
	deleteFromCloudinary,
} from "../../lib/cloudinaryHelper";

const updateProfileImage = async (buffer: Buffer, userId: string) => {
	const existingUser = await prisma.user.findUnique({
		where: { id: userId },
		select: { image_public_id: true },
	});

	if (!existingUser) throw new Error("User not found");

	const result = await uploadToCloudinary(buffer, {
		folder: "users/profile",
		resourceType: "image",
	});

	try {
		const updatedUser = await prisma.user.update({
			where: { id: userId },
			data: {
				image_url: result.secure_url,
				image_public_id: result.public_id,
			},
			omit: { password: true },
		});

		deleteFromCloudinary(existingUser.image_public_id);

		return updatedUser;
	} catch (error) {
		await deleteFromCloudinary(result.public_id);
		throw error;
	}
};

export const userService = { updateProfileImage };
