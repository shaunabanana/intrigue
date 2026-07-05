module.exports = {
    root: true,
    ignorePatterns: ['assets/', 'out/', 'dist/', 'dist_electron/'],
    env: {
        node: true,
    },
    extends: ['plugin:vue/vue3-essential', 'plugin:import/recommended', '@vue/airbnb'],
    parserOptions: {
        parser: '@babel/eslint-parser',
        requireConfigFile: false,
    },
    settings: {
        'import/resolver': {
            alias: {
                map: [['@', './src']],
                extensions: ['.js', '.vue'],
            },
        },
    },
    rules: {
        indent: ['error', 4],
        'vue/multi-word-component-names': 'off',
        'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
        'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
        'linebreak-style': 0,
    },
};
