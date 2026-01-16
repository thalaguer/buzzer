/**
 * Constants for button data and console colors.
 * 
 * @module constants
 */

/** Array of button configurations for all controllers */
export const BUTTONS_DATA = [
  // Controller 1
  { name: 'C1_RED', color: 'red', controller: 1, button: 0, bit: 0x000001 },
  { name: 'C1_BLUE', color: 'blue', controller: 1, button: 1, bit: 0x000010 },
  { name: 'C1_ORANGE', color: 'orange', controller: 1, button: 2, bit: 0x000008 },
  { name: 'C1_GREEN', color: 'green', controller: 1, button: 3, bit: 0x000004 },
  { name: 'C1_YELLOW', color: 'yellow', controller: 1, button: 4, bit: 0x000002 },

  // Controller 2
  { name: 'C2_RED', color: 'red', controller: 2, button: 0, bit: 0x000020 },
  { name: 'C2_BLUE', color: 'blue', controller: 2, button: 1, bit: 0x000200 },
  { name: 'C2_ORANGE', color: 'orange', controller: 2, button: 2, bit: 0x000100 },
  { name: 'C2_GREEN', color: 'green', controller: 2, button: 3, bit: 0x000080 },
  { name: 'C2_YELLOW', color: 'yellow', controller: 2, button: 4, bit: 0x000040 },

  // Controller 3
  { name: 'C3_RED', color: 'red', controller: 3, button: 0, bit: 0x000400 },
  { name: 'C3_BLUE', color: 'blue', controller: 3, button: 1, bit: 0x004000 },
  { name: 'C3_ORANGE', color: 'orange', controller: 3, button: 2, bit: 0x002000 },
  { name: 'C3_GREEN', color: 'green', controller: 3, button: 3, bit: 0x001000 },
  { name: 'C3_YELLOW', color: 'yellow', controller: 3, button: 4, bit: 0x000800 },

  // Controller 4
  { name: 'C4_RED', color: 'red', controller: 4, button: 0, bit: 0x008000 },
  { name: 'C4_BLUE', color: 'blue', controller: 4, button: 1, bit: 0x080000 },
  { name: 'C4_ORANGE', color: 'orange', controller: 4, button: 2, bit: 0x040000 },
  { name: 'C4_GREEN', color: 'green', controller: 4, button: 3, bit: 0x020000 },
  { name: 'C4_YELLOW', color: 'yellow', controller: 4, button: 4, bit: 0x010000 },
];

/** ANSI color codes for console logging */
export const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
};