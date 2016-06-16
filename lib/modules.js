/**
 * Search and load modules.
 */

'use strict';

const Path = require('path');
const fs = require('fs');
const EventEmitter = require('events');

class Module {
  /**
   * Initialize a new `Module`.
   *
   * @param      {string}  path     Absolute path to the module file.
   * @param      {Buffer}  content  The module file content.
   */
  constructor(path, content) {
    const p = Path.parse(path);
    this.path = path;
    this.dir  = p.dir;
    this.name = p.name;
    this.ext  = p.ext;
    this.content = content;
  }

  /**
   * Parse content.
   */
  parse() {
    if (this.ext === '.node') {
      throw new Error(`${this.name} is Node.js compiled addon module` +
        ` (${this.path})`);
    }

    const content = this.content.toString().replace(/\r+/g, '');

    const trimed = content.replace(/^\s+|[ \t]+(?=\n)|\s+$/g, '');

    if (this.ext === '.json') {
      this.content = `module.exports = ${trimed};`;
      return;
    }

    const ids = new Map;
    const req = /require\s*\((["'])(.*?)\1\)/g;

    content
      .replace( // Hide the comments to prevent search require() in the comments
        /('|")(?:.|\\\s*\n)*?[^\\]\1|\/\/.*$|\/\*[\s\S]*?\*\//mg, (item) =>
        item[0] === "'" ||
        item[0] === '"' ? item :
        item.replace(/\w/g,"-")
      )
      .split('\n').map((item, line) =>
        item.replace(req,
          (expression, quote, path, position) => {
            let id;
            try {
              id = modules.load(path, this.dir)
            } catch (e) {
              e.message = `${e.message}\n${expression}` +
                ` at ${this.path}:${line + 1}:${position + 1}`;
              throw e;
            }
            ids.set(path, id);
            return expression;
          })
      );

    this.content = trimed.replace(req, (expression, quote, path) =>
        ids.has(path) ? `require(${quote}${ids.get(path)}${quote})` : expression
      );
  }
}

class Modules extends EventEmitter {
  /**
   * Initialize a new `Modules`.
   */
  constructor() {
    super();
    this.items = {};
    this.nextId = 0;
  }

  /**
   * Load a module.
   *
   * Search algorithm: https://nodejs.org/api/modules.html#modules_all_together
   *
   * @param      {string}  path     The path to the module.
   * @param      {string}  cwd      Current work directory.
   * @param      {Object}  options  Additional options.
   * @return     {string}  A unique id (key).
   */
  load(path, cwd, options) {
    cwd || (cwd = '/');
    options && (this.options = options) || (options = this.options || {});

    // // If path is core module
    // if (~('assert buffer child_process cluster console crypto dns domain' +
    //   ' events fs http https net os path punycode readline repl stream' +
    //   ' string_decoder tls dgram url util v8 vm zlib').split(' ')
    //   .indexOf(path)) {
    //   throw new Error(`${path} is Node.js core module`);
    // }
    /* : Reserve the possibility to `require()` the core module emulation from
    node_modules. `throw` moved down. */

    try {
      // If path begins with './' or '../' or '/'
      if (path.startsWith('./') || path.startsWith('../')) {
        loadAsFile(Path.join(cwd, path));
        loadAsDirectory(Path.join(cwd, path));
      } else if (path.startsWith('/') || Path.isAbsolute(path)) { // (win)
        loadAsFile(path);
        loadAsDirectory(path);
      }

      // Load from node_modules
      const dirs = nodeModulesPaths(cwd);
      dirs.forEach(dir => {
        loadAsFile(Path.join(dir, path));
        loadAsDirectory(Path.join(dir, path));
      });

    } catch (module) {
      if (!(module instanceof Module)) {
        throw module;
      }

      // Search if already exist
      for (const id in this.items) {
        if (this.items[id].path === module.path) return id;
      }

      // Compute a unique id
      let id;
      if (options.compress) {
        id = (this.nextId++).toString(36);
      } else {
        const name = ~path.indexOf('/') || ~path.indexOf(Path.sep) ?
          module.name : path;
        let n = 1;
        id = name;
        while (this.items[id]) id = name + (++n);
      }

      this.main || (this.main = id, this.path = module.path); // first -> main

      this.items[id] = module;
      this.items[id].parse();

      return id;
    }

    const notfound = `${path} module not found`;

    if (~('assert buffer child_process cluster console crypto dns domain' +
      ' events fs http https net os path punycode readline repl stream' +
      ' string_decoder tls dgram url util v8 vm zlib').split(' ')
      .indexOf(path)) {
      throw new Error(notfound + ` (${path} is Node.js core module)`);
    }

    throw new Error(notfound);

    /**
     * Attempt to load the module as a file.
     *
     * @param      {string}  path    The path to the file.
     */
    function loadAsFile(path) {
      loadFile(path);
      loadFile(path + '.js');
      loadFile(path + '.json');
      loadFile(path + '.node');
    }

    /**
     * Attempt to load the module as a directory.
     *
     * @param      {string}  path    The path to the directory.
     */
    function loadAsDirectory(path) {
      try {
        var main = JSON.parse(fs.readFileSync(Path.join(path, 'package.json'),
          'utf8')).main;
      } catch (e) {}
      if (typeof main !== 'undefined') loadAsFile(Path.join(path, main));
      loadFile(Path.join(path, 'index.js'));
      loadFile(Path.join(path, 'index.json'));
      loadFile(Path.join(path, 'index.node'));
    }

    /**
     * Attempt to load content.
     *
     * throw new Module if success.
     *
     * @param      {string}  path    The path to the file.
     */
    function loadFile(path) {
      try {
        var content = fs.readFileSync(path);
      } catch (e) {
        return;
      }
      throw new Module(path, content);
    }

    /**
     * Get all possible node_modules paths from the given `cwd`.
     *
     * @param      {string}  cwd     Current work directory.
     * @return     {Array}   node_modules paths.
     */
    function nodeModulesPaths(cwd) {
      const parts = cwd.split(Path.sep);
      const dirs = [];
      for (let i = parts.length; i > 0; --i) {
        if (parts[i - 1] === 'node_modules') continue;
        dirs.push(parts.slice(0, i).concat('node_modules').join(Path.sep));
      }
      return dirs;
    }
  }

  /**
   * Set watcher.
   *
   * emit 'change' and 'error'.
   * 
   * @return     {Modules}  Instance for chaining.
   */
  watch() {
    const watchers = [];
    for (const id in this.items) {
      watchers.push(fs.watch(this.items[id].path, () => {

        watchers.forEach(item => item.close());

        // Delay to ensure that the file is ready
        setTimeout(() => {
          try {
            this.items = {};
            this.load(this.path);
            this.emit('change');
          } catch (e) {
            this.emit('error', e);
          }

          // Delay to prevent repeated alarms while the file info is updating
          setTimeout(() => this.watch(), 2000);
        }, 1000);
      }));
    }
    return this;
  }
}

const modules = exports = module.exports = new Modules();

exports.Module  = Module;
exports.Modules = Modules;
