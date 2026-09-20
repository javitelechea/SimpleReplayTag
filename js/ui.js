import { t, resolveTagLabel } from './i18n.js';
import {
    formatHotkeyDisplay,
    getTagDisplayHotkey,
    isValidTagHotkey,
    normalizeStoredHotkey,
} from './hotkeys.js';
import * as AppState from './state.js';
import {
    deleteUserTemplate,
    duplicateTemplate,
    exportTemplateJson,
    getSystemTemplates,
    getUserTemplates,
    getAllTemplates,
    saveUserTemplate,
} from './templates.js';
import {
    $, $$, cloneButtons, downloadBlob, escapeHtml, formatDateTime,
    formatTime, parseVoiceAliases, slugify, uid,
} from './utils.js';

const HOTKEY_OPTIONS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

let _tagEditMode = false;
let _editingTagId = null;
let _creatingRow = null;
let _bbEditorModel = [];
let _bbEditorSelectedIdx = -1;
let _bbEditorCreateRow = null;
let _bbEditorId = null;
let _bbEditorDirty = false;

function toast(message, type = 'info') {
    const host = $('#toast-container');
    if (!host) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    host.appendChild(el);
    setTimeout(() => el.remove(), 2500);
}

function setToggleGroup(root, hiddenId, value) {
    const hidden = typeof hiddenId === 'string' ? root.querySelector(`#${hiddenId}`) || root.querySelector(`.${hiddenId}`) : hiddenId;
    if (hidden) hidden.value = value;
    const group = root.querySelector(`[data-target-input="${hidden?.id || hiddenId}"]`);
    group?.querySelectorAll('.tag-editor-toggle-btn, .bb-toggle-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.value === value);
    });
}

export function bindHotkeyCapture(btn, { getValue, setValue, onUpdated } = {}) {
    if (!btn) return;
    const paint = () => {
        const val = normalizeStoredHotkey(getValue?.() || '');
        btn.dataset.hotkey = val;
        btn.textContent = val ? formatHotkeyDisplay(val) : t('tag.hotkeyAuto');
        btn.classList.toggle('tag-edit-hotkey--auto', !val);
        btn.title = t('tag.hotkeyCapture');
    };
    paint();
    btn.onclick = () => {
        btn.classList.add('bb-hotkey-capture--listening');
        const onKey = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.key === 'Escape') {
                cleanup();
                return;
            }
            if (e.key === 'Backspace' || e.key === 'Delete') {
                setValue?.('');
                cleanup();
                onUpdated?.();
                paint();
                return;
            }
            const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
            if (!isValidTagHotkey(key)) {
                toast(t('tag.hotkeyReserved'), 'error');
                return;
            }
            setValue?.(HOTKEY_OPTIONS.includes(key) ? key : key);
            cleanup();
            onUpdated?.();
            paint();
        };
        const cleanup = () => {
            btn.classList.remove('bb-hotkey-capture--listening');
            window.removeEventListener('keydown', onKey, true);
        };
        window.addEventListener('keydown', onKey, true);
    };
}

export function showModal(id) {
    $(`#${id}`)?.classList.remove('hidden');
}

export function hideModal(id) {
    $(`#${id}`)?.classList.add('hidden');
}

export function renderHome() {
    const board = AppState.getActiveBoard();
    const boardName = board?.name || t('home.noBoard');
    $('#home-board-name').textContent = boardName;
    const preview = $('#home-board-preview');
    preview.innerHTML = '';
    (board?.buttons || []).filter((b) => !b.isHidden).forEach((b) => {
        const chip = document.createElement('span');
        const isNeutral = b.id === 'tag-start' || b.id === 'tag-especial' || b.key === 'start' || b.key === 'especial';
        chip.className = 'chip' + (isNeutral ? ' chip-neutral' : (b.row === 'bottom' ? ' chip-rival' : ''));
        chip.textContent = resolveTagLabel(b);
        preview.appendChild(chip);
    });

    const list = $('#home-session-list');
    const sessions = AppState.getSessions();
    if (!sessions.length) {
        list.innerHTML = `<p class="empty-hint">${escapeHtml(t('home.noSessions'))}</p>`;
        return;
    }
    list.innerHTML = sessions.map((s) => `
        <div class="session-item" data-id="${escapeHtml(s.id)}">
            <div class="session-item-main">
                <div class="session-item-title">${escapeHtml(s.name || t('js.unnamedSession'))}</div>
                <div class="session-item-meta">${escapeHtml(formatDateTime(s.updatedAt || s.createdAt))} · ${escapeHtml(t('home.clipsCount', { n: (s.clips || []).length }))} · ${escapeHtml(s.boardName || '')}</div>
            </div>
            <button type="button" class="btn btn-sm btn-primary btn-open-session" data-id="${escapeHtml(s.id)}">${escapeHtml(t('home.openSession'))}</button>
            <button type="button" class="btn btn-sm btn-ghost btn-delete-session" data-id="${escapeHtml(s.id)}">🗑️</button>
        </div>
    `).join('');
}

export function renderViews() {
    const view = AppState.getView();
    $('#view-home').classList.toggle('hidden', view !== 'home');
    $('#view-session').classList.toggle('hidden', view !== 'session');
    if (view === 'home') renderHome();
    if (view === 'session') {
        renderSessionChrome();
        renderTagButtons();
        renderEvents();
    }
}

export function renderSessionChrome() {
    const session = AppState.getCurrentSession();
    if (!session) return;
    const nameEl = $('#session-name');
    if (nameEl && document.activeElement !== nameEl) nameEl.value = session.name || '';
    renderClock();
}

export function renderClock() {
    const status = AppState.clockStatus();
    $('#clock-display').textContent = formatClockFace(AppState.getClock().now());
    const statusEl = $('#clock-status');
    statusEl.classList.toggle('is-live', status === 'running');
    statusEl.classList.toggle('is-paused', status === 'paused');
    const labels = {
        idle: t('session.idleHint'),
        running: t('session.runningHint'),
        paused: t('session.pausedHint'),
        stopped: t('session.stoppedHint'),
    };
    statusEl.textContent = labels[status] || labels.idle;
    $('#btn-clock-start').classList.toggle('hidden', status === 'running');
    $('#btn-clock-start').textContent = (status === 'paused' || status === 'stopped') ? t('session.resume') : t('session.start');
    $('#btn-clock-pause').classList.toggle('hidden', status !== 'running');
    $('#btn-clock-stop').classList.toggle('hidden', status === 'idle');
    if (status === 'stopped') {
        $('#btn-clock-start').classList.add('hidden');
        $('#btn-clock-pause').classList.add('hidden');
    }
}

function formatClockFace(sec) {
    const total = Math.max(0, Number(sec) || 0);
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    const t0 = Math.floor((total % 1) * 10);
    return `${m}:${String(s).padStart(2, '0')}.${t0}`;
}

export function renderEvents() {
    const list = $('#event-list');
    const session = AppState.getCurrentSession();
    const clips = [...(session?.clips || [])].reverse();
    if (!clips.length) {
        list.innerHTML = `<p class="empty-hint">${escapeHtml(t('session.noEvents'))}</p>`;
        return;
    }
    const tags = AppState.getButtons();
    list.innerHTML = clips.map((clip) => {
        const tag = tags.find((x) => x.id === clip.tag_type_id);
        const rival = tag && tag.row === 'bottom' && tag.id !== 'tag-especial' && tag.key !== 'especial';
        const label = resolveTagLabel(tag) || clip.tag_type_id;
        const open = clip.is_open ? ' is-open' : '';
        return `
            <div class="event-item${rival ? ' event-item-rival' : ''}${open}" data-id="${escapeHtml(clip.id)}">
                <span class="event-item-code">${escapeHtml(label)}</span>
                <span class="event-item-time">${escapeHtml(formatTime(clip.start_sec))}–${escapeHtml(formatTime(clip.end_sec))}</span>
                <button type="button" class="btn btn-xs btn-ghost btn-delete-clip" data-id="${escapeHtml(clip.id)}" title="${escapeHtml(t('session.deleteEvent'))}">✕</button>
            </div>
        `;
    }).join('');
}

export function renderTagButtons() {
    const containerTop = $('#tag-buttons-a');
    const containerBottom = $('#tag-buttons-b');
    if (!containerTop || !containerBottom) return;
    const tags = AppState.getButtons();
    const openManual = new Set(AppState.getOpenManualTagIds());
    containerTop.innerHTML = '';
    containerBottom.innerHTML = '';

    tags.filter((tag) => !tag.isHidden).forEach((tag) => {
        const btn = document.createElement('button');
        const displayLabel = resolveTagLabel(tag);
        const isNeutral = tag.id === 'tag-start' || tag.id === 'tag-especial' || tag.key === 'start' || tag.key === 'especial';
        const isRival = !isNeutral && tag.row === 'bottom';
        const captureMode = tag.captureMode === 'manual' ? 'manual' : 'fixed';
        const isManualOpen = captureMode === 'manual' && openManual.has(tag.id);
        let hotkey = '';
        if (!_tagEditMode && tag.id !== 'tag-start' && tag.id !== 'tag-especial') hotkey = getTagDisplayHotkey(tag, tags);

        btn.type = 'button';
        btn.className = 'tag-btn' + (isRival ? ' tag-btn-rival' : '') +
            (isNeutral ? ' tag-btn-neutral tag-btn-small' : '') +
            (_tagEditMode ? ' tag-edit-mode' : '') +
            (_editingTagId === tag.id ? ' tag-editing' : '') +
            (captureMode === 'manual' ? ' tag-btn-manual' : '') +
            (isManualOpen ? ' tag-btn-manual-open' : '');
        btn.dataset.tagId = tag.id;
        btn.dataset.captureMode = captureMode;
        btn.innerHTML = `<span class="tag-label-main">${escapeHtml(displayLabel)}</span>` +
            (hotkey ? `<span class="tag-hotkey-hint">[${escapeHtml(formatHotkeyDisplay(hotkey))}]</span>` : '');
        if (hotkey) btn.dataset.hotkey = hotkey;
        if (captureMode === 'manual') {
            const dot = document.createElement('span');
            dot.className = 'tag-manual-dot';
            btn.appendChild(dot);
        }
        const modeLabel = captureMode === 'manual' ? t('js.manualMode') : t('js.fixedMode');
        btn.title = _tagEditMode
            ? `${t('js.clickToEdit')} "${displayLabel}"`
            : `${displayLabel} — ${modeLabel} — Pre: ${tag.pre_sec}s | Post: ${tag.post_sec}s`;
        btn.addEventListener('click', (event) => onTagButtonClick(tag, btn, event));
        const host = tag.row === 'bottom' ? containerBottom : containerTop;
        if (_tagEditMode) {
            const wrap = document.createElement('div');
            wrap.className = 'tag-btn-wrap' + (isNeutral ? ' tag-btn-wrap-small' : '');
            wrap.appendChild(btn);
            wrap.appendChild(makeReorderControls(tag.id, tags));
            host.appendChild(wrap);
        } else {
            host.appendChild(btn);
        }
    });

    if (_tagEditMode) {
        const addTop = document.createElement('button');
        addTop.type = 'button';
        addTop.className = 'tag-btn tag-btn-add';
        addTop.textContent = '+';
        addTop.title = t('js.addTagOwn');
        addTop.addEventListener('click', () => openTagInlineEditor(null, 'top'));
        containerTop.appendChild(wrapAddButton(addTop));
        const addBottom = document.createElement('button');
        addBottom.type = 'button';
        addBottom.className = 'tag-btn tag-btn-rival tag-btn-add';
        addBottom.textContent = '+';
        addBottom.title = t('js.addTagRival');
        addBottom.addEventListener('click', () => openTagInlineEditor(null, 'bottom'));
        containerBottom.appendChild(wrapAddButton(addBottom));
    }
}

function onTagButtonClick(tag, btn, event) {
    if (_tagEditMode) {
        openTagInlineEditor(tag);
        return;
    }
    if (!AppState.canTag()) {
        toast(t('toast.startClock'), 'error');
        return;
    }
    const requested = Number(event?.detail?.tSec);
    const tSec = Number.isFinite(requested) ? Math.round(requested) : AppState.nowSec();
    const captureMode = tag.captureMode === 'manual' ? 'manual' : 'fixed';
    if (captureMode === 'manual') {
        const result = AppState.toggleManualClip(tag.id, tSec);
        if (!result?.clip) return;
        flashButton(btn);
        toast(
            result.action === 'opened'
                ? t('toast.manualOpened', { label: resolveTagLabel(tag), time: formatTime(tSec) })
                : t('toast.manualClosed', { label: resolveTagLabel(tag), time: formatTime(tSec) }),
            'success'
        );
        renderTagButtons();
        renderEvents();
        return;
    }
    const clip = AppState.addClip(tag.id, tSec);
    if (clip) {
        flashButton(btn);
        toast(t('toast.clipCreated', { label: resolveTagLabel(tag), time: formatTime(tSec) }), 'success');
        renderEvents();
    }
}

function wrapAddButton(btn) {
    const wrap = document.createElement('div');
    wrap.className = 'tag-btn-wrap tag-btn-wrap-add';
    wrap.appendChild(btn);
    return wrap;
}

function sameRow(a, b) {
    return (a?.row === 'bottom') === (b?.row === 'bottom');
}

function rowMoveState(buttons, tagId) {
    const visible = (buttons || []).filter((b) => !b.isHidden);
    const item = visible.find((b) => b.id === tagId);
    if (!item) return { canPrev: false, canNext: false };
    const same = visible.filter((b) => sameRow(b, item));
    const pos = same.findIndex((b) => b.id === tagId);
    return { canPrev: pos > 0, canNext: pos >= 0 && pos < same.length - 1 };
}

function makeReorderControls(tagId, tags) {
    const { canPrev, canNext } = rowMoveState(tags, tagId);
    const row = document.createElement('div');
    row.className = 'tag-reorder';
    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'tag-reorder-btn';
    prev.dataset.dir = '-1';
    prev.title = t('tag.moveBefore');
    prev.setAttribute('aria-label', t('tag.moveBefore'));
    prev.disabled = !canPrev;
    prev.addEventListener('click', (e) => {
        e.stopPropagation();
        moveLiveButton(tagId, -1);
    });
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'tag-reorder-btn';
    next.dataset.dir = '1';
    next.title = t('tag.moveAfter');
    next.setAttribute('aria-label', t('tag.moveAfter'));
    next.disabled = !canNext;
    next.addEventListener('click', (e) => {
        e.stopPropagation();
        moveLiveButton(tagId, 1);
    });
    row.append(prev, next);
    return row;
}

function moveLiveButton(tagId, dir) {
    const buttons = cloneButtons(AppState.getButtons());
    const idx = buttons.findIndex((b) => b.id === tagId);
    if (idx < 0) return;
    const item = buttons[idx];
    const same = buttons
        .map((b, i) => ({ b, i }))
        .filter((x) => !x.b.isHidden && sameRow(x.b, item));
    const pos = same.findIndex((x) => x.i === idx);
    const swap = same[pos + dir];
    if (!swap) return;
    const tmp = buttons[idx];
    buttons[idx] = buttons[swap.i];
    buttons[swap.i] = tmp;
    AppState.updateActiveButtons(buttons.map((b, i) => ({ ...b, order: i })));
    const moved = AppState.getTagType(tagId);
    if (_editingTagId === tagId && moved) openTagInlineEditor(moved);
    else renderTagButtons();
}

function syncInlineMoveButtons(tag) {
    const show = !!tag;
    ['btn-move-tag-prev', 'btn-move-tag-next'].forEach((id) => {
        const el = $(`#${id}`);
        if (!el) return;
        el.hidden = !show;
    });
    if (!tag) return;
    const { canPrev, canNext } = rowMoveState(AppState.getButtons(), tag.id);
    const prev = $('#btn-move-tag-prev');
    const next = $('#btn-move-tag-next');
    if (prev) prev.disabled = !canPrev;
    if (next) next.disabled = !canNext;
}

function flashButton(btn) {
    btn.classList.add('tag-flash');
    setTimeout(() => btn.classList.remove('tag-flash'), 450);
}

export function triggerTagById(tagId, tSec) {
    const btn = document.querySelector(`.tag-btn[data-tag-id="${CSS.escape(tagId)}"]`);
    if (!btn) {
        toast(t('toast.voiceTagButtonMissing'), 'error');
        return;
    }
    btn.dispatchEvent(new CustomEvent('click', { bubbles: true, cancelable: true, detail: { tSec } }));
}

export function setTagEditMode(on) {
    _tagEditMode = !!on;
    AppState.setTagEditMode(_tagEditMode);
    $('#btn-toggle-tag-editor')?.classList.toggle('active', _tagEditMode);
    if (!_tagEditMode) closeTagInlineEditor();
    renderTagButtons();
}

export function isTagEditMode() {
    return _tagEditMode;
}

function openTagInlineEditor(tag, row = 'top') {
    _editingTagId = tag?.id || null;
    _creatingRow = tag ? null : row;
    const panel = $('#tag-editor-inline');
    panel.style.display = 'block';
    $('#edit-tag-label').value = tag ? (tag.label || resolveTagLabel(tag)) : '';
    $('#edit-tag-pre').value = tag?.pre_sec ?? 3;
    $('#edit-tag-post').value = tag?.post_sec ?? 8;
    const mode = tag?.captureMode === 'manual' ? 'manual' : 'fixed';
    const team = tag?.row === 'bottom' ? 'bottom' : (tag ? 'top' : row);
    $('#edit-tag-capture-mode').value = mode;
    $('#edit-tag-row').value = team;
    setToggleGroup(panel, 'edit-tag-capture-mode', mode);
    setToggleGroup(panel, 'edit-tag-row', team);
    $('#edit-tag-hotkey-value').value = tag?.hotkey || '';
    $('#edit-tag-voice-aliases').value = (tag?.voiceAliases || []).join(', ');
    syncInlinePostEnabled();
    bindHotkeyCapture($('#edit-tag-hotkey'), {
        getValue: () => $('#edit-tag-hotkey-value').value,
        setValue: (v) => { $('#edit-tag-hotkey-value').value = v || ''; },
    });
    syncInlineMoveButtons(tag);
    renderTagButtons();
}

function closeTagInlineEditor() {
    _editingTagId = null;
    _creatingRow = null;
    $('#tag-editor-inline').style.display = 'none';
}

function syncInlinePostEnabled() {
    const manual = $('#edit-tag-capture-mode').value === 'manual';
    const post = $('#edit-tag-post');
    post.disabled = manual;
    post.classList.toggle('is-disabled', manual);
}

export function saveInlineTag() {
    const buttons = cloneButtons(AppState.getButtons());
    const label = $('#edit-tag-label').value.trim() || t('bb.newButton');
    const captureMode = $('#edit-tag-capture-mode').value === 'manual' ? 'manual' : 'fixed';
    const payload = {
        id: _editingTagId || uid('tag'),
        key: slugify(label),
        label,
        row: $('#edit-tag-row').value === 'bottom' ? 'bottom' : 'top',
        pre_sec: parseInt($('#edit-tag-pre').value, 10) || 0,
        post_sec: captureMode === 'manual' ? 0 : (parseInt($('#edit-tag-post').value, 10) || 0),
        captureMode,
        hotkey: $('#edit-tag-hotkey-value').value || '',
        voiceAliases: parseVoiceAliases($('#edit-tag-voice-aliases').value),
    };
    const idx = buttons.findIndex((b) => b.id === payload.id);
    if (idx >= 0) buttons[idx] = { ...buttons[idx], ...payload, order: buttons[idx].order };
    else buttons.push({ ...payload, order: buttons.length });
    AppState.updateActiveButtons(buttons);
    closeTagInlineEditor();
    renderTagButtons();
    toast(t('toast.tagSaved'), 'success');
}

export function deleteInlineTag() {
    if (!_editingTagId) {
        closeTagInlineEditor();
        return;
    }
    const buttons = AppState.getButtons().filter((b) => b.id !== _editingTagId);
    AppState.updateActiveButtons(buttons);
    closeTagInlineEditor();
    renderTagButtons();
    toast(t('toast.tagDeleted'), 'success');
}

export function wireInlineEditor() {
    $$('#tag-editor-inline .tag-editor-toggle-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const group = btn.closest('.tag-editor-toggle-group');
            const id = group?.dataset.targetInput;
            if (!id) return;
            setToggleGroup($('#tag-editor-inline'), id, btn.dataset.value);
            syncInlinePostEnabled();
        });
    });
    $('#btn-save-tag')?.addEventListener('click', saveInlineTag);
    $('#btn-delete-tag')?.addEventListener('click', deleteInlineTag);
    $('#btn-move-tag-prev')?.addEventListener('click', () => {
        if (_editingTagId) moveLiveButton(_editingTagId, -1);
    });
    $('#btn-move-tag-next')?.addEventListener('click', () => {
        if (_editingTagId) moveLiveButton(_editingTagId, 1);
    });
    $('#btn-cancel-tag-edit')?.addEventListener('click', () => {
        closeTagInlineEditor();
        renderTagButtons();
    });
}

export function renderButtonboardBrowser() {
    const systemHost = $('#bb-system-list');
    const userHost = $('#bb-user-list');
    systemHost.innerHTML = getSystemTemplates().map(templateItemHtml).join('') || `<p class="bb-loading">${escapeHtml(t('bb.noSystemTemplates'))}</p>`;
    const user = getUserTemplates();
    userHost.innerHTML = user.length
        ? user.map((tpl) => templateItemHtml(tpl, true)).join('')
        : `<p class="bb-loading">${escapeHtml(t('bb.noUserTemplates'))}</p>`;
}

function templateItemHtml(tpl, isUser = false) {
    const count = t('bb.buttons', { n: (tpl.buttons || []).length });
    const id = escapeHtml(tpl.id);
    return `
        <div class="bb-item ${isUser ? 'bb-item--user' : 'bb-item--system'}" data-id="${id}">
            <div class="bb-item-top">
                <span class="bb-item-name">${escapeHtml(tpl.name)}</span>
                <span class="bb-item-count">${escapeHtml(count)}</span>
            </div>
            <div class="bb-item-actions">
                <button type="button" class="btn btn-xs btn-primary bb-use" data-id="${id}">${escapeHtml(t('generic.use'))}</button>
                <button type="button" class="btn btn-xs btn-outline bb-edit" data-id="${id}">${escapeHtml(t('bb.edit'))}</button>
                <button type="button" class="btn btn-xs btn-ghost bb-dup" data-id="${id}">${escapeHtml(t('bb.duplicate'))}</button>
                <button type="button" class="btn btn-xs btn-ghost bb-export" data-id="${id}">${escapeHtml(t('bb.exportOne'))}</button>
                ${isUser ? `<button type="button" class="btn btn-xs btn-danger bb-del" data-id="${id}">${escapeHtml(t('bb.delete'))}</button>` : ''}
            </div>
        </div>
    `;
}

export function openButtonboards() {
    leaveEditor(true);
    renderButtonboardBrowser();
    showModal('modal-buttonboards');
}

export function closeButtonboards() {
    if (!leaveEditor()) return;
    hideModal('modal-buttonboards');
}

function setEditorMode(on) {
    $('#modal-buttonboards')?.classList.toggle('bb-editor-mode', on);
    $('#bb-browser').style.display = on ? 'none' : '';
    $('#bb-editor').style.display = on ? 'flex' : 'none';
}

function leaveEditor(force = false) {
    if (_bbEditorDirty && !force && !confirm(t('bb.discardEditor'))) return false;
    _bbEditorDirty = false;
    _bbEditorId = null;
    setEditorMode(false);
    return true;
}

export function openBBEditor(template = null, { isNew = false } = {}) {
    const fromSystem = !!template?.isSystem;
    _bbEditorId = (isNew || fromSystem) ? null : (template?.id || null);
    _bbEditorModel = cloneButtons(template?.buttons || []);
    _bbEditorSelectedIdx = _bbEditorModel.length ? 0 : -1;
    _bbEditorCreateRow = _bbEditorModel.length ? null : 'top';
    _bbEditorDirty = false;
    const defaultName = template?.name || '';
    $('#bb-editor-name').value = isNew && !template
        ? ''
        : (fromSystem && defaultName ? `${defaultName} ${t('js.templateCopy')}`.trim() : defaultName);
    $('#bb-editor-title').textContent = isNew ? t('bb.newTemplate') : t('bb.editTemplate');
    const basedRow = $('#bb-editor-based-row');
    basedRow.hidden = !isNew;
    if (isNew) {
        const sel = $('#bb-editor-based-on');
        sel.innerHTML = `<option value="">${escapeHtml(t('bb.startBlank'))}</option>` +
            getAllTemplates().map((tpl) => `<option value="${escapeHtml(tpl.id)}">${escapeHtml(tpl.name)}</option>`).join('');
        if (template?.id) sel.value = template.id;
    }
    setEditorMode(true);
    renderBBEditor();
}

export function renderBBEditor() {
    const container = $('#bb-editor-buttons-list');
    if (!container) return;
    if (_bbEditorModel.length === 0 && _bbEditorCreateRow === null) {
        _bbEditorCreateRow = 'top';
        _bbEditorSelectedIdx = -1;
    }
    const selected = _bbEditorModel[_bbEditorSelectedIdx] || null;
    container.innerHTML = `
        <div class="bb-builder-col bb-builder-col--list">
            <div class="bb-builder-col-head">
                <span class="bb-builder-col-title">${escapeHtml(t('bb.preview'))}</span>
                <span class="bb-builder-count">${_bbEditorModel.length} total</span>
            </div>
            <div class="bb-builder-list" id="bb-builder-list"></div>
        </div>
        <div class="bb-builder-col bb-builder-col--detail">
            <div class="bb-builder-col-head">
                <span class="bb-builder-col-title">${escapeHtml(t('bb.editorTitle'))}</span>
                <span class="bb-builder-count">${selected ? `#${_bbEditorSelectedIdx + 1}` : (_bbEditorCreateRow ? t('bb.editorNew') : t('bb.editorNoSelection'))}</span>
            </div>
            <div class="bb-builder-detail" id="bb-builder-detail"></div>
        </div>
    `;
    const list = container.querySelector('#bb-builder-list');
    list.innerHTML = `
        <div class="bb-builder-row-group">
            <div class="bb-builder-row-title">${escapeHtml(t('bb.ownRow'))}</div>
            <div class="bb-builder-row-grid" id="bb-builder-row-top"></div>
        </div>
        <div class="bb-builder-row-group">
            <div class="bb-builder-row-title">${escapeHtml(t('bb.rivalRow'))}</div>
            <div class="bb-builder-row-grid" id="bb-builder-row-bottom"></div>
        </div>
    `;
    const rowTop = list.querySelector('#bb-builder-row-top');
    const rowBottom = list.querySelector('#bb-builder-row-bottom');
    _bbEditorModel.forEach((btn, idx) => {
        const card = document.createElement('div');
        card.className = 'bb-builder-card' + (btn.row === 'bottom' ? ' bb-builder-card--bottom' : ' bb-builder-card--top') +
            (idx === _bbEditorSelectedIdx ? ' active' : '');
        card.innerHTML = `
            <div class="bb-builder-card-main">
                <div class="bb-builder-card-title">${escapeHtml(btn.label || t('js.noName'))}</div>
                <div class="bb-builder-card-meta">
                    <span class="bb-pill">-${btn.pre_sec ?? 3}s</span>
                    <span class="bb-pill">${btn.captureMode === 'manual' ? 'Manual' : `+${btn.post_sec ?? 8}s`}</span>
                    ${btn.hotkey ? `<span class="bb-pill">[${escapeHtml(btn.hotkey)}]</span>` : ''}
                </div>
            </div>
            <div class="bb-builder-card-actions">
                <button class="bb-icon-btn bb-move-left" data-idx="${idx}" type="button">←</button>
                <button class="bb-icon-btn bb-move-right" data-idx="${idx}" type="button">→</button>
                <button class="bb-icon-btn danger bb-del-btn" data-idx="${idx}" type="button">✕</button>
            </div>
        `;
        card.addEventListener('click', (ev) => {
            if (ev.target.closest('.bb-icon-btn')) return;
            _bbEditorCreateRow = null;
            _bbEditorSelectedIdx = idx;
            renderBBEditor();
        });
        (btn.row === 'bottom' ? rowBottom : rowTop).appendChild(card);
    });
    [['top', rowTop, t('bb.createOwnBtn')], ['bottom', rowBottom, t('bb.createRivalBtn')]].forEach(([row, host, title]) => {
        const create = document.createElement('button');
        create.type = 'button';
        create.className = 'bb-builder-card bb-builder-card--create';
        create.title = title;
        create.innerHTML = `<span class="bb-builder-plus">＋</span><span class="bb-builder-plus-label">${escapeHtml(t('bb.newButton'))}</span>`;
        create.addEventListener('click', () => {
            _bbEditorCreateRow = row;
            _bbEditorSelectedIdx = -1;
            renderBBEditor();
        });
        host.appendChild(create);
    });

    list.querySelectorAll('.bb-move-left').forEach((b) => b.addEventListener('click', (e) => {
        e.stopPropagation();
        moveEditorButton(+b.dataset.idx, -1);
    }));
    list.querySelectorAll('.bb-move-right').forEach((b) => b.addEventListener('click', (e) => {
        e.stopPropagation();
        moveEditorButton(+b.dataset.idx, 1);
    }));
    list.querySelectorAll('.bb-del-btn').forEach((b) => b.addEventListener('click', (e) => {
        e.stopPropagation();
        _bbEditorModel.splice(+b.dataset.idx, 1);
        _bbEditorDirty = true;
        _bbEditorSelectedIdx = Math.min(_bbEditorSelectedIdx, _bbEditorModel.length - 1);
        renderBBEditor();
    }));

    renderBBEditorDetail(container.querySelector('#bb-builder-detail'), selected);
}

function moveEditorButton(idx, dir) {
    const item = _bbEditorModel[idx];
    if (!item) return;
    const same = _bbEditorModel
        .map((b, i) => ({ b, i }))
        .filter((x) => (x.b.row === 'bottom') === (item.row === 'bottom'));
    const pos = same.findIndex((x) => x.i === idx);
    const swap = same[pos + dir];
    if (!swap) return;
    const tmp = _bbEditorModel[idx];
    _bbEditorModel[idx] = _bbEditorModel[swap.i];
    _bbEditorModel[swap.i] = tmp;
    _bbEditorSelectedIdx = swap.i;
    _bbEditorDirty = true;
    renderBBEditor();
}

function renderBBEditorDetail(detail, selected) {
    if (_bbEditorCreateRow) {
        detail.innerHTML = editorFormHtml({ create: true, row: _bbEditorCreateRow });
        wireEditorForm(detail, null, true);
        return;
    }
    if (!selected) {
        detail.innerHTML = `<div class="bb-builder-empty">${escapeHtml(t('bb.editorNoSelection'))}</div>`;
        return;
    }
    detail.innerHTML = editorFormHtml({ create: false, button: selected });
    wireEditorForm(detail, selected, false);
}

function editorFormHtml({ create, row, button }) {
    const mode = button?.captureMode === 'manual' ? 'manual' : 'fixed';
    const team = (button?.row || row) === 'bottom' ? 'bottom' : 'top';
    const label = create ? t('bb.newButton') : (button?.label || '');
    return `
        <div class="bb-editor-inline bb-editor-column-labels bb-editor-inline--with-create">
            <span class="bb-editor-col-label">${escapeHtml(t('bb.name'))}</span>
            <span class="bb-editor-col-label bb-editor-col-label--center">${escapeHtml(t('tag.pre'))}</span>
            <span class="bb-editor-col-label bb-editor-col-label--center">${escapeHtml(t('tag.post'))}</span>
            <span class="bb-editor-col-label bb-editor-col-label--center">${escapeHtml(t('tag.mode'))}</span>
            <span class="bb-editor-col-label bb-editor-col-label--center">${escapeHtml(t('tag.team'))}</span>
            <span class="bb-editor-col-label bb-editor-col-label--center">${escapeHtml(t('tag.hotkey'))}</span>
            <span class="bb-editor-col-label bb-editor-col-label--center">${create ? escapeHtml(t('bb.colAdd')) : ''}</span>
        </div>
        <div class="bb-editor-inline bb-editor-inline--with-create">
            <input type="text" class="input bb-field-label" value="${escapeHtml(label)}" />
            <input type="number" class="input bb-field-pre" min="0" max="60" value="${button?.pre_sec ?? 3}" />
            <input type="number" class="input bb-field-post" min="0" max="60" value="${button?.post_sec ?? 8}" />
            <div class="bb-toggle-group" data-target-input="bb-field-mode">
                <button type="button" class="bb-toggle-btn ${mode === 'fixed' ? 'active' : ''}" data-value="fixed">${escapeHtml(t('tag.fixed'))}</button>
                <button type="button" class="bb-toggle-btn ${mode === 'manual' ? 'active' : ''}" data-value="manual">${escapeHtml(t('tag.manual'))}</button>
            </div>
            <div class="bb-toggle-group" data-target-input="bb-field-row">
                <button type="button" class="bb-toggle-btn ${team === 'top' ? 'active' : ''}" data-value="top">${escapeHtml(t('tag.own'))}</button>
                <button type="button" class="bb-toggle-btn ${team === 'bottom' ? 'active' : ''}" data-value="bottom">${escapeHtml(t('tag.rival'))}</button>
            </div>
            <input type="hidden" class="bb-field-mode" value="${mode}" />
            <input type="hidden" class="bb-field-row" value="${team}" />
            <button type="button" class="btn btn-xs bb-hotkey-capture bb-field-hotkey" data-hotkey="${escapeHtml(button?.hotkey || '')}"></button>
            ${create
                ? `<button type="button" class="btn btn-xs btn-primary bb-field-create-inline" id="bb-add-btn">＋</button>`
                : `<button type="button" class="btn btn-xs btn-outline" id="bb-apply-btn">💾</button>`}
        </div>
        <div class="bb-voice-row">
            <label class="editor-lbl">${escapeHtml(t('tag.voiceAliases'))}</label>
            <input type="text" class="input input-sm bb-field-voice" value="${escapeHtml((button?.voiceAliases || []).join(', '))}" placeholder="${escapeHtml(t('tag.voiceAliasesPlaceholder'))}" />
        </div>
    `;
}

function readEditorForm(detail) {
    const mode = detail.querySelector('.bb-field-mode').value === 'manual' ? 'manual' : 'fixed';
    const label = detail.querySelector('.bb-field-label').value.trim() || t('bb.newButton');
    const hk = String(detail.querySelector('.bb-field-hotkey')?.dataset.hotkey || '').trim().toUpperCase();
    return {
        label,
        key: slugify(label),
        pre_sec: parseInt(detail.querySelector('.bb-field-pre').value, 10) || 0,
        post_sec: mode === 'manual' ? 0 : (parseInt(detail.querySelector('.bb-field-post').value, 10) || 0),
        captureMode: mode,
        row: detail.querySelector('.bb-field-row').value === 'bottom' ? 'bottom' : 'top',
        hotkey: /^[A-Z]$/.test(hk) ? hk : '',
        voiceAliases: parseVoiceAliases(detail.querySelector('.bb-field-voice')?.value),
    };
}

function wireEditorForm(detail, selected, create) {
    const modeEl = detail.querySelector('.bb-field-mode');
    const postEl = detail.querySelector('.bb-field-post');
    const syncPost = () => {
        const manual = modeEl.value === 'manual';
        postEl.disabled = manual;
        postEl.classList.toggle('is-disabled', manual);
    };
    detail.querySelectorAll('.bb-toggle-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const group = btn.closest('.bb-toggle-group');
            const cls = group.dataset.targetInput;
            const hidden = detail.querySelector(`.${cls}`);
            hidden.value = btn.dataset.value;
            group.querySelectorAll('.bb-toggle-btn').forEach((b) => b.classList.toggle('active', b === btn));
            if (!create && selected) {
                if (cls === 'bb-field-mode') {
                    selected.captureMode = hidden.value;
                    if (selected.captureMode === 'manual') selected.post_sec = 0;
                } else selected.row = hidden.value;
                _bbEditorDirty = true;
                renderBBEditor();
                return;
            }
            syncPost();
        });
    });
    syncPost();
    const hkBtn = detail.querySelector('.bb-field-hotkey');
    bindHotkeyCapture(hkBtn, {
        getValue: () => (create ? hkBtn.dataset.hotkey : selected?.hotkey) || '',
        setValue: (v) => {
            hkBtn.dataset.hotkey = v || '';
            if (selected) selected.hotkey = v || '';
            _bbEditorDirty = true;
        },
        onUpdated: () => { if (!create) renderBBEditor(); },
    });
    if (!create && selected) {
        detail.querySelector('.bb-field-label').addEventListener('input', (e) => {
            selected.label = e.target.value;
            selected.key = slugify(e.target.value);
            _bbEditorDirty = true;
            const title = detail.closest('.bb-editor-builder')?.querySelector('.bb-builder-card.active .bb-builder-card-title');
            if (title) title.textContent = e.target.value || t('js.noName');
        });
        detail.querySelector('.bb-field-pre').addEventListener('input', (e) => {
            selected.pre_sec = parseInt(e.target.value, 10) || 0;
            _bbEditorDirty = true;
        });
        detail.querySelector('.bb-field-post').addEventListener('input', (e) => {
            selected.post_sec = parseInt(e.target.value, 10) || 0;
            _bbEditorDirty = true;
        });
        detail.querySelector('.bb-field-voice').addEventListener('input', (e) => {
            selected.voiceAliases = parseVoiceAliases(e.target.value);
            _bbEditorDirty = true;
        });
        detail.querySelector('#bb-apply-btn')?.addEventListener('click', () => {
            Object.assign(selected, readEditorForm(detail));
            _bbEditorDirty = true;
            renderBBEditor();
        });
    }
    detail.querySelector('#bb-add-btn')?.addEventListener('click', () => {
        const data = readEditorForm(detail);
        _bbEditorModel.push({
            id: uid('tag'),
            order: _bbEditorModel.length,
            ...data,
        });
        _bbEditorDirty = true;
        _bbEditorCreateRow = data.row;
        _bbEditorSelectedIdx = _bbEditorModel.length - 1;
        renderBBEditor();
    });
}

export function saveBBEditor() {
    const name = $('#bb-editor-name').value.trim() || t('js.noName');
    const id = saveUserTemplate({
        id: _bbEditorId,
        name,
        buttons: _bbEditorModel,
    });
    _bbEditorId = id;
    _bbEditorDirty = false;
    const saved = getUserTemplates().find((tpl) => tpl.id === id);
    if (saved) {
        AppState.setActiveBoard({
            ...saved,
            name: saved.name,
            sourceTemplateId: saved.sourceTemplateId || saved.id,
        });
    }
    toast(t('toast.templateSaved'), 'success');
    leaveEditor(true);
    renderButtonboardBrowser();
    if (AppState.getView() === 'home') renderHome();
    else renderTagButtons();
}

export function openActiveBoardEditor() {
    const board = AppState.getActiveBoard();
    if (!board?.buttons?.length) {
        toast(t('toast.needBoard'), 'error');
        openButtonboards();
        return;
    }
    openButtonboards();
    openBBEditor({
        ...board,
        isSystem: false,
        name: board.name || t('js.codeWindowDefault'),
    });
}

export function handleBasedOnChange() {
    const id = $('#bb-editor-based-on').value;
    if (!id) {
        _bbEditorModel = [];
        _bbEditorCreateRow = 'top';
        _bbEditorSelectedIdx = -1;
        renderBBEditor();
        return;
    }
    const tpl = getAllTemplates().find((x) => x.id === id);
    if (!tpl) return;
    _bbEditorModel = cloneButtons(tpl.buttons);
    _bbEditorSelectedIdx = _bbEditorModel.length ? 0 : -1;
    _bbEditorCreateRow = _bbEditorModel.length ? null : 'top';
    if (!$('#bb-editor-name').value) $('#bb-editor-name').value = tpl.name;
    _bbEditorDirty = true;
    renderBBEditor();
}

export function useTemplate(id) {
    const tpl = getAllTemplates().find((x) => x.id === id);
    if (!tpl) return;
    AppState.setActiveBoardFromTemplate(tpl);
    toast(t('toast.boardApplied', { name: tpl.name }), 'success');
    hideModal('modal-buttonboards');
    renderHome();
}

export function duplicateAndRefresh(id) {
    const tpl = getAllTemplates().find((x) => x.id === id);
    if (!tpl) return;
    duplicateTemplate(tpl);
    renderButtonboardBrowser();
}

export function deleteAndRefresh(id) {
    if (!confirm(t('bb.confirmDelete'))) return;
    deleteUserTemplate(id);
    toast(t('toast.templateDeleted'), 'success');
    renderButtonboardBrowser();
}

export function exportTemplateById(id) {
    const tpl = getAllTemplates().find((x) => x.id === id) || AppState.getActiveBoard();
    if (!tpl) return;
    downloadBlob(exportTemplateJson(tpl), `${slugify(tpl.name) || 'ventana'}.json`, 'application/json');
}

export function saveCurrentAsTemplate() {
    const board = AppState.getCurrentSession()?.buttonsSnapshot
        ? { name: AppState.getActiveBoard()?.name || t('js.codeWindowDefault'), buttons: AppState.getButtons() }
        : AppState.getActiveBoard();
    if (!board) return;
    saveUserTemplate({ name: board.name || t('js.codeWindowDefault'), buttons: board.buttons });
    toast(t('toast.templateSaved'), 'success');
    renderButtonboardBrowser();
}

export { toast, resolveTagLabel, leaveEditor };
