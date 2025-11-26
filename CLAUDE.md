# CLAUDE.md

This document provides comprehensive guidance for AI assistants (like Claude) working on the ML Log Analyzer codebase. It covers architecture, conventions, and development workflows to ensure consistent and high-quality contributions.

## Project Overview

**ML Log Analyzer** is a modern web application for analyzing and visualizing machine learning training logs. It helps users parse log files, extract metrics (loss, gradient norms, etc.), and visualize them with interactive charts.

- **Live Demo**: https://log.javazero.top/
- **Tech Stack**: React 19, Vite 6, Chart.js 4, Tailwind CSS 3, i18next
- **Purpose**: Parse ML training logs with flexible regex/keyword extraction and provide synchronized, interactive visualizations

## Architecture Overview

### Core Architecture Patterns

1. **Component-Based React Architecture**
   - Functional components with hooks (useState, useCallback, useEffect, useMemo)
   - Props-based data flow with callback functions for state updates
   - No external state management library (uses React's built-in state)

2. **Web Worker for Performance**
   - Log parsing runs in a dedicated Web Worker (`src/workers/logParser.worker.js`)
   - Prevents UI blocking during heavy parsing operations
   - Communication via postMessage/onmessage pattern

3. **LocalStorage Persistence**
   - Uploaded files and parsing configs persist across sessions
   - 5MB storage limit with quota handling
   - Config saved on every change (with safeguards)

4. **Global Drag-and-Drop**
   - Full-page drag overlay for intuitive file uploads
   - Supports dropping files anywhere in the application

### Directory Structure

```
/home/user/log-parser/
├── .github/
│   └── workflows/          # CI/CD pipelines (deploy, PR preview, tests)
├── public/
│   └── locales/           # i18n translation files (zh, en)
├── src/
│   ├── components/        # React components
│   │   ├── __tests__/    # Component tests (colocated)
│   │   ├── ChartContainer.jsx     # Main chart rendering
│   │   ├── ComparisonControls.jsx # Multi-file comparison UI
│   │   ├── FileConfigModal.jsx    # Per-file config dialog
│   │   ├── FileList.jsx           # File list with enable/disable
│   │   ├── FileUpload.jsx         # Upload component
│   │   ├── Header.jsx             # Header with language/theme toggle
│   │   ├── RegexControls.jsx      # Global parsing config
│   │   ├── ResizablePanel.jsx     # Draggable chart height
│   │   └── ThemeToggle.jsx        # Dark mode toggle
│   ├── utils/             # Utility functions
│   │   ├── __tests__/    # Utility tests (colocated)
│   │   ├── ValueExtractor.js   # Core parsing logic
│   │   ├── getMinSteps.js      # Chart step calculation
│   │   └── mergeFiles.js       # File merging logic
│   ├── workers/
│   │   └── logParser.worker.js # Web Worker for parsing
│   ├── App.jsx            # Main application component
│   ├── i18n.js           # i18next configuration
│   ├── main.jsx          # Application entry point
│   ├── metricPresets.js  # Preset metric configurations
│   └── index.css         # Global styles
├── eslint.config.js      # ESLint configuration
├── package.json          # Dependencies and scripts
├── tailwind.config.js    # Tailwind CSS configuration
├── vite.config.js        # Vite build configuration
└── vitest.setup.js       # Vitest test setup
```

## Key Components and Their Responsibilities

### App.jsx (Main Application)
- **Central State Management**: Manages all uploaded files, parsing configs, comparison modes
- **Web Worker Coordination**: Initializes worker, dispatches parsing jobs, handles results
- **LocalStorage Persistence**: Saves/loads state with quota handling
- **Global Event Handlers**: Drag-and-drop overlay, file processing
- **Key State**:
  - `uploadedFiles`: Array of file objects with content, config, metricsData
  - `globalParsingConfig`: Default parsing config (metrics, stepKeyword)
  - `compareMode`: 'normal', 'absolute', 'relative'
  - `baselineFile`: Reference file for comparisons

### ChartContainer.jsx
- **Chart Rendering**: Creates Line charts for each metric using Chart.js
- **Synchronization**: Implements hover synchronization across all charts
- **Data Processing**: Filters data by enabled files, applies data ranges, calculates differences
- **Export Functionality**: PNG export, clipboard copy, CSV download
- **Resizable Panels**: Adjustable chart heights via ResizablePanel

### ValueExtractor.js (Core Parsing Logic)
- **Keyword Mode**: Case-insensitive keyword search with number extraction
- **Regex Mode**: Custom regex patterns with capture groups
- **Smart Mode**: Automatic format detection (JSON, key-value, arrays)
- **Number Support**: Scientific notation (1.23e-4), signed numbers
- Returns: `{ value, line, text, format }` objects

### logParser.worker.js (Web Worker)
- **Message Handler**: Receives `PARSE_FILE` messages with fileId, content, config
- **Parsing Loop**: Iterates through metrics, calls ValueExtractor methods
- **Step Extraction**: Optional step keyword parsing for x-axis values
- **Result Posting**: Sends `PARSE_COMPLETE` or `PARSE_ERROR` back to main thread

## Development Conventions

### Code Style

1. **React Patterns**
   ```jsx
   // Use functional components with hooks
   function MyComponent({ prop1, onAction }) {
     const [state, setState] = useState(initialValue);
     const memoizedValue = useMemo(() => expensive(state), [state]);
     const handler = useCallback(() => { ... }, [dependencies]);

     return <div>...</div>;
   }
   ```

2. **File Naming**
   - Components: PascalCase (e.g., `ChartContainer.jsx`)
   - Utilities: camelCase (e.g., `getMinSteps.js`)
   - Tests: `__tests__/ComponentName.test.jsx`

3. **Import Order**
   - React and React libraries first
   - Third-party libraries
   - Local components and utilities
   - Styles last

4. **State Management**
   - Prefer `useCallback` for event handlers to prevent re-renders
   - Use `useMemo` for expensive calculations
   - Keep state as high as necessary, as low as possible
   - Use functional updates when new state depends on old: `setState(prev => ...)`

### Testing Conventions

- **Location**: Tests colocated with source files in `__tests__/` subdirectories
- **Framework**: Vitest with jsdom environment
- **Coverage**: Target high coverage (excluding App.jsx, main.jsx, complex modals)
- **Mocking**: Worker mocked in `vitest.setup.js`
- **Pattern**:
  ```javascript
  import { describe, it, expect } from 'vitest';
  import { render, screen } from '@testing-library/react';

  describe('ComponentName', () => {
    it('should render correctly', () => {
      render(<ComponentName />);
      expect(screen.getByText('...')).toBeInTheDocument();
    });
  });
  ```

### i18n (Internationalization)

- **Languages**: Chinese (zh) and English (en)
- **Files**: `public/locales/{lang}/translation.json`
- **Usage in Components**:
  ```jsx
  import { useTranslation } from 'react-i18next';

  function MyComponent() {
    const { t } = useTranslation();
    return <div>{t('key.path')}</div>;
  }
  ```
- **Adding New Strings**: Add to both `zh` and `en` translation files
- **Storage**: Language preference stored in localStorage

### Styling Conventions

- **Framework**: Tailwind CSS with dark mode support (`dark:` prefix)
- **Theme**: Uses `class` strategy for dark mode toggling
- **Patterns**:
  ```jsx
  // Light and dark mode
  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"

  // Reusable classes defined in index.css
  className="card"  // Pre-defined card style
  className="input-field"  // Pre-defined input style
  ```
- **Animations**: Custom animations in `index.css` (fade-in, scale, etc.)

## Configuration Files

### vite.config.js
- **Base Path**: Uses relative path `./` for GitHub Pages, `/` for Vercel
- **Build Output**: `dist/` directory with `assets/` subdirectory
- **Test Configuration**: jsdom environment, coverage settings
- **Coverage Exclusions**: App.jsx, main.jsx, complex modal components

### tailwind.config.js
- **Dark Mode**: `class` strategy (toggled via className on html/body)
- **Content Paths**: Scans `index.html` and all `src/**/*.{js,jsx,ts,tsx}`

### eslint.config.js
- **Parser**: ECMAScript 2020 with JSX support
- **Plugins**: react-hooks, react-refresh
- **Rules**:
  - Unused vars with exception for uppercase/underscore prefixed
  - react-refresh/only-export-components warning

## Git Workflow and CI/CD

### Branch Strategy
- **Main Branch**: `master` (production deployments)
- **Feature Branches**: `claude/*` for AI-assisted development
- **PR Previews**: Automatic deployments to `gh-pages/pr-preview/pr-{number}`

### GitHub Actions Workflows

1. **deploy.yml** (Master branch only)
   - Triggers on push to `master`
   - Builds project with `npm run build`
   - Deploys to GitHub Pages (`gh-pages` branch)
   - Archives build artifacts

2. **pr-preview.yml** (Pull requests)
   - Deploys PR builds to separate preview directories
   - Comments PR with preview URL
   - Cleans up on PR merge/close

3. **ci.yml** (All branches)
   - Runs `npm run lint`
   - Runs `npm run test`
   - Reports coverage

### Commit Conventions
- Use clear, descriptive commit messages
- Prefix with type: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- Examples:
  - `feat: add CSV export functionality`
  - `fix: handle storage quota for uploaded files`
  - `refactor: extract ValueExtractor to separate module`

## Common Tasks and Patterns

### Adding a New Metric Preset

1. Edit `src/metricPresets.js`:
   ```javascript
   { label: 'New Metric', name: 'NewMetric', mode: 'keyword', keyword: 'metric:' }
   ```

2. Update translations in `public/locales/{lang}/translation.json`

### Adding a New Parsing Mode

1. Add mode to `ValueExtractor.js`:
   ```javascript
   static extractByNewMode(content, config) {
     // Implementation
     return [{ value, line, text }];
   }
   ```

2. Update `logParser.worker.js` to handle new mode

3. Add UI controls in `RegexControls.jsx`

### Modifying Chart Appearance

1. **Chart Options**: Edit options in `ChartContainer.jsx`
   ```javascript
   const options = {
     scales: {
       y: { /* customize y-axis */ },
       x: { /* customize x-axis */ }
     },
     plugins: { /* customize plugins */ }
   }
   ```

2. **Chart Colors**: Defined inline in `ChartContainer.jsx` (consider extracting to constants)

3. **Chart Zoom**: Uses `chartjs-plugin-zoom` with Shift+drag to zoom

### Adding Translation Keys

1. Add to `public/locales/zh/translation.json`:
   ```json
   {
     "newSection": {
       "title": "新标题",
       "description": "描述"
     }
   }
   ```

2. Add equivalent in `public/locales/en/translation.json`

3. Use in components: `{t('newSection.title')}`

## Performance Considerations

1. **Web Worker for Parsing**
   - All log parsing happens in worker thread
   - Never parse in main thread (blocks UI)
   - Use `isParsing` flag to show loading states

2. **LocalStorage Quotas**
   - Maximum 5MB per file to avoid QuotaExceededError
   - Graceful degradation: disable persistence if quota exceeded
   - Use `savingDisabledRef` to prevent repeated localStorage writes

3. **Chart Rendering**
   - Use `useMemo` for chart data preparation
   - Limit data points with range controls
   - Implement virtualization for very large datasets (future improvement)

4. **Re-renders**
   - Use `useCallback` for all event handlers passed as props
   - Memoize expensive computations with `useMemo`
   - Split large components if performance issues arise

## Testing Guidelines

### Running Tests

```bash
npm run test           # Run all tests
npm run test:coverage  # Run with coverage report
```

### Writing Tests

1. **Component Tests**: Test user interactions and rendering
   ```javascript
   it('should toggle file when checkbox clicked', async () => {
     const onToggle = vi.fn();
     render(<FileList files={mockFiles} onFileToggle={onToggle} />);
     await userEvent.click(screen.getByRole('checkbox'));
     expect(onToggle).toHaveBeenCalledWith(0, false);
   });
   ```

2. **Utility Tests**: Test pure functions with various inputs
   ```javascript
   it('should extract values by keyword', () => {
     const result = ValueExtractor.extractByKeyword(content, 'loss:');
     expect(result).toHaveLength(3);
     expect(result[0].value).toBe(0.123);
   });
   ```

3. **Coverage Goals**: Aim for >80% coverage on utilities and components

## Troubleshooting Common Issues

### Issue: LocalStorage Quota Exceeded
- **Symptom**: Console warning "LocalStorage quota exceeded"
- **Solution**: Automatic - persistence disabled, files stay in memory only
- **Prevention**: Don't upload files >5MB, implement file size warning

### Issue: Worker Not Parsing
- **Symptom**: Files stuck in "parsing" state
- **Debug**: Check worker postMessage format, verify worker initialization
- **Solution**: Ensure worker receives correct `{ type, payload }` structure

### Issue: Charts Not Syncing
- **Symptom**: Hovering on one chart doesn't highlight others
- **Debug**: Check `onSyncHover` callback, verify `syncRef` usage
- **Solution**: Ensure all charts registered with `onRegisterChart`

### Issue: Regex Not Matching
- **Symptom**: No data extracted despite visible patterns
- **Debug**: Use "Preview Matches" in config modal
- **Solution**: Check regex syntax, ensure capture group `()`, test with simpler pattern

## Security Considerations

- **No Backend**: Purely client-side, all data stays in browser
- **File Processing**: Files never uploaded to servers
- **LocalStorage**: User data persists locally only
- **XSS Prevention**: React escapes content by default, avoid `dangerouslySetInnerHTML`
- **Dependency Updates**: Regular npm audit, dependabot PRs

## Future Improvement Areas

- **Virtualization**: For handling very large log files (>10K lines)
- **File Format Support**: Direct CSV/Excel import
- **Export Options**: More chart types, PDF export
- **Collaborative Features**: Share parsing configs via URL
- **Metric Templates**: More built-in presets for common frameworks
- **Performance**: Incremental parsing for streaming large files

## Key Technical Decisions

1. **Why Web Workers?**: Parsing large logs blocks UI; workers keep app responsive
2. **Why LocalStorage?**: Simple persistence without backend; files reload on refresh
3. **Why No State Library?**: React's built-in state sufficient for current complexity
4. **Why Vite?**: Fast HMR, modern build tool, excellent DX
5. **Why Chart.js?**: Robust, flexible, good React integration, zoom plugin

## Resources

- **React Docs**: https://react.dev/
- **Vite Guide**: https://vitejs.dev/guide/
- **Chart.js Docs**: https://www.chartjs.org/docs/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **i18next**: https://www.i18next.com/
- **Vitest**: https://vitest.dev/

## Contact and Contribution

- **GitHub**: https://github.com/JavaZeroo/log-parser
- **Issues**: Report bugs or request features via GitHub Issues
- **PRs Welcome**: Follow conventions in this document

---

**Last Updated**: 2025-11-26
**Version**: 1.0.0
