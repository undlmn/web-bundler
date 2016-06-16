WebBundler
==========

Simple, fast and compact bundling tool.

Organize your code using modules in the traditional CommonJS format, load modules installed by [npm](https://www.npmjs.com) and packs it all into a single js file for the browser.

### Example

src/index.js

```js
var foo = require('./lib/foo');
var $ = require('jquery');

$('#btn').click(function () {
  $('#res').text(foo());
});
```

src/lib/foo.js

```js
module.exports = function () {
  return 42;
};
```

Make bundle.js

    $ bundler src -o dist/bundle.js

The bundler will recursively search for all the requested modules in the same way as it does Node.js (including node_modules paths, reading package.json) changes the path of `require()` on a unique name and packs everything into a single js file.

dist/bundle.js

```js
(function (global, main, modules) {
  var cache = {};
  (function require(id) {
    cache[id] || (cache[id] = {exports: {}},
    modules[id].call(global, cache[id].exports, require, cache[id]));
    return cache[id].exports;
  }(main));
}(this, 'index', {
  // ---------------------------------------------------------------------------
  'index': function(exports, require, module) {
    var foo = require('foo');
    var $ = require('jquery');

    $('#btn').click(function () {
      $('#res').text(foo());
    });
  },
  // ---------------------------------------------------------------------------
  'foo': function(exports, require, module) {
    module.exports = function () {
      return 42;
    };
  },
  // ---------------------------------------------------------------------------
  'jquery': function(exports, require, module) {
    /*!
     * jQuery JavaScript Library ...
     * ...
     */
    ( function( global, factory ) {
    ...
  }
  // ---------------------------------------------------------------------------
}));
```

Or compressed and minimized via UglifyJS

    $ bundler src -c -o dist/bundle.js

dist/bundle.js

```js
!function(e,t,n){var r={};!function i(t){return r[t]||(r[t]={exports:{}},n[t]...
```

Also available tracking mode for files changes (watch)

```
$ bundler src -c -o dist/bundle.js -w

16:37:36 87094 bytes written to dist/bundle.js (6.121 ms)
...
```

Install
-------

For use as a command line app:

    $ npm install web-bundler -g

For programmatic use:

    $ npm install web-bundler

CLI Reference
-------------

### Usage

```
bundler ˂file˃ [options]

Options:

  -h, --help                 output usage information
  -V, --version              output the version number
  -H, --handler ˂name|file˃  make with the specified handler (default compact)
  -c, --compress             compress and minimize via UglifyJS
  -o, --output ˂file˃        output file (default stdout)
  -w, --watch                tracking mode for files changes
```

### Options details

<a name="handler"></a>
#### `-H, --handler ˂name|file˃`

Handler is the main self-invoking anonymous function, which calls the modules, caches and returns theirs exports.

Available values:

##### `compact` <small>(default)</small>

```js
function (global, main, modules) {
  var cache = {};
  (function require(id) {
    cache[id] || (cache[id] = {exports: {}},
    modules[id].call(global, cache[id].exports, require, cache[id]));
    return cache[id].exports;
  }(main));
}
```

##### `node`

with Node.js `module` and `require` properties emulation:

```
module
  .id
  .exports
  .parent
  .loaded
  .children
require
  .main
  .cache
```

Source: [handlers/node.js](./handlers/node.js)

##### `˂file˃`

You can use another handler by specifying the path to the file. It should be:

```js
module.exports = function (global, main, modules) { ... };
```

#### `-o, --output ˂file˃`

Specify `--output` (`-o`) to declare the output file. Otherwise the output
goes to stdout.

API Reference
-------------

```js
const bundler = require('web-bundler');

let bundle = bundler('./src/main.js');

console.log('bundle');
```

### Usage

```
bundler( file [, options] );
```

Return the bundle source as *String*.

- `file` *String* - path to the main js file.
- `options` *Object* - additional options.

Argument `file` can be a directory if it contains package.json pointing to the main file or contains index.js file.

### Options

#### `options.handler` <small>*String* (default: `compact`)</small>

Name or path to the file with the handler function. See [--handler](#handler).

#### `options.compress` <small>*Boolean* (default: `false`)</small>

Сompress and minimize via UglifyJS.

#### `options.output` <small>*String* (default: `undefined`)</small>

Writes the output to the specified file. Otherwise the output goes to stdout.

#### `options.watch` <small>*Boolean* (default: `false`)</small>

Enable tracking mode for files changes.

#### `options.onsuccess` <small>*Function* (default: `console.log`)</small>

Callback function takes informational messages as a *String* in the tracking mode.

#### `options.onerror` <small>*Function* (default: `console.error`)</small>

Callback function takes error messages as a *String* in the tracking mode.

License
-------

MIT
