import { ValidationRule } from '../../types/index.js';

export const PERFORMANCE_RULES: ValidationRule[] = [
  {
    id: 'no-sync-fs',
    name: 'No Synchronous File System',
    description: 'Avoid synchronous file system operations that block the event loop',
    severity: 'medium',
    category: 'performance',
    enabled: true,
  },
  {
    id: 'efficient-loops',
    name: 'Efficient Loops',
    description: 'Use efficient loop patterns and avoid nested loops where possible',
    severity: 'low',
    category: 'performance',
    enabled: true,
  },
  {
    id: 'memory-leaks',
    name: 'Memory Leak Detection',
    description: 'Detect potential memory leaks from unclosed resources',
    severity: 'high',
    category: 'performance',
    enabled: true,
  },
  {
    id: 'large-bundle-size',
    name: 'Large Bundle Size',
    description: 'Warn about imports that significantly increase bundle size',
    severity: 'medium',
    category: 'performance',
    enabled: true,
  },
  {
    id: 'inefficient-regex',
    name: 'Inefficient Regex',
    description: 'Detect regex patterns that could cause performance issues',
    severity: 'medium',
    category: 'performance',
    enabled: true,
  },
  {
    id: 'unnecessary-async',
    name: 'Unnecessary Async',
    description: 'Detect functions marked as async that don\'t need to be',
    severity: 'low',
    category: 'performance',
    enabled: true,
  },
];

