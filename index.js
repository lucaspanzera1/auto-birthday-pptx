const PptxGenJs = require('pptxgenjs');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configurações
const CONFIG = {
    // Caminho para o arquivo JSON local (substitua pela URL da API quando necessário)
    API_URL: './exemplo-api.json',
    
    // Caminhos dos arquivos
    TEMPLATE_PATH: './template.pptx',
    OUTPUT_DIR: './output',
    
    // Configurações do slide
    SLIDE_CONFIG: {
        titlePosition: { x: 1, y: 1, w: 8, h: 1 },
        imagePosition: { x: 2, y: 2.5, w: 4, h: 3 }
    }
};

class PPTXAutomation {
    constructor() {
        this.pptx = new PptxGenJs();
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
                email: data.email || '',
                dataNascimento: data.data_nascimento || '',
                cargo: data.cargo || '',
                empresa: data.empresa || '',
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
                responseType: 'stream'
            });

            const imagePath = path.join(CONFIG.OUTPUT_DIR, fileName);
            const writer = fs.createWriteStream(imagePath);
            
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    console.log('✅ Imagem baixada com sucesso');
                    resolve(imagePath);
                });
                writer.on('error', reject);
            });
        } catch (error) {
            console.error('❌ Erro ao baixar imagem:', error.message);
            throw error;
        }
    }

    // Cria o PowerPoint com os dados do usuário
    async createPresentation(userData) {
        try {
            console.log('🔄 Criando apresentação...');

            // Baixa a imagem
            const imagePath = await this.downloadImage(userData.imagemUrl, 'user-image.jpg');

            // Configura a apresentação
            this.pptx.author = 'Sistema Automatizado';
            this.pptx.company = 'Sua Empresa';
            this.pptx.title = `Apresentação - ${userData.nome}`;

            // Adiciona um slide
            const slide = this.pptx.addSlide();

            // Adiciona título
            slide.addText(userData.nome, {
                x: CONFIG.SLIDE_CONFIG.titlePosition.x,
                y: CONFIG.SLIDE_CONFIG.titlePosition.y,
                w: CONFIG.SLIDE_CONFIG.titlePosition.w,
                h: CONFIG.SLIDE_CONFIG.titlePosition.h,
                fontSize: 28,
                fontFace: 'Arial',
                color: '363636',
                bold: true,
                align: 'center'
            });

            // Adiciona subtítulo com informações adicionais
            let subtitleText = '';
            if (userData.cargo && userData.empresa) {
                subtitleText = `${userData.cargo} - ${userData.empresa}`;
            } else if (userData.email) {
                subtitleText = userData.email;
            } else if (userData.dataNascimento) {
                subtitleText = `Nascimento: ${userData.dataNascimento}`;
            }

            if (subtitleText) {
                slide.addText(subtitleText, {
                    x: 1,
                    y: 1.5,
                    w: 8,
                    h: 0.5,
                    fontSize: 16,
                    fontFace: 'Arial',
                    color: '666666',
                    align: 'center'
                });
            }

            // Adiciona imagem
            slide.addImage({
                path: imagePath,
                x: CONFIG.SLIDE_CONFIG.imagePosition.x,
                y: CONFIG.SLIDE_CONFIG.imagePosition.y,
                w: CONFIG.SLIDE_CONFIG.imagePosition.w,
                h: CONFIG.SLIDE_CONFIG.imagePosition.h
            });

            // Gera o arquivo
            const outputFileName = `apresentacao_${userData.nome.replace(/\s+/g, '_')}_${Date.now()}.pptx`;
            const outputPath = path.join(CONFIG.OUTPUT_DIR, outputFileName);

            await this.pptx.writeFile({ fileName: outputPath });
            
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
            console.log('🚀 Iniciando automação do PowerPoint...\n');

            // 1. Busca dados da API
            const userData = await this.fetchUserData();

            // 2. Cria a apresentação
            const outputPath = await this.createPresentation(userData);

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
    const app = new PPTXAutomation();
    app.run();
}

module.exports = PPTXAutomation;