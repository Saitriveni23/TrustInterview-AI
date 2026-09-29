const { Queue } = require("bullmq");
const { redis } = require("../config/redis");

const QUESTION_QUEUE = "resume-question-generation";
const questionQueue = new Queue(QUESTION_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2_000 },
    removeOnComplete: { age: 86_400, count: 1_000 },
    removeOnFail: false,
  },
});

module.exports = { QUESTION_QUEUE, questionQueue };
