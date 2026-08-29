import mongoose from 'mongoose';
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

loadEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const dotenvPath = resolve(__dirname, '../../.env');
loadEnv({ path: dotenvPath, override: false });

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace';

// Migrates legacy PaymentProviderConfig records that used `name` as the
// canonical field (registry previously queried findOne({ name })) to the
// canonical `provider` field used by the schema and the admin API.
async function migrate() {
  await mongoose.connect(uri);
  const raw = await mongoose.connection.db.collection('paymentproviderconfigs');
  const docs = await raw.find({ name: { $exists: true, $ne: null } }).toArray();

  let updated = 0;
  let unchanged = 0;
  for (const doc of docs) {
    if (doc.provider) {
      unchanged++;
      continue;
    }
    await raw.updateOne({ _id: doc._id }, { $set: { provider: doc.name } });
    updated++;
  }

  console.log(`[migrate-payment-provider] provider field: updated=${updated} alreadySet=${unchanged} total=${docs.length}`);
  await mongoose.disconnect();
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[migrate-payment-provider] failed:', err.message);
    process.exit(1);
  });