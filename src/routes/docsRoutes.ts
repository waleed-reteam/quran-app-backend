import express, { Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "../../swagger.json";

const router = express.Router();

// Check if we're in a serverless environment
const isServerless = 
  !!process.env.NETLIFY || 
  !!process.env.AWS_LAMBDA_FUNCTION_NAME || 
  !!process.env.VERCEL ||
  process.cwd().startsWith('/var/task');

// Update swagger document servers based on NODE_ENV
if (process.env.NODE_ENV === 'production') {
  swaggerDocument.servers = [
    {
      url: "https://taqwa-api.netlify.app/api/v1",
      description: "Production server (Netlify)",
    },
  ];
} else {
  // Development environment
  swaggerDocument.servers = [
    {
      url: "http://localhost:5000/api/v1",
      description: "Development server",
    },
  ];
}

// Serve Swagger UI - use CDN in serverless environments
if (isServerless) {
  // In serverless, serve HTML with CDN assets
  router.get("/", (_req: Request, res: Response) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Quran App API Documentation</title>
          <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.30.2/swagger-ui.css" />
          <style>
            .swagger-ui .topbar { display: none; }
            body { margin: 0; padding: 20px; }
          </style>
        </head>
        <body>
          <div id="swagger-ui"></div>
          <script src="https://unpkg.com/swagger-ui-dist@5.30.2/swagger-ui-bundle.js"></script>
          <script src="https://unpkg.com/swagger-ui-dist@5.30.2/swagger-ui-standalone-preset.js"></script>
          <script>
            window.onload = function() {
              const spec = ${JSON.stringify(swaggerDocument)};
              SwaggerUIBundle({
                spec: spec,
                dom_id: '#swagger-ui',
                presets: [
                  SwaggerUIBundle.presets.apis,
                  SwaggerUIBundle.presets.standalone
                ]
              });
            };
          </script>
        </body>
      </html>
    `);
  });
} else {
  // In non-serverless, use standard Swagger UI Express
  router.use("/", swaggerUi.serve);
  router.get(
    "/",
    swaggerUi.setup(swaggerDocument, {
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "Quran App API Documentation",
    })
  );
}

// Always provide JSON endpoint as fallback
router.get("/json", (_req: Request, res: Response) => {
  res.json(swaggerDocument);
});

export default router;
