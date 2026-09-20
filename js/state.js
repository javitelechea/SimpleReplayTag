import { SessionClock } from './sessionClock.js';
import { Storage } from './storage.js';
import { cloneButtons, uid } from './utils.js';
import { cloneTemplate, getSystemTemplates, normalizeButton, ensureHockeyEspecial } from './templates.js';
import { t } from './i18n.js';

const listeners = new Map();
const clock = new SessionClock();

const state = {
    view: 'home',
    activeBoard: null,
    currentSession: null,
    sessions: [],
    tagEditMode: false,
    eventsCollapsed: false,
};

function emit(event, payload) {
    const fns = listeners.get(event);
    if (!fns) return;
    fns.forEach((fn) => {
        try { fn(payload); } catch (_) { /* noop */ }
    });
}

function persistSessions() {
    Storage.setSessions(state.sessions);
}

function persistBoard() {
    Storage.setActiveBoard(state.activeBoard);
}

function persistCurrentSession() {
    if (!state.currentSession) return;
    const idx = state.sessions.findIndex((s) => s.id === state.currentSession.id);
    const snapshot = serializeSession(state.currentSession);
    if (idx >= 0) state.sessions[idx] = snapshot;
    else state.sessions.unshift(snapshot);
    persistSessions();
}

function serializeSession(session) {
    return {
        ...session,
        elapsedSec: clock.now(),
        clockStatus: clockStatus(),
        clips: (session.clips || []).map((c) => ({ ...c })),
        buttonsSnapshot: cloneButtons(session.buttonsSnapshot),
        updatedAt: new Date().toISOString(),
    };
}

export function clockStatus() {
    if (clock.isRunning() && clock.isPaused()) return 'paused';
    if (clock.isRunning()) return 'running';
    if (state.currentSession?.stoppedAt) return 'stopped';
    if (clock.now() > 0) return 'paused';
    return 'idle';
}

export function on(event, fn) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
    return () => listeners.get(event)?.delete(fn);
}

export function get(key) {
    if (key === 'tagTypes') return getButtons();
    return state[key];
}

export function getButtons() {
    if (state.currentSession?.buttonsSnapshot) return state.currentSession.buttonsSnapshot;
    return state.activeBoard?.buttons || [];
}

export function getTagType(id) {
    return getButtons().find((b) => b.id === id) || null;
}

export function getClock() {
    return clock;
}

export function getCurrentSession() {
    return state.currentSession;
}

export function getSessions() {
    return state.sessions;
}

export function getActiveBoard() {
    return state.activeBoard;
}

export function getView() {
    return state.view;
}

export function initState() {
    state.sessions = Storage.getSessions();
    const storedBoard = Storage.getActiveBoard();
    if (storedBoard?.buttons?.length) {
        const buttons = ensureHockeyEspecial(storedBoard.buttons.map(normalizeButton));
        state.activeBoard = {
            ...storedBoard,
            buttons,
        };
        persistBoard();
    } else {
        const hockey = getSystemTemplates()[0];
        state.activeBoard = cloneTemplate(hockey, hockey.name);
        persistBoard();
    }
}

export function setView(view) {
    state.view = view;
    emit('viewChanged', view);
}

export function setActiveBoardFromTemplate(template) {
    state.activeBoard = cloneTemplate(template, template.name);
    persistBoard();
    emit('boardChanged', state.activeBoard);
    return state.activeBoard;
}

export function setActiveBoard(board) {
    state.activeBoard = {
        ...board,
        buttons: (board.buttons || []).map(normalizeButton),
    };
    persistBoard();
    if (state.currentSession) {
        state.currentSession.buttonsSnapshot = cloneButtons(state.activeBoard.buttons);
        persistCurrentSession();
    }
    emit('boardChanged', state.activeBoard);
}

export function updateActiveButtons(buttons) {
    if (!state.activeBoard) return;
    state.activeBoard.buttons = buttons.map(normalizeButton);
    persistBoard();
    if (state.currentSession) {
        state.currentSession.buttonsSnapshot = cloneButtons(state.activeBoard.buttons);
        persistCurrentSession();
    }
    emit('boardChanged', state.activeBoard);
}

export function createSession({ name } = {}) {
    const board = state.activeBoard;
    if (!board) return null;
    clock.reset();
    const session = {
        id: uid('ses'),
        name: name || `${t('js.unnamedSession')} ${new Date().toLocaleString()}`,
        templateId: board.sourceTemplateId || board.id,
        boardName: board.name,
        buttonsSnapshot: cloneButtons(board.buttons),
        clips: [],
        startedAt: null,
        stoppedAt: null,
        elapsedSec: 0,
        clockStatus: 'idle',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    state.currentSession = session;
    state.sessions.unshift(session);
    persistSessions();
    state.view = 'session';
    emit('sessionChanged', session);
    emit('viewChanged', 'session');
    return session;
}

export function openSession(id) {
    const found = state.sessions.find((s) => s.id === id);
    if (!found) return null;
    state.currentSession = {
        ...found,
        clips: (found.clips || []).map((c) => ({ ...c })),
        buttonsSnapshot: cloneButtons(found.buttonsSnapshot || []),
    };
    clock.reset();
    const elapsed = Number(found.elapsedSec) || 0;
    if (elapsed > 0 || found.stoppedAt || found.startedAt) {
        clock.restore(elapsed, { paused: !found.stoppedAt, stopped: !!found.stoppedAt });
    }
    state.view = 'session';
    emit('sessionChanged', state.currentSession);
    emit('viewChanged', 'session');
    return state.currentSession;
}

export function renameSession(name) {
    if (!state.currentSession) return;
    state.currentSession.name = name;
    persistCurrentSession();
    emit('sessionChanged', state.currentSession);
}

export function deleteSession(id) {
    state.sessions = state.sessions.filter((s) => s.id !== id);
    if (state.currentSession?.id === id) {
        clock.reset();
        state.currentSession = null;
        state.view = 'home';
        emit('viewChanged', 'home');
    }
    persistSessions();
    emit('sessionsChanged', state.sessions);
}

export function startClock() {
    if (!state.currentSession) return;
    if (clock.isPaused()) {
        clock.resume();
    } else if (!clock.isRunning()) {
        clock.start();
        if (!state.currentSession.startedAt) {
            state.currentSession.startedAt = new Date().toISOString();
        }
        state.currentSession.stoppedAt = null;
    }
    persistCurrentSession();
    emit('clockChanged', clockStatus());
}

export function pauseClock() {
    if (!clock.isRunning() || clock.isPaused()) return;
    clock.pause();
    persistCurrentSession();
    emit('clockChanged', clockStatus());
}

export function stopClock() {
    if (!state.currentSession) return;
    if (clock.isRunning()) clock.markStopped();
    state.currentSession.stoppedAt = new Date().toISOString();
    state.currentSession.elapsedSec = clock.now();
    persistCurrentSession();
    emit('clockChanged', clockStatus());
    emit('sessionChanged', state.currentSession);
}

export function canTag() {
    const status = clockStatus();
    return !!state.currentSession && (status === 'running' || status === 'paused');
}

export function nowSec() {
    return Math.round(clock.now());
}

export function addClip(tagTypeId, tSec) {
    const tag = getTagType(tagTypeId);
    if (!tag || !state.currentSession) return null;
    const startSec = Math.max(0, tSec - (Number(tag.pre_sec) || 0));
    const endSec = tSec + (Number(tag.post_sec) || 0);
    if (endSec <= startSec) return null;
    const clip = {
        id: uid('clip'),
        tag_type_id: tagTypeId,
        t_sec: tSec,
        start_sec: startSec,
        end_sec: endSec,
        created_at: new Date().toISOString(),
    };
    state.currentSession.clips.push(clip);
    persistCurrentSession();
    emit('clipsUpdated', state.currentSession.clips);
    return clip;
}

export function getOpenManualClips() {
    return (state.currentSession?.clips || []).filter((c) => c.is_manual && c.is_open);
}

export function getOpenManualTagIds() {
    return getOpenManualClips().map((c) => c.tag_type_id);
}

export function toggleManualClip(tagTypeId, tSec) {
    const tag = getTagType(tagTypeId);
    if (!tag || !state.currentSession) return null;
    const nowSecVal = Math.max(0, Number.isFinite(tSec) ? tSec : 0);
    const openClip = state.currentSession.clips.find((c) =>
        c.tag_type_id === tagTypeId && c.is_manual && c.is_open
    );
    if (openClip) {
        const closeSec = Math.max(nowSecVal, openClip.start_sec + 0.1);
        openClip.t_sec = closeSec;
        openClip.end_sec = closeSec;
        openClip.is_open = false;
        persistCurrentSession();
        emit('clipsUpdated', state.currentSession.clips);
        return { action: 'closed', clip: openClip };
    }
    const startSec = Math.max(0, nowSecVal - (Number(tag.pre_sec) || 0));
    const clip = {
        id: uid('clip'),
        tag_type_id: tagTypeId,
        t_sec: nowSecVal,
        start_sec: startSec,
        end_sec: Math.max(startSec + 0.1, nowSecVal),
        is_manual: true,
        is_open: true,
        created_at: new Date().toISOString(),
    };
    state.currentSession.clips.push(clip);
    persistCurrentSession();
    emit('clipsUpdated', state.currentSession.clips);
    return { action: 'opened', clip };
}

export function undoLastClip() {
    const clips = state.currentSession?.clips;
    if (!clips?.length) return null;
    const clip = clips.pop();
    persistCurrentSession();
    emit('clipsUpdated', clips);
    return clip;
}

export function deleteClip(id) {
    if (!state.currentSession) return;
    state.currentSession.clips = state.currentSession.clips.filter((c) => c.id !== id);
    persistCurrentSession();
    emit('clipsUpdated', state.currentSession.clips);
}

export function setTagEditMode(onOff) {
    state.tagEditMode = !!onOff;
    emit('tagEditMode', state.tagEditMode);
}

export function isTagEditMode() {
    return state.tagEditMode;
}

export function setEventsCollapsed(collapsed) {
    state.eventsCollapsed = !!collapsed;
    emit('layoutChanged');
}

export function goHome() {
    if (state.currentSession && clockStatus() === 'running') {
        pauseClock();
    }
    persistCurrentSession();
    state.currentSession = null;
    clock.reset();
    state.tagEditMode = false;
    state.view = 'home';
    emit('viewChanged', 'home');
    emit('sessionsChanged', state.sessions);
}
