CREATE TABLE workflow_defs (
    namespace VARCHAR(36) CHARACTER SET latin1 COLLATE latin1_general_cs NOT NULL,
    id VARCHAR(512) CHARACTER SET latin1 COLLATE latin1_general_cs NOT NULL,
    description LONGTEXT NOT NULL,
    definition_json LONGTEXT NOT NULL,
    created_at_epoch_ms BIGINT NOT NULL,
    updated_at_epoch_ms BIGINT NOT NULL,
    PRIMARY KEY (namespace, id)
) ENGINE = InnoDB;

CREATE TABLE function_defs (
    namespace VARCHAR(36) CHARACTER SET latin1 COLLATE latin1_general_cs NOT NULL,
    id VARCHAR(512) CHARACTER SET latin1 COLLATE latin1_general_cs NOT NULL,
    definition_json LONGTEXT NOT NULL,
    created_at_epoch_ms BIGINT NOT NULL,
    updated_at_epoch_ms BIGINT NOT NULL,
    PRIMARY KEY (namespace, id)
) ENGINE = InnoDB;

CREATE TABLE workflow_instances (
    namespace VARCHAR(36) CHARACTER SET latin1 COLLATE latin1_general_cs NOT NULL,
    id VARCHAR(512) CHARACTER SET latin1 COLLATE latin1_general_cs NOT NULL,
    workflow_def_id VARCHAR(512) CHARACTER SET latin1 COLLATE latin1_general_cs NOT NULL,
    version BIGINT NOT NULL,
    status VARCHAR(32) CHARACTER SET latin1 COLLATE latin1_general_cs NOT NULL,
    trigger_input_json LONGTEXT,
    pinned_worker_host_id VARCHAR(1024),
    created_at_epoch_ms BIGINT NOT NULL,
    modified_at_epoch_ms BIGINT NOT NULL,
    completed_at_epoch_ms BIGINT,
    PRIMARY KEY (namespace, id),
    CONSTRAINT workflow_instances_workflow_def_fk
        FOREIGN KEY (namespace, workflow_def_id)
        REFERENCES workflow_defs (namespace, id),
    INDEX workflow_instances_workflow_def_idx (namespace, workflow_def_id),
    INDEX workflow_instances_status_idx (namespace, status),
    INDEX workflow_instances_modified_idx (namespace, modified_at_epoch_ms DESC, id DESC),
    INDEX workflow_instances_status_modified_idx (
        namespace,
        status,
        modified_at_epoch_ms DESC,
        id DESC
    ),
    INDEX workflow_instances_workflow_def_modified_idx (
        namespace,
        workflow_def_id,
        modified_at_epoch_ms DESC,
        id DESC
    ),
    INDEX workflow_instances_recovery_idx (
        status,
        modified_at_epoch_ms DESC,
        id DESC,
        namespace DESC
    )
) ENGINE = InnoDB;

CREATE TABLE workflow_tasks (
    namespace VARCHAR(36) CHARACTER SET latin1 COLLATE latin1_general_cs NOT NULL,
    workflow_instance_id VARCHAR(512) CHARACTER SET latin1 COLLATE latin1_general_cs NOT NULL,
    task_attempt_id VARCHAR(512) CHARACTER SET latin1 COLLATE latin1_general_cs NOT NULL,
    task_def_id VARCHAR(512) CHARACTER SET latin1 COLLATE latin1_general_cs NOT NULL,
    status VARCHAR(32) CHARACTER SET latin1 COLLATE latin1_general_cs NOT NULL,
    status_json LONGTEXT NOT NULL,
    satisfaction_status LONGTEXT NOT NULL,
    generation_index BIGINT NOT NULL,
    human_input_json LONGTEXT,
    input_data_json LONGTEXT NOT NULL,
    input_mapping_json LONGTEXT NOT NULL,
    output_data_json LONGTEXT,
    verifier_metadata_json LONGTEXT,
    PRIMARY KEY (namespace, workflow_instance_id, task_attempt_id),
    CONSTRAINT workflow_tasks_instance_fk
        FOREIGN KEY (namespace, workflow_instance_id)
        REFERENCES workflow_instances (namespace, id)
        ON DELETE CASCADE,
    INDEX workflow_tasks_instance_status_idx (
        namespace,
        workflow_instance_id,
        status
    ),
    INDEX workflow_tasks_instance_task_def_idx (
        namespace,
        workflow_instance_id,
        task_def_id
    )
) ENGINE = InnoDB;

CREATE TABLE workflow_verifier_states (
    namespace VARCHAR(36) CHARACTER SET latin1 COLLATE latin1_general_cs NOT NULL,
    workflow_instance_id VARCHAR(512) CHARACTER SET latin1 COLLATE latin1_general_cs NOT NULL,
    verifier_task_id VARCHAR(512) CHARACTER SET latin1 COLLATE latin1_general_cs NOT NULL,
    state_json LONGTEXT NOT NULL,
    PRIMARY KEY (namespace, workflow_instance_id, verifier_task_id),
    CONSTRAINT workflow_verifier_states_instance_fk
        FOREIGN KEY (namespace, workflow_instance_id)
        REFERENCES workflow_instances (namespace, id)
        ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE workflow_events (
    namespace VARCHAR(36) CHARACTER SET latin1 COLLATE latin1_general_cs NOT NULL,
    workflow_instance_id VARCHAR(512) CHARACTER SET latin1 COLLATE latin1_general_cs NOT NULL,
    event_sequence BIGINT NOT NULL,
    created_at_epoch_ms BIGINT NOT NULL,
    event_json LONGTEXT NOT NULL,
    PRIMARY KEY (namespace, workflow_instance_id, event_sequence),
    CONSTRAINT workflow_events_instance_fk
        FOREIGN KEY (namespace, workflow_instance_id)
        REFERENCES workflow_instances (namespace, id)
        ON DELETE CASCADE
) ENGINE = InnoDB;
