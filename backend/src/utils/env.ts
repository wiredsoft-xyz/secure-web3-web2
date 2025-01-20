// env.ts
import { z } from "zod";

// Define the schema as an object with all of the env
// variables and their types
const envSchema = z.object({
  PORT: z.coerce.number().min(1000).default(3000),
  NODE_ENV: z
    .union([z.literal("dev"), z.literal("test"), z.literal("prod")])
    .default("dev"),
  CHALLENGE_EXP_SECONDS: z.coerce
    .number()
    .positive()
    .default(60)
    .refine((v) => {
      if (process.env.NODE_ENV === "test") return 0.05;
      return v;
    }),
  JWT_AT_SECRET_KEY: z.string().nonempty().min(16).default("verysecretkey!!!"),
  JWT_RT_SECRET_KEY: z.string().nonempty().min(16).default("verysecretkey!!!"),
  JWT_AT_EXP_IN: z.string().nonempty().default("1h"),
  JWT_RT_EXP_IN: z.string().nonempty().default("24h"),
});

// Validate `process.env` against our schema
// and return the result
const env = envSchema.parse(process.env);

// Export the result so we can use it in the project
export default env;
