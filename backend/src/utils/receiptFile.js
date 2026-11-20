const crypto = require('crypto');
const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const multer = require('multer');
const HttpError = require('../errors/HttpError');

const PDF_SIGNATURE = Buffer.from('%PDF-');
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const ALLOWED_TYPES = {
    '.pdf': {
        mime: 'application/pdf',
        signature: PDF_SIGNATURE,
    },
    '.png': {
        mime: 'image/png',
        signature: PNG_SIGNATURE,
    },
};

function resolveExtensionFromFile(file) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const spec = ALLOWED_TYPES[ext];
    if (!spec || file.mimetype !== spec.mime) {
        return null;
    }
    return ext;
}

/**
 * Cria middleware multer restrito a PDF e PNG com nome aleatório UUID.
 */
function createIncomeReceiptUpload(uploadDirectory) {
    fs.mkdirSync(uploadDirectory, { recursive: true });

    return multer({
        storage: multer.diskStorage({
            destination: (req, file, callback) => callback(null, uploadDirectory),
            filename: (req, file, callback) => {
                const ext = resolveExtensionFromFile(file);
                if (!ext) {
                    return callback(new Error('Envie somente arquivos PDF ou PNG.'));
                }
                return callback(null, `${crypto.randomUUID()}${ext}`);
            },
        }),
        fileFilter: (req, file, callback) => {
            if (resolveExtensionFromFile(file)) {
                return callback(null, true);
            }
            return callback(new Error('Envie somente arquivos PDF ou PNG.'));
        },
        limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    });
}

/**
 * Confere os magic bytes do arquivo salvo para impedir spoofing de extensão/MIME.
 */
async function validateReceiptMagicBytes(filePath, expectedExt) {
    const spec = ALLOWED_TYPES[expectedExt];
    if (!spec) {
        throw new HttpError(400, 'Formato de comprovante não permitido.');
    }

    const sigLength = spec.signature.length;
    const buffer = Buffer.alloc(sigLength);
    const handle = await fsPromises.open(filePath, 'r');

    try {
        const { bytesRead } = await handle.read(buffer, 0, sigLength, 0);
        if (bytesRead < sigLength || !buffer.subarray(0, sigLength).equals(spec.signature)) {
            throw new HttpError(400, 'O arquivo enviado não corresponde a um PDF ou PNG válido.');
        }
    } finally {
        await handle.close();
    }
}

/**
 * Resolve caminho seguro dentro do diretório permitido evitando path traversal.
 */
function resolveSafeReceiptPath(uploadDirectory, storedFilename) {
    const safeName = path.basename(storedFilename);
    const resolvedDir = path.resolve(uploadDirectory);
    const resolvedFile = path.resolve(resolvedDir, safeName);

    if (!resolvedFile.startsWith(`${resolvedDir}${path.sep}`)) {
        throw new HttpError(400, 'Caminho de arquivo inválido.');
    }

    const ext = path.extname(safeName).toLowerCase();
    const spec = ALLOWED_TYPES[ext];
    if (!spec) {
        throw new HttpError(400, 'Formato de arquivo inválido.');
    }

    return {
        safePath: resolvedFile,
        contentType: spec.mime,
        extension: ext,
    };
}

module.exports = {
    createIncomeReceiptUpload,
    validateReceiptMagicBytes,
    resolveSafeReceiptPath,
};
