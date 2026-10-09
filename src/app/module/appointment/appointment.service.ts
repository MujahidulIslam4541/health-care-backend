
import { AppointmentStatus } from "../../../generated/prisma/enums";
import config from "../../config";
import { getBkashIdToken } from "../../lib/bkash";
import { prisma } from "../../lib/prisma";

const createAppointment = async (payload: string, user: any) => {
    const transactionResult = await prisma.$transaction(async (tx) => {

        // const create appointment
        const appointment = await tx.appointment.create({
            data: {
                status: AppointmentStatus.PENDING
            }
        })



        // created bkash payment
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
                    payerReference: user.email,
                    callbackURL: `${config.bkash_callBack_url}/appointment/book-appointment/payment/callback`,
                    amount: "2000",
                    currency: "BDT",
                    intent: "sale",
                    merchantInvoiceNumber: appointment.id,
                    subMerchantName: "Test",
                    merchantAssociationInfo: "MI05MID54RF09123456789",
                }),
            },
        );
        const bkashPaymentResult = await createBkashPayment.json();


        // create payment model 
        const payment = await tx.payment.create({
            data: {
                appointmentId: appointment.id,
                getWayResponse: bkashPaymentResult,
                paymentId: bkashPaymentResult.paymentID,
                amount: "1200",
                merchantInvoiceNumber: bkashPaymentResult.merchantInvoiceNumber,
                payerReference: user.email
            }
        })
        console.log("create payment table ", payment)


        return bkashPaymentResult.bKashURL;
    })

    return transactionResult
};

const bookAppointmentCallback = async (query: any) => {
    const paymentId = query.paymentID;
    const status = query.status;

    if (!paymentId || !status) {
        throw new Error("payment id or status not found")
    }

    const bkashIdToken = await getBkashIdToken();

    const executePaymentResponse = await fetch(
        `${config.bkash_base_url}/tokenized-checkout/payment/execute`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-App-Key": config.bkash_app_key,
                Authorization: bkashIdToken,
            },
            body: JSON.stringify({
                paymentId: paymentId
            }),
        },
    );
    const executedPaymentResult = await executePaymentResponse.json();

    if (executedPaymentResult === "success") {
        return {
            executedPaymentResult,
            redirectUrl: `${config.frontend_url}/dashboard/book-appointment?status=success`
        }
    }

    if (executedPaymentResult === "failure") {
        return {
            executedPaymentResult,
            redirectUrl: `${config.frontend_url}/dashboard/book-appointment?status=failure`
        }
    }

    if (executedPaymentResult === "cancel") {
        return {
            executedPaymentResult,
            redirectUrl: `${config.frontend_url}/dashboard/book-appointment?status=cancel`
        }
    }


    return {
        executedPaymentResult,
        redirectUrl: `${config.frontend_url}/dashboard/book-appointment?status=cancel`
    }
}

export const AppointmentService = { createAppointment, bookAppointmentCallback };
