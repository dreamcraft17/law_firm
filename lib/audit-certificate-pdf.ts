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
  documentHash?: string | null;
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
    doc.moveDown(0.3);
    doc.fontSize(8).fillColor('#666').text('Dokumen ini merupakan rekaman audit resmi proses tanda tangan elektronik', { align: 'center' });
    doc.fillColor('#000').moveDown(0.8);

    // Document info
    doc.fontSize(12).text('Informasi Dokumen');
    doc.moveTo(doc.x, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.3);
    doc.fontSize(10);
    doc.text(`Nama Dokumen  : ${audit.documentName ?? '—'}`);
    doc.text(`Document ID   : ${audit.documentId}`);
    doc.text(`Request ID    : ${audit.requestId}`);
    doc.text(`Status        : ${audit.status.toUpperCase()}`);
    if (audit.documentHash) {
      doc.moveDown(0.3);
      doc.fontSize(9).fillColor('#444').text('SHA-256 Document Hash (saat penandatanganan dimulai):');
      doc.font('Courier').fontSize(8).text(audit.documentHash, { indent: 10 });
      doc.font('Helvetica').fillColor('#000').fontSize(10);
    }
    doc.moveDown(0.5);

    // Timeline
    doc.fontSize(12).text('Timeline');
    doc.moveTo(doc.x, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.3);
    doc.fontSize(10);
    doc.text(`Dibuat          : ${audit.createdAt.toISOString()}`);
    if (audit.expiryAt) doc.text(`Berlaku hingga  : ${audit.expiryAt.toISOString()}`);
    if (audit.completedAt) doc.text(`Selesai         : ${audit.completedAt.toISOString()}`);
    if (audit.cancelledAt) doc.text(`Dibatalkan      : ${audit.cancelledAt.toISOString()}`);
    doc.moveDown(0.8);

    // Signers
    doc.fontSize(12).text('Penandatangan');
    doc.moveTo(doc.x, doc.y).lineTo(550, doc.y).stroke();
    doc.fontSize(10);
    audit.signers.forEach((s, i) => {
      doc.moveDown(0.5);
      doc.text(`${i + 1}. ${s.name}  <${s.email}>`);
      if (s.signedAt) {
        doc.fontSize(9).fillColor('#333');
        doc.text(`   Ditandatangani : ${s.signedAt.toISOString()}`, { indent: 10 });
        if (s.signerIp) doc.text(`   IP Address     : ${s.signerIp}`, { indent: 10 });
        if (s.signerUserAgent) doc.text(`   User Agent     : ${s.signerUserAgent.slice(0, 100)}`, { indent: 10 });
        doc.fillColor('#000').fontSize(10);
      } else {
        doc.fontSize(9).fillColor('#999').text('   Belum menandatangani', { indent: 10 });
        doc.fillColor('#000').fontSize(10);
      }
    });
    doc.moveDown(1.5);
    doc.fontSize(8).fillColor('#888').text(`Sertifikat digenerate: ${new Date().toISOString()}`, { align: 'center' });
    doc.text('Dokumen ini merupakan rekaman sistem dan sah secara hukum sesuai peraturan tanda tangan elektronik yang berlaku.', { align: 'center' });
    doc.end();
  });
}
