import test from 'ava';

import {
  getSassFilePermutations,
  getSassExtensionPermutations,
} from '../sass';

test('getSassExtensionPermutations()', t => {
  t.deepEqual(
      getSassExtensionPermutations('main'),
      ['main.scss', 'main.sass'],
      'relative file with no extension returns filename with scss and sass'
    );

  t.deepEqual(
      getSassExtensionPermutations('/main'),
      ['/main.scss', '/main.sass'],
      'absolute file with no extension returns filename with scss and sass'
    );

  t.deepEqual(
    getSassExtensionPermutations('main.sass'),
    ['main.sass'],
    'relative file with sass ext returns same filename with'
  );

  t.deepEqual(
    getSassExtensionPermutations('main.scss'),
    ['main.scss'],
    'relative file with scss ext returns same filename with'
  );

  t.deepEqual(
    getSassExtensionPermutations('/main.sass'),
    ['/main.sass'],
    'relative file with sass ext returns same filename with'
  );

  t.deepEqual(
    getSassExtensionPermutations('/main.scss'),
    ['/main.scss'],
    'absolute file with scss ext returns same filename with'
  );
});

test('getSassFilePermutations() - single include path', t => {
  t.throws(() => getSassFilePermutations('main', []), /\{Array\(min:1\)\} includePaths, got /);
  t.throws(() => getSassFilePermutations('main', ['user/peanut']), /cwd absolute path/);

  t.deepEqual(
      getSassFilePermutations('main', ['/user/peanut/']),
      [
        '/user/peanut/main.scss',
        '/user/peanut/main.sass',
        '/user/peanut/_main.scss',
        '/user/peanut/_main.sass'
      ],
      'relative non partial file, no extension, cwd include path'
    );

  t.deepEqual(
      getSassFilePermutations('/cat/pictures/main', ['/cat/pictures']),
      [
        '/cat/pictures/main.scss',
        '/cat/pictures/main.sass',
        '/cat/pictures/_main.scss',
        '/cat/pictures/_main.sass'
      ],
      'absolute non partial file, no extension, cwd include path'
    );

  t.deepEqual(
      getSassFilePermutations('_main', ['/user/peanut/']),
      [
        '/user/peanut/_main.scss',
        '/user/peanut/_main.sass'
      ],
      'relative partial file, no extension, cwd include path'
    );

  t.deepEqual(
      getSassFilePermutations('_main.scss', ['/user/peanut/']),
      [
        '/user/peanut/_main.scss',
      ],
      'relative partial file, scss ext, cwd include path'
    );

  t.deepEqual(
      getSassFilePermutations('_main.sass', ['/user/peanut/']),
      [
        '/user/peanut/_main.sass',
      ],
      'relative partial file, sass ext, cwd include path'
    );

  t.deepEqual(
      getSassFilePermutations('/cat/pictures/_main.scss', ['/cat/pictures', '/user/scss/']),
      [
        '/cat/pictures/_main.scss',
      ],
      'absolute partial file, scss ext, multiple include path'
    );

  t.deepEqual(
      getSassFilePermutations('/cat/pictures/_main.sass', ['/cat/pictures/', '/user/sass']),
      [
        '/cat/pictures/_main.sass',
      ],
      'absolute partial file, sass ext, multiple include path'
    );
});

test('getSassFilePermutations() - multiple include paths', t => {

  t.deepEqual(
      getSassFilePermutations('main', ['/user/peanut/', '/user/peanut/node_modules']),
      [
        '/user/peanut/main.scss',
        '/user/peanut/main.sass',
        '/user/peanut/_main.scss',
        '/user/peanut/_main.sass',
        '/user/peanut/node_modules/main.scss',
        '/user/peanut/node_modules/main.sass',
        '/user/peanut/node_modules/_main.scss',
        '/user/peanut/node_modules/_main.sass',
      ],
      'relative non partial file, no extension, multiple include paths'
    );

  t.deepEqual(
      getSassFilePermutations('main', ['/user/peanut/', 'node_modules']),
      [
        '/user/peanut/main.scss',
        '/user/peanut/main.sass',
        '/user/peanut/_main.scss',
        '/user/peanut/_main.sass',
        '/user/peanut/node_modules/main.scss',
        '/user/peanut/node_modules/main.sass',
        '/user/peanut/node_modules/_main.scss',
        '/user/peanut/node_modules/_main.sass',
      ],
      'relative non partial file, no extension, multiple include paths'
    );
});

