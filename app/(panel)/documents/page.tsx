'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminFetch } from '@/lib/api-client';
import { adminEndpoints } from '@/lib/api-paths';
import { Filter, Lock, History } from 'lucide-react';

type DocumentItem = {
  id: string;
  name: string;
  fileUrl?: string | null;
  caseId?: string | null;
  folder?: string | null;
  clientVisible?: boolean;
  checkedOutById?: string | null;
  checkedOutAt?: string | null;
  esignStatus?: string | null;
  esignSignedAt?: string | null;
  createdAt: string;
  case?: { id: string; title: string; caseNumber?: string | null } | null;
  checkedOutByUser?: { id: string; name: string | null } | null;
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
  const [filterClientVisible, setFilterClientVisible] = useState('');
  const [filterFolder, setFilterFolder] = useState('');
  const [detailDoc, setDetailDoc] = useState<DocumentItem | null>(null);
  const [auditLogs, setAuditLogs] = useState<Array<{ id: string; action: string; createdAt: string }>>([]);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string }>>([]);
  const [genCaseId, setGenCaseId] = useState('');
  const [genTemplateId, setGenTemplateId] = useState('');
  const [genName, setGenName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { clientVisible?: string; folder?: string } = {};
      if (filterClientVisible !== '') params.clientVisible = filterClientVisible;
      if (filterFolder) params.folder = filterFolder;
      const res = await adminFetch(adminEndpoints.documentsList(params));
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      setList(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat');
    } finally {
      setLoading(false);
    }
  }, [filterClientVisible, filterFolder]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    adminFetch(adminEndpoints.documentTemplatesList()).then((r) => r.ok && r.json()).then((j) => {
      setTemplates(Array.isArray(j?.data) ? j.data : []);
    }).catch(() => {});
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

  const openDetail = async (d: DocumentItem) => {
    setDetailDoc(d);
    const res = await adminFetch(adminEndpoints.documentAuditLog(d.id));
    if (res.ok) {
      const j = await res.json();
      setAuditLogs(Array.isArray(j?.data) ? j.data : []);
    } else {
      setAuditLogs([]);
    }
  };

  const handleCheckOut = async (id: string) => {
    try {
      const res = await adminFetch(adminEndpoints.documentCheckOut(id), { method: 'POST' });
      if (!res.ok) throw new Error('Gagal check-out');
      const updated = await res.json();
      setList((prev) => prev.map((x) => (x.id === id ? { ...x, ...updated } : x)));
      if (detailDoc?.id === id) setDetailDoc((prev) => (prev ? { ...prev, ...updated } : null));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal check-out');
    }
  };

  const handleCheckIn = async (id: string) => {
    try {
      const res = await adminFetch(adminEndpoints.documentCheckIn(id), { method: 'POST' });
      if (!res.ok) throw new Error('Gagal check-in');
      const updated = await res.json();
      setList((prev) => prev.map((x) => (x.id === id ? { ...x, ...updated } : x)));
      if (detailDoc?.id === id) setDetailDoc((prev) => (prev ? { ...prev, ...updated } : null));
      openDetail(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal check-in');
    }
  };

  const handleSendForSignature = async (id: string) => {
    try {
      const res = await adminFetch(adminEndpoints.documentSendForSignature(id), {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error('Gagal kirim');
      const updated = await res.json();
      setList((prev) => prev.map((x) => (x.id === id ? { ...x, ...updated } : x)));
      if (detailDoc?.id === id) setDetailDoc((prev) => (prev ? { ...prev, ...updated } : null));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal kirim untuk tanda tangan');
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;
    setSavingTemplate(true);
    setError(null);
    try {
      const res = await adminFetch(adminEndpoints.documentTemplateCreate(), {
        method: 'POST',
        body: JSON.stringify({ name: newTemplateName.trim(), category: newTemplateCategory.trim() || null }),
      });
      if (!res.ok) throw new Error('Gagal buat template');
      const t = await res.json();
      setTemplates((prev) => [...prev, { id: t.id, name: t.name }]);
      setNewTemplateName('');
      setNewTemplateCategory('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal buat template');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleGenerateFromTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genTemplateId || !genCaseId) {
      setError('Pilih template dan case');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await adminFetch(adminEndpoints.documentGenerateFromTemplate(), {
        method: 'POST',
        body: JSON.stringify({
          templateId: genTemplateId,
          caseId: genCaseId,
          outputName: genName.trim() || 'Generated Document',
        }),
      });
      if (!res.ok) throw new Error('Gagal generate');
      setGenCaseId('');
      setGenTemplateId('');
      setGenName('');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal generate');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <p className="text-gray-600 mb-2">W4 — Document Management (legal-grade)</p>
      <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <Filter className="w-4 h-4 text-slate-500" />
        <select value={filterClientVisible} onChange={(e) => setFilterClientVisible(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
          <option value="">Semua visibilitas</option>
          <option value="true">Tampil ke klien</option>
          <option value="false">Internal saja</option>
        </select>
        <input
          type="text"
          value={filterFolder}
          onChange={(e) => setFilterFolder(e.target.value)}
          placeholder="Filter folder"
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-40"
        />
      </div>
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
        <h2 className="font-semibold text-gray-800 mb-3">Templat Dokumen</h2>
        <form onSubmit={handleCreateTemplate} className="flex flex-wrap gap-3 items-end mb-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Nama template</label>
            <input type="text" value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} placeholder="Contoh: Surat Kuasa" className="border border-gray-300 rounded-lg px-3 py-2 w-48" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Kategori</label>
            <input type="text" value={newTemplateCategory} onChange={(e) => setNewTemplateCategory(e.target.value)} placeholder="Opsional" className="border border-gray-300 rounded-lg px-3 py-2 w-32" />
          </div>
          <button type="submit" disabled={savingTemplate || !newTemplateName.trim()} className="px-4 py-2 bg-slate-600 text-white rounded-lg text-sm disabled:opacity-50">Tambah template</button>
        </form>
        <h3 className="font-medium text-gray-700 mb-2">Generate dari Template</h3>
        <form onSubmit={handleGenerateFromTemplate} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Template</label>
            <select value={genTemplateId} onChange={(e) => setGenTemplateId(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 w-48" required>
              <option value="">— Pilih —</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Case ID</label>
            <input type="text" value={genCaseId} onChange={(e) => setGenCaseId(e.target.value)} placeholder="UUID case" className="border border-gray-300 rounded-lg px-3 py-2 w-64" required />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Nama output (opsional)</label>
            <input type="text" value={genName} onChange={(e) => setGenName(e.target.value)} placeholder="Nama dokumen" className="border border-gray-300 rounded-lg px-3 py-2 w-48" />
          </div>
          <button type="submit" disabled={generating} className="px-4 py-2 bg-[#1B4965] text-white rounded-lg text-sm disabled:opacity-50">
            {generating ? '...' : 'Generate'}
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
                  <th className="text-left p-3">Case</th>
                  <th className="text-left p-3">Check-out</th>
                  <th className="text-left p-3">E-sign</th>
                  <th className="text-left p-3">Created</th>
                  <th className="text-left p-3">Aksi</th>
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
                    <td className="p-3 text-sm">{d.case?.title ?? (d.caseId ? `${d.caseId.slice(0, 8)}…` : '—')}</td>
                    <td className="p-3">
                      {d.checkedOutByUser ? (
                        <span className="text-amber-700 text-xs" title={d.checkedOutAt ?? ''}>
                          <Lock className="w-4 h-4 inline mr-1" /> {d.checkedOutByUser.name ?? '—'}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      {d.esignStatus ? (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${d.esignStatus === 'signed' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                          {d.esignStatus}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-3 text-gray-500">{new Date(d.createdAt).toLocaleDateString('id-ID')}</td>
                    <td className="p-3">
                      <button type="button" onClick={() => openDetail(d)} className="text-[#1B4965] hover:underline text-xs mr-2">Detail</button>
                      {!d.checkedOutById && <button type="button" onClick={() => handleCheckOut(d.id)} className="text-amber-600 hover:underline text-xs mr-2">Check-out</button>}
                      {d.checkedOutById && <button type="button" onClick={() => handleCheckIn(d.id)} className="text-green-600 hover:underline text-xs mr-2">Check-in</button>}
                      {!d.esignStatus && <button type="button" onClick={() => handleSendForSignature(d.id)} className="text-slate-600 hover:underline text-xs">E-sign</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detailDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">{detailDoc.name}</h3>
              <button type="button" onClick={() => setDetailDoc(null)} className="text-gray-500 hover:text-gray-700">×</button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-sm text-gray-600 mb-2">Case: {detailDoc.case?.title ?? detailDoc.caseId ?? '—'}</p>
              {detailDoc.checkedOutByUser && (
                <p className="text-sm text-amber-700 mb-2"><Lock className="w-4 h-4 inline" /> Checked out by: {detailDoc.checkedOutByUser.name}</p>
              )}
              {detailDoc.esignStatus && <p className="text-sm mb-2">E-sign: <span className="font-medium">{detailDoc.esignStatus}</span></p>}
              <div className="mt-4">
                <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-1"><History className="w-4 h-4" /> Audit log</h4>
                <ul className="text-xs space-y-1 max-h-40 overflow-y-auto">
                  {auditLogs.length === 0 ? <li className="text-gray-500">Belum ada aktivitas</li> : auditLogs.map((log) => (
                    <li key={log.id} className="text-gray-600">{log.action} — {new Date(log.createdAt).toLocaleString('id-ID')}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 flex gap-2">
                {!detailDoc.checkedOutById && <button type="button" onClick={() => handleCheckOut(detailDoc.id)} className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded text-sm">Check-out</button>}
                {detailDoc.checkedOutById && <button type="button" onClick={() => handleCheckIn(detailDoc.id)} className="px-3 py-1.5 bg-green-100 text-green-800 rounded text-sm">Check-in</button>}
                {!detailDoc.esignStatus && <button type="button" onClick={() => handleSendForSignature(detailDoc.id)} className="px-3 py-1.5 bg-slate-100 text-slate-800 rounded text-sm">Kirim untuk tanda tangan</button>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
