import PDFDocument from "pdfkit";

export const generateInvoicePDF = (invoice, user, plan) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    doc.fontSize(20).text("Invoice", { align: "center" });
    doc.moveDown();

    doc.fontSize(10)
      .text(`Invoice Number: ${invoice.invoiceNumber}`)
      .text(`Date: ${new Date(invoice.issuedAt).toLocaleDateString()}`)
      .text(`Billed To: ${user.name} (${user.email})`)
      .moveDown();

    doc.fontSize(12).text("Details", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10)
      .text(`Plan: ${plan.name}`)
      .text(`Amount: ₹${invoice.amount}`)
      .text(`Status: ${invoice.status}`)
      .moveDown();

    doc.fontSize(10).fillColor("gray").text("Thank you for your subscription.", { align: "center" });

    doc.end();
  });
};