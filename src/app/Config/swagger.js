// swagger.js
// const swaggerJSDoc = require('swagger-jsdoc');
import swaggerJSDoc from 'swagger-jsdoc';
const options = {
  definition: {
    openapi: '3.0.0', // Use OpenAPI 3.0 spec
    info: {
      title: 'Your API Title (e.g., BuyBot Backend API)',
      version: '1.0.0',
      description: 'API documentation for your Node.js backend',
    },
    servers: [
      {
        url: 'http://localhost:5000', // Replace with your server URL (e.g., production URL later)
      },
    ],
  },
  apis: ['./src/app/route/*.js', './src/app/controller/*.js', './src/**/*js'], // Paths to files with JSDoc comments (adjust as needed)
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec; 