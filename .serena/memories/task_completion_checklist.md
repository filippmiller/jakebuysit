# Task Completion Checklist

When a task is complete, you MUST:

## 1. Code Quality
- [ ] Run TypeScript type check: `npm run type-check`
- [ ] Run linting: `npm run lint`
- [ ] Run tests (if applicable): `npm test`
- [ ] Fix all errors and warnings

## 2. Beads Issue Management
- [ ] Update issue status: `bd update <id> --status completed`
- [ ] Close the issue: `bd close <id> --reason "Description of work done"`
- [ ] Create new issues for follow-up work if needed

## 3. Git Workflow
- [ ] Stage all changes: `git add -A`
- [ ] Commit with descriptive message:
```bash
git commit -m "type(scope): description

- What was changed
- Why it was changed

Co-Authored-By: Claude <noreply@anthropic.com>"
```
- [ ] Pull latest changes: `git pull --rebase`
- [ ] Push to remote: `git push`
- [ ] Verify: `git status` shows "up to date with origin"

## 4. Documentation
- [ ] Update work log: `.claude/work-log.md`
- [ ] Complete session notes: `.claude/sessions/YYYY-MM-DD-HHMMSS.md`

## 5. Session End Protocol
- [ ] Sync Beads: `bd sync --flush-only`
- [ ] Verify all changes committed and pushed
- [ ] Clean up any temporary files or stashes

## Common Git Commit Types
- `feat`: New feature
- `fix`: Bug fix
- `chore`: Maintenance, config, dependencies
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Test changes
- `style`: Formatting, no code change
