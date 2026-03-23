import winston from "winston";
import path from "path";

const logsDir = path.join(__dirname, "../../logs");

const fileFormat = winston.format.combine(winston.format.timestamp(), winston.format.json());

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "debug",
    format:
        process.env.NODE_ENV === "production"
            ? fileFormat
            : winston.format.combine(
                  winston.format.colorize(),
                  winston.format.timestamp({ format: "HH:mm:ss" }),
                  winston.format.printf(({ timestamp, level, message, ...meta }) => {
                      const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
                      return `[${timestamp}] ${level}: ${message}${metaStr}`;
                  }),
              ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({
            filename: path.join(logsDir, "error.log"),
            level: "error",
            format: fileFormat,
            maxsize: 5 * 1024 * 1024, // 5 MB
            maxFiles: 5,
        }),
        new winston.transports.File({
            filename: path.join(logsDir, "combined.log"),
            format: fileFormat,
            maxsize: 10 * 1024 * 1024, // 10 MB
            maxFiles: 5,
        }),
    ],
});

export default logger;
