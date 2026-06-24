import express from "express";
import checkApiHealth from "../controllers/healthController.js";

const router = express.Router();

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Get API health status
 *     description: Retrieve system health metrics, including uptime, memory usage, and current server time.
 *     responses:
 *       200:
 *         description: API is healthy and running.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: UP
 *                 uptime:
 *                   type: string
 *                   example: 0h 10m 15s
 *                 timestamp:
 *                   type: string
 *                   example: Fri, 12 Jun 2026 10:45:00 GMT
 *                 memory:
 *                   type: object
 *                   properties:
 *                     rss:
 *                       type: integer
 *                     heapTotal:
 *                       type: integer
 *                     heapUsed:
 *                       type: integer
 *                     external:
 *                       type: integer
 *                     arrayBuffers:
 *                       type: integer
 *       503:
 *         description: API is unhealthy or down.
 */
router.get("/health", checkApiHealth);

export default router;
