import express from "express";
import dotenv from "dotenv";

dotenv.config({ path: "./src/.env" });

const app = express();

// ENV variables
const PORT = process.env.PORT || 3000;

console.log("DB_URL:", process.env.DB_URL);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});