# Adding a New API to dd-trace-api-js

This document provides a step-by-step guide for adding a new API to the dd-trace-api-js library.

## Overview

The dd-trace-api-js library provides a shim layer that enables applications to use Datadog tracing API without having the actual dd-trace implementation installed. When dd-trace is not present, the API provides dummy implementations that do nothing.

## Steps to Add a New API

### 1. Understand the API Types

There are three main types of APIs in the codebase:

- **Simple no-operation functions** (`noop`): Functions that don't need to return anything specific
- **Functions that return the current object** (`noopThis`): Functions that return the object they're called on (for method chaining)
- **Functions with custom return values** (`shimmable`): Functions that need to return a specific value

### 2. Add the TypeScript Interface

1. Open `index.d.ts`
2. Add the method signature to the appropriate interface:
   - For top-level methods, add to the `Tracer` interface
   - For namespace-specific methods, add to the appropriate namespace interface (e.g., `Appsec`, `DogStatsD`)
3. Include proper JSDoc comments explaining the method's purpose and parameters

Example:
```typescript
/**
 * A new API method that does something useful
 * @param {string} param1 Description of the first parameter
 * @param {Object} param2 Description of the second parameter
 * @returns {boolean} Description of the return value
 */
newApiMethod(param1: string, param2?: object): boolean;
```

### 3. Implement the API in index.js

1. Open `index.js`
2. Add the implementation to the appropriate object:
   - For simple methods that don't return anything, use the `noop` helper:
     ```javascript
     newApiMethod: noop('newApiMethod')
     ```
   - For methods that should return `this` for chaining, use the `noopThis` helper:
     ```javascript
     newApiMethod: noopThis('newApiMethod')
     ```
   - For methods that need a specific return value, use the `shimmable` helper:
     ```javascript
     newApiMethod: shimmable('newApiMethod', () => defaultReturnValue, mapReturnValue)
     ```
     - `defaultReturnValue` is the value to return when no actual implementation is present
     - Set `mapReturnValue` to `true` if the function returns an object with API calls on it that we need to map.

3. For nested APIs (like `appsec` or `dogstatsd`), add to the appropriate sub-object:
   ```javascript
   appsec: {
     // existing methods...
     newApiMethod: noop('appsec:newApiMethod')
   }
   ```

### 4. Add Tests

1. Open `tests/test-events.js`
2. Add a test case for your new method using the `test` function:
   ```javascript
   test('newApiMethod', () => {
     makeCall(tracer, 'newApiMethod', 'arg1', { arg2: 'value' })
   })
   ```
   
   Or for a method with a return value:
   ```javascript
   test('newApiMethod', () => {
     makeCall(tracer, 'newApiMethod', 'arg1')
   }, { ret: expectedReturnValue })
   ```

3. For methods on nested objects, use the appropriate prefix:
   ```javascript
   test('appsec:newApiMethod', () => {
     makeCall(tracer.appsec, 'newApiMethod', 'arg1')
   })
   ```

### 5. Update the Channel Tracking

The test suite verifies that all published channels are tested. The channels are automatically discovered when you add a new API method, but make sure your test is correctly registered.

## Example: Adding a New Method

Let's walk through adding a hypothetical `setTag` method to the top-level tracer:

### Add TypeScript Definition

```typescript
// In index.d.ts inside the Tracer interface
/**
 * Sets a global tag that will be added to all spans created by the tracer.
 * @param {string} key The tag name
 * @param {any} value The tag value
 * @returns {Tracer} The tracer instance (for method chaining)
 */
setTag(key: string, value: any): Tracer;
```

### Add Implementation

```javascript
// In index.js in the tracer object
setTag: noopThis('setTag')
```

### Add Test

```javascript
// In tests/test-events.js
test('setTag', () => {
  makeCall(tracer, 'setTag', 'env', 'production')
})
```

## Validation

After adding a new API:

1. Run `npm test` to ensure all tests pass
2. Run `npm run lint` to ensure code style is maintained

The test suite will automatically verify that your new API channel is properly tested via the check in `tests/helpers/get-all-published-channels.js`.
