"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.run = exports.getSassFilePermutations = exports.getSassExtensionPermutations = exports.transform = exports.serialize = exports.Scss = exports.removeModifier = exports.getModifierNode = exports.isVariableExpression = exports.isSimpleVariableValue = exports.getFunctionName = exports.getSassVariableDeclarationValue = exports.getSassRulesetPropertyValue = exports.contains = exports.Functions = exports.IS_WRAPPER = void 0;

var _path = _interopRequireDefault(require("path"));

var _util = _interopRequireDefault(require("util"));

var _assert = _interopRequireDefault(require("assert"));

var _gonzalesPe = _interopRequireDefault(require("gonzales-pe"));

var _nodeSass = _interopRequireDefault(require("node-sass"));

var _get = _interopRequireDefault(require("lodash/get"));

var _last = _interopRequireDefault(require("lodash/last"));

var _flatten = _interopRequireDefault(require("lodash/flatten"));

var _fs = _interopRequireDefault(require("fs"));

var _tracker = require("../lively-core/src/tracker");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _slicedToArray(arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return _sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }

var IS_WRAPPER = Symbol();
exports.IS_WRAPPER = IS_WRAPPER;
var Functions = {
  Expression: 'LIVELY',
  Start: 'LIVELY_START',
  End: 'LIVELY_END'
}; // const root = gp.parse('.haha {color: $xd}', { syntax: 'scss' });
// console.log(JSON.stringify(root, 0, 2))
// return root;

/**
 * Returns true if the node has a child with the type passes
 * @param  {Node}    start - The node to check
 * @param  {String}  type  - The node type
 * @param  {Boolean} deep  - Whether or not to check the children of the children for the type
 * @return {Boolean}
 */

exports.Functions = Functions;

var contains = function contains(start, type) {
  var deep = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
  var node = start;
  var children = node.content;

  for (var i = 0; i < children.length; i++) {
    var child = children[i]; // Check the descendants of the node if deep is true

    if (deep && Array.isArray(child.content)) {
      var has = contains(child, type, deep); // If a match is found, return it, else continue searching through the rest
      // of the sibling nodes.

      if (has) {
        return has;
      }
    }

    if (child.type === type) {
      return true;
    }
  }

  return false;
};
/**
 * Returns an object with properties for the found node, parent, and index. If
 * they are not found, each property will be null;
 * @param  {Node} declaration - A declaration node
 * @return {Object}
 */


exports.contains = contains;

var getSassRulesetPropertyValue = function getSassRulesetPropertyValue(declaration) {
  var value = declaration.first('value'); // Make sure the property node (declaration.content[0]) is not a variable declaration

  if (value != null && !contains(declaration.content[0], 'variable', true)) {
    var parent = declaration;
    var node = value;
    return {
      index: parent.content.findIndex(function (item) {
        return item === node;
      }),
      node: node,
      parent: parent
    };
  }

  return null;
};
/**
 * Returns an object with properties for the found node, parent, and index. If
 * they are not found, each property will be null;
 * @param  {Node} declaration - A declaration node
 * @return {Object}
 */


exports.getSassRulesetPropertyValue = getSassRulesetPropertyValue;

var getSassVariableDeclarationValue = function getSassVariableDeclarationValue(declaration) {
  if (contains(declaration, 'variable', true)) {
    var parent = declaration;
    var node = declaration.first('value');

    if (node) {
      return {
        index: parent.content.findIndex(function (item) {
          return item === node;
        }),
        node: node,
        parent: parent
      };
    }
  }

  return null;
};

exports.getSassVariableDeclarationValue = getSassVariableDeclarationValue;

var getFunctionName = function getFunctionName(fnNode) {
  return (0, _get.default)(fnNode, 'content[0].content[0].content');
};

exports.getFunctionName = getFunctionName;

var isSimpleVariableValue = function isSimpleVariableValue(node) {
  var content = node && Array.isArray(node.content) ? removeModifier(node.content).filter(function (node) {
    return node.type !== 'space';
  }) : [];
  var first = content.length > 0 ? content[0] : null;
  return content.length === 1 && (first.type === 'dimension' || first.type === 'string' || first.type === 'number' || first.type === 'ident' || first.type === 'color');
};

exports.isSimpleVariableValue = isSimpleVariableValue;

var isVariableExpression = function isVariableExpression(node, parent) {
  if (parent.type === 'property') {
    // The variable is actually a variable declaration.
    return false;
  }

  return true;
};

exports.isVariableExpression = isVariableExpression;

var getModifierNode = function getModifierNode(declaration) {
  return Array.isArray(declaration.content) ? declaration.content.find(function (node) {
    return Scss.MODIFIERS.includes(node.type);
  }) : null;
};

exports.getModifierNode = getModifierNode;

var isWrapped = function isWrapped(node, functionName) {
  if (!Array.isArray(node.content)) return false;
  var content = Scss.filter(node.content, Scss.MODIFIER | Scss.SPACE);
  var first = content[0];
  var last = content[content.length - 1];
  var name = getFunctionName(node); // console.log(first === last, functionName, name, name === functionName);

  return first === last && name === functionName;
};
/**
 * Removes all modifiers from the declaration nodes
 * @type {Array}
 */


var removeModifier = function removeModifier(nodes) {
  return nodes.filter(function (node) {
    return !Scss.MODIFIERS.includes(node.type);
  });
};

exports.removeModifier = removeModifier;
var Scss = {
  MODIFIERS: ['global', 'default', 'important'],
  MODIFIER: 1,
  SPACE: 2,
  filter: function filter(nodes, mask) {
    return nodes.filter(function (node) {
      var isValid = true;

      if (mask & Scss.MODIFER) {
        isValid = isValid && !Scss.MODIFERS.includes(node.type);
      }

      if (mask & Scss.SPACE) {
        isValid = isValid && node.type !== 'space';
      }

      return isValid;
    });
  },
  createFunction: function createFunction(name) {
    var args = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    return _gonzalesPe.default.createNode({
      type: 'function',
      content: [Scss.createIdent(name), _gonzalesPe.default.createNode({
        type: 'arguments',
        content: args,
        syntax: 'scss'
      })],
      syntax: 'scss'
    });
  },
  createValue: function createValue(args) {
    return _gonzalesPe.default.createNode({
      type: 'value',
      syntax: 'scss',
      content: args.filter(function (item) {
        return item != null;
      })
    });
  },
  createString: function createString(content) {
    return _gonzalesPe.default.createNode({
      type: 'string',
      syntax: 'scss',
      content: "'".concat(content, "'")
    });
  },
  createIdent: function createIdent(name) {
    return _gonzalesPe.default.createNode({
      type: 'ident',
      content: name,
      syntax: 'scss'
    });
  },
  createDelimiter: function createDelimiter() {
    var space = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
    return _gonzalesPe.default.createNode({
      type: 'delimiter',
      content: ',' + (space ? ' ' : ''),
      syntax: 'scss'
    });
  },
  createSpace: function createSpace() {
    var n = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return _gonzalesPe.default.createNode({
      type: 'delimiter',
      content: ' '.repeat(n),
      syntax: 'scss'
    });
  },

  /**
   * Wraps expressions for variables, ruleset property declarations, and ... Returns
   * true if the node was able to be wrapped and false. The parent is mutated.
   *
   * @param  {Node} node
   * @param  {Number} index
   * @param  {Node} parent
   * @return {Boolean}  Returns true if the node could be wrapped.
   */
  wrapRulesetPropertyValue: function wrapRulesetPropertyValue(node, index, parent) {
    if (isSimpleVariableValue(node) || isWrapped(node, Functions.Expression)) {
      return false;
    }

    (0, _assert.default)(node.start && node.end, 'already wrapped node');
    var modifierNode = getModifierNode(node);
    node.content = removeModifier(node.content);
    var meta = JSON.stringify({
      type: 'RulesetProperty',
      loc: {
        start: node.start,
        end: node.end
      }
    });
    var wrapper = Scss.createValue([Scss.createFunction(Functions.Expression, Scss.delimitedList([node, Scss.createString(meta)]))]);

    if (modifierNode) {
      wrapper.content.push(Scss.createSpace());
      wrapper.content.push(modifierNode);
    }

    wrapper[IS_WRAPPER] = true;
    this.replaceIndex(wrapper, index, parent);
    return true;
  },
  wrapVariableDeclarationValue: function wrapVariableDeclarationValue(node, index, parent) {
    if (isSimpleVariableValue(node) || isWrapped(node, Functions.Expression)) {
      return false;
    } // console.log('wrapped?', isWrapped(node, Functions.Expression), node)


    var modifierNode = getModifierNode(node);
    node.content = removeModifier(node.content);
    (0, _assert.default)(node.start && node.end, 'already wrapped node');
    var meta = JSON.stringify({
      type: 'VariableDeclaration',
      loc: {
        start: node.start,
        end: node.end
      }
    });
    var wrapper = Scss.createValue([Scss.createFunction(Functions.Expression, Scss.delimitedList([node, Scss.createString(meta)]))]);

    if (modifierNode) {
      wrapper.content.push(Scss.createSpace());
      wrapper.content.push(modifierNode);
    }

    wrapper[IS_WRAPPER] = true;
    this.replaceIndex(wrapper, index, parent);
    return true;
  },
  wrapVariable: function wrapVariable(node, index, parent) {
    (0, _assert.default)(node.start && node.end, 'wrapVariable - trying to wrap an already wrapped thing');

    if (isWrapped(node, Functions.Expression)) {
      return false;
    }

    var meta = JSON.stringify({
      type: 'Variable',
      name: node.content[0].content,
      loc: {
        start: node.start,
        end: node.end
      }
    });
    var wrapper = Scss.createFunction(Functions.Expression, Scss.delimitedList([node, Scss.createString(meta)]));
    wrapper[IS_WRAPPER] = true;
    this.replaceIndex(wrapper, index, parent);
    return true;
  },
  delimitedList: function delimitedList(args) {
    return args.reduce(function (newlist, item, index, arr) {
      newlist.push(item);

      if (index < arr.length - 1) {
        newlist.push(Scss.createDelimiter());
      }

      return newlist;
    }, []);
  },
  replaceIndex: function replaceIndex(wrapper, index, parent) {
    wrapper[IS_WRAPPER] = true;
    parent.removeChild(index);
    parent.insert(index, wrapper);
  }
};
exports.Scss = Scss;

var isNonEmptyString = function isNonEmptyString(str) {
  return typeof str === 'string' && str.length > 0;
};

var serialize = function serialize(expr) {
  if (expr instanceof _nodeSass.default.types.Color) {
    return "rgba(".concat(expr.getR(), ", ").concat(expr.getG(), ", ").concat(expr.getB(), ", ").concat(expr.getA(), ")");
  } else if (expr instanceof _nodeSass.default.types.List) {
    var length = expr.getLength();
    var data = '(';

    for (var i = 0; i < length; i++) {
      data += serialize(expr.getValue(i));

      if (i < length - 1) {
        data += ', ';
      }
    }

    data += ')';
    return data;
  } else if (expr instanceof _nodeSass.default.types.Number) {
    return "".concat(expr.getValue()).concat(expr.getUnit());
  } else if (expr instanceof _nodeSass.default.types.String) {
    return String(expr.getValue());
  } else if (expr instanceof _nodeSass.default.types.Null) {
    return 'null';
  } else if (expr instanceof _nodeSass.default.types.Boolean) {
    return String(expr.getValue());
  } else if (expr instanceof _nodeSass.default.types.Map) {
    var _length = expr.getLength();

    var _data = '(';

    for (var _i = 0; _i < _length; _i++) {
      _data += serialize(expr.getKey(_i));
      _data += ': ';
      _data += serialize(expr.getValue(_i));

      if (_i < _length - 1) {
        _data += ', ';
      }
    }

    _data += ')';
    return _data;
  }

  return 'unknown value';
};

exports.serialize = serialize;

var transform = function transform(input) {
  var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
      filename = _ref.filename;

  (0, _assert.default)(isNonEmptyString(filename), "{String} filename, got ".concat(filename));

  if (input.length === 0) {
    return {
      output: ''
    };
  }

  var root = _gonzalesPe.default.parse(input.toString(), {
    syntax: 'scss'
  });

  root.traverse(function (node, index, parent) {
    switch (node.type) {
      case 'variable':
        if (isVariableExpression(node, parent)) {
          Scss.wrapVariable(node, index, parent);
        }

        break;

      default:
        break;
    }
  });
  root.traverse(function (node) {
    switch (node.type) {
      case 'declaration':
        {
          var found = getSassRulesetPropertyValue(node);

          if (found) {
            Scss.wrapRulesetPropertyValue(found.node, found.index, found.parent);
          }
        }
        {
          var _found = getSassVariableDeclarationValue(node); // console.log(inspect(found.node.content, { depth: 20 }))


          if (_found) {
            Scss.wrapVariableDeclarationValue(_found.node, _found.index, _found.parent);
          }
        }
        break;

      default:
        break;
    }
  }); // return console.log(inspect(root, { depth: 50 }))

  var output = root.toString();
  return {
    output: output
  };
};

exports.transform = transform;

var createFunctionCall = function createFunctionCall(fnName, data) {
  return "\n.LIVELY_END {\n  color: ".concat(fnName, "('").concat(JSON.stringify(data), "');\n}\n");
};

var getSassExtensionPermutations = function getSassExtensionPermutations(filename) {
  var ext = _path.default.extname(filename);

  var permutations = null;

  if (ext) {
    permutations = [filename];
  } else {
    permutations = [filename + '.scss', filename + '.sass'];
  }

  return permutations;
};
/**
 * Returns the possible permutations of a sass file import.
 *
 * @param  {String} filename     - The filename to get permutations of
 * @param  {Array} includePaths  - Include paths delimited by path.delimiter
 * @return {Array<String>}
 */


exports.getSassExtensionPermutations = getSassExtensionPermutations;

var getSassFilePermutations = function getSassFilePermutations(filename, includePaths) {
  (0, _assert.default)(isNonEmptyString(filename), "{String(min:1)} filename, got ".concat(filename));
  (0, _assert.default)(Array.isArray(includePaths) && includePaths.length > 0, "{Array(min:1)} includePaths, got ".concat(includePaths));

  var _includePaths = _slicedToArray(includePaths, 1),
      cwd = _includePaths[0];

  (0, _assert.default)(_path.default.isAbsolute(cwd), 'first include path should be the cwd absolute path');
  var filenames = [];

  if (_path.default.isAbsolute(filename)) {
    filenames = [filename];
  } else {
    filenames = includePaths.map(function (includePath) {
      // When the include path is absolute
      if (_path.default.isAbsolute(includePath)) {
        return _path.default.join(includePath, filename);
      } // For include paths that are not absolute


      return _path.default.join(cwd, includePath, filename);
    });
  }

  return (0, _flatten.default)((0, _flatten.default)(filenames.map(function (filename) {
    return getSassPartialPermutations(filename);
  })).map(function (filename) {
    return getSassExtensionPermutations(filename);
  }));
};

exports.getSassFilePermutations = getSassFilePermutations;

var getFirstExistantFile = function getFirstExistantFile(filenames) {
  return filenames.reduce(function (file, filename) {
    if (file) return file;

    try {
      return {
        path: filename,
        contents: _fs.default.readFileSync(filename, 'utf8')
      };
    } catch (err) {// Yes, swallow the error
    }

    return null;
  }, null);
};
/**
 * @param  {String} filename
 */


var getSassPartialPermutations = function getSassPartialPermutations(filename) {
  var ext = _path.default.extname(filename);

  var dirname = _path.default.dirname(filename);

  var basename = _path.default.basename(filename);

  return basename[0] === '_' ? [filename] : [filename, _path.default.join(dirname, '_' + basename)];
};
/**
 * Executes functions within the context of a Sass file.
 *
 * TODO: Make this a function of a class that is an event emitter itself?
 *
 * @param  {String} options.data      - The data to be run
 * @param  {String} options.filename  - The filename associated with the data, required
 * @param  {Object} options.cwd       - An absolute path, used to turn relative include path into absolute paths
 * @return {Object}
 */


var run = function run() {
  var _functions;

  var _ref2 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      data = _ref2.data,
      _ref2$includePaths = _ref2.includePaths,
      userIncludePaths = _ref2$includePaths === void 0 ? [] : _ref2$includePaths,
      filename = _ref2.filename,
      cwd = _ref2.cwd,
      events = _ref2.events;

  (0, _assert.default)(isNonEmptyString(data), "{String(min:1)} options.data, got ".concat(data));
  (0, _assert.default)(isNonEmptyString(cwd), "{String(min:1)} options.cwd, got ".concat(cwd));
  (0, _assert.default)(_path.default.isAbsolute(cwd), "options.cwd should be absolute, got ".concat(cwd));
  (0, _assert.default)(isNonEmptyString(filename), "{String(min:1)} options.filename, got ".concat(filename));
  (0, _assert.default)(_path.default.isAbsolute(filename), "options.filename should be absolute, got ".concat(filename));
  (0, _assert.default)(_path.default.basename(filename).length > 0, "options.filename should be a file path, got ".concat(filename));
  (0, _assert.default)(Array.isArray(userIncludePaths), "{array} options.includePaths, got ".concat(userIncludePaths));

  var basedir = _path.default.dirname(filename);

  var includePaths = [basedir].concat(_toConsumableArray(userIncludePaths));

  var _transform = transform(data, {
    filename: filename
  }),
      output = _transform.output;

  var docs = [];
  var sassInput = createFunctionCall(Functions.Start, {
    filename: filename
  }) + output + createFunctionCall(Functions.End, {
    filename: filename
  });
  var importStack = [];
  var items = [];

  var emit = function emit() {
    return events != null ? events.emit.apply(events, arguments) : null;
  };

  var rendered = _nodeSass.default.renderSync({
    data: sassInput,
    includePaths: includePaths,
    importer: function importer(url) {
      var filenames = getSassFilePermutations(url, includePaths, cwd);
      var file = getFirstExistantFile(filenames);

      if (file == null) {
        return null;
      }

      var _transform2 = transform(file.contents, {
        filename: file.path
      }),
          output = _transform2.output;

      return {
        contents: createFunctionCall(Functions.Start, {
          filename: file.path
        }) + output + createFunctionCall(Functions.End, {
          filename: file.path
        })
      };
      return null;
    },
    functions: (_functions = {}, _defineProperty(_functions, Functions.Start, function (data) {
      var meta = JSON.parse(data.getValue());
      importStack.push(meta.filename);
      emit('file-start', meta.filename); // Return null so that the ruleset does not get output

      return _nodeSass.default.types.Null();
    }), _defineProperty(_functions, Functions.End, function () {
      // When we reach the end of a document, add the document to the list
      var currentFilename = importStack.pop();
      ;
      emit('file-end', currentFilename);
      docs.push({
        filename: currentFilename,
        items: Array.from(items)
      });
      items = []; // Return null so that the ruleset does not get output

      return _nodeSass.default.types.Null();
    }), _defineProperty(_functions, Functions.Expression, function () {
      // Arguments should only ever be 2, the first being the expression and
      // second being metadata to pass along with it
      var list = new _nodeSass.default.types.List(1);

      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      var expr = args[0]; // This is not really necessary, but w/e

      list.setValue(0, expr);
      var meta = JSON.parse(args[1].getValue());

      if (meta.type === 'VariableDeclaration' || meta.type === 'RulesetProperty' || meta.type === 'Variable') {
        var serialized = serialize(expr);
        var currentFilename = (0, _last.default)(importStack);
        items.push((0, _tracker.createDocumentItem)(serialized, meta.loc, null, currentFilename));
        emit(meta.type, expr, {
          value: serialized,
          loc: meta.loc,
          path: currentFilename
        });
        emit('expression', expr, {
          value: serialized,
          loc: meta.loc,
          path: currentFilename
        });
      }

      return list;
    }), _functions)
  });

  emit('end', docs, rendered);
  return {
    documents: docs,
    compiled: rendered
  };
};

exports.run = run;