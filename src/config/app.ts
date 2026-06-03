// Configuração central do app — fonte única de verdade para nome, autor e versão.
//
// VERSÃO: vem de package.json#version (atualizada pelo script `npm run bump`).
// Para alterar nome ou autor, edite as constantes abaixo.
//
// Para sincronizar versão entre JS e Android, use:
//   npm run bump -- 0.0.5
//
// Para regenerar ícones (após trocar resources/icon.png):
//   npx capacitor-assets generate --android
//   npx cap sync android

import pkg from '../../package.json';

export const APP_NAME = 'Academia';
export const APP_VERSION: string = pkg.version;
export const APP_PACKAGE_ID = 'com.kozato.academia';
export const APP_AUTHOR = 'Kozato01';
export const APP_AUTHOR_URL = 'https://github.com/Kozato01';
export const APP_EXERCISE_DB_URL = 'https://github.com/yuhonas/free-exercise-db';
