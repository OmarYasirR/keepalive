import { MongoClient } from "mongodb";

const targets = Object.entries(process.env).filter(
  ([key, value]) => key.startsWith("MONGODB_URI_") && value
);

if (targets.length === 0) {
  console.error("No MONGODB_URI_* variables found");
  process.exit(1);
}

async function ping(name, uri) {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
  try {
    await client.connect();
    const db = client.db();
    const collections = await db.listCollections({}, { nameOnly: true }).toArray();
    if (collections.length > 0) {
      await db.collection(collections[0].name).findOne({});
    } else {
      await db.command({ ping: 1 });
    }
    console.log(`${name}: ok`);
  } finally {
    await client.close();
  }
}

const results = await Promise.allSettled(
  targets.map(([key, uri]) => ping(key.replace("MONGODB_URI_", ""), uri))
);

let failed = false;
results.forEach((r, i) => {
  if (r.status === "rejected") {
    failed = true;
    console.error(`${targets[i][0]}: FAILED - ${r.reason.message}`);
  }
});

process.exit(failed ? 1 : 0);
