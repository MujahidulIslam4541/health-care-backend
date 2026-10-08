import config from "../config";
import { redisClient } from "./redis";

const ID_TOKEN_KEY = "bkash:id_token";
const REFRESH_TOKEN_KEY = "bkash:refresh_token";
const ID_TOKEN_EX = 60 * 60;
const REFRESH_TOKEN_EX = 60 * 60 * 24 * 28;
const THRESHOLD = 600;

export const headers = {
	"Content-Type": "application/json",
	Accept: "application/json",
	username: config.bkash_user_name,
	password: config.bkash_password,
};

const saveTokens = async (idToken: string, refreshToken?: string) => {
	await redisClient.set(ID_TOKEN_KEY, idToken, {
		expiration: { type: "EX", value: ID_TOKEN_EX },
	});
	if (refreshToken) {
		await redisClient.set(REFRESH_TOKEN_KEY, refreshToken, {
			expiration: { type: "EX", value: REFRESH_TOKEN_EX },
		});
	}
};

const callBkashAuth = async (path: string, body: object) => {
	const response = await fetch(
		`${config.bkash_base_url}/tokenized-checkout/auth/${path}`,
		{
			method: "POST",
			headers,
			body: JSON.stringify({
				app_key: config.bkash_app_key,
				app_secret: config.bkash_app_secret,
				...body,
			}),
		},
	);
	const result = await response.json();
	const ok = response.ok && result.statusCode === "0000" && !!result.id_token;
	return { ok, result };
};

export const getBkashIdToken = async (): Promise<string> => {
	const [idToken, idTokenTTL, refreshToken, refreshTokenTTL] =
		await Promise.all([
			redisClient.get(ID_TOKEN_KEY),
			redisClient.ttl(ID_TOKEN_KEY),
			redisClient.get(REFRESH_TOKEN_KEY),
			redisClient.ttl(REFRESH_TOKEN_KEY),
		]);

	// console.log({ idToken, idTokenTTL, refreshToken, refreshTokenTTL });

	if (idToken && idTokenTTL > THRESHOLD) {
		return idToken;
	}

	if (refreshToken && refreshTokenTTL > THRESHOLD) {
		const { ok, result } = await callBkashAuth("refresh-token", {
			refresh_token: refreshToken,
		});
		if (ok) {
			await saveTokens(result.id_token, result.refresh_token);
			return result.id_token as string;
		}
		console.warn(
			"bkash refresh failed, falling back to grant token:",
			result.statusMessage,
		);
	}

	const { ok, result } = await callBkashAuth("grant-token", {});
	if (!ok) {
		throw new Error(result.statusMessage || "bkash grant token failed");
	}

	await saveTokens(result.id_token, result.refresh_token);
	return result.id_token as string;
};
