// setup_db.js
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function run() {
  console.log('Starting DB setup...');
  
  // Connect without DB first to create database
  const connection = await mysql.createConnection({
    host:     process.env.DB_HOST || 'localhost',
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    const sqlPath = path.join(__dirname, 'urticaria_db.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Split statements (simple parser splitting by semicolon, ignoring inside quotes is basic, but our script is simple)
    // We can also split by line or clean up. Let's do it statement by statement.
    const statements = sqlContent
      .split(/;\r?\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (let statement of statements) {
      if (statement.startsWith('USE ')) {
        const dbName = statement.replace('USE', '').replace(/[`]/g, '').replace(';', '').trim();
        console.log(`Switching to database: ${dbName}`);
        await connection.query(`USE \`${dbName}\``);
      } else {
        // console.log(`Executing: ${statement.slice(0, 100)}...`);
        await connection.query(statement);
      }
    }

    console.log('✅ Database setup completed successfully!');
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
  } finally {
    await connection.end();
  }
}

run();
