# Claude Development Rules & Guidelines

This file contains strict rules and guidelines that Claude Code must follow when working on this project.

## Git Workflow Rules

### Feature Branch Approach - MANDATORY
- **NEVER work directly on main branch**
- **ALWAYS create feature branches** for any changes, no matter how small
- Feature branch naming convention: `feature/description` or `fix/description`
- Examples:
  - `feature/expense-input-form`
  - `feature/add-charts`
  - `fix/api-validation`
  - `refactor/database-models`

### Branch Management
1. **Before any work**: Create and checkout a new feature branch
2. **During work**: Commit frequently with descriptive messages
3. **After completion**: Push feature branch to GitHub
4. **For integration**: Create pull request, never merge directly to main
5. **Clean up**: Delete feature branches after merging

### Git Commands to Follow
```bash
# Start new feature
git checkout main
git pull origin main
git checkout -b feature/feature-name

# Work and commit
git add .
git commit -m "descriptive message"

# Push feature branch
git push -u origin feature/feature-name

# Create PR via GitHub UI or gh CLI
```

## Development Rules

### Code Quality
- Write clean, readable, and well-documented code
- Follow established patterns in the codebase
- Add error handling and validation
- Write tests for new functionality when applicable

### Commit Messages
- Use clear, descriptive commit messages
- Start with verb in present tense (Add, Fix, Update, Refactor)
- Include context and reasoning when helpful
- Always include the Claude Code footer

### File Organization
- Follow the established project structure
- Place files in appropriate directories
- Don't create unnecessary nested directories
- Keep related functionality together

### Security & Best Practices
- Never commit sensitive information (.env files, secrets, keys)
- Validate all inputs on both frontend and backend
- Use proper error handling
- Follow REST API conventions
- Implement proper CORS and security headers

## Project-Specific Rules

### Backend (Go)
- Follow Go conventions and best practices
- Use structured logging
- Implement proper database transaction handling
- Add request/response validation
- Use dependency injection pattern

### Frontend (React)
- Use TypeScript strictly
- Follow React best practices and hooks patterns
- Implement proper error boundaries
- Use consistent styling approach
- Add proper loading and error states

### Database
- Always use migrations for schema changes
- Never modify data directly in production
- Add proper indexing for performance
- Use foreign key constraints appropriately

## Restrictions

### What NOT to do
- ❌ Never push directly to main branch
- ❌ Never commit without testing locally first
- ❌ Never ignore linting or type checking errors
- ❌ Never hardcode sensitive values
- ❌ Never create overly large commits (break them down)
- ❌ Never merge your own pull requests without review

### Required Actions
- ✅ Always create feature branches
- ✅ Always test changes locally before pushing
- ✅ Always update documentation when needed
- ✅ Always run linting and type checking
- ✅ Always use the TodoWrite tool for complex tasks
- ✅ Always follow the established code patterns

## Emergency Exceptions

The only exceptions to the feature branch rule:
1. **Critical hotfixes** that must be deployed immediately
2. **Documentation-only changes** to README.md or docs
3. **Configuration fixes** that are blocking development

Even in these cases, prefer feature branches when possible.

---

**Remember**: These rules exist to maintain code quality, enable collaboration, and prevent issues. Always follow them unless explicitly overridden by the project owner.