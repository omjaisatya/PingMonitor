import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { PORT, NODE_ENV } from "./env.config.js";

const port = PORT || 5000;

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "PingMonitor API Documentation",
      version: "1.0.0",
      description: "API documentation for the PingMonitor application. Monitor services, endpoints, synthetic performance, and incident response.",
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: `${NODE_ENV || "development"} environment`,
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT token to authorize requests.",
        },
      },
    },
  },
  apis: ["./src/routes/*.js", "./src/controllers/*.js"],
};

const swaggerSpec = swaggerJSDoc(options);

export { swaggerUi, swaggerSpec };
