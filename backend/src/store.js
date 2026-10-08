import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');

/**
 * Store interface:
 *   repos.real / repos.test : { bills, payments }
 *     bills    (one per settled month, keyed by `month`): { list(), add(x), remove(key), clear() }
 *     payments (recharges, keyed by `id`)               : { list(), add(x), remove(key), clear() }
 *   getSettings() / setSettings(patch)                  ({ mode, unlock, baselines, rates, audit, pin })
 * Real and test data live in separate files / collections, so test mode never touches real data.
 */

const duplicate = () => Object.assign(new Error('exists'), { code: 'DUPLICATE' });

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}
async function writeJson(file, data) {
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

function fileRepo(name, key, sortBy) {
  const file = path.join(DIR, `${name}.json`);
  let items;
  const load = async () => (items ??= await readJson(file, []));
  return {
    async list() {
      return [...(await load())].sort((a, b) => String(a[sortBy]).localeCompare(String(b[sortBy])));
    },
    async add(item) {
      const all = await load();
      if (all.some((x) => x[key] === item[key])) throw duplicate();
      all.push(item);
      await writeJson(file, all);
      return item;
    },
    async remove(value) {
      const all = await load();
      items = all.filter((x) => x[key] !== value);
      await writeJson(file, items);
    },
    async clear() {
      items = [];
      await writeJson(file, items);
    },
  };
}

const fileScope = (suffix) => ({
  bills: fileRepo(`bills${suffix}`, 'month', 'month'),
  payments: fileRepo(`payments${suffix}`, 'id', 'createdAt'),
});

function fileStore() {
  const settingsFile = path.join(DIR, 'settings.json');
  return {
    kind: 'file',
    repos: { real: fileScope(''), test: fileScope('.test') },
    getSettings: () => readJson(settingsFile, {}),
    async setSettings(patch) {
      const next = { ...(await readJson(settingsFile, {})), ...patch };
      await writeJson(settingsFile, next);
      return next;
    },
  };
}

async function mongoStore(uri) {
  const { default: mongoose } = await import('mongoose');
  await mongoose.connect(uri);

  const Mixed = mongoose.Schema.Types.Mixed;
  const billSchema = () =>
    new mongoose.Schema(
      {
        month: { type: String, required: true, unique: true },
        rate: Number,
        opening: Mixed,
        closing: Mixed,
        payments: Mixed,
        totalPaid: Number,
        result: Mixed,
        createdAt: Date,
      },
      { minimize: false },
    );
  const paymentSchema = () =>
    new mongoose.Schema({ id: { type: String, required: true, unique: true }, date: String, amount: Number, createdAt: String });
  const clean = ({ _id, __v, ...rest }) => rest;

  const repo = async (Model, key, sortBy) => {
    await Model.init(); // make sure the unique index exists
    return {
      async list() {
        return (await Model.find().sort({ [sortBy]: 1 }).lean()).map(clean);
      },
      async add(item) {
        try {
          return clean((await Model.create(item)).toObject());
        } catch (e) {
          throw e.code === 11000 ? duplicate() : e;
        }
      },
      async remove(value) {
        await Model.deleteOne({ [key]: value });
      },
      async clear() {
        await Model.deleteMany({});
      },
    };
  };

  const scope = async (bill, payment, billColl, payColl) => ({
    bills: await repo(mongoose.model(bill, billSchema(), billColl), 'month', 'month'),
    payments: await repo(mongoose.model(payment, paymentSchema(), payColl), 'id', 'createdAt'),
  });

  const Settings = mongoose.model(
    'Setting',
    new mongoose.Schema({ key: { type: String, unique: true }, value: Mixed }, { minimize: false }),
  );

  return {
    kind: 'mongo',
    repos: {
      real: await scope('Bill', 'Payment', 'bills', 'payments'),
      test: await scope('TestBill', 'TestPayment', 'test_bills', 'test_payments'),
    },
    getSettings: async () => (await Settings.findOne({ key: 'app' }).lean())?.value || {},
    async setSettings(patch) {
      const next = { ...((await Settings.findOne({ key: 'app' }).lean())?.value || {}), ...patch };
      await Settings.updateOne({ key: 'app' }, { value: next }, { upsert: true });
      return next;
    },
  };
}

export async function createStore() {
  const uri = process.env.MONGODB_URI?.trim();
  if (uri) {
    const s = await mongoStore(uri);
    console.log('✔ Connected to MongoDB');
    return s;
  }
  console.log('ℹ No MONGODB_URI set — using local file store (backend/data/)');
  return fileStore();
}
