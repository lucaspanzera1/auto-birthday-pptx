const DataService = require('../services/dataService');
const ImageService = require('../services/imageService');
const TemplateService = require('../services/templateService');
const PresentationService = require('../services/presentationService');
const FileHelper = require('../utils/fileHelper');
const Logger = require('../utils/logger');

class PresentationController {
    /**
     * Método principal que coordena todo o processo
     */
    static async generatePresentation(options = {}) {
        let imagePath = null;
        
        try {
            Logger.start('Iniciando geração de apresentação PowerPoint...');

            // 1. Buscar dados do usuário
            const userData = await DataService.fetchUserData();
            DataService.validateUserData(userData);

            // 2. Baixar imagem se disponível
            if (userData.imagemUrl) {
                imagePath = await ImageService.downloadImage(userData.imagemUrl);
            }

            // 3. Tentar usar template primeiro, depois fallback
            let outputPath;
            
            try {
                outputPath = await TemplateService.modifyTemplate(userData, imagePath);
                Logger.info('Apresentação gerada usando template');
            } catch (templateError) {
                Logger.warning('Não foi possível usar template, criando nova apresentação...');
                Logger.error('Erro do template', templateError);
                
                // Fallback: criar nova apresentação
                const layoutType = options.layout || 'default';
                outputPath = await PresentationService.createCustomLayout(userData, imagePath, layoutType);
                Logger.info('Apresentação gerada do zero');
            }

            // 4. Limpeza de arquivos temporários
            await this.cleanup(imagePath);

            Logger.success('Processo concluído com sucesso!');
            Logger.file('Arquivo final', outputPath);

            return {
                success: true,
                outputPath,
                userData: {
                    nome: userData.nome,
                    id: userData.id
                }
            };

        } catch (error) {
            Logger.error('Erro durante o processo', error);
            
            // Limpeza em caso de erro
            await this.cleanup(imagePath);
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Gera apresentação usando apenas template
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
     * Gera apresentação do zero
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
            const userData = await DataService.fetchUserData();
            DataService.validateUserData(userData);
            Logger.info('Dados validados com sucesso');
            return { valid: true, userData };
        } catch (error) {
            Logger.error('Erro na validação', error);
            return { valid: false, error: error.message };
        }
    }

    /**
     * Limpeza de arquivos temporários
     */
    static async cleanup(imagePath) {
        try {
            if (imagePath) {
                FileHelper.deleteFile(imagePath);
            }
            ImageService.cleanupTempImages();
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

            return stats;
        } catch (error) {
            Logger.error('Erro ao obter estatísticas', error);
            return null;
        }
    }
}

module.exports = PresentationController;