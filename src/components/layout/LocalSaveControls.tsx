import { useGameStore } from '../../stores/gameStore';
import { useRef, useState, useEffect } from 'react';
import { exportLocalSave, importLocalSave } from '../../lib/storage/localDatabase';

export default function LocalSaveControls() {
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('Saved on this browser. Export backups to keep a separate copy.');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const failed = () => setMessage('Saving failed. Keep this tab open and free browser storage before continuing.');
    window.addEventListener('local-save-error', failed);
    return () => window.removeEventListener('local-save-error', failed);
  }, []);
  async function download() {
    try {
      const url = URL.createObjectURL(new Blob([await exportLocalSave(useGameStore.getState() as unknown as Record<string, unknown>)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'paws-and-pedigrees-backup.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('Backup downloaded. Keep it somewhere safe.');
    } catch { setMessage('Backup failed. Your game remains open; please retry.'); }
  }
  return <div className="bg-earth-100 text-earth-900 p-3 text-sm flex flex-wrap items-center gap-3">
    <strong>Local play</strong><span role="status">{message}</span>
    <button className="inline-button underline" disabled={busy} onClick={() => void download()}>Export backup</button>
    <button className="inline-button underline" disabled={busy} onClick={() => input.current?.click()}>Restore backup</button>
    <button className="inline-button underline" onClick={async () => {
      const granted = await navigator.storage?.persist?.().catch(() => false);
      setMessage(granted ? 'Browser storage protection enabled. Keep exporting backups too.' : 'Browser storage protection was not granted. Keep regular backups.');
    }}>Protect local save</button>
    <input ref={input} type="file" accept="application/json,.json" hidden onChange={async event => {
      const file = event.target.files?.[0]; event.target.value = '';
      if (!file || !window.confirm('Replace this browser?s kennel with this backup? Export your current kennel first if you want to keep both.')) return;
      setBusy(true);
      try {
        if (file.size > 25 * 1024 * 1024) throw new Error('Backup is too large.');
        await importLocalSave(await file.text()); location.reload();
      } catch (error) { setMessage(error instanceof Error ? error.message : 'Restore failed.'); setBusy(false); }
    }} />
  </div>;
}
