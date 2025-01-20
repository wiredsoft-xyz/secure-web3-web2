/* eslint-disable @typescript-eslint/no-misused-promises */
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import cors from "cors";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { createOpenApiExpressMiddleware } from "trpc-to-openapi";
import { createContext } from "./trpc/context";
import { appRouter, openApiDocument } from "./trpc/trpc";

const server = express();

// Setup CORS
server.use(cors());

// Handle incoming tRPC requests
server.use(
  "/api/trpc",
  createExpressMiddleware({ router: appRouter, createContext })
);
// Handle incoming OpenAPI requests
server.use(
  "/api",
  createOpenApiExpressMiddleware({ router: appRouter, createContext })
);

// Serve Swagger UI with our OpenAPI schema
server.use("/docs", swaggerUi.serve);
server.get("/docs", swaggerUi.setup(openApiDocument));

export default server;
