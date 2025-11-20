// auth.js

const AUTH_KEY = 'omr_app_auth';

const auth = {
    login: (username) => {
        if (!username) return false;
        const session = {
            username: username,
            loginTime: new Date().toISOString()
        };
        sessionStorage.setItem(AUTH_KEY, JSON.stringify(session));
        return true;
    },

    logout: () => {
        sessionStorage.removeItem(AUTH_KEY);
        window.location.href = 'login.html';
    },

    getUser: () => {
        const session = sessionStorage.getItem(AUTH_KEY);
        return session ? JSON.parse(session) : null;
    },

    checkAuth: () => {
        const user = auth.getUser();
        if (!user) {
            window.location.href = 'login.html';
        }
        return user;
    },

    // For login page: redirect to app if already logged in
    redirectIfLoggedIn: () => {
        if (auth.getUser()) {
            window.location.href = 'index.html';
        }
    }
};
