import assert from 'node:assert';
import test, { describe } from 'node:test';
import { Transition } from '../src/machine/transition.mjs';

describe('Transition', () => {
  test('.getTarget', t => {
    const trsn = Transition.fromObject({ from: 's1', to: 's2' });

    assert.deepEqual(trsn.getTarget('s1'), 's2');
    assert.throws(() => trsn.getTarget('s3'));
  });

  test('.getTarget - any from', t => {
    const trsn = Transition.fromObject({ from: '*', to: 's2' });

    assert.deepEqual(trsn.getTarget('s1'), 's2');
    assert.deepEqual(trsn.getTarget('s2'), 's2');
    assert.deepEqual(trsn.getTarget('s3'), 's2');
  });

  test('.getTarget - any to', t => {
    const trsn = Transition.fromObject({ from: 's1', to: '*' });

    assert.deepEqual(trsn.getTarget('s1'), 's1');
    assert.throws(() => trsn.getTarget('s2'));
  });

  test('.getTarget - any from/to', t => {
    const trsn = Transition.fromObject({ from: '*', to: '*' });

    assert.deepEqual(trsn.getTarget('s1'), 's1');
    assert.deepEqual(trsn.getTarget('s2'), 's2');
    assert.deepEqual(trsn.getTarget('s3'), 's3');
  });

  test('.canTransitionFrom', t => {
    const trsn = Transition.fromObject({ from: 's1', to: 's2' });

    assert.deepEqual(trsn.canTransitionFrom('s1'), true);
    assert.deepEqual(trsn.canTransitionFrom('s2'), false);
    assert.deepEqual(trsn.canTransitionFrom('s3'), false);
  });

  test('.canTransitionFrom - any from', t => {
    const trsn = Transition.fromObject({ from: '*', to: 's2' });

    assert.deepEqual(trsn.canTransitionFrom('s1'), true);
    assert.deepEqual(trsn.canTransitionFrom('s2'), true);
    assert.deepEqual(trsn.canTransitionFrom('s3'), true);
  });

  test('.is', t => {
    const automatedTrsn = Transition.fromObject({ from: 's1', to: 's2' });
    const manualTrsn = Transition.fromObject({ from: 's1', to: 's2', with: 'foo' });

    assert.deepEqual(automatedTrsn.is('foo'), false);
    assert.deepEqual(automatedTrsn.is('foobar'), false);

    assert.deepEqual(manualTrsn.is('foo'), true);
    assert.deepEqual(manualTrsn.is('foobar'), false);
  });

  test('.isManual', t => {
    const automatedTrsn = Transition.fromObject({ from: 's1', to: 's2' });
    const manualTrsn = Transition.fromObject({ from: 's1', to: 's2', with: 'foo' });

    assert.deepEqual(automatedTrsn.isManual(), false);
    assert.deepEqual(manualTrsn.isManual(), true);
  });
});