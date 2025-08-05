const PptxGenJs = require('pptxgenjs');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const xml2js = require('xml2js');

// Configurações
const CONFIG = {
    // Caminho para o arquivo JSON local (substitua pela URL da API quando necessário)
    API_URL: './exemplo-api.json',
    
    // Caminhos dos arquivos
    TEMPLATE_PATH: './template-sydle.pptx',
    OUTPUT_DIR: './output',
    
    // Placeholders que serão substituídos no template
    PLACEHOLDERS: {
        NOME: '{{NOME}}',
        DATA_NASCIMENTO: '{{DATA_NASCIMENTO}}',
        // Para imagens, você deve nomear a imagem no template como "user-image" ou similar
        IMAGE_NAME: 'user-image'
    }
};

class PPTXTemplateAutomation {
    constructor() {
        this.ensureOutputDir();
    }

    // Garante que o diretório de output existe
    ensureOutputDir() {
        if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
            fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
        }
    }

    // Busca dados do usuário da API ou arquivo JSON local
    async fetchUserData() {
        try {
            console.log('🔄 Buscando dados...');
            
            let data;
            
            // Verifica se é um arquivo local ou URL da API
            if (CONFIG.API_URL.startsWith('http')) {
                // Requisição HTTP para API
                const response = await axios.get(CONFIG.API_URL);
                data = response.data;
            } else {
                // Lê arquivo JSON local
                const jsonPath = path.resolve(CONFIG.API_URL);
                console.log(`📁 Lendo arquivo: ${jsonPath}`);
                
                if (!fs.existsSync(jsonPath)) {
                    throw new Error(`Arquivo não encontrado: ${jsonPath}`);
                }
                
                const jsonContent = fs.readFileSync(jsonPath, 'utf8');
                data = JSON.parse(jsonContent);
            }
            
            // Mapeia os dados conforme a estrutura do seu JSON
            const userData = {
                nome: data.nome || data.name || 'Nome não encontrado',
                dataNascimento: data.data_nascimento || '',
                // Usa a imagem do JSON ou um placeholder
                imagemUrl: data.imagem || `https://picsum.photos/400/300?random=${data.id || 1}`
            };

            console.log('✅ Dados obtidos:', userData);
            return userData;
        } catch (error) {
            console.error('❌ Erro ao buscar dados:', error.message);
            throw error;
        }
    }

    // Baixa imagem da URL
    async downloadImage(imageUrl, fileName) {
        try {
            console.log('🔄 Baixando imagem...');
            const response = await axios({
                method: 'GET',
                url: imageUrl,
                responseType: 'arraybuffer'
            });

            const imagePath = path.join(CONFIG.OUTPUT_DIR, fileName);
            fs.writeFileSync(imagePath, response.data);
            
            console.log('✅ Imagem baixada com sucesso');
            return imagePath;
        } catch (error) {
            console.error('❌ Erro ao baixar imagem:', error.message);
            throw error;
        }
    }

    // Verifica se o template existe
    checkTemplate() {
        if (!fs.existsSync(CONFIG.TEMPLATE_PATH)) {
            throw new Error(`Template não encontrado: ${CONFIG.TEMPLATE_PATH}\n
📋 Para usar esta funcionalidade:
1. Coloque seu arquivo template.pptx na pasta do projeto
2. No PowerPoint, use os seguintes placeholders em caixas de texto:
   - {{NOME}} - será substituído pelo nome
   - {{DATA_NASCIMENTO}} - será substituído pela data de nascimento
3. Para imagens, insira qualquer imagem que será substituída automaticamente`);
        }
        console.log('✅ Template encontrado');
    }

    // Substitui texto nos arquivos XML do PowerPoint
    replaceTextInXML(xmlContent, userData) {
        let updatedXml = xmlContent;
        
        // Substitui apenas nome e data de nascimento
        updatedXml = updatedXml.replace(new RegExp(CONFIG.PLACEHOLDERS.NOME, 'g'), userData.nome);
        updatedXml = updatedXml.replace(new RegExp(CONFIG.PLACEHOLDERS.DATA_NASCIMENTO, 'g'), userData.dataNascimento);

        return updatedXml;
    }

    // Modifica o template com os dados do usuário
    async modifyTemplate(userData) {
        try {
            console.log('🔄 Modificando template...');

            // Verifica se template existe
            this.checkTemplate();

            // Baixa a imagem
            const imagePath = await this.downloadImage(userData.imagemUrl, 'new-user-image.jpg');
            const imageBuffer = fs.readFileSync(imagePath);

            // Lê o template como ZIP
            const templateBuffer = fs.readFileSync(CONFIG.TEMPLATE_PATH);
            const zip = await JSZip.loadAsync(templateBuffer);

            // Processa todos os slides
            const slideFiles = Object.keys(zip.files).filter(name => 
                name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
            );

            console.log(`🔄 Processando ${slideFiles.length} slide(s)...`);

            for (const slideFile of slideFiles) {
                const slideXml = await zip.files[slideFile].async('text');
                const updatedSlideXml = this.replaceTextInXML(slideXml, userData);
                zip.file(slideFile, updatedSlideXml);
            }

            // Substitui a imagem se existir
            const mediaFiles = Object.keys(zip.files).filter(name => 
                name.startsWith('ppt/media/') && 
                (name.includes('image') || name.includes('user'))
            );

            if (mediaFiles.length > 0) {
                console.log('🔄 Substituindo imagem...');
                // Substitui a primeira imagem encontrada
                zip.file(mediaFiles[0], imageBuffer);
            } else {
                console.log('⚠️  Nenhuma imagem encontrada no template para substituir');
            }

            // Gera o arquivo modificado
            const outputFileName = `apresentacao_${userData.nome.replace(/\s+/g, '_')}_${Date.now()}.pptx`;
            const outputPath = path.join(CONFIG.OUTPUT_DIR, outputFileName);

            const modifiedBuffer = await zip.generateAsync({ type: 'nodebuffer' });
            fs.writeFileSync(outputPath, modifiedBuffer);

            console.log('✅ Template modificado com sucesso!');
            console.log(`📁 Arquivo salvo em: ${outputPath}`);

            // Limpa arquivo temporário da imagem
            fs.unlinkSync(imagePath);

            return outputPath;
        } catch (error) {
            console.error('❌ Erro ao modificar template:', error.message);
            throw error;
        }
    }

    // Método alternativo usando PptxGenJs (caso o método acima não funcione)
    async createFromTemplate(userData) {
        try {
            console.log('🔄 Criando apresentação baseada em template...');

            // Baixa a imagem
            const imagePath = await this.downloadImage(userData.imagemUrl, 'user-image.jpg');

            // Cria nova apresentação
            const pptx = new PptxGenJs();
            pptx.author = 'Sistema Automatizado';
            pptx.title = `Apresentação - ${userData.nome}`;

            // Adiciona slide com design personalizado
            const slide = pptx.addSlide();

            // Background
            slide.background = { color: 'F5F5F5' };

            // Título principal
            slide.addText(userData.nome, {
                x: 0.5, y: 0.5, w: 9, h: 1,
                fontSize: 32,
                fontFace: 'Arial',
                color: '2E4057',
                bold: true,
                align: 'center'
            });

            // Data de nascimento
            slide.addText(`🎂 ${userData.dataNascimento}`, {
                x: 0.5, y: 1.5, w: 9, h: 0.6,
                fontSize: 18,
                fontFace: 'Arial',
                color: '546E7A',
                align: 'center'
            });

            // Imagem
            slide.addImage({
                path: imagePath,
                x: 3, y: 2.5, w: 4, h: 4,
                rounding: true
            });

            // Gera o arquivo
            const outputFileName = `apresentacao_${userData.nome.replace(/\s+/g, '_')}_${Date.now()}.pptx`;
            const outputPath = path.join(CONFIG.OUTPUT_DIR, outputFileName);

            await pptx.writeFile({ fileName: outputPath });
            
            console.log('✅ Apresentação criada com sucesso!');
            console.log(`📁 Arquivo salvo em: ${outputPath}`);

            // Limpa arquivo temporário da imagem
            fs.unlinkSync(imagePath);

            return outputPath;
        } catch (error) {
            console.error('❌ Erro ao criar apresentação:', error.message);
            throw error;
        }
    }

    // Método principal que executa todo o processo
    async run() {
        try {
            console.log('🚀 Iniciando automação do PowerPoint com Template...\n');

            // 1. Busca dados da API
            const userData = await this.fetchUserData();

            let outputPath;

            // 2. Tenta modificar template existente primeiro
            try {
                outputPath = await this.modifyTemplate(userData);
            } catch (templateError) {
                console.log('⚠️  Não foi possível usar template, criando nova apresentação...');
                console.log(`Erro do template: ${templateError.message}\n`);
                
                // Fallback: cria nova apresentação
                outputPath = await this.createFromTemplate(userData);
            }

            console.log('\n🎉 Processo concluído com sucesso!');
            console.log(`📄 Arquivo criado: ${outputPath}`);

        } catch (error) {
            console.error('\n💥 Erro durante o processo:', error.message);
            process.exit(1);
        }
    }
}

// Execução da aplicação
if (require.main === module) {
    const app = new PPTXTemplateAutomation();
    app.run();
}

module.exports = PPTXTemplateAutomation;