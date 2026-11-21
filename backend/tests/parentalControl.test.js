const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const cookieParser = require('cookie-parser');

require('dotenv').config();
const sequelize = require('../src/models/database');
require('../src/models/associations');

const errorHandlerMiddleware = require('../src/middlewares/errorHandler');
const csrfMiddleware = require('../src/middlewares/csrf');
const ExpenseRouter = require('../src/routes/expense');
const IncomeRouter = require('../src/routes/income');
const UserRouter = require('../src/routes/user');
const CategoryRouter = require('../src/routes/category');
const UserModel = require('../src/models/user');
const CategoryModel = require('../src/models/category');

function extractCookies(setCookieHeaders = []) {
    const cookies = {};
    for (const header of setCookieHeaders) {
        const [pair] = header.split(';');
        const eqIdx = pair.indexOf('=');
        if (eqIdx > 0) {
            const key = pair.slice(0, eqIdx).trim();
            const val = pair.slice(eqIdx + 1).trim();
            cookies[key] = val;
        }
    }
    return cookies;
}

class CookieClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.cookies = {};
    }

    async request(method, path, body = undefined) {
        const headers = {};
        const cookieStr = Object.entries(this.cookies)
            .map(([k, v]) => `${k}=${v}`)
            .join('; ');
        if (cookieStr) {
            headers.Cookie = cookieStr;
        }
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && this.cookies.csrfToken) {
            headers['X-CSRF-Token'] = this.cookies.csrfToken;
        }

        let payload;
        if (body instanceof FormData) {
            payload = body;
        } else if (body !== undefined) {
            headers['Content-Type'] = 'application/json';
            payload = JSON.stringify(body);
        }

        const res = await fetch(`${this.baseUrl}${path}`, {
            method,
            headers,
            body: payload,
        });

        const setCookies = typeof res.headers.getSetCookie === 'function'
            ? res.headers.getSetCookie()
            : [];
        Object.assign(this.cookies, extractCookies(setCookies));

        const text = await res.text();
        let data = null;
        try {
            data = text ? JSON.parse(text) : null;
        } catch {
            data = text;
        }

        return { status: res.status, data };
    }
}

test('Controle parental end-to-end (RBAC, IDOR, mass assignment e dashboard consolidado)', async (t) => {
    await sequelize.authenticate();

    const app = express();
    app.use(cookieParser());
    app.use(express.json());
    app.use('/api', csrfMiddleware);
    app.use('/api', ExpenseRouter);
    app.use('/api', IncomeRouter);
    app.use('/api', UserRouter);
    app.use('/api', CategoryRouter);
    app.use(errorHandlerMiddleware);

    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}/api`;

    const suffix = Date.now();
    const createdUserIds = [];
    let createdCategoryId = null;

    t.after(async () => {
        for (const id of createdUserIds.reverse()) {
            await UserModel.deleteUser(id).catch(() => {});
        }
        if (createdCategoryId) {
            await CategoryModel.delete(createdCategoryId).catch(() => {});
        }
        await new Promise((resolve) => server.close(resolve));
        await sequelize.close();
    });

    const adminClient = new CookieClient(baseUrl);
    const otherAdminClient = new CookieClient(baseUrl);
    const childClient = new CookieClient(baseUrl);

    // 1. Auto-cadastro via /users força role='admin' mesmo tentando enviar role='user' ou parentId
    const regAdmin = await adminClient.request('POST', '/users', {
        name: 'Pai Teste',
        email: `pai.${suffix}@teste.com`,
        password: 'password123',
        role: 'user',
        parentId: 9999,
    });
    assert.equal(regAdmin.status, 201);
    assert.equal(regAdmin.data.role, 'admin');
    assert.equal(regAdmin.data.parentId, null);
    createdUserIds.push(regAdmin.data.id);

    const regOtherAdmin = await otherAdminClient.request('POST', '/users', {
        name: 'Outro Pai',
        email: `outro.${suffix}@teste.com`,
        password: 'password123',
    });
    assert.equal(regOtherAdmin.status, 201);
    createdUserIds.push(regOtherAdmin.data.id);

    // Login dos dois admins
    const loginAdmin = await adminClient.request('POST', '/auth/login', {
        email: `pai.${suffix}@teste.com`,
        password: 'password123',
    });
    assert.equal(loginAdmin.status, 200);
    assert.equal(loginAdmin.data.user.role, 'admin');

    const loginOtherAdmin = await otherAdminClient.request('POST', '/auth/login', {
        email: `outro.${suffix}@teste.com`,
        password: 'password123',
    });
    assert.equal(loginOtherAdmin.status, 200);

    // Admin cria categoria e receita
    const catRes = await adminClient.request('POST', '/categories', {
        name: `CatParental_${suffix}`,
        description: 'Categoria teste parental',
    });
    assert.equal(catRes.status, 201);
    createdCategoryId = catRes.data.id;

    const incomeForm = new FormData();
    incomeForm.append('description', 'Salário');
    incomeForm.append('amount', '1000');
    incomeForm.append('date', '2026-11-20');
    const incomeRes = await adminClient.request('POST', '/incomes', incomeForm);
    assert.equal(incomeRes.status, 201);

    // Admin cria filho via /family/users (forçando role='user' e parentId=admin.id)
    const createChildRes = await adminClient.request('POST', '/family/users', {
        name: 'Filho Teste',
        email: `filho.${suffix}@teste.com`,
        password: 'password123',
        role: 'admin',
        parentId: regOtherAdmin.data.id,
    });
    assert.equal(createChildRes.status, 201);
    assert.equal(createChildRes.data.role, 'user');
    assert.equal(createChildRes.data.parentId, regAdmin.data.id);
    const childId = createChildRes.data.id;
    createdUserIds.push(childId);

    // Login do filho
    const loginChild = await childClient.request('POST', '/auth/login', {
        email: `filho.${suffix}@teste.com`,
        password: 'password123',
    });
    assert.equal(loginChild.status, 200);
    assert.equal(loginChild.data.user.role, 'user');
    assert.equal(loginChild.data.user.parentId, regAdmin.data.id);

    // 2. Filho é bloqueado (403) em receitas, dashboard, gestão de categorias e gestão de usuários
    assert.equal((await childClient.request('GET', '/incomes')).status, 403);
    assert.equal((await childClient.request('GET', '/dashboard/balance')).status, 403);
    assert.equal((await childClient.request('GET', '/dashboard/total-expenses')).status, 403);
    assert.equal((await childClient.request('GET', '/dashboard/expenses-count')).status, 403);
    assert.equal((await childClient.request('GET', '/dashboard/expenses-by-category')).status, 403);
    assert.equal((await childClient.request('POST', '/categories', { name: 'X', description: 'Y' })).status, 403);
    assert.equal((await childClient.request('GET', '/family/users')).status, 403);
    assert.equal((await childClient.request('POST', '/family/users', { name: 'A', email: 'a@b.com', password: 'password123' })).status, 403);

    // Mas filho pode ler categorias (GET) para usar no CRUD de despesas
    assert.equal((await childClient.request('GET', '/categories')).status, 200);

    // 3. Filho cria despesa de R$ 150 e admin cria despesa de R$ 50
    const childExpForm = new FormData();
    childExpForm.append('description', 'Lanche filho');
    childExpForm.append('amount', '150');
    childExpForm.append('date', '2026-11-20');
    childExpForm.append('status', 'PAGA');
    childExpForm.append('categoryId', String(createdCategoryId));
    const childExpRes = await childClient.request('POST', '/expenses', childExpForm);
    assert.equal(childExpRes.status, 201);
    assert.equal(childExpRes.data.userId, childId);

    const adminExpForm = new FormData();
    adminExpForm.append('description', 'Mercado pai');
    adminExpForm.append('amount', '50');
    adminExpForm.append('date', '2026-11-20');
    adminExpForm.append('status', 'PAGA');
    adminExpForm.append('categoryId', String(createdCategoryId));
    const adminExpRes = await adminClient.request('POST', '/expenses', adminExpForm);
    assert.equal(adminExpRes.status, 201);

    // Filho NÃO vê despesa do pai (404 ao tentar acessar diretamente, e listagem só traz a própria)
    const childListRes = await childClient.request('GET', '/expenses');
    assert.equal(childListRes.status, 200);
    assert.equal(childListRes.data.length, 1);
    assert.equal(childListRes.data[0].id, childExpRes.data.id);
    assert.equal((await childClient.request('GET', `/expenses/${adminExpRes.data.id}`)).status, 404);

    // 4. Dashboard do Admin consolida despesas do pai + filho: 1000 - (150 + 50) = 800
    const balanceRes = await adminClient.request('GET', '/dashboard/balance');
    assert.equal(balanceRes.status, 200);
    assert.equal(balanceRes.data.totalIncomes, 1000);
    assert.equal(balanceRes.data.totalExpenses, 200);
    assert.equal(balanceRes.data.balance, 800);

    const totalExpRes = await adminClient.request('GET', '/dashboard/total-expenses');
    assert.equal(totalExpRes.status, 200);
    assert.equal(totalExpRes.data.total, 200);

    const countExpRes = await adminClient.request('GET', '/dashboard/expenses-count');
    assert.equal(countExpRes.status, 200);
    assert.equal(countExpRes.data.quantidade, 2);

    const byCatRes = await adminClient.request('GET', '/dashboard/expenses-by-category');
    assert.equal(byCatRes.status, 200);
    assert.equal(byCatRes.data[0].total, 200);

    // 5. Admin lista despesas (inclui autor) e edita a despesa do filho preservando userId original do filho
    const adminListRes = await adminClient.request('GET', '/expenses');
    assert.equal(adminListRes.status, 200);
    assert.equal(adminListRes.data.length, 2);
    const childExpenseInList = adminListRes.data.find((e) => e.id === childExpRes.data.id);
    assert.equal(childExpenseInList.users.name, 'Filho Teste');

    const editChildExpForm = new FormData();
    editChildExpForm.append('description', 'Lanche filho atualizado');
    editChildExpForm.append('amount', '200');
    editChildExpForm.append('date', '2026-11-20');
    editChildExpForm.append('status', 'PAGA');
    editChildExpForm.append('categoryId', String(createdCategoryId));
    const editChildExpRes = await adminClient.request('PUT', `/expenses/${childExpRes.data.id}`, editChildExpForm);
    assert.equal(editChildExpRes.status, 200);
    assert.equal(editChildExpRes.data.userId, childId);

    // 6. Isolamento entre famílias (IDOR): Outro Admin não pode ver nem alterar filho ou despesa da família 1
    assert.equal((await otherAdminClient.request('GET', '/family/users')).data.length, 0);
    assert.equal((await otherAdminClient.request('PUT', `/family/users/${childId}`, { name: 'Hack', email: 'hack@teste.com' })).status, 404);
    assert.equal((await otherAdminClient.request('DELETE', `/family/users/${childId}`)).status, 404);
    assert.equal((await otherAdminClient.request('GET', `/expenses/${childExpRes.data.id}`)).status, 404);

    // 7. Admin edita filho (sem trocar senha) e depois remove filho (invalidando o token dele imediatamente)
    const updateChildRes = await adminClient.request('PUT', `/family/users/${childId}`, {
        name: 'Filho Editado',
        email: `filho.editado.${suffix}@teste.com`,
    });
    assert.equal(updateChildRes.status, 200);
    assert.equal(updateChildRes.data.name, 'Filho Editado');

    const deleteChildRes = await adminClient.request('DELETE', `/family/users/${childId}`);
    assert.equal(deleteChildRes.status, 204);

    // Token do filho excluído falha imediatamente com 401
    assert.equal((await childClient.request('GET', '/expenses')).status, 401);

    // Saldo volta a considerar só a despesa do pai (1000 - 50 = 950)
    const balanceAfterDelete = await adminClient.request('GET', '/dashboard/balance');
    assert.equal(balanceAfterDelete.status, 200);
    assert.equal(balanceAfterDelete.data.totalExpenses, 50);
    assert.equal(balanceAfterDelete.data.balance, 950);
});
