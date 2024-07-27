import "dotenv/config";
import express from "express";
import morgan from "morgan";
import db from "./config/db.js";
import { initializeDatabase } from "./config/db.js";
import cors from 'cors'
import { corsOptions } from "./config/corsOptions.js";
import cookieParser from "cookie-parser";
import userRoutes from "./routes/user.route.js";


const app = express();

// middleware
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());

app.use(morgan("dev")); // for request logs

// routes
app.use("/api/v1/users", userRoutes);


//testing routes
app.get("/testAdd", async (req, res) => {
  try {
    const users = [
      { email: 'user1@example.com', password: 'hashed_password1', name: 'User 1', block: false, refreshToken: null },
      { email: 'user2@example.com', password: 'hashed_password2', name: 'User 2', block: true, refreshToken: null },
      { email: 'user3@example.com', password: 'hashed_password3', name: 'User 3', block: false, refreshToken: null },
    ];
    
    const values = users.map(user => [user.email, user.password, user.name, user.block, user.refreshToken]);
    console.log("values: ", values)
    const query = `INSERT INTO users (email, password, name, block, refreshToken) VALUES ?`;
    
    const [results] = await db.query(query, [values]);
    // await db.query('DROP TABLE users')
    res.status(200).json({ message: "Success!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error inserting data" });
  }
});

app.get("/testGet", async (req, res) => {
  try {
    // Assuming you have a connection pool named `mySqlPool`
    const [data] = await db.query("SELECT * FROM users");
    res.status(200).json({ message: "Success!", data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error inserting data" });
  }
});


//page not found
app.use("*", (req, res) => {
  console.log("//Invalid Route");
  res.status(404).send("Invalid Route");
});

// catch all error (including custom throw errors)
app.use((error, req, res, next) => {
  console.log("//Error: \n", error);
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Something went wrong",
  });
  next();
});




const PORT = process.env.PORT || 8080;

db.query("SELECT 1")
  .then(() => {
    // Initialize database
    return initializeDatabase();
  })
  .then(() => {
    //my sql
    console.log("MySQL DB Connected");

    app.listen(PORT, () => console.log(`server started at ${PORT}`));
  })
  .catch((error) => {
    console.log("Error Connecting DB");
    console.log(error);
    process.exit(1);
  });
