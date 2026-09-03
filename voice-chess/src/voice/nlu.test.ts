import { sanitizeConstraints } from './nlu';

describe('sanitizeConstraints — defensive handling of model output', () => {
  it('keeps well-formed fields', () => {
    expect(
      sanitizeConstraints({
        piece: 'n',
        from: 'b1',
        to: 'c3',
        promotion: null,
        capture: false,
        castle: null,
        san: 'Nc3',
      })
    ).toEqual({ piece: 'n', from: 'b1', to: 'c3', san: 'Nc3' });
  });

  it('drops squares that are not squares', () => {
    expect(sanitizeConstraints({ from: 'j9', to: 'e44' })).toEqual({});
    expect(sanitizeConstraints({ to: 42 })).toEqual({});
  });

  it('drops piece codes it does not recognise', () => {
    expect(sanitizeConstraints({ piece: 'dragon' })).toEqual({});
    expect(sanitizeConstraints({ promotion: 'k' })).toEqual({});
  });

  it('only records a capture when the model asserted one', () => {
    expect(sanitizeConstraints({ capture: false })).toEqual({});
    expect(sanitizeConstraints({ capture: 'yes' })).toEqual({});
    expect(sanitizeConstraints({ capture: true })).toEqual({ capture: true });
  });

  it('caps SAN length so a run-on string cannot become a constraint', () => {
    expect(sanitizeConstraints({ san: 'Nf3 and then Qh5 and then mate' })).toEqual({});
  });

  it('survives complete garbage', () => {
    expect(sanitizeConstraints({})).toEqual({});
    expect(sanitizeConstraints({ piece: null, from: undefined, to: [] })).toEqual({});
  });
});
