#!/usr/bin/env node

'use strict';

const path = require('path');
const options = require('commander');
const pkg = require('../package');
const bundler = require('../');

options
  .version(pkg.version)
  .description(pkg.description)
  .usage('<file> [options]')
  .option('-H, --handler <name|file>', 'make with the specified handler (default compact)')
  .option('-c, --compress', 'compress and minimize via UglifyJS')
  .option('-o, --output <file>', 'output file (default stdout)')
  .option('-w, --watch', 'tracking mode for files changes')
  .parse(process.argv);

if (options.args.length !== 1) options.help();

options.cwd = process.cwd();

try {
  let bundle = bundler(options.args[0], options);
  options.output || console.log(bundle);
} catch (e) {
  console.error(`${e.name}: ${e.message}`);
  // console.error(e.stack);
  process.exit(1);
}
