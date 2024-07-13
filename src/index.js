'use strict';

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap({ strapi }) {
    const io = require('socket.io')(strapi.server.httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL,
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true,
      },
    });

    io.on('connection', async (socket) => {
      console.log('A user connected');

      // Function to fetch all messages for a given room name
      const fetchMessagesForRoom = async (roomName) => {
        const entries = await strapi.db.query('api::chat-message.chat-message').findWithCount({
          select: ['content', 'username','createdAt'],
          where: { roomName: roomName },
        });
        return entries;
      };

      socket.on('joinRoom', async (roomName ,userId) => {
        console.log(`User: ${userId}`)
        socket.join(roomName);
        console.log(`User joined room: ${roomName}`);
        // await strapi.db.query('api::room.room').update({
        //   where: {id:roomName},
        //   data: {
        //  $addToSet: { participants:  }
        // }
        // });
        // add the room participants to the room
        // Fetch and emit all existing messages for the joined room
        const messages = await fetchMessagesForRoom(roomName);
        socket.emit('allMessages', messages);
      });

      socket.on('sendMessage', async (data) => {
        const { userId, content, roomId, userName, roomName } = data;
        console.log(data);
        console.log(roomId)


        // Save message to Strapi
        const newMessage = await strapi.db.query('api::chat-message.chat-message').create({
          data: {
            user: userId,
            content,
            room: roomId,
            username: userName,
            roomName: roomName,
          },
        });
        console.log(`Message saved: ${newMessage}`);



        // Broadcast message to the room
        io.to(roomId).emit('message', newMessage);
      });

      socket.on('disconnect', () => {
        console.log('A user disconnected');
      });
    });

    strapi.io = io;
  },

};
