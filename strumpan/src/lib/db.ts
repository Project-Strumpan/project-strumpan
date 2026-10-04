/*
 * Creates MariaDB database pool
 * Author: Alan Tokarev
 * Date: 2026-10-04
 * Dependencies: .env.local -> (db credentials), mariadb
*/

import mariadb from "mariadb";

export const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    
    connectionLimit: 5,
    acquireTimeout: 10000,
});