
import { AppointmentStatus, PaymentStatus } from "../../../generated/prisma/enums";
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
        await tx.payment.create({
            data: {
                appointmentId: appointment.id,
                getWayResponse: bkashPaymentResult,
                paymentId: bkashPaymentResult.paymentId,
                amount: "2000",
                merchantInvoiceNumber: bkashPaymentResult.merchantInvoiceNumber,
                payerReference: user.email
            }
        })

        return bkashPaymentResult.bkashURL;
    })

    console.log("transation", transactionResult)
    return transactionResult
};


const payAppointment = async (payload: any, user: any) => {
    const appointmentId = payload.appointmentId

    const existAppointment = await prisma.appointment.findUnique({
        where: {
            id: appointmentId
        }
    })

    if (!existAppointment) {
        throw new Error("Your Appointment dose not found")
    }

    if (existAppointment.status !== "PENDING") {
        throw new Error("your appointment status is not pending")
    }

    // if (existAppointment.status === "COMPLETED" || existAppointment.status === "ON_GOING" || existAppointment.status === "CANCELLED") {
    //     throw new Error(`your appointment is ${(existAppointment.status).toLocaleLowerCase()}`)
    // }


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
                merchantInvoiceNumber: existAppointment.id,
                subMerchantName: "Test",
                merchantAssociationInfo: "MI05MID54RF09123456789",
            }),
        },
    );
    const bkashPaymentResult = await createBkashPayment.json();


    await prisma.payment.update({
        where: {
            appointmentId: existAppointment.id
        },
        data: {
            appointmentId: existAppointment.id,
            getWayResponse: bkashPaymentResult,
            paymentId: bkashPaymentResult.paymentId,
            merchantInvoiceNumber: bkashPaymentResult.merchantInvoiceNumber,
        }
    })

    return bkashPaymentResult.bkashURL;

}



const bookAppointmentCallback = async (query: any) => {
    const paymentId = query.paymentID
    const status = query.status

    if (!paymentId || !status) {
        throw new Error("payment id or status not found")
    }

    const redirect = (s: string) =>
        `${config.frontend_url}/dashboard/book-appointment?status=${s}`


    const payment = await prisma.payment.findUnique({
        where: { paymentId },
    })

    if (!payment) {
        throw new Error("payment record not found")
    }


    if (status === "failure" || status === "cancel") {
        await prisma.payment.update({
            where: { paymentId },
            data: {
                paymentStatus:
                    status === "failure"
                        ? PaymentStatus.FAILED
                        : PaymentStatus.CANCELLED,
            },
        })

        return { redirectUrl: redirect(status) }
    }

    if (status !== "success") {
        return { redirectUrl: redirect("failure") }
    }


    const bkashIdToken = await getBkashIdToken()

    const executeRes = await fetch(
        `${config.bkash_base_url}/tokenized-checkout/payment/execute`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-App-Key": config.bkash_app_key,
                Authorization: bkashIdToken,
            },
            body: JSON.stringify({ paymentId }),
        },
    )

    const executed = await executeRes.json()


    const isPaid =
        executed.transactionStatus === "Completed"

    if (!isPaid) {
        await prisma.payment.update({
            where: { paymentId },
            data: {
                paymentStatus: PaymentStatus.FAILED,
                getWayResponse: executed,
            },
        })

        return { redirectUrl: redirect("failure") }
    }


    await prisma.$transaction(async (tx) => {
        await tx.appointment.update({
            where: { id: payment.appointmentId },
            data: { status: AppointmentStatus.CONFIRMED },
        })

        await tx.payment.update({
            where: { paymentId },
            data: {
                paymentStatus: PaymentStatus.PAID,
                transactionId: executed.trxID ?? executed.trxId,
                paidAt: executed.paymentExecuteTime,
                getWayResponse: executed,
            },
        })
    })

    return { redirectUrl: redirect("success") }
}

const cancelAppointment = async (payload: any) => {
    const transaction = await prisma.$transaction(async (tx) => {
        const appointmentId = payload.appointmentId
        const reason = payload.reason;

        const existAppointment = await tx.appointment.findUnique({
            where: {
                id: appointmentId
            },
            include: {
                payment: true
            }
        })

        if (!existAppointment) {
            throw new Error("Your Appointment dose not found")
        }

        if (existAppointment.status === "ON_GOING" || existAppointment.status === "COMPLETED") {
            throw new Error("your appointment sis already completed or ongoing")
        }

        if (existAppointment.status === "CANCELLED") {
            throw new Error("your appointment already canceled")
        }

        const updateAppointment = await tx.appointment.update({
            where: {
                id: existAppointment.id
            },
            data: {
                status: AppointmentStatus.CANCELLED
            }
        })




        // refunded bkash payment
        const bkashIdToken = await getBkashIdToken();

        const refundBkashPayment = await fetch(
            `${config.bkash_base_url}/tokenized-checkout/refund/payment/transaction`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-App-Key": config.bkash_app_key,
                    Authorization: bkashIdToken,
                },
                body: JSON.stringify({
                    paymentId: existAppointment.payment?.paymentId,
                    refundAmount: existAppointment.payment?.amount,
                    trxId: existAppointment.payment?.transactionId,
                    reason: reason,
                    sku: "appointment cancellation"
                }),
            },
        );
        const bkashRefundResult = await refundBkashPayment.json();

        const refundPayment = await tx.payment.update({
            where: {
                id: existAppointment.payment?.id
            },
            data: {
                refundAmount: bkashRefundResult.refundAmount,
                refundTransactionId: bkashRefundResult.refundTrxId,
                refundAt: bkashRefundResult.completedTime,
                refundResponse: bkashRefundResult.reason,
                paymentStatus: PaymentStatus.REFUNDED,
                getWayResponse: bkashRefundResult
            }
        })

        return {
            appointment: updateAppointment,
            payment: refundPayment
        }

    })

    return transaction

}

export const AppointmentService = { createAppointment, bookAppointmentCallback, payAppointment, cancelAppointment };
