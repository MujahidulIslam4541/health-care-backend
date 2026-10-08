import config from "../../config";
import { getBkashIdToken } from "../../lib/bkash";

const createAppointment = async () => {
	const bkashIdToken = await getBkashIdToken();

	const createBkashPayment = await fetch(
		`${config.bkash_base_url}/tokenized-checkout/payment/create`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-App-Key": config.bkash_app_key,
				Authorization: bkashIdToken,
			},
			body: JSON.stringify({
				payerReference: "TEST001ABC",
				callbackURL: `${config.bkash_callBack_url}/appointment/book-appointment/payment/callback`,
				amount: "2000",
				currency: "BDT",
				intent: "sale",
				merchantInvoiceNumber: "test001",
				subMerchantName: "Test",
				merchantAssociationInfo: "MI05MID54RF09123456789",
			}),
		},
	);
	const bkashPaymentResult = await createBkashPayment.json();

	return bkashPaymentResult;
};

export const AppointmentService = { createAppointment };
