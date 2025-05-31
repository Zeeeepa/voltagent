-- Add a new codebase to the system
-- Parameters: name, description, github_url, github_owner, github_repo, linear_project_id

INSERT INTO codebases (
    name,
    description,
    github_url,
    github_owner,
    github_repo,
    default_branch,
    linear_project_id,
    webhook_secret,
    status
) VALUES (
    $1, -- name
    $2, -- description
    $3, -- github_url
    $4, -- github_owner
    $5, -- github_repo
    COALESCE($6, 'main'), -- default_branch
    $7, -- linear_project_id
    encode(gen_random_bytes(32), 'hex'), -- webhook_secret (auto-generated)
    'active'::codebase_status_enum
)
RETURNING 
    id,
    name,
    github_url,
    webhook_secret,
    status,
    created_at;

