export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function uid(prefix = 'id') {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function slugify(text) {
    return String(text || 'tag')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/[^a-z0-9_]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'tag';
}

export function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function formatTime(sec) {
    const total = Math.max(0, Math.round(Number(sec) || 0));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatClock(sec) {
    const total = Math.max(0, Number(sec) || 0);
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    const t = Math.floor((total % 1) * 10);
    return `${m}:${String(s).padStart(2, '0')}.${t}`;
}

export function formatDateTime(iso) {
    try {
        return new Date(iso).toLocaleString();
    } catch (_) {
        return iso || '';
    }
}

export function cloneButtons(buttons) {
    return (buttons || []).map((b) => ({
        ...b,
        voiceAliases: Array.isArray(b.voiceAliases) ? [...b.voiceAliases] : [],
    }));
}

export function parseVoiceAliases(raw) {
    return String(raw || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

export function downloadBlob(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
}
