-- ClickHouse schema for inference logging

CREATE TABLE IF NOT EXISTS inference_logs (
    request_id      UUID,
    user_id         UUID,
    api_key_prefix  String,
    model           LowCardinality(String),

    -- Request metadata
    input_tokens    UInt32,
    output_tokens   UInt32,
    total_tokens    UInt32,
    max_tokens      UInt32,
    temperature     Float32,
    stream          Bool,

    -- Performance
    time_to_first_token_ms  UInt32,
    total_latency_ms        UInt32,
    worker_id               LowCardinality(String),

    -- Status
    status_code     UInt16,
    error_type      LowCardinality(Nullable(String)),
    finish_reason   LowCardinality(String),

    -- Timestamps
    created_at      DateTime64(3, 'UTC'),

    -- Cost tracking
    estimated_cost_usd  Float64

) ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (user_id, created_at)
TTL created_at + INTERVAL 90 DAY;

-- Materialized view for real-time per-user daily stats
CREATE MATERIALIZED VIEW IF NOT EXISTS user_usage_daily
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (user_id, day, model)
AS SELECT
    user_id,
    toDate(created_at) AS day,
    model,
    count() AS request_count,
    sum(input_tokens) AS total_input_tokens,
    sum(output_tokens) AS total_output_tokens,
    sum(estimated_cost_usd) AS total_cost,
    avg(total_latency_ms) AS avg_latency_ms,
    quantile(0.95)(total_latency_ms) AS p95_latency_ms
FROM inference_logs
GROUP BY user_id, day, model;
