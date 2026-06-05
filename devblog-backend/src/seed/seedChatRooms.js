const prisma = require('../config/database');

const seedRooms = async () => {
  const defaultRooms = [
    { name: 'general', topic: 'General discussion for all developers' },
    { name: 'javascript', topic: 'JavaScript, TypeScript, Node.js' },
    { name: 'react', topic: 'React, Next.js, Frontend frameworks' },
    { name: 'backend', topic: 'APIs, Databases, Server architecture' },
    { name: 'career', topic: 'Jobs, interviews, career advice' },
    { name: 'showcase', topic: 'Show off your projects' },
  ];

  for (const room of defaultRooms) {
    const existing = await prisma.chatRoom.findUnique({
      where: { name: room.name },
    });

    if (!existing) {
      await prisma.chatRoom.create({ data: room });
      console.log(`Created room: ${room.name}`);
    }
  }

  console.log('Chat rooms seeded!');
};

seedRooms()
  .catch(console.error)
  .finally(() => prisma.$disconnect());