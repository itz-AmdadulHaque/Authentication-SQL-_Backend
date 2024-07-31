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

app.use(morgan("dev")); // for request logs output

// routes
app.use("/api/v1/users", userRoutes);
app.get('/', (req, res)=>{
  res.status(200).json({
    success: true,
    message: "Server is Ready",
  });
})

//page not found
app.use("*", (req, res) => {
  res.status(404).send("Invalid API Route");
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
