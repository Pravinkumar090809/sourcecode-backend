import nodemailer from "nodemailer";

const parsePort = (value, fallback = 587) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: parsePort(process.env.SMTP_PORT, 587),
    secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
    auth: { user, pass },
  });
};

export const sendDownloadLinkEmail = async ({
  to,
  customerName,
  productTitle,
  orderId,
  downloadUrl,
  expiresInHours,
}) => {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("SMTP is not configured. Skipping download email.");
    return { sent: false, reason: "SMTP_NOT_CONFIGURED" };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const safeName = customerName || "Customer";
  const safeProduct = productTitle || "Your Product";
  const expiryText = `${expiresInHours} hour${Number(expiresInHours) === 1 ? "" : "s"}`;

  const subject = `Download link for ${safeProduct}`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
      <h2 style="margin:0 0 12px">Payment Approved ✅</h2>
      <p>Hi ${safeName},</p>
      <p>Your payment for <strong>${safeProduct}</strong> has been approved.</p>
      <p><strong>Order ID:</strong> ${orderId}</p>
      <p>
        <a href="${downloadUrl}" style="display:inline-block;background:#dc2626;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">Download Now</a>
      </p>
      <p>This link expires in ${expiryText}. Please download immediately.</p>
      <p>Thanks,<br/>Support Team</p>
    </div>
  `;

  const text = [
    "Payment Approved",
    `Hi ${safeName},`,
    `Your payment for ${safeProduct} has been approved.`,
    `Order ID: ${orderId}`,
    `Download link: ${downloadUrl}`,
    `This link expires in ${expiryText}.`,
  ].join("\n");

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
    text,
  });

  return { sent: true };
};
