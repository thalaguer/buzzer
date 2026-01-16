/**
 * Custom error class that extends the built-in Error class.
 * Includes additional details and a timestamp.
 * 
 * @module CustomError
 */
export class CustomError extends Error {
  /**
   * Creates a new CustomError instance.
   * 
   * @param {string} message - The error message.
   * @param {Object} [details={}] - Additional details about the error.
   */
  constructor(message, details = {}) {
    super(message);
    this.name = 'CustomError';
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}