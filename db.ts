import { RedisClient } from "jsr:@iuioiua/redis";

let redisClient: RedisClient | null = null;

// get the env variables from the .env file
const HOSTNAME = Deno.env.get("REDIS_HOST");
const USERNAME = Deno.env.get("REDIS_USERNAME");
const PASSWORD = Deno.env.get("REDIS_PASSWORD");

export async function connectDb() {
  // Return existing connection if available
  if (redisClient) {
    return redisClient;
  }

  try {
    const redisConn = await Deno.connect({
      port: 13346,
      hostname: HOSTNAME,
    });

    redisClient = new RedisClient(redisConn);
    await redisClient.sendCommand(["AUTH", USERNAME!, PASSWORD!]);

    // Only log on initial connection
    console.log("Connected to Redis!");

    return redisClient;
  } catch (error) {
    console.log("Error connecting to Redis:", error);
    Deno.exit(1);
  }
}

// Optional: Add a function to close the connection when needed
export function closeRedisConnection() {
  if (redisClient) {
    // Close the underlying connection
    try {
      // @ts-ignore - accessing private property for cleanup
      redisClient._conn.close();
      redisClient = null;
    } catch (error) {
      console.error("Error closing Redis connection:", error);
    }
  }
}
