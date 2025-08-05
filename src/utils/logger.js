class Logger {
    static info(message, data = null) {
        console.log(`✅ ${message}`, data ? data : '');
    }

    static loading(message) {
        console.log(`🔄 ${message}`);
    }

    static success(message, data = null) {
        console.log(`🎉 ${message}`, data ? data : '');
    }

    static warning(message) {
        console.log(`⚠️  ${message}`);
    }

    static error(message, error = null) {
        console.error(`❌ ${message}`, error ? error.message : '');
    }

    static file(message, path) {
        console.log(`📁 ${message}: ${path}`);
    }

    static start(message) {
        console.log(`🚀 ${message}\n`);
    }

    static separator() {
        console.log('\n' + '='.repeat(50) + '\n');
    }
}

module.exports = Logger;