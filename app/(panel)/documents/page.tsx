'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/api-client';
import { adminEndpoints } from '@/lib/api-paths';

type DocumentItem = {
  id: string;
  name: string;
  fileUrl?: string | null;
  caseId?: string | null;
  createdAt: string;
};

export default function DocumentsPage() {
  const [list, setList] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bulkNames, setBulkNames] = useState('');
  const [bulkCaseId, setBulkCaseId] = useState('');
  const [uploadCaseId, setUploadCaseId] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(adminEndpoints.documentsList());
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      setList(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFiles?.length) {
      setError('Pilih minimal satu file');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append('files', selectedFiles[i]);
      }
      if (uploadCaseId.trim()) formData.set('caseId', uploadCaseId.trim());
      const res = await adminFetch(adminEndpoints.documentUpload(), {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
      setSelectedFiles(null);
      setUploadCaseId('');
      const fileInput = document.getElementById('doc-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal upload');
    } finally {
      setUploading(false);
    }
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const names = bulkNames.split('\n').map((s) => s.trim()).filter(Boolean);
    if (names.length === 0) {
      setError('Isi minimal satu nama dokumen (satu per baris)');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const res = await adminFetch(adminEndpoints.documentBulkUpload(), {
        method: 'POST',
        body: JSON.stringify({
          caseId: bulkCaseId.trim() || null,
          documents: names.map((name) => ({ name, caseId: bulkCaseId.trim() || undefined })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
      setBulkNames('');
      setBulkCaseId('');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <p className="text-gray-600 mb-4">W4 — Advanced Document Management</p>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-3">Upload File</h2>
        <form onSubmit={handleFileUpload}>
          <div className="mb-3">
            <label className="block text-sm text-gray-600 mb-1">Case ID (opsional)</label>
            <input
              type="text"
              value={uploadCaseId}
              onChange={(e) => setUploadCaseId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 w-full max-w-md"
              placeholder="UUID case"
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm text-gray-600 mb-1">Pilih file</label>
            <p className="text-xs text-gray-500 mb-1">Maks. 4 MB per file. Format: PDF, DOC, DOCX, XLS, XLSX, TXT, PNG, JPG, JPEG, GIF, WEBP</p>
            <input
              id="doc-file-input"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.gif,.webp"
              onChange={(e) => setSelectedFiles(e.target.files)}
              className="border border-gray-300 rounded-lg px-3 py-2 w-full max-w-md file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#1B4965] file:text-white file:text-sm"
            />
            {selectedFiles?.length ? (
              <p className="text-sm text-gray-500 mt-1">
                {selectedFiles.length} file dipilih
                {Array.from(selectedFiles).some((f) => f.size > 4 * 1024 * 1024)
                  ? ' — ada file yang melebihi 4 MB'
                  : ''}
              </p>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={
              uploading ||
              !selectedFiles?.length ||
              Array.from(selectedFiles).some((f) => f.size > 4 * 1024 * 1024)
            }
            className="px-4 py-2 bg-[#1B4965] text-white rounded-lg text-sm disabled:opacity-50"
          >
            {uploading ? 'Mengupload...' : 'Upload File'}
          </button>
        </form>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-3">Bulk Upload (nama saja, tanpa file)</h2>
        <form onSubmit={handleBulkUpload}>
          <div className="mb-3">
            <label className="block text-sm text-gray-600 mb-1">Case ID (opsional)</label>
            <input
              type="text"
              value={bulkCaseId}
              onChange={(e) => setBulkCaseId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 w-full max-w-md"
              placeholder="UUID case"
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm text-gray-600 mb-1">Nama dokumen (satu per baris)</label>
            <textarea
              value={bulkNames}
              onChange={(e) => setBulkNames(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 w-full h-24"
              placeholder="Dokumen1.pdf&#10;Dokumen2.docx"
            />
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm disabled:opacity-50"
          >
            {uploading ? '...' : 'Bulk Upload'}
          </button>
        </form>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <h2 className="font-semibold text-gray-800 p-4 border-b">Daftar Dokumen</h2>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Memuat...</div>
        ) : list.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Belum ada dokumen. Gunakan Bulk Upload.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Nama</th>
                  <th className="text-left p-3">File</th>
                  <th className="text-left p-3">Case ID</th>
                  <th className="text-left p-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {list.map((d) => (
                  <tr key={d.id} className="border-t border-gray-100">
                    <td className="p-3">{d.name}</td>
                    <td className="p-3">
                      {d.fileUrl ? (
                        <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="text-[#1B4965] underline">
                          Unduh
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-xs">{d.caseId?.slice(0, 8) ?? '—'}…</td>
                    <td className="p-3 text-gray-500">{new Date(d.createdAt).toLocaleDateString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
