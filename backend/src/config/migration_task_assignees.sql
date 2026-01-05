-- Migration: Add task_assignees table for multiple assignees per task

-- Create the junction table
CREATE TABLE IF NOT EXISTS task_assignees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_task_assignees_task ON task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON task_assignees(user_id);

-- Migrate existing assigned_to data to the new junction table
INSERT INTO task_assignees (task_id, user_id, assigned_at)
SELECT id, assigned_to, updated_at
FROM tasks
WHERE assigned_to IS NOT NULL
ON CONFLICT (task_id, user_id) DO NOTHING;

-- Show migration results
SELECT 'Migration completed!' as status;
SELECT COUNT(*) as tasks_migrated FROM task_assignees;
