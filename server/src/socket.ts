import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: SocketServer;

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: { origin: '*' }
  });
  return io;
}

export function getIO(): SocketServer {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}
