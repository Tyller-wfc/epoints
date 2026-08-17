require('dotenv').config();
const mysql = require('mysql2/promise');
const getDatabaseConfig = require('./db-config.cjs');

async function migrate() {
  const connection = await mysql.createConnection(getDatabaseConfig());
  const statements = [
    `CREATE TABLE IF NOT EXISTS external_customers (
      id varchar(255) NOT NULL PRIMARY KEY,
      name varchar(120) NOT NULL,
      organization varchar(160) NOT NULL DEFAULT '',
      contact_name varchar(80) NOT NULL DEFAULT '',
      contact_phone_encrypted text NULL,
      service_preferences text NULL,
      enabled tinyint NOT NULL DEFAULT 1,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS service_records (
      id varchar(255) NOT NULL PRIMARY KEY,
      customer_id varchar(255) NOT NULL,
      title varchar(255) NOT NULL,
      service_type varchar(80) NOT NULL,
      description text NOT NULL,
      promised_result text NOT NULL,
      priority varchar(16) NOT NULL DEFAULT 'Normal',
      status varchar(32) NOT NULL DEFAULT 'New',
      service_mode varchar(20) NOT NULL DEFAULT 'Work Hours',
      base_points int NOT NULL DEFAULT 100,
      promised_at timestamp NULL,
      started_at timestamp NULL,
      completed_at timestamp NULL,
      customer_confirmed_at timestamp NULL,
      result_summary text NULL,
      customer_satisfaction varchar(20) NULL,
      created_by varchar(255) NOT NULL,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY service_records_customer (customer_id),
      KEY service_records_status (status),
      CONSTRAINT service_records_customer_fk FOREIGN KEY (customer_id) REFERENCES external_customers(id),
      CONSTRAINT service_records_creator_fk FOREIGN KEY (created_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS service_participants (
      id varchar(255) NOT NULL PRIMARY KEY,
      service_record_id varchar(255) NOT NULL,
      user_id varchar(255) NOT NULL,
      participant_role varchar(32) NOT NULL,
      responsibility text NOT NULL,
      contribution_weight int NOT NULL DEFAULT 100,
      work_summary text NULL,
      UNIQUE KEY service_participant_user (service_record_id, user_id),
      CONSTRAINT service_participant_record_fk FOREIGN KEY (service_record_id) REFERENCES service_records(id) ON DELETE CASCADE,
      CONSTRAINT service_participant_user_fk FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS service_feedback (
      id varchar(255) NOT NULL PRIMARY KEY,
      service_record_id varchar(255) NOT NULL,
      source_type varchar(40) NOT NULL,
      satisfaction_level varchar(20) NOT NULL,
      content text NOT NULL,
      evidence_note text NULL,
      recorded_by varchar(255) NOT NULL,
      occurred_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY service_feedback_record (service_record_id),
      CONSTRAINT service_feedback_record_fk FOREIGN KEY (service_record_id) REFERENCES service_records(id) ON DELETE CASCADE,
      CONSTRAINT service_feedback_recorder_fk FOREIGN KEY (recorded_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS service_evaluations (
      id varchar(255) NOT NULL PRIMARY KEY,
      service_record_id varchar(255) NOT NULL,
      participant_id varchar(255) NOT NULL,
      evaluator_id varchar(255) NOT NULL,
      outcome_score int NOT NULL,
      professionalism_score int NOT NULL,
      initiative_score int NOT NULL,
      warmth_score int NOT NULL,
      fairness_score int NOT NULL,
      collaboration_score int NOT NULL,
      total_score int NOT NULL,
      points_awarded int NOT NULL,
      evaluation_comment text NOT NULL,
      improvement_required text NULL,
      status varchar(20) NOT NULL DEFAULT 'Published',
      evaluated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY service_evaluation_participant (service_record_id, participant_id),
      CONSTRAINT service_evaluation_record_fk FOREIGN KEY (service_record_id) REFERENCES service_records(id) ON DELETE CASCADE,
      CONSTRAINT service_evaluation_participant_fk FOREIGN KEY (participant_id) REFERENCES service_participants(id) ON DELETE CASCADE,
      CONSTRAINT service_evaluation_evaluator_fk FOREIGN KEY (evaluator_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS point_ledger (
      id varchar(255) NOT NULL PRIMARY KEY,
      user_id varchar(255) NOT NULL,
      source_type varchar(24) NOT NULL,
      source_id varchar(255) NOT NULL,
      points_delta int NOT NULL,
      reason text NOT NULL,
      operator_id varchar(255) NOT NULL,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY point_ledger_source (user_id, source_type, source_id),
      KEY point_ledger_user_time (user_id, created_at),
      CONSTRAINT point_ledger_user_fk FOREIGN KEY (user_id) REFERENCES users(id),
      CONSTRAINT point_ledger_operator_fk FOREIGN KEY (operator_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ];
  for (const statement of statements) await connection.query(statement);
  await connection.end();
  console.log('customer service system migration completed');
}

migrate().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
