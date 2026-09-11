import * as admin from 'firebase-admin';

function generateDefaultMockStore() {
  const now = Date.now();
  const readings: Record<string, any> = {};
  const events: Record<string, any> = {};
  const readingsCount = 24;
  const intervalHours = 8;

  for (let i = readingsCount - 1; i >= 0; i--) {
    const readingTime = new Date(now - i * intervalHours * 3600 * 1000);
    const hour = readingTime.getHours();
    const tempBase = 21.2 + Math.sin(((hour - 8) / 24) * 2 * Math.PI) * 3.8;
    const temperature = Math.round(tempBase * 10) / 10;
    const humidBase = 63.5 - Math.sin(((hour - 8) / 24) * 2 * Math.PI) * 7.2;
    const humidity = Math.round(humidBase * 10) / 10;
    const isBilgeAlert = i === 10; // 3 days ago
    const id = `mock_rec_${readingTime.getTime()}`;

    readings[id] = {
      id,
      temperature,
      humidity,
      bilgeAlert: isBilgeAlert,
      sensorOk: true,
      voltage: null,
      receivedAt: readingTime.toISOString(),
      createdAt: readingTime.toISOString(),
    };

    if (isBilgeAlert) {
      const eventId = `mock_evt_${readingTime.getTime()}`;
      events[eventId] = {
        id: eventId,
        timestamp: readingTime.toISOString(),
        createdAt: readingTime.toISOString(),
        readingId: id,
        notes: 'Rainstorm squall passed over marina. Automatic bilge cycle cleared 1.5 gal of rain runoff.',
        resolved: true,
      };
    }
  }

  return {
    readings,
    commands: {
      current: {
        reportIntervalMinutes: 480, // 8 hours (3x/day)
        mode: 'normal',
        updatedAt: new Date(now - 86400000).toISOString(),
        lastFetchedAt: new Date(now - 15 * 60000).toISOString(),
      },
    },
    events,
  };
}

// In-memory mock store for local development or when Firebase credentials are not provided
class MockFirestoreCollection {
  private name: string;
  private static store: Record<string, Record<string, any>> = generateDefaultMockStore();

  constructor(name: string) {
    this.name = name;
    if (!MockFirestoreCollection.store[this.name]) {
      MockFirestoreCollection.store[this.name] = {};
    }
  }

  doc(id: string) {
    const self = this;
    return {
      async get() {
        const data = MockFirestoreCollection.store[self.name][id];
        return {
          exists: !!data,
          id,
          data: () => data,
        };
      },
      async set(data: any, options?: { merge?: boolean }) {
        const existing = MockFirestoreCollection.store[self.name][id] || {};
        const merged = options?.merge ? { ...existing, ...data } : data;
        MockFirestoreCollection.store[self.name][id] = merged;
        return { writeTime: new Date() };
      },
      async update(data: any) {
        const existing = MockFirestoreCollection.store[self.name][id] || {};
        MockFirestoreCollection.store[self.name][id] = { ...existing, ...data };
        return { writeTime: new Date() };
      },
      async delete() {
        delete MockFirestoreCollection.store[self.name][id];
        return { writeTime: new Date() };
      },
    };
  }

  async add(data: any) {
    const id = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    MockFirestoreCollection.store[this.name][id] = { ...data, id };
    return {
      id,
      get: async () => ({
        exists: true,
        id,
        data: () => MockFirestoreCollection.store[this.name][id],
      }),
    };
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
    return this.createFilteredQuery({ orderByField: field, direction });
  }

  where(field: string, op: string, val: any) {
    return this.createFilteredQuery({ where: { field, op, val } });
  }

  limit(num: number) {
    return this.createFilteredQuery({ limitNum: num });
  }

  async get() {
    return this.createFilteredQuery({}).get();
  }

  private createFilteredQuery(params: {
    orderByField?: string;
    direction?: 'asc' | 'desc';
    where?: { field: string; op: string; val: any };
    limitNum?: number;
  }) {
    const self = this;
    const queryState = { ...params };

    return {
      orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
        queryState.orderByField = field;
        queryState.direction = direction;
        return self.createFilteredQuery(queryState);
      },
      where(field: string, op: string, val: any) {
        queryState.where = { field, op, val };
        return self.createFilteredQuery(queryState);
      },
      limit(num: number) {
        queryState.limitNum = num;
        return self.createFilteredQuery(queryState);
      },
      async get() {
        let items = Object.entries(MockFirestoreCollection.store[self.name] || {}).map(([id, val]) => ({
          id,
          ...val,
        }));

        if (queryState.where) {
          const { field, op, val } = queryState.where;
          items = items.filter((item) => {
            if (op === '==') return item[field] === val;
            if (op === '>') return item[field] > val;
            if (op === '>=') return item[field] >= val;
            if (op === '<') return item[field] < val;
            if (op === '<=') return item[field] <= val;
            return true;
          });
        }

        if (queryState.orderByField) {
          const field = queryState.orderByField;
          const dir = queryState.direction === 'desc' ? -1 : 1;
          items.sort((a, b) => {
            const va = a[field] instanceof Date ? a[field].getTime() : a[field] || 0;
            const vb = b[field] instanceof Date ? b[field].getTime() : b[field] || 0;
            if (va < vb) return -1 * dir;
            if (va > vb) return 1 * dir;
            return 0;
          });
        }

        if (queryState.limitNum) {
          items = items.slice(0, queryState.limitNum);
        }

        return {
          empty: items.length === 0,
          size: items.length,
          docs: items.map((docData) => ({
            id: docData.id,
            exists: true,
            data: () => docData,
          })),
        };
      },
    };
  }
}

class MockFirestoreDb {
  collection(name: string) {
    return new MockFirestoreCollection(name);
  }
}

const isFirebaseConfigured =
  Boolean(process.env.FIREBASE_PROJECT_ID) &&
  Boolean(process.env.FIREBASE_CLIENT_EMAIL) &&
  Boolean(process.env.FIREBASE_PRIVATE_KEY) &&
  !process.env.FIREBASE_PROJECT_ID?.includes('placeholder') &&
  !process.env.FIREBASE_PROJECT_ID?.includes('example');

let adminDb: any;

if (isFirebaseConfigured) {
  if (!admin.apps.length) {
    try {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      });
    } catch (e) {
      console.warn('Failed to initialize real Firebase Admin, falling back to mock store:', e);
    }
  }
  adminDb = admin.apps.length ? admin.firestore() : new MockFirestoreDb();
} else {
  adminDb = new MockFirestoreDb();
}

export { adminDb, isFirebaseConfigured };
