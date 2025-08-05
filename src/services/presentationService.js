const PptxGenJs = require('pptxgenjs');
const path = require('path');
const CONFIG = require('../config/config');
const FileHelper = require('../utils/fileHelper');
const Logger = require('../utils/logger');

class PresentationService {
    /**
     * Cria uma nova apresentação do zero
     */
    static async createFromScratch(userData, imagePath) {
        try {
            Logger.loading('Criando apresentação do zero...');

            // Inicializa o PptxGenJs
            const pptx = new PptxGenJs();
            
            // Configura propriedades da apresentação
            this.setupPresentation(pptx, userData);

            // Adiciona slides
            this.addTitleSlide(pptx, userData, imagePath);
            
            // Adiciona mais slides se necessário
            // this.addContentSlides(pptx, userData);

            // Gera o arquivo
            const outputPath = await this.savePresentation(pptx, userData);
            
            Logger.info('Apresentação criada com sucesso!');
            return outputPath;
        } catch (error) {
            Logger.error('Erro ao criar apresentação', error);
            throw error;
        }
    }

    /**
     * Configura propriedades básicas da apresentação
     */
    static setupPresentation(pptx, userData) {
        pptx.author = CONFIG.PPTX.AUTHOR;
        pptx.title = `Apresentação - ${userData.nome}`;
        pptx.subject = 'Apresentação automatizada';
        pptx.company = 'Sistema Automatizado';
    }

    /**
     * Adiciona slide de título
     */
    static addTitleSlide(pptx, userData, imagePath) {
        const slide = pptx.addSlide();

        // Background
        slide.background = { color: 'F5F5F5' };

        // Título principal
        slide.addText(userData.nome, {
            x: 0.5, 
            y: 0.5, 
            w: 9, 
            h: 1,
            fontSize: 32,
            fontFace: CONFIG.PPTX.DEFAULT_FONT,
            color: '2E4057',
            bold: true,
            align: 'center'
        });

        // Data de nascimento (se disponível)
        if (userData.dataNascimento) {
            slide.addText(`🎂 Data de Nascimento: ${userData.dataNascimento}`, {
                x: 0.5, 
                y: 1.5, 
                w: 9, 
                h: 0.6,
                fontSize: 18,
                fontFace: CONFIG.PPTX.DEFAULT_FONT,
                color: '546E7A',
                align: 'center'
            });
        }

        // Imagem (se disponível)
        if (imagePath && FileHelper.fileExists(imagePath)) {
            slide.addImage({
                path: imagePath,
                x: 3, 
                y: 2.5, 
                w: 4, 
                h: 4,
                rounding: true
            });
        }

        // Rodapé com informações do sistema
        slide.addText('Gerado automaticamente pelo Sistema', {
            x: 0.5, 
            y: 6.5, 
            w: 9, 
            h: 0.5,
            fontSize: 12,
            fontFace: CONFIG.PPTX.DEFAULT_FONT,
            color: '999999',
            align: 'center',
            italic: true
        });
    }

    /**
     * Adiciona slides de conteúdo (exemplo extensível)
     */
    static addContentSlides(pptx, userData) {
        // Slide de informações adicionais
        const infoSlide = pptx.addSlide();
        
        infoSlide.addText('Informações Adicionais', {
            x: 0.5, 
            y: 0.5, 
            w: 9, 
            h: 1,
            fontSize: 28,
            fontFace: CONFIG.PPTX.DEFAULT_FONT,
            color: '2E4057',
            bold: true,
            align: 'center'
        });

        // Adicione mais conteúdo conforme necessário
        infoSlide.addText(`ID: ${userData.id || 'N/A'}`, {
            x: 1, 
            y: 2, 
            w: 8, 
            h: 0.5,
            fontSize: 16,
            fontFace: CONFIG.PPTX.DEFAULT_FONT,
            color: '333333'
        });
    }

    /**
     * Salva a apresentação
     */
    static async savePresentation(pptx, userData) {
        // Garante que o diretório de saída existe
        FileHelper.ensureDirectory(CONFIG.PATHS.OUTPUT_DIR);

        // Gera nome do arquivo
        const outputFileName = FileHelper.generateFileName(
            `apresentacao_${userData.nome}`, 
            'pptx'
        );
        const outputPath = path.join(CONFIG.PATHS.OUTPUT_DIR, outputFileName);

        // Salva o arquivo
        await pptx.writeFile({ fileName: outputPath });
        
        Logger.file('Apresentação salva', outputPath);
        return outputPath;
    }

    /**
     * Cria apresentação com layout customizado
     */
    static async createCustomLayout(userData, imagePath, layoutType = 'default') {
        try {
            const pptx = new PptxGenJs();
            this.setupPresentation(pptx, userData);

            switch (layoutType) {
                case 'modern':
                    this.addModernSlide(pptx, userData, imagePath);
                    break;
                case 'minimal':
                    this.addMinimalSlide(pptx, userData, imagePath);
                    break;
                default:
                    this.addTitleSlide(pptx, userData, imagePath);
            }

            return await this.savePresentation(pptx, userData);
        } catch (error) {
            Logger.error('Erro ao criar layout customizado', error);
            throw error;
        }
    }

    /**
     * Layout moderno
     */
    static addModernSlide(pptx, userData, imagePath) {
        const slide = pptx.addSlide();
        
        // Background gradient
        slide.background = { 
            type: 'gradient',
            colors: ['4A90E2', '7B68EE']
        };

        // Título com estilo moderno
        slide.addText(userData.nome, {
            x: 0.5, y: 1, w: 9, h: 1.2,
            fontSize: 36,
            fontFace: 'Calibri',
            color: 'FFFFFF',
            bold: true,
            align: 'center',
            shadow: { type: 'outer', blur: 3, offset: 2, angle: 45, color: '000000', opacity: 0.3 }
        });
    }

    /**
     * Layout minimalista
     */
    static addMinimalSlide(pptx, userData, imagePath) {
        const slide = pptx.addSlide();
        
        // Background branco limpo
        slide.background = { color: 'FFFFFF' };

        // Título minimalista
        slide.addText(userData.nome, {
            x: 1, y: 2, w: 8, h: 1,
            fontSize: 28,
            fontFace: 'Helvetica',
            color: '333333',
            align: 'left'
        });

        // Linha decorativa
        slide.addShape(pptx.ShapeType.line, {
            x: 1, y: 3.2, w: 3, h: 0,
            line: { color: '333333', width: 2 }
        });
    }
}

module.exports = PresentationService;