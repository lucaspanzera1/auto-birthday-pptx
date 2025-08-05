const path = require('path');

const CONFIG = {
    // API Configuration
    API: {
        URL: './exemplo-api.json', // Muda para URL da API quando necessário
        TIMEOUT: 5000
    },

    // File Paths
    PATHS: {
        TEMPLATE: './template.pptx',
        OUTPUT_DIR: './output',
        TEMP_DIR: './temp'
    },

    // Template Placeholders
    PLACEHOLDERS: {
        NOME: '{{NOME}}',
        DATA_NASCIMENTO: '{{DATA_NASCIMENTO}}',
        IMAGE_NAME: 'user-image'
    },

    // Image Settings
    IMAGE: {
        DEFAULT_WIDTH: 400,
        DEFAULT_HEIGHT: 300,
        QUALITY: 0.8,
        FORMATS: ['jpg', 'jpeg', 'png']
    },

    // PowerPoint Settings
    PPTX: {
        AUTHOR: 'Sistema Automatizado',
        DEFAULT_FONT: 'Arial',
        SLIDE_SIZE: { width: 10, height: 7.5 }
    }
};

module.exports = CONFIG;