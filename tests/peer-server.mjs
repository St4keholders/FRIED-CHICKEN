// Servidor PeerJS local para probar sin internet.
// Uso: npm i --no-save peer && node tests/peer-server.mjs
// Luego abre las páginas con ?peerhost=127.0.0.1&peerport=9000&peerpath=/
import { PeerServer } from 'peer';
PeerServer({ port: 9000, path: '/', host: '127.0.0.1' }, () => console.log('PeerJS local listo en 127.0.0.1:9000'));
