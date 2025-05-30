const { exec } = require('child_process');
const fs = require('fs-extra');
const AdmZip = require('adm-zip');
const readlineSync = require('readline-sync');

const config = require('./config');

// --- Función para el indicador de carga ---
let loadingInterval;
let loadingDots = 0;

function startLoadingIndicator() {
    process.stdout.write('   Clonando repositorio. Por favor, espera.');
    loadingInterval = setInterval(() => {
        loadingDots = (loadingDots + 1) % 4; // Cicla entre 0, 1, 2, 3
        const dots = '.'.repeat(loadingDots);
        // Borra la línea anterior y escribe la nueva
        process.stdout.write(`\r   Clonando repositorio. Por favor, espera${dots}   `);
    }, 300); // Actualiza cada 300ms
}

function stopLoadingIndicator() {
    clearInterval(loadingInterval);
    process.stdout.write('\r                                                                     \r'); // Borra la línea de carga
}
// --- Fin de la función para el indicador de carga ---

async function processRepository() {
    // --- VERIFICACIÓN DE VERSIÓN DE NODE.JS ---
    const currentNodeVersion = process.versions.node;
    const majorVersion = parseInt(currentNodeVersion.split('.')[0], 10);
    const minRequiredMajorVersion = 14; // fs.rm fue introducido en Node.js v14.14.0

    if (majorVersion < minRequiredMajorVersion) {
        console.error('\n❌ ERROR: ¡Versión de Node.js incompatible detectada!');
        console.error(`   Tu versión actual de Node.js es: v${currentNodeVersion}`);
        console.error(`   Este script requiere Node.js v${minRequiredMajorVersion} o superior.`);
        console.error('\nPor favor, actualiza tu versión de Node.js. Si usas nvm (Node Version Manager), puedes hacerlo con:');
        console.error(`   nvm use ${minRequiredMajorVersion}  (o la versión estable más reciente como 'nvm use node')`);
        console.error(`   nvm alias default ${minRequiredMajorVersion}  (para establecerla como predeterminada)`);
        console.error('\nLuego, ejecuta `npm install` de nuevo para asegurar la compatibilidad de las dependencias.');
        return; // Aborta la ejecución del script
    }
    // --- FIN VERIFICACIÓN DE VERSIÓN DE NODE.JS ---

    let username, token;

    const {
        repoUrl,
        targetFolderInRepo,
        cloneDir,
        github,
        bitbucket
    } = config;

    let repoProvider;
    let repoOwner;
    let repoName;
    let urlParts;

    try {
        urlParts = new URL(repoUrl);
        const pathParts = urlParts.pathname.split('/').filter(Boolean);

        if (urlParts.hostname === 'github.com') {
            repoProvider = 'github';
            if (pathParts.length >= 2) {
                repoOwner = pathParts[0];
                repoName = pathParts[1].replace('.git', '');
            } else {
                throw new Error('Formato de URL de GitHub inválido. Esperado: github.com/owner/repo.git');
            }
            username = github.username;
            token = github.pat;
            if (!username || !token) {
                console.error('\n❌ Error de Credenciales: Para GitHub, "github.username" y "github.pat" deben estar configurados en .env.');
                return;
            }
        } else if (urlParts.hostname === 'bitbucket.org') {
            repoProvider = 'bitbucket';
            if (pathParts.length >= 2) {
                repoOwner = pathParts[0];
                repoName = pathParts[1].replace('.git', '');
            } else {
                throw new Error('Formato de URL de Bitbucket inválido. Esperado: bitbucket.org/workspace/repo.git');
            }

            if (urlParts.username) {
                username = urlParts.username;
                console.log(`\n✅ Usuario de Bitbucket detectado en la URL: ${username}`);
            } else if (bitbucket.username) {
                username = bitbucket.username;
                console.log(`\nℹ️ Usuario de Bitbucket tomado de .env: ${username}`);
            } else {
                console.error('\n❌ Error de Credenciales: Para Bitbucket, tu usuario debe estar en la URL del repositorio o en la variable BITBUCKET_USERNAME en .env.');
                return;
            }
            token = bitbucket.appPassword;
            if (!token) {
                console.error('\n❌ Error de Credenciales: Para Bitbucket, "bitbucket.appPassword" debe estar configurado en .env.');
                return;
            }

        } else {
            console.error('\n❌ Error de Configuración: La URL del repositorio en config.js no es de GitHub ni de Bitbucket. Abortando.');
            return;
        }

    } catch (e) {
        console.error(`\n❌ Error al parsear la URL del repositorio: ${e.message}`);
        console.error('Asegúrate de que "repoUrl" en config.js es una URL válida y con el formato correcto.');
        return;
    }

    if (!targetFolderInRepo) {
        console.error('\n❌ Error de Configuración: Por favor, asegúrate de que "targetFolderInRepo" esté configurado correctamente en config.js.');
        return;
    }
    console.log(`\nInformación del Repositorio Detectada:`);
    console.log(`  Proveedor: ${repoProvider}`);
    console.log(`  Propietario: ${repoOwner}`);
    console.log(`  Nombre: ${repoName}`);

    // 1. Obtener y listar las carpetas de proyecto no zipeadas
    const currentDirectory = process.cwd();
    let projectFolders = [];
    try {
        const filesInCurrentDir = await fs.readdir(currentDirectory);
        for (const file of filesInCurrentDir) {
            const fullPath = `${currentDirectory}/${file}`;
            const stats = await fs.stat(fullPath);
            if (stats.isDirectory() && file !== 'node_modules' && file !== cloneDir.replace('./', '')) {
                const match = file.match(/STG-2FA-(.*?)-/);
                if (match && match[1]) {
                    projectFolders.push({
                        fullFolderName: file,
                        projectName: match[1]
                    });
                }
            }
        }
    } catch (err) {
        console.error(`\n❌ Error al leer las carpetas de proyecto: ${err.message}`);
        console.error('Asegúrate de que tienes permisos de lectura en el directorio actual.');
        return;
    }

    let actualOutputZipPath;
    let selectedProjectFolder = null;

    if (projectFolders.length === 0) {
        console.warn('\n⚠️ Advertencia: No se encontraron carpetas de proyecto válidas con el patrón "STG-2FA-proyecto-..." en el directorio actual.');
        console.warn('El archivo ZIP de salida se guardará en el directorio raíz del proyecto.');
    } else {
        console.log('\nCarpetas de proyecto detectadas:');
        projectFolders.forEach((folder, index) => {
            console.log(`  ${index + 1}. ${folder.projectName} (${folder.fullFolderName})`);
        });

        while (!selectedProjectFolder) {
            const input = readlineSync.question('Por favor, ingresa el nombre del proyecto (ej. equinox): ').trim();
            if (!input) {
                console.error('❌ Error: El nombre del proyecto no puede estar vacío.');
                continue;
            }
            selectedProjectFolder = projectFolders.find(folder => folder.projectName.toLowerCase() === input.toLowerCase());
            if (!selectedProjectFolder) {
                console.error(`\n❌ Error: "${input}" no es un nombre de proyecto válido de la lista. Intenta de nuevo.`);
            }
        }
    }

    const extractedFolderName = readlineSync.question('Por favor, ingresa el nombre para la carpeta extraída y el archivo ZIP (ej. test, cartucho_cliente): ');
    if (!extractedFolderName.trim()) {
        console.error('❌ Error: El nombre para la carpeta extraída/ZIP no puede estar vacío. Abortando.');
        return;
    }

    const finalOutputZipName = `${extractedFolderName}.zip`;

    if (selectedProjectFolder) {
        actualOutputZipPath = `${currentDirectory}/${selectedProjectFolder.fullFolderName}/${finalOutputZipName}`;
    } else {
        actualOutputZipPath = `${currentDirectory}/${finalOutputZipName}`;
    }
    console.log(`\n✅ El archivo ZIP se guardará en: ${actualOutputZipPath}`);


    const branchName = readlineSync.question('Por favor, ingresa el nombre de la rama a clonar: ');
    if (!branchName.trim()) {
        console.error('❌ Error: El nombre de la rama no puede estar vacío. Abortando.');
        return;
    }

    let authenticatedRepoUrl;
    if (repoProvider === 'bitbucket' && urlParts.username) {
        authenticatedRepoUrl = repoUrl.replace(`https://${urlParts.username}@`, `https://${urlParts.username}:${token}@`);
    } else {
        authenticatedRepoUrl = repoUrl.replace('https://', `https://${username}:${token}@`);
    }

    const cloneCommand = `git clone --depth 1 --branch ${branchName} ${authenticatedRepoUrl} ${cloneDir}`;

    let extractedFilesTempPath = '';

    try {
        console.log('\n--- Iniciando Proceso ---');
        console.log('1. Limpiando directorios temporales...');
        await fs.remove(cloneDir);
        await fs.mkdir(cloneDir);
        console.log('   Directorios temporales listos.');

        // --- Inicio del indicador de carga aquí ---
        console.log(`\n2. Clonando repositorio de ${repoProvider}: ${repoUrl} (rama: ${branchName})...`);
        startLoadingIndicator(); // Inicia la animación de puntos
        try {
            await executeCommand(cloneCommand);
            stopLoadingIndicator(); // Detiene la animación si tiene éxito
            console.log('   Repositorio clonado exitosamente.');
        } catch (gitError) {
            stopLoadingIndicator(); // Detiene la animación si hay un error
            console.error(`\n❌ Error de Git al clonar el repositorio:`);
            console.error(`   - Mensaje: ${gitError.message.split('\n')[0]}`);
            console.error(`   - Posibles razones: Rama '${branchName}' no existe, credenciales incorrectas, repositorio privado o URL incorrecta.`);
            return;
        }
        // --- Fin del indicador de carga ---


        const sourcePath = `${cloneDir}/${targetFolderInRepo}`;
        extractedFilesTempPath = `./${extractedFolderName}_extracted_temp`;

        console.log(`\n3. Copiando carpeta '${targetFolderInRepo}' a '${extractedFilesTempPath}'...`);
        if (await fs.pathExists(sourcePath)) {
            await fs.remove(extractedFilesTempPath);
            await fs.copy(sourcePath, extractedFilesTempPath);
            console.log('   Carpeta copiada exitosamente.');
        } else {
            console.error(`\n❌ Error: La carpeta '${targetFolderInRepo}' no se encontró dentro del repositorio clonado. Asegúrate de que la ruta sea correcta y sensible a mayúsculas/minúsculas.`);
            return;
        }

        console.log(`\n4. Zipeando la carpeta '${extractedFilesTempPath}' a '${actualOutputZipPath}'...`);
        const zip = new AdmZip();
        if (await fs.pathExists(extractedFilesTempPath)) {
            zip.addLocalFolder(extractedFilesTempPath, extractedFolderName);
            zip.writeZip(actualOutputZipPath);
            console.log('   Carpeta zipeada exitosamente.');
        } else {
            console.error('❌ Error: No se pudo zipear la carpeta porque la carpeta de origen no existe.');
            return;
        }

        console.log('\n--- Proceso Completado con Éxito ---');
        console.log(`✅ Archivo ZIP generado y guardado en: ${actualOutputZipPath}`);

    } catch (error) {
        console.error('\n❌ ¡Ha ocurrido un error inesperado durante el proceso!');
        console.error(`   - Mensaje General: ${error.message}`);
        console.error('   - Por favor, revisa la consola para más detalles y asegúrate de que tu configuración y credenciales son correctas.');
    } finally {
        console.log('\n--- Limpieza Final ---');
        try {
            if (await fs.pathExists(cloneDir)) {
                await fs.remove(cloneDir);
                console.log(`   Directorio de clonación temporal '${cloneDir}' eliminado.`);
            }
            if (await fs.pathExists(extractedFilesTempPath)) {
                await fs.remove(extractedFilesTempPath);
                console.log(`   Directorio de archivos extraídos temporal '${extractedFilesTempPath}' eliminado.`);
            }
        } catch (cleanupError) {
            console.error(`\n⚠️ Advertencia: Error al intentar limpiar directorios temporales: ${cleanupError.message}`);
            console.error('   Puede que necesites eliminarlos manualmente.');
        }
        console.log('--- Fin del Proceso ---');
    }
}

function executeCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
            if (error) {
                const errorMessage = `Comando fallido: "${command}"\nError: ${error.message}\nStdout: ${stdout}\nStderr: ${stderr}`;
                reject(new Error(errorMessage));
                return;
            }
            if (stderr) {
                console.warn(`Git Stderr: ${stderr}`);
            }
            resolve(stdout);
        });
    });
}

processRepository();