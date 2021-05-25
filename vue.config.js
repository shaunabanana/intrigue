module.exports = {
    pluginOptions: {
        electronBuilder: {
            externals: ['electron'],
            nodeIntegration: true,
            contextIsolation: false
        }
    }
}