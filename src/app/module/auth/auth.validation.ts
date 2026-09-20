import { z } from "zod";

const registerPatientValidationSchema = z.object({
	body: z.object({
		name: z
			.string({
				error: "Name must be a string",
			})
			.min(1, "Name is required"),
		email: z
			.string({
				error: "Email must be a string",
			})
			.email("Invalid email address"),
		password: z
			.string({
				error: "Password must be a string",
			})
			.min(6, "Password must be at least 6 characters"),
	}),
});

const loginUserValidationSchema = z.object({
	body: z.object({
		email: z
			.string({
				error: "Email must be a string",
			})
			.email("Invalid email address"),
		password: z
			.string({
				error: "Password must be a string",
			})
			.min(1, "Password is required"),
	}),
});

export const AuthValidation = {
	registerPatientValidationSchema,
	loginUserValidationSchema,
};

