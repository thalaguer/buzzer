import { EVENTS } from "./event.js";

/**
 * Formats the original button event object into a simplified structure.
 * 
 * @param {Object} original - The original event object from the endpoint data.
 * @param {string} eventType - The type of event (PRESS or RELEASE).
 * @returns {Object} Formatted event object with controller, button, name, color, pressed, and state.
 */
export function formatEvent(original, eventType) {
  const isPressed = eventType === EVENTS.PRESS;
  return {
    controller: original.controller,
    button: original.button,
    Name: original.name,
    color: original.color,
    pressed: isPressed,
    state: isPressed ? 'pressed' : 'released'
  };
}