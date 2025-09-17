import type { Knex } from 'knex';
import dotenv from 'dotenv';

dotenv.config();

const config: { [key: string]: Knex.Config } = {
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

export default config;