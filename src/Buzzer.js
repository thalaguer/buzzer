// ──────────────────────────────────────────────────────────────
// Error handling 
// ──────────────────────────────────────────────────────────────
const isDebug = process.env.DEBUG === 'true' || process.argv.includes('--debug');

process.on('uncaughtException', (error) => {
  if (isDebug) {
    console.error(colors.red + colors.bright + '┌────────────────────────────────────────────────────────────┐' + colors.reset);
    console.error(colors.red + colors.bright + '│ CRITICAL: Uncaught EXCEPTION (synchronous)                │' + colors.reset);
    console.error(colors.red + colors.bright + '└────────────────────────────────────────────────────────────┘' + colors.reset);
    console.error(colors.yellow + 'Message:' + colors.reset, error.message || error);
    console.error(colors.yellow + 'Stack:' + colors.reset, error.stack || error);
    console.error(colors.dim + `Time: ${new Date().toISOString()}` + colors.reset);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  if (isDebug) {
    console.error(colors.magenta + colors.bright + '┌────────────────────────────────────────────────────────────┐' + colors.reset);
    console.error(colors.magenta + colors.bright + '│ UNHANDLED PROMISE REJECTION                               │' + colors.reset);
    console.error(colors.magenta + colors.bright + '└────────────────────────────────────────────────────────────┘' + colors.reset);
    const error = reason instanceof Error ? reason : new Error(String(reason));
    if (error instanceof CustomError) {
      console.error(colors.yellow + 'Message:' + colors.reset, `[${error.timestamp}] ${error.name}: ${error.message}`);
      console.error(colors.yellow + 'Details:' + colors.reset, error.details || 'none');
      console.error(colors.yellow + 'Stack:' + colors.reset, error.stack);
    } else {
      console.error(colors.yellow + 'Unexpected rejection:' + colors.reset, error.message);
      console.error(error.stack || error);
    }
    console.error(colors.dim + `Time: ${new Date().toISOString()}` + colors.reset);
  }
});

import { findByIds } from "usb";
import { EventEmitter } from 'node:events';
import HID from 'node-hid';

import { VID, PID, prefix } from './config.js';
import { BUTTONS_DATA, colors } from "./constants.js";
import { EVENTS } from "./event.js";
import { formatEvent } from "./utils.js";
import { CustomError } from "./error/CustomError.js";

/**
 * Creates and manages a Buzz! controller dongle instance.
 * 
 * Handles connection to the Buzz! wireless dongle, button event detection,
 * LED control, and provides an event-based API for button interactions.
 * 
 * @returns {Object} Buzzer manager object with public methods.
 * 
 * @example
 * const buzz = Buzzer();
 * 
 * // Wait for initialization
 * buzz.onReady(() => {
 *   console.log('Buzzers ready!');
 *   buzz.setLeds(true, false, false, false); // Turn on player 1 LED
 * });
 * 
 * // Listen for button events
 * buzz.onPress((event) => {
 *   console.log(`Button pressed: ${event.button} on controller ${event.controller}`);
 * });
 * 
 * // Clean up when done
 * // await buzz.close();
 */
export default function Buzzer() {
  const ee = new EventEmitter();

  let device = null;
  let iface = null;
  let endpoint = null;
  let hidDevice = null;
  let currentStates = new Array(BUTTONS_DATA.length).fill(false);

  // "Ready" state management
  let isReady = false;
  let readyPromise = null;

  // ──────────────────────────────────────────────────────────────
  // USB device management 
  // ──────────────────────────────────────────────────────────────

  /**
   * Opens the USB device with the specified VID/PID and claims interface 0.
   *
   * This function:
   * - Searches for the Buzz! dongle using VID and PID
   * - Opens the device
   * - Gets interface 0
   * - Detaches kernel driver if active (Linux/macOS only)
   * - Claims the interface for exclusive access
   *
   * @async
   * @returns {Promise<{device: import('usb').Device, iface: import('usb').Interface}>}
   *          Object containing the opened device and claimed interface
   * @throws {CustomError} If the device is not found
   * @throws {CustomError} If interface 0 is not available
   * @throws {CustomError} If any other USB operation fails (open, claim, etc.)
   */
  async function openAndClaim() {
    try {
      device = findByIds(VID, PID);
      if (!device) {
        const errMsg = "Dongle not found. Check connection and VID/PID.";
        ee.emit(EVENTS.ERROR, errMsg);
        throw new CustomError(errMsg);
      }

      device.open();

      iface = device.interface(0);
      if (!iface) {
        const errMsg = "Interface 0 not found";
        ee.emit(EVENTS.ERROR, errMsg);
        throw new CustomError(errMsg);
      }

      if (process.platform !== 'win32' && iface.isKernelDriverActive?.()) {
        iface.detachKernelDriver();
      }

      iface.claim();

      return { device, iface };
    } catch (err) {
      const errMsg = "Failed to open the connection to the dongle.";
      ee.emit(EVENTS.ERROR, errMsg);
      throw new CustomError(errMsg, { cause: err });
    }
  }

  /**
   * Finds and returns the interrupt IN endpoint from the given USB interface.
   *
   * This function searches through all endpoints of the interface for one that:
   * - Has direction 'in' (device → host)
   * - Uses interrupt transfer type (transferType === 3)
   *
   * If no suitable endpoint is found, it throws an error with a detailed list
   * of all available endpoints for debugging purposes.
   *
   * @param {import('usb').Interface} iface - The USB interface to search endpoints in
   * @returns {import('usb').Endpoint} The interrupt IN endpoint found
   * @throws {CustomError} If no interrupt IN endpoint is found.
   *                 The error message includes a formatted list of all available endpoints.
   */
  function findInterruptEndpoint(iface) {
    const endpoint = iface.endpoints.find(ep =>
      ep.direction === 'in' && ep.transferType === 3
    );

    if (!endpoint) {
      const errMsg = "No INTERRUPT IN endpoint found!\n" +
        "Available endpoints:\n" +
        iface.endpoints.map(e => `  - ${e.direction} ${e.transferType} (addr 0x${e.address.toString(16)})`).join("\n");
      ee.emit(EVENTS.ERROR, errMsg);
      throw new CustomError(errMsg);
    }

    return endpoint;
  }

  // ──────────────────────────────────────────────────────────────
  // LEDs
  // ──────────────────────────────────────────────────────────────

  /**
   * Internal LED control without initialization check.
   * Used during boot sequence to avoid circular dependencies.
   *
   * @private
   * @param {boolean} [player1=false] - Turn on the LED for player 1
   * @param {boolean} [player2=false] - Turn on the LED for player 2
   * @param {boolean} [player3=false] - Turn on the LED for player 3
   * @param {boolean} [player4=false] - Turn on the LED for player 4
   * @returns {void}
   */
  function privateSetLeds(player1 = false, player2 = false, player3 = false, player4 = false) {
    if (!hidDevice) {
      console.warn(`${prefix} HID device not available`);
      return;
    }

    const report = Buffer.alloc(8);
    report[0] = 0x00;
    report[1] = 0x00;
    report[2] = player1 ? 0xFF : 0x00;
    report[3] = player2 ? 0xFF : 0x00;
    report[4] = player3 ? 0xFF : 0x00;
    report[5] = player4 ? 0xFF : 0x00;
    report[6] = 0x00;
    report[7] = 0x00;

    try {
      hidDevice.write(report);
    } catch (err) {
      const shortReport = Buffer.from([
        0x00, 0x00,
        player1 ? 0xFF : 0x00,
        player2 ? 0xFF : 0x00,
        player3 ? 0xFF : 0x00,
        player4 ? 0xFF : 0x00
      ]);
      try {
        hidDevice.write(shortReport);
      } catch (innerErr) {
        ee.emit(EVENTS.ERROR, "Failed to set LEDs");
        if (isDebug) {
          console.error(`${prefix} LED set error:`, innerErr.message);
        }
      }
    }
  }

  /**
   * Controls the LEDs on the Buzz! controllers.
   * 
   * Ensures the system is ready before setting LEDs.
   * 
   * @param {boolean} [player1=false] - Turn on LED for player 1
   * @param {boolean} [player2=false] - Turn on LED for player 2
   * @param {boolean} [player3=false] - Turn on LED for player 3
   * @param {boolean} [player4=false] - Turn on LED for player 4
   * @returns {Promise<void>}
   */
  async function setLeds(player1 = false, player2 = false, player3 = false, player4 = false) {
    await ensureReady();
    privateSetLeds(player1, player2, player3, player4);
  }

  /**
   * Controls the LEDs using an array of boolean values.
   * 
   * @param {boolean[]} players - Array of 4 booleans for players 1-4
   * @returns {Promise<void>}
   * @throws {CustomError} If array length is not 4
   */
  async function setLedsarray(players) {
    if (!Array.isArray(players) || players.length !== 4) {
      throw new CustomError("Invalid array: must be boolean[4]");
    }
    await setLeds(...players);
  }

  // ──────────────────────────────────────────────────────────────
  // Setup 
  // ──────────────────────────────────────────────────────────────

  /**
   * Sets up the listener for Buzz! controller events.
   * 
   * Initializes USB connection, HID device, starts polling for button data,
   * and emits events on button press/release.
   * 
   * @async
   * @returns {Promise<void>}
   * @throws {CustomError} If setup fails
   * @fires press   When a button is pressed (payload: button object)
   * @fires release When a button is released (payload: button object)
   * @fires error   When a critical error occurs during setup
   */
  async function setupBuzzListener() {
    try {
      const result = await openAndClaim();
      device = result.device;
      iface = result.iface;

      hidDevice = new HID.HID(VID, PID);

      endpoint = findInterruptEndpoint(iface);

      endpoint.startPoll(3, endpoint.descriptor.wMaxPacketSize);

      endpoint.on('data', (data) => {
        if (data.length < 5) return;

        const previousStates = [...currentStates];
        const pressedBits = data.readUInt16LE(2) | (data.readUInt8(4) << 16);

        BUTTONS_DATA.forEach((button, index) => {
          const isPressedNow = (pressedBits & button.bit) !== 0;
          const wasPressed = previousStates[index];

          currentStates[index] = isPressedNow;

          if (isPressedNow !== wasPressed) {
            const eventType = isPressedNow ? EVENTS.PRESS : EVENTS.RELEASE;
            ee.emit(eventType, { ...button, type: eventType });
          }
        });
      });

     if(isDebug) console.log(colors.magenta + colors.bright + `${prefix} Listening started` + colors.reset);
    } catch (err) {
      throw new CustomError("Buzzers setup failed", { cause: err });
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Events methods 
  // ──────────────────────────────────────────────────────────────

  /**
   * Internal function to ensure the buzzer system is ready.
   * Initializes the system if not already initialized.
   *
   * @private
   * @async
   * @returns {Promise<void>}
   * @throws {CustomError} If initialization fails
   */
  async function ensureReady() {
    if (isReady) return;
    if (readyPromise) return readyPromise;

    readyPromise = setupBuzzListener()
      .then(() => {
        const cycles = 3;
        const onTime = 350;   // clearly visible
        const offTime = 200;

        return new Promise((resolve) => {
          let delay = 0;
          for (let i = 0; i < cycles; i++) {
            setTimeout(() => {
              privateSetLeds(true, true, true, true);
            }, delay);
            delay += onTime;

            setTimeout(() => {
              privateSetLeds(false, false, false, false);
            }, delay);
            delay += offTime;
          }

          setTimeout(() => {
            isReady = true;
            if(isDebug) console.log(colors.yellow + colors.bright + `${prefix} Buzzers are ready` + colors.reset);
            ee.emit(EVENTS.READY);
            resolve();
          }, delay + 200);
        });
      })
      .catch(err => {
        const customError = new CustomError(err.message || "Setup failed", { cause: err });
        ee.emit(EVENTS.ERROR, customError);
        throw customError;
      });

    return readyPromise;
  }

  /**
   * Registers a callback to be called when the buzzer system is fully initialized.
   *
   * @param {function} callback - Function called when system is ready
   * @returns {void}
   */
  function onReady(callback) {
    ee.on(EVENTS.READY, callback);
  }

  /**
   * Registers a callback to be called when any buzzer button is pressed.
   *
   * The callback receives a simplified event object with the following properties:
   * - `controller`: The controller number (1 to 4)
   * - `button`: The button name (e.g., 'RED', 'BLUE', etc.)
   * - `Name`: The full button identifier (e.g., 'C1_RED', 'C2_BLUE')
   *
   * Returns a cleanup function to remove the listener.
   *
   * @param {function(Object): void} callback - Function called when a button is pressed
   * @returns {function(): void} Cleanup function to remove the listener
   */
  function onPress(callback) {
    ensureReady().catch((err) => {
      ee.emit(EVENTS.ERROR, err);
    });
    const handler = (originalEvent) => {
      callback(formatEvent(originalEvent, EVENTS.PRESS));
    };

    ee.on(EVENTS.PRESS, handler);
    return () => ee.off(EVENTS.PRESS, handler);
  }

  /**
   * Registers a callback to be called when any buzzer button is released.
   *
   * The callback receives a simplified event object with the following properties:
   * - `controller`: The controller number (1 to 4)
   * - `button`: The button name (e.g., 'RED', 'BLUE', etc.)
   * - `Name`: The full button identifier (e.g., 'C1_RED', 'C2_BLUE')
   *
   * Returns a cleanup function to remove the listener.
   *
   * @param {function(Object): void} callback - Function called when a button is released
   * @returns {function(): void} Cleanup function to remove the listener
   */
  function onRelease(callback) {
    ensureReady().catch((err) => {
      ee.emit(EVENTS.ERROR, err);
    });
    const handler = (originalEvent) => {
      callback(formatEvent(originalEvent, EVENTS.RELEASE));
    };

    ee.on(EVENTS.RELEASE, handler);
    return () => ee.off(EVENTS.RELEASE, handler);
  }

  /**
   * Registers a callback to be called whenever a button state changes
   * (either pressed or released).
   *
   * The callback receives a simplified event object with the following properties:
   * - `controller`: The controller number (1 to 4)
   * - `button`: The button name (e.g., 'RED', 'BLUE', etc.)
   * - `Name`: The full button identifier (e.g., 'C1_RED', 'C2_BLUE')
   *
   * Returns a cleanup function to remove the listener.
   *
   * @param {function(Object): void} callback - Function called on any button state change
   * @returns {function(): void} Cleanup function to remove the listener
   */
  function onChange(callback) {
    ensureReady().catch((err) => {
      ee.emit(EVENTS.ERROR, err);
    });

    const handler = (originalEvent) => {
      callback(formatEvent(originalEvent, originalEvent.type));
    };

    ee.on(EVENTS.PRESS, handler);
    ee.on(EVENTS.RELEASE, handler);

    return () => {
      ee.off(EVENTS.PRESS, handler);
      ee.off(EVENTS.RELEASE, handler);
    };
  }

  /**
   * Registers a callback to be called when an error occurs.
   *
   * @param {function(CustomError|string): void} callback - Function called on error
   * @returns {function(): void} Cleanup function to remove the listener
   */
  function onError(callback) {
    ensureReady().catch((err) => {
      callback(err);
    });
    ee.on(EVENTS.ERROR, callback);
    return () => ee.off(EVENTS.ERROR, callback);
  }

  /**
   * Closes all connections and releases resources.
   * Should be called when the application is done using the buzzer system.
   *
   * @async
   * @returns {Promise<void>}
   */
  async function close() {
    return new Promise((resolve) => {
      try {
        if (endpoint) endpoint.stopPoll();
        if (iface) {
          iface.release(true, () => {
            if (device) device.close();
            if (hidDevice) hidDevice.close();
            isReady = false;
            readyPromise = null;
            if(isDebug) console.log(`${prefix} Resources released`);
            resolve();
          });
        } else {
          resolve();
        }
      } catch (err) {
        console.warn(`${prefix} Close error:`, err.message);
        resolve();
      }
    });
  }

  // ──────────────────────────────────────────────────────────────
  // public API
  // ──────────────────────────────────────────────────────────────

  return {
    setLeds,
    setLedsarray,
    onReady,
    onPress,
    onRelease,
    onChange,
    onError,
    close
  };
}