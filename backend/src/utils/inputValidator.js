const HttpError = require('../errors/HttpError');

const CONTROL_CHARS_REGEX = /[\u0000-\u001F\u007F]/g;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_AMOUNT = 99999999.99;

/**
 * Converte e valida identificadores inteiros positivos.
 */
function parsePositiveId(value, fieldLabel = 'ID') {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
        throw new HttpError(400, `${fieldLabel} inválido.`);
    }
    return parsed;
}

/**
 * Higieniza e valida textos de entrada removendo caracteres de controle e espaços extras.
 */
function sanitizeText(value, { fieldName = 'Campo', minLength = 1, maxLength = 255, required = true } = {}) {
    if (value === undefined || value === null) {
        if (required) {
            throw new HttpError(400, `${fieldName} é obrigatório.`);
        }
        return '';
    }

    if (typeof value !== 'string') {
        throw new HttpError(400, `${fieldName} inválido.`);
    }

    const cleaned = value.replace(CONTROL_CHARS_REGEX, '').trim();

    if (required && cleaned.length < minLength) {
        throw new HttpError(400, `${fieldName} é obrigatório.`);
    }

    if (cleaned.length > maxLength) {
        throw new HttpError(400, `${fieldName} deve ter no máximo ${maxLength} caracteres.`);
    }

    return cleaned;
}

/**
 * Valida valores monetários estritamente positivos e finitos com até duas casas decimais.
 */
function parsePositiveAmount(value, fieldName = 'Valor') {
    if (
        value === undefined ||
        value === null ||
        typeof value === 'boolean' ||
        typeof value === 'object' ||
        (typeof value === 'string' && value.trim() === '')
    ) {
        throw new HttpError(400, `${fieldName} inválido.`);
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > MAX_AMOUNT) {
        throw new HttpError(400, `${fieldName} deve ser maior que zero.`);
    }

    return Math.round(parsed * 100) / 100;
}

/**
 * Retorna a data local atual no formato YYYY-MM-DD.
 */
function getTodayLocalIsoDate(now = new Date()) {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Valida data YYYY-MM-DD real no calendário e garante que não é futura.
 */
function validatePastOrTodayDate(value, fieldName = 'Data', now = new Date()) {
    if (typeof value !== 'string' || !ISO_DATE_REGEX.test(value)) {
        throw new HttpError(400, `${fieldName} inválida. Use o formato YYYY-MM-DD.`);
    }

    const [year, month, day] = value.split('-').map(Number);
    const utcDate = new Date(Date.UTC(year, month - 1, day));

    if (
        utcDate.getUTCFullYear() !== year ||
        utcDate.getUTCMonth() + 1 !== month ||
        utcDate.getUTCDate() !== day
    ) {
        throw new HttpError(400, `${fieldName} inválida.`);
    }

    const today = getTodayLocalIsoDate(now);
    if (value > today) {
        throw new HttpError(400, `${fieldName} não pode ser maior que a data atual.`);
    }

    return value;
}

module.exports = {
    parsePositiveId,
    sanitizeText,
    parsePositiveAmount,
    validatePastOrTodayDate,
    getTodayLocalIsoDate,
};
