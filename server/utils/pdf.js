import { jsPDF } from 'jspdf';

const addField = (document, label, value, x, y) => {
  document.setFont('helvetica', 'bold');
  document.text(`${label}:`, x, y);
  document.setFont('helvetica', 'normal');
  document.text(String(value || '-'), x + 120, y);
};

const getIssuedByName = (outpass) => {
  const wardenApproval = outpass.approvedBy?.find((entry) => entry.role === 'Warden');

  if (!wardenApproval) {
    return 'Warden';
  }

  if (wardenApproval.user && typeof wardenApproval.user === 'object' && 'name' in wardenApproval.user) {
    return wardenApproval.user.name;
  }

  return 'Warden';
};

export const createOutpassPdf = (outpass) => {
  // jsPDF works in Node and the browser, so one template can power the PDF API.
  const document = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const margin = 40;
  const pageWidth = document.internal.pageSize.getWidth();

  document.setFont('helvetica', 'bold');
  document.setFontSize(20);
  document.text('HOSTEL OUTPASS', pageWidth / 2, margin, { align: 'center' });
  document.line(margin, 62, pageWidth - margin, 62);

  document.setFontSize(12);
  let cursorY = 95;

  addField(document, 'Student Name', outpass.studentName, margin, cursorY);
  cursorY += 26;
  addField(document, 'Department', outpass.department, margin, cursorY);
  cursorY += 26;
  addField(document, 'Year', outpass.year, margin, cursorY);
  cursorY += 26;
  addField(document, 'Request Type', outpass.requestType, margin, cursorY);
  cursorY += 26;
  addField(document, 'Date', new Date(outpass.date).toDateString(), margin, cursorY);
  cursorY += 26;
  addField(document, 'Out Time', outpass.outTime, margin, cursorY);
  cursorY += 26;
  addField(document, 'Return Time', outpass.returnTime, margin, cursorY);
  cursorY += 26;
  addField(document, 'Reason', outpass.reason, margin, cursorY);

  cursorY += 50;
  document.setFont('helvetica', 'bold');
  document.text('Approval Section', margin, cursorY);
  document.setFont('helvetica', 'normal');
  cursorY += 25;

  document.text(`HOD Approval: ${outpass.hodStatus === 'Approved' ? 'Approved' : outpass.hodStatus || 'Pending'}`, margin, cursorY);
  cursorY += 22;
  document.text(`Sister Approval: ${outpass.sisterStatus === 'Approved' ? 'Approved' : outpass.sisterStatus || 'Pending'}`, margin, cursorY);
  cursorY += 22;
  document.text(`Warden Approval: ${outpass.wardenStatus === 'Approved' ? 'Approved' : outpass.wardenStatus || 'Pending'}`, margin, cursorY);

  cursorY += 55;
  document.setFont('helvetica', 'bold');
  document.text(`Issued by: ${getIssuedByName(outpass)}`, margin, cursorY);

  cursorY += 40;
  document.setFont('helvetica', 'italic');
  document.text('Valid only for specified time.', margin, cursorY);

  return Buffer.from(document.output('arraybuffer'));
};
