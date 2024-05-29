import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";
dotenv.config({ path: "./.env" });

const backendPort = process.env.PORT || 4000;
connectDB()
  .then(() => {
    // error listening for an event
    app.on("error", (error) => {
      console.error("Error occured at app.on : ", error);
      throw error;
    });
    app.listen(backendPort, () =>
      console.log(`Server is running at port : ${backendPort}`)
    );
  })
  .catch((error) => {
    console.error("Mango DB connection failed !");
    throw error;
  });
