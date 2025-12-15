# Contributing to SplitDumb

Thank you for your interest in contributing to SplitDumb! This document provides guidelines and instructions for contributing.

## Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

**Positive behavior includes:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behavior includes:**
- Trolling, insulting/derogatory comments, and personal attacks
- Public or private harassment
- Publishing others' private information without permission
- Other conduct which could reasonably be considered inappropriate

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the issue
- **Expected behavior**
- **Actual behavior**
- **Screenshots** if applicable
- **Environment details** (OS, browser, versions)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Clear title and description**
- **Use case** - why this enhancement would be useful
- **Possible implementation** (optional)
- **Mockups or examples** (optional)

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following our coding standards
3. **Add tests** if you've added code that should be tested
4. **Update documentation** if you've changed APIs or features
5. **Ensure tests pass** by running the test suite
6. **Follow commit message conventions** (see below)
7. **Submit your pull request**

## Development Process

### Setting Up Development Environment

See [DEVELOPMENT.md](DEVELOPMENT.md) for detailed setup instructions.

### Branch Naming

Use descriptive branch names with prefixes:

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or updates
- `chore/` - Maintenance tasks

Examples:
```
feature/add-recurring-expenses
fix/balance-calculation-bug
docs/update-api-examples
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Changes to build process or auxiliary tools

**Examples:**
```
feat(expenses): add support for recurring expenses

fix(balance): correct debt simplification algorithm for edge case

docs(api): add examples for expense endpoints

test(auth): add unit tests for password validation
```

### Coding Standards

#### Python (Backend)

- Follow [PEP 8](https://pep8.org/)
- Use type hints
- Write docstrings for all public functions/classes
- Keep functions small and focused
- Maximum line length: 100 characters

```python
def calculate_balance(user_id: str, group_id: str) -> float:
    """Calculate user's balance in a group.
    
    Args:
        user_id: The user's unique identifier
        group_id: The group's unique identifier
        
    Returns:
        The user's net balance (positive if owed, negative if owing)
        
    Raises:
        ValueError: If user or group not found
    """
    pass
```

#### TypeScript (Frontend)

- Use ESLint with Airbnb config
- Prefer interfaces over types
- Use async/await over promises
- Write JSDoc comments for public functions
- Maximum line length: 100 characters

```typescript
/**
 * Calculate user's balance in a group
 * @param userId The user's unique identifier
 * @param groupId The group's unique identifier
 * @returns The user's net balance
 */
async function calculateBalance(userId: string, groupId: string): Promise<number> {
  // Implementation
}
```

### Testing

- Write tests for new features
- Update tests when modifying existing features
- Ensure all tests pass before submitting PR
- Aim for >80% code coverage for backend
- Aim for >70% code coverage for frontend

#### Running Tests

```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
```

### Documentation

- Update README.md if you change functionality
- Update API.md if you change API endpoints
- Update DATABASE.md if you change schema
- Add inline comments for complex logic
- Write clear commit messages

## Pull Request Process

1. **Update documentation** with details of changes
2. **Update CHANGELOG.md** with your changes
3. **Ensure all tests pass** and add new tests if needed
4. **Update version numbers** if applicable
5. **Request review** from maintainers
6. **Address review feedback** promptly
7. **Squash commits** if requested
8. **Wait for approval** before merging

### PR Checklist

- [ ] Code follows the project's style guidelines
- [ ] Self-review of code completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated and passing
- [ ] No new warnings generated
- [ ] Dependent changes merged
- [ ] CHANGELOG.md updated

## Code Review Guidelines

### For Authors

- Keep PRs small and focused
- Respond to feedback constructively
- Be patient with reviewers
- Update PR based on feedback

### For Reviewers

- Be respectful and constructive
- Explain reasoning for suggestions
- Approve when satisfied
- Request changes if needed

## Community

### Communication Channels

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - General questions and discussions
- **Discord** - Real-time chat and support
- **Email** - security@splitdumb.com (for security issues only)

### Getting Help

- Check [DEVELOPMENT.md](DEVELOPMENT.md) for setup help
- Search existing issues before creating new ones
- Ask questions in GitHub Discussions
- Join our Discord for real-time help

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project website (when available)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

If you have questions about contributing, please:
1. Check existing documentation
2. Search closed issues
3. Ask in GitHub Discussions
4. Contact maintainers

Thank you for contributing to SplitDumb! 🎉
