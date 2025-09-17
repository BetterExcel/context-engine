"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const config = {
    development: {
        client: 'postgresql',
        connection: process.env['DATABASE_URL'] || {
            host: 'localhost',
            port: 5432,
            user: 'postgres',
            password: 'password',
            database: 'excel_context_engine_dev'
        },
        pool: {
            min: 2,
            max: 10
        },
        migrations: {
            tableName: 'knex_migrations',
            directory: './src/database/migrations'
        },
        seeds: {
            directory: './src/database/seeds'
        }
    },
    test: {
        client: 'postgresql',
        connection: process.env['TEST_DATABASE_URL'] || {
            host: 'localhost',
            port: 5432,
            user: 'postgres',
            password: 'password',
            database: 'excel_context_engine_test'
        },
        pool: {
            min: 1,
            max: 5
        },
        migrations: {
            tableName: 'knex_migrations',
            directory: './src/database/migrations'
        },
        seeds: {
            directory: './src/database/seeds'
        }
    },
    production: {
        client: 'postgresql',
        connection: process.env['DATABASE_URL'] || {
            host: 'localhost',
            port: 5432,
            user: 'postgres',
            password: 'password',
            database: 'excel_context_engine_prod'
        },
        pool: {
            min: 2,
            max: 20
        },
        migrations: {
            tableName: 'knex_migrations',
            directory: './src/database/migrations'
        },
        acquireConnectionTimeout: 60000
    }
};
exports.default = config;
//# sourceMappingURL=knexfile.js.map