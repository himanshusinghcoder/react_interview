import { useState, useEffect, useRef, useCallback, useMemo } from "react";

const CATEGORIES = [
  { id: "js_core", label: "JS Core", icon: "⚙️", color: "#F7DF1E", desc: "Closures, Promises, Event Loop" },
  { id: "react_basics", label: "React Basics", icon: "⚛️", color: "#61DAFB", desc: "JSX, Props, State, Lifecycle" },
  { id: "hooks", label: "Hooks Deep Dive", icon: "🪝", color: "#FF6B6B", desc: "All hooks with edge cases" },
  { id: "performance", label: "Performance", icon: "🚀", color: "#00C896", desc: "Optimization, memoization" },
  { id: "memory", label: "Memory Mgmt", icon: "🧠", color: "#A78BFA", desc: "Leaks, cleanup, WeakMap" },
  { id: "modern", label: "Modern React", icon: "✨", color: "#FB923C", desc: "Fiber, Suspense, Concurrent" },
  { id: "patterns", label: "Patterns", icon: "🏗️", color: "#34D399", desc: "HOC, Render Props, Compound" },
  { id: "state_mgmt", label: "State Mgmt", icon: "🗂️", color: "#F472B6", desc: "Redux, Zustand, Context" },
  { id: "testing", label: "Testing", icon: "🧪", color: "#60A5FA", desc: "RTL, Jest, mocking" },
  { id: "realworld", label: "Real World", icon: "🌍", color: "#FBBF24", desc: "Architecture, system design" },
];

const ALL_QUESTIONS = {
  js_core: [
    {
      level: "Senior",
      q: "Explain the JavaScript Event Loop in the context of React rendering. How does it affect UI updates?",
      scenario: "Your React app freezes when processing a 50,000-item list. The user can't scroll or click anything.",
      a: `The Event Loop runs in this order: 
Call Stack → Microtask Queue (Promises/.then, queueMicrotask) → Macrotask Queue (setTimeout, setInterval, I/O)

React's useState triggers a re-render synchronously queued as a microtask (via Scheduler). If you do heavy computation in the call stack, you BLOCK the event loop:

❌ BLOCKING:
const processData = (items) => {
  return items.map(item => heavyCompute(item)); // Blocks for 2-3 seconds
};

✅ NON-BLOCKING (chunked with scheduler):
import { unstable_scheduleCallback, unstable_NormalPriority } from 'scheduler';

const processInChunks = (items, chunkSize = 100) => {
  let index = 0;
  const process = () => {
    const chunk = items.slice(index, index + chunkSize);
    chunk.forEach(item => heavyCompute(item));
    index += chunkSize;
    if (index < items.length) {
      // Yield control back to browser between chunks
      unstable_scheduleCallback(unstable_NormalPriority, process);
    }
  };
  unstable_scheduleCallback(unstable_NormalPriority, process);
};

// OR with React 18 useTransition:
const [isPending, startTransition] = useTransition();
startTransition(() => {
  setData(processData(items)); // React yields between renders
});

Key insight: React 18's Concurrent Mode uses the Scheduler to break rendering into chunks and yield to the browser between each chunk — this is why useTransition works!`,
      followUps: [
        {
          q: "What is the difference between microtasks and macrotasks? Give React-specific examples.",
          a: "Microtasks run BEFORE the next render/paint. Macrotasks run AFTER. React examples — Microtasks: Promise.resolve().then(() => setState()), useEffect cleanup (actually synchronous). Macrotasks: setTimeout(() => setState(), 0). Critical: if you chain infinite .then() calls, you starve the render. React 18 batches state updates in microtasks — that's why multiple setState() in one event handler cause only ONE re-render."
        },
        {
          q: "What is requestAnimationFrame and when should you use it in React?",
          a: "rAF fires just before the browser paints — ~16ms at 60fps. Use for: smooth animations that need to sync with frame rate, reading layout (getBoundingClientRect) then writing, canvas drawing. In React: use a ref for the rAF id and cancel in cleanup. Don't use setState inside rAF unless absolutely necessary — prefer direct DOM manipulation via refs for animations."
        }
      ]
    },
    {
      level: "Senior",
      q: "Explain closures in React. What are stale closures and how do you fix them?",
      scenario: "You have a setInterval inside useEffect that reads state, but it always shows the initial value, never updates.",
      a: `Stale closure: a function captures a variable from its outer scope at creation time. When the variable changes, the function still holds the OLD value.

Classic stale closure bug in React:
❌ BUG:
useEffect(() => {
  const id = setInterval(() => {
    console.log(count); // ALWAYS logs 0 — stale closure!
    setCount(count + 1); // Always sets to 1, not incrementing
  }, 1000);
  return () => clearInterval(id);
}, []); // Empty deps = closure captures count = 0 forever

✅ FIX 1 — Functional updater (doesn't need the current value):
setCount(prev => prev + 1); // React gives you fresh value

✅ FIX 2 — Include in deps (re-creates interval on each change):
useEffect(() => {
  const id = setInterval(() => {
    setCount(count + 1);
  }, 1000);
  return () => clearInterval(id);
}, [count]); // Cleans up and re-creates interval

✅ FIX 3 — useRef (escape hatch, value always fresh):
const countRef = useRef(count);
countRef.current = count; // Keep ref in sync
useEffect(() => {
  const id = setInterval(() => {
    console.log(countRef.current); // Always fresh!
  }, 1000);
  return () => clearInterval(id);
}, []); // Safe with empty deps

Real-world: event handlers, setTimeout, WebSocket callbacks — all stale closure traps.`,
      followUps: [
        {
          q: "How does useCallback relate to stale closures?",
          a: "useCallback(fn, deps) memoizes a function — but if deps are wrong, you get a stale callback. Common mistake: useCallback(() => doSomething(value), []) — if value changes, callback uses old value. React's ESLint plugin (exhaustive-deps) catches this. Fix: add value to deps, or use the ref pattern if you can't include it (e.g., event listeners that can't be re-added efficiently)."
        }
      ]
    },
    {
      level: "Mid-Senior",
      q: "Explain Promise chaining, async/await, and error handling patterns used in React data fetching.",
      scenario: "Your API call in useEffect sometimes fails silently — no error shown, no loading state cleared.",
      a: `Common React async antipatterns and fixes:

❌ ANTIPATTERN — no error handling, state leak on unmount:
useEffect(() => {
  fetch('/api/users')
    .then(r => r.json())
    .then(data => setUsers(data)); // No catch! No unmount check!
}, []);

✅ PRODUCTION PATTERN:
useEffect(() => {
  const controller = new AbortController();
  let mounted = true;
  
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/users', { signal: controller.signal });
      if (!res.ok) throw new Error(\`HTTP \${res.status}: \${res.statusText}\`);
      const data = await res.json();
      if (mounted) setUsers(data); // Guard against unmounted state update
    } catch (err) {
      if (err.name === 'AbortError') return; // Expected — ignore
      if (mounted) setError(err.message);
    } finally {
      if (mounted) setLoading(false);
    }
  };
  
  fetchUsers();
  
  return () => {
    mounted = false;
    controller.abort(); // Cancel in-flight request on unmount
  };
}, []);

// Better: use React Query — handles ALL of this automatically
const { data, isLoading, error } = useQuery({
  queryKey: ['users'],
  queryFn: () => fetch('/api/users').then(r => r.json()),
});`,
      followUps: [
        {
          q: "What is Promise.allSettled vs Promise.all? When would you use each?",
          a: "Promise.all fails fast — if ANY promise rejects, everything fails. Use for dependent data (need all or nothing). Promise.allSettled waits for ALL promises regardless — use for independent operations where partial failure is OK: const [users, products, orders] = await Promise.allSettled([fetchUsers(), fetchProducts(), fetchOrders()]). Each result is { status: 'fulfilled' | 'rejected', value | reason }. Real use case: dashboard widgets — if orders API fails, still show users and products."
        }
      ]
    },
    {
      level: "Senior",
      q: "Explain WeakMap, WeakSet, WeakRef in JavaScript and their relevance to React memory management.",
      scenario: "Your SPA has a memory leak — every navigation keeps old component data in memory.",
      a: `WeakMap/WeakSet hold WEAK references — they don't prevent garbage collection when the key object is no longer referenced elsewhere.

// WeakMap: perfect for private component data without memory leaks
const componentMetadata = new WeakMap();

function setupComponent(domNode) {
  componentMetadata.set(domNode, { 
    listeners: [], 
    timers: [], 
    subscriptions: [] 
  });
  // When domNode is removed from DOM and all refs dropped,
  // WeakMap entry is AUTOMATICALLY garbage collected!
}

// WeakRef: hold a reference without preventing GC
class CacheManager {
  constructor() {
    this.cache = new Map(); // Regular map — holds strong refs
  }
  
  // Better with WeakRef for expensive objects:
  set(key, value) {
    this.cache.set(key, new WeakRef(value));
  }
  
  get(key) {
    const ref = this.cache.get(key);
    return ref?.deref(); // Returns undefined if GC'd
  }
}

// FinalizationRegistry: run cleanup when object is GC'd
const registry = new FinalizationRegistry((heldValue) => {
  console.log('Object GC\'d, cleaning up:', heldValue);
  // Close WebSocket, cancel subscriptions, etc.
});

registry.register(myComponent, 'component-cleanup-token');

React relevance: React internally uses WeakMap-like structures to associate Fiber nodes with DOM elements without creating memory leaks.`,
      followUps: [
        {
          q: "How would you detect a memory leak in a React application?",
          a: "Steps: (1) Chrome DevTools → Memory tab → Take heap snapshot before navigation, navigate away, force GC (trash icon), take another snapshot. Filter by 'Detached' — detached DOM nodes = leak. (2) Use Performance tab — record, interact, check if memory only grows (never drops = leak). (3) React DevTools Profiler — check if components unmount properly. Common causes: uncleared setInterval, event listeners on window/document not removed in cleanup, unsubscribed RxJS/pub-sub, closure over large data in callbacks."
        }
      ]
    }
  ],

  react_basics: [
    {
      level: "Mid",
      q: "Explain the React component lifecycle in functional components. How does it map to class lifecycle methods?",
      scenario: "You need to fetch data on mount, subscribe to a WebSocket, and clean up on unmount.",
      a: `Functional lifecycle via hooks:

// componentDidMount equivalent:
useEffect(() => { /* runs once after mount */ }, []);

// componentDidUpdate equivalent:
useEffect(() => { /* runs after every render where dep changed */ }, [dep]);

// componentWillUnmount equivalent (return cleanup):
useEffect(() => {
  const socket = new WebSocket('wss://api.example.com');
  socket.onmessage = (e) => setMessages(prev => [...prev, e.data]);
  
  return () => {
    socket.close(); // componentWillUnmount
  };
}, []);

// getDerivedStateFromProps (no hook equivalent — use useMemo or compute during render):
const derivedValue = useMemo(() => expensiveCompute(props), [props.data]);

// getSnapshotBeforeUpdate (measure DOM before update):
// Only possible with useLayoutEffect + ref
const prevScrollTop = useRef(0);
useLayoutEffect(() => {
  // Runs SYNCHRONOUSLY after DOM mutation, before paint
  prevScrollTop.current = listRef.current.scrollTop;
});

// shouldComponentUpdate equivalent:
const MyComponent = React.memo(Component, (prevProps, nextProps) => {
  return prevProps.id === nextProps.id; // true = skip re-render
});

// getSnapshotBeforeUpdate for scroll restoration:
useLayoutEffect(() => {
  listRef.current.scrollTop = prevScrollTop.current;
});`,
      followUps: [
        {
          q: "What is the difference between useEffect and useLayoutEffect?",
          a: "useEffect runs ASYNCHRONOUSLY after paint — doesn't block the browser. useLayoutEffect runs SYNCHRONOUSLY after DOM mutations but BEFORE paint — blocks paint. Use useLayoutEffect for: measuring DOM elements (getBoundingClientRect), preventing visual flicker on scroll position restore, tooltip positioning. Overusing useLayoutEffect hurts performance — stick to useEffect by default. SSR caveat: useLayoutEffect generates a warning on server — use useEffect as fallback."
        },
        {
          q: "How does React's reconciliation algorithm (diffing) work?",
          a: "React diffs the virtual DOM tree with two heuristics: (1) Elements of different types produce different trees (throw away old, mount new). (2) Keys help identify which items changed in lists. Without keys, React re-renders everything. React compares sibling elements by position — if you insert at the beginning, every subsequent item re-renders (wrong). With keys, React matches by key and only updates changed items. Never use array index as key for dynamic lists — insertions/deletions cause wrong state to be associated with wrong component."
        }
      ]
    },
    {
      level: "Senior",
      q: "Explain how React's Virtual DOM actually works and what its limitations are.",
      scenario: "A colleague says 'Virtual DOM is always faster than direct DOM manipulation.' Is this true?",
      a: `Virtual DOM (VDOM) is a JavaScript object tree representing the UI. On state change:
1. React creates a NEW VDOM tree
2. Diffs it with the OLD VDOM tree (reconciliation)
3. Computes minimal set of DOM operations
4. Batches and applies them to real DOM

// VDOM is just a plain object:
const vdom = {
  type: 'div',
  props: { className: 'container' },
  children: [{ type: 'h1', props: {}, children: ['Hello'] }]
}

// React.createElement produces this:
React.createElement('div', { className: 'container' },
  React.createElement('h1', null, 'Hello')
)

LIMITATIONS — VDOM is NOT always faster:
• The diffing itself has O(n) cost — for every render, React traverses entire subtree
• Initial render: VDOM adds overhead vs direct DOM (extra JS object creation + diffing)
• For very frequent tiny updates (cursor position, animations): VDOM diffing slower than direct DOM
• Memory: maintaining two trees uses memory

When VDOM wins: multiple state updates batched into one DOM operation, complex UI trees where manual optimization is impractical.

When direct DOM wins: canvas animations, D3.js visualizations, real-time data at 60fps.

React signals/fine-grained reactivity (Solid.js approach) can be more efficient for some patterns — React is aware of this, hence React Forget (auto-memoization compiler).`,
      followUps: [
        {
          q: "What is React Fiber and how is it different from the old Stack reconciler?",
          a: "Old Stack reconciler: recursive, synchronous — once started, couldn't stop. Like a phone call you can't pause. React Fiber (React 16+): reconciliation is split into units of work (Fiber nodes). Work can be paused, resumed, or aborted. This enables Concurrent Mode — React can work on low-priority updates in background and immediately handle high-priority updates (user input). Each Fiber node is a JS object with: type, key, stateNode (DOM), child, sibling, return (parent), pendingProps, memoizedProps, memoizedState, effectTag."
        }
      ]
    },
    {
      level: "Mid",
      q: "When does React re-render a component? List all triggers and how to control them.",
      scenario: "Your parent component re-renders (unrelated state change) and causes 20 child components to re-render unnecessarily.",
      a: `React re-renders when:
1. setState() / useState setter called (even with same value pre-React 18!)
2. Parent component re-renders (MOST COMMON CAUSE)
3. Context value changes
4. useReducer dispatch called
5. forceUpdate() (class components)

React 18 optimization: if you call setState with the SAME value (Object.is comparison), React bails out AFTER re-rendering once (not ideal but better than before).

CONTROLLING RE-RENDERS:

// 1. React.memo — memoize component
const ExpensiveChild = React.memo(({ user, onDelete }) => {
  return <div>{user.name}</div>;
}, (prev, next) => prev.user.id === next.user.id); // Custom comparison

// 2. useMemo — memoize values passed as props
const Parent = () => {
  const [filter, setFilter] = useState('');
  // Without useMemo: new array reference every render → child re-renders
  const filteredUsers = useMemo(
    () => users.filter(u => u.name.includes(filter)),
    [users, filter]
  );
  return <UserList users={filteredUsers} />;
};

// 3. useCallback — stable function references
const handleDelete = useCallback((id) => {
  setUsers(prev => prev.filter(u => u.id !== id));
}, []); // No deps needed — uses functional updater

// 4. State colocation — push state DOWN to where it's used
// Instead of: parent holds modal open state (causes parent + all children to re-render)
// Do: ModalButton manages its own open state internally

// 5. Children as props trick:
const SlowParent = ({ children }) => {
  const [count, setCount] = useState(0);
  return <div onClick={() => setCount(c=>c+1)}>{children}</div>;
  // children (passed from outside) don't re-render!
};`,
      followUps: [
        {
          q: "What is the 'children as props' trick and when does it help?",
          a: "When you pass JSX as children, React creates that element in the PARENT'S scope — not the component that receives it. So if <SlowParent> re-renders, it doesn't re-create its children. Usage: <SlowParent><ExpensiveComponent /></SlowParent> — ExpensiveComponent only re-renders when its own props/state change, not when SlowParent's local state changes. Great for wrapping components with animation, context providers, or layout wrappers that have their own state."
        }
      ]
    }
  ],

  hooks: [
    {
      level: "Senior",
      q: "Explain useEffect dependency array — all edge cases, pitfalls, and the exhaustive-deps rule.",
      scenario: "Your useEffect with an object in deps runs on every render even though the object 'looks' the same.",
      a: `The dependency array uses Object.is() comparison (same as ===, except NaN === NaN).

PITFALL 1 — Object/Array reference inequality:
❌ 
const options = { page: 1 }; // New object reference every render!
useEffect(() => { fetchData(options); }, [options]); // Runs every render!

✅ 
useEffect(() => { fetchData({ page: 1 }); }, []); // Inline
// OR
const options = useMemo(() => ({ page: 1 }), []); // Stable reference

PITFALL 2 — Functions as deps:
❌
useEffect(() => { socket.on('message', handleMessage); }, [handleMessage]);
// handleMessage recreated each render → effect re-runs → event listener added again

✅ Wrap in useCallback:
const handleMessage = useCallback((msg) => {
  setMessages(prev => [...prev, msg]);
}, []); // stable reference

PITFALL 3 — Missing deps (stale closure):
❌
useEffect(() => {
  document.title = \`Count: \${count}\`; // Uses count but not in deps!
}, []); // ESLint: react-hooks/exhaustive-deps warning

PITFALL 4 — useEffect runs twice in dev (React 18 StrictMode):
React intentionally mounts → unmounts → remounts to detect side effects.
Your cleanup MUST work correctly. Not a bug — reveals missing cleanup.

// The eslint-plugin-react-hooks/exhaustive-deps rule:
// Automatically detects missing deps and warns. 
// NEVER disable it without extremely good reason.
// If you find yourself needing to disable it, your design is wrong.`,
      followUps: [
        {
          q: "Why does React run effects twice in development with StrictMode?",
          a: "React 18 StrictMode intentionally mounts, unmounts, and remounts every component once. Purpose: expose bugs in cleanup logic. In future React versions, components may be offscreen (hidden) and remounted (Offscreen API for tabs, virtual lists). If your subscription/timer/socket doesn't clean up properly, it'll run twice = double subscriptions, memory leaks. Fix: always return a cleanup function. This ONLY happens in development, not production."
        },
        {
          q: "When should you use useEffect vs useLayoutEffect vs useInsertionEffect?",
          a: "useEffect: async, after paint — 95% of use cases. useLayoutEffect: sync, after DOM mutation before paint — DOM measurements, scroll restoration, tooltip positioning. useInsertionEffect: runs before DOM mutations — only for CSS-in-JS libraries (styled-components, emotion) to inject styles before reads. Never use useInsertionEffect in application code — it's a library escape hatch."
        }
      ]
    },
    {
      level: "Senior",
      q: "Build a custom hook for infinite scroll. What are the key considerations?",
      scenario: "A social media feed needs to load more posts as user scrolls. Must handle race conditions, deduplication, and unmount cleanup.",
      a: `// useInfiniteScroll.js
import { useState, useEffect, useRef, useCallback } from 'react';

export function useInfiniteScroll(fetchFn, options = {}) {
  const { threshold = 0.1, rootMargin = '100px' } = options;
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const observerRef = useRef(null);
  const loadingRef = useRef(false); // Ref to prevent race conditions
  const abortRef = useRef(null);

  const loadMore = useCallback(async (pageNum) => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    
    // Cancel previous request
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    
    try {
      const data = await fetchFn(pageNum, { signal: abortRef.current.signal });
      setItems(prev => {
        // Deduplicate by id
        const ids = new Set(prev.map(i => i.id));
        return [...prev, ...data.items.filter(i => !ids.has(i.id))];
      });
      setHasMore(data.hasNextPage);
      setPage(pageNum + 1);
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [fetchFn, hasMore]);

  // Intersection Observer for the sentinel element
  const sentinelRef = useCallback((node) => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!node) return;
    observerRef.current = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(page); },
      { threshold, rootMargin }
    );
    observerRef.current.observe(node);
  }, [page, loadMore, threshold, rootMargin]);

  useEffect(() => {
    loadMore(1);
    return () => { abortRef.current?.abort(); observerRef.current?.disconnect(); };
  }, []); // eslint-disable-line -- intentionally run once

  return { items, loading, error, hasMore, sentinelRef };
}

// Usage:
const Feed = () => {
  const { items, loading, sentinelRef } = useInfiniteScroll(fetchPosts);
  return (
    <div>
      {items.map(post => <PostCard key={post.id} post={post} />)}
      <div ref={sentinelRef}>{loading && <Spinner />}</div>
    </div>
  );
};`,
      followUps: [
        {
          q: "What is the difference between useRef and useState? When would you use each?",
          a: "useState: triggers re-render on change, value available in JSX. useRef: does NOT trigger re-render, mutable .current property, same object across renders. Use useRef for: (1) DOM references, (2) storing previous values, (3) tracking mounting/unmounting state, (4) storing values that change frequently but don't need to trigger renders (animation frame IDs, interval IDs, flag values like 'isFetching'). Rule: if the UI needs to react to the value changing, useState. If it's internal bookkeeping, useRef."
        }
      ]
    },
    {
      level: "Senior",
      q: "Explain useReducer vs useState. When would you choose useReducer in a real application?",
      scenario: "You have a multi-step form (5 steps) with complex validation, ability to go back/forward, and draft saving.",
      a: `useReducer is better when:
• State has multiple sub-values that change together
• Next state depends on previous state in complex ways
• State transitions have names (makes debugging easier)
• Logic needs to be testable in isolation

// Multi-step form with useReducer:
const initialState = {
  step: 1,
  data: { personal: {}, address: {}, payment: {} },
  errors: {},
  isDirty: false,
  isSubmitting: false,
};

function formReducer(state, action) {
  switch (action.type) {
    case 'NEXT_STEP':
      return { ...state, step: Math.min(state.step + 1, 5) };
    case 'PREV_STEP':
      return { ...state, step: Math.max(state.step - 1, 1) };
    case 'UPDATE_FIELD':
      return {
        ...state,
        isDirty: true,
        data: {
          ...state.data,
          [action.section]: { ...state.data[action.section], [action.field]: action.value }
        }
      };
    case 'SET_ERRORS':
      return { ...state, errors: action.errors };
    case 'SUBMIT_START':
      return { ...state, isSubmitting: true };
    case 'SUBMIT_SUCCESS':
      return { ...initialState }; // Reset form
    case 'SUBMIT_ERROR':
      return { ...state, isSubmitting: false, errors: action.errors };
    default:
      return state;
  }
}

// Dispatch is STABLE — never changes reference!
const [state, dispatch] = useReducer(formReducer, initialState);

// Benefits: each action is a named, testable unit
// Easy to add logging/analytics: dispatch({ type: 'NEXT_STEP' }) → log step change
// Reducer is pure function → easy to unit test without React`,
      followUps: [
        {
          q: "How would you implement undo/redo with useReducer?",
          a: "Wrap state in { past: [], present: currentState, future: [] }. On every action, push present to past and set new present. UNDO: pop from past → push present to future → restore past state. REDO: pop from future → push present to past → restore future state. Limit past array size (e.g., 50 items) to avoid memory growth. This pattern works for text editors, drawing apps, form wizards."
        }
      ]
    },
    {
      level: "Advanced",
      q: "Explain useDeferredValue and useTransition. What's the difference and real use cases?",
      scenario: "Search input filters a 10,000-item list. Typing feels laggy because filtering blocks the input.",
      a: `Both are React 18 Concurrent features for marking updates as non-urgent.

useTransition: marks a STATE UPDATE as non-urgent (you control the setter)
useDeferredValue: marks a VALUE as non-urgent (you receive a prop or derived value)

// useTransition — for state updates YOU control:
const [isPending, startTransition] = useTransition();

const handleSearch = (e) => {
  const value = e.target.value;
  setInputValue(value); // Urgent: update input immediately
  startTransition(() => {
    setQuery(value); // Non-urgent: defer the expensive filter
  });
};
// Input stays responsive, list updates when browser is idle

// useDeferredValue — for values you DON'T control (props from parent):
const SearchResults = ({ query }) => {
  const deferredQuery = useDeferredValue(query);
  // deferredQuery lags behind query — shows stale results while new ones compute
  const results = useMemo(
    () => filterItems(items, deferredQuery),
    [items, deferredQuery]
  );
  return (
    <div style={{ opacity: query !== deferredQuery ? 0.7 : 1 }}>
      {results.map(item => <Item key={item.id} item={item} />)}
    </div>
  );
};

KEY DIFFERENCE:
• useTransition: wrap the setter — state stays in "pending" during transition
• useDeferredValue: wrap the value — shows stale data with optional fade

Both work by telling React: "if something more urgent comes in, abandon this render."`,
      followUps: [
        {
          q: "What is tearing in Concurrent React and how does React prevent it?",
          a: "Tearing: in Concurrent Mode, a render can be interrupted. If external store (non-React state) changes mid-render, some components could read old value, some read new — inconsistent UI. React prevents tearing for its own state automatically. For external stores, use useSyncExternalStore (React 18). Redux, Zustand, Jotai all use this hook internally. Never read from external mutable stores directly in render without useSyncExternalStore."
        }
      ]
    }
  ],

  performance: [
    {
      level: "Senior",
      q: "Explain React's reconciliation and how keys affect performance. Common key mistakes.",
      scenario: "You have a drag-and-drop list. After reordering, all items re-render and animations break.",
      a: `Keys tell React which items in a list correspond across renders.

React's diffing algorithm for lists:
1. Iterates through new children
2. Matches each with old children by KEY
3. Items with matching keys = update (diff props)
4. Items with no old match = mount (create)
5. Old items with no new match = unmount (destroy)

❌ WRONG — Index as key:
{items.map((item, index) => (
  <Item key={index} item={item} /> // Index 0 always maps to first DOM node
))}
// Insert at beginning: index 0 now maps to NEW item but React UPDATES old DOM node
// Causes: wrong animations, lost input state, mismatched component state

❌ WRONG — Random key:
<Item key={Math.random()} /> // New key every render = unmount + remount every time!

✅ CORRECT — Stable, unique ID:
{items.map(item => (
  <Item key={item.id} item={item} /> // React correctly maps item.id across renders
))}

// When index key IS acceptable:
// 1. List is static (never reorders/inserts/deletes)
// 2. Items have no state
// 3. Rendering from server with no client interaction

// Advanced: key to force remount (reset):
<UserProfile key={userId} userId={userId} />
// Changing userId causes full remount — useful to reset all state
// Better than complex useEffect logic to "reset" on prop change`,
      followUps: [
        {
          q: "How would you profile a slow React application and find the bottleneck?",
          a: "Step 1: React DevTools Profiler — record interaction, look for: long bars (slow renders), components rendering too often (check with 'Highlight updates'). Step 2: Look at 'why did this render' — props changed, state changed, context changed, parent rendered. Step 3: Chrome Performance tab — look for long tasks (>50ms). Step 4: Use the 'components' tab — filter by render count. Tools: why-did-you-render library (logs unexpected re-renders), React DevTools flamegraph. Fix order: colocate state → memoize → virtualize → code-split."
        }
      ]
    },
    {
      level: "Senior",
      q: "When should you memoize and when is memoization harmful?",
      scenario: "A junior dev has wrapped every component in React.memo and every function in useCallback. The app is slower than before.",
      a: `Memoization has REAL COSTS that are often ignored:

React.memo costs:
• Props comparison function runs on EVERY render of parent
• Stores previous props in memory
• Adds complexity/indirection

Only use React.memo when:
✅ Component is "pure" (same props = same output)
✅ Component re-renders frequently due to parent
✅ Component render is expensive (complex calculation, many children)
✅ You've MEASURED it's a bottleneck

❌ DON'T memoize when:
• Props ALWAYS change (new object/function from non-memoized parent)
• Component renders rarely anyway
• Component render is trivial (<1ms)
• Props comparison is expensive (deep object comparison)

// Memoization trap — both must be memoized or neither works:
const Parent = () => {
  // ❌ handleClick is new every render → React.memo on Child is useless!
  const handleClick = () => console.log('click');
  return <Child onClick={handleClick} />;
};

// ✅ Both memoized together:
const Parent = () => {
  const handleClick = useCallback(() => console.log('click'), []);
  return <Child onClick={handleClick} />;
};
const Child = React.memo(({ onClick }) => <button onClick={onClick} />);

Rule of thumb:
1. Write without memoization
2. Measure with React DevTools Profiler
3. Memoize ONLY measured bottlenecks
4. Measure again to confirm improvement`,
      followUps: [
        {
          q: "What is React Compiler (React Forget) and how does it change memoization?",
          a: "React Compiler (previously React Forget) is an auto-memoization compiler built by the React team. It analyzes your code and automatically inserts useMemo/useCallback/React.memo where beneficial — you write 'normal' React without manual memoization. It understands React's rules (hooks rules, pure components) to make safe transformations. Available in React 19+ as opt-in. The implication: manual memoization may become an antipattern as the compiler does it better than humans."
        }
      ]
    },
    {
      level: "Senior",
      q: "Implement virtualization for a list of 100,000 items. Explain the approach.",
      scenario: "Your admin panel shows a table with 100k rows. It freezes the browser on load.",
      a: `Virtualization = only render what's VISIBLE in the viewport + a small buffer.

// With react-window (production solution):
import { FixedSizeList, VariableSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

// Fixed height rows:
const VirtualTable = ({ items }) => (
  <AutoSizer>
    {({ height, width }) => (
      <FixedSizeList
        height={height}
        width={width}
        itemCount={items.length}
        itemSize={52} // Row height in px
        overscanCount={5} // Render 5 extra rows above/below viewport
        itemData={items} // Passed to Row component
      >
        {Row}
      </FixedSizeList>
    )}
  </AutoSizer>
);

// MUST memoize the Row component or it re-renders on every scroll:
const Row = React.memo(({ index, style, data }) => (
  <div style={style} className="table-row">
    <span>{data[index].name}</span>
    <span>{data[index].email}</span>
  </div>
));

// Custom implementation (understand the concept):
const VirtualList = ({ items, itemHeight, containerHeight }) => {
  const [scrollTop, setScrollTop] = useState(0);
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + visibleCount + 2, items.length);
  const offsetY = startIndex * itemHeight;
  const totalHeight = items.length * itemHeight;

  return (
    <div style={{ height: containerHeight, overflow: 'auto' }}
         onScroll={e => setScrollTop(e.target.scrollTop)}>
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: \`translateY(\${offsetY}px)\` }}>
          {items.slice(startIndex, endIndex).map((item, i) => (
            <div key={items[startIndex + i].id} style={{ height: itemHeight }}>
              {item.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};`,
      followUps: [
        {
          q: "How do you handle variable-height items in a virtual list?",
          a: "Use react-window's VariableSizeList with an itemSize function that returns height per index. Challenge: you need to know heights upfront, or measure dynamically. For dynamic heights: use react-virtual (TanStack Virtual) which handles auto-measurement. Strategy: render items off-screen to measure, cache heights, then position. For server-rendered content: estimate height first, render, update with measured value using a ResizeObserver."
        }
      ]
    }
  ],

  memory: [
    {
      level: "Senior",
      q: "Identify and fix all memory leaks in this React component. Explain each one.",
      scenario: "Your dashboard component causes memory to grow by ~50MB every time a user navigates away and back.",
      a: `// ❌ LEAKY COMPONENT (5 leaks!):
function Dashboard({ userId }) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    // LEAK 1: No abort controller — response may arrive after unmount
    fetch(\`/api/users/\${userId}\`).then(r => r.json()).then(d => setData(d));
    
    // LEAK 2: Interval never cleared
    const interval = setInterval(() => {
      setData(prev => refreshData(prev));
    }, 5000);
    
    // LEAK 3: Global event listener never removed
    window.addEventListener('resize', handleResize);
    
    // LEAK 4: Third-party subscription never unsubscribed
    const sub = eventBus.subscribe('user-update', handleUpdate);
    
    // LEAK 5: setData called after unmount (causes React warning + prevents GC)
    setTimeout(() => setData(null), 10000);
  }, [userId]);
}

// ✅ FIXED COMPONENT:
function Dashboard({ userId }) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;
    
    // Fix 1: Abortable fetch
    fetch(\`/api/users/\${userId}\`, { signal: controller.signal })
      .then(r => r.json())
      .then(d => { if (mounted) setData(d); })
      .catch(e => { if (e.name !== 'AbortError') console.error(e); });
    
    // Fix 2: Clear interval on unmount
    const interval = setInterval(() => {
      if (mounted) setData(prev => refreshData(prev));
    }, 5000);
    
    // Fix 3: Remove event listener
    window.addEventListener('resize', handleResize);
    
    // Fix 4: Unsubscribe
    const sub = eventBus.subscribe('user-update', handleUpdate);
    
    // Fix 5: Clear timeout
    const timeout = setTimeout(() => { if (mounted) setData(null); }, 10000);
    
    return () => {
      mounted = false;
      controller.abort();
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
      sub.unsubscribe();
      clearTimeout(timeout);
    };
  }, [userId]);
}`,
      followUps: [
        {
          q: "How does React's Strict Mode help detect memory leaks?",
          a: "StrictMode double-invokes effects (mount → unmount → remount) in development. If your component has a leak (listener not removed, subscription not cancelled), it will have DOUBLE subscriptions after the remount. This makes the leak immediately obvious instead of subtle. It also double-invokes: render, useState initializer, useMemo, useReducer. This catches side effects in places they shouldn't be. Think of it as an automated leak detector."
        }
      ]
    },
    {
      level: "Advanced",
      q: "Explain the React rendering memory model. How does React store component state and how does it get cleaned up?",
      scenario: "You have a modal that fetches heavy data. Even after closing the modal, memory doesn't drop.",
      a: `React stores component state in Fiber nodes (not in the component function itself).

Memory lifecycle:
1. Component mounts → React creates a Fiber node with memoizedState linked list
2. Each hook (useState, useEffect, useRef) creates a hook "record" in this list
3. Component unmounts → React schedules Fiber for deletion
4. GC happens when: no JS references to the Fiber or its data

WHY MEMORY DOESN'T DROP AFTER MODAL CLOSE:

// Case 1: Retained reference in closure:
const App = () => {
  const [modalData, setModalData] = useState(null); // 50MB object
  // Even after setting to null, if a closure elsewhere holds reference:
  const logRef = useRef([]);
  // If logRef.current.push(modalData) ran before, 
  // ref holds reference to that 50MB object even after modal closes!
  
  // Fix: clear ref entries that hold large data
  useEffect(() => {
    return () => { logRef.current = []; }; // Clear on unmount
  }, []);
};

// Case 2: Context holding reference:
const DataContext = createContext();
// If context value holds large object, all consumers keep it alive
// Fix: normalize/reduce data before putting in context

// Case 3: Memoization holding stale reference:
const memoized = useMemo(() => expensiveComputation(largeData), [largeData]);
// useMemo holds previous and current value during comparison!
// Solution: clear or restructure large data before it reaches useMemo

// Detecting with Chrome:
// Performance Monitor → JS heap size
// Take heap snapshot → filter "Detached" 
// Look for "Detached HTMLElement" or your component class name`,
      followUps: [
        {
          q: "What is a detached DOM node and how does it cause memory leaks?",
          a: "A detached DOM node is a DOM element no longer in the document tree but still referenced by JavaScript. React normally removes DOM nodes when unmounting. But if you store a DOM ref in a module-level variable, a closure, or a global event listener, the DOM node can't be GC'd. Example: window._debug = ref.current — now that entire DOM subtree is stuck in memory. Fix: never store refs in global scope, always clean up event listeners that reference DOM nodes, use WeakRef if you need weak DOM references."
        }
      ]
    }
  ],

  modern: [
    {
      level: "Advanced",
      q: "Explain React Fiber architecture in depth. What are the two phases and what can you do in each?",
      scenario: "You need to implement a feature that updates the DOM without causing layout thrash, similar to how React does it internally.",
      a: `React Fiber splits work into two phases:

PHASE 1 — RENDER/RECONCILIATION (can be interrupted):
• Pure computation — no side effects
• Creates/updates Fiber tree ("work in progress" tree)
• Runs: render functions, useMemo, shouldComponentUpdate
• CAN be paused, restarted, or abandoned
• React can work on this in background (Concurrent Mode)

PHASE 2 — COMMIT (synchronous, cannot be interrupted):
• Applies all changes to real DOM at once
• Sub-phases: beforeMutation → mutation → layout
  - beforeMutation: getSnapshotBeforeUpdate, useLayoutEffect cleanup
  - mutation: actual DOM insertions/deletions/updates
  - layout: componentDidMount/Update, useLayoutEffect callback
• useEffect runs ASYNCHRONOUSLY after commit (after paint)

Fiber node structure:
{
  type: 'div',        // Component type
  key: null,          // For reconciliation
  stateNode: domNode, // Actual DOM node
  child: fiberNode,   // First child
  sibling: fiberNode, // Next sibling  
  return: fiberNode,  // Parent
  pendingProps: {},   // Props for this render
  memoizedProps: {},  // Props from last render
  memoizedState: {},  // State (linked list of hook states)
  effectTag: 0,       // What needs to happen (place, update, delete)
  lanes: 0,          // Priority lanes (React 18)
}

// Double buffering: React maintains TWO trees:
// 1. "current" tree — what's on screen
// 2. "work in progress" tree — being built
// On commit, React swaps the pointer (current = workInProgress)
// The old tree becomes the new "work in progress" for next render`,
      followUps: [
        {
          q: "What are React Lanes and how do they enable priority scheduling?",
          a: "Lanes are a bitmask system replacing the old 'expiration time' priority model. Each update is assigned to one or more 'lanes' (bit positions). Higher priority lanes (user interactions) have lower bit values. React processes lanes from highest to lowest priority. Example lanes: SyncLane (1) = click events, InputContinuousLane (4) = drag/scroll, DefaultLane (16) = normal updates, TransitionLane = startTransition updates, IdleLane = lowest priority. Multiple updates in the same lane are batched together."
        }
      ]
    },
    {
      level: "Senior",
      q: "Explain React Suspense — how it works, its current capabilities, and what's coming.",
      scenario: "You have a page with 5 data-fetching components. Without Suspense, you have 5 separate loading states and waterfall fetches.",
      a: `Suspense is React's mechanism for declaratively handling async operations.

HOW IT WORKS:
// Suspense catches Promise throws from children
// A component "suspends" by throwing a Promise
// Suspense boundary shows fallback while Promise is pending
// When Promise resolves, React re-renders the suspended component

// Custom Suspense-compatible resource (the "throw a Promise" pattern):
function createResource(promise) {
  let status = 'pending';
  let result;
  const suspender = promise.then(
    data => { status = 'success'; result = data; },
    err => { status = 'error'; result = err; }
  );
  return {
    read() {
      if (status === 'pending') throw suspender;   // Suspend!
      if (status === 'error') throw result;         // Error boundary!
      return result;                                 // Return data
    }
  };
}

// Modern usage with React Query / SWR (they handle this for you):
const Posts = () => {
  const { data } = useSuspenseQuery({ queryKey: ['posts'], queryFn: fetchPosts });
  return data.map(post => <Post key={post.id} post={post} />);
};

// Concurrent data fetching with Suspense:
<Suspense fallback={<PageSkeleton />}>
  <ErrorBoundary>
    <SuspenseList revealOrder="together"> {/* All show at once */}
      <UserProfile />    {/* Fetches in parallel */}
      <UserPosts />      {/* Fetches in parallel */}
      <UserFollowers />  {/* Fetches in parallel */}
    </SuspenseList>
  </ErrorBoundary>
</Suspense>

// Suspense for lazy loading (most common use today):
const Dashboard = lazy(() => import('./Dashboard'));
<Suspense fallback={<Spinner />}>
  <Dashboard />
</Suspense>`,
      followUps: [
        {
          q: "What is the Suspense waterfall problem and how does React solve it?",
          a: "Waterfall: Component A renders → suspends → resolves → renders B → B suspends → etc. Each component waits for the previous one. Solution: Render all suspended components in parallel — they all throw Promises at the same time, React waits for ALL of them. The key is starting fetches BEFORE rendering — with React Query's prefetching, or React Router's loaders, or server components. SuspenseList with revealOrder='together' waits for all and reveals simultaneously, avoiding layout shift."
        },
        {
          q: "What are React Server Components and how do they differ from client components?",
          a: "RSC run exclusively on the server — they can access databases, file system, secrets directly. They never send JavaScript to the client (zero bundle size). They can be async (await data fetching directly). They CANNOT: use useState, useEffect, browser APIs, event handlers. Client components: use 'use client' directive, run on both server (initial HTML) and client (hydration). Mix: RSC as shell/data fetching layer, client components for interactive islands. Next.js App Router uses RSC by default."
        }
      ]
    },
    {
      level: "Advanced",
      q: "Explain Error Boundaries — implementation, limitations, and the new React 19 use() hook.",
      scenario: "Your product page crashes when the API returns 500. The entire app goes blank instead of showing a friendly error.",
      a: `Error Boundaries catch JavaScript errors anywhere in the child component tree.

// MUST be a class component (no functional equivalent yet):
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error) {
    // Called during render phase — update state to show fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Called after render — log to error tracking service
    logErrorToSentry(error, errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-ui">
          <h2>Something went wrong</h2>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Granular error boundaries:
<ErrorBoundary fallback={<PageError />}>
  <ErrorBoundary fallback={<SidebarError />}>
    <Sidebar />    {/* If this crashes, only sidebar shows error */}
  </ErrorBoundary>
  <ErrorBoundary fallback={<ContentError />}>
    <MainContent /> {/* If this crashes, only content shows error */}
  </ErrorBoundary>
</ErrorBoundary>

// LIMITATIONS — Error Boundaries DO NOT catch:
// ❌ Async errors (setTimeout, fetch .catch)
// ❌ Event handlers (use try/catch inside)
// ❌ Server-side rendering errors
// ❌ Errors in the error boundary itself

// React 19 use() hook (experimental):
// Can use Promises and Context in any component
const data = use(fetchDataPromise); // Suspends if pending, throws if rejected
// Allows async error handling without class components`,
      followUps: [
        {
          q: "How do you reset an Error Boundary after the user takes action?",
          a: "Option 1: Use a key prop — <ErrorBoundary key={resetKey}> — change resetKey to remount the boundary and clear error state. Option 2: Add a reset callback prop. Option 3: Use react-error-boundary library which provides useErrorBoundary hook, resetErrorBoundary function, and onReset callback. Real pattern: catch API error → show retry button → user clicks → increment reset key → boundary remounts → component retries fetch."
        }
      ]
    }
  ],

  patterns: [
    {
      level: "Senior",
      q: "Explain Higher-Order Components, Render Props, and Custom Hooks. When would you use each?",
      scenario: "You need to add authentication check, loading state, and error handling to 10 different page components.",
      a: `// HOC (Higher-Order Component) — wraps component, returns new enhanced component:
function withAuth(WrappedComponent) {
  return function AuthenticatedComponent(props) {
    const { user, loading } = useAuth();
    if (loading) return <Spinner />;
    if (!user) return <Navigate to="/login" />;
    return <WrappedComponent {...props} user={user} />;
  };
}
const ProtectedDashboard = withAuth(Dashboard);

// Pros: reusable, composable, works with class components
// Cons: wrapper hell (DevTools shows HOC_A(HOC_B(HOC_C(Component))))
//       prop naming collisions, harder to type with TypeScript

// RENDER PROPS — component with function prop for rendering:
<DataFetcher url="/api/users" render={({ data, loading, error }) => (
  loading ? <Spinner /> : <UserList users={data} />
)} />
// Or children prop (more common):
<DataFetcher url="/api/users">
  {({ data, loading }) => <UserList users={data} />}
</DataFetcher>

// Pros: explicit data flow, no prop collisions
// Cons: callback hell with nesting, performance issues if inline

// CUSTOM HOOKS — extract and reuse stateful logic:
function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { /* check auth */ }, []);
  return { user, loading };
}
function useFetch(url) {
  // ... fetch logic
  return { data, loading, error, refetch };
}

// Usage in component:
const Dashboard = () => {
  const { user } = useAuth();
  const { data, loading } = useFetch('/api/dashboard');
  if (!user) return <Navigate to="/login" />;
  // ...
};

// VERDICT: Custom Hooks are almost always the right choice in 2024+
// HOCs still useful for: class components, third-party library integration
// Render Props still useful for: component-level slot patterns`,
      followUps: [
        {
          q: "What is the Compound Component pattern? Give a real example.",
          a: "Compound components share implicit state via Context, giving the consumer control over structure. Think <select>/<option>, <Tabs>/<Tab>/<TabPanel>. Example: <Modal><Modal.Header>Title</Modal.Header><Modal.Body>Content</Modal.Body><Modal.Footer><Modal.CloseButton /></Modal.Footer></Modal>. The parent Modal provides context (isOpen, onClose), children consume it without explicit prop drilling. Benefits: flexible composition, clear semantic structure, consumer decides layout."
        }
      ]
    },
    {
      level: "Senior",
      q: "Implement the Observer pattern in React. How does pub/sub relate to React state management?",
      scenario: "Two sibling components (deeply nested, far apart in the tree) need to communicate without lifting state 15 levels up.",
      a: `// EventBus (pub/sub) pattern:
class EventBus {
  constructor() { this.listeners = new Map(); }
  
  subscribe(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(callback);
    return () => this.listeners.get(event).delete(callback); // Unsubscribe fn
  }
  
  publish(event, data) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }
}

export const bus = new EventBus();

// Custom hook wrapping event bus:
function useEventBus(event, callback) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback; // Always fresh callback, no stale closure
  
  useEffect(() => {
    const unsubscribe = bus.subscribe(event, (...args) => callbackRef.current(...args));
    return unsubscribe; // Auto-cleanup on unmount!
  }, [event]); // Re-subscribe only if event name changes
}

// Component A (deep in left subtree):
const NotificationButton = () => {
  const sendAlert = () => bus.publish('alert', { message: 'Item saved!', type: 'success' });
  return <button onClick={sendAlert}>Save</button>;
};

// Component B (deep in right subtree):
const AlertDisplay = () => {
  const [alerts, setAlerts] = useState([]);
  useEventBus('alert', (alert) => {
    setAlerts(prev => [...prev, { ...alert, id: Date.now() }]);
  });
  return <div>{alerts.map(a => <Alert key={a.id} {...a} />)}</div>;
};

// Better for React: use Zustand or Context for most cases.
// EventBus is good for: cross-microfrontend communication, 
// integrating with non-React code, legacy system bridges.`,
      followUps: [
        {
          q: "What are the pros/cons of Context API vs Zustand for global state?",
          a: "Context: built-in, no dependency. BUT every context value change re-renders ALL consumers — even if they only use part of the value. No selector support. Zustand: tiny (~1KB), subscriptions per-slice (only re-render when subscribed slice changes), middleware support (devtools, immer, persist), no provider needed, works outside React. Rule: Context for low-frequency updates (auth user, theme, locale). Zustand for frequent updates or when many components subscribe to different slices."
        }
      ]
    }
  ],

  state_mgmt: [
    {
      level: "Senior",
      q: "Explain Redux Toolkit's createSlice and how it differs from traditional Redux. What problems does it solve?",
      scenario: "Your Redux codebase has 50+ action types, 20 reducers, and 100+ action creators. Developers spend more time on boilerplate than features.",
      a: `Traditional Redux problems:
• Separate files for actions, action types, reducers
• Immutable updates require spread operators (error-prone)
• Async actions need middleware setup (redux-thunk separately)
• DevTools setup is manual

Redux Toolkit (RTK) solves ALL of these:

// createSlice — co-locates actions and reducer:
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunk (replaces redux-thunk boilerplate):
export const fetchUsers = createAsyncThunk('users/fetchAll', 
  async (params, { rejectWithValue }) => {
    try {
      const res = await api.getUsers(params);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response.data); // Pass error to reducer
    }
  }
);

export const usersSlice = createSlice({
  name: 'users',
  initialState: { list: [], loading: false, error: null },
  reducers: {
    // Immer built-in — write "mutating" code, get immutable updates!
    addUser: (state, action) => {
      state.list.push(action.payload); // Looks mutable, actually immutable!
    },
    removeUser: (state, action) => {
      state.list = state.list.filter(u => u.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => { state.loading = true; })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { addUser, removeUser } = usersSlice.actions;

// RTK Query — data fetching built into Redux:
const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: (build) => ({
    getUsers: build.query({ query: () => 'users' }),
    deleteUser: build.mutation({ query: (id) => ({ url: \`users/\${id}\`, method: 'DELETE' }) }),
  })
});`,
      followUps: [
        {
          q: "When would you choose Zustand over Redux Toolkit?",
          a: "Zustand: when you want minimal boilerplate, no provider, simpler mental model, client-only state (no need for server-state in Redux). RTK: when you need devtools time-travel debugging, middleware ecosystem, normalized server cache (RTK Query), or have a large team familiar with Redux patterns. RTK Query vs React Query: RTK Query integrates with Redux store (good if you want server state in Redux for devtools). React Query is standalone and often simpler for data fetching."
        }
      ]
    }
  ],

  testing: [
    {
      level: "Senior",
      q: "Explain the Testing Library philosophy. How do you test user interactions vs implementation details?",
      scenario: "A junior dev has tests that break every time you refactor the component, even though behavior stays the same.",
      a: `Testing Library philosophy: "Test what the user sees and does, not implementation details."

❌ TESTING IMPLEMENTATION (brittle):
// Breaks if you rename state, change internal structure
const { instance } = render(<LoginForm />);
expect(instance.state.email).toBe('test@test.com');
expect(wrapper.find('input').first().prop('onChange')).toBeDefined();

✅ TESTING BEHAVIOR (resilient):
import { render, screen, userEvent } from '@testing-library/react';

test('user can log in successfully', async () => {
  const user = userEvent.setup();
  const mockLogin = jest.fn().mockResolvedValue({ token: 'abc' });
  
  render(<LoginForm onLogin={mockLogin} />);
  
  // Query by what user SEES (accessible role/label):
  await user.type(screen.getByLabelText(/email/i), 'john@example.com');
  await user.type(screen.getByLabelText(/password/i), 'secret123');
  await user.click(screen.getByRole('button', { name: /sign in/i }));
  
  // Assert what user SEES:
  expect(await screen.findByText(/welcome back/i)).toBeInTheDocument();
  expect(mockLogin).toHaveBeenCalledWith({ email: 'john@example.com', password: 'secret123' });
});

// QUERY PRIORITY (use in this order):
// 1. getByRole — most accessible, tests a11y too
// 2. getByLabelText — for form inputs
// 3. getByPlaceholderText — fallback for inputs
// 4. getByText — for static text
// 5. getByTestId — last resort (implementation detail)

// ASYNC queries:
// findBy* — waits up to 1000ms (for async state updates)
// waitFor(() => expect(x).toBe(y)) — for complex async assertions

// Mocking API calls:
import { rest } from 'msw'; // Mock Service Worker — intercepts real fetch calls!
const server = setupServer(
  rest.get('/api/users', (req, res, ctx) => res(ctx.json([{id:1, name:'John'}])))
);
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());`,
      followUps: [
        {
          q: "How do you test a custom hook in isolation?",
          a: "Use renderHook from @testing-library/react: const { result, rerender } = renderHook(() => useCounter(0)). Access values via result.current. Wrap state-changing actions in act(): act(() => { result.current.increment(); }). For hooks with async behavior: await act(async () => { result.current.fetchData(); }). For hooks that need context providers, pass them via the wrapper option: renderHook(() => useAuth(), { wrapper: AuthProvider })."
        }
      ]
    }
  ],

  realworld: [
    {
      level: "Senior",
      q: "How would you architect a large-scale React application? What decisions matter most?",
      scenario: "You're tech lead for a new enterprise SaaS product. 20 developers, 2-year timeline, needs to scale to millions of users.",
      a: `FOLDER STRUCTURE — Feature-based (not type-based):
src/
├── features/           # Business feature modules
│   ├── auth/
│   │   ├── components/ # Auth-specific components
│   │   ├── hooks/      # useAuth, usePermission
│   │   ├── store/      # Redux slice or Zustand store
│   │   ├── api.ts      # Auth API calls
│   │   └── index.ts    # Public API (barrel export)
│   ├── dashboard/
│   └── billing/
├── shared/             # Truly shared code
│   ├── components/     # Button, Modal, Table, Form
│   ├── hooks/          # useDebounce, useLocalStorage
│   ├── utils/          # Pure functions
│   └── types/          # Shared TypeScript types
├── app/                # App-level setup
│   ├── router.tsx      # Route definitions
│   ├── store.ts        # Redux store setup
│   └── providers.tsx   # Context providers

KEY ARCHITECTURAL DECISIONS:

1. ROUTING: React Router v6 (data router for loaders/actions) or TanStack Router (type-safe)
   // Co-locate route loaders with data fetching — no waterfall:
   const route = { path: '/users', loader: () => queryClient.fetchQuery('users', fetchUsers), element: <UsersPage /> };

2. DATA FETCHING: React Query / RTK Query — never fetch in useEffect directly
   
3. STATE: Server state (React Query) + UI state (Zustand) + Form state (React Hook Form)
   
4. COMPONENT LIBRARY: Headless UI (Radix/Headless) + Tailwind — control design, accessible primitives

5. CODE SPLITTING: Route-level lazy loading + feature flags for gradual rollout
   
6. PERFORMANCE BUDGET: Bundle size, Core Web Vitals, set budgets in CI

7. TESTING STRATEGY: Unit (utils/hooks), Integration (feature behavior), E2E (critical paths only)

8. ERROR TRACKING: Sentry at every Error Boundary, structured logging

9. FEATURE FLAGS: LaunchDarkly / Unleash — ship code before feature is "on"

10. MICRO-FRONTENDS (if multiple teams): Module Federation — teams ship independently`,
      followUps: [
        {
          q: "How do you handle code splitting in a React app? What are the strategies?",
          a: "Route-level splitting (most impactful — lazy import each route). Component-level (heavy components: rich text editors, charts, maps). Library splitting (moment.js, chart libraries — load only on pages that need them). Tools: React.lazy + Suspense (built-in), dynamic import(), Webpack magic comments (/* webpackChunkName: 'dashboard' */). Measure impact: bundle analyzer (webpack-bundle-analyzer). Metrics to watch: initial JS bundle < 200KB gzipped, route chunks < 50KB each."
        },
        {
          q: "How do you implement role-based access control (RBAC) in React?",
          a: "Three layers: (1) Route guard — protect entire routes (redirect to login/forbidden). (2) Component level — <CanAccess permission='delete:users'><DeleteButton /></CanAccess>. (3) UI level — hide/show buttons based on permissions. Always enforce on backend — frontend RBAC is UX only, not security. Implementation: store permissions array in auth context, create usePermission hook that checks if user has required permission, create ProtectedRoute component, create Can/Ability component. Use CASL.js for complex permission models."
        }
      ]
    },
    {
      level: "Advanced",
      q: "How do you implement optimistic updates in React? Handle rollbacks on failure.",
      scenario: "A 'like' button on a social feed should feel instant. If the API fails, the UI should revert.",
      a: `// Optimistic update pattern with React Query:
const { mutate: likePost } = useMutation({
  mutationFn: (postId) => api.likePost(postId),
  
  onMutate: async (postId) => {
    // 1. Cancel any in-flight refetches (they'd overwrite optimistic update)
    await queryClient.cancelQueries({ queryKey: ['posts'] });
    
    // 2. Snapshot previous value (for rollback)
    const previousPosts = queryClient.getQueryData(['posts']);
    
    // 3. Optimistically update the cache (instant UI response)
    queryClient.setQueryData(['posts'], (old) =>
      old.map(post =>
        post.id === postId
          ? { ...post, likes: post.likes + 1, isLiked: true }
          : post
      )
    );
    
    // 4. Return context with snapshot for rollback
    return { previousPosts };
  },
  
  onError: (err, postId, context) => {
    // 5. Rollback to snapshot on error
    queryClient.setQueryData(['posts'], context.previousPosts);
    toast.error('Failed to like post. Please try again.');
  },
  
  onSettled: () => {
    // 6. Always refetch to sync with server (whether success or error)
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  },
});

// Without React Query (manual pattern):
const likePost = async (postId) => {
  const prevState = posts; // Snapshot
  setPosts(prev => prev.map(p => p.id === postId ? {...p, likes: p.likes + 1} : p));
  try {
    await api.likePost(postId);
  } catch (err) {
    setPosts(prevState); // Rollback
    showError('Failed to like');
  }
};`,
      followUps: [
        {
          q: "How do you prevent race conditions with optimistic updates?",
          a: "Main risk: two rapid requests, second resolves before first, final state is wrong. Solutions: (1) Cancel previous request with AbortController when new one starts. (2) Debounce the action (don't send on every click). (3) Optimistic ID for new items — use temp negative ID until server responds, then replace with real ID. (4) Queue mutations — process sequentially. (5) Use React Query's built-in cancelQueries in onMutate — prevents stale server response from overwriting optimistic state."
        }
      ]
    }
  ]
};

// ─── App ───────────────────────────────────────────────────────────────────

export default function ReactInterviewPrep() {
  const [activeCategory, setActiveCategory] = useState("js_core");
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [revealedFollowUps, setRevealedFollowUps] = useState({});
  const [checked, setChecked] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [timeLeft, setTimeLeft] = useState(null);
  const [currentTip, setCurrentTip] = useState(0);
  const timerRef = useRef(null);

  const TIPS = [
    "💡 Think aloud — interviewers value reasoning over just the answer",
    "🔢 Quote real numbers: '50ms render time', '200KB bundle', '60fps'",
    "⚖️ Always mention trade-offs — no solution is universally correct",
    "🏗️ Start simple, then add complexity when asked to scale",
    "❓ Clarify requirements before designing — always ask questions first",
    "🔄 Mention what you'd measure/profile before optimizing prematurely",
    "🐛 Bring up edge cases: unmount, error states, loading states, empty states",
    "🎯 Use STAR format: Situation → Task → Action → Result",
  ];

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(10, 0, 0, 0);
      if (now >= next) next.setDate(next.getDate() + 1);
      setTimeLeft(Math.max(0, Math.floor((next - now) / 1000)));
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setCurrentTip(i => (i + 1) % TIPS.length), 5000);
    return () => clearInterval(t);
  }, []);

  const fmt = (s) => `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const catQuestions = ALL_QUESTIONS[activeCategory] || [];
  const filteredQuestions = searchTerm.trim()
    ? Object.values(ALL_QUESTIONS).flat().filter(q =>
        q.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.a.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : catQuestions;

  const totalQ = Object.values(ALL_QUESTIONS).flat().length;
  const doneQ = Object.keys(checked).filter(k => checked[k]).length;
  const activeCat = CATEGORIES.find(c => c.id === activeCategory);

  const toggleFollowUp = (qKey, fuIdx) => {
    const k = `${qKey}-fu-${fuIdx}`;
    setRevealedFollowUps(prev => ({ ...prev, [k]: !prev[k] }));
  };

  return (
    <div style={{ minHeight: "100vh", background: "#07070E", color: "#D1D5DB", fontFamily: "'DM Mono', 'Fira Code', 'Courier New', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Outfit:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #07070E; }
        ::-webkit-scrollbar { width: 3px; background: #0d0d1a; }
        ::-webkit-scrollbar-thumb { background: #2a2a40; border-radius: 2px; }
        .cat-pill { cursor: pointer; transition: all 0.18s ease; border: 1px solid transparent; position: relative; }
        .cat-pill:hover { background: #111128 !important; transform: translateY(-1px); }
        .cat-pill.active { border-color: var(--cc) !important; background: color-mix(in srgb, var(--cc) 8%, #07070E) !important; }
        .cat-pill.active::before { content: ''; position: absolute; bottom: -1px; left: 50%; transform: translateX(-50%); width: 20px; height: 2px; background: var(--cc); border-radius: 1px; }
        .q-wrap { border: 1px solid #13132a; border-radius: 14px; transition: border-color 0.2s; overflow: hidden; }
        .q-wrap:hover { border-color: #1f1f40; }
        .q-wrap.open { border-color: color-mix(in srgb, var(--cc) 40%, #13132a); }
        .q-header { display: flex; align-items: flex-start; gap: 14px; padding: 18px 20px; cursor: pointer; background: #0a0a18; }
        .q-header:hover { background: #0d0d1f; }
        .answer-block { background: #07070E; padding: 18px 20px; border-top: 1px solid #13132a; }
        .code-block { background: #0a0a1a; border: 1px solid #1a1a35; border-radius: 10px; padding: 16px; font-size: 11.5px; line-height: 1.85; color: #94A3B8; overflow-x: auto; white-space: pre-wrap; word-break: break-word; margin: 10px 0; }
        .followup-card { background: #0c0c1f; border: 1px solid #1a1a40; border-radius: 10px; padding: 14px 16px; margin-top: 14px; }
        .reveal-btn { background: transparent; border: 1px solid currentColor; border-radius: 6px; padding: 5px 12px; font-size: 11px; cursor: pointer; font-family: inherit; transition: opacity 0.15s; }
        .reveal-btn:hover { opacity: 0.7; }
        .check-btn { width: 22px; height: 22px; border-radius: 5px; border: 1.5px solid; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; transition: all 0.15s; margin-top: 3px; }
        .search-input { background: #0d0d1f; border: 1px solid #1a1a35; border-radius: 10px; padding: 10px 16px; color: #D1D5DB; font-family: inherit; font-size: 13px; width: 100%; outline: none; }
        .search-input:focus { border-color: #3030a0; }
        .tip-anim { animation: fadeUp 0.5s ease; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .badge { display: inline-block; font-size: 9px; padding: 2px 7px; border-radius: 4px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
        .prog-bar { height: 3px; border-radius: 2px; background: #1a1a35; overflow: hidden; }
        .prog-fill { height: 100%; border-radius: 2px; background: linear-gradient(90deg, #61DAFB, #A78BFA); transition: width 0.6s cubic-bezier(.34,1.56,.64,1); }
      `}</style>

      {/* TOPBAR */}
      <div style={{ background: "#09091a", borderBottom: "1px solid #12122a", padding: "14px 20px", position: "sticky", top: 0, zIndex: 200 }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: "#3a3a6a", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 2 }}>React JS · 5 Years Experience · Senior Level</div>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: "#fff", letterSpacing: "-0.02em" }}>
              ⚛️ Complete Interview Prep
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {/* <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, color: "#3a3a6a", letterSpacing: "0.12em", textTransform: "uppercase" }}>Interview In</div>
              <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: "#61DAFB", letterSpacing: "0.05em" }}>
                {timeLeft !== null ? fmt(timeLeft) : "--:--:--"}
              </div>
            </div> */}
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, color: "#3a3a6a", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Progress</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#00C896" }}>{doneQ}/{totalQ}</div>
              <div className="prog-bar" style={{ width: 80, marginTop: 4 }}>
                <div className="prog-fill" style={{ width: `${(doneQ / totalQ) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "20px 16px" }}>

        {/* TIP BAR */}
        <div key={currentTip} className="tip-anim" style={{ background: "#0a0a1f", border: "1px solid #141435", borderRadius: 10, padding: "11px 18px", marginBottom: 18, fontSize: 12, color: "#6b7280" }}>
          {TIPS[currentTip]}
        </div>

        {/* SEARCH */}
        <input className="search-input" placeholder="🔍  Search any topic, question, or concept..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ marginBottom: 18 }} />

        {/* CATEGORY TABS */}
        {!searchTerm && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
            {CATEGORIES.map(cat => {
              const count = ALL_QUESTIONS[cat.id]?.length || 0;
              const done = Object.keys(checked).filter(k => k.startsWith(cat.id) && checked[k]).length;
              return (
                <button key={cat.id} className={`cat-pill ${activeCategory === cat.id ? "active" : ""}`}
                  style={{ "--cc": cat.color, background: "#0a0a18", padding: "8px 14px", borderRadius: 10, color: activeCategory === cat.id ? cat.color : "#4b5563", fontSize: 12, fontFamily: "inherit", fontWeight: 500 }}
                  onClick={() => { setActiveCategory(cat.id); setExpandedIdx(null); }}>
                  {cat.icon} {cat.label}
                  <span style={{ marginLeft: 7, fontSize: 10, color: done === count ? "#00C896" : "#2d2d50", background: "#0d0d20", borderRadius: 4, padding: "1px 5px" }}>
                    {done}/{count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* QUESTIONS LIST */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredQuestions.map((item, idx) => {
            const qKey = searchTerm ? `search-${idx}` : `${activeCategory}-${idx}`;
            const isOpen = expandedIdx === qKey;
            const isDone = checked[qKey];
            const cc = activeCat?.color || "#61DAFB";

            return (
              <div key={qKey} className={`q-wrap ${isOpen ? "open" : ""}`} style={{ "--cc": searchTerm ? "#61DAFB" : cc, opacity: isDone ? 0.6 : 1 }}>
                {/* Header */}
                <div className="q-header" onClick={() => setExpandedIdx(isOpen ? null : qKey)}>
                  <button className="check-btn"
                    style={{ borderColor: isDone ? cc : "#2a2a45", background: isDone ? cc : "transparent", color: isDone ? "#000" : "transparent" }}
                    onClick={e => { e.stopPropagation(); setChecked(prev => ({ ...prev, [qKey]: !prev[qKey] })); }}>
                    ✓
                  </button>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span className="badge" style={{ background: item.level === "Advanced" ? "#7C3AED20" : item.level === "Senior" ? "#0369a120" : "#06472620", color: item.level === "Advanced" ? "#A78BFA" : item.level === "Senior" ? "#38BDF8" : "#34D399" }}>
                        {item.level}
                      </span>
                      {item.scenario && (
                        <span className="badge" style={{ background: "#78350F20", color: "#F59E0B" }}>Scenario-Based</span>
                      )}
                      {item.followUps?.length > 0 && (
                        <span className="badge" style={{ background: "#1E3A2F", color: "#34D399" }}>{item.followUps.length} follow-up{item.followUps.length > 1 ? "s" : ""}</span>
                      )}
                    </div>
                    <p style={{ fontSize: 14, color: isDone ? "#4b5563" : "#E2E8F0", lineHeight: 1.65, fontFamily: "'Outfit', sans-serif", fontWeight: 600 }}>
                      {item.q}
                    </p>
                    {item.scenario && (
                      <p style={{ fontSize: 11.5, color: "#92400E", marginTop: 6, fontStyle: "italic" }}>
                        📌 Scenario: {item.scenario}
                      </p>
                    )}
                  </div>
                  <span style={{ color: "#2d2d50", fontSize: 14, flexShrink: 0, marginTop: 3 }}>{isOpen ? "▲" : "▼"}</span>
                </div>

                {/* Answer */}
                {isOpen && (
                  <div className="answer-block">
                    <div style={{ fontSize: 9, color: cc, letterSpacing: "0.15em", fontWeight: 700, marginBottom: 10, textTransform: "uppercase" }}>
                      ◆ Model Answer
                    </div>
                    <div className="code-block">{item.a}</div>

                    {/* Follow-ups */}
                    {item.followUps?.map((fu, fuIdx) => {
                      const fuKey = `${qKey}-fu-${fuIdx}`;
                      const isRevealed = revealedFollowUps[fuKey];
                      return (
                        <div key={fuIdx} className="followup-card">
                          <div style={{ fontSize: 9, color: "#F59E0B", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>
                            ⚡ Follow-up Question {fuIdx + 1}
                          </div>
                          <p style={{ fontSize: 13, color: "#FCD34D", marginBottom: 10, fontFamily: "'Outfit', sans-serif", fontWeight: 600, lineHeight: 1.5 }}>{fu.q}</p>
                          <button className="reveal-btn" style={{ color: "#F59E0B" }} onClick={() => toggleFollowUp(qKey, fuIdx)}>
                            {isRevealed ? "▲ Hide Answer" : "▼ Reveal Answer"}
                          </button>
                          {isRevealed && (
                            <div style={{ marginTop: 12, fontSize: 12, color: "#78716C", lineHeight: 1.8, fontFamily: "'DM Mono', monospace" }}>
                              {fu.a}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {filteredQuestions.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#2d2d50", fontSize: 14 }}>
              No questions found for "{searchTerm}"
            </div>
          )}
        </div>

        {/* TOPIC COVERAGE SUMMARY */}
        {!searchTerm && (
          <div style={{ marginTop: 30, background: "#09091a", border: "1px solid #12122a", borderRadius: 14, padding: "20px 24px" }}>
            <div style={{ fontSize: 10, color: "#3a3a6a", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 16 }}>📚 Full Topic Coverage</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
              {[
                "✅ JavaScript Closures & Scope", "✅ Event Loop & Microtasks", "✅ Promises & Async/Await",
                "✅ WeakMap / WeakRef / GC", "✅ Virtual DOM & Diffing", "✅ React Fiber Architecture",
                "✅ React Lanes & Scheduling", "✅ useEffect Deep Dive", "✅ Custom Hooks",
                "✅ Performance & Memoization", "✅ Memory Leaks & Cleanup", "✅ React.memo pitfalls",
                "✅ Virtualization (10k items)", "✅ Suspense & Concurrent", "✅ useTransition & Deferred",
                "✅ Error Boundaries", "✅ Server Components", "✅ HOC / Render Props / Hooks",
                "✅ Compound Components", "✅ Redux Toolkit & RTK Query", "✅ Context vs Zustand",
                "✅ Testing Library philosophy", "✅ Optimistic Updates", "✅ RBAC & Auth Patterns",
                "✅ Code Splitting & Lazy", "✅ Stale Closures", "✅ useCallback gotchas",
                "✅ Race Conditions", "✅ App Architecture", "✅ Real-world Scenarios",
              ].map(topic => (
                <div key={topic} style={{ fontSize: 11, color: "#374151", lineHeight: 1.5 }}>{topic}</div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 20, textAlign: "center", fontSize: 11, color: "#1a1a35", letterSpacing: "0.1em" }}>
          YOU'VE GOT THIS — GO CRACK IT 🚀 • {totalQ} QUESTIONS • {CATEGORIES.length} TOPICS
        </div>
      </div>
    </div>
  );
}
