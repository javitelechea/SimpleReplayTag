import { applyTranslations, getLang, getSpeechLang, onLangChange, setLang, t } from './i18n.js';
import { eventToTagHotkey } from './hotkeys.js';
import { createVoiceTagController, isSpeechRecognitionSupported } from './voiceTagging.js';
import { ExportManager } from './export.js';
import * as AppState from './state.js';
import * as UI from './ui.js';
import { getAllTemplates, parseTemplateJson, saveUserTemplate } from './templates.js';
import { $, slugify } from './utils.js';

let wakeLock = null;
let clockTimer = null;
let voiceLatched = false;
let voiceHolding = false;

const voice = createVoiceTagController({
    getTags: () => AppState.getButtons(),
    resolveLabel: (tag) => UI.resolveTagLabel(tag),
    getSpeechLang,
    onSpeechStart: () => ({ tSec: AppState.getClock().now() }),
    onMatch: (tag, _transcript, context) => {
        const tSec = Number.isFinite(context?.tSec) ? Math.round(context.tSec) : AppState.nowSec();
        UI.triggerTagById(tag.id, tSec);
    },
    onNoMatch: (text) => {
        if (!text) UI.toast(t('toast.voiceTagNoSpeech'), 'info');
        else UI.toast(t('toast.voiceTagNoMatch', { text }), 'info');
    },
    onListeningChange: (listening) => {
        $('#btn-voice-tag')?.classList.toggle('is-listening', !!listening);
        $('#voice-tag-indicator')?.classList.toggle('is-listening', !!listening);
    },
    onError: (err) => {
        if (err === 'not-allowed' || err === 'service-not-allowed') UI.toast(t('toast.voiceTagMicDenied'), 'error');
        else if (err === 'no-speech') UI.toast(t('toast.voiceTagNoSpeech'), 'info');
        else if (err === 'unsupported') UI.toast(t('toast.voiceTagUnsupported'), 'error');
        else if (err && err !== 'aborted') UI.toast(t('toast.voiceTagError'), 'error');
        stopVoice({ silent: true });
    },
});

function paintVoiceButton() {
    const button = $('#btn-voice-tag');
    if (!button) return;
    const pressed = voiceLatched || voiceHolding;
    button.classList.toggle('active', voiceLatched);
    button.classList.toggle('is-holding', voiceHolding);
    button.setAttribute('aria-pressed', voiceLatched ? 'true' : 'false');
    if (!isSpeechRecognitionSupported()) button.disabled = true;
}

function startVoice({ continuous = false, showFeedback = true } = {}) {
    if (!isSpeechRecognitionSupported()) {
        if (showFeedback) UI.toast(t('toast.voiceTagUnsupported'), 'error');
        return false;
    }
    if (!AppState.canTag()) {
        if (showFeedback) UI.toast(t('toast.voiceTagNeedClock'), 'error');
        return false;
    }
    const ok = voice.startListening({ continuous });
    if (ok && showFeedback && continuous) UI.toast(t('toast.voiceTagActive'), 'success');
    else if (ok && showFeedback) UI.toast(t('toast.voiceTagListening'), 'info');
    return ok;
}

function stopVoice({ abort = false, silent = false } = {}) {
    voiceLatched = false;
    voiceHolding = false;
    voice.stopListening({ abort });
    paintVoiceButton();
    if (!silent) { /* keep last toast */ }
}

async function requestWakeLock() {
    try {
        if (!('wakeLock' in navigator)) return;
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch (_) { /* noop */ }
}

async function releaseWakeLock() {
    try { await wakeLock?.release(); } catch (_) { /* noop */ }
    wakeLock = null;
}

function syncWakeLock() {
    if (AppState.clockStatus() === 'running') requestWakeLock();
    else releaseWakeLock();
}

function startClockTick() {
    stopClockTick();
    clockTimer = setInterval(() => {
        if (AppState.getView() === 'session') UI.renderClock();
    }, 100);
}

function stopClockTick() {
    if (clockTimer) clearInterval(clockTimer);
    clockTimer = null;
}

function exportCurrentXml() {
    const session = AppState.getCurrentSession();
    if (!session) return;
    const clips = (session.clips || []).filter((c) => !c.is_open);
    if (!clips.length) {
        UI.toast(t('toast.noEvents'), 'error');
        return;
    }
    const xml = ExportManager.generateXML({
        clips,
        tagTypes: (session.buttonsSnapshot || []).map((b) => ({
            ...b,
            label: UI.resolveTagLabel(b),
        })),
    });
    if (!xml) return;
    ExportManager.download(xml, `${slugify(session.name) || 'sesion'}.xml`);
    UI.toast(t('toast.xmlExported'), 'success');
}

function wireHeader() {
    $('#logo-home')?.addEventListener('click', () => AppState.goHome());
    $('#btn-open-buttonboards')?.addEventListener('click', () => UI.openButtonboards());
    $('#btn-lang-es')?.addEventListener('click', () => setLang('es'));
    $('#btn-lang-en')?.addEventListener('click', () => setLang('en'));
    const paintLang = () => {
        $('#btn-lang-es')?.classList.toggle('active', getLang() === 'es');
        $('#btn-lang-en')?.classList.toggle('active', getLang() === 'en');
    };
    paintLang();
    onLangChange(() => {
        paintLang();
        UI.renderViews();
        if (!$('#modal-buttonboards').classList.contains('hidden')) UI.renderButtonboardBrowser();
    });
}

function wireHome() {
    $('#btn-new-session')?.addEventListener('click', () => {
        if (!AppState.getActiveBoard()) {
            UI.toast(t('toast.needBoard'), 'error');
            UI.openButtonboards();
            return;
        }
        AppState.createSession();
    });
    $('#btn-home-boards')?.addEventListener('click', () => UI.openButtonboards());
    $('#btn-home-edit-board')?.addEventListener('click', () => UI.openActiveBoardEditor());
    $('#home-session-list')?.addEventListener('click', (e) => {
        const openBtn = e.target.closest('.btn-open-session');
        const delBtn = e.target.closest('.btn-delete-session');
        if (openBtn) {
            const id = openBtn.dataset.id;
            queueMicrotask(() => AppState.openSession(id));
            return;
        }
        if (delBtn) {
            const id = delBtn.dataset.id;
            queueMicrotask(() => {
                if (!confirm(t('bb.confirmDeleteSession'))) return;
                AppState.deleteSession(id);
                UI.toast(t('toast.sessionDeleted'), 'success');
                UI.renderHome();
            });
        }
    });
}

function wireSession() {
    $('#btn-session-home')?.addEventListener('click', () => AppState.goHome());
    $('#session-name')?.addEventListener('change', (e) => AppState.renameSession(e.target.value.trim() || t('js.unnamedSession')));
    $('#btn-clock-start')?.addEventListener('click', () => {
        AppState.startClock();
        startClockTick();
        syncWakeLock();
        UI.renderClock();
    });
    $('#btn-clock-pause')?.addEventListener('click', () => {
        AppState.pauseClock();
        syncWakeLock();
        UI.renderClock();
    });
    $('#btn-clock-stop')?.addEventListener('click', () => {
        AppState.stopClock();
        stopVoice({ abort: true, silent: true });
        syncWakeLock();
        UI.renderClock();
        UI.renderEvents();
    });
    $('#btn-undo')?.addEventListener('click', () => {
        const clip = AppState.undoLastClip();
        if (!clip) return;
        UI.toast(t('toast.eventUndone'), 'success');
        UI.renderEvents();
        UI.renderTagButtons();
    });
    $('#btn-export-xml')?.addEventListener('click', exportCurrentXml);
    $('#btn-toggle-tag-editor')?.addEventListener('click', () => UI.openActiveBoardEditor());
    $('#btn-toggle-events')?.addEventListener('click', () => {
        const rail = $('#event-rail');
        rail.classList.toggle('is-collapsed');
        const collapsed = rail.classList.contains('is-collapsed');
        $('#btn-toggle-events').textContent = collapsed ? t('session.showEvents') : t('session.hideEvents');
    });
    $('#event-list')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-delete-clip');
        if (!btn) return;
        AppState.deleteClip(btn.dataset.id);
        UI.toast(t('toast.clipDeleted'), 'success');
        UI.renderEvents();
        UI.renderTagButtons();
    });
    UI.wireInlineEditor();
}

function wireVoice() {
    const button = $('#btn-voice-tag');
    if (!button) return;
    paintVoiceButton();
    const HOLD_THRESHOLD_MS = 350;
    let pointerDownAt = 0;
    let startedLatched = false;

    button.addEventListener('pointerdown', (e) => {
        if (button.disabled || e.button !== 0) return;
        e.preventDefault();
        pointerDownAt = performance.now();
        startedLatched = voiceLatched;
        voiceHolding = true;
        paintVoiceButton();
        try { button.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
        if (!startedLatched && !startVoice({ continuous: true, showFeedback: false })) {
            voiceHolding = false;
            paintVoiceButton();
        }
    });

    button.addEventListener('pointerup', (e) => {
        if (!pointerDownAt) return;
        e.preventDefault();
        const heldMs = performance.now() - pointerDownAt;
        pointerDownAt = 0;
        voiceHolding = false;
        if (heldMs < HOLD_THRESHOLD_MS) {
            if (startedLatched) stopVoice({ abort: true });
            else if (startVoice({ continuous: true })) {
                voiceLatched = true;
                UI.toast(t('toast.voiceTagActive'), 'success');
            }
        } else if (!startedLatched) {
            voice.stopListening();
        }
        paintVoiceButton();
    });

    button.addEventListener('pointercancel', () => {
        pointerDownAt = 0;
        voiceHolding = false;
        if (!startedLatched) voice.abort();
        paintVoiceButton();
    });

    button.addEventListener('click', (e) => {
        e.preventDefault();
        if (e.detail === 0) {
            if (voiceLatched) stopVoice({ abort: true });
            else {
                voiceLatched = true;
                startVoice({ continuous: true });
                paintVoiceButton();
            }
        }
    });
}

function wireHotkeys() {
    window.addEventListener('keydown', (e) => {
        if (AppState.getView() !== 'session' || UI.isTagEditMode()) return;
        const target = e.target;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return;
        if (e.key === ' ') {
            e.preventDefault();
            const status = AppState.clockStatus();
            if (status === 'running') AppState.pauseClock();
            else if (status !== 'stopped') AppState.startClock();
            startClockTick();
            syncWakeLock();
            UI.renderClock();
            return;
        }
        const hotkey = eventToTagHotkey(e);
        if (!hotkey) return;
        const btn = document.querySelector(`.tag-btn[data-hotkey="${CSS.escape(hotkey)}"]`);
        if (!btn) return;
        e.preventDefault();
        btn.click();
    });
}

function wireButtonboards() {
    $('#btn-close-buttonboards')?.addEventListener('click', () => UI.closeButtonboards());
    $$closeBackdrop();
    $('#btn-bb-new-template')?.addEventListener('click', () => UI.openBBEditor(null, { isNew: true }));
    $('#btn-bb-back-to-list')?.addEventListener('click', () => {
        if (UI.leaveEditor()) UI.renderButtonboardBrowser();
    });
    $('#btn-bb-editor-close')?.addEventListener('click', () => {
        if (UI.leaveEditor()) UI.renderButtonboardBrowser();
    });
    $('#btn-bb-editor-cancel')?.addEventListener('click', () => {
        if (UI.leaveEditor()) UI.renderButtonboardBrowser();
    });
    $('#btn-bb-editor-save')?.addEventListener('click', () => UI.saveBBEditor());
    $('#bb-editor-based-on')?.addEventListener('change', () => UI.handleBasedOnChange());
    $('#btn-bb-save-as-template')?.addEventListener('click', () => UI.saveCurrentAsTemplate());
    $('#btn-bb-export-active')?.addEventListener('click', () => UI.exportTemplateById(AppState.getActiveBoard()?.id));
    $('#btn-bb-import')?.addEventListener('click', () => $('#input-bb-import').click());
    $('#input-bb-import')?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        try {
            const parsed = parseTemplateJson(await file.text());
            saveUserTemplate(parsed);
            UI.toast(t('toast.boardImported'), 'success');
            UI.renderButtonboardBrowser();
        } catch (_) {
            UI.toast(t('toast.importError'), 'error');
        }
    });
    $('#bb-system-list')?.addEventListener('click', onBoardListClick);
    $('#bb-user-list')?.addEventListener('click', onBoardListClick);
}

function $$closeBackdrop() {
    document.querySelectorAll('[data-close-modal]').forEach((el) => {
        el.addEventListener('click', () => UI.closeButtonboards());
    });
}

function onBoardListClick(e) {
    const id = e.target.closest('[data-id]')?.dataset.id;
    if (!id) return;
    if (e.target.closest('.bb-use')) {
        UI.useTemplate(id);
        if (AppState.getView() === 'home') UI.renderHome();
        return;
    }
    if (e.target.closest('.bb-dup')) { UI.duplicateAndRefresh(id); return; }
    if (e.target.closest('.bb-del')) { UI.deleteAndRefresh(id); return; }
    if (e.target.closest('.bb-export')) { UI.exportTemplateById(id); return; }
    if (e.target.closest('.bb-edit') || e.target.closest('.bb-item')) {
        const tpl = getAllTemplates().find((x) => x.id === id);
        if (tpl) UI.openBBEditor(tpl);
    }
}

function subscribeState() {
    AppState.on('viewChanged', () => {
        UI.renderViews();
        if (AppState.getView() === 'session') startClockTick();
        else stopClockTick();
        syncWakeLock();
    });
    AppState.on('boardChanged', () => {
        if (AppState.getView() === 'home') UI.renderHome();
        else UI.renderTagButtons();
    });
    AppState.on('sessionChanged', () => UI.renderSessionChrome());
    AppState.on('sessionsChanged', () => { if (AppState.getView() === 'home') UI.renderHome(); });
    AppState.on('clipsUpdated', () => {
        UI.renderEvents();
        UI.renderTagButtons();
    });
    AppState.on('clockChanged', () => {
        UI.renderClock();
        syncWakeLock();
    });
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && AppState.clockStatus() === 'running') requestWakeLock();
});

function syncBotoneraLayout() {
    document.body.classList.toggle('botonera-cols', window.innerWidth <= 1024);
}

export function initApp() {
    AppState.initState();
    applyTranslations();
    wireHeader();
    wireHome();
    wireSession();
    wireVoice();
    wireHotkeys();
    wireButtonboards();
    subscribeState();
    syncBotoneraLayout();
    window.addEventListener('resize', syncBotoneraLayout);
    UI.renderViews();
    startClockTick();
}
