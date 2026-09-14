-- ============================================
-- Add a real "completed" state to service_requests
-- ============================================
-- Until now, "Mark Complete" on the provider navigate page only updated
-- local component state -- nothing was ever persisted, so there was no way
-- to build a job history for either side. This adds the missing status and
-- timestamp so completion is real, queryable data.
--
-- NOTE: ALTER TYPE ... ADD VALUE cannot run in the same transaction as a
-- statement that uses the new value, so apply this in its own migration
-- step, separate from anything that references 'completed'.
-- ============================================

ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'completed';
