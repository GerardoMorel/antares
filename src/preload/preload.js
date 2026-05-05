const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
    appName: 'Antares'
});

contextBridge.exposeInMainWorld('iptvAPI', {
    openFile: () => ipcRenderer.invoke('open-m3u-file')
});



