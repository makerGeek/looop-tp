import { normalizeUtterance } from './normalize';

describe('normalizeUtterance', () => {
  it('joins spoken coordinates into squares', () => {
    expect(normalizeUtterance('e four')).toBe('e4');
    expect(normalizeUtterance('e 4')).toBe('e4');
    expect(normalizeUtterance('eff three')).toBe('f3');
    expect(normalizeUtterance('echo four')).toBe('e4');
  });

  it('repairs the mishearings speech-to-text actually produces', () => {
    expect(normalizeUtterance('night to eff three')).toBe('knight to f3');
    expect(normalizeUtterance('Rock to A1')).toBe('rook to a1');
    expect(normalizeUtterance('prawn takes dee five')).toBe('pawn takes d5');
    expect(normalizeUtterance('horse to see three')).toBe('knight to c3');
  });

  it('keeps the preposition "to" out of the rank slot', () => {
    expect(normalizeUtterance('knight to f3')).toBe('knight to f3');
    expect(normalizeUtterance('bishop to c4')).toBe('bishop to c4');
  });

  it('normalises capture notation', () => {
    expect(normalizeUtterance('exd5')).toBe('e takes d5');
    expect(normalizeUtterance('e2 x e4')).toBe('e2 takes e4');
    expect(normalizeUtterance('captures on d5')).toBe('takes on d5');
  });

  it('normalises castling notation', () => {
    expect(normalizeUtterance('O-O')).toBe('kingside castle');
    expect(normalizeUtterance('0-0-0')).toBe('queenside castle');
  });

  it('splits a run-together long algebraic move', () => {
    expect(normalizeUtterance('e2e4')).toBe('e2 e4');
  });

  it('is empty-safe', () => {
    expect(normalizeUtterance('')).toBe('');
    expect(normalizeUtterance('   ...  ')).toBe('');
  });
});
