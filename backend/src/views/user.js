const UserController = require('../controllers/user');
const {
    REFRESH_TOKEN_COOKIE_NAME,
    CSRF_TOKEN_COOKIE_NAME,
    setAuthCookies,
    setCsrfCookie,
    clearAuthCookies,
} = require('../utils/cookie');
const { generateCsrfToken } = require('../utils/token');

class UserView {
    constructor() {
    }

    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            const auth = await UserController.login(email, password);

            setAuthCookies(res, auth.accessToken, auth.refreshToken, auth.csrfToken);

            res.status(200).json({ user: auth.user });
        } catch (error) {
            next(error);
        }
    }

    async refresh(req, res, next) {
        try {
            const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
            const auth = await UserController.refresh(refreshToken);

            setAuthCookies(res, auth.accessToken, auth.refreshToken, auth.csrfToken);

            res.status(200).json({ user: auth.user });
        } catch (error) {
            clearAuthCookies(res);
            next(error);
        }
    }

    async logout(req, res, next) {
        try {
            const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
            await UserController.logout(refreshToken);

            clearAuthCookies(res);
            res.status(204).send();
        } catch (error) {
            clearAuthCookies(res);
            next(error);
        }
    }

    async me(req, res, next) {
        try {
            const user = await UserController.getById(req.user.id);

            if (!req.cookies?.[CSRF_TOKEN_COOKIE_NAME]) {
                setCsrfCookie(res, generateCsrfToken());
            }

            res.status(200).json({ user });
        } catch (error) {
            next(error);
        }
    }

    async getAll(req, res, next) {
        try {
            const users = await UserController.getAll();
            res.status(200).json(users);
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const { email, password, name } = req.body;
            const newUser = await UserController.create(email, password, name);

            res.status(201).json(newUser);
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const id = Number(req.params.id);
            const user = await UserController.getById(id);

            res.status(200).json(user);
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const id = Number(req.params.id);
            const { email, password, name } = req.body;

            const updatedUser = await UserController.update(id, email, password, name);

            res.status(200).json(updatedUser);
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            const id = Number(req.params.id);
            await UserController.delete(id);

            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new UserView();
