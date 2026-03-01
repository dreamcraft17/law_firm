/**
 * Generate a simple PDF audit certificate for e-signature completion.
 * Requires pdfkit to be installed.
 */
import PDFDocument from 'pdfkit';

export type AuditCertificateSigner = {
  email: string;
  name: string;
  signedAt: Date | null;
  signerIp: string | null;
  signerUserAgent: string | null;
};

export type AuditCertificateData = {
  documentId: string;
  documentName?: string | null;
  requestId: string;
  status: string;
  createdAt: Date;
  expiryAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  signers: AuditCertificateSigner[];
};

export function generateAuditCertificatePdf(audit: AuditCertificateData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    doc.fontSize(16).text('E-Signature Audit Certificate', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Document: ${audit.documentName ?? audit.documentId}`, { continued: false });
    doc.text(`Request ID: ${audit.requestId}`);
    doc.text(`Status: ${audit.status}`);
    doc.text(`Created: ${audit.createdAt.toISOString()}`);
    if (audit.expiryAt) doc.text(`Expiry: ${audit.expiryAt.toISOString()}`);
    if (audit.completedAt) doc.text(`Completed: ${audit.completedAt.toISOString()}`);
    if (audit.cancelledAt) doc.text(`Cancelled: ${audit.cancelledAt.toISOString()}`);
    doc.moveDown(1);
    doc.fontSize(12).text('Signers');
    doc.fontSize(10);
    audit.signers.forEach((s, i) => {
      doc.moveDown(0.3);
      doc.text(`${i + 1}. ${s.name} (${s.email})`);
      if (s.signedAt) {
        doc.text(`   Signed: ${s.signedAt.toISOString()}`, { indent: 10 });
        if (s.signerIp) doc.text(`   IP: ${s.signerIp}`, { indent: 10 });
      } else {
        doc.text('   Not signed', { indent: 10 });
      }
    });
    doc.moveDown(1);
    doc.fontSize(8).text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
    doc.end();
  });
}
