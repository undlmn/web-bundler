/**
 * Node.js `module` and `require` properties emulation:
 *   module
 *     .id
 *     .exports
 *     .parent
 *     .loaded
 *     .children
 *   require
 *     .main
 *     .cache
 */
module.exports = function (global, main, modules) {
  var cache = {};
  function Module(id, parent) {
    this.id = id;
    this.exports = {};
    this.parent = parent;
    this.loaded = false;
    this.children = [];
    parent && parent.children.push(this);
  }
  Module.prototype.require = function(id) {
    if (cache[id]) return cache[id].exports;
    var module = cache[id] = new Module(id, this);
    load(module);
    return module.exports;
  };
  function load(module) {
    function require(id) {
      return module.require(id);
    }
    require.main = cache[main];
    require.cache = cache;
    modules[module.id].call(global, module.exports, require, module);
    module.loaded = true;
  }
  load(cache[main] = new Module(main, null));
};
