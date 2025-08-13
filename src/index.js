const express = require('express');
const path = require('path');
const PresentationController = require('./controllers/presentationController');
const Logger = require('./utils/logger');

class Application {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.isProcessing = false;
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        // Servir arquivos estáticos (CSS, JS, imagens)
        this.app.use(express.static(path.join(__dirname, 'public')));
        
        // Parser para JSON
        this.app.use(express.json());
        
        // Logs das requisições
        this.app.use((req, res, next) => {
            Logger.info(`${req.method} ${req.url}`);
            next();
        });
    }

    setupRoutes() {
        // Rota principal - serve o index.html
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });

        // Rota para buscar dados (usada pelo frontend)
        this.app.get('/fetch-data', async (req, res) => {
            try {
                Logger.info('Buscando dados para o frontend...');
                const data = await require('./services/dataService').fetchData();
                res.json(data);
            } catch (error) {
                Logger.error('Erro ao buscar dados para frontend', error);
                res.status(500).json({ 
                    error: 'Erro ao buscar dados',
                    message: error.message 
                });
            }
        });

        // Rota para gerar apresentações manualmente
        this.app.post('/generate-presentations', async (req, res) => {
            if (this.isProcessing) {
                return res.status(429).json({ 
                    error: 'Processamento já em andamento',
                    message: 'Aguarde o processo atual terminar'
                });
            }

            try {
                this.isProcessing = true;
                Logger.info('Iniciando geração de apresentações via API...');
                
                const options = req.body || {};
                const result = await PresentationController.generateAllPresentations(options);
                
                res.json({
                    success: true,
                    message: 'Apresentações geradas com sucesso',
                    result
                });
                
            } catch (error) {
                Logger.error('Erro na geração via API', error);
                res.status(500).json({ 
                    error: 'Erro ao gerar apresentações',
                    message: error.message 
                });
            } finally {
                this.isProcessing = false;
            }
        });

        // Rota para obter status do sistema
        this.app.get('/status', async (req, res) => {
            try {
                const stats = await PresentationController.getStats();
                res.json({
                    server: 'online',
                    processing: this.isProcessing,
                    stats
                });
            } catch (error) {
                res.status(500).json({ 
                    server: 'online',
                    processing: this.isProcessing,
                    error: error.message 
                });
            }
        });

        // Rota para validar dados
        this.app.get('/validate', async (req, res) => {
            try {
                const validation = await PresentationController.validateData();
                res.json(validation);
            } catch (error) {
                res.status(500).json({ 
                    valid: false, 
                    error: error.message 
                });
            }
        });

        // Middleware para rotas não encontradas
        this.app.use((req, res) => {
            res.status(404).json({ 
                error: 'Rota não encontrada',
                message: `A rota ${req.method} ${req.url} não existe`
            });
        });

        // Middleware para tratamento de erros
        this.app.use((error, req, res, next) => {
            Logger.error('Erro não tratado', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                message: error.message 
            });
        });
    }

    // Executa o processamento automático em background
    async runAutomaticProcessing() {
        if (this.isProcessing) {
            Logger.warning('Processamento automático pulado - já em execução');
            return;
        }

        try {
            this.isProcessing = true;
            Logger.start('🚀 AUTOMAÇÃO POWERPOINT - SISTEMA INICIADO');
            Logger.info('==================================================');

            // Validações iniciais
            const stats = await PresentationController.getStats();
            
            if (stats.templateExists) {
                Logger.success('✅ Template encontrado e validado');
            }
            
            if (stats.templatePlaceholders) {
                Logger.success(`✅ Placeholders encontrados no template [ ${stats.templatePlaceholders.map(p => `'${p}'`).join(', ')} ]`);
            }

            Logger.success('✅ 📊 Status do Sistema:');
            Logger.info(`   Template: ${stats.templateExists ? '✅' : '❌'}`);
            Logger.info(`   Dados: ${stats.dataSourceExists ? '✅' : '❌'}`);
            Logger.info(`   Output Dir: ${stats.outputDirExists ? '✅' : '❌'}`);
            Logger.info(`   Layouts: ${stats.availableLayouts?.join(', ') || 'N/A'}`);
            Logger.info(`   Placeholders: ${stats.templatePlaceholders?.join(', ') || 'N/A'}`);
            Logger.info('==================================================');

            // Executar processamento principal
            const result = await PresentationController.generateAllPresentations();

            if (result.success) {
                Logger.success('==================================================');
                Logger.success(`✅ 🎉 PROCESSO CONCLUÍDO COM SUCESSO! ${result.successCount}/${result.totalProcessed} apresentações geradas`);
                Logger.success('==================================================');
            } else {
                throw new Error(result.error);
            }

            return result;

        } catch (error) {
            Logger.error('==================================================');
            Logger.error(`❌ 💥 FALHA NO PROCESSO ${error.message}`);
            Logger.error('==================================================');
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    // Inicia o servidor
    async start() {
        try {
            // Criar diretório public se não existir
            this.ensurePublicDirectory();

            // Iniciar servidor web
            this.server = this.app.listen(this.port, () => {
                Logger.success('==================================================');
                Logger.success('🌐 SERVIDOR WEB INICIADO');
                Logger.success('==================================================');
                Logger.info(`📍 Interface web disponível em: http://localhost:${this.port}`);
                Logger.info(`📊 API endpoints:`);
                Logger.info(`   GET  /              - Interface web`);
                Logger.info(`   GET  /fetch-data    - Buscar dados`);
                Logger.info(`   POST /generate-presentations - Gerar apresentações`);
                Logger.info(`   GET  /status        - Status do sistema`);
                Logger.info(`   GET  /validate      - Validar dados`);
                Logger.success('==================================================');
            });

            // Executar processamento automático após iniciar o servidor
            setTimeout(async () => {
                try {
                    await this.runAutomaticProcessing();
                } catch (error) {
                    Logger.error('Erro no processamento automático inicial', error);
                }
            }, 2000); // Aguarda 2 segundos para o servidor estar totalmente pronto

            // Configurar processamento periódico (opcional)
            this.setupPeriodicProcessing();

        } catch (error) {
            Logger.error('Erro ao iniciar servidor', error);
            process.exit(1);
        }
    }

    // Configura processamento periódico (executar a cada X tempo)
    setupPeriodicProcessing() {
        const intervalMinutes = process.env.PROCESS_INTERVAL_MINUTES || 60; // Default: 1 hora
        
        setInterval(async () => {
            Logger.info('🔄 Executando processamento periódico...');
            try {
                await this.runAutomaticProcessing();
            } catch (error) {
                Logger.error('Erro no processamento periódico', error);
            }
        }, intervalMinutes * 60 * 1000);

        Logger.info(`⏰ Processamento periódico configurado para ${intervalMinutes} minutos`);
    }

    // Garante que o diretório public existe
    ensurePublicDirectory() {
        const fs = require('fs');
        const publicDir = path.join(__dirname, 'public');
        
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
            Logger.info('📁 Diretório public criado');
        }

        // Copia o index.html se ele estiver na raiz
        const indexHtmlSource = path.join(__dirname, 'index.html');
        const indexHtmlTarget = path.join(publicDir, 'index.html');
        
        if (fs.existsSync(indexHtmlSource) && !fs.existsSync(indexHtmlTarget)) {
            fs.copyFileSync(indexHtmlSource, indexHtmlTarget);
            Logger.info('📄 index.html copiado para public/');
        }
    }

    // Para o servidor graciosamente
    async stop() {
        if (this.server) {
            Logger.info('🔄 Parando servidor...');
            this.server.close(() => {
                Logger.success('✅ Servidor parado com sucesso');
            });
        }
    }
}

// Função principal
async function main() {
    const app = new Application();
    
    // Tratamento de sinais para parada graciosa
    process.on('SIGINT', async () => {
        Logger.info('📡 Recebido SIGINT, parando aplicação...');
        await app.stop();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        Logger.info('📡 Recebido SIGTERM, parando aplicação...');
        await app.stop();
        process.exit(0);
    });

    // Tratamento de erros não capturados
    process.on('uncaughtException', (error) => {
        Logger.error('💥 Erro não capturado', error);
        process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
        Logger.error('💥 Promise rejeitada não tratada', reason);
        process.exit(1);
    });

    // Iniciar aplicação
    await app.start();
}

// Executar se for o arquivo principal
if (require.main === module) {
    main().catch(error => {
        Logger.error('💥 Erro fatal na inicialização', error);
        process.exit(1);
    });
}

module.exports = Application;