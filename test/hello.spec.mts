import * as assert from 'node:assert';
import test, { describe } from 'node:test';

describe('hello', () => {
  test('world', async t => {
    assert.equal('hello world', 'hello world');
  });
});