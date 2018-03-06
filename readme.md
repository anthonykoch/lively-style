
# lively-style

Retrieves runtime values for stylesheet pre-processor languages. Not really sure of the stability of this since the AST's are more like lexer tokens, making it difficult to go through and find what needs to be changed. Fairly experimental.

- [x] Scss (runs on nodejs only)
- [ ] Sass (runs on nodejs only)
- [ ] Less
- [ ] Stylus

## API

```js
import * as sass from 'lively-style/dist/sass';

const data =
`
// Let's say variables.scss contains the following
// $button-foreground: #333333;
// $button-background-color: darken(rgba(red, 0.5), 5);
@import 'variables';

// Let's say components.button.scss contains the following
// .button {
//   color: $button-foreground;
// }
@import 'components.button';

$body-font-size: 12px;

body {
  background-color: red;
  font-size: $body-font-size;
}
`;

// Let's run the document to see what we can find
const output = run({
  data,
  // The filename needs to be absolute, but need not actually exist on disk.
  // In this case, any files imported will be looked for in `/user/you/documents/sass/`
  filename: /Users/you/documents/sass/main.scss,

  // The same thing you would normally pass straight onto 
  includePaths: ['node_modules'],

  // The cwd will be used to find relative include paths, e.g. the 
  // node_modules path will become '/Users/you/documents/sass/node_modules'
  cwd: '/Users/you/documents/sass/',
});

console.log(
  require('util').inspect(output, { depth: 20})
);
```

```js
// output would print
{
  documents: [{
      filename: '/Users/you/documents/sass/_variables.scss',
      items: [{
        value: 'rgba(229.5, 0, 0, 0.5)',
        loc: { start: { line: 2, column: 27 }, end: { line: 2, column: 51 } },
        position: null
      }]
    },
    {
      filename: '/Users/you/documents/sass/_components.button.scss',
      items: [{
          value: '(rgba(229.5, 0, 0, 0.5))',
          loc: { start: { line: 3, column: 21 }, end: { line: 3, column: 44 } },
          position: null
        },
        {
          value: 'rgba(51, 51, 51, 1)',
          loc: { start: { line: 4, column: 10 }, end: { line: 4, column: 27 } },
          position: null
        }
      ]
    },
    {
      filename: '/Users/you/documents/sass/main.scss',
      items: [{
        value: '12px',
        loc: {
          start: { line: 17, column: 14 },
          end: { line: 17, column: 28 }
        },
        position: null
      }]
    }
  ],
  compiled: {
    stats: {
      entry: 'data',
      start: 1520301931399,
      includedFiles: ['components.button', 'variables'],
      end: 1520301931418,
      duration: 19
    },
    css: "< Buffer 2e 62 ... >"
  }
}
```

### Todo

- [ ] Clean up the code and refine the api.
- [ ] Test fixtures.
- [ ] More tests
- [ ] Figure out if there is a way to not log maps and lists that don't have variables in them
- [ ] Add Sass options
