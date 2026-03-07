import mongoose from "mongoose";
import logger from "../utils/logger";

export async function connectDB(): Promise<void> {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/battleship";

    mongoose.connection.on("connected", () => {
        logger.info("MongoDB connected", { uri });
    });

    mongoose.connection.on("error", (err) => {
        logger.error("MongoDB connection error", { error: err.message });
    });

    mongoose.connection.on("disconnected", () => {
        logger.warn("MongoDB disconnected");
    });

    try {
        await mongoose.connect(uri);
    } catch (error) {
        logger.error("Failed to connect to MongoDB", {
            error: error instanceof Error ? error.message : error,
        });
        process.exit(1);
    }
}
