export const config = {
    jwtSecret: process.env.JWT_SECRET || "servicehub-dev-secret-change-in-prod",
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "servicehub-refresh-secret-change-in-prod",
    jwtExpiresIn: 900 as number, // 15 minutes in seconds
    jwtRefreshExpiresIn: 604800 as number, // 7 days in seconds
    port: parseInt(process.env.PORT || "5000", 10),
    databaseUrl: process.env.DATABASE_URL || "",
};
