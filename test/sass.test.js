import test from 'ava';
import sinon from 'sinon';

import { EventEmitter } from 'events';

import sass from 'node-sass';

import {
  run,
  serialize,
} from '../sass';

import {
  DIR_SASS,
  FILE_BUTTON,
  FILE_MAIN,
  FILE_RELATIVE_BUTTON,
  CONTENT_MAIN,
} from './constants';

const types = sass.types;

test('run() - accepts only valid arguments', t => {
  t.throws(() => run(), /options\.data, got undefined/);
  t.throws(() => run({ data: '' }), /options\.data, got $/, 'empty data throws');
  t.throws(() => run({ data: '.hello {}' }), /options\.cwd, got undefined/i, 'undefined cwd');
  t.throws(
      () => run({ data: '.hello {}', cwd: 'sass/' }),
      /options\.cwd should be absolute, got sass\//i,
      'non-absolute cwd'
    );

  t.throws(
      () => run({ data: '.hello {}', cwd: '/' }),
      /\{string\(min:1\)\} options\.filename, got undefined/i,
      'filename undefiend'
    );

  t.throws(
      () => run({ data: '.hello {}', cwd: '/', filename: '/' }),
      /options\.filename should be a file path/,
      'filename with basename'
    );

  t.notThrows(
      () => run({ data: '.hello {}', cwd: '/', filename: '/hello.scss' }),
      'all valid args'
    );
});

test('fires events for start of file, end of file, and expressions', t => {
  const FILENAME = '/src/sass/main.scss';
  const events = new EventEmitter();
  const expressionSpy = sinon.spy();
  const fileStartSpy = sinon.spy();
  const fileStopSpy = sinon.spy();

  events.on('expression', expressionSpy);
  events.on('file-start', fileStartSpy);
  events.on('file-end', fileStopSpy);

  const data =
`
$breakpoint-small: 480px;
$breakpoints: $breakpoint-small;
`;

  t.notThrows(() => {
    const { documents } = run({
      data,
      filename: FILENAME,
      cwd: '/src/sass',
      events
    });

    t.is(expressionSpy.callCount, 1);

    t.true(fileStartSpy.calledOnce);
    t.true(fileStartSpy.firstCall.calledWith(FILENAME))

    t.true(fileStopSpy.calledOnce);
    t.true(fileStopSpy.firstCall.calledWith(FILENAME))
  });
});

// test.skip('Logs all variables and property values', t => {
//   const events = new EventEmitter();

//   events.on('expression', (sassValue, { value }) => {
//     console.log(value === '480px');
//   });

//   const data = '$breakpoint-small: 480px; $breakpoints: $breakpoint-small;';

//   t.notThrows(() => {
//     const { documents } = run({
//       data,
//       filename: '/src/sass/main.scss',
//       cwd: '/src/sass',
//       events
//     });

//   });
// });

test('Does not track simple expressions', t => {
  const data =
`
$breakpoint-small: 480px;
$breakpoint-small: 480;
$breakpoint-small: red;
$breakpoint-small: hello;

.banner {
  color: red;
  font-size: 18px;
  margin-left: 1rem;
  background-color: 1rem;

  &:after {
    content: 'Step:';
    is-fake-property: true;
  }
}
`;

  t.notThrows(() => {
    const { documents } = run({
      data,
      filename: '/src/sass/main.scss',
      cwd: '/src/sass',
    });

    t.is(documents[0].items.length, 0);
  });
});

test('serialize(sassValue) - serializes sass values', t => {
  const innerMap = new types.Map(1);
  const map = new types.Map(2);
  const list = new types.List(3);
  const s = (...args) => new types.String(...args);
  const n = (...args) => new types.Number(...args);

  list.setValue(0, s('coconut'));
  list.setValue(1, s('lime'));
  list.setValue(2, n(123));
  innerMap.setKey(0, s('small'))
  innerMap.setValue(0, s('480px'));
  map.setKey(0, s('coconut'));
  map.setValue(0, s('lime'));
  map.setKey(1, s('breakpoints'));
  map.setValue(1, innerMap);

  t.is(serialize(s('coconut')), 'coconut');
  t.is(serialize(n(640)), '640');
  t.is(serialize(n(480, 'px')), '480px');
  t.is(serialize(types.Boolean.FALSE), 'false');
  t.is(serialize(types.Boolean.TRUE), 'true');
  t.is(serialize(types.Null.NULL), 'null');
  t.is(serialize(map), '(coconut: lime, breakpoints: (small: 480px))', 'nested map');
  t.is(serialize(list), '(coconut, lime, 123)', 'list');
  t.is(serialize(new types.Map(0)), '()', 'empty map');
  t.is(serialize(new types.List(0)), '()', 'empty list');
});

test('transforms imported files', t => {
  const expected = [
    {
      filename: FILE_BUTTON,
      items: [
        {
          filename: FILE_BUTTON,
          value: 'rgba(255, 0, 0, 1)',
          loc: { start: { line: 3, column: 10 }, end: { line: 3, column: 22 } },
          position: null
        }
      ]
    },
    {
      filename: FILE_MAIN,
      items: []
    }
  ];

  [
    { filename: FILE_BUTTON, title: 'absolute import' },
    { filename: 'button.scss', title: 'relative entry import' },
    { filename: '_button.scss', title: 'relative partial import' },
  ].forEach(({ filename, title }) => {
    t.notThrows(() => {
      const options = {
        data: `${CONTENT_MAIN}\n@import "${FILE_BUTTON}";`,
        cwd: DIR_SASS,
        filename: FILE_MAIN,
      };

      const { documents } = run({
        data: options.data,
        filename: options.filename,
        cwd: options.cwd,
      });

      t.deepEqual(documents, expected, title);
    });
  });
});
