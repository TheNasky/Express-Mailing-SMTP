const { MongoClient } = require("mongodb");
const config = require("./config");

let client;
let db;

async function connectMongo() {
  if (db) {
    return db;
  }

  client = new MongoClient(config.mongo.uri);
  await client.connect();
  db = client.db(config.mongo.database);
  return db;
}

function getDb() {
  if (!db) {
    throw new Error("MongoDB not connected");
  }
  return db;
}

async function closeMongo() {
  if (client) {
    await client.close();
  }
}

module.exports = {
  connectMongo,
  getDb,
  closeMongo
};
