'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

type Status = '未送信' | '送信済み' | '返信あり' | '成約' | '断られた';
type Platform = 'X' | 'Instagram' | 'LINE' | 'その他';

type Target = {
  id: string;
  name: string;
  lineId: string;
  platform: Platform;
  status: Status;
  memo: string;
  createdAt: string;
};

const STATUS_COLORS: Record<Status, string> = {
  '未送信': 'bg-zinc-700 text-zinc-300',
  '送信済み': 'bg-blue-700 text-blue-100',
  '返信あり': 'bg-yellow-600 text-yellow-100',
  '成約': 'bg-green-700 text-green-100',
  '断られた': 'bg-red-900 text-red-300',
};

const STATUSES: Status[] = ['未送信', '送信済み', '返信あり', '成約', '断られた'];
const PLATFORMS: Platform[] = ['X', 'Instagram', 'LINE', 'その他'];
const STORAGE_KEY = 'growup_target_list';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// CSVの1行をパース（ダブルクォート対応）
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuote = !inQuote; }
    } else if (ch === ',' && !inQuote) {
      result.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

// スクレイパーCSV (ID,店舗名,LINE情報,URL) をTargetに変換
function csvToTargets(text: string): { imported: Target[]; skipped: number } {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim());
  // BOM除去・ヘッダースキップ
  const dataLines = lines.filter((l) => {
    const clean = l.replace(/^﻿/, '');
    return !clean.startsWith('ID,') && !clean.startsWith('"ID"');
  });

  const imported: Target[] = [];
  let skipped = 0;

  for (const line of dataLines) {
    const cols = parseCsvLine(line.replace(/^﻿/, ''));
    if (cols.length < 2) { skipped++; continue; }

    const name = cols[1]?.trim() || cols[0]?.trim();
    if (!name) { skipped++; continue; }

    imported.push({
      id: uid(),
      name,
      lineId: cols[2]?.trim() ?? '',
      platform: 'その他',
      status: '未送信',
      memo: cols[3]?.trim() ? `エステラブ: ${cols[3].trim()}` : '',
      createdAt: new Date().toLocaleDateString('ja-JP'),
    });
  }

  return { imported, skipped };
}

export default function ListPage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [filterStatus, setFilterStatus] = useState<Status | 'すべて'>('すべて');
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; dupes: number } | null>(null);
  const [form, setForm] = useState<Omit<Target, 'id' | 'createdAt'>>({
    name: '', lineId: '', platform: 'X', status: '未送信', memo: '',
  });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setTargets(JSON.parse(saved));
  }, []);

  function save(list: Target[]) {
    setTargets(list);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function resetForm() {
    setForm({ name: '', lineId: '', platform: 'X', status: '未送信', memo: '' });
    setEditId(null);
    setShowForm(false);
  }

  function submitForm() {
    if (!form.name.trim()) return;
    if (editId) {
      save(targets.map((t) => (t.id === editId ? { ...t, ...form } : t)));
    } else {
      save([{ id: uid(), createdAt: new Date().toLocaleDateString('ja-JP'), ...form }, ...targets]);
    }
    resetForm();
  }

  function startEdit(t: Target) {
    setForm({ name: t.name, lineId: t.lineId, platform: t.platform, status: t.status, memo: t.memo });
    setEditId(t.id);
    setShowForm(true);
  }

  function updateStatus(id: string, status: Status) {
    save(targets.map((t) => (t.id === id ? { ...t, status } : t)));
  }

  function deleteTarget(id: string) {
    if (confirm('削除しますか？')) save(targets.filter((t) => t.id !== id));
  }

  function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { imported, skipped } = csvToTargets(text);

      // 重複チェック（LINE情報が同じものを除外）
      const existingLineIds = new Set(targets.map((t) => t.lineId).filter(Boolean));
      const fresh = imported.filter((t) => !t.lineId || !existingLineIds.has(t.lineId));
      const dupes = imported.length - fresh.length;

      save([...fresh, ...targets]);
      setImportResult({ imported: fresh.length, skipped, dupes });
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  }

  const filtered = filterStatus === 'すべて' ? targets : targets.filter((t) => t.status === filterStatus);

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = targets.filter((t) => t.status === s).length;
    return acc;
  }, {} as Record<Status, number>);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* ヘッダー */}
      <header className="sticky top-0 z-50 bg-zinc-900/90 backdrop-blur border-b border-zinc-800">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-zinc-500 hover:text-white transition-colors text-sm">← DM</Link>
            <div>
              <span className="text-blue-400 font-black text-lg">GrowUP</span>
              <span className="text-zinc-400 text-sm ml-2">ターゲットリスト</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-bold px-3 py-1.5 rounded-lg transition-colors"
            >
              📥 CSV
            </button>
            <button
              onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', lineId: '', platform: 'X', status: '未送信', memo: '' }); }}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-3 py-1.5 rounded-lg transition-colors"
            >
              ＋ 追加
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">

        {/* インポート結果バナー */}
        {importResult && (
          <div className="bg-green-900/50 border border-green-700 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="text-sm">
              <span className="font-black text-green-300">{importResult.imported}件</span>
              <span className="text-green-400">をインポートしました</span>
              {importResult.dupes > 0 && <span className="text-zinc-500 ml-2">（重複{importResult.dupes}件スキップ）</span>}
              {importResult.skipped > 0 && <span className="text-zinc-500 ml-1">（不正{importResult.skipped}件スキップ）</span>}
            </div>
            <button onClick={() => setImportResult(null)} className="text-zinc-500 hover:text-white text-lg leading-none">✕</button>
          </div>
        )}

        {/* サマリー */}
        <div className="grid grid-cols-5 gap-2">
          {STATUSES.map((s) => (
            <div key={s} className="bg-zinc-900 rounded-xl p-2 text-center">
              <div className="text-lg font-black">{counts[s]}</div>
              <div className="text-[10px] text-zinc-500 leading-tight mt-0.5">{s}</div>
            </div>
          ))}
        </div>

        {/* フィルター */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {(['すべて', ...STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                filterStatus === s ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {s}
              {s !== 'すべて' && <span className="ml-1 opacity-60">{counts[s]}</span>}
            </button>
          ))}
        </div>

        {/* リスト */}
        {filtered.length === 0 ? (
          <div className="text-center text-zinc-600 py-16">
            <div className="text-4xl mb-3">📋</div>
            <div className="text-sm">まだターゲットが登録されていません</div>
            <button
              onClick={() => setShowImport(true)}
              className="mt-4 text-xs text-blue-400 hover:text-blue-300 underline"
            >
              CSVからインポートする
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((t) => (
              <div key={t.id} className="bg-zinc-900 rounded-2xl px-4 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-sm truncate">{t.name}</span>
                      <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{t.platform}</span>
                    </div>
                    {t.lineId && (
                      <a
                        href={t.lineId.startsWith('http') ? t.lineId : `https://line.me/ti/p/${t.lineId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-green-400 hover:text-green-300 underline mb-1 block truncate"
                      >
                        LINE: {t.lineId}
                      </a>
                    )}
                    {t.memo && (
                      <div className="text-xs text-zinc-500 truncate">{t.memo}</div>
                    )}
                    <div className="text-[10px] text-zinc-700 mt-1">{t.createdAt}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${STATUS_COLORS[t.status]}`}>
                      {t.status}
                    </span>
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(t)} className="text-xs text-zinc-500 hover:text-white px-2 py-1 rounded bg-zinc-800 transition-colors">編集</button>
                      <button onClick={() => deleteTarget(t.id)} className="text-xs text-zinc-600 hover:text-red-400 px-2 py-1 rounded bg-zinc-800 transition-colors">✕</button>
                    </div>
                  </div>
                </div>

                {/* ステータス変更 */}
                <div className="flex gap-1.5 mt-3 flex-wrap">
                  {STATUSES.filter((s) => s !== t.status).map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(t.id, s)}
                      className="text-[10px] px-2 py-1 rounded-full bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-white transition-colors"
                    >
                      → {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CSVインポートモーダル */}
      {showImport && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowImport(false); }}>
          <div className="bg-zinc-900 rounded-2xl w-full max-w-xl p-5 space-y-4">
            <h2 className="font-black text-base">📥 CSVインポート</h2>

            <div className="bg-zinc-800 rounded-xl p-4 space-y-1 text-xs text-zinc-400">
              <div className="font-bold text-zinc-300 mb-2">対応フォーマット</div>
              <div>スクレイパー出力CSVをそのまま読み込めます</div>
              <div className="font-mono text-zinc-500 text-[10px] mt-2">ID, 店舗名, LINE情報, URL</div>
              <div className="mt-2 text-zinc-500">※ 重複（同じLINE情報）は自動でスキップされます</div>
            </div>

            <button
              onClick={() => fileRef.current?.click()}
              className="w-full py-4 rounded-xl border-2 border-dashed border-zinc-600 hover:border-blue-500 text-zinc-400 hover:text-blue-400 font-bold transition-all text-sm"
            >
              ファイルを選択してインポート
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => { handleFileImport(e); setShowImport(false); }}
            />

            <button onClick={() => setShowImport(false)} className="w-full py-3 rounded-xl bg-zinc-800 text-zinc-400 font-bold text-sm hover:bg-zinc-700 transition-colors">
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* 追加・編集モーダル */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}>
          <div className="bg-zinc-900 rounded-2xl w-full max-w-xl p-5 space-y-4">
            <h2 className="font-black text-base">{editId ? 'ターゲットを編集' : 'ターゲットを追加'}</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">アカウント名・源氏名 <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="例：@めい_メンエス"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">LINE ID / LINE@</label>
                <input
                  type="text"
                  value={form.lineId}
                  onChange={(e) => setForm({ ...form, lineId: e.target.value })}
                  placeholder="例：@mei_mens / https://lin.ee/..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">プラットフォーム</label>
                  <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value as Platform })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500">
                    {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">ステータス</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500">
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">メモ</label>
                <input
                  type="text"
                  value={form.memo}
                  onChange={(e) => setForm({ ...form, memo: e.target.value })}
                  placeholder="例：グロービー掲載・返信遅め"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={resetForm} className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-400 font-bold text-sm hover:bg-zinc-700 transition-colors">キャンセル</button>
              <button onClick={submitForm} disabled={!form.name.trim()} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {editId ? '更新する' : '追加する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
