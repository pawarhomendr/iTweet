import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not defined');

  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('[db] connected to MongoDB');
    } catch (err) {
    console.error(
      '[db] connection failed:',
      err instanceof Error ? err.message : err
    );

    if (err instanceof mongoose.Error.MongooseServerSelectionError) {
      console.error(
        '[db] member details:',
        [...(err as mongoose.Error.MongooseServerSelectionError & {
          reason: { servers: Map<string, { type: string; error?: Error }> };
        }).reason.servers.entries()].map(([address, server]) => ({
          address,
          state: server.type,
          error: server.error?.message ?? 'No specific error reported',
        }))
      );
    }

    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    console.error('[db] error:', err);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('[db] disconnected');
  });
}
