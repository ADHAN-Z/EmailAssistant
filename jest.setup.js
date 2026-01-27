import '@testing-library/jest-dom'

// Polyfill TextEncoder for Node.js versions < 16
if (typeof TextEncoder === 'undefined') {
  const { TextEncoder } = require('util');
  global.TextEncoder = TextEncoder;
}

// Polyfill TextDecoder for Node.js versions < 16
if (typeof TextDecoder === 'undefined') {
  const { TextDecoder } = require('util');
  global.TextDecoder = TextDecoder;
}

// Polyfill ReadableStream for Node.js versions < 16
if (typeof ReadableStream === 'undefined') {
  const { Readable } = require('stream');
  global.ReadableStream = class ReadableStream {
    constructor(opts) {
      this.readable = new Readable(opts);
    }
    getReader() {
      return this.readable._readableState.reading ? null : this.readable.read();
    }
  };
}


