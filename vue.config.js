const { defineConfig } = require('@vue/cli-service');

module.exports = defineConfig({
    transpileDependencies: true,
    configureWebpack: {
        module: {
            rules: [
                {
                    test: require('path').resolve(__dirname, 'node_modules/leader-line/'),
                    use: [
                        {
                            loader: 'skeleton-loader',
                            options: {
                                procedure: (content) => `${content}export default LeaderLine`,
                            },
                        },
                    ],
                },
            ],
        },
    },
    pluginOptions: {
        electronBuilder: {
            externals: ['electron'],
            nodeIntegration: true,
            contextIsolation: false,
            builderOptions: {
                fileAssociations: [
                    {
                        ext: 'intrigue',
                        name: 'Intrigue Literature Map',
                        description: 'Intrigue literature map file.',
                        role: 'Editor',
                        icon: 'document.icns',
                    },
                ],
            },
        },
    },
});
