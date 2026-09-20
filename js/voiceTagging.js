/* ═══════════════════════════════════════════
   SimpleReplay — Voice tagging (Web Speech API)
   ═══════════════════════════════════════════ */

/** Max listen window for hold / one-shot mode. */
const LISTEN_TIMEOUT_MS = 12000;
/** Wait after last speech before matching — lets multi-word tags finish. */
const COMMIT_DELAY_MS = 700;
/** Extra wait when speech looks like the start of a longer tag name. */
const COMMIT_DELAY_EXTENDED_MS = 1800;
/** Only suppress an identical browser replay of the same utterance. */
const IDENTICAL_REPLAY_WINDOW_MS = 400;

export function isSpeechRecognitionSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function normalizeSpeechPhrase(text) {
    return String(text || '')
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

const TEAM_SUFFIXES = [
    'equipo contrario',
    'equipo contra',
    'en contra',
    'encontra',
    'opponent',
    'rival',
    'contra',
    'opp',
    'e ce',
    'e se',
    'e c',
    'ece',
    'ec',
];
const TEAM_PREFIXES = ['opponent', 'opp', 'erre', 'r'];

function stripTeamMarker(norm) {
    let text = String(norm || '').trim();
    if (!text) return '';
    for (const prefix of TEAM_PREFIXES) {
        if (text === prefix) continue;
        if (text.startsWith(`${prefix} `)) {
            text = text.slice(prefix.length + 1).trim();
            break;
        }
    }
    for (const suffix of TEAM_SUFFIXES) {
        if (text === suffix) continue;
        if (text.endsWith(` ${suffix}`)) {
            text = text.slice(0, -(suffix.length + 1)).trim();
            break;
        }
    }
    return text;
}

function tagBase(tag, resolveLabel) {
    const label = normalizeSpeechPhrase(
        typeof resolveLabel === 'function' ? resolveLabel(tag) : (tag?.label || '')
    );
    if (label) return stripTeamMarker(label);
    return stripTeamMarker(normalizeSpeechPhrase(String(tag?.key || '').replace(/_/g, ' ')));
}

function sharesBaseWithOtherRow(tag, allTags, resolveLabel) {
    const base = tagBase(tag, resolveLabel);
    if (!base) return false;
    return (allTags || []).some((other) => {
        if (!other || other.id === tag.id || other.isHidden) return false;
        if ((other.row === 'bottom') === (tag.row === 'bottom')) return false;
        return tagBase(other, resolveLabel) === base;
    });
}

function addTeamVariants(base, add) {
    [
        `${base} EC`, `${base} E C`, `${base} e ce`, `${base} e se`,
        `${base} en contra`, `${base} encontra`,
        `${base} rival`, `${base} contra`,
        `${base} equipo contrario`, `${base} equipo contra`,
        `R ${base}`, `erre ${base}`, `opp ${base}`,
    ].forEach(add);
}

function collectTagPhrases(tag, resolveLabel, allTags) {
    const phrases = new Set();
    const seen = new Set();
    const label = typeof resolveLabel === 'function' ? resolveLabel(tag) : (tag?.label || '');

    function addPhrase(rawPhrase) {
        const raw = String(rawPhrase || '').trim();
        const normalized = normalizeSpeechPhrase(raw);
        if (!normalized || seen.has(normalized)) return;
        seen.add(normalized);
        phrases.add(normalized);

        const expandedAcronym = raw.replace(/\b[A-ZÁÉÍÓÚÑ]{2,5}\b/g, (token) => [...token].join(' '));
        if (expandedAcronym && expandedAcronym !== raw) addPhrase(expandedAcronym);

        const base = stripTeamMarker(normalized);
        if (base && base !== normalized) addTeamVariants(base, addPhrase);
    }

    addPhrase(label);
    addPhrase(tag?.label);
    addPhrase(tag?.key);
    addPhrase(String(tag?.key || '').replace(/_/g, ' '));
    (Array.isArray(tag?.voiceAliases) ? tag.voiceAliases : []).forEach(addPhrase);

    if (tag?.row === 'bottom' && sharesBaseWithOtherRow(tag, allTags, resolveLabel)) {
        const base = tagBase(tag, resolveLabel);
        if (base) addTeamVariants(base, addPhrase);
    }

    return [...phrases].filter(Boolean);
}

function phraseAsWholeWords(spoken, phrase) {
    if (!spoken || !phrase) return false;
    if (spoken === phrase) return true;
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`).test(spoken);
}

function scorePhraseMatch(spoken, phrase) {
    const spokenWords = spoken.split(' ').filter(Boolean);
    const phraseWords = phrase.split(' ').filter(Boolean);
    if (!spokenWords.length || !phraseWords.length) return null;

    if (spoken === phrase) {
        return 100000 + phrase.length;
    }

    if (phraseAsWholeWords(spoken, phrase)) {
        if (spokenWords.length === phraseWords.length) {
            return 50000 + phrase.length;
        }
        if (spoken.startsWith(phrase + ' ')) {
            return 1000 + phrase.length;
        }
        return null;
    }

    if (
        phraseWords.length > 1
        && phraseWords.every((w) => spokenWords.includes(w))
        && spokenWords.length === phraseWords.length
    ) {
        return 30000 + phrase.length;
    }

    return null;
}

export function isPrefixOfLongerTagPhrase(spoken, tags, resolveLabel) {
    const norm = normalizeSpeechPhrase(spoken);
    if (!norm) return false;

    const spokenWords = norm.split(' ').filter(Boolean);
    for (const tag of tags || []) {
        if (tag.isHidden || tag.id === 'tag-start') continue;
        for (const phrase of collectTagPhrases(tag, resolveLabel, tags)) {
            const phraseWords = phrase.split(' ').filter(Boolean);
            if (phraseWords.length <= spokenWords.length) continue;
            const prefix = phraseWords.slice(0, spokenWords.length).join(' ');
            if (prefix === norm) return true;
        }
    }
    return false;
}

/** True if `nextSpoken` continues `pending` toward a longer tag phrase. */
export function continuesLongerTagPhrase(pending, nextSpoken, tags, resolveLabel) {
    const prev = normalizeSpeechPhrase(pending);
    const next = normalizeSpeechPhrase(nextSpoken);
    if (!prev || !next || next === prev) return false;
    if (!next.startsWith(prev + ' ')) return false;

    // Only treat as continuation if some tag phrase starts with / equals the longer text.
    for (const tag of tags || []) {
        if (tag.isHidden || tag.id === 'tag-start') continue;
        for (const phrase of collectTagPhrases(tag, resolveLabel, tags)) {
            if (phrase === next || phrase.startsWith(next + ' ')) return true;
        }
    }
    return false;
}

export function matchTagFromTranscript(transcript, tags, resolveLabel) {
    const spoken = normalizeSpeechPhrase(transcript);
    if (!spoken) return null;

    let bestTag = null;
    let bestScore = 0;

    for (const tag of tags || []) {
        if (tag.isHidden || tag.id === 'tag-start') continue;
        for (const phrase of collectTagPhrases(tag, resolveLabel, tags)) {
            const score = scorePhraseMatch(spoken, phrase);
            if (score != null && score > bestScore) {
                bestScore = score;
                bestTag = tag;
            }
        }
    }

    return bestScore >= 3000 ? bestTag : null;
}

function isDefinitiveMatch(transcript, tags, resolveLabel) {
    const tag = matchTagFromTranscript(transcript, tags, resolveLabel);
    if (!tag) return false;
    return !isPrefixOfLongerTagPhrase(transcript, tags, resolveLabel);
}

export function createVoiceTagController({
    getTags,
    resolveLabel,
    getSpeechLang,
    onSpeechStart,
    onMatch,
    onNoMatch,
    onListeningChange,
    onError,
}) {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    let listening = false;
    let continuousMode = false;
    let sessionActive = false;
    let restartTimer = null;
    let listenTimer = null;
    let commitTimer = null;
    let pendingTranscript = '';
    let pendingContext = null;
    let consumedResultIndex = 0;
    let lastMatchSignature = '';
    let lastMatchAt = 0;
    let sessionId = 0;

    function clearListenTimer() {
        if (listenTimer) {
            clearTimeout(listenTimer);
            listenTimer = null;
        }
    }

    function clearRestartTimer() {
        if (restartTimer) {
            clearTimeout(restartTimer);
            restartTimer = null;
        }
    }

    function clearCommitTimer() {
        if (commitTimer) {
            clearTimeout(commitTimer);
            commitTimer = null;
        }
    }

    function setListening(next) {
        listening = !!next;
        if (typeof onListeningChange === 'function') onListeningChange(listening);
    }

    function resetUtteranceState() {
        pendingTranscript = '';
        pendingContext = null;
        clearCommitTimer();
    }

    function commitPending({ force = false } = {}) {
        clearCommitTimer();
        const transcript = pendingTranscript;
        const context = pendingContext;
        pendingTranscript = '';
        pendingContext = null;

        if (!transcript) {
            if (force && typeof onNoMatch === 'function') onNoMatch('');
            return false;
        }

        const tags = typeof getTags === 'function' ? getTags() : [];
        const tag = matchTagFromTranscript(transcript, tags, resolveLabel);
        if (tag) {
            const now = Date.now();
            const signature = `${tag.id}:${normalizeSpeechPhrase(transcript)}`;
            if (
                signature === lastMatchSignature
                && now - lastMatchAt < IDENTICAL_REPLAY_WINDOW_MS
            ) {
                return false;
            }
            lastMatchSignature = signature;
            lastMatchAt = now;
            if (typeof onMatch === 'function') onMatch(tag, transcript, context);
            return true;
        }

        if (typeof onNoMatch === 'function') onNoMatch(transcript.trim(), context);
        return false;
    }

    function scheduleCommit() {
        clearCommitTimer();
        const tags = typeof getTags === 'function' ? getTags() : [];
        const delay = isPrefixOfLongerTagPhrase(pendingTranscript, tags, resolveLabel)
            ? COMMIT_DELAY_EXTENDED_MS
            : COMMIT_DELAY_MS;
        commitTimer = setTimeout(() => {
            commitPending();
        }, delay);
    }

    function ingestTranscript(piece, { isFinal = false } = {}) {
        const text = String(piece || '').trim();
        if (!text) return;

        const tags = typeof getTags === 'function' ? getTags() : [];
        const pieceNorm = normalizeSpeechPhrase(text);

        if (pendingTranscript) {
            const prevNorm = normalizeSpeechPhrase(pendingTranscript);
            const combined = `${pendingTranscript} ${text}`.replace(/\s+/g, ' ').trim();

            if (prevNorm === pieceNorm) {
                // Final confirming the same interim text — don't duplicate words.
                pendingTranscript = text;
            } else if (
                isFinal
                && !continuesLongerTagPhrase(pendingTranscript, combined, tags, resolveLabel)
            ) {
                // New command starts: flush previous first.
                commitPending();
                pendingTranscript = text;
            } else {
                pendingTranscript = combined;
            }
        } else {
            pendingTranscript = text;
        }

        if (pendingContext == null && typeof onSpeechStart === 'function') {
            pendingContext = onSpeechStart();
        }

        if (isFinal && isDefinitiveMatch(pendingTranscript, tags, resolveLabel)) {
            commitPending();
            return;
        }

        scheduleCommit();
    }

    function ensureRecognition() {
        if (!SpeechRecognitionCtor) return null;
        if (recognition) return recognition;

        recognition = new SpeechRecognitionCtor();
        recognition.interimResults = true;
        recognition.maxAlternatives = 3;

        recognition.onspeechstart = () => {
            if (pendingContext == null && typeof onSpeechStart === 'function') {
                pendingContext = onSpeechStart();
            }
        };

        recognition.onresult = (event) => {
            const results = event.results;
            if (!results?.length) return;

            const start = Math.max(
                Number.isInteger(event.resultIndex) ? event.resultIndex : 0,
                consumedResultIndex
            );

            let interim = '';
            for (let i = start; i < results.length; i++) {
                const result = results[i];
                const text = result?.[0]?.transcript || '';
                if (!text.trim()) continue;

                if (result.isFinal) {
                    consumedResultIndex = Math.max(consumedResultIndex, i + 1);
                    ingestTranscript(text, { isFinal: true });
                } else {
                    interim += (interim ? ' ' : '') + text.trim();
                }
            }

            // Interim speech only extends the silence timer (helps "área" wait for "en contra").
            if (interim) {
                if (pendingContext == null && typeof onSpeechStart === 'function') {
                    pendingContext = onSpeechStart();
                }
                if (!pendingTranscript) {
                    pendingTranscript = interim;
                }
                scheduleCommit();
            }
        };

        recognition.onerror = (event) => {
            clearListenTimer();
            if (event?.error === 'aborted') {
                setListening(false);
                return;
            }
            if (event?.error === 'no-speech') {
                // Normal between utterances in continuous mode.
                if (sessionActive) return;
                setListening(false);
                if (typeof onError === 'function') onError(event.error);
                return;
            }
            setListening(false);
            if (typeof onError === 'function') onError(event?.error || 'unknown');
        };

        recognition.onend = () => {
            clearListenTimer();
            setListening(false);

            // Keep the session alive without killing mid-command audio.
            if (sessionActive) {
                clearRestartTimer();
                const id = sessionId;
                restartTimer = setTimeout(() => {
                    if (!sessionActive || id !== sessionId) return;
                    startRecognition();
                }, 30);
            }
        };

        return recognition;
    }

    function startRecognition() {
        if (!SpeechRecognitionCtor) {
            if (typeof onError === 'function') onError('unsupported');
            return false;
        }
        if (listening) return true;

        const rec = ensureRecognition();
        if (!rec) return false;

        rec.lang = typeof getSpeechLang === 'function' ? getSpeechLang() : 'es-ES';
        // Keep one long session so consecutive commands are not lost on restart.
        rec.continuous = true;
        rec.interimResults = true;
        setListening(true);
        clearListenTimer();
        if (!continuousMode) {
            listenTimer = setTimeout(() => {
                sessionActive = false;
                try { rec.stop(); } catch (_) { /* noop */ }
            }, LISTEN_TIMEOUT_MS);
        }

        try {
            rec.start();
            return true;
        } catch (err) {
            clearListenTimer();
            setListening(false);
            // Already running is fine — stay in session.
            if (String(err?.message || '').includes('already started')) {
                setListening(true);
                return true;
            }
            if (typeof onError === 'function') onError('start-failed');
            return false;
        }
    }

    function startListening(options = {}) {
        continuousMode = !!options.continuous;
        sessionActive = true;
        sessionId += 1;
        clearRestartTimer();
        resetUtteranceState();
        lastMatchSignature = '';
        lastMatchAt = 0;
        consumedResultIndex = 0;
        return startRecognition();
    }

    function stopListening({ abort = false } = {}) {
        sessionActive = false;
        continuousMode = false;
        sessionId += 1;
        clearRestartTimer();
        clearListenTimer();
        if (abort) {
            resetUtteranceState();
        } else if (pendingTranscript) {
            commitPending({ force: true });
        } else {
            clearCommitTimer();
        }
        if (!recognition) {
            setListening(false);
            return;
        }
        try {
            if (abort) recognition.abort();
            else recognition.stop();
        } catch (_) { /* noop */ }
        setListening(false);
    }

    return {
        isSupported: () => !!SpeechRecognitionCtor,
        isListening: () => listening || sessionActive,
        isContinuous: () => continuousMode,
        startListening,
        stopListening,
        abort: () => stopListening({ abort: true }),
    };
}
