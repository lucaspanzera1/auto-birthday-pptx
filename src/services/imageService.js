const axios = require('axios');
const path = require('path');
const CONFIG = require('../config/config');
const FileHelper = require('../utils/fileHelper');
const Logger = require('../utils/logger');

class ImageService {
    /**
     * Baixa uma imagem da URL e salva localmente
     */
    static async downloadImage(imageUrl, fileName = null) {
        try {
            Logger.loading('Baixando imagem...');
            
            // Valida a URL
            if (!this.isValidImageUrl(imageUrl)) {
                throw new Error('URL de imagem inválida');
            }

            const response = await axios({
                method: 'GET',
                url: imageUrl,
                responseType: 'arraybuffer',
                timeout: CONFIG.API.TIMEOUT
            });

            // Gera nome do arquivo se não fornecido
            const finalFileName = fileName || this.generateImageFileName();
            const imagePath = path.join(CONFIG.PATHS.TEMP_DIR, finalFileName);

            // Garante que o diretório temp existe
            FileHelper.ensureDirectory(CONFIG.PATHS.TEMP_DIR);

            // Salva a imagem
            FileHelper.writeFile(imagePath, response.data);
            
            Logger.info('Imagem baixada com sucesso');
            return imagePath;
        } catch (error) {
            Logger.error('Erro ao baixar imagem', error);
            throw error;
        }
    }

    /**
     * Verifica se a URL é válida para uma imagem
     */
    static isValidImageUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Gera um nome único para a imagem
     */
    static generateImageFileName() {
        return FileHelper.generateFileName('image', 'jpg');
    }

    /**
     * Valida se o formato da imagem é suportado
     */
    static isValidImageFormat(filename) {
        const extension = FileHelper.getFileExtension(filename);
        return CONFIG.IMAGE.FORMATS.includes(extension);
    }

    /**
     * Limpa arquivos temporários de imagem
     */
    static cleanupTempImages() {
        try {
            if (FileHelper.fileExists(CONFIG.PATHS.TEMP_DIR)) {
                // Aqui você pode implementar limpeza mais específica se necessário
                Logger.info('Limpeza de arquivos temporários realizada');
            }
        } catch (error) {
            Logger.warning('Erro durante limpeza de arquivos temporários');
        }
    }

    /**
     * Obtém informações da imagem
     */
    static getImageInfo(imagePath) {
        try {
            const stats = require('fs').statSync(imagePath);
            return {
                path: imagePath,
                size: stats.size,
                extension: FileHelper.getFileExtension(imagePath),
                exists: true
            };
        } catch (error) {
            return {
                path: imagePath,
                exists: false,
                error: error.message
            };
        }
    }
}

module.exports = ImageService;