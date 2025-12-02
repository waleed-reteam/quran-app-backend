"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const serverless_http_1 = __importDefault(require("serverless-http"));
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const database_1 = require("../../src/config/database");
const notificationService_1 = require("../../src/services/notificationService");
const aiService_1 = require("../../src/services/aiService");
const routes_1 = __importDefault(require("../../src/routes"));
const errorHandler_1 = require("../../src/middleware/errorHandler");
const rateLimiter_1 = require("../../src/middleware/rateLimiter");
const logger_1 = __importDefault(require("../../src/utils/logger"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const API_VERSION = process.env.API_VERSION || 'v1';
// Middleware
app.use((0, helmet_1.default)()); // Security headers
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
}));
app.use((0, compression_1.default)()); // Compress responses
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Logging
if (process.env.NODE_ENV === 'development') {
    app.use((0, morgan_1.default)('dev'));
}
else {
    app.use((0, morgan_1.default)('combined'));
}
// Rate limiting
app.use(`/api/${API_VERSION}`, rateLimiter_1.apiLimiter);
// Routes
app.get('/', (_req, res) => {
    res.json({
        success: true,
        message: 'Quran App Backend API',
        version: API_VERSION,
        documentation: `/api/${API_VERSION}/docs`,
        health: `/api/${API_VERSION}/health`,
    });
});
app.use(`/api/${API_VERSION}`, routes_1.default);
// Error handling
app.use(errorHandler_1.notFound);
app.use(errorHandler_1.errorHandler);
// Initialize services (only once, reuse connections)
let initialized = false;
const initializeServices = async () => {
    if (initialized) {
        return;
    }
    try {
        // Connect to databases
        await (0, database_1.connectDatabases)();
        logger_1.default.info('All databases connected');
        // Initialize Firebase for push notifications
        (0, notificationService_1.initializeFirebase)();
        // Initialize Pinecone for AI search
        await (0, aiService_1.initializePinecone)();
        initialized = true;
        logger_1.default.info('Services initialized successfully');
    }
    catch (error) {
        logger_1.default.error('Failed to initialize services:', error);
        // Don't throw - allow function to still work without some services
    }
};
// Initialize services on cold start
initializeServices();
// Export the serverless handler
exports.handler = (0, serverless_http_1.default)(app, {
    binary: ['image/*', 'audio/*', 'application/pdf'],
});
//# sourceMappingURL=server.js.map