import { matchStrictSan, parseWithGrammar } from './grammar';

const constraintsOf = (text: string) => {
  const parsed = parseWithGrammar(text);
  if (parsed.intent.kind !== 'move') throw new Error(`Expected a move, got ${parsed.intent.kind}`);
  return parsed.intent.constraints;
};

describe('parseWithGrammar — moves', () => {
  it('reads a bare destination square', () => {
    expect(constraintsOf('e4')).toEqual({ to: 'e4' });
  });

  it('reads piece plus destination', () => {
    expect(constraintsOf('knight to f3')).toEqual({ piece: 'n', to: 'f3' });
    expect(constraintsOf('bishop c4')).toEqual({ piece: 'b', to: 'c4' });
  });

  it('reads an explicit origin and destination', () => {
    expect(constraintsOf('e2 to e4')).toEqual({ to: 'e4', from: 'e2' });
    expect(constraintsOf('knight b1 to c3')).toEqual({ piece: 'n', from: 'b1', to: 'c3' });
  });

  it('reads captures', () => {
    expect(constraintsOf('knight takes d5')).toEqual({ piece: 'n', to: 'd5', capture: true });
    expect(constraintsOf('pawn takes d5')).toEqual({ piece: 'p', to: 'd5', capture: true });
    // Typed pawn-capture notation is recognised as SAN, which the resolver
    // looks up directly in the legal-move list.
    expect(constraintsOf('exd5')).toEqual({ san: 'exd5', piece: 'p' });
    // Spoken, the same move arrives as a file hint instead.
    expect(constraintsOf('e takes d5')).toEqual({ to: 'd5', capture: true, fromFile: 'e' });
  });

  it('reads castling, with and without a side', () => {
    expect(constraintsOf('castle kingside')).toEqual({ castle: 'kingside' });
    expect(constraintsOf('long castle')).toEqual({ castle: 'queenside' });
    expect(constraintsOf('castle short')).toEqual({ castle: 'kingside' });
    expect(constraintsOf('castle')).toEqual({});
  });

  it('reads promotions', () => {
    expect(constraintsOf('pawn to e8 promote to knight')).toMatchObject({
      to: 'e8',
      promotion: 'n',
    });
    expect(constraintsOf('e8 queen')).toMatchObject({ to: 'e8', promotion: 'q' });
  });

  it('reads typed algebraic notation with its capitalisation intact', () => {
    expect(constraintsOf('Nf3')).toEqual({ san: 'Nf3', piece: 'n' });
    expect(constraintsOf('Bxe5')).toEqual({ san: 'Bxe5', piece: 'b' });
    expect(constraintsOf('O-O')).toEqual({ castle: 'kingside' });
  });

  it('does not mistake a bare square for SAN needing a piece letter', () => {
    expect(matchStrictSan('e4')).toBeNull();
    expect(matchStrictSan('Nf3')).not.toBeNull();
  });
});

describe('parseWithGrammar — commands and questions', () => {
  it.each([
    ['undo', 'undo'],
    ['take that back', 'undo'],
    ['oops', 'undo'],
    ['new game', 'new-game'],
    ['I resign', 'resign'],
    ['flip the board', 'flip-board'],
    ['what should I play', 'hint'],
    ['say that again', 'repeat'],
  ])('reads "%s" as the %s command', (utterance, command) => {
    const parsed = parseWithGrammar(utterance);
    expect(parsed.intent).toEqual({ kind: 'command', command });
  });

  it.each([
    ["what's the position", 'position'],
    ['whose turn is it', 'whose-turn'],
    ['what was the last move', 'last-move'],
    ["who's winning", 'material'],
  ])('reads "%s" as the %s question', (utterance, question) => {
    const parsed = parseWithGrammar(utterance);
    expect(parsed.intent).toMatchObject({ kind: 'question', question });
  });

  it('reads a square-scoped question', () => {
    expect(parseWithGrammar('what can f3 do')).toMatchObject({
      intent: { kind: 'question', question: 'moves-from', square: 'f3' },
    });
  });

  it('reads yes and no', () => {
    expect(parseWithGrammar('yes please').intent).toEqual({ kind: 'affirm' });
    expect(parseWithGrammar('nope').intent).toEqual({ kind: 'deny' });
  });

  it('admits when it has no idea', () => {
    expect(parseWithGrammar('what a lovely afternoon').intent).toEqual({ kind: 'unknown' });
    expect(parseWithGrammar('').intent).toEqual({ kind: 'unknown' });
  });

  it('prefers commands over loose move matching', () => {
    // "take that back" contains "take", which the capture pattern would grab.
    expect(parseWithGrammar('take that back').intent).toEqual({ kind: 'command', command: 'undo' });
  });
});

describe('confidence', () => {
  it('is highest when origin and destination are both given', () => {
    expect(parseWithGrammar('e2 to e4').confidence).toBeGreaterThan(
      parseWithGrammar('e4').confidence
    );
  });
});
