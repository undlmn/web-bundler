'use strict';

const fs = require('fs');
const path = require('path');
const UglifyJS = require("uglify-js");
const modules = require('./lib/modules');

/**
 * Bundler.
 *
 * @param      {string}  file     The path to the main js file.
 * @param      {Object}  options  Additional options.
 * @return     {string}  Source of the bundle.
 */
exports = module.exports = function (file, options) {
  options || (options = {});

  options.handler   || (options.handler   = 'compact');
  options.onsuccess || (options.onsuccess = console.log);
  options.onerror   || (options.onerror   = console.error);
  options.cwd       || (options.cwd       = path.dirname(module.parent.filename) || __dirname);

  path.isAbsolute(file) || (file = path.join(options.cwd, file));

  // Search and load all modules
  modules.load(file, '/', options);

  // Tracking for files changes
  options.watch && options.output && modules.watch().on('change', make).on('error', message);

  return make();

  /**
   * Make the bundle.
   *
   * @return     {string}  Source of the bundle.
   */
  function make() {
    const time = process.hrtime();
    const handler = require(
      ~options.handler.indexOf('/') || ~options.handler.indexOf(path.sep) ?
      (path.isAbsolute(options.handler) ?
      options.handler :
      path.join(options.cwd, options.handler)) :
      './handlers/' + options.handler).toString();

    const wrapped = [];
    for (const id in modules.items) {
      // Indent
      const content = modules.items[id].content.split('\n').map(item =>
        item && '    ' + item).join('\n');

      wrapped.push(`  '${id}': function(exports, require, module) {\n${content}\n  }`);
    }
    const separator = `  // ${'-'.repeat(75)}\n`;
    const source = wrapped.join(',\n' + separator);

    let bundle = `(${handler}(this, '${modules.main}', {\n${separator}${source}\n${separator}}));`;

    options.compress && (bundle = UglifyJS.minify(bundle, {fromString: true}).code);

    if (options.output) {
      try {
        fs.writeFileSync(options.output, bundle);
        const duration = process.hrtime(time);
        const ms = duration[0] * 1e3 + duration[1] / 1e6;
        message(`${bundle.length} bytes written to ${options.output} (${ms.toFixed(3)} ms)`);
      }
      catch (e) {
        message(e);
      }
    }
    return bundle;
  }

  /**
   * Messages processing.
   *
   * @param      {string|Error}  m       Message text or error.
   */
  function message(m) {
    if (!options.watch) {
      if (m instanceof Error) throw m;
      return;
    }
    const time = new Date().toTimeString().split(' ')[0];
    m instanceof Error ?
      typeof options.onerror === 'function' && options.onerror(`${time} ${m.name}: ${m.message}`) :
      typeof options.onsuccess === 'function' && options.onsuccess(`${time} ${m}`);
  }
}
