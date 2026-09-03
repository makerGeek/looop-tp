import { LocalTransport, type MatchEvent } from './transport';

describe('LocalTransport', () => {
  const descriptor = {
    id: 'local-1',
    mode: 'pass-and-play' as const,
    seat: null,
    startingFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  };

  it('announces the opponent as connected on connect', async () => {
    const transport = new LocalTransport(descriptor);
    const events: MatchEvent[] = [];
    transport.subscribe((event) => events.push(event));

    await transport.connect();
    expect(events).toEqual([{ type: 'opponent-connection', connected: true }]);
  });

  it('echoes sent moves back to subscribers with their ply', async () => {
    const transport = new LocalTransport(descriptor);
    const events: MatchEvent[] = [];
    transport.subscribe((event) => events.push(event));

    await transport.sendMove('e2e4', 0);
    await transport.sendMove('e7e5', 1);

    const moves = events.filter((event) => event.type === 'move');
    expect(moves).toHaveLength(2);
    expect(moves.map((event) => (event.type === 'move' ? event.move.uci : ''))).toEqual([
      'e2e4',
      'e7e5',
    ]);
    expect(moves.map((event) => (event.type === 'move' ? event.move.ply : -1))).toEqual([0, 1]);
  });

  it('stops delivering to an unsubscribed listener', async () => {
    const transport = new LocalTransport(descriptor);
    const events: MatchEvent[] = [];
    const unsubscribe = transport.subscribe((event) => events.push(event));

    unsubscribe();
    await transport.sendMove('e2e4', 0);
    expect(events).toHaveLength(0);
  });

  it('drops every listener on disconnect', async () => {
    const transport = new LocalTransport(descriptor);
    const events: MatchEvent[] = [];
    transport.subscribe((event) => events.push(event));

    await transport.disconnect();
    await transport.sendMove('e2e4', 0);
    expect(events).toHaveLength(0);
  });
});
