const axios = require('axios');
const CONFIG = require('../config/config');
const FileHelper = require('../utils/fileHelper');
const Logger = require('../utils/logger');

class DataService {
    /**
     * Busca dados do JSON (API ou arquivo local)
     */
    static async fetchData() {
        try {
            Logger.loading('Buscando dados...');
            
            let rawData;
            
            if (CONFIG.API.URL.startsWith('http')) {
                rawData = await this.fetchFromAPI();
            } else {
                rawData = await this.fetchFromFile();
            }
            
            Logger.info('Dados obtidos com sucesso');
            return rawData;
        } catch (error) {
            Logger.error('Erro ao buscar dados', error);
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
     * Processa e filtra os dados de aniversário do JSON
     */
    static processAndFilterData(data) {
        // Verifica se a estrutura de dados esperada existe
        if (!data || !data.birthday || !Array.isArray(data.birthday)) {
            Logger.warning('Nenhum dado de aniversário encontrado na estrutura esperada');
            return [];
        }

        // Mapeia os dados brutos para um formato mais simples
        const birthdays = data.birthday.map(item => {
            const name = item.staffMember?.person?.name || 'Nome não encontrado';
            const birthdayDate = item.date ? new Date(item.date).toLocaleDateString('pt-BR') : 'Data não encontrada';
            
            // Busca informações da foto no caminho correto
            let photoInfo = 'Foto não encontrada';
            
            if (item.staffMember?.person?.photo) {
                const photo = item.staffMember.person.photo;
                photoInfo = {
                    name: photo.name || 'Nome não disponível',
                    hash: photo.hash || 'Hash não disponível',
                    contentType: photo.contentType || 'Tipo não disponível'
                };
            }
            
            return {
                id: item.staffMember?.person?.id || null,
                name,
                birthdayDate,
                photoInfo,
                rawDate: item.date // Mantém a data original para ordenação se necessário
            };
        });

        Logger.info(`${birthdays.length} aniversariantes processados`);
        return birthdays;
    }

    /**
     * Busca e processa todos os dados de aniversário
     */
    static async fetchBirthdayData() {
        try {
            const rawData = await this.fetchData();
            const processedData = this.processAndFilterData(rawData);
            return processedData;
        } catch (error) {
            Logger.error('Erro ao buscar e processar dados de aniversário', error);
            throw error;
        }
    }

    /**
     * Filtra aniversariantes por mês
     */
    static filterByMonth(birthdays, month) {
        if (!Array.isArray(birthdays)) {
            return [];
        }

        return birthdays.filter(birthday => {
            if (!birthday.rawDate) return false;
            const birthdayMonth = new Date(birthday.rawDate).getMonth() + 1; // +1 porque getMonth() retorna 0-11
            return birthdayMonth === month;
        });
    }

    /**
     * Filtra aniversariantes do mês atual
     */
    static getCurrentMonthBirthdays(birthdays) {
        const currentMonth = new Date().getMonth() + 1;
        return this.filterByMonth(birthdays, currentMonth);
    }

    /**
     * Ordena aniversariantes por data
     */
    static sortByDate(birthdays, ascending = true) {
        if (!Array.isArray(birthdays)) {
            return [];
        }

        return birthdays.sort((a, b) => {
            if (!a.rawDate || !b.rawDate) return 0;
            
            const dateA = new Date(a.rawDate);
            const dateB = new Date(b.rawDate);
            
            return ascending ? dateA - dateB : dateB - dateA;
        });
    }

    /**
     * Valida se os dados de aniversário estão no formato esperado
     */
    static validateBirthdayData(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Dados inválidos: esperado um objeto');
        }

        if (!data.birthday) {
            throw new Error('Estrutura de dados inválida: campo "birthday" não encontrado');
        }

        if (!Array.isArray(data.birthday)) {
            throw new Error('Estrutura de dados inválida: "birthday" deve ser um array');
        }

        return true;
    }

    /**
     * Gera URL de imagem padrão baseada no hash da foto ou ID
     */
    static generateDefaultImage(photoHash = null, id = 1) {
        const seed = photoHash || id;
        return `https://picsum.photos/${CONFIG.IMAGE.DEFAULT_WIDTH}/${CONFIG.IMAGE.DEFAULT_HEIGHT}?random=${seed}`;
    }

    /**
     * Valida se os dados do usuário estão completos (método de compatibilidade)
     * @deprecated Use validateBirthdayData() para validar a estrutura completa
     */
    static validateUserData(userData) {
        if (!userData || typeof userData !== 'object') {
            throw new Error('Dados do usuário inválidos');
        }

        const requiredFields = ['nome'];
        const missingFields = requiredFields.filter(field => !userData[field]);
        
        if (missingFields.length > 0) {
            throw new Error(`Campos obrigatórios ausentes: ${missingFields.join(', ')}`);
        }
        
        return true;
    }

    /**
     * Método de compatibilidade - mantém a interface original
     * @deprecated Use fetchBirthdayData() ao invés de fetchUserData()
     */
    static async fetchUserData() {
        Logger.warning('fetchUserData() está deprecado, use fetchBirthdayData()');
        const birthdays = await this.fetchBirthdayData();
        
        // Retorna o primeiro aniversariante ou dados padrão para compatibilidade
        if (birthdays.length > 0) {
            const firstBirthday = birthdays[0];
            return {
                id: firstBirthday.id,
                nome: firstBirthday.name,
                dataNascimento: firstBirthday.birthdayDate,
                imagemUrl: typeof firstBirthday.photoInfo === 'object' 
                    ? this.generateDefaultImage(firstBirthday.photoInfo.hash, firstBirthday.id)
                    : this.generateDefaultImage(null, firstBirthday.id)
            };
        }
        
        return {
            id: null,
            nome: 'Nenhum aniversariante encontrado',
            dataNascimento: '',
            imagemUrl: this.generateDefaultImage()
        };
    }
}

module.exports = DataService;