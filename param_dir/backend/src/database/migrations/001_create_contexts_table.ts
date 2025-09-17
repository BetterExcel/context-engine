import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('contexts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('request_id').notNullable();
    table.string('context_type', 50).notNullable();
    table.jsonb('context_data').notNullable();
    table.decimal('confidence_score', 3, 2);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes for better query performance
    table.index(['request_id']);
    table.index(['context_type']);
    table.index(['created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('contexts');
}