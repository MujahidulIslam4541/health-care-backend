import nodemailer from "nodemailer";
import config from "../config";


console.log("user:", JSON.stringify(config.smtp_user));
console.log("pass length:", config.smtp_app_password?.length);

export const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: config.smtp_user,
        pass: config.smtp_app_password,
    },
});