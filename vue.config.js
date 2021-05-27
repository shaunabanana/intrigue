module.exports = {
    pluginOptions: {
        electronBuilder: {
            externals: ['electron'],
            nodeIntegration: true,
            contextIsolation: false,
            builderOptions: {
                fileAssociations: [
                    {
                        ext: "intrigue", 
                        name: "Intrigue Literature Map",
                        description: "Intrigue literature map file.",
                        role: "Editor",
                        icon: "document.icns"
                    }
                ]
            }
        }
    }
}