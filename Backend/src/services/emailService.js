import { MailtrapClient } from "mailtrap";

const client = new MailtrapClient({
  token: process.env.MAILTRAP_TOKEN,
});

const sender = {
  email: "hello@demomailtrap.co",
  name: "Preximacraft interview",
};

export const sendEmail = async (to, subject, body) => {
  try {
    await client.send({
      from: sender,
      to: [{ email: to }],
      subject,
      text: body,
      category: "Billing",
    });
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (err) {
    console.error("Email send failed:", err.message);
  }
};