/**
 * Config loader.
 * Loads from:
 *   1. ~/.playwright-tools/config.json (global)
 *   2. .playwright-tools.json in current directory (project, overrides global)
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const GLOBAL_CONFIG = join(homedir(), '.playwright-tools', 'config.json');
const PROJECT_CONFIG = '.playwright-tools.json';

function loadJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Load config. Project overrides global.
 * @returns {Object} config
 */
export function loadConfig() {
  return { ...loadJson(GLOBAL_CONFIG), ...loadJson(PROJECT_CONFIG) };
}

/**
 * Get a config value. Priority: flag > env > config > default.
 * @param {string} key - Config key
 * @param {string} envVar - Environment variable name
 * @param {*} defaultValue - Default value
 * @returns {*}
 */
export function getConfig(key, envVar, defaultValue) {
  const config = loadConfig();
  return process.env[envVar] || config[key] || defaultValue;
}
