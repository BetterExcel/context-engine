import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('feedback', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('request_id').notNullable();
    table.jsonb('predicted_context').notNullable();
    table.jsonb('actual_context');
    table.integer('user_satisfaction').checkBetween([1, 5]);
    table.text('comments');
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes for better query performance
    table.index(['request_id']);
    table.index(['user_satisfaction']);
    table.index(['created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('feedback');
}