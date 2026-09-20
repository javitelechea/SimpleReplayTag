import { getBuiltinTagLabel, t } from './i18n.js';
import { Storage } from './storage.js';
import { cloneButtons, uid, slugify } from './utils.js';

function hockeyButtons() {
    return [
        { id: 'tag-start', key: 'start', label: getBuiltinTagLabel('start'), row: 'top', pre_sec: 0, post_sec: 1, order: 0 },
        { id: 'tag-salida', key: 'salida', label: getBuiltinTagLabel('salida'), row: 'top', pre_sec: 3, post_sec: 10, order: 1 },
        { id: 'tag-ataque', key: 'ataque', label: getBuiltinTagLabel('ataque'), row: 'top', pre_sec: 3, post_sec: 8, order: 2 },
        { id: 'tag-area', key: 'area', label: getBuiltinTagLabel('area'), row: 'top', pre_sec: 6, post_sec: 4, order: 3 },
        { id: 'tag-contragolpe', key: 'contragolpe', label: getBuiltinTagLabel('contragolpe'), row: 'top', pre_sec: 5, post_sec: 7, order: 4 },
        { id: 'tag-cc-at', key: 'cc_at', label: getBuiltinTagLabel('cc_at'), row: 'top', pre_sec: 3, post_sec: 8, order: 5 },
        { id: 'tag-gol', key: 'gol', label: getBuiltinTagLabel('gol'), row: 'top', pre_sec: 10, post_sec: 3, order: 6 },
        { id: 'tag-especial', key: 'especial', label: getBuiltinTagLabel('especial'), row: 'bottom', pre_sec: 7, post_sec: 7, order: 7 },
        { id: 'tag-bloqueo', key: 'bloqueo', label: getBuiltinTagLabel('bloqueo'), row: 'bottom', pre_sec: 3, post_sec: 10, order: 8 },
        { id: 'tag-defensa', key: 'defensa', label: getBuiltinTagLabel('defensa'), row: 'bottom', pre_sec: 3, post_sec: 8, order: 9 },
        { id: 'tag-area-ec', key: 'area_ec', label: getBuiltinTagLabel('area_ec'), row: 'bottom', pre_sec: 6, post_sec: 4, order: 10 },
        { id: 'tag-contragolpe-ec', key: 'contragolpe_ec', label: getBuiltinTagLabel('contragolpe_ec'), row: 'bottom', pre_sec: 5, post_sec: 7, order: 11 },
        { id: 'tag-cc-def', key: 'cc_def', label: getBuiltinTagLabel('cc_def'), row: 'bottom', pre_sec: 3, post_sec: 8, order: 12 },
        { id: 'tag-gol-ec', key: 'gol_ec', label: getBuiltinTagLabel('gol_ec'), row: 'bottom', pre_sec: 10, post_sec: 3, order: 13 },
    ].map((b) => ({ captureMode: 'fixed', hotkey: '', voiceAliases: [], ...b }));
}

function footballButtons() {
    return [
        { id: 'fb-inicio', key: 'fb_inicio', label: getBuiltinTagLabel('fb_inicio'), row: 'top', pre_sec: 2, post_sec: 12, order: 0 },
        { id: 'fb-desarrollo', key: 'fb_desarrollo', label: getBuiltinTagLabel('fb_desarrollo'), row: 'top', pre_sec: 3, post_sec: 8, order: 1 },
        { id: 'fb-llegadas', key: 'fb_llegadas', label: getBuiltinTagLabel('fb_llegadas'), row: 'top', pre_sec: 10, post_sec: 3, order: 2 },
        { id: 'fb-transicion', key: 'fb_transicion', label: getBuiltinTagLabel('fb_transicion'), row: 'top', pre_sec: 4, post_sec: 8, order: 3 },
        { id: 'fb-gol', key: 'fb_gol', label: getBuiltinTagLabel('fb_gol'), row: 'top', pre_sec: 10, post_sec: 3, order: 4 },
        { id: 'fb-sda', key: 'fb_sda', label: getBuiltinTagLabel('fb_sda'), row: 'top', pre_sec: 2, post_sec: 10, order: 5 },
        { id: 'fb-corner', key: 'fb_corner', label: getBuiltinTagLabel('fb_corner'), row: 'top', pre_sec: 2, post_sec: 6, order: 6 },
        { id: 'fb-tl', key: 'fb_tl', label: getBuiltinTagLabel('fb_tl'), row: 'top', pre_sec: 2, post_sec: 6, order: 7 },
        { id: 'fb-lateral', key: 'fb_lateral', label: getBuiltinTagLabel('fb_lateral'), row: 'top', pre_sec: 2, post_sec: 6, order: 8 },
        { id: 'fb-r-inicio', key: 'fb_r_inicio', label: getBuiltinTagLabel('fb_r_inicio'), row: 'bottom', pre_sec: 2, post_sec: 12, order: 9 },
        { id: 'fb-r-desarrollo', key: 'fb_r_desarrollo', label: getBuiltinTagLabel('fb_r_desarrollo'), row: 'bottom', pre_sec: 3, post_sec: 8, order: 10 },
        { id: 'fb-r-llegadas', key: 'fb_r_llegadas', label: getBuiltinTagLabel('fb_r_llegadas'), row: 'bottom', pre_sec: 10, post_sec: 3, order: 11 },
        { id: 'fb-r-transicion', key: 'fb_r_transicion', label: getBuiltinTagLabel('fb_r_transicion'), row: 'bottom', pre_sec: 4, post_sec: 8, order: 12 },
        { id: 'fb-r-gol', key: 'fb_r_gol', label: getBuiltinTagLabel('fb_r_gol'), row: 'bottom', pre_sec: 10, post_sec: 3, order: 13 },
        { id: 'fb-r-sda', key: 'fb_r_sda', label: getBuiltinTagLabel('fb_r_sda'), row: 'bottom', pre_sec: 2, post_sec: 10, order: 14 },
        { id: 'fb-r-corner', key: 'fb_r_corner', label: getBuiltinTagLabel('fb_r_corner'), row: 'bottom', pre_sec: 2, post_sec: 6, order: 15 },
        { id: 'fb-r-tl', key: 'fb_r_tl', label: getBuiltinTagLabel('fb_r_tl'), row: 'bottom', pre_sec: 2, post_sec: 6, order: 16 },
        { id: 'fb-r-lateral', key: 'fb_r_lateral', label: getBuiltinTagLabel('fb_r_lateral'), row: 'bottom', pre_sec: 2, post_sec: 6, order: 17 },
    ].map((b) => ({ captureMode: 'fixed', hotkey: '', voiceAliases: [], ...b }));
}

export function getSystemTemplates() {
    return [
        { id: 'builtin-default', name: t('bb.hockeyDefault'), isSystem: true, order: 0, buttons: hockeyButtons() },
        { id: 'builtin-football', name: t('bb.footballDefault'), isSystem: true, order: 1, buttons: footballButtons() },
    ];
}

export function getUserTemplates() {
    return Storage.getUserTemplates();
}

export function getAllTemplates() {
    return [...getSystemTemplates(), ...getUserTemplates()];
}

export function getTemplateById(id) {
    return getAllTemplates().find((tpl) => tpl.id === id) || null;
}

export function cloneTemplate(template, name) {
    return {
        id: uid('bb'),
        name: name || template?.name || t('js.codeWindowDefault'),
        sourceTemplateId: template?.id || null,
        buttons: cloneButtons(template?.buttons || []),
        isSystem: false,
    };
}

export function saveUserTemplate(data) {
    const list = getUserTemplates();
    const buttons = cloneButtons(data.buttons || []).map((b, i) => ({
        ...b,
        id: b.id || uid('tag'),
        key: b.key || slugify(b.label),
        order: i,
        captureMode: b.captureMode === 'manual' ? 'manual' : 'fixed',
        voiceAliases: Array.isArray(b.voiceAliases) ? b.voiceAliases : [],
        hotkey: b.hotkey || '',
    }));
    const now = new Date().toISOString();
    if (data.id && list.some((t0) => t0.id === data.id)) {
        const next = list.map((tpl) => tpl.id === data.id
            ? { ...tpl, name: data.name || t('js.noName'), buttons, updatedAt: now, isSystem: false }
            : tpl);
        Storage.setUserTemplates(next);
        return data.id;
    }
    const id = data.id || uid('bb');
    list.unshift({
        id,
        name: data.name || t('js.noName'),
        buttons,
        isSystem: false,
        createdAt: now,
        updatedAt: now,
    });
    Storage.setUserTemplates(list);
    return id;
}

export function deleteUserTemplate(id) {
    Storage.setUserTemplates(getUserTemplates().filter((tpl) => tpl.id !== id));
}

export function duplicateTemplate(template) {
    return saveUserTemplate({
        name: `${template.name || t('js.codeWindowDefault')} ${t('js.templateCopy')}`,
        buttons: cloneButtons(template.buttons),
    });
}

export function exportTemplateJson(template) {
    return JSON.stringify({
        version: 1,
        kind: 'simple-replay-tag-window',
        name: template.name,
        buttons: cloneButtons(template.buttons),
    }, null, 2);
}

export function parseTemplateJson(text) {
    const data = JSON.parse(text);
    const buttons = Array.isArray(data.buttons) ? data.buttons : data.tagTypes;
    if (!Array.isArray(buttons)) throw new Error('invalid');
    return {
        name: data.name || t('js.codeWindowDefault'),
        buttons: cloneButtons(buttons),
    };
}

export function normalizeButton(btn, index = 0) {
    return {
        id: btn.id || uid('tag'),
        key: btn.key || slugify(btn.label),
        label: btn.label || t('bb.button'),
        row: btn.row === 'bottom' ? 'bottom' : 'top',
        pre_sec: Number(btn.pre_sec) || 0,
        post_sec: Number(btn.post_sec) || 0,
        captureMode: btn.captureMode === 'manual' ? 'manual' : 'fixed',
        hotkey: btn.hotkey || '',
        voiceAliases: Array.isArray(btn.voiceAliases) ? btn.voiceAliases : [],
        order: Number.isFinite(btn.order) ? btn.order : index,
        isHidden: !!btn.isHidden,
    };
}

export function ensureHockeyEspecial(buttons) {
    const list = Array.isArray(buttons) ? buttons.map((b) => ({ ...b })) : [];
    if (!list.some((b) => b.id === 'tag-start' || b.key === 'start')) return list;
    if (list.some((b) => b.id === 'tag-especial' || b.key === 'especial')) return list;
    const especial = {
        id: 'tag-especial',
        key: 'especial',
        label: getBuiltinTagLabel('especial'),
        row: 'bottom',
        pre_sec: 7,
        post_sec: 7,
        captureMode: 'fixed',
        hotkey: '',
        voiceAliases: [],
        order: 0,
    };
    const firstBottom = list.findIndex((b) => b.row === 'bottom');
    if (firstBottom >= 0) list.splice(firstBottom, 0, especial);
    else list.push(especial);
    return list.map((b, i) => ({ ...b, order: i }));
}
