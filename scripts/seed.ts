import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { adminDb, isFirebaseConfigured } from '../src/lib/firebase-admin';

async function seed() {
  console.log('🌱 Seeding Sailboat Telemetry Database...');
  console.log(`📡 Storage mode: ${isFirebaseConfigured ? 'Real Firestore (Cloud)' : 'In-Memory / Dev Store'}`);

  const now = new Date();
  const readingsCount = 21; // 7 days * 3 readings/day = 21 points
  const intervalHours = 8;

  // 1. Seed Commands collection
  console.log('📝 Setting up commands/current document...');
  await adminDb.collection('commands').doc('current').set({
    reportIntervalMinutes: 480, // 8 hours
    mode: 'normal',
    updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    lastFetchedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
  });

  // 2. Generate 7 days of historical readings
  console.log(`📊 Generating ${readingsCount} historical telemetry readings...`);
  const generatedDocIds: { id: string; timestamp: Date; bilge: boolean }[] = [];

  for (let i = readingsCount - 1; i >= 0; i--) {
    const readingTime = new Date(now.getTime() - i * intervalHours * 60 * 60 * 1000);
    const hour = readingTime.getHours();

    // Diurnal temperature cycle: coolest around 04:00, warmest around 14:00
    const tempBase = 20 + Math.sin(((hour - 8) / 24) * 2 * Math.PI) * 4;
    const tempRandom = (Math.random() - 0.5) * 1.5;
    const temperature = Math.round((tempBase + tempRandom) * 10) / 10;

    // Inverse humidity cycle with marina marine moisture (60% - 78%)
    const humidBase = 68 - Math.sin(((hour - 8) / 24) * 2 * Math.PI) * 8;
    const humidRandom = (Math.random() - 0.5) * 4;
    const humidity = Math.round((humidBase + humidRandom) * 10) / 10;

    // Simulate 2 rainstorm / bilge events: on day 4 and day 2 ago
    const isBilgeAlert = i === 6 || i === 13;

    const readingData = {
      temperature,
      humidity,
      bilgeAlert: isBilgeAlert,
      sensorOk: true,
      voltage: null, // Note: current firmware has no voltage
      receivedAt: readingTime.toISOString(),
      createdAt: readingTime.toISOString(),
    };

    const docRef = await adminDb.collection('readings').add(readingData);
    generatedDocIds.push({ id: docRef.id, timestamp: readingTime, bilge: isBilgeAlert });
  }

  // 3. Seed Events collection for the bilge activations
  console.log('🚨 Generating bilge activation event logs...');
  const bilgeEvents = generatedDocIds.filter((d) => d.bilge);

  for (const b of bilgeEvents) {
    await adminDb.collection('events').add({
      timestamp: b.timestamp.toISOString(),
      createdAt: b.timestamp.toISOString(),
      readingId: b.id,
      notes: 'Rainstorm squall passed over marina. Automatic bilge cycle cleared 1.5 gal of rain runoff.',
      resolved: true,
    });
  }

  console.log('✅ Seeding completed successfully!');
  console.log('----------------------------------------------------');
  console.log('👉 Dashboard URL: http://localhost:3000');
  console.log('👉 Default Username: skipper');
  console.log('👉 Default Password: father2024');
  console.log('----------------------------------------------------');
}

seed().catch((err) => {
  console.error('❌ Seeding error:', err);
  process.exit(1);
});
