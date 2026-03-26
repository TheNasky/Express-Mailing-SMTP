const { ObjectId } = require("mongodb");
const config = require("../config");
const { getDb } = require("../db");

const STATUS_PENDING = "pending";
const STATUS_PROCESSING = "processing";
const STATUS_SENT = "sent";
const STATUS_FAILED = "failed";

class MongoQueue {
  constructor() {
    this.collection = getDb().collection(config.mongo.collection);
  }

  async createIndexes() {
    await this.collection.createIndex(
      { status: 1, priority: 1, scheduled_at: 1 },
      { name: "status_priority_scheduled" }
    );
    await this.collection.createIndex({ status: 1 }, { name: "status_index" });
    await this.collection.createIndex({ created_at: 1 }, { name: "ttl_created_at", expireAfterSeconds: 86400 });
  }

  async enqueue(job) {
    const now = new Date();
    const payload = {
      to: job.to,
      subject: job.subject,
      html: job.html,
      from: job.from,
      status: job.status || STATUS_PENDING,
      priority: job.priority || 2,
      attempts: job.attempts || 0,
      max_attempts: job.max_attempts || 3,
      created_at: job.created_at || now,
      scheduled_at: job.scheduled_at || now
    };

    const result = await this.collection.insertOne(payload);
    return result.insertedId;
  }

  async dequeue() {
    const now = new Date();
    const result = await this.collection.findOneAndUpdate(
      {
        status: { $in: [STATUS_PENDING, STATUS_FAILED] },
        scheduled_at: { $lte: now },
        $expr: { $lt: ["$attempts", "$max_attempts"] }
      },
      {
        $set: { status: STATUS_PROCESSING },
        $inc: { attempts: 1 }
      },
      {
        sort: { priority: 1, created_at: 1 },
        returnDocument: "after"
      }
    );

    return result;
  }

  async markComplete(id, provider, providerMsgID) {
    await this.collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: STATUS_SENT,
          processed_at: new Date(),
          provider,
          provider_msg_id: providerMsgID
        },
        $unset: {
          error_message: ""
        }
      }
    );
  }

  async markFailed(id, errorMessage) {
    await this.collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: STATUS_FAILED,
          error_message: errorMessage
        }
      }
    );
  }

  async getJobById(id) {
    if (!ObjectId.isValid(id)) {
      return null;
    }
    return this.collection.findOne({ _id: new ObjectId(id) });
  }

  async getQueueStats() {
    const grouped = await this.collection
      .aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])
      .toArray();

    const stats = {
      total_queued: 0,
      total_sent: 0,
      total_failed: 0,
      pending_count: 0,
      processing_count: 0,
      queue_size: 0
    };

    for (const item of grouped) {
      if (item._id === STATUS_PENDING) stats.pending_count = item.count;
      if (item._id === STATUS_PROCESSING) stats.processing_count = item.count;
      if (item._id === STATUS_SENT) stats.total_sent = item.count;
      if (item._id === STATUS_FAILED) stats.total_failed = item.count;
    }

    stats.total_queued = stats.pending_count + stats.processing_count;
    stats.queue_size = stats.pending_count;
    return stats;
  }

  async cleanupOldJobs(olderThanMs) {
    const cutoff = new Date(Date.now() - olderThanMs);
    await this.collection.deleteMany({
      status: { $in: [STATUS_SENT, STATUS_FAILED] },
      processed_at: { $lt: cutoff }
    });
  }
}

module.exports = {
  MongoQueue,
  STATUS_PENDING,
  STATUS_PROCESSING,
  STATUS_SENT,
  STATUS_FAILED
};
