// Backend configuration
const config = {
    // Change this to your local backend URL when developing locally
    // Change this to your deployed backend URL when deploying
    BACKEND_URL: 'http://localhost:5000',
    
    // API endpoints
    API_BASE: 'http://localhost:5000/api',
    
    // Auth endpoints
    AUTH_LOGIN: 'http://localhost:5000/api/auth/login',
    AUTH_REGISTER: 'http://localhost:5000/api/auth/register',
    AUTH_PROFILE: 'http://localhost:5000/api/auth/profile',
    AUTH_USERS: 'http://localhost:5000/api/auth/users',
    AUTH_CREATE_ACCOUNT: 'http://localhost:5000/api/auth/create-account',
    AUTH_VALIDATE: 'http://localhost:5000/api/auth/validate',
    AUTH_REFRESH: 'http://localhost:5000/api/auth/refresh',
    
    // Alert endpoints
    ALERTS_BASE: 'http://localhost:5000/api/alerts',
    
    // Contact endpoints
    CONTACTS_BASE: 'http://localhost:5000/api/contacts'
};

export default config;
