import winston from "winston";

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "debug",
    format:
        process.env.NODE_ENV === "production"
            ? winston.format.combine(winston.format.timestamp(), winston.format.json())
            : winston.format.combine(
                  winston.format.colorize(),
                  winston.format.timestamp({ format: "HH:mm:ss" }),
                  winston.format.printf(({ timestamp, level, message, ...meta }) => {
                      const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
                      return `[${timestamp}] ${level}: ${message}${metaStr}`;
                  }),
              ),
    transports: [new winston.transports.Console()],
});

export default logger;
