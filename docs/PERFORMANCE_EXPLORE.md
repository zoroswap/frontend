# Explore Page Performance Analysis

## Symptom
The Explore page (formerly LiquidityPools) was laggy: CSS reactivity suffered (hovers, transitions), suggesting the main thread was busy and not able to process input/paint in time.

## Root cause: constant re-renders from WebSocket polling

**Primary culprit: `useWebSocket` (used by `useOrderUpdates` on Explore)**

- The hook ran `setInterval(..., 1000)` and called `setIsConnected(ws.isConnected())` every second.
- That triggered a React state update every second, so every consumer of `useWebSocket` (and thus the whole Explore page via `useOrderUpdates`) re-rendered once per second.
- Frequent re-renders keep the main thread busy (reconciling the tree, running effects, etc.) and can make the UI feel frozen: hovers and animations are delayed or dropped because the browser is busy with React work.

**Fix applied:** Only call `setIsConnected` when the value actually changes (store previous value in a ref and compare). The interval was also increased to 2s. This removes the constant re-renders; we now re-render at most when the connection actually connects or disconnects.

## Other contributors (lower impact)

1. **ZoroProvider `refreshPendingNotes` every 3s**  
   For Para wallet users, this runs every 3 seconds and can cause provider (and subtree) re-renders. Consider only running when the Explore page is focused or when `accountId` has pending notes.

2. **useLPBalances `refetch` every 10s**  
   Explore refetches LP balances every 10s. That’s reasonable; if needed, increase to 30s or only refetch when the tab is visible (`document.visibilityState`).

3. **LiquidityPoolsTable**  
   Renders one row per pool with no virtualization. For a large number of pools (e.g. 50+), consider virtualizing the list (e.g. `react-window` or `@tanstack/react-virtual`) so only visible rows are in the DOM.

4. **Context and referential stability**  
   `ZoroProvider`’s value is memoized but depends on `poolsInfo`. If the pools query refetches and returns a new object reference, all context consumers re-render. Keeping `poolsInfo` referentially stable (e.g. in react-query with `structuralSharing`) helps.

## Recommendations
- Prefer event-driven updates over polling where possible (e.g. WebSocket connection state via a callback from the WS client).
- For any remaining intervals, only call `setState` when the value actually changes.
- Consider virtualizing long pool lists if the number of pools grows.
