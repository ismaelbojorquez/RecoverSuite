import { WebSocketServer } from 'ws';

const isJobsStream = (req) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    return url.pathname === '/api/jobs/stream';
  } catch (err) {
    return false;
  }
};

export const setupJobsWebSocket = (server) => {
  const wss = new WebSocketServer({ noServer: true });

  const broadcast = (payload) => {
    const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
    wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(message);
      }
    });
  };

  server.on('upgrade', (req, socket, head) => {
    if (!isJobsStream(req)) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.send(JSON.stringify({ type: 'connected' }));
      ws.on('error', () => {
        ws.close();
      });
    });
  });

  return {
    broadcast,
    close: () => wss.close()
  };
};
