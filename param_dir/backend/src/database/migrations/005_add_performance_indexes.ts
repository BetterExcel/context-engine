import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add indexes for contexts table
  await knex.schema.alterTable('contexts', (table) => {
    // Index for request_id lookups
    table.index('request_id', 'idx_contexts_request_id');
    
    // Index for context_type filtering
    table.index('context_type', 'idx_contexts_type');
    
    // Index for confidence_score filtering and sorting
    table.index('confidence_score', 'idx_contexts_confidence');
    
    // Index for created_at for time-based queries
    table.index('created_at', 'idx_contexts_created_at');
    
    // Composite index for common query patterns
    table.index(['context_type', 'created_at'], 'idx_contexts_type_created');
    table.index(['request_id', 'context_type'], 'idx_contexts_request_type');
  });

  // Add indexes for sessions table
  await knex.schema.alterTable('sessions', (table) => {
    // Index for user_id lookups
    table.index('user_id', 'idx_sessions_user_id');
    
    // Index for spreadsheet_id lookups
    table.index('spreadsheet_id', 'idx_sessions_spreadsheet_id');
    
    // Index for created_at for time-based queries
    table.index('created_at', 'idx_sessions_created_at');
    
    // Index for updated_at for recent activity queries
    table.index('updated_at', 'idx_sessions_updated_at');
    
    // Composite index for user activity queries
    table.index(['user_id', 'updated_at'], 'idx_sessions_user_activity');
  });

  // Add indexes for feedback table
  await knex.schema.alterTable('feedback', (table) => {
    // Index for request_id lookups
    table.index('request_id', 'idx_feedback_request_id');
    
    // Index for user_satisfaction filtering
    table.index('user_satisfaction', 'idx_feedback_satisfaction');
    
    // Index for created_at for time-based queries
    table.index('created_at', 'idx_feedback_created_at');
    
    // Composite index for satisfaction analysis
    table.index(['user_satisfaction', 'created_at'], 'idx_feedback_satisfaction_time');
  });

  // Add indexes for spreadsheets table
  await knex.schema.alterTable('spreadsheets', (table) => {
    // Index for filename searches
    table.index('filename', 'idx_spreadsheets_filename');
    
    // Index for file_hash for duplicate detection
    table.index('file_hash', 'idx_spreadsheets_hash');
    
    // Index for created_at for time-based queries
    table.index('created_at', 'idx_spreadsheets_created_at');
    
    // Index for file_size for size-based queries
    table.index('file_size', 'idx_spreadsheets_size');
    
    // Composite index for file management queries
    table.index(['filename', 'created_at'], 'idx_spreadsheets_name_time');
  });

  // Create partial indexes for better performance on filtered queries
  await knex.raw(`
    CREATE INDEX CONCURRENTLY idx_contexts_high_confidence 
    ON contexts (created_at DESC) 
    WHERE confidence_score >= 0.8
  `);

  await knex.raw(`
    CREATE INDEX CONCURRENTLY idx_sessions_active 
    ON sessions (updated_at DESC) 
    WHERE updated_at > NOW() - INTERVAL '24 hours'
  `);

  await knex.raw(`
    CREATE INDEX CONCURRENTLY idx_feedback_positive 
    ON feedback (created_at DESC) 
    WHERE user_satisfaction >= 4
  `);

  // Add GIN indexes for JSONB columns for better JSON query performance
  await knex.raw(`
    CREATE INDEX CONCURRENTLY idx_contexts_data_gin 
    ON contexts USING GIN (context_data)
  `);

  await knex.raw(`
    CREATE INDEX CONCURRENTLY idx_sessions_actions_gin 
    ON sessions USING GIN (actions)
  `);

  await knex.raw(`
    CREATE INDEX CONCURRENTLY idx_spreadsheets_metadata_gin 
    ON spreadsheets USING GIN (metadata)
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop GIN indexes
  await knex.raw('DROP INDEX CONCURRENTLY IF EXISTS idx_contexts_data_gin');
  await knex.raw('DROP INDEX CONCURRENTLY IF EXISTS idx_sessions_actions_gin');
  await knex.raw('DROP INDEX CONCURRENTLY IF EXISTS idx_spreadsheets_metadata_gin');

  // Drop partial indexes
  await knex.raw('DROP INDEX CONCURRENTLY IF EXISTS idx_contexts_high_confidence');
  await knex.raw('DROP INDEX CONCURRENTLY IF EXISTS idx_sessions_active');
  await knex.raw('DROP INDEX CONCURRENTLY IF EXISTS idx_feedback_positive');

  // Drop indexes from spreadsheets table
  await knex.schema.alterTable('spreadsheets', (table) => {
    table.dropIndex('filename', 'idx_spreadsheets_filename');
    table.dropIndex('file_hash', 'idx_spreadsheets_hash');
    table.dropIndex('created_at', 'idx_spreadsheets_created_at');
    table.dropIndex('file_size', 'idx_spreadsheets_size');
    table.dropIndex(['filename', 'created_at'], 'idx_spreadsheets_name_time');
  });

  // Drop indexes from feedback table
  await knex.schema.alterTable('feedback', (table) => {
    table.dropIndex('request_id', 'idx_feedback_request_id');
    table.dropIndex('user_satisfaction', 'idx_feedback_satisfaction');
    table.dropIndex('created_at', 'idx_feedback_created_at');
    table.dropIndex(['user_satisfaction', 'created_at'], 'idx_feedback_satisfaction_time');
  });

  // Drop indexes from sessions table
  await knex.schema.alterTable('sessions', (table) => {
    table.dropIndex('user_id', 'idx_sessions_user_id');
    table.dropIndex('spreadsheet_id', 'idx_sessions_spreadsheet_id');
    table.dropIndex('created_at', 'idx_sessions_created_at');
    table.dropIndex('updated_at', 'idx_sessions_updated_at');
    table.dropIndex(['user_id', 'updated_at'], 'idx_sessions_user_activity');
  });

  // Drop indexes from contexts table
  await knex.schema.alterTable('contexts', (table) => {
    table.dropIndex('request_id', 'idx_contexts_request_id');
    table.dropIndex('context_type', 'idx_contexts_type');
    table.dropIndex('confidence_score', 'idx_contexts_confidence');
    table.dropIndex('created_at', 'idx_contexts_created_at');
    table.dropIndex(['context_type', 'created_at'], 'idx_contexts_type_created');
    table.dropIndex(['request_id', 'context_type'], 'idx_contexts_request_type');
  });
}