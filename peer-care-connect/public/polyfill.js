// Browser polyfills for Node.js compatibility
(function() {
  'use strict';
  
  // Polyfill for JY.inherits (Node.js inheritance pattern)
  if (typeof window.JY === 'undefined') {
    window.JY = {};
  }
  
  if (typeof window.JY.inherits === 'undefined') {
    window.JY.inherits = function(ctor, superCtor) {
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
  if (typeof window.util === 'undefined') {
    window.util = {};
  }
  
  if (typeof window.util.inherits === 'undefined') {
    window.util.inherits = window.JY.inherits;
  }
  
  // Polyfill for global
  if (typeof window.global === 'undefined') {
    window.global = window;
  }
  
  // Polyfill for process
  if (typeof window.process === 'undefined') {
    window.process = {
      env: {},
      nextTick: function(callback) {
        setTimeout(callback, 0);
      },
      browser: true
    };
  }
  
  // Polyfill for Buffer
  if (typeof window.Buffer === 'undefined') {
    window.Buffer = {
      from: function(data) {
        return new Uint8Array(data);
      },
      isBuffer: function(obj) {
        return obj instanceof Uint8Array;
      }
    };
  }
  
  // Ensure React hooks work properly
  if (typeof window.React === 'undefined') {
    // This will be set by React when it loads
    window.React = null;
  }
  
  // Browser polyfills loaded
})();
