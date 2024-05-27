import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MANGODB_URI}+${DB_NAME}`
    );
    console.log(
      `\n MANGO DB connected !! DB host : ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.error("Mango db connection failed!", error);
    process.exit(1);
  }
};

export default connectDB;
