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
    console.error('[db] connection failed:', err);
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    console.error('[db] error:', err);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('[db] disconnected');
  });
}
