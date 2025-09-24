// Browser polyfills for Node.js compatibility
// This file provides browser-compatible implementations of Node.js functions

// Polyfill for JY.inherits (Node.js inheritance pattern)
if (typeof (globalThis as any).JY === 'undefined') {
  (globalThis as any).JY = {};
}

if (typeof (globalThis as any).JY.inherits === 'undefined') {
  (globalThis as any).JY.inherits = function(ctor: any, superCtor: any) {
    if (superCtor) {
      ctor.super_ = superCtor;
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
    }
  };
}

// Polyfill for util.inherits (Node.js util module)
if (typeof (globalThis as any).util === 'undefined') {
  (globalThis as any).util = {};
}

if (typeof (globalThis as any).util.inherits === 'undefined') {
  (globalThis as any).util.inherits = (globalThis as any).JY.inherits;
}

// Polyfill for Buffer (if needed)
if (typeof (globalThis as any).Buffer === 'undefined') {
  (globalThis as any).Buffer = {
    from: (data: any) => new Uint8Array(data),
    isBuffer: (obj: any) => obj instanceof Uint8Array,
  };
}

// Polyfill for process (if needed)
if (typeof (globalThis as any).process === 'undefined') {
  (globalThis as any).process = {
    env: {},
    nextTick: (callback: Function) => setTimeout(callback, 0),
    browser: true,
  };
}

// Polyfill for global (if needed)
if (typeof (globalThis as any).global === 'undefined') {
  (globalThis as any).global = globalThis;
}

console.log('Browser polyfills loaded successfully');

