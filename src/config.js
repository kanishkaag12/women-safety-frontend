// Backend configuration
const config = {
    // Change this to your local backend URL when developing locally
    // Change this to your deployed backend URL when deploying
    BACKEND_URL: 'https://women-safety-backend-rkkh.onrender.com',
    
    // API endpoints
    API_BASE: 'https://women-safety-backend-rkkh.onrender.com/api',
    
    // Auth endpoints
    AUTH_LOGIN: 'https://women-safety-backend-rkkh.onrender.com/api/auth/login',
    AUTH_REGISTER: 'https://women-safety-backend-rkkh.onrender.com/api/auth/register',
    AUTH_PROFILE: 'https://women-safety-backend-rkkh.onrender.com/api/auth/profile',
    AUTH_USERS: 'https://women-safety-backend-rkkh.onrender.com/api/auth/users',
    AUTH_CREATE_ACCOUNT: 'https://women-safety-backend-rkkh.onrender.com/api/auth/create-account',
    AUTH_VALIDATE: 'https://women-safety-backend-rkkh.onrender.com/api/auth/validate',
    AUTH_REFRESH: 'https://women-safety-backend-rkkh.onrender.com/api/auth/refresh',
    
    // Alert endpoints
    ALERTS_BASE: 'https://women-safety-backend-rkkh.onrender.com/api/alerts',
    
// Contact endpoints
    CONTACTS_BASE: 'https://women-safety-backend-rkkh.onrender.com/api/contacts',
    CONTACTS_ADD: 'https://women-safety-backend-rkkh.onrender.com/api/contacts/add'
}

export default config;
