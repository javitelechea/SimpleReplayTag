import { detectLang, setLang } from './i18n.js';
import { initApp } from './app.js';

setLang(detectLang());
initApp();

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
}
