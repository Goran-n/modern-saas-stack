import { config } from "dotenv";
import type { Config } from "drizzle-kit";

// Load environment variables
config();

export default {
  schema: "./packages/shared-db/src/schemas/*",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;