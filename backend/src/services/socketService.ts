import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { RoomData, GravityWellData, SocketUser, JwtPayload } from '../types';
import { setCache, getCache, deleteCache } from '../config/redis';

export class SocketService {
  private io: SocketIOServer;
  private rooms: Map<string, RoomData> = new Map();
  private userSockets: Map<string, string> = new Map();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.SOCKET_IO_CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
          return next(new Error('Server configuration error'));
        }

        const decoded = jwt.verify(token, secret) as JwtPayload;
        socket.data.user = {
          id: decoded.userId,
          username: decoded.username
        } as SocketUser;

        next();
      } catch (error) {
        next(new Error('Invalid authentication token'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const user = socket.data.user as SocketUser;

      
      this.userSockets.set(user.id, socket.id);

      socket.on('create-room', async (data) => {
        await this.handleCreateRoom(socket, data);
      });

      socket.on('join-room', async (data) => {
        await this.handleJoinRoom(socket, data);
      });

      socket.on('leave-room', async () => {
        await this.handleLeaveRoom(socket);
      });

      socket.on('create-gravity-well', async (data) => {
        await this.handleCreateGravityWell(socket, data);
      });

      socket.on('update-simulation-config', async (data) => {
        await this.handleUpdateSimulationConfig(socket, data);
      });

      socket.on('get-rooms', async () => {
        await this.handleGetRooms(socket);
      });

      socket.on('disconnect', async () => {
        await this.handleDisconnect(socket);
      });
    });
  }

  private async handleCreateRoom(socket: any, data: any) {
    try {
      const user = socket.data.user as SocketUser;
      const { name, maxParticipants = 10, config } = data;

      if (!name || !config) {
        socket.emit('error', { message: 'Room name and config are required' });
        return;
      }

      if (user.roomId) {
        await this.leaveRoom(socket, user.roomId);
      }

      const roomId = uuidv4();
      const room: RoomData = {
        id: roomId,
        name,
        hostId: user.id,
        participants: [user.id],
        maxParticipants,
        config,
        gravityWells: [],
        createdAt: new Date()
      };

      this.rooms.set(roomId, room);
      await setCache(`room:${roomId}`, room, 3600);

      socket.join(roomId);
      user.roomId = roomId;

      socket.emit('room-created', {
        room: this.sanitizeRoom(room),
        isHost: true
      });

      this.io.emit('rooms-updated', await this.getPublicRooms());
      

    } catch (error) {

      socket.emit('error', { message: 'Failed to create room' });
    }
  }

  private async handleJoinRoom(socket: any, data: any) {
    try {
      const user = socket.data.user as SocketUser;
      const { roomId } = data;

      if (!roomId) {
        socket.emit('error', { message: 'Room ID is required' });
        return;
      }

      let room = this.rooms.get(roomId);
      if (!room) {
        room = await getCache(`room:${roomId}`);
        if (room) {
          this.rooms.set(roomId, room);
        }
      }

      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      if (room.participants.length >= room.maxParticipants) {
        socket.emit('error', { message: 'Room is full' });
        return;
      }

      if (room.participants.includes(user.id)) {
        socket.emit('error', { message: 'Already in this room' });
        return;
      }

      if (user.roomId) {
        await this.leaveRoom(socket, user.roomId);
      }

      room.participants.push(user.id);
      this.rooms.set(roomId, room);
      await setCache(`room:${roomId}`, room, 3600);

      socket.join(roomId);
      user.roomId = roomId;

      socket.emit('room-joined', {
        room: this.sanitizeRoom(room),
        isHost: room.hostId === user.id
      });

      socket.to(roomId).emit('user-joined', {
        user: { id: user.id, username: user.username },
        participantCount: room.participants.length
      });

      this.io.emit('rooms-updated', await this.getPublicRooms());
      

    } catch (error) {

      socket.emit('error', { message: 'Failed to join room' });
    }
  }

  private async handleLeaveRoom(socket: any) {
    try {
      const user = socket.data.user as SocketUser;
      
      if (!user.roomId) {
        socket.emit('error', { message: 'Not in any room' });
        return;
      }

      await this.leaveRoom(socket, user.roomId);
      socket.emit('room-left');
      

    } catch (error) {

      socket.emit('error', { message: 'Failed to leave room' });
    }
  }

  private async handleCreateGravityWell(socket: any, data: any) {
    try {
      const user = socket.data.user as SocketUser;
      
      if (!user.roomId) {
        socket.emit('error', { message: 'Not in any room' });
        return;
      }

      const { position, strength, isRepulsive } = data;
      
      if (!position || typeof strength !== 'number' || typeof isRepulsive !== 'boolean') {
        socket.emit('error', { message: 'Invalid gravity well data' });
        return;
      }

      const room = this.rooms.get(user.roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const gravityWell: GravityWellData = {
        id: uuidv4(),
        position,
        strength,
        isRepulsive,
        life: 0,
        createdBy: user.id,
        timestamp: Date.now()
      };

      room.gravityWells.push(gravityWell);
      
      if (room.gravityWells.length > 100) {
        room.gravityWells = room.gravityWells.slice(-50);
      }

      this.rooms.set(user.roomId, room);
      await setCache(`room:${user.roomId}`, room, 3600);

      this.io.to(user.roomId).emit('gravity-well-created', {
        gravityWell,
        createdBy: { id: user.id, username: user.username }
      });
      
    } catch (error) {

      socket.emit('error', { message: 'Failed to create gravity well' });
    }
  }

  private async handleUpdateSimulationConfig(socket: any, data: any) {
    try {
      const user = socket.data.user as SocketUser;
      
      if (!user.roomId) {
        socket.emit('error', { message: 'Not in any room' });
        return;
      }

      const room = this.rooms.get(user.roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      if (room.hostId !== user.id) {
        socket.emit('error', { message: 'Only room host can update configuration' });
        return;
      }

      const { config } = data;
      
      if (!config || typeof config !== 'object') {
        socket.emit('error', { message: 'Invalid configuration data' });
        return;
      }

      room.config = { ...room.config, ...config };
      this.rooms.set(user.roomId, room);
      await setCache(`room:${user.roomId}`, room, 3600);

      this.io.to(user.roomId).emit('simulation-config-updated', {
        config: room.config,
        updatedBy: { id: user.id, username: user.username }
      });
      
    } catch (error) {

      socket.emit('error', { message: 'Failed to update configuration' });
    }
  }

  private async handleGetRooms(socket: any) {
    try {
      const rooms = await this.getPublicRooms();
      socket.emit('rooms-list', rooms);
    } catch (error) {

      socket.emit('error', { message: 'Failed to get rooms list' });
    }
  }

  private async handleDisconnect(socket: any) {
    try {
      const user = socket.data.user as SocketUser;
      
      if (user && user.roomId) {
        await this.leaveRoom(socket, user.roomId);
      }

      if (user) {
        this.userSockets.delete(user.id);

      }
    } catch (error) {

    }
  }

  private async leaveRoom(socket: any, roomId: string) {
    const user = socket.data.user as SocketUser;
    const room = this.rooms.get(roomId);
    
    if (!room) return;

    room.participants = room.participants.filter(id => id !== user.id);

    if (room.participants.length === 0) {
      this.rooms.delete(roomId);
      await deleteCache(`room:${roomId}`);
    } else {
      if (room.hostId === user.id && room.participants.length > 0) {
        room.hostId = room.participants[0];
        
        const newHostSocketId = this.userSockets.get(room.hostId);
        if (newHostSocketId) {
          this.io.to(newHostSocketId).emit('host-promoted');
        }
      }
      
      this.rooms.set(roomId, room);
      await setCache(`room:${roomId}`, room, 3600);
    }

    socket.leave(roomId);
    user.roomId = undefined;

    socket.to(roomId).emit('user-left', {
      user: { id: user.id, username: user.username },
      participantCount: room.participants.length,
      newHostId: room.hostId
    });

    this.io.emit('rooms-updated', await this.getPublicRooms());
  }

  private async getPublicRooms() {
    const publicRooms = Array.from(this.rooms.values())
      .filter(room => room.participants.length < room.maxParticipants)
      .map(room => this.sanitizeRoom(room))
      .slice(0, 50);
    
    return publicRooms;
  }

  private sanitizeRoom(room: RoomData) {
    return {
      id: room.id,
      name: room.name,
      participantCount: room.participants.length,
      maxParticipants: room.maxParticipants,
      createdAt: room.createdAt
    };
  }

  public getIO() {
    return this.io;
  }
}
