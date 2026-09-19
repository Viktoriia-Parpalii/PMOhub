import Joi from "joi";

export const environmentSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "test", "production")
    .default("development"),
  EXPOSE_ERROR_DETAILS: Joi.boolean()
    .truthy("true")
    .falsy("false")
    .default(process.env.NODE_ENV !== "production"),
  HTTP_BODY_LIMIT: Joi.string()
    .pattern(/^\d+(kb|mb)$/i)
    .default("10mb"),
  PORT: Joi.number().port().default(4000),
  THROTTLE_TTL_MS: Joi.number().integer().min(1_000).default(60_000),
  THROTTLE_LIMIT: Joi.number().integer().min(10).default(300),
  DATABASE_URL: Joi.string().required(),
  FRONTEND_ORIGIN: Joi.string().default("http://localhost:3000"),
  FRONTEND_ORIGINS: Joi.string().optional(),
  BUSINESS_TIME_ZONE: Joi.string().valid("Europe/Kyiv").default("Europe/Kyiv"),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  ACCESS_TOKEN_TTL: Joi.string().default("15m"),
  REFRESH_TOKEN_DAYS: Joi.number().integer().min(1).default(7),
  COOKIE_SECURE: Joi.boolean()
    .truthy("true")
    .falsy("false")
    .when("NODE_ENV", {
      is: "production",
      then: Joi.boolean().valid(true).default(true),
      otherwise: Joi.boolean().default(false),
    }),
  COOKIE_SAME_SITE: Joi.string().valid("lax", "none").default("lax"),
  EXPORT_MAX_EXCEL_CARDS: Joi.number().integer().min(1).default(20_000),
  EXPORT_MAX_JSON_ROWS: Joi.number().integer().min(1).default(100_000),
});
