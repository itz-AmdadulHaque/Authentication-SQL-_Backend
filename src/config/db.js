import mysql from "mysql2/promise";

const mySqlPool = mysql.createPool({
  host: process.env.HOST,
  port: process.env.DB_PORT,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
});

const initializeDatabase = async () => {
  const connection = await mySqlPool.getConnection();
  try {
    await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          block BOOLEAN DEFAULT FALSE,
          refreshToken VARCHAR(255) DEFAULT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
    console.log("Users table created or already exists");

    // Check if the index on the email column exists
    const [indexes] = await connection.query(`
        SHOW INDEX FROM users WHERE Key_name = 'idx_users_email'
      `);
    if (indexes.length === 0) {
      await connection.query(`
          CREATE UNIQUE INDEX idx_users_email ON users(email)
        `);
      console.log("Index on email column created");
    } else {
      console.log("Index on email column already exists");
    }

    // Check if the index on the id column exists
    const [idIndexes] = await connection.query(`
        SHOW INDEX FROM users WHERE Key_name = 'idx_users_id'
      `);

    if (idIndexes.length === 0) {
      await connection.query(`
          CREATE INDEX idx_users_id ON users(id)
        `);

      console.log("Index on id column created");
    } else {
      console.log("Index on id column  already exists");
    }
  } catch (error) {
    console.error("Error during database initialization:", error);
  } finally {
    connection.release();
  }
};

export default mySqlPool;
export { initializeDatabase };
