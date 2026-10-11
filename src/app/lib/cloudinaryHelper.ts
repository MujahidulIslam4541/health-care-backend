import type { UploadApiResponse } from "cloudinary";
import { cloudinaryUpload } from "./cloudinary";

type UploadOptions = {
	folder?: string;
	resourceType?: "image" | "raw" | "video" | "auto";
};

export const uploadToCloudinary = (
	file: Buffer | Express.Multer.File,
	options: UploadOptions = {},
): Promise<UploadApiResponse> => {
	const buffer = Buffer.isBuffer(file) ? file : file.buffer;

	return new Promise((resolve, reject) => {
		cloudinaryUpload.cloudinary.uploader
			.upload_stream(
				{
					resource_type: options.resourceType ?? "auto",
					folder: options.folder,
				},
				(error, result) => {
					if (error || !result) {
						return reject(error ?? new Error("Cloudinary upload failed"));
					}
					resolve(result);
				},
			)
			.end(buffer);
	});
};

// multiple file parallel upload
export const uploadMultipleToCloudinary = (
	files: Express.Multer.File[],
	options: UploadOptions = {},
): Promise<UploadApiResponse[]> => {
	return Promise.all(files.map((file) => uploadToCloudinary(file, options)));
};

export const deleteFromCloudinary = async (publicId?: string | null) => {
	if (!publicId) return;
	try {
		await cloudinaryUpload.cloudinary.uploader.destroy(publicId);
	} catch (err) {
		console.error("Cloudinary delete failed:", publicId, err);
	}
};
