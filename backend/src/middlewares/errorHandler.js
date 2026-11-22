const HttpError = require('./../errors/HttpError.js');

const errorHandlerMiddleware = (error, req, res, next) => {
    if (error?.name === 'MulterError') {
        const message = error.code === 'LIMIT_FILE_SIZE'
            ? 'O arquivo deve ter no máximo 10 MB.'
            : 'Não foi possível receber o arquivo enviado.';
        return res.status(400).json({ message });
    }

    if (error?.type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'Corpo da requisição JSON inválido.' });
    }

    if (
        error?.message === 'Envie somente arquivos PDF.' ||
        error?.message === 'Envie somente arquivos PDF ou PNG.'
    ) {
        return res.status(400).json({ message: error.message });
    }

    if (error instanceof HttpError) {
        return res.status(error.status).json({ message: error.message });
    }

    console.error(`[ErrorHandler] ${req?.method || 'UNKNOWN'} ${req?.originalUrl || ''}:`, error);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
};

module.exports = errorHandlerMiddleware;
