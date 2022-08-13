const { defineConfig } = require('@vue/cli-service');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

module.exports = defineConfig({
    transpileDependencies: true,
    configureWebpack: {
        plugins: [new NodePolyfillPlugin()],
        resolve: {
            fallback: {
                fs: false,
                'fs/promises': false,
            },
        },
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
                productName: 'Intrigue',
                appId: 'design.shengchen.intrigue',
                afterSign: 'electron-builder-notarize',
                mac: {
                    hardenedRuntime: true,
                    entitlements: './node_modules/electron-builder-notarize/entitlements.mac.inherit.plist',
                },
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
