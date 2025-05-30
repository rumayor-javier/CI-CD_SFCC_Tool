// config.js

require('dotenv').config();

module.exports = {
    // --- Configuración General ---
    // URL completa del repositorio Git.
    // Ejemplos:
    // - GitHub:   'https://github.com/tu_usuario_o_organizacion/nombre_del_repositorio.git'
    // - Bitbucket: 'https://bitbucket.org/tu_workspace/nombre_del_repositorio.git'
    // - Bitbucket (con usuario en URL para autenticación): 'https://tu_usuario@bitbucket.org/tu_workspace/nombre_del_repositorio.git'
    repoUrl: 'https://tu_usuario@bitbucket.org/tu_workspace/nombre_del_repositorio.git', // ¡Asegúrate de configurar esta URL!
    targetFolderInRepo: 'cartridges', // Esta es la carpeta DENTRO del repositorio que quieres extraer
    cloneDir: './temp_repo_clone', // Directorio temporal para clonar

    // --- Credenciales ---
    github: {
        username: process.env.GITHUB_USERNAME,
        pat: process.env.GITHUB_PAT
    },
    bitbucket: {
        appPassword: process.env.BITBUCKET_APP_PASSWORD
    }
};