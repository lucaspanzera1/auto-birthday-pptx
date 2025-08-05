const fs = require('fs');
const path = require('path');
const Logger = require('./logger');

class FileHelper {
    /**
     * Garante que um diretório existe, criando-o se necessário
     */
    static ensureDirectory(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            Logger.info(`Diretório criado: ${dirPath}`);
        }
    }

    /**
     * Verifica se um arquivo existe
     */
    static fileExists(filePath) {
        return fs.existsSync(filePath);
    }

    /**
     * Lê um arquivo JSON e retorna o objeto
     */
    static readJsonFile(filePath) {
        try {
            const absolutePath = path.resolve(filePath);
            
            if (!this.fileExists(absolutePath)) {
                throw new Error(`Arquivo não encontrado: ${absolutePath}`);
            }

            const content = fs.readFileSync(absolutePath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            Logger.error('Erro ao ler arquivo JSON', error);
            throw error;
        }
    }

    /**
     * Salva dados em um arquivo
     */
    static writeFile(filePath, data) {
        try {
            const dir = path.dirname(filePath);
            this.ensureDirectory(dir);
            
            fs.writeFileSync(filePath, data);
            Logger.file('Arquivo salvo', filePath);
            return filePath;
        } catch (error) {
            Logger.error('Erro ao salvar arquivo', error);
            throw error;
        }
    }

    /**
     * Remove um arquivo
     */
    static deleteFile(filePath) {
        try {
            if (this.fileExists(filePath)) {
                fs.unlinkSync(filePath);
                Logger.info(`Arquivo removido: ${filePath}`);
            }
        } catch (error) {
            Logger.warning(`Não foi possível remover arquivo: ${filePath}`);
        }
    }

    /**
     * Gera um nome de arquivo único baseado no timestamp
     */
    static generateFileName(baseName, extension) {
        const timestamp = Date.now();
        const sanitizedName = baseName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
        return `${sanitizedName}_${timestamp}.${extension}`;
    }

    /**
     * Obtem a extensão de um arquivo
     */
    static getFileExtension(filename) {
        return path.extname(filename).toLowerCase().substring(1);
    }
}

module.exports = FileHelper;