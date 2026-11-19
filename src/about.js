import './styles.css';
import { config } from './config.js';
import { initI18n, onLangChange, t } from './i18n/index.js';

initI18n();
document.getElementById('contact-link').href = config.contactUrl;
document.getElementById('source-link').href = config.sourceUrl;
const setTitle = () => (document.title = `${t('about.title')} – ${t('about.licenseTitle')} · ${t('about.privacyTitle')}`);
setTitle();
onLangChange(setTitle);
