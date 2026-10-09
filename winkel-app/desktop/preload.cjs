// Brug tussen de app en Windows: enkel afdrukken en weten of het de eerste keer is.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('crystal', {
  desktop: true,
  afdrukken: () => ipcRenderer.invoke('afdrukken'),
  eersteKeer: () => ipcRenderer.invoke('eerste-keer'),
});
