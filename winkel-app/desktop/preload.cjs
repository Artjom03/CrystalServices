// Brug tussen de app en Windows: afdrukken, de printer kiezen en weten of het de eerste keer is.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('crystal', {
  desktop: true,
  afdrukken: (formaat, soort) => ipcRenderer.invoke('afdrukken', formaat, soort),
  printers: () => ipcRenderer.invoke('printers'),
  zetPrinter: (soort, naam) => ipcRenderer.invoke('zet-printer', soort, naam),
  eersteKeer: () => ipcRenderer.invoke('eerste-keer'),
  printer: () => ipcRenderer.invoke('printer'),
  kiesPrinter: (soort) => ipcRenderer.invoke('kies-printer', soort),
});
