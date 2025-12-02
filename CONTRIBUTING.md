# Contributing to Paws & Pedigrees

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Process](#development-process)
- [Style Guidelines](#style-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

---

## Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

**Positive behavior includes:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards others

**Unacceptable behavior includes:**
- Trolling, insulting/derogatory comments, personal attacks
- Public or private harassment
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate

---

## Getting Started

### Prerequisites

- Node.js 18+
- Git
- GitHub account
- Basic knowledge of:
  - React & TypeScript
  - Git workflow
  - Web development

### Initial Setup

1. **Fork the repository**
   - Click "Fork" button on GitHub

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/paws-and-pedigrees.git
   cd paws-and-pedigrees
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/original/paws-and-pedigrees.git
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

6. **Run development server**
   ```bash
   npm run dev
   ```

---

## How to Contribute

### Types of Contributions

We welcome many types of contributions:

#### 🐛 Bug Fixes
- Fix existing bugs
- Add test coverage
- Improve error handling

#### ✨ New Features
- Implement new game features
- Add new dog breeds
- Create new achievements
- Add new competition types

#### 📝 Documentation
- Improve existing docs
- Add examples
- Fix typos
- Translate docs

#### 🎨 Design & UI
- Improve user interface
- Add animations
- Enhance user experience
- Create assets

#### 🧪 Tests
- Add missing tests
- Improve test coverage
- Add integration tests
- Add E2E tests

#### ⚡ Performance
- Optimize rendering
- Reduce bundle size
- Improve load time
- Add caching

---

## Development Process

### 1. Find or Create an Issue

- Browse [existing issues](https://github.com/your-repo/paws-and-pedigrees/issues)
- Comment on issue to claim it
- Or create new issue for discussion

### 2. Create a Branch

```bash
# Update your fork
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b bugfix/issue-description
```

### 3. Make Changes

- Write code
- Add tests
- Update documentation
- Test locally

### 4. Test Your Changes

```bash
# Run tests
npm test

# Check coverage
npm run test:coverage

# Lint code
npm run lint

# Build project
npm run build
```

### 5. Commit Changes

```bash
git add .
git commit -m "feat: add new feature"
```

See [Commit Guidelines](#commit-guidelines) for commit message format.

### 6. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create Pull Request on GitHub.

---

## Style Guidelines

### TypeScript

- Use TypeScript for all new code
- Define interfaces for all props
- Avoid `any` type
- Use strict type checking

```typescript
// ✅ Good
interface DogCardProps {
  dog: Dog;
  onClick: (dog: Dog) => void;
}

// ❌ Bad
function DogCard(props: any) {
  // ...
}
```

### React Components

- Use functional components
- Use TypeScript interfaces for props
- Extract complex logic to hooks
- Keep components focused and small

```typescript
// ✅ Good
export const DogCard: React.FC<DogCardProps> = ({ dog, onClick }) => {
  return (
    <div onClick={() => onClick(dog)}>
      {dog.name}
    </div>
  );
};
```

### File Naming

- **Components**: `PascalCase.tsx` (e.g., `DogCard.tsx`)
- **Utilities**: `camelCase.ts` (e.g., `calculations.ts`)
- **Types**: `camelCase.ts` (e.g., `index.ts`)
- **Tests**: `ComponentName.test.tsx`

### Code Formatting

- Use Prettier for formatting
- 2 spaces for indentation
- Single quotes for strings
- Semicolons required
- Trailing commas in multiline

```bash
# Format code
npm run format

# Check formatting
npm run format:check
```

### CSS/Styling

- Use Tailwind CSS utilities
- Create custom classes only when necessary
- Follow mobile-first approach
- Use consistent spacing scale

```tsx
// ✅ Good
<div className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow">
  {content}
</div>

// ❌ Bad
<div style={{ display: 'flex', padding: '16px' }}>
  {content}
</div>
```

---

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/).

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Code style (formatting, missing semi-colons)
- `refactor:` - Code refactoring
- `perf:` - Performance improvement
- `test:` - Adding tests
- `chore:` - Build process or auxiliary tool changes

### Examples

```bash
# Simple feature
git commit -m "feat: add dog feeding animation"

# Bug fix with scope
git commit -m "fix(training): correct TP calculation"

# Breaking change
git commit -m "feat!: redesign kennel layout

BREAKING CHANGE: kennel component API changed"

# With issue reference
git commit -m "fix: resolve memory leak in dog list

Fixes #123"
```

### Best Practices

- Use present tense ("add feature" not "added feature")
- Use imperative mood ("move cursor to..." not "moves cursor to...")
- First line should be 50 characters or less
- Reference issues and PRs when applicable
- Explain what and why, not how

---

## Pull Request Process

### Before Submitting

- [ ] Tests pass (`npm test`)
- [ ] Code is linted (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Documentation updated
- [ ] Commits follow guidelines
- [ ] Branch is up to date with main

### PR Title

Follow same format as commit messages:

```
feat: add new dog breed system
fix(competitions): correct score calculation
docs: update API documentation
```

### PR Description

Include:

1. **Description** - What does this PR do?
2. **Motivation** - Why is this change needed?
3. **Changes** - List of changes made
4. **Screenshots** - For UI changes
5. **Testing** - How was this tested?
6. **Checklist** - Confirm all items completed

**Template:**

```markdown
## Description
Brief description of changes

## Motivation
Why this change is needed

## Changes
- Added X
- Updated Y
- Fixed Z

## Screenshots
[If applicable]

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing performed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests added/updated
- [ ] All tests passing
```

### Review Process

1. **Automated Checks**
   - Tests must pass
   - Linting must pass
   - Build must succeed

2. **Code Review**
   - At least one approval required
   - Address all comments
   - Resolve all conversations

3. **Merge**
   - Squash and merge (typically)
   - Delete branch after merge

---

## Reporting Bugs

### Before Submitting

- Check [existing issues](https://github.com/your-repo/paws-and-pedigrees/issues)
- Try latest version
- Collect relevant information

### Bug Report Template

```markdown
**Describe the bug**
Clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g., Windows 10]
- Browser: [e.g., Chrome 96]
- Version: [e.g., 1.2.3]

**Additional context**
Any other relevant information.
```

---

## Suggesting Features

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
Clear description of the problem.

**Describe the solution**
Clear description of what you want to happen.

**Describe alternatives**
Alternative solutions or features you've considered.

**Additional context**
Mockups, examples, or any other context.
```

### Feature Discussion

1. Open issue with feature request
2. Discuss with maintainers
3. Get approval before implementing
4. Follow development process

---

## Community

### Getting Help

- **Documentation**: Check `docs/` folder
- **Issues**: Search existing issues
- **Discussions**: Use GitHub Discussions
- **Discord**: Join our Discord server

### Staying Updated

- Watch repository for notifications
- Star the project
- Follow on Twitter

### Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- Hall of Fame (for significant contributions)

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

## Questions?

If you have questions about contributing, please:
1. Check the documentation
2. Search existing issues
3. Open a new discussion
4. Contact maintainers

Thank you for contributing to Paws & Pedigrees! 🐕
