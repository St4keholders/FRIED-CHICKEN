// game/peeropts.js - PeerJS configuration from URL params or public cloud defaults

export function getPeerOptions(customParams) {
  const isBrowser = typeof window !== 'undefined';
  let params = null;

  if (customParams instanceof URLSearchParams) {
    params = customParams;
  } else if (isBrowser) {
    params = new URLSearchParams(window.location.search);
  }

  const host = params?.get('peerhost');
  const port = params?.get('peerport');
  const path = params?.get('peerpath');
  const secure = params?.get('peersecure');

  if (host) {
    const opts = {
      host,
      port: port ? parseInt(port, 10) : 443,
      path: path || '/',
      secure: secure === '1' || secure === 'true',
      debug: 1,
    };
    return opts;
  }

  // Default PeerJS public cloud server
  return {
    debug: 1,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
      ]
    }
  };
}
