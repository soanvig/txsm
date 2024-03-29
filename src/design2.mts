import { StateMachine } from './machine/state-machine.mjs';

const stateMachine = StateMachine.create({
  transitions: [
    { from: '*', to: '*', with: 'rootTransition' },
    { from: 'pending', to: 'onSigned', with: 'signed' },
    { from: 'onSigned', to: 'signed' },
    { from: 'onSigned', to: 'pending' },
    { from: 'pending', to: 'rejected', with: 'rejected' },
  ],
  config: {
    initial: 'pending',
    final: ['rejected', 'signed'],
  },
}).setTypes({
  commands: {} as {
    rejected: { userId: string },
    signed: { userId: string },
    rootTransition: {},
  },
  context: {} as {
    signaturesRequired: number,
    signatures: { userId: string }[],
    rejectedBy: { userId: string } | null,
  },
  actors: {},
});

const runtime = stateMachine.run({
  context: {
    rejectedBy: null,
    signatures: [],
    signaturesRequired: 1,
  },
});

runtime.execute({ type: 'signed', userId: 'user1' });
runtime.execute({ type: 'rejected', userId: 'user1' });
runtime.execute({ type: 'rootTransition' });

// .addEffect('pending', 'onSigned', {
//   actions: [
//     assign(({ event, context }) => ({
//       signatures: context.signatures.concat({ userId: event.userId }),
//     })),
//   ],
// })
// .addEffect('onSigned', 'signed', {
//   guard: ({ context }) => context.signatures.length >= context.signaturesRequired,
// })
// .addHook({ enter: 'pending' }, {
//   actions: [invoke('onCreated')],
// })
// .addHook({ enter: 'onSigned' }, {
//   actions: [invoke('onCreated')],
// })
// .addHook({ enter: 'signed' }, {
//   actions: [invoke('onFinished')],
// })
// .addHook({ enter: 'rejected' }, {
//   actions: [invoke('onRejected')],
// });
