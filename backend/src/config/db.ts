import mongoose from 'mongoose';
import dns from 'node:dns';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not defined');

  // Apply custom DNS servers if configured (useful for environments where default local DNS fails SRV lookups)
  const dnsServers = process.env.DNS_SERVERS?.split(',').map(s => s.trim()).filter(Boolean);
  if (dnsServers && dnsServers.length > 0) {
    try {
      dns.setServers(dnsServers);
    } catch (e) {
      console.warn('[db] failed to set custom DNS servers:', e);
    }
  } else if (uri.startsWith('mongodb+srv://')) {
    // Default to Google Public DNS for mongodb+srv connections if no custom DNS is specified
    try {
      dns.setServers(['8.8.8.8', '8.8.4.4']);
    } catch (e) {
      console.warn('[db] failed to set default DNS servers:', e);
    }
  }

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
