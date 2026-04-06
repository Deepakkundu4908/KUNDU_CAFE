/**
 * Database Configuration
 * Currently using JSON file storage
 * Can be extended to use MongoDB or MySQL
 */

const dbConfig = {
  type: 'mongodb',
  jsonPath: './data',
  
  // MongoDB configuration (when type is 'mongodb')
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/kundu_cafe'
  },

  // MySQL configuration (when type is 'mysql')
  mysql: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'kundu_cafe'
  }
};

module.exports = dbConfig;
