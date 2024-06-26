import { Server } from "socket.io";
import type { Socket } from "socket.io";
import type { Server as HttpServer } from "http";
import { corsOptions } from "../../app";
import type { Types } from "mongoose";

export interface SocketsUserInfo {
  socket: Socket;
  userId: Types.ObjectId;
}

interface SocketsLoginInfo {
  token: string;
  userId: Types.ObjectId;
}

export const socketUsersRecord: Record<string, SocketsUserInfo> = {};

export const initializeWebsocketServer = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: corsOptions,
  });

  io.on("connection", (socket) => {
    socket.on("log_in", (data: SocketsLoginInfo) => {
      console.log(`New socket connection, socket: ${socket.id}`);
      // console.log(`We got a new websocket connection: ${data}`);
      socketUsersRecord[data.token] = {
        socket,
        userId: data.userId,
      };
      // console.log(
      //   `Now we got a record with ${Object.keys(socketUsersRecord).length} entries`
      // );
      // for (const key in socketUsersRecord) {
      //   console.log(
      //     `Token: ${key}\nUserID: ${socketUsersRecord[key].userId}\nSocket: ${socketUsersRecord[key].socket.id}\n\n`
      //   );
      // }
    });
  });

  return io;
};

export default initializeWebsocketServer;
