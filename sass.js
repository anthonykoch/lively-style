/*

Could also maybe do this for @extends so that you can see what the resulting through the sourcemap.

*/

import path from 'path';
import util from 'util';
import assert from 'assert';

import gp from 'gonzales-pe';
import sass from 'node-sass';
import get from 'lodash/get';
import last from 'lodash/last';
import flatten from 'lodash/flatten';
import fs from 'fs';

import {
  // createSynchronousTracker,
  createDocumentItem,
} from '../lively-core/src/tracker';

export const IS_WRAPPER = Symbol();

export const Functions = {
  Expression: 'LIVELY',
  Start: 'LIVELY_START',
  End: 'LIVELY_END',
};

// const root = gp.parse('.haha {color: $xd}', { syntax: 'scss' });
// console.log(JSON.stringify(root, 0, 2))

// return root;

/**
 * Returns true if the node has a child with the type passes
 * @param  {Node}    start - The node to check
 * @param  {String}  type  - The node type
 * @param  {Boolean} deep  - Whether or not to check the children of the children for the type
 * @return {Boolean}
 */
export const contains = (start, type, deep=false) => {
  let node = start
  let children = node.content;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];

    // Check the descendants of the node if deep is true
    if (deep && Array.isArray(child.content)) {
      const has = contains(child, type, deep)

      // If a match is found, return it, else continue searching through the rest
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
export const getSassRulesetPropertyValue = (declaration) => {
  const value = declaration.first('value');

  // Make sure the property node (declaration.content[0]) is not a variable declaration
  if (value != null && !contains(declaration.content[0], 'variable', true)) {
    const parent = declaration;
    const node = value;

    return {
      index: parent.content.findIndex(item => item === node),
      node,
      parent,
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
export const getSassVariableDeclarationValue = (declaration) => {
  if (contains(declaration, 'variable', true)) {
    const parent = declaration;
    const node = declaration.first('value');

    if (node) {
      return {
        index: parent.content.findIndex(item => item === node),
        node,
        parent,
      };
    }
  }

  return null;
};

export const getFunctionName = (fnNode) => {
  return get(fnNode, 'content[0].content[0].content');
};

export const isSimpleVariableValue = (node) => {
  const content =
    node && Array.isArray(node.content)
      ? removeModifier(node.content).filter(node => node.type !== 'space')
      : [];

  const first = content.length > 0 ? content[0] : null;

  return (
    content.length === 1 &&
    (
      first.type === 'dimension' ||
      first.type === 'string' ||
      first.type === 'number' ||
      first.type === 'ident' ||
      first.type === 'color'
    )
  );
};

export const isVariableExpression = (node, parent) => {
  if (parent.type === 'property') {
    // The variable is actually a variable declaration.
    return false;
  }

  return true;
};

export const getModifierNode =
  declaration =>
    Array.isArray(declaration.content)
      ? declaration.content.find(node => Scss.MODIFIERS.includes(node.type))
      : null;

const isWrapped = (node, functionName) => {
  if (!Array.isArray(node.content)) return false;

  const content = Scss.filter(node.content, Scss.MODIFIER|Scss.SPACE);

  const first = content[0];
  const last = content[content.length - 1];
  const name = getFunctionName(node);

  // console.log(first === last, functionName, name, name === functionName);

  return (first === last && name === functionName);
};

/**
 * Removes all modifiers from the declaration nodes
 * @type {Array}
 */
export const removeModifier =
  (nodes) => nodes.filter(node => !Scss.MODIFIERS.includes(node.type));

export const Scss = {
  MODIFIERS: ['global', 'default', 'important'],
  MODIFIER: 1,
  SPACE: 2,

  filter(nodes, mask) {
    return nodes.filter(node => {
      let isValid = true;

      if (mask & Scss.MODIFER) {
        isValid = isValid && !Scss.MODIFERS.includes(node.type);
      }

      if (mask & Scss.SPACE) {
        isValid = isValid && node.type !== 'space';
      }

      return isValid;
    });
  },

  createFunction: (name, args=[]) =>
    gp.createNode({
      type: 'function',
      content: [
        Scss.createIdent(name),
        gp.createNode({
          type: 'arguments',
          content: args,
          syntax: 'scss',
        }),
      ],
      syntax: 'scss',
    }),

  createValue: (args) =>
    gp.createNode({ type: 'value', syntax: 'scss', content: args.filter(item => item != null) }),

  createString: content =>
    gp.createNode({ type: 'string', syntax: 'scss', content: `'${content}'` }),

  createIdent: (name) =>
    gp.createNode({ type: 'ident', content: name, syntax: 'scss' }),

  createDelimiter: (space=true) =>
    gp.createNode({ type: 'delimiter', content: ',' + (space ? ' ' : ''), syntax: 'scss' }),

  createSpace: (n=1) =>
    gp.createNode({ type: 'delimiter', content: ' '.repeat(n), syntax: 'scss' }),

  /**
   * Wraps expressions for variables, ruleset property declarations, and ... Returns
   * true if the node was able to be wrapped and false. The parent is mutated.
   *
   * @param  {Node} node
   * @param  {Number} index
   * @param  {Node} parent
   * @return {Boolean}  Returns true if the node could be wrapped.
   */
  wrapRulesetPropertyValue(node, index, parent) {
    if (isSimpleVariableValue(node) || isWrapped(node, Functions.Expression)) {
      return false;
    }

    assert(node.start && node.end, 'already wrapped node');

    const modifierNode = getModifierNode(node);

    node.content = removeModifier(node.content);

    const meta = JSON.stringify({
      type: 'RulesetProperty',
      loc: {
        start: node.start,
        end: node.end,
      },
    });

    const wrapper =
      Scss.createValue(
        [
          Scss.createFunction(Functions.Expression, Scss.delimitedList([node, Scss.createString(meta)])),
        ]
      );

    if (modifierNode) {
      wrapper.content.push(Scss.createSpace());
      wrapper.content.push(modifierNode);
    }

    wrapper[IS_WRAPPER] = true;

    this.replaceIndex(wrapper, index, parent);

    return true;
  },

  wrapVariableDeclarationValue(node, index, parent) {
    if (isSimpleVariableValue(node) || isWrapped(node, Functions.Expression)) {
      return false;
    }

    // console.log('wrapped?', isWrapped(node, Functions.Expression), node)

    const modifierNode = getModifierNode(node);

    node.content = removeModifier(node.content);

    assert(node.start && node.end, 'already wrapped node');

    const meta = JSON.stringify({
      type: 'VariableDeclaration',
      loc: {
        start: node.start,
        end: node.end,
      },
    });

    const wrapper =
      Scss.createValue(
        [
          Scss.createFunction(Functions.Expression, Scss.delimitedList([node, Scss.createString(meta)])),
        ]
      );

    if (modifierNode) {
      wrapper.content.push(Scss.createSpace());
      wrapper.content.push(modifierNode);
    }

    wrapper[IS_WRAPPER] = true;

    this.replaceIndex(wrapper, index, parent);

    return true;
  },

  wrapVariable(node, index, parent) {
    assert(node.start && node.end, 'wrapVariable - trying to wrap an already wrapped thing');

    if (isWrapped(node, Functions.Expression)) {
      return false;
    }

    const meta = JSON.stringify({
      type: 'Variable',
      name: node.content[0].content,
      loc: {
        start: node.start,
        end: node.end,
      },
    });

    const wrapper =
      Scss.createFunction(
        Functions.Expression,
        Scss.delimitedList([node, Scss.createString(meta)]));

    wrapper[IS_WRAPPER] = true;

    this.replaceIndex(wrapper, index, parent);

    return true;
  },

  delimitedList(args) {
    return args.reduce((newlist, item, index, arr) => {
      newlist.push(item);

      if (index < arr.length - 1) {
        newlist.push(Scss.createDelimiter());
      }

      return newlist;
    }, []);
  },

  replaceIndex(wrapper, index, parent) {
    wrapper[IS_WRAPPER] = true;

    parent.removeChild(index);
    parent.insert(index, wrapper);
  },

};

const isNonEmptyString = str => typeof str === 'string' && str.length > 0;

export const serialize = (expr) => {
  if (expr instanceof sass.types.Color) {
    return `rgba(${expr.getR()}, ${expr.getG()}, ${expr.getB()}, ${expr.getA()})`;
  } else if (expr instanceof sass.types.List) {
    const length = expr.getLength();
    let data = '(';

    for (let i = 0; i < length; i++) {

      data += serialize(expr.getValue(i));

      if (i < length - 1) {
        data += ', ';
      }
    }

    data += ')';

    return data;
  } else if (expr instanceof sass.types.Number) {
    return `${expr.getValue()}${expr.getUnit()}`;
  } else if (expr instanceof sass.types.String) {
    return String(expr.getValue());
  } else if (expr instanceof sass.types.Null) {
    return 'null'
  } else if (expr instanceof sass.types.Boolean) {
    return String(expr.getValue());
  } else if (expr instanceof sass.types.Map) {
    const length = expr.getLength();
    let data = '(';

    for (let i = 0; i < length; i++) {
      data += serialize(expr.getKey(i));
      data += ': ';
      data += serialize(expr.getValue(i));

      if (i < length - 1) {
        data += ', ';
      }
    }

    data += ')';

    return data;
  }

  return 'unknown value';
};

export const transform = (input, { filename }={}) => {
  assert(isNonEmptyString(filename), `{String} filename, got ${filename}`);

  if (input.length === 0) {
    return { output: '' };
  }

  const root = gp.parse(input.toString(), { syntax: 'scss' });

  root.traverse((node, index, parent) => {
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

  root.traverse((node) => {
    switch (node.type) {
      case 'declaration':
          {
            const found = getSassRulesetPropertyValue(node);

            if (found) {
              Scss.wrapRulesetPropertyValue(found.node, found.index, found.parent);
            }
          }
          {
            const found = getSassVariableDeclarationValue(node);

            // console.log(inspect(found.node.content, { depth: 20 }))

            if (found) {
              Scss.wrapVariableDeclarationValue(found.node, found.index, found.parent);
            }
          }
        break;
      default:
        break;
    }
  });

  // return console.log(inspect(root, { depth: 50 }))

  const output = root.toString();

  return {
    output,
  };
};

const createFunctionCall = (fnName, data) =>
`
.LIVELY_END {
  color: ${fnName}('${JSON.stringify(data)}');
}
`;

export const getSassExtensionPermutations = (filename) => {
  const ext = path.extname(filename);

  let permutations = null;

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
export const getSassFilePermutations = (filename, includePaths) => {
  assert(isNonEmptyString(filename), `{String(min:1)} filename, got ${filename}`);
  assert(
      Array.isArray(includePaths) && includePaths.length > 0,
      `{Array(min:1)} includePaths, got ${includePaths}`
    );

  const [cwd] = includePaths;

  assert(path.isAbsolute(cwd), 'first include path should be the cwd absolute path');

  let filenames = [];

  if (path.isAbsolute(filename)) {
    filenames = [filename];
  } else {
    filenames = includePaths.map(includePath => {
      // When the include path is absolute
      if (path.isAbsolute(includePath)) {
        return path.join(includePath, filename);
      }

      // For include paths that are not absolute
      return path.join(cwd, includePath, filename);
    });
  }

  return flatten(
    flatten(filenames.map(filename => getSassPartialPermutations(filename)))
      .map(filename => getSassExtensionPermutations(filename))
    );
};

const getFirstExistantFile = (filenames) =>
  filenames
    .reduce((file, filename) => {
      if (file) return file;

      try {
        return {
          path: filename,
          contents: fs.readFileSync(filename, 'utf8'),
        };
      } catch (err) {
        // Yes, swallow the error
      }

      return null;
    }, null);

/**
 * @param  {String} filename
 */
const getSassPartialPermutations = filename => {
  const ext = path.extname(filename);
  const dirname = path.dirname(filename);
  const basename = path.basename(filename);

  return basename[0] === '_' ? [filename] : [filename, path.join(dirname, '_' + basename)];
};

/**
 * Executes functions within the context of a Sass file.
 *
 * TODO: Make this a function of a class that is an event emitter itself?
 *
 * @param  {String} options.data      - The data to be run
 * @param  {String} options.filename  - The filename associated with the data, required
 * @param  {Object} options.functions - Callbacks for certain events
 * @param  {Object} options.cwd       - An absolute path, used to turn relative include path into absolute paths
 * @return {Object}
 */
export const run = ({
    data,
    includePaths: userIncludePaths=[],
    functions={},
    filename,
    rootdir,
    events
  }={}) => {
  assert(isNonEmptyString(data), `{String(min:1)} options.data, got ${data}`);
  assert(isNonEmptyString(rootdir), `{String(min:1)} options.rootdir, got ${rootdir}`);
  assert(path.isAbsolute(rootdir), `options.rootdir should be absolute, got ${filename}`);
  assert(isNonEmptyString(filename), `{String(min:1)} options.filename, got ${filename}`);
  assert(path.isAbsolute(filename), `options.filename should be absolute, got ${filename}`);
  assert(path.basename(filename).length > 0, `options.filename should be a file path, got ${filename}`);
  assert(Array.isArray(userIncludePaths), `{array} options.includePaths, got ${userIncludePaths}`);

  const contextDir = path.dirname(filename);

  const includePaths = [contextDir, ...userIncludePaths];

  const { output } = transform(data, {
    functions,
    filename,
  });

  const docs = [];
  const sassInput =
    createFunctionCall(Functions.Start, { filename })
    + output
    + createFunctionCall(Functions.End, { filename });

  let importStack = [];
  let items = [];

  const emit = (...args) => events != null ? events.emit(...args) : null;

  const rendered = sass.renderSync({
    data: sassInput,
    includePaths,
    importer(url) {
      const filenames = getSassFilePermutations(url, includePaths, contextDir);
      const file = getFirstExistantFile(filenames);

      if (file == null) {
        return null;
      }

      const { output } = transform(file.contents, {
        filename: file.path,
      });

      return {
        contents:
          createFunctionCall(Functions.Start, { filename: file.path })
          + output
          + createFunctionCall(Functions.End, { filename: file.path })
      };

      return null;
    },

    functions: {

      [Functions.Start](data) {
        const meta = JSON.parse(data.getValue());

        importStack.push(meta.filename);
        emit('file-start', meta.filename);

        // Return null so that the ruleset does not get output
        return sass.types.Null();
      },

      [Functions.End]() {
        // When we reach the end of a document, add the document to the list
        const currentFilename = importStack.pop();;

        emit('file-end', currentFilename);
        docs.push({
          filename: currentFilename,
          items: Array.from(items),
        });

        items = [];

        // Return null so that the ruleset does not get output
        return sass.types.Null();
      },

      [Functions.Expression](...args) {
        // Arguments should only ever be 2, the first being the expression and
        // second being metadata to pass along with it
        const list = new sass.types.List(1);
        const expr = args[0];

        // This is not really necessary, but w/e
        list.setValue(0, expr);

        const meta = JSON.parse(args[1].getValue());

        if (
            meta.type === 'VariableDeclaration' ||
            meta.type === 'RulesetProperty' ||
            meta.type === 'Variable'
          ) {
          const serialized = serialize(expr);
          const currentFilename = last(importStack);

          items.push(createDocumentItem(serialized, meta.loc, null, currentFilename));
          emit(meta.type, expr, { value: serialized, loc: meta.loc, path: currentFilename });
          emit('expression', expr, { value: serialized, loc: meta.loc, path: currentFilename });
        }

        return list;
      },

    },

  });

  emit('end', docs, rendered);

  return {
    documents: docs,
    compiled: rendered,
  };
};
