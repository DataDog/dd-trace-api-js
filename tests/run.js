const [ MAJOR, MINOR ] = process.versions.node.split('.').map(Number)

let testCommand = 'node --test'

if (MAJOR >= 22 || (MAJOR === 20 && MINOR >= 1) || (MAJOR === 18 && MINOR >= 17)) {
  testCommand = 'node --experimental-test-coverage --test'
} else if (MAJOR >= 20 || (MAJOR === 18 && MINOR >= 1) || (MAJOR === 16 && MINOR >= 17)) {
  testCommand = 'node --test'
} else if (MAJOR >= 14) {
  testCommand = 'node_modules/.bin/node--test'
} else {
  console.error('Node.js version 14 or higher is required.')
  process.exit(1)
}

const { spawn } = require('child_process')

spawn(testCommand, { shell: true, stdio: 'inherit' })
