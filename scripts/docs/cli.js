#!/usr/bin/env node
'use strict';

// Entrypoint only. All logic lives in ./index.js, which is kept free of
// side effects: `node --test <dir>` executes every .js file in the directory,
// so a module that ran checks on require would fail the test suite.

const { runAllChecks, formatViolations } = require('./index');

const violations = runAllChecks(process.cwd());
const output = formatViolations(violations);

if (violations.length > 0) {
  console.error(output);
  process.exit(1);
}

console.log(output);
