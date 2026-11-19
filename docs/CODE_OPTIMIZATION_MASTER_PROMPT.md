# MASTER PROMPT: CivicSetu – Complete Code Quality, Performance, Security & Evaluation Optimization

Act as a Senior Full-Stack Engineer, Software Architect, Application Security Engineer, Performance Engineer, and QA Specialist.

Your task is to thoroughly audit, optimize, and improve my existing CivicSetu application to achieve the highest possible AI evaluation score without compromising existing functionality.

## 1. Current AI Evaluation Results

| Evaluation Category | Current Score | Target |
|---|---:|---:|
| Code Quality | 86 | 95+ |
| Security | 98 | 98–100 |
| Efficiency | 80 | 95+ |
| Testing | 94 | 98+ |
| Accessibility | 96 | 98+ |
| Problem Statement Alignment | 98 | 98–100 |
| **Overall** | **92.89** | **95–98+** |

These are targets, not guaranteed results. Never manipulate evaluation metrics or claim improvements without evidence.

## 2. Critical Rules

Before making any changes:

1. Inspect the complete existing project structure.
2. Understand the current architecture, dependencies, APIs, database, and application workflows.
3. Identify existing working features and potential regressions.
4. Run the existing production build and tests to establish a baseline.
5. Create a detailed list of problems and proposed improvements.

**Do not rebuild the application from scratch.**

**Do not unnecessarily redesign the UI.**

**Do not delete working features.**

**Do not replace real functionality with mock data.**

**Do not weaken existing security measures.**

**Do not introduce unnecessary dependencies or overengineering.**

Make changes incrementally and verify each important change.

## 3. Code Quality Optimization

Current score: 86/100. Target: 95+/100.

- Remove unused imports, variables, functions, and dependencies.
- Identify and eliminate duplicate code.
- Break unnecessarily large components into reusable components.
- Improve TypeScript types and eliminate unnecessary `any`.
- Improve naming conventions.
- Organize files and modules logically.
- Follow consistent coding standards.
- Improve error handling.
- Remove unnecessary complexity.
- Improve maintainability and readability.
- Identify potential memory leaks.
- Avoid unnecessary abstractions.
- Separate business logic from UI components where appropriate.

Every change should improve maintainability, reliability, or clarity.

## 4. Performance and Efficiency Optimization

Current score: 80/100. Target: 95+/100.

This is the highest-priority improvement area.

### Frontend optimization
- Analyze production bundle size.
- Implement code splitting where beneficial.
- Use lazy loading for non-critical components.
- Optimize image sizes and formats.
- Avoid unnecessary React re-renders.
- Optimize state management.
- Remove unnecessary effects and repeated computations.
- Avoid loading unused libraries.
- Optimize font loading.
- Improve initial page rendering.
- Optimize mobile performance.

### Backend optimization
- Inspect API response times.
- Eliminate unnecessary API requests.
- Prevent duplicate requests.
- Optimize database queries.
- Avoid fetching unnecessary database columns.
- Add pagination for large datasets.
- Use appropriate database indexes.
- Improve API error handling.
- Implement caching only where appropriate.
- Avoid unnecessary server-side processing.

### Gemini AI optimization
- Review the Gemini image-verification workflow.
- Avoid duplicate AI requests.
- Optimize image size before sending it for analysis.
- Use appropriate request timeouts.
- Handle API failures and rate limits.
- Avoid unnecessary token consumption.
- Preserve image-verification accuracy.
- Never expose Gemini API credentials in frontend code.

Do not reduce AI verification reliability to improve speed.

## 5. Security Audit

Current score: 98/100. Target: Maintain or improve it.

### API security
- Ensure API keys are stored securely in environment variables.
- Never expose secrets in frontend bundles.
- Validate incoming requests.
- Implement appropriate rate limiting.
- Handle errors without exposing sensitive internal information.
- Verify authorization on protected endpoints.

### Supabase security
- Review Row Level Security policies.
- Ensure users cannot modify unauthorized complaints.
- Protect administrative operations.
- Review database permissions.
- Check exposed tables and functions.
- Ensure service-role credentials are never exposed to clients.

### Authentication and authorization
- Verify admin authentication.
- Verify role-based access control.
- Prevent unauthorized access to admin features.
- Validate sessions and permissions.
- Protect sensitive administrative actions.

### Image and input security
- Validate image MIME types and file sizes.
- Prevent malicious file uploads.
- Validate user inputs.
- Prevent injection vulnerabilities.
- Avoid trusting client-side validation alone.

Never remove an existing security control without identifying a safe and justified replacement.

## 6. Testing Improvements

Current score: 94/100. Target: 98+/100.

Add or improve tests for:

- Core utility functions.
- Complaint submission.
- Gemini image verification.
- Location permissions.
- Geolocation failures.
- Invalid image submissions.
- Database errors.
- API failures.
- Complaint tracking.
- Admin authentication.
- Unauthorized requests.
- Mobile responsiveness.

Use the testing framework already present in the project wherever possible.

Add unit tests, integration tests, and end-to-end tests for critical workflows where appropriate.

Do not write tests that simply confirm mocked success. Test meaningful success and failure scenarios.

## 7. Accessibility Improvements

Current score: 96/100. Target: 98+/100.

Review:

- Semantic HTML.
- Keyboard navigation.
- Screen-reader compatibility.
- Accessible form labels.
- Button labels.
- Image alternative text.
- Color contrast.
- Focus indicators.
- Form validation messages.
- Mobile responsiveness.
- Accessible modal and dialog behavior.

Preserve the current visual identity while improving accessibility.

## 8. CivicSetu Problem Statement Alignment

Current score: 98/100. Target: Maintain 98–100.

CivicSetu is an AI-powered civic reporting platform focused on garbage management, public cleanliness, and civic accountability.

The central objective is:

**Report garbage in under 15 seconds.**

Ensure the implementation clearly supports:

### Citizen reporting
- Simple and fast reporting.
- Live camera capture.
- Avoid unnecessary reporting steps.
- Do not introduce mandatory citizen registration if the existing application is designed for no-login reporting.

### AI-powered verification
Use Google Gemini to analyze captured images.

Maintain these verification outcomes:

- `GARBAGE_DETECTED`
- `NO_GARBAGE_DETECTED`
- `UNCERTAIN`

Handle each outcome correctly. Do not automatically approve unverified reports.

### Location-based reporting
- Capture geographical location with permission.
- Associate reports with appropriate locations.
- Preserve Chennai ward identification.
- Handle unavailable location permissions gracefully.
- Never invent ward information or geographical boundaries.

### Complaint tracking
- Generate unique complaint references.
- Maintain accurate complaint statuses.
- Display meaningful tracking information.

### Administrative dashboard
- Provide authorized administrators with complaint management tools.
- Support complaint monitoring and relevant analytics.
- Prevent unauthorized modifications.

Do not add unrelated features merely to increase complexity.

## 9. Database and API Optimization

Inspect the existing database and API architecture.

- Identify inefficient queries.
- Review relationships and indexes.
- Avoid unnecessary database requests.
- Review data validation.
- Preserve data integrity.
- Review RLS policies.
- Optimize API payload sizes.
- Handle concurrent requests correctly.
- Ensure complaint submission is reliable.
- Avoid duplicate complaint creation.

Do not delete existing production data or reset the database.

Do not perform destructive migrations without explicit approval and a verified backup.

## 10. UI and User Experience

Keep the existing CivicSetu branding and visual identity.

Improve only where necessary:

- Loading indicators.
- Error messages.
- Empty states.
- Form feedback.
- Responsive layouts.
- Navigation consistency.
- User interaction feedback.
- Mobile usability.

The reporting process should remain simple, intuitive, and fast.

Avoid unnecessary animations, oversized assets, and complex UI libraries.

## 11. Performance Measurement

Measure the application before and after optimization.

Where tools are available, measure:

- Production bundle size.
- Initial page load.
- Largest Contentful Paint (LCP).
- Interaction to Next Paint (INP).
- Cumulative Layout Shift (CLS).
- API response times.
- Database query performance.
- Image processing time.

Use Lighthouse or equivalent tools where appropriate.

Report actual results. Do not fabricate measurements or claim a particular score without running the relevant evaluation.

## 12. Final Validation

After implementing improvements:

1. Run the production build.
2. Run TypeScript checks.
3. Run linting.
4. Run all available tests.
5. Check browser console errors.
6. Verify all critical application workflows.
7. Test mobile and desktop layouts.
8. Review security-sensitive changes.
9. Check for broken routes and API endpoints.
10. Verify deployment readiness.

If any test fails, investigate and fix the underlying issue before declaring completion.

## 13. GitHub Commit and Push – Mandatory

After completing the improvements and validation, save the changes to the existing CivicSetu GitHub repository.

### Step 1: Save the master prompt

Create the following file if it does not already exist:

`docs/CODE_OPTIMIZATION_MASTER_PROMPT.md`

Save this complete master prompt inside that file.

Do not overwrite unrelated documentation.

### Step 2: Review Git status

Run:

```bash
git status
git remote -v
git branch --show-current
```

Verify that the remote points to the correct existing CivicSetu GitHub repository.

Do not create a new repository or change the existing remote.

### Step 3: Review changes

- Inspect all modified and newly created files.
- Review `git diff`.
- Ensure no API keys, passwords, access tokens, `.env` files, credentials, or private information are included.
- Ensure generated build folders and unnecessary dependencies are not committed.
- Do not stage unrelated user changes.
- Do not commit temporary files.

### Step 4: Commit

Stage the intended CivicSetu improvements, tests, and master prompt documentation.

Create the Git commit using this exact commit message:

```bash
git add <reviewed-files>
git commit -m "Civicsetu Improvement"
```

The final commit message must be exactly:

**Civicsetu Improvement**

### Step 5: Push to GitHub

Push the commit to the existing repository's current working branch.

```bash
git push origin HEAD
```

Do not force-push.

Do not overwrite remote history.

If a push is rejected because the remote has newer commits, inspect and reconcile the changes safely. Never use destructive Git commands to bypass the problem.

If authentication, permissions, merge conflicts, or other issues prevent the push, report the exact issue and provide the next steps. Never claim that a push succeeded unless Git confirms it.

### Step 6: Verify the push

After pushing:

```bash
git status
git log -1 --oneline
```

Confirm:

- The expected commit exists.
- The commit message is `Civicsetu Improvement`.
- The commit was pushed to the correct GitHub repository.
- The working tree is clean, except for any explicitly documented unrelated user changes.

Provide the GitHub repository URL and commit hash in the final report.

## 14. Final Report

At the end, provide:

### A. Initial Audit
- Problems identified.
- Root causes.
- Existing risks.

### B. Improvements Implemented
- Code quality improvements.
- Performance optimizations.
- Security improvements.
- Testing improvements.
- Accessibility improvements.

### C. Files Modified
- File paths.
- Explanation of changes.

### D. Before and After Comparison

| Category | Before | After |
|---|---:|---:|
| Code Quality | 86 | Measured result |
| Security | 98 | Measured result |
| Efficiency | 80 | Measured result |
| Testing | 94 | Measured result |
| Accessibility | 96 | Measured result |
| Problem Statement Alignment | 98 | Measured result |

### E. Validation
- Build result.
- Test result.
- Lint result.
- TypeScript result.
- Performance measurements.

### F. GitHub Submission
- Repository URL.
- Branch name.
- Commit message.
- Commit hash.
- Push status.
- Files included in the commit.

### G. Remaining Issues
- Unresolved problems.
- Known limitations.
- Recommended next steps.

## FINAL INSTRUCTION

Work like an experienced engineering team preparing CivicSetu for a serious technical evaluation.

Prioritize:

1. Efficiency and performance.
2. Code quality and maintainability.
3. Security preservation.
4. Test coverage and reliability.
5. Accessibility.
6. Problem statement alignment.

Make genuine engineering improvements, not cosmetic changes designed to manipulate an AI evaluation score.

**The final goal is a faster, cleaner, more secure, more reliable, production-ready CivicSetu application while preserving everything that already works.**

**Finally, commit the reviewed improvements and master prompt to the existing GitHub repository using the exact commit message `Civicsetu Improvement`, then push and verify the commit.**