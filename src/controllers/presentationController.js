const DataService = require('../services/dataService');
const ImageService = require('../services/imageService');
const TemplateService = require('../services/templateService');
const PresentationService = require('../services/presentationService');
const FileHelper = require('../utils/fileHelper');
const Logger = require('../utils/logger');

class PresentationController {
    /**
     * Método principal que coordena todo o processo para TODOS os aniversariantes
     */
    static async generateAllPresentations(options = {}) {
        const results = [];
        const tempFiles = [];
        
        try {
            Logger.start('Iniciando geração de apresentações PowerPoint...');

            // 1. Buscar TODOS os dados de aniversariantes
            const allBirthdays = await DataService.fetchBirthdayData();
            
            if (allBirthdays.length === 0) {
                throw new Error('Nenhum aniversariante encontrado');
            }

            Logger.info(`Processando ${allBirthdays.length} aniversariantes...`);

            // 2. Processar cada aniversariante
            for (let i = 0; i < allBirthdays.length; i++) {
                const birthday = allBirthdays[i];
                Logger.info(`Processando ${i + 1}/${allBirthdays.length}: ${birthday.name}`);
                
                try {
                    const result = await this.generateSinglePresentation(birthday, options, i + 1);
                    results.push(result);
                    
                    // Coleta arquivos temporários para limpeza
                    if (result.tempImagePath) {
                        tempFiles.push(result.tempImagePath);
                    }
                    
                } catch (error) {
                    Logger.error(`Erro ao processar ${birthday.name}`, error);
                    results.push({
                        success: false,
                        name: birthday.name,
                        error: error.message
                    });
                }
            }

            // 3. Limpeza de arquivos temporários
            await this.cleanupMultiple(tempFiles);

            const successCount = results.filter(r => r.success).length;
            Logger.success(`Processo concluído! ${successCount}/${allBirthdays.length} apresentações geradas`);

            return {
                success: true,
                totalProcessed: allBirthdays.length,
                successCount,
                results
            };

        } catch (error) {
            Logger.error('Erro durante o processo', error);
            await this.cleanupMultiple(tempFiles);
            
            return {
                success: false,
                error: error.message,
                results
            };
        }
    }

    /**
     * Gera apresentação para um único aniversariante
     */
    static async generateSinglePresentation(birthday, options = {}, index = 1) {
        let imagePath = null;
        
        try {
            // Converte dados do aniversariante para formato compatível
            const userData = this.convertBirthdayToUserData(birthday);

            // Baixar imagem se disponível
            if (userData.imagemUrl) {
                imagePath = await ImageService.downloadImage(userData.imagemUrl);
            }

            // Tentar usar template primeiro, depois fallback
            let outputPath;
            
            try {
                outputPath = await TemplateService.modifyTemplate(userData, imagePath, index);
                Logger.info(`Apresentação gerada usando template para ${userData.nome}`);
            } catch (templateError) {
                Logger.warning(`Template falhou para ${userData.nome}, criando nova apresentação...`);
                
                // Fallback: criar nova apresentação
                const layoutType = options.layout || 'default';
                outputPath = await PresentationService.createCustomLayout(userData, imagePath, layoutType, index);
                Logger.info(`Apresentação gerada do zero para ${userData.nome}`);
            }

            return {
                success: true,
                outputPath,
                tempImagePath: imagePath,
                userData: {
                    nome: userData.nome,
                    id: userData.id,
                    dataNascimento: userData.dataNascimento
                }
            };

        } catch (error) {
            throw error;
        }
    }

    /**
     * Método original - agora processa apenas o primeiro aniversariante (compatibilidade)
     */
    static async generatePresentation(options = {}) {
        try {
            const allResults = await this.generateAllPresentations(options);
            
            // Retorna apenas o primeiro resultado para compatibilidade
            if (allResults.results && allResults.results.length > 0) {
                return allResults.results[0];
            }
            
            return allResults;
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Gera apresentações usando apenas template para todos
     */
    static async generateAllFromTemplate() {
        const results = [];
        const tempFiles = [];
        
        try {
            const allBirthdays = await DataService.fetchBirthdayData();
            
            for (let i = 0; i < allBirthdays.length; i++) {
                const birthday = allBirthdays[i];
                const userData = this.convertBirthdayToUserData(birthday);
                
                let imagePath = null;
                try {
                    if (userData.imagemUrl) {
                        imagePath = await ImageService.downloadImage(userData.imagemUrl);
                    }

                    const outputPath = await TemplateService.modifyTemplate(userData, imagePath, i + 1);
                    results.push({ success: true, outputPath, name: userData.nome });
                    
                    if (imagePath) tempFiles.push(imagePath);
                    
                } catch (error) {
                    results.push({ success: false, error: error.message, name: userData.nome });
                    if (imagePath) tempFiles.push(imagePath);
                }
            }

            await this.cleanupMultiple(tempFiles);
            return results;
            
        } catch (error) {
            await this.cleanupMultiple(tempFiles);
            throw error;
        }
    }

    /**
     * Gera apresentações do zero para todos
     */
    static async generateAllFromScratch(layoutType = 'default') {
        const results = [];
        const tempFiles = [];
        
        try {
            const allBirthdays = await DataService.fetchBirthdayData();
            
            for (let i = 0; i < allBirthdays.length; i++) {
                const birthday = allBirthdays[i];
                const userData = this.convertBirthdayToUserData(birthday);
                
                let imagePath = null;
                try {
                    if (userData.imagemUrl) {
                        imagePath = await ImageService.downloadImage(userData.imagemUrl);
                    }

                    const outputPath = await PresentationService.createCustomLayout(
                        userData, 
                        imagePath, 
                        layoutType,
                        i + 1
                    );
                    
                    results.push({ success: true, outputPath, name: userData.nome });
                    if (imagePath) tempFiles.push(imagePath);
                    
                } catch (error) {
                    results.push({ success: false, error: error.message, name: userData.nome });
                    if (imagePath) tempFiles.push(imagePath);
                }
            }

            await this.cleanupMultiple(tempFiles);
            return results;
            
        } catch (error) {
            await this.cleanupMultiple(tempFiles);
            throw error;
        }
    }

    /**
     * Converte dados de aniversário para formato userData esperado
     */
    static convertBirthdayToUserData(birthday) {
        return {
            id: birthday.id,
            nome: birthday.name,
            dataNascimento: birthday.birthdayDate,
            imagemUrl: typeof birthday.photoInfo === 'object' 
                ? DataService.generateDefaultImage(birthday.photoInfo.hash, birthday.id)
                : DataService.generateDefaultImage(null, birthday.id)
        };
    }

    /**
     * Gera apresentação usando apenas template (compatibilidade)
     */
    static async generateFromTemplate(userData = null) {
        let imagePath = null;
        
        try {
            // Usa dados fornecidos ou busca da fonte
            const finalUserData = userData || await DataService.fetchUserData();
            
            // Baixa imagem se necessário
            if (finalUserData.imagemUrl) {
                imagePath = await ImageService.downloadImage(finalUserData.imagemUrl);
            }

            const outputPath = await TemplateService.modifyTemplate(finalUserData, imagePath);
            await this.cleanup(imagePath);

            return { success: true, outputPath };
        } catch (error) {
            await this.cleanup(imagePath);
            throw error;
        }
    }

    /**
     * Gera apresentação do zero (compatibilidade)
     */
    static async generateFromScratch(userData = null, layoutType = 'default') {
        let imagePath = null;
        
        try {
            // Usa dados fornecidos ou busca da fonte
            const finalUserData = userData || await DataService.fetchUserData();
            
            // Baixa imagem se necessário
            if (finalUserData.imagemUrl) {
                imagePath = await ImageService.downloadImage(finalUserData.imagemUrl);
            }

            const outputPath = await PresentationService.createCustomLayout(
                finalUserData, 
                imagePath, 
                layoutType
            );
            
            await this.cleanup(imagePath);

            return { success: true, outputPath };
        } catch (error) {
            await this.cleanup(imagePath);
            throw error;
        }
    }

    /**
     * Lista placeholders disponíveis no template
     */
    static async getTemplatePlaceholders() {
        try {
            const placeholders = await TemplateService.findPlaceholders();
            Logger.info('Placeholders encontrados no template', placeholders);
            return placeholders;
        } catch (error) {
            Logger.error('Erro ao buscar placeholders', error);
            return [];
        }
    }

    /**
     * Validação de dados antes da geração
     */
    static async validateData() {
        try {
            const allBirthdays = await DataService.fetchBirthdayData();
            Logger.info(`${allBirthdays.length} aniversariantes encontrados e validados`);
            return { 
                valid: true, 
                totalBirthdays: allBirthdays.length,
                birthdays: allBirthdays 
            };
        } catch (error) {
            Logger.error('Erro na validação', error);
            return { valid: false, error: error.message };
        }
    }

    /**
     * Limpeza de arquivos temporários (único arquivo)
     */
    static async cleanup(imagePath) {
        try {
            if (imagePath) {
                FileHelper.deleteFile(imagePath);
            }
            ImageService.cleanupTempImages();
            Logger.info('Limpeza de arquivos temporários realizada');
        } catch (error) {
            Logger.warning('Erro durante limpeza de arquivos temporários');
        }
    }

    /**
     * Limpeza de múltiplos arquivos temporários
     */
    static async cleanupMultiple(tempFiles) {
        try {
            for (const file of tempFiles) {
                if (file) {
                    FileHelper.deleteFile(file);
                }
            }
            ImageService.cleanupTempImages();
            Logger.info('Limpeza de arquivos temporários realizada');
        } catch (error) {
            Logger.warning('Erro durante limpeza de arquivos temporários');
        }
    }

    /**
     * Obtém estatísticas do processo
     */
    static async getStats() {
        try {
            const stats = {
                templateExists: FileHelper.fileExists(require('../config/config').PATHS.TEMPLATE),
                dataSourceExists: FileHelper.fileExists(require('../config/config').API.URL),
                outputDirExists: FileHelper.fileExists(require('../config/config').PATHS.OUTPUT_DIR),
                availableLayouts: ['default', 'modern', 'minimal']
            };

            if (stats.templateExists) {
                stats.templatePlaceholders = await this.getTemplatePlaceholders();
            }

            // Adiciona info sobre aniversariantes
            try {
                const validation = await this.validateData();
                if (validation.valid) {
                    stats.totalBirthdays = validation.totalBirthdays;
                    stats.birthdayNames = validation.birthdays.map(b => b.name);
                }
            } catch (error) {
                stats.totalBirthdays = 0;
            }

            return stats;
        } catch (error) {
            Logger.error('Erro ao obter estatísticas', error);
            return null;
        }
    }
}

module.exports = PresentationController;