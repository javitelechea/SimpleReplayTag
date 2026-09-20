const _listeners = [];
let _lang = 'es';

export const BUILTIN_TAG_LABELS = {
    es: {
        start: 'Start', especial: 'Especial', salida: 'Salida', ataque: 'Ataque', area: 'Área',
        contragolpe: 'Contragolpe', cc_at: 'CC AT', gol: 'Gol',
        bloqueo: 'Bloqueo', defensa: 'Defensa', area_ec: 'Área EC',
        contragolpe_ec: 'Contragolpe EC', cc_def: 'CC DEF', gol_ec: 'Gol EC',
        fb_sda: 'SdA', fb_inicio: 'Inicio', fb_desarrollo: 'Desarrollo',
        fb_llegadas: 'Llegadas', fb_transicion: 'Transición', fb_gol: 'Gol',
        fb_corner: 'Corner', fb_tl: 'TL', fb_lateral: 'Lateral',
        fb_r_sda: 'R. SdA', fb_r_inicio: 'R. Inicio', fb_r_desarrollo: 'R. Desarrollo',
        fb_r_llegadas: 'R. Llegadas', fb_r_transicion: 'R. Transición', fb_r_gol: 'R. Gol',
        fb_r_corner: 'R. Corner', fb_r_tl: 'R. TL', fb_r_lateral: 'R. Lateral',
    },
    en: {
        start: 'Start', especial: 'Special', salida: 'BS', ataque: 'Attack', area: 'Circle',
        contragolpe: 'Transition', cc_at: 'PCA', gol: 'Goal',
        bloqueo: 'Press', defensa: 'Defense', area_ec: 'Opp Circle',
        contragolpe_ec: 'Opp Transition', cc_def: 'PCD', gol_ec: 'Opp Goal',
        fb_sda: 'GK', fb_inicio: 'Build-up', fb_desarrollo: 'Progression',
        fb_llegadas: 'Chances', fb_transicion: 'Transition', fb_gol: 'Goal',
        fb_corner: 'Corner', fb_tl: 'FK', fb_lateral: 'Throw-in',
        fb_r_sda: 'Opp GK', fb_r_inicio: 'Opp Build-up', fb_r_desarrollo: 'Opp Progression',
        fb_r_llegadas: 'Opp Chances', fb_r_transicion: 'Opp Transition', fb_r_gol: 'Opp Goal',
        fb_r_corner: 'Opp Corner', fb_r_tl: 'Opp FK', fb_r_lateral: 'Opp Throw-in',
    },
};

const translations = {
es: {
    'app.title': 'Simple Replay Tag',
    'header.goHome': 'Ir al inicio',
    'header.lang': 'Idioma',
    'menu.codeWindows': 'Ventanas de código',

    'home.newSession': 'Nueva sesión',
    'home.codeWindows': 'Ventanas de código',
    'home.recentSessions': 'Últimas sesiones',
    'home.noSessions': 'Todavía no hay sesiones. Elegí una ventana de código y empezá a taggear.',
    'home.activeBoard': 'Ventana activa',
    'home.noBoard': 'Ninguna ventana seleccionada',
    'home.openSession': 'Abrir',
    'home.deleteSession': 'Borrar sesión',
    'home.clipsCount': '{n} clips',
    'home.chooseBoard': 'Elegí una ventana de código para empezar',
    'home.editBoard': 'Editar botonera',

    'session.start': 'Iniciar',
    'session.pause': 'Pausar',
    'session.resume': 'Reanudar',
    'session.stop': 'Detener',
    'session.undo': 'Deshacer',
    'session.events': 'Eventos',
    'session.exportXml': 'Exportar XML',
    'session.backHome': 'Inicio',
    'session.namePlaceholder': 'Nombre de la sesión',
    'session.idleHint': 'Iniciá el reloj para taggear',
    'session.pausedHint': 'Pausado',
    'session.runningHint': 'En vivo',
    'session.stoppedHint': 'Sesión detenida',
    'session.noEvents': 'Sin eventos todavía',
    'session.deleteEvent': 'Eliminar evento',
    'session.hideEvents': 'Ocultar eventos',
    'session.showEvents': 'Mostrar eventos',

    'tag.editTags': 'Editar tags',
    'tag.name': 'Nombre',
    'tag.pre': 'Pre',
    'tag.post': 'Post',
    'tag.mode': 'Modo',
    'tag.captureMode': 'Modo de captura',
    'tag.fixed': 'Fijo',
    'tag.manual': 'Manual',
    'tag.team': 'Equipo',
    'tag.own': 'Propio',
    'tag.rival': 'Rival',
    'tag.hotkey': 'Atajo',
    'tag.voiceAliases': 'Alias de voz',
    'tag.voiceAliasesPlaceholder': 'gol EC, gol contra',
    'tag.voiceAliasesHelp': 'Separá varios alias con comas',
    'tag.hotkeyAuto': 'Automático',
    'tag.hotkeyCapture': 'Clic y pulsa una tecla. Retroceso: quitar. Esc: cancelar.',
    'tag.hotkeyReserved': 'Esa tecla la usa el sistema (espacio, flechas, etc.).',
    'tag.hotkeyDuplicate': 'La tecla «{key}» ya la usa otro tag.',
    'tag.save': 'Guardar',
    'tag.moveBefore': 'Antes',
    'tag.moveAfter': 'Después',

    'voiceTag.buttonTitle': 'Micrófono: clic para dejar activo, mantener para hablar',
    'voiceTag.listening': 'Escuchando… decí el nombre de la etiqueta',

    'bb.title': 'Ventanas de código',
    'bb.systemTemplates': 'Templates del sistema',
    'bb.myTemplates': 'Mis templates',
    'bb.loading': 'Cargando...',
    'bb.hockeyDefault': 'Hockey',
    'bb.footballDefault': 'Fútbol',
    'bb.newTemplate': 'Nuevo template',
    'bb.saveCurrentAsTemplate': 'Guardar ventana de código actual como template',
    'bb.editTemplate': 'Editar template',
    'bb.basedOn': 'Basada en',
    'bb.name': 'Nombre',
    'bb.namePlaceholder': 'Nombre del template',
    'bb.saveTemplate': 'Guardar template',
    'bb.startBlank': 'Empezar en blanco',
    'bb.buttons': '{n} botones',
    'bb.noUserTemplates': 'Todavía no tenés templates propios.',
    'bb.noSystemTemplates': 'Sin templates del sistema',
    'bb.edit': 'Editar',
    'bb.duplicate': 'Duplicar',
    'bb.delete': 'Borrar',
    'bb.ownRow': 'Propio',
    'bb.rivalRow': 'Rival',
    'bb.update': 'Actualizar',
    'bb.preview': 'Vista previa',
    'bb.noOwnButtons': 'Sin botones propios',
    'bb.noRivalButtons': 'Sin botones rivales',
    'bb.createOwnBtn': 'Crear botón en Propio',
    'bb.createRivalBtn': 'Crear botón en Rival',
    'bb.button': 'Botón',
    'bb.newTemplateBtn': '＋ Nuevo template',
    'bb.backBtn': '← Volver',
    'bb.closeEditor': 'Cerrar editor',
    'bb.newButton': 'Nuevo',
    'bb.colAdd': 'Añadir',
    'bb.preSecondsTitle': 'Pre (s)',
    'bb.postSecondsTitle': 'Post (s)',
    'bb.createButtonTitle': 'Crear botón',
    'bb.editorTitle': 'Editor',
    'bb.editorNew': 'nuevo',
    'bb.editorNoSelection': 'sin selección',
    'bb.import': 'Importar JSON',
    'bb.export': 'Exportar JSON',
    'bb.exportOne': 'Exportar',
    'bb.confirmDelete': '¿Borrar este template?',
    'bb.confirmDeleteSession': '¿Borrar esta sesión?',
    'bb.discardEditor': 'Hay cambios sin guardar. ¿Descartar?',

    'generic.cancel': 'Cancelar',
    'generic.save': 'Guardar',
    'generic.delete': 'Eliminar',
    'generic.close': 'Cerrar',
    'generic.use': 'Usar',
    'generic.copy': 'copia',

    'modal.cancel': 'Cancelar',
    'analyzeFs.tags': 'Botonera',

    'js.templateCopy': '(copia)',
    'js.codeWindowDefault': 'Ventana de código',
    'js.noName': 'Sin nombre',
    'js.manualMode': 'Modo Manual',
    'js.fixedMode': 'Modo Fijo',
    'js.clickToEdit': 'Click para editar',
    'js.addTagOwn': 'Agregar tag (propio)',
    'js.addTagRival': 'Agregar tag (rival)',
    'js.unnamedSession': 'Sesión',

    'toast.clipCreated': 'Clip creado: {label} @ {time}',
    'toast.clipDeleted': 'Clip eliminado',
    'toast.startClock': 'Iniciá el reloj para taggear',
    'toast.manualOpened': 'Manual iniciado: {label} @ {time}',
    'toast.manualClosed': 'Manual cerrado: {label} @ {time}',
    'toast.eventUndone': 'Último evento deshecho',
    'toast.xmlExported': 'XML exportado',
    'toast.templateSaved': 'Template guardado',
    'toast.templateDeleted': 'Template borrado',
    'toast.boardApplied': 'Ventana aplicada: {name}',
    'toast.boardImported': 'Ventana importada',
    'toast.importError': 'No se pudo importar el JSON',
    'toast.sessionDeleted': 'Sesión borrada',
    'toast.noEvents': 'No hay eventos para exportar',
    'toast.needBoard': 'Elegí una ventana de código primero',
    'toast.tagSaved': 'Tag guardado',
    'toast.tagDeleted': 'Tag borrado',
    'toast.voiceTagListening': 'Escuchando… decí el nombre de la etiqueta',
    'toast.voiceTagActive': 'Micrófono activo: decí el nombre de una etiqueta',
    'toast.voiceTagNoMatch': 'No reconocí ninguna etiqueta: «{text}»',
    'toast.voiceTagNoSpeech': 'No se escuchó nada',
    'toast.voiceTagMicDenied': 'Permiso de micrófono denegado',
    'toast.voiceTagUnsupported': 'Tu navegador no soporta reconocimiento de voz',
    'toast.voiceTagButtonMissing': 'No se encontró el botón de esa etiqueta',
    'toast.voiceTagError': 'Error al escuchar el micrófono',
    'toast.voiceTagNeedClock': 'Iniciá el reloj para taggear por voz',
},
en: {
    'app.title': 'Simple Replay Tag',
    'header.goHome': 'Go home',
    'header.lang': 'Language',
    'menu.codeWindows': 'Code windows',

    'home.newSession': 'New session',
    'home.codeWindows': 'Code windows',
    'home.recentSessions': 'Recent sessions',
    'home.noSessions': 'No sessions yet. Pick a code window and start tagging.',
    'home.activeBoard': 'Active window',
    'home.noBoard': 'No window selected',
    'home.openSession': 'Open',
    'home.deleteSession': 'Delete session',
    'home.clipsCount': '{n} clips',
    'home.chooseBoard': 'Pick a code window to start',
    'home.editBoard': 'Edit button board',

    'session.start': 'Start',
    'session.pause': 'Pause',
    'session.resume': 'Resume',
    'session.stop': 'Stop',
    'session.undo': 'Undo',
    'session.events': 'Events',
    'session.exportXml': 'Export XML',
    'session.backHome': 'Home',
    'session.namePlaceholder': 'Session name',
    'session.idleHint': 'Start the clock to tag',
    'session.pausedHint': 'Paused',
    'session.runningHint': 'Live',
    'session.stoppedHint': 'Session stopped',
    'session.noEvents': 'No events yet',
    'session.deleteEvent': 'Delete event',
    'session.hideEvents': 'Hide events',
    'session.showEvents': 'Show events',

    'tag.editTags': 'Edit tags',
    'tag.name': 'Name',
    'tag.pre': 'Pre',
    'tag.post': 'Post',
    'tag.mode': 'Mode',
    'tag.captureMode': 'Capture mode',
    'tag.fixed': 'Fixed',
    'tag.manual': 'Manual',
    'tag.team': 'Team',
    'tag.own': 'Own',
    'tag.rival': 'Rival',
    'tag.hotkey': 'Hotkey',
    'tag.voiceAliases': 'Voice aliases',
    'tag.voiceAliasesPlaceholder': 'own goal, goal against',
    'tag.voiceAliasesHelp': 'Separate multiple aliases with commas',
    'tag.hotkeyAuto': 'Automatic',
    'tag.hotkeyCapture': 'Click and press a key. Backspace: clear. Esc: cancel.',
    'tag.hotkeyReserved': 'That key is reserved (space, arrows, etc.).',
    'tag.hotkeyDuplicate': 'The key “{key}” is already used by another tag.',
    'tag.save': 'Save',
    'tag.moveBefore': 'Before',
    'tag.moveAfter': 'After',

    'voiceTag.buttonTitle': 'Microphone: click to keep active, hold to talk',
    'voiceTag.listening': 'Listening… say the tag name',

    'bb.title': 'Code windows',
    'bb.systemTemplates': 'System templates',
    'bb.myTemplates': 'My templates',
    'bb.loading': 'Loading...',
    'bb.hockeyDefault': 'Hockey',
    'bb.footballDefault': 'Football',
    'bb.newTemplate': 'New template',
    'bb.saveCurrentAsTemplate': 'Save current code window as template',
    'bb.editTemplate': 'Edit template',
    'bb.basedOn': 'Based on',
    'bb.name': 'Name',
    'bb.namePlaceholder': 'Template name',
    'bb.saveTemplate': 'Save template',
    'bb.startBlank': 'Start blank',
    'bb.buttons': '{n} buttons',
    'bb.noUserTemplates': "You don't have any custom templates yet.",
    'bb.noSystemTemplates': 'No system templates',
    'bb.edit': 'Edit',
    'bb.duplicate': 'Duplicate',
    'bb.delete': 'Delete',
    'bb.ownRow': 'Own',
    'bb.rivalRow': 'Rival',
    'bb.update': 'Update',
    'bb.preview': 'Preview',
    'bb.noOwnButtons': 'No own buttons',
    'bb.noRivalButtons': 'No rival buttons',
    'bb.createOwnBtn': 'Create Own button',
    'bb.createRivalBtn': 'Create Rival button',
    'bb.button': 'Button',
    'bb.newTemplateBtn': '＋ New template',
    'bb.backBtn': '← Back',
    'bb.closeEditor': 'Close editor',
    'bb.newButton': 'New',
    'bb.colAdd': 'Add',
    'bb.preSecondsTitle': 'Pre (s)',
    'bb.postSecondsTitle': 'Post (s)',
    'bb.createButtonTitle': 'Create button',
    'bb.editorTitle': 'Editor',
    'bb.editorNew': 'new',
    'bb.editorNoSelection': 'none selected',
    'bb.import': 'Import JSON',
    'bb.export': 'Export JSON',
    'bb.exportOne': 'Export',
    'bb.confirmDelete': 'Delete this template?',
    'bb.confirmDeleteSession': 'Delete this session?',
    'bb.discardEditor': 'Unsaved changes. Discard them?',

    'generic.cancel': 'Cancel',
    'generic.save': 'Save',
    'generic.delete': 'Delete',
    'generic.close': 'Close',
    'generic.use': 'Use',
    'generic.copy': 'copy',

    'modal.cancel': 'Cancel',
    'analyzeFs.tags': 'Tags',

    'js.templateCopy': '(copy)',
    'js.codeWindowDefault': 'Code window',
    'js.noName': 'No name',
    'js.manualMode': 'Manual Mode',
    'js.fixedMode': 'Fixed Mode',
    'js.clickToEdit': 'Click to edit',
    'js.addTagOwn': 'Add tag (own)',
    'js.addTagRival': 'Add tag (rival)',
    'js.unnamedSession': 'Session',

    'toast.clipCreated': 'Clip created: {label} @ {time}',
    'toast.clipDeleted': 'Clip deleted',
    'toast.startClock': 'Start the clock to tag',
    'toast.manualOpened': 'Manual started: {label} @ {time}',
    'toast.manualClosed': 'Manual closed: {label} @ {time}',
    'toast.eventUndone': 'Last event undone',
    'toast.xmlExported': 'XML exported',
    'toast.templateSaved': 'Template saved',
    'toast.templateDeleted': 'Template deleted',
    'toast.boardApplied': 'Window applied: {name}',
    'toast.boardImported': 'Window imported',
    'toast.importError': 'Could not import JSON',
    'toast.sessionDeleted': 'Session deleted',
    'toast.noEvents': 'No events to export',
    'toast.needBoard': 'Pick a code window first',
    'toast.tagSaved': 'Tag saved',
    'toast.tagDeleted': 'Tag deleted',
    'toast.voiceTagListening': 'Listening… say the tag name',
    'toast.voiceTagActive': 'Microphone active: say a tag name',
    'toast.voiceTagNoMatch': 'No tag matched: "{text}"',
    'toast.voiceTagNoSpeech': 'Nothing was heard',
    'toast.voiceTagMicDenied': 'Microphone permission denied',
    'toast.voiceTagUnsupported': 'Your browser does not support speech recognition',
    'toast.voiceTagButtonMissing': 'Could not find that tag button',
    'toast.voiceTagError': 'Error while listening to the microphone',
    'toast.voiceTagNeedClock': 'Start the clock to tag by voice',
},
};

export function t(key, params) {
    const dict = translations[_lang] || translations.es;
    let str = dict[key];
    if (str === undefined) str = (translations.es || {})[key];
    if (str === undefined) return key;
    if (params) {
        for (const k of Object.keys(params)) {
            str = str.replaceAll(`{${k}}`, params[k]);
        }
    }
    return str;
}

export function getLang() { return _lang; }

export function setLang(lang) {
    if (!translations[lang]) return;
    _lang = lang;
    localStorage.setItem('srt_lang', lang);
    document.documentElement.lang = lang;
    applyTranslations();
    for (const fn of _listeners) {
        try { fn(lang); } catch (_) { /* noop */ }
    }
}

export function onLangChange(fn) {
    if (typeof fn === 'function') _listeners.push(fn);
}

export function detectLang() {
    const saved = localStorage.getItem('srt_lang');
    if (saved && translations[saved]) return saved;
    return 'es';
}

export function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n');
        const val = t(key);
        if (val !== key) el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
        const key = el.getAttribute('data-i18n-html');
        const val = t(key);
        if (val !== key) el.innerHTML = val;
    });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
        const key = el.getAttribute('data-i18n-title');
        const val = t(key);
        if (val !== key) el.title = val;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
        const key = el.getAttribute('data-i18n-placeholder');
        const val = t(key);
        if (val !== key) el.placeholder = val;
    });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
        const key = el.getAttribute('data-i18n-aria');
        const val = t(key);
        if (val !== key) el.setAttribute('aria-label', val);
    });
}

export function getBuiltinTagLabel(key) {
    const labels = BUILTIN_TAG_LABELS[_lang] || BUILTIN_TAG_LABELS.es;
    return labels[key] || key;
}

function builtinKeyFromTag(tag) {
    if (tag?.key && (BUILTIN_TAG_LABELS.es[tag.key] || BUILTIN_TAG_LABELS.en[tag.key])) {
        return tag.key;
    }
    return '';
}

/** Label del idioma actual si el botón es de un template del sistema y no fue personalizado. */
export function resolveTagLabel(tag) {
    if (!tag) return '';
    const stored = String(tag.label || '').trim();
    if (stored) return stored;
    const key = builtinKeyFromTag(tag) || tag.key;
    return getBuiltinTagLabel(key) || key || '';
}

export function getSpeechLang() {
    return _lang === 'en' ? 'en-US' : 'es-AR';
}
