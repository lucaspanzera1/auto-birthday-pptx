const PresentationController = require('./controllers/presentationController');
const Logger = require('./utils/logger');

/**
 * Função principal da aplicação
 */
async function main() {
    try {
        // Opções de configuração (pode ser expandido)
        const options = {
            layout: process.argv[2] || 'default' // Permite passar layout via linha de comando
        };

        Logger.separator();
        Logger.start('AUTOMAÇÃO POWERPOINT - SISTEMA INICIADO');
        Logger.separator();

        // Mostra estatísticas do sistema
        const stats = await PresentationController.getStats();
        if (stats) {
            Logger.info('📊 Status do Sistema:');
            console.log(`   Template: ${stats.templateExists ? '✅' : '❌'}`);
            console.log(`   Dados: ${stats.dataSourceExists ? '✅' : '❌'}`);
            console.log(`   Output Dir: ${stats.outputDirExists ? '✅' : '❌'}`);
            console.log(`   Layouts: ${stats.availableLayouts.join(', ')}`);
            
            if (stats.templatePlaceholders && stats.templatePlaceholders.length > 0) {
                console.log(`   Placeholders: ${stats.templatePlaceholders.join(', ')}`);
            }
            Logger.separator();
        }

        // Executa a geração da apresentação
        const result = await PresentationController.generatePresentation(options);

        if (result.success) {
            Logger.separator();
            Logger.success('🎉 PROCESSO CONCLUÍDO COM SUCESSO!');
            Logger.file('📄 Arquivo gerado', result.outputPath);
            Logger.info('👤 Usuário', result.userData.nome);
            Logger.separator();
        } else {
            Logger.separator();
            Logger.error('💥 FALHA NO PROCESSO', { message: result.error });
            Logger.separator();
            process.exit(1);
        }

    } catch (error) {
        Logger.separator();
        Logger.error('💥 ERRO CRÍTICO NA APLICAÇÃO', error);
        Logger.separator();
        process.exit(1);
    }
}

/**
 * Função para uso programático (quando importado como módulo)
 */
async function generatePresentation(options = {}) {
    return await PresentationController.generatePresentation(options);
}

/**
 * Função para gerar apenas do template
 */
async function generateFromTemplate(userData = null) {
    return await PresentationController.generateFromTemplate(userData);
}

/**
 * Função para gerar do zero
 */
async function generateFromScratch(userData = null, layout = 'default') {
    return await PresentationController.generateFromScratch(userData, layout);
}

// Executa apenas se for chamado diretamente
if (require.main === module) {
    main().catch(error => {
        Logger.error('Erro não tratado', error);
        process.exit(1);
    });
}

// Exporta funções para uso como módulo
module.exports = {
    generatePresentation,
    generateFromTemplate,
    generateFromScratch,
    PresentationController
};