import PDFDocument from 'pdfkit';

export const createOutpassPdf = (outpass) => {
  const document = new PDFDocument({ margin: 40, size: 'A4' });

  document.fontSize(20).text('Hostel Outpass', { align: 'center' });
  document.moveDown();
  document.fontSize(12);
  document.text(`Student Name: ${outpass.studentName}`);
  document.text(`Department: ${outpass.department}`);
  document.text(`Year: ${outpass.year}`);
  document.text(`Request Type: ${outpass.requestType}`);
  document.text(`Date: ${new Date(outpass.date).toDateString()}`);
  document.text(`Out Time: ${outpass.outTime}`);
  document.text(`Return Time: ${outpass.returnTime}`);
  document.text(`Reason: ${outpass.reason}`);
  document.text(`Status: ${outpass.status}`);
  document.moveDown();
  document.text('Approved By:', { underline: true });

  if (outpass.approvedBy?.length) {
    outpass.approvedBy.forEach((entry) => {
      document.text(`${entry.role} - ${new Date(entry.date).toLocaleString()}`);
    });
  } else {
    document.text('No approvals recorded');
  }

  return document;
};
