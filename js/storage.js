const KEYS = {
    templates: 'srt_user_templates',
    sessions: 'srt_sessions',
    activeBoard: 'srt_active_board',
    prefs: 'srt_prefs',
};

function readJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
    } catch (_) {
        return fallback;
    }
}

function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

export const Storage = {
    getUserTemplates() {
        return readJson(KEYS.templates, []);
    },
    setUserTemplates(list) {
        writeJson(KEYS.templates, list);
    },
    getSessions() {
        return readJson(KEYS.sessions, []);
    },
    setSessions(list) {
        writeJson(KEYS.sessions, list);
    },
    getActiveBoard() {
        return readJson(KEYS.activeBoard, null);
    },
    setActiveBoard(board) {
        if (!board) localStorage.removeItem(KEYS.activeBoard);
        else writeJson(KEYS.activeBoard, board);
    },
    getPrefs() {
        return readJson(KEYS.prefs, { lang: 'es' });
    },
    setPrefs(prefs) {
        writeJson(KEYS.prefs, prefs);
    },
};
