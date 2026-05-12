const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
    appName: 'Antares'
});

contextBridge.exposeInMainWorld('iptvAPI', {
    openFile: () => ipcRenderer.invoke('open-m3u-file'),
    readFile: (filePath) => ipcRenderer.invoke('read-m3u-file', filePath)
});
