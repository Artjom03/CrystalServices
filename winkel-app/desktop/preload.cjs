// Brug tussen de app en Windows: afdrukken, de printer kiezen en weten of het de eerste keer is.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('crystal', {
  desktop: true,
  afdrukken: (formaat) => ipcRenderer.invoke('afdrukken', formaat),
  eersteKeer: () => ipcRenderer.invoke('eerste-keer'),
  printer: () => ipcRenderer.invoke('printer'),
  kiesPrinter: (soort) => ipcRenderer.invoke('kies-printer', soort),
});
