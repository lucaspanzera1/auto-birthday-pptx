const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const CONFIG = require('../config/config');
const FileHelper = require('../utils/fileHelper');
const Logger = require('../utils/logger');

class TemplateService {
    /**
     * Verifica se o template existe
     */
    static validateTemplate() {
        if (!FileHelper.fileExists(CONFIG.PATHS.TEMPLATE)) {
            throw new Error(`Template não encontrado: ${CONFIG.PATHS.TEMPLATE}\n
📋 Para usar esta funcionalidade:
1. Coloque seu arquivo template.pptx na pasta do projeto
2. No PowerPoint, use os seguintes placeholders em caixas de texto:
   - {{NOME}} - será substituído pelo nome
   - {{DATA_NASCIMENTO}} - será substituído pela data de nascimento
3. Para imagens, insira qualquer imagem que será substituída automaticamente`);
        }
        Logger.info('Template encontrado e validado');
        return true;
    }

    /**
     * Substitui placeholders de texto no XML
     */
    static replaceTextInXML(xmlContent, userData) {
        let updatedXml = xmlContent;
        
        // Substitui os placeholders
        updatedXml = updatedXml.replace(
            new RegExp(CONFIG.PLACEHOLDERS.NOME, 'g'), 
            userData.nome
        );
        
        updatedXml = updatedXml.replace(
            new RegExp(CONFIG.PLACEHOLDERS.DATA_NASCIMENTO, 'g'), 
            userData.dataNascimento
        );

        return updatedXml;
    }

    /**
     * Modifica o template com os dados do usuário
     */
    static async modifyTemplate(userData, imagePath) {
        try {
            Logger.loading('Modificando template...');

            // Valida o template
            this.validateTemplate();

            // Lê o template como ZIP
            const templateBuffer = fs.readFileSync(CONFIG.PATHS.TEMPLATE);
            const zip = await JSZip.loadAsync(templateBuffer);

            // Processa slides
            await this.processSlides(zip, userData);

            // Substitui imagem se necessário
            if (imagePath) {
                await this.replaceImage(zip, imagePath);
            }

            // Gera arquivo final
            const outputPath = await this.generateOutputFile(zip, userData);

            Logger.info('Template modificado com sucesso!');
            return outputPath;
        } catch (error) {
            Logger.error('Erro ao modificar template', error);
            throw error;
        }
    }

    /**
     * Processa todos os slides do template
     */
    static async processSlides(zip, userData) {
        const slideFiles = Object.keys(zip.files).filter(name => 
            name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
        );

        Logger.loading(`Processando ${slideFiles.length} slide(s)...`);

        for (const slideFile of slideFiles) {
            const slideXml = await zip.files[slideFile].async('text');
            const updatedSlideXml = this.replaceTextInXML(slideXml, userData);
            zip.file(slideFile, updatedSlideXml);
        }
    }

    /**
     * Substitui imagem no template
     */
    static async replaceImage(zip, imagePath) {
        try {
            const imageBuffer = fs.readFileSync(imagePath);
            
            // Procura arquivos de mídia
            const mediaFiles = Object.keys(zip.files).filter(name => 
                name.startsWith('ppt/media/') && 
                (name.includes('image') || name.includes('user'))
            );

            if (mediaFiles.length > 0) {
                Logger.loading('Substituindo imagem...');
                // Substitui a primeira imagem encontrada
                zip.file(mediaFiles[0], imageBuffer);
            } else {
                Logger.warning('Nenhuma imagem encontrada no template para substituir');
            }
        } catch (error) {
            Logger.warning('Erro ao substituir imagem no template');
        }
    }

    /**
     * Gera o arquivo final modificado
     */
    static async generateOutputFile(zip, userData) {
        // Garante que o diretório de saída existe
        FileHelper.ensureDirectory(CONFIG.PATHS.OUTPUT_DIR);

        // Gera nome do arquivo
        const outputFileName = FileHelper.generateFileName(
            `apresentacao_${userData.nome}`, 
            'pptx'
        );
        const outputPath = path.join(CONFIG.PATHS.OUTPUT_DIR, outputFileName);

        // Gera o buffer do arquivo modificado
        const modifiedBuffer = await zip.generateAsync({ type: 'nodebuffer' });
        
        // Salva o arquivo
        FileHelper.writeFile(outputPath, modifiedBuffer);

        return outputPath;
    }

    /**
     * Lista todos os placeholders encontrados no template
     */
    static async findPlaceholders() {
        try {
            this.validateTemplate();
            
            const templateBuffer = fs.readFileSync(CONFIG.PATHS.TEMPLATE);
            const zip = await JSZip.loadAsync(templateBuffer);
            
            const slideFiles = Object.keys(zip.files).filter(name => 
                name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
            );

            const placeholders = new Set();
            const placeholderRegex = /\{\{([^}]+)\}\}/g;

            for (const slideFile of slideFiles) {
                const slideXml = await zip.files[slideFile].async('text');
                let match;
                while ((match = placeholderRegex.exec(slideXml)) !== null) {
                    placeholders.add(match[1]);
                }
            }

            return Array.from(placeholders);
        } catch (error) {
            Logger.error('Erro ao buscar placeholders', error);
            return [];
        }
    }
}

module.exports = TemplateService;