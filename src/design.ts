const states = `
  pending -(signed)-> onSigned
  onSigned -> signed
  onSigned -> pending

  pending -(rejected)-> rejected

  // This is debatable, maybe it should be part of a machine builder
  // However it cannot be marked in state definitions due to possibility of multiple usage of the state
  initial=pending
  final=[signed,rejected]
`;

const context = {
  signaturesRequired: 0,
  signatures: [],
  rejectedBy: null,
};

const actors = {} as {
  onCreated: {},
  onSigned: {},
  onFinished: {},
  onRejected: {},
};

const events = {} as {
  signed: { userId: string },
  rejected: { userId: string },
};

const transitions = {
  'pending->onSigned': {
    actions: [
      assign(({ event, context }) => ({
        signatures: context.signatures.concat({ userId: event.userId }),
      })),
    ],
  },
  'onSigned->signed': {
    guard: ({ context }) => context.signatures.length >= context.signaturesRequired,
  },
  'onSigned->pending': {},
  'pending->onRejected': {},
};

const hooks = {
  '->pending': {
    actions: [invoke('onCreated')],
  },
  '->onSigned': {
    actions: [invoke('onSigned')],
  },
  '->signed': {
    actions: [invoke('onFinished')],
  },
  '->rejected': {
    actions: [invoke('onRejected')],
  },
};
