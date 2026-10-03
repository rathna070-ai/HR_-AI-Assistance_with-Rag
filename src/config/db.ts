import { Db, MongoClient } from "mongodb";

let clientPromise: Promise<MongoClient> | undefined;

const connect = async (): Promise<MongoClient> => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  return MongoClient.connect(uri, { serverSelectionTimeoutMS: 15_000 });
};

// One shared client for the whole process, created on first use.
export const getDb = async (): Promise<Db> => {
  clientPromise ??= connect().catch((err) => {
    clientPromise = undefined; // let the next call try again
    throw err;
  });
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB || "hr_app");
};

export const closeDb = async (): Promise<void> => {
  if (!clientPromise) return;
  const client = await clientPromise.catch(() => undefined);
  clientPromise = undefined;
  await client?.close();
};
