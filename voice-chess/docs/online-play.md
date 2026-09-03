# Online play

Not built. Designed for.

This document describes the seam that exists today, what it already accounts for,
and what a network implementation would actually have to add.

---

## The seam

[`src/multiplayer/transport.ts`](../src/multiplayer/transport.ts) defines
`MatchTransport`: five methods, no assumptions about where the other side is.

```ts
interface MatchTransport {
  readonly descriptor: MatchDescriptor;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendMove(uci: string, ply: number): Promise<void>;
  subscribe(listener: (event: MatchEvent) => void): () => void;
}
```

`LocalTransport` implements it for pass-and-play and vs-CPU by echoing sent moves
straight back to subscribers. That sounds pointless, and it's the most useful
thing about it: local play exercises the same interface online play would use, so
the network path will slot into code that is already running rather than a branch
nobody has tested.

---

## What the current design already gets right

**Moves travel as UCI strings, never as board state.**
`sendMove('e2e4', 12)` — not a FEN, not a position, not a diff. A peer cannot
push a board state, because there is no message that carries one. Their move is
validated by the receiving client's own `ChessGame` exactly like a spoken move,
so a modified client can't post an illegal position; it can only post a move that
gets rejected.

**Every move carries a ply number.**
A client that drops off can ask for everything after ply *n* and replay
deterministically from the starting FEN. Ordering is explicit rather than implied
by arrival time.

**Clock and result are separate event types.**
Online chess needs a server to be the authority on time and on abandonment, and
those are not move events. Modelling them separately from day one avoids the
usual retrofit where `{type:'move'}` grows a `clockRemaining` field.

**The store is already transport-agnostic.**
`applyEngineMove(uci)` is, structurally, *"apply a move that arrived from
outside"*. A remote move would use it unchanged — same validation, same rejection
path, same animation.

**The board doesn't know who it's showing.**
`Board` takes a position and callbacks. It has never known whether the opponent
is a person on the same phone, an engine in a WebView, or a stranger.

---

## What a `RealtimeTransport` would add

```ts
class RealtimeTransport implements MatchTransport {
  // connect()     open the socket, join room `descriptor.id`, send the
  //               last ply we have so the server can replay the gap
  // sendMove()    publish { matchId, ply, uci }, resolve on the server's ack;
  //               a rejection means our board is behind — resync, don't retry
  // subscribe()   stream moves, clock ticks and result events;
  //               on reconnect, replay missed plies before resuming the stream
  // disconnect()  leave cleanly so the opponent isn't left waiting on a timeout
}
```

And in the app, three additions:

1. **A `useRemoteTurn` hook**, sitting exactly where `useCpuTurn` sits — subscribe
   to the transport, feed arriving moves to `applyEngineMove`, narrate them with
   the same `announceOpponentMove` the CPU already uses.
2. **A clock component**, driven by `clock` events rather than a local timer, so
   the server stays the authority.
3. **A connection indicator**, in the same honest spirit as the engine badge in
   the header: an opponent who has gone quiet should be visibly quiet.

---

## What is deliberately not sketched

Matchmaking, accounts, ratings, anti-cheat, reconnection policy, and the
server itself. Those are server concerns, and writing client stubs for a server
that doesn't exist produces code that has to be deleted rather than extended.
The interface stops at the boundary the app actually needs today.

---

## Sequencing, if someone picks this up

1. **Spectating first.** Subscribe to a match and render arriving moves. No
   sending, no clock, no matchmaking — just the receive path, proven end to end.
2. **Two-player, no clock.** Add `sendMove` and the ack. This is where ply
   ordering and resync earn their keep.
3. **Clock.** Server-authoritative, with the client rendering rather than
   counting.
4. **Everything social.** Matchmaking, invitations, ratings. None of it touches
   the game logic.

Voice needs no changes at any step. Speaking a move is already just another way
of producing a legal move, and a legal move is already just something that gets
sent.
