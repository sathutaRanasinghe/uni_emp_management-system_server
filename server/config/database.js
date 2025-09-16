import mysql from 'mysql2/promise';
import { config } from 'dotenv';

config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'university_ems',
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
};

let pool;

try {
  pool = mysql.createPool(dbConfig);
  console.log('Database connection pool created successfully');
} catch (error) {
  console.error('Error creating database connection pool:', error);
}

export { pool };