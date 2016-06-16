module.exports = function (global, main, modules) {
  var cache = {};
  (function require(id) {
    cache[id] || (cache[id] = {exports: {}},
    modules[id].call(global, cache[id].exports, require, cache[id]));
    return cache[id].exports;
  }(main));
};
