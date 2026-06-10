import * as dotenv from "dotenv";
dotenv.config();

import { AppDataSource } from "./config/database";
import { httpServer } from "./app";

const PORT = process.env.PORT || 5000;

AppDataSource.initialize()
  .then(() => {
    console.log("Database connected successfully");

    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => console.log("Database connection failed", error));
