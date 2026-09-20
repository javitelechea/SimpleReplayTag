/* ═══════════════════════════════════════════
   SimpleReplay — Hotkey helpers
   ═══════════════════════════════════════════ */

/** Teclas reservadas por atajos globales (sin modificadores). */
export const TAG_HOTKEY_RESERVED = new Set([
    'Space',
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    'Tab', 'Enter', 'Escape',
    'Shift', 'Control', 'Meta', 'Alt',
]);

const TOP_ROW_AUTO_KEYS = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
const BOTTOM_ROW_AUTO_KEYS = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'];

const HOTKEY_DISPLAY = {
    Space: 'Space',
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
};

export function normalizeKeyName(key) {
    if (key === ' ') return 'Space';
    if (key === 'Spacebar') return 'Space';
    if (key.length === 1) return key.toUpperCase();
    return key;
}

export function normalizeStoredHotkey(raw) {
    const s = String(raw || '').trim();
    if (!s) return '';
    return normalizeKeyName(s);
}

export function formatHotkeyDisplay(key) {
    if (!key) return '—';
    return HOTKEY_DISPLAY[key] || key;
}

export function isValidTagHotkey(key) {
    if (!key) return false;
    if (TAG_HOTKEY_RESERVED.has(key)) return false;
    return true;
}

/** Atajo automático Q–P / A–L según fila y orden en la botonera. */
export function computeAutoTagHotkey(tag, tags) {
    if (!tag || tag.id === 'tag-start' || tag.id === 'tag-especial') return '';
    let topIdx = 0;
    let bottomIdx = 0;
    for (const t of tags) {
        if (t.isHidden || t.id === 'tag-start' || t.id === 'tag-especial') continue;
        const custom = normalizeStoredHotkey(t.hotkey);
        const isRival = t.row === 'bottom';
        if (custom) {
            if (t.id === tag.id) return custom;
            continue;
        }
        if (!isRival && topIdx < TOP_ROW_AUTO_KEYS.length) {
            if (t.id === tag.id) return TOP_ROW_AUTO_KEYS[topIdx];
            topIdx++;
        } else if (isRival && bottomIdx < BOTTOM_ROW_AUTO_KEYS.length) {
            if (t.id === tag.id) return BOTTOM_ROW_AUTO_KEYS[bottomIdx];
            bottomIdx++;
        }
    }
    return '';
}

export function getTagDisplayHotkey(tag, tags) {
    const custom = normalizeStoredHotkey(tag?.hotkey);
    if (custom) return custom;
    return computeAutoTagHotkey(tag, tags);
}

export function eventToTagHotkey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return null;
    const key = normalizeKeyName(e.key);
    if (!key || ['Shift', 'Control', 'Meta', 'Alt'].includes(key)) return null;
    return key;
}
