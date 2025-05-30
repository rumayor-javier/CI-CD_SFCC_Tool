# 🚀 Herramienta CI/CD para Salesforce Commerce Cloud (SFCC)

Esta herramienta de línea de comandos facilita y automatiza el proceso de clonación de repositorios de GitHub/Bitbucket, la extracción de una carpeta específica de proyecto (como un cartucho SFCC) y su empaquetado en un archivo `.zip`. Está diseñada para agilizar el flujo de trabajo de desarrollo y despliegue en entornos de Salesforce Commerce Cloud (SFCC), especialmente para la generación de archivos listos para importar.

### Características Principales:

* **Soporte Multi-Plataforma:** Compatible con macOS, Linux y Windows.
* **Autenticación Segura:** Utiliza Personal Access Tokens (PAT) para GitHub y Contraseñas de Aplicación (App Passwords) para Bitbucket, garantizando un acceso seguro a tus repositorios privados.
* **Gestión de Versiones:** Verifica la versión de Node.js para asegurar la compatibilidad.
* **Extracción Dirigida:** Permite especificar la carpeta exacta (ej. un cartucho) dentro del repositorio a empaquetar.
* **Organización de Salida:** Guarda el archivo ZIP resultante en la carpeta del proyecto SFCC local o en la raíz del script si no se detecta una carpeta de proyecto.
* **Limpieza Automática:** Elimina directorios temporales después de la ejecución.

---

## 🛠️ Requisitos

Asegúrate de tener instalado lo siguiente en tu sistema antes de usar esta herramienta:

* **Node.js**: **Versión 14 o superior** (se recomienda la versión LTS más reciente).
    * Puedes verificar tu versión con: `node -v`
    * Si necesitas actualizar, se recomienda usar [nvm (Node Version Manager)](https://github.com/nvm-sh/nvm) para macOS/Linux o [nvm-windows](https://github.com/coreybutler/nvm-windows) para Windows.
        * Instala Node.js LTS: `nvm install --lts`
        * Usa la versión LTS: `nvm use --lts`
        * Establece como predeterminada: `nvm alias default --lts`
* **Git**: La herramienta de control de versiones debe estar instalada y accesible desde la línea de comandos.

---

## ⚙️ Configuración Inicial

1.  **Clonar este repositorio (si aún no lo tienes):**

    ```bash
    git clone [https://github.com/rumayor-javier/CI-CD_SFCC_Tool.git](https://github.com/rumayor-javier/CI-CD_SFCC_Tool.git)
    cd CI-CD_SFCC_Tool
    ```

2.  **Instalar dependencias:**

    ```bash
    npm install
    ```

3.  **Configurar Variables de Entorno (`.env`):**
    Crea un archivo llamado `.env` en la raíz de este proyecto (al mismo nivel que `config.js` y `package.json`). Este archivo contendrá tus credenciales sensibles.

    **Ejemplo de `.env`:**

    ```dotenv
    # --- GitHub Configuration ---
    GITHUB_USERNAME="tu_usuario_github"
    GITHUB_PAT="tu_personal_access_token_github"

    # --- Bitbucket Configuration ---
    # Si tu usuario de Bitbucket ya está en la URL del repositorio (ej. [https://usuario@bitbucket.org/](https://usuario@bitbucket.org/)...),
    # la variable BITBUCKET_USERNAME es opcional.
    BITBUCKET_USERNAME="tu_usuario_bitbucket"
    BITBUCKET_APP_PASSWORD="tu_app_password_bitbucket"
    ```

    * **Para GitHub PAT:**
        * Ve a [GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)](https://github.com/settings/tokens).
        * Haz clic en "Generate new token (classic)".
        * Dale un nombre descriptivo (ej. "SFCC_Tool_CLI").
        * **Marca el scope `repo`** (esto es crucial para repositorios públicos y privados).
        * Copia el token generado **inmediatamente**, ya que no podrás verlo de nuevo.
    * **Para Bitbucket App Password:**
        * Ve a [Bitbucket Settings > Personal settings > App passwords](https://bitbucket.org/account/settings/app-passwords/).
        * Haz clic en "Create new app password".
        * Dale una etiqueta.
        * Concede permisos para el repositorio (al menos "Read" y "Write" bajo "Repositories").
        * Copia la contraseña generada **inmediatamente**.

4.  **Configurar `config.js`:**
    Abre el archivo `config.js` y actualiza las siguientes variables:

    ```javascript
    module.exports = {
        repoUrl: "[https://github.com/tu_usuario_o_org/nombre_del_repositorio.git](https://github.com/tu_usuario_o_org/nombre_del_repositorio.git)",
        // O para Bitbucket: "[https://tu_usuario_o_workspace@bitbucket.org/workspace/nombre_del_repositorio.git](https://tu_usuario_o_workspace@bitbucket.org/workspace/nombre_del_repositorio.git)",
        targetFolderInRepo: "path/al/cartucho/dentro/del/repo", // Ej. "cartridges/app_storefront_base"
        cloneDir: "./temp_repo_clone", // Directorio temporal para clonar el repositorio
        // ... (las secciones de github y bitbucket se cargan del .env)
    };
    ```

    * **`repoUrl`**: La URL completa HTTPS de tu repositorio de GitHub o Bitbucket.
    * **`targetFolderInRepo`**: La ruta a la carpeta que deseas extraer **dentro del repositorio clonado**. Por ejemplo, si tu cartucho está en `mi-proyecto/cartridges/app_personalizado`, y `mi-proyecto` es la raíz del repositorio, entonces `targetFolderInRepo` sería `cartridges/app_personalizado`.

---

## 🚀 Uso

Una vez configurado, puedes ejecutar el script desde la línea de comandos:

```bash
node cervezita.js
