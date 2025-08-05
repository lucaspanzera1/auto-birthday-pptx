const axios = require('axios');
const CONFIG = require('../config/config');
const FileHelper = require('../utils/fileHelper');
const Logger = require('../utils/logger');

class DataService {
    /**
     * Busca dados do usuário da API ou arquivo JSON local
     */
    static async fetchUserData() {
        try {
            Logger.loading('Buscando dados do usuário...');
            
            let rawData;
            
            if (CONFIG.API.URL.startsWith('http')) {
                rawData = await this.fetchFromAPI();
            } else {
                rawData = await this.fetchFromFile();
            }
            
            const userData = this.mapUserData(rawData);
            Logger.info('Dados do usuário obtidos com sucesso', userData);
            
            return userData;
        } catch (error) {
            Logger.error('Erro ao buscar dados do usuário', error);
            throw error;
        }
    }

    /**
     * Busca dados de uma API HTTP
     */
    static async fetchFromAPI() {
        try {
            const response = await axios.get(CONFIG.API.URL, {
                timeout: CONFIG.API.TIMEOUT
            });
            return response.data;
        } catch (error) {
            throw new Error(`Erro na requisição da API: ${error.message}`);
        }
    }

    /**
     * Busca dados de um arquivo JSON local
     */
    static async fetchFromFile() {
        try {
            Logger.file('Lendo arquivo', CONFIG.API.URL);
            return FileHelper.readJsonFile(CONFIG.API.URL);
        } catch (error) {
            throw new Error(`Erro ao ler arquivo local: ${error.message}`);
        }
    }

    /**
     * Mapeia os dados brutos para o formato esperado
     */
    static mapUserData(rawData) {
        return {
            id: rawData.id || null,
            nome: rawData.nome || rawData.name || 'Nome não encontrado',
            dataNascimento: rawData.data_nascimento || rawData.birth_date || '',
            imagemUrl: rawData.imagem || rawData.image || this.generateDefaultImage(rawData.id)
        };
    }

    /**
     * Gera URL de imagem padrão
     */
    static generateDefaultImage(id = 1) {
        return `https://picsum.photos/${CONFIG.IMAGE.DEFAULT_WIDTH}/${CONFIG.IMAGE.DEFAULT_HEIGHT}?random=${id}`;
    }

    /**
     * Valida se os dados do usuário estão completos
     */
    static validateUserData(userData) {
        const requiredFields = ['nome'];
        const missingFields = requiredFields.filter(field => !userData[field]);
        
        if (missingFields.length > 0) {
            throw new Error(`Campos obrigatórios ausentes: ${missingFields.join(', ')}`);
        }
        
        return true;
    }
}

module.exports = DataService;