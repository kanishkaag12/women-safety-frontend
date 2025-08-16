// Backend configuration
// Prefer env var. If not available (e.g., env disabled on Netlify),
// auto-detect Netlify domain and fall back to your Render backend.
const inferredProdUrl = (typeof window !== 'undefined' && /netlify\.app$/i.test(window.location.hostname))
  ? 'https://women-safety-backend-rkkh.onrender.com'
  : undefined;

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || inferredProdUrl || 'http://localhost:5000';

const config = {
    // Base backend URL (including protocol + host, no trailing slash)
    BACKEND_URL,

    // API base
    API_BASE: `${BACKEND_URL}/api`,

    // Auth endpoints
    AUTH_LOGIN: `${BACKEND_URL}/api/auth/login`,
    AUTH_REGISTER: `${BACKEND_URL}/api/auth/register`,
    AUTH_PROFILE: `${BACKEND_URL}/api/auth/profile`,
    AUTH_USERS: `${BACKEND_URL}/api/auth/users`,
    AUTH_CREATE_ACCOUNT: `${BACKEND_URL}/api/auth/create-account`,
    AUTH_VALIDATE: `${BACKEND_URL}/api/auth/validate`,
    AUTH_REFRESH: `${BACKEND_URL}/api/auth/refresh`,

    // Alert endpoints
    ALERTS_BASE: `${BACKEND_URL}/api/alerts`,

    // Contact endpoints
    CONTACTS_BASE: `${BACKEND_URL}/api/contacts`,
    CONTACTS_ADD: `${BACKEND_URL}/api/contacts/add`
};

export default config;
