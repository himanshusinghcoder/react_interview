import { useState, useEffect, useRef } from "react";

// ─── DATA ──────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "js_basics",   label: "JS Basics",      icon: "🟨", color: "#FBBF24" },
  { id: "react_core",  label: "React Core",      icon: "⚛️",  color: "#60A5FA" },
  { id: "hooks",       label: "Hooks",           icon: "🪝",  color: "#F87171" },
  { id: "performance", label: "Performance",     icon: "⚡",  color: "#34D399" },
  { id: "memory",      label: "Memory",          icon: "🧠",  color: "#A78BFA" },
  { id: "modern",      label: "Modern React",    icon: "🚀",  color: "#FB923C" },
  { id: "patterns",    label: "Patterns",        icon: "🏗️",  color: "#22D3EE" },
  { id: "coding",      label: "Coding Qs",       icon: "💻",  color: "#E879F9" },
];

const DATA = {

  js_basics: [
    {
      level: "Basic",
      question: "What is a closure in JavaScript?",
      answer: "A closure is when a function remembers the variables from outside itself, even after the outer function has finished running.\n\nThink of it like this: you write a letter and seal it in an envelope. Inside the envelope, the letter can still remember what was written — even after the envelope is closed.",
      example: `function makeCounter() {
  let count = 0;          // This variable lives outside

  return function() {
    count++;              // Inner function remembers 'count'
    return count;
  };
}

const counter = makeCounter();
console.log(counter()); // 1
console.log(counter()); // 2
console.log(counter()); // 3
// 'count' is NOT reset — the inner function closes over it`,
      followups: [
        {
          q: "Where do you use closures in real React projects?",
          a: "Every time you write an event handler inside a component, that is a closure. It 'closes over' the component's state and props. Example: a button's onClick that reads the current userId — it uses closure to remember userId even though it's defined outside the function."
        },
        {
          q: "What is a stale closure? Give a React example.",
          a: "A stale closure happens when a function captures an OLD value of a variable and keeps using it even after the variable has changed.\n\nExample: setInterval inside useEffect with [] dependency captures count=0 forever. Every tick says count is 0. Fix: use functional updater setCount(prev => prev + 1) — this does NOT need the current value from closure."
        }
      ]
    },
    {
      level: "Basic",
      question: "What is the difference between == and === in JavaScript?",
      answer: "== checks only VALUE (it converts types if needed).\n=== checks VALUE and TYPE (strict — no conversion).\n\nAlways use === in React. Using == can cause hidden bugs because JavaScript does unexpected type conversion.",
      example: `console.log(0 == false);   // true  ← dangerous!
console.log(0 === false);  // false ← correct

console.log("" == false);  // true  ← dangerous!
console.log("" === false); // false ← correct

// In React:
if (userId === null) { ... }   // ✅ safe
if (userId == null) { ... }    // ❌ also catches undefined — confusing`,
      followups: [
        {
          q: "What is Object.is()? How is it different from ===?",
          a: "Object.is() is like === but handles two special cases:\n1. NaN === NaN is FALSE, but Object.is(NaN, NaN) is TRUE\n2. +0 === -0 is TRUE, but Object.is(+0, -0) is FALSE\n\nReact uses Object.is() internally to check if state has changed. That's why setting state with the same object reference does NOT cause a re-render."
        }
      ]
    },
    {
      level: "Mid",
      question: "What is the JavaScript Event Loop? Why does it matter in React?",
      answer: "JavaScript runs one thing at a time (single thread). The Event Loop is the system that decides WHAT runs next.\n\nOrder of execution:\n1. Your current code (Call Stack)\n2. Promises / .then() (Microtask Queue)\n3. setTimeout / setInterval (Macrotask Queue)\n\nWhy it matters in React: If you do heavy work (like processing 50,000 items) in the Call Stack, the user CANNOT click, scroll, or interact — the browser is frozen.",
      example: `console.log("1");             // Runs first (Call Stack)

setTimeout(() => {
  console.log("2");           // Runs last (Macrotask)
}, 0);

Promise.resolve().then(() => {
  console.log("3");           // Runs second (Microtask)
});

console.log("4");             // Runs second from call stack

// Output: 1, 4, 3, 2

// React fix — use startTransition for heavy work:
startTransition(() => {
  setItems(process50kItems(rawData)); // React can pause this
});`,
      followups: [
        {
          q: "What happens if you call setState inside a Promise?",
          a: "In React 18, it is automatically batched — multiple setState calls inside a Promise result in only ONE re-render. Before React 18, each setState inside a Promise caused a separate re-render. This is why upgrading to React 18 can improve performance without any code changes."
        }
      ]
    },
    {
      level: "Mid",
      question: "What is the difference between var, let, and const?",
      answer: "var: function-scoped, can be re-declared, hoisted (moved to top). Avoid in modern code.\n\nlet: block-scoped, can be reassigned, NOT hoisted in a usable way.\n\nconst: block-scoped, CANNOT be reassigned. But if it's an object/array, you can still change its contents.\n\nIn React: always use const for components, hooks, and values that don't change. Use let only inside loops or when you truly need reassignment.",
      example: `// var problem:
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100); // prints 3,3,3 — bug!
}

// let fix:
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100); // prints 0,1,2 — correct
}

// const with objects — common mistake:
const user = { name: "Raj" };
user.name = "Priya";     // ✅ This works! Object content can change
user = { name: "Priya" }; // ❌ This fails! Cannot reassign the variable`,
      followups: [
        {
          q: "What is hoisting?",
          a: "Hoisting means JavaScript moves variable and function declarations to the top of their scope before running the code. var variables are hoisted and set to undefined. Function declarations are fully hoisted (you can call them before they appear). let and const are hoisted but NOT initialized — accessing them before declaration gives a ReferenceError (called the 'Temporal Dead Zone')."
        }
      ]
    },
    {
      level: "Senior",
      question: "What is Promise.all vs Promise.allSettled vs Promise.race?",
      answer: "Promise.all: runs all promises at the same time. If ANY ONE fails, the whole thing fails immediately.\n\nPromise.allSettled: runs all promises at the same time. Waits for ALL to finish — doesn't care if some fail. Returns result for each.\n\nPromise.race: returns as soon as the FIRST promise finishes (success or failure).",
      example: `// Promise.all — all or nothing:
try {
  const [users, products] = await Promise.all([
    fetchUsers(),
    fetchProducts()
  ]);
  // Both succeeded
} catch (err) {
  // One failed — both results lost
}

// Promise.allSettled — partial results OK:
const results = await Promise.allSettled([
  fetchUsers(),
  fetchOrders(),
  fetchProducts()
]);

results.forEach(result => {
  if (result.status === "fulfilled") {
    console.log("Got data:", result.value);
  } else {
    console.log("Failed:", result.reason);
  }
});
// Use this for dashboard widgets — show what loaded, show error for rest

// Promise.race — timeout pattern:
const dataOrTimeout = await Promise.race([
  fetchData(),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Timeout!")), 5000)
  )
]);`,
      followups: [
        {
          q: "When would you use Promise.allSettled in a real React app?",
          a: "Dashboard pages where you fetch data for multiple widgets independently. If the 'Revenue' widget API fails, you still want to show 'Users' and 'Orders' widgets. With Promise.allSettled, you get partial results and can show an error only for the failed widget."
        }
      ]
    }
  ],

  react_core: [
    {
      level: "Basic",
      question: "What is the difference between props and state?",
      answer: "Props: data passed FROM parent TO child. The child CANNOT change props. Like function arguments.\n\nState: data that lives INSIDE the component. The component CAN change it. When state changes, the component re-renders.\n\nSimple rule: If the data comes from outside → props. If the component owns and manages the data → state.",
      example: `// Props — passed from parent, read-only in child:
function Greeting({ name }) {        // 'name' is a prop
  return <h1>Hello, {name}!</h1>;
}

// State — owned by the component:
function Counter() {
  const [count, setCount] = useState(0); // 'count' is state

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Add</button>
    </div>
  );
}

// Usage — parent passes props:
<Greeting name="Raj" />  // 'Raj' is a prop`,
      followups: [
        {
          q: "Can a child component change props?",
          a: "No. Props are read-only. If the child needs to update something in the parent, the parent passes a FUNCTION as a prop (like onDelete, onChange). The child calls that function, and the parent handles the actual state change. This is called 'lifting state up'."
        },
        {
          q: "What is prop drilling and how do you fix it?",
          a: "Prop drilling is when you pass props through many layers of components just to reach a deep child. Like passing a letter through 5 people to reach the 6th person.\n\nFix options:\n1. React Context — create a 'broadcast' that any child can listen to\n2. Zustand / Redux — global store outside React tree\n3. Component composition — restructure so the data doesn't need to travel so far"
        }
      ]
    },
    {
      level: "Basic",
      question: "What is the Virtual DOM and why does React use it?",
      answer: "The Virtual DOM is a copy of the real DOM kept in JavaScript memory (as a plain object). When your state changes:\n\n1. React builds a NEW virtual DOM\n2. Compares it with the OLD virtual DOM (this is called 'diffing')\n3. Finds ONLY the things that changed\n4. Updates ONLY those parts in the real DOM\n\nWhy? Directly touching the real DOM is slow. JavaScript objects are fast. React does the hard work in JavaScript first, then does minimal DOM updates.",
      example: `// What your JSX becomes (Virtual DOM = plain JS object):
const element = <h1 className="title">Hello</h1>;

// React sees it as:
{
  type: "h1",
  props: {
    className: "title",
    children: "Hello"
  }
}

// Before React:
document.getElementById("title").textContent = "Hello"; // Direct DOM

// With React:
setTitle("Hello"); // React diffs, finds change, updates only that node`,
      followups: [
        {
          q: "Is Virtual DOM always faster than direct DOM manipulation?",
          a: "No. For very simple updates, direct DOM is faster. Virtual DOM has its own cost — creating objects, diffing, comparing. React wins when: many updates happen together (it batches them), the UI is complex, or you can't easily track what changed. For animations at 60fps, use CSS or canvas directly — not React state."
        }
      ]
    },
    {
      level: "Mid",
      question: "When does a React component re-render? How do you stop unnecessary re-renders?",
      answer: "A component re-renders when:\n1. Its own state changes\n2. Its parent re-renders (most common cause!)\n3. A context it uses changes\n4. Its props change\n\nThe biggest problem: parent re-renders cause ALL children to re-render, even if their props didn't change.",
      example: `// Problem: Parent re-renders → ALL children re-render
function Parent() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>Click</button>
      <ExpensiveChild />  {/* Re-renders on every click! */}
    </div>
  );
}

// Fix 1: React.memo — skip re-render if props didn't change
const ExpensiveChild = React.memo(function ExpensiveChild() {
  console.log("I only render when my props change");
  return <div>Expensive content</div>;
});

// Fix 2: Move state DOWN (state colocation)
function Parent() {
  return (
    <div>
      <Counter />         {/* State lives here — only Counter re-renders */}
      <ExpensiveChild />  {/* Never re-renders! */}
    </div>
  );
}

function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}`,
      followups: [
        {
          q: "What is the 'children as props' trick?",
          a: "If you pass JSX as children, React creates it in the PARENT's scope, not the component that receives it. So when the inner component re-renders due to its own state, the children don't re-render.\n\nExample: <Layout><ExpensiveList /></Layout> — if Layout has its own state (like sidebar toggle), ExpensiveList won't re-render when that state changes."
        }
      ]
    },
    {
      level: "Mid",
      question: "What is the difference between controlled and uncontrolled components?",
      answer: "Controlled: React controls the input value via state. Every keystroke updates state, state drives the input. You have full control.\n\nUncontrolled: The DOM manages the input value. You use a ref to read the value only when needed (like on form submit).\n\nUse controlled for: real-time validation, dependent fields, formatting while typing.\nUse uncontrolled for: simple forms, file inputs, integrating with non-React code.",
      example: `// Controlled — React owns the value:
function ControlledInput() {
  const [email, setEmail] = useState("");

  return (
    <input
      value={email}                           // React controls it
      onChange={(e) => setEmail(e.target.value)} // Every keystroke
      placeholder="Enter email"
    />
  );
}

// Uncontrolled — DOM owns the value:
function UncontrolledInput() {
  const inputRef = useRef(null);

  const handleSubmit = () => {
    console.log(inputRef.current.value);    // Read only when needed
  };

  return (
    <>
      <input ref={inputRef} placeholder="Enter email" />
      <button onClick={handleSubmit}>Submit</button>
    </>
  );
}`,
      followups: [
        {
          q: "Why can't you use value without onChange in React?",
          a: "If you set value without onChange, React makes the input read-only because there's no way to update the state when user types. React will warn you. Use defaultValue instead if you want an initial value but don't want to control it."
        }
      ]
    },
    {
      level: "Senior",
      question: "What is React Reconciliation? How does the key prop help?",
      answer: "Reconciliation is how React decides what changed in the UI and what to update in the DOM.\n\nReact compares the old tree and new tree. Two rules:\n1. If the element TYPE changes (div → span), React destroys and rebuilds completely\n2. For lists, React uses KEY to match items across renders\n\nWithout keys, React matches items by POSITION. This causes bugs when you add/remove/reorder items.",
      example: `// Without keys — React matches by position:
// Old: [A, B, C]
// New: [X, A, B, C]  (X added at beginning)
// React thinks: pos 0 changed A→X, pos 1 changed B→A, etc.
// Re-renders ALL items — wrong and slow!

// With keys — React matches by ID:
{items.map(item => (
  <Item key={item.id} item={item} />
))}
// New: X(id:4) added, A(id:1) B(id:2) C(id:3) unchanged
// React only adds X, keeps A B C as-is — correct and fast!

// Key trick — force a component to fully reset:
<UserProfile key={userId} userId={userId} />
// When userId changes, key changes → React unmounts old, mounts fresh
// Cleaner than complex useEffect reset logic

// ❌ Never use array index as key for dynamic lists:
{items.map((item, index) => (
  <Item key={index} item={item} /> // Causes bugs when reordering
))}`,
      followups: [
        {
          q: "When is it OK to use index as key?",
          a: "Only when ALL three conditions are true:\n1. The list never changes order\n2. Items are never added or removed\n3. Items have no internal state\n\nExample: a static list of navigation links rendered from an array. Static = safe."
        }
      ]
    }
  ],

  hooks: [
    {
      level: "Basic",
      question: "What is useState and how does it work?",
      answer: "useState gives your component a memory. It stores a value and gives you a function to update it. When you update it, React re-renders the component with the new value.\n\nImportant: setState does NOT change the value immediately. React schedules a re-render, and on the NEXT render, the new value is used.",
      example: `import { useState } from "react";

function LikeButton() {
  const [likes, setLikes] = useState(0);  // start with 0

  const handleClick = () => {
    setLikes(likes + 1);  // Schedule a re-render with new value
    console.log(likes);   // Still shows OLD value here!
  };

  return (
    <button onClick={handleClick}>
      ❤️ {likes} Likes
    </button>
  );
}

// ✅ Functional updater — safe when new value depends on old:
setLikes(prev => prev + 1);  // Always uses latest value

// Object state — always spread, never mutate:
const [user, setUser] = useState({ name: "Raj", age: 25 });

setUser({ ...user, age: 26 });  // ✅ correct — new object
user.age = 26;                  // ❌ wrong — direct mutation, no re-render`,
      followups: [
        {
          q: "Why does React not update state immediately?",
          a: "React batches state updates for performance. If you call setState 3 times in one event handler, React does only ONE re-render, not three. This is automatic in React 18 (even inside Promises and setTimeout). The update happens during the next render cycle."
        },
        {
          q: "What happens if you call setState with the same value?",
          a: "React uses Object.is() to compare the new value with the old. If they are the same, React skips the re-render. But for objects and arrays, even if the content is same, a new object/array is a DIFFERENT reference — React will re-render. This is why you should not create new objects unnecessarily in render."
        }
      ]
    },
    {
      level: "Mid",
      question: "What is useEffect and what are the rules for its dependency array?",
      answer: "useEffect lets you run code AFTER React has updated the DOM. It's for side effects — things that happen outside the component, like fetching data, subscribing to events, or updating document title.\n\nDependency array rules:\n- [] empty: runs ONCE after first render (like componentDidMount)\n- [value]: runs after first render AND whenever 'value' changes\n- no array: runs after EVERY render (usually wrong)\n\nAlways clean up in the return function to prevent memory leaks.",
      example: `import { useEffect, useState } from "react";

function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Runs when userId changes
    let isMounted = true;  // Guard against state update after unmount

    fetch(\`/api/users/\${userId}\`)
      .then(res => res.json())
      .then(data => {
        if (isMounted) setUser(data);  // Only update if still mounted
      });

    return () => {
      isMounted = false;  // Cleanup — component is unmounting
    };
  }, [userId]);  // Re-run whenever userId changes

  if (!user) return <p>Loading...</p>;
  return <h1>{user.name}</h1>;
}

// Document title example:
useEffect(() => {
  document.title = \`Cart (\${cartCount} items)\`;
}, [cartCount]);`,
      followups: [
        {
          q: "What is a stale closure problem in useEffect?",
          a: "When useEffect captures a state value at the time it was created, and never sees the updated value because the deps array is empty.\n\nFix: Add the value to deps array so the effect re-runs when it changes. Or use a functional updater (prev => prev + 1) so you don't need the current value at all."
        },
        {
          q: "Why does useEffect run twice in development?",
          a: "React 18 StrictMode intentionally runs effects twice — mount, unmount, mount again — to help you find bugs in your cleanup code. It only happens in DEVELOPMENT. In production, effects run once. If your app breaks when effect runs twice, you are missing cleanup code."
        }
      ]
    },
    {
      level: "Mid",
      question: "What is the difference between useRef and useState?",
      answer: "useState: causes a re-render when the value changes. The value is shown in the UI.\n\nuseRef: does NOT cause a re-render when changed. The value is stored in .current. Same object across all renders.\n\nUse useRef for: DOM elements, timers, intervals, counting renders, any value that changes but doesn't need to appear in the UI.",
      example: `// useRef for DOM access:
function AutoFocusInput() {
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current.focus();  // Access real DOM element
  }, []);

  return <input ref={inputRef} />;
}

// useRef for a value that doesn't trigger re-render:
function VideoPlayer() {
  const intervalRef = useRef(null);

  const start = () => {
    intervalRef.current = setInterval(() => {
      // do something
    }, 1000);
  };

  const stop = () => {
    clearInterval(intervalRef.current);  // Access current value
  };

  return (
    <>
      <button onClick={start}>Start</button>
      <button onClick={stop}>Stop</button>
    </>
  );
}

// Counting renders without causing re-render:
const renderCount = useRef(0);
renderCount.current++;  // Increments but does NOT re-render`,
      followups: [
        {
          q: "Can you store a previous value of state using useRef?",
          a: "Yes! This is a common pattern:\n\nconst prevCount = useRef(count);\nuseEffect(() => { prevCount.current = count; });\n\nNow prevCount.current always holds the value from the PREVIOUS render. Useful for animations, comparing old vs new values."
        }
      ]
    },
    {
      level: "Senior",
      question: "What is useMemo and useCallback? When should you use them?",
      answer: "useMemo: remembers the RESULT of a calculation. Only recalculates when dependencies change.\n\nuseCallback: remembers a FUNCTION. Only creates a new function when dependencies change.\n\nBoth exist to avoid unnecessary work. But they have their own cost (memory + comparison). Only use them when you have measured a real performance problem.",
      example: `// useMemo — expensive calculation:
function ProductList({ products, searchTerm }) {
  // Without useMemo: filters ALL products on every render
  // With useMemo: only re-filters when products or searchTerm changes
  const filtered = useMemo(() => {
    return products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  return filtered.map(p => <Product key={p.id} product={p} />);
}

// useCallback — stable function reference for child component:
function Parent() {
  const [count, setCount] = useState(0);

  // Without useCallback: new function every render → Child re-renders
  // With useCallback: same function reference → Child doesn't re-render
  const handleDelete = useCallback((id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);  // No deps needed — uses functional updater

  return <ChildList onDelete={handleDelete} />;
}

// ❌ Bad: memoizing a simple/cheap component
const SimpleText = React.memo(({ text }) => <p>{text}</p>);
// The memo check itself costs more than just re-rendering <p>!`,
      followups: [
        {
          q: "What is React Compiler (React Forget)?",
          a: "React Compiler is a new tool from the React team that automatically adds useMemo and useCallback for you. You write normal code without thinking about memoization, and the compiler figures out what to optimize. Available in React 19. It means in the future, manually writing useMemo and useCallback may become unnecessary."
        }
      ]
    },
    {
      level: "Senior",
      question: "Explain useReducer. When would you choose it over useState?",
      answer: "useReducer is like useState but for more complex state. Instead of calling setState directly, you 'dispatch' actions with a name. A 'reducer' function handles those actions and returns the new state.\n\nChoose useReducer when:\n- Multiple state values that change together\n- The next state depends on current state in complex ways\n- You want clear action names (easier to debug)\n- State logic is big enough to extract and test separately",
      example: `// Shopping cart with useReducer:
const initialState = { items: [], total: 0 };

function cartReducer(state, action) {
  switch (action.type) {

    case "ADD_ITEM":
      return {
        items: [...state.items, action.item],
        total: state.total + action.item.price
      };

    case "REMOVE_ITEM":
      const removed = state.items.find(i => i.id === action.id);
      return {
        items: state.items.filter(i => i.id !== action.id),
        total: state.total - removed.price
      };

    case "CLEAR_CART":
      return initialState;

    default:
      return state;
  }
}

function Cart() {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  const addItem = (item) => dispatch({ type: "ADD_ITEM", item });
  const removeItem = (id) => dispatch({ type: "REMOVE_ITEM", id });
  const clearCart = () => dispatch({ type: "CLEAR_CART" });

  return (
    <div>
      <p>Total: ₹{state.total}</p>
      {state.items.map(item => (
        <div key={item.id}>
          {item.name}
          <button onClick={() => removeItem(item.id)}>Remove</button>
        </div>
      ))}
    </div>
  );
}`,
      followups: [
        {
          q: "How do you implement undo with useReducer?",
          a: "Wrap your state in { past: [], present: currentState, future: [] }. On every action, push current state to 'past' and update 'present'. On UNDO: pop from past, push present to future, restore past. On REDO: pop from future, push present to past, restore future. Works great for text editors, drawing apps, forms."
        }
      ]
    },
    {
      level: "Senior",
      question: "What are useTransition and useDeferredValue in React 18?",
      answer: "Both let you tell React: 'This update is NOT urgent. Prioritize user interaction first.'\n\nuseTransition: you control a STATE UPDATE and mark it as non-urgent.\nuseDeferredValue: you receive a VALUE (from props or state) and defer its use.\n\nReal problem they solve: typing in a search box that filters 10,000 items. Without these hooks, every keystroke freezes the UI while filtering. With these hooks, the input updates instantly and the list catches up when idle.",
      example: `// useTransition — mark state update as non-urgent:
function SearchPage() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleChange = (e) => {
    setInput(e.target.value);       // URGENT — update input immediately

    startTransition(() => {
      setQuery(e.target.value);     // NON-URGENT — filter the list
    });
  };

  return (
    <>
      <input value={input} onChange={handleChange} />
      {isPending && <span>Loading results...</span>}
      <ResultsList query={query} />  {/* This is the slow part */}
    </>
  );
}

// useDeferredValue — defer a value you receive:
function ResultsList({ query }) {
  // deferredQuery lags behind query intentionally
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(
    () => filterItems(allItems, deferredQuery),
    [deferredQuery]
  );

  return (
    <ul style={{ opacity: query !== deferredQuery ? 0.5 : 1 }}>
      {results.map(item => <li key={item.id}>{item.name}</li>)}
    </ul>
  );
}`,
      followups: [
        {
          q: "What is the difference between useTransition and debouncing?",
          a: "Debouncing DELAYS the update — waits 300ms after user stops typing then fires. useTransition STARTS immediately but tells React this is low priority — React can pause it if the user types again. Debouncing always adds delay. useTransition shows results faster when the user pauses but keeps input responsive when typing fast. Use useTransition for filtering local data; use debounce for API calls."
        }
      ]
    }
  ],

  performance: [
    {
      level: "Mid",
      question: "What is code splitting and how do you do it in React?",
      answer: "Code splitting means breaking your JavaScript into smaller files (chunks) that load only when needed. Instead of sending 1MB of JS to the user upfront, you send 200KB initially and load the rest only when the user navigates to that page.\n\nReact makes this easy with React.lazy() and Suspense.",
      example: `import { lazy, Suspense } from "react";

// Without code splitting:
import Dashboard from "./Dashboard";  // Always loads, even if user never goes there

// With code splitting — loads Dashboard JS only when user visits /dashboard:
const Dashboard = lazy(() => import("./Dashboard"));
const Settings = lazy(() => import("./Settings"));
const Reports = lazy(() => import("./Reports"));

function App() {
  return (
    <Router>
      <Suspense fallback={<div>Loading page...</div>}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

// Real impact: initial bundle 1MB → 200KB
// User loads dashboard page: downloads 300KB more
// User never goes to Reports: never downloads that 200KB`,
      followups: [
        {
          q: "How do you code-split a heavy component (like a PDF viewer or chart library)?",
          a: "Same pattern — lazy import the component and wrap with Suspense:\n\nconst PdfViewer = lazy(() => import('./PdfViewer'));\n\nOnly load the PDF viewer when user clicks 'View PDF'. The PDF library (which might be 500KB) is not downloaded on initial page load."
        }
      ]
    },
    {
      level: "Senior",
      question: "How do you virtualize a long list in React? Why is it needed?",
      answer: "If you render 10,000 items, the browser creates 10,000 DOM nodes. This is slow to render and eats memory. Virtualization means you only render the items visible on screen (maybe 20-30 items at a time). As the user scrolls, you swap items in and out.\n\nLibrary to use: react-window or TanStack Virtual.",
      example: `import { FixedSizeList } from "react-window";

const ITEM_HEIGHT = 50;     // Height of each row in pixels
const LIST_HEIGHT = 500;    // Height of the visible area

// Each row component — MUST be fast:
const Row = ({ index, style, data }) => (
  <div style={style}>          {/* 'style' positions the row */}
    <span>{data[index].name}</span>
    <span>{data[index].email}</span>
  </div>
);

function UserTable({ users }) {
  return (
    <FixedSizeList
      height={LIST_HEIGHT}      // Visible window height
      itemCount={users.length}  // Total items (10,000)
      itemSize={ITEM_HEIGHT}    // Each item height
      itemData={users}          // Passed to Row
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}

// Result:
// Without virtualization: 10,000 DOM nodes — browser struggles
// With virtualization: ~12 DOM nodes at any time — silky smooth`,
      followups: [
        {
          q: "What if your list items have different heights?",
          a: "Use VariableSizeList from react-window. You provide an itemSize function that returns height for each index: itemSize={(index) => heights[index]}. Challenge: you need to know heights upfront. For dynamic content, use TanStack Virtual which measures items automatically after they render."
        }
      ]
    },
    {
      level: "Senior",
      question: "How do you measure and fix performance issues in React? Step by step.",
      answer: "Step 1: Identify the problem — use React DevTools Profiler to record a slow interaction. Look for components that take long to render or render too many times.\n\nStep 2: Find why — the Profiler shows 'why did this render?' (state change, parent re-render, context change).\n\nStep 3: Fix in this order: colocate state → memoize → virtualize → code-split.\n\nStep 4: Measure again to confirm improvement.",
      example: `// Step 1: Add React DevTools Profiler in your component:
import { Profiler } from "react";

<Profiler id="ProductList" onRender={(id, phase, duration) => {
  console.log(\`\${id} took \${duration}ms to render\`);
}}>
  <ProductList />
</Profiler>

// Step 2: Find unnecessary re-renders with why-did-you-render:
// npm install @welldone-software/why-did-you-render

// Step 3: Fix — state colocation first (free, no code change needed):
// ❌ Bad: search state lives in App → ALL children re-render on search
function App() {
  const [search, setSearch] = useState("");
  return <div><SearchBar /><ExpensiveChart /><ProductList /></div>;
}

// ✅ Good: search state lives in SearchBar → only SearchBar re-renders
function SearchBar() {
  const [search, setSearch] = useState("");
  return <input value={search} onChange={e => setSearch(e.target.value)} />;
}

// Step 4: Confirm in Chrome Performance tab:
// Record → interact → stop → look for long tasks (red bars > 50ms)`,
      followups: [
        {
          q: "What is the React DevTools Flamegraph?",
          a: "The flamegraph shows all components that rendered during a recorded interaction. Wider bars = longer render time. Gray = component didn't re-render (memoized or unchanged). You can click any bar to see exactly why that component rendered. It's the most useful tool for finding React performance issues."
        }
      ]
    }
  ],

  memory: [
    {
      level: "Mid",
      question: "What causes memory leaks in React? How do you fix them?",
      answer: "A memory leak means your app uses more and more memory over time because old data is never cleaned up. In React, the most common causes are:\n\n1. setInterval or setTimeout not cleared when component unmounts\n2. Event listeners added to window/document never removed\n3. Subscriptions (WebSocket, pub/sub) never cancelled\n4. Calling setState after the component has unmounted",
      example: `// ❌ LEAKING component — 4 leaks!
function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    // Leak 1: No cleanup — fetch may return after unmount
    fetch("/api/data").then(r => r.json()).then(setData);

    // Leak 2: Interval never cleared
    setInterval(() => setData(fetchLatest()), 5000);

    // Leak 3: Event listener never removed
    window.addEventListener("resize", handleResize);
  }, []);
}

// ✅ FIXED component — all leaks plugged:
function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    // Fix 1: Abort fetch + guard setState
    fetch("/api/data", { signal: controller.signal })
      .then(r => r.json())
      .then(d => { if (mounted) setData(d); })
      .catch(e => { if (e.name !== "AbortError") console.error(e); });

    // Fix 2: Save ID and clear it
    const intervalId = setInterval(() => {
      if (mounted) setData(fetchLatest());
    }, 5000);

    // Fix 3: Save handler reference and remove it
    window.addEventListener("resize", handleResize);

    // Cleanup function — runs on unmount:
    return () => {
      mounted = false;
      controller.abort();
      clearInterval(intervalId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);
}`,
      followups: [
        {
          q: "How do you detect memory leaks in a React app?",
          a: "Chrome DevTools → Memory tab:\n1. Take a heap snapshot before navigating away\n2. Navigate away (component should unmount)\n3. Click the 'garbage collect' button (trash icon)\n4. Take another heap snapshot\n5. Filter by 'Detached' — any detached DOM nodes or components still in memory = leak\n\nAlso watch: Task Manager → Memory column growing every page visit = leak."
        }
      ]
    },
    {
      level: "Senior",
      question: "What is WeakMap and WeakRef? How do they help with memory in React?",
      answer: "WeakMap: stores key-value pairs where the KEY must be an object. When the key object has no other references, it gets garbage collected automatically — the WeakMap entry disappears too.\n\nWeakRef: holds a 'weak' reference to an object. If nothing else is referencing that object, the garbage collector can remove it.\n\nThey are useful when you want to associate data with objects (like DOM nodes) WITHOUT preventing those objects from being cleaned up.",
      example: `// Regular Map — holds strong reference, prevents GC:
const cache = new Map();
cache.set(domNode, { clicks: 0 });
// Even after domNode is removed from DOM,
// Map keeps it alive in memory → LEAK!

// WeakMap — holds weak reference, allows GC:
const cache = new WeakMap();
cache.set(domNode, { clicks: 0 });
// When domNode is removed and no other JS references it,
// WeakMap entry is automatically garbage collected ✅

// Real React use case — component metadata:
const componentData = new WeakMap();

function attachData(element, data) {
  componentData.set(element, data);
  // When element is unmounted and dereferenced,
  // this data is automatically cleaned up
}

// WeakRef — optional reference to large object:
class ImageCache {
  constructor() { this.store = new Map(); }

  set(key, largeImage) {
    this.store.set(key, new WeakRef(largeImage));
  }

  get(key) {
    const ref = this.store.get(key);
    return ref?.deref(); // Returns undefined if image was GC'd
  }
}`,
      followups: [
        {
          q: "What is a detached DOM node?",
          a: "A detached DOM node is a DOM element that has been removed from the page but is still referenced by JavaScript code. It can't be seen by the user, but it uses memory.\n\nCommon cause: you store a ref to a DOM element in a variable outside React. The component unmounts, React removes the DOM — but your variable still holds a reference.\n\nFix: always store DOM refs in useRef (React manages them), and never store them in module-level variables."
        }
      ]
    }
  ],

  modern: [
    {
      level: "Senior",
      question: "What is React Fiber? Explain it simply.",
      answer: "React Fiber is React's internal engine (rewritten in React 16). Before Fiber, React processed the entire component tree in one go — like a phone call you can't pause. If a big tree took 500ms, the user was blocked for 500ms.\n\nFiber broke this work into small units. React can now:\n- Pause work and come back later\n- Prioritize urgent work (user clicks) over non-urgent (background data)\n- Throw away half-done work if something more important comes up\n\nThis is what makes features like useTransition and Suspense possible.",
      example: `// Before Fiber (Stack Reconciler):
// React processes the tree all at once — cannot pause
// User clicks a button? Has to wait for current render to finish

// With Fiber — React can prioritize:
// Priority levels (simplified):
// 1. Synchronous   — input, clicks (must respond immediately)
// 2. User-blocking — animations (within 100ms)
// 3. Normal        — data fetching results
// 4. Low           — analytics, logging
// 5. Idle          — prefetching, non-urgent work

// startTransition tells React: "This is priority 4 — low"
startTransition(() => {
  setSearchResults(filter(allItems, query)); // Can be paused
});

// Clicking a button stays priority 1 — always instant

// Fiber node (what React stores for each component):
// {
//   type: MyComponent,   — what component
//   child: FiberNode,    — first child
//   sibling: FiberNode,  — next sibling
//   return: FiberNode,   — parent
//   memoizedState: ...,  — hook states linked list
// }`,
      followups: [
        {
          q: "What are the two phases of React rendering?",
          a: "Phase 1 — Render Phase (can be paused): React builds the new component tree. Runs your component functions, useMemo. CAN be interrupted and restarted.\n\nPhase 2 — Commit Phase (cannot be paused): React applies all changes to the real DOM at once. Runs useLayoutEffect, then useEffect. Must finish without interruption.\n\nImportant: never do DOM manipulation or API calls in the render phase — it must be pure."
        }
      ]
    },
    {
      level: "Senior",
      question: "What is Suspense in React? How does it work?",
      answer: "Suspense lets you show a loading state while waiting for something (component code, data) to load. You wrap components in <Suspense> and give it a fallback to show while loading.\n\nHow it works: when a component is 'not ready', it throws a Promise. Suspense catches that Promise, shows the fallback, and when the Promise resolves, React tries rendering again.",
      example: `import { Suspense, lazy } from "react";

// Lazy loading with Suspense:
const HeavyChart = lazy(() => import("./HeavyChart"));

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* Show spinner while HeavyChart.js downloads: */}
      <Suspense fallback={<div>Loading chart...</div>}>
        <HeavyChart />
      </Suspense>
    </div>
  );
}

// Nested Suspense boundaries — fine-grained loading:
function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>  {/* Outer — whole page */}
      <Header />
      <Suspense fallback={<ChartSkeleton />}>  {/* Inner — just chart */}
        <ExpensiveChart />
      </Suspense>
      <Suspense fallback={<TableSkeleton />}>  {/* Inner — just table */}
        <DataTable />
      </Suspense>
    </Suspense>
  );
}
// Chart and Table load in PARALLEL — no waterfall!`,
      followups: [
        {
          q: "What are React Server Components?",
          a: "Server Components run ONLY on the server — they never send their JavaScript to the browser. They can directly access databases and files. They cannot use useState, useEffect, or event handlers.\n\nBenefit: zero bundle size impact. A component that imports a 200KB library adds 0KB to the user's download if it's a Server Component.\n\nNext.js App Router uses Server Components by default. Add 'use client' at the top of a file to make it a Client Component."
        }
      ]
    },
    {
      level: "Senior",
      question: "What is an Error Boundary in React?",
      answer: "An Error Boundary is a component that catches JavaScript errors in its children and shows a fallback UI instead of crashing the whole app.\n\nWithout Error Boundaries: one component crashes → entire React tree goes blank.\nWith Error Boundaries: error is contained, only that section shows an error, rest of app works.\n\nLimitation: must be a class component (no functional component equivalent yet). But you can use it to wrap any functional components.",
      example: `import React from "react";

// Error Boundary — class component (required):
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  // Called when a child throws an error:
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  // Called to log the error:
  componentDidCatch(error, info) {
    console.error("Error caught:", error);
    // Send to Sentry, LogRocket, etc.
    logErrorToMonitoring(error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: "red" }}>
          <h2>Something went wrong</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Wrap different sections with their own boundaries:
function App() {
  return (
    <ErrorBoundary>
      <Header />
      <ErrorBoundary>   {/* Only this section shows error if it crashes */}
        <ProductList />
      </ErrorBoundary>
      <ErrorBoundary>
        <Sidebar />
      </ErrorBoundary>
    </ErrorBoundary>
  );
}`,
      followups: [
        {
          q: "What errors does Error Boundary NOT catch?",
          a: "Error Boundaries do NOT catch:\n1. Errors inside event handlers (use try/catch inside onClick)\n2. Async errors (setTimeout, fetch failures — use try/catch + setState)\n3. Server-side rendering errors\n4. Errors in the Error Boundary itself\n\nFor event handler errors: wrap in try/catch and call setState with the error to display it."
        }
      ]
    }
  ],

  patterns: [
    {
      level: "Mid",
      question: "What is a Custom Hook? How do you create one?",
      answer: "A custom hook is a regular JavaScript function that starts with 'use' and can call other hooks inside it. It lets you extract and reuse logic across multiple components.\n\nThink of it as a way to 'package' a piece of behavior that multiple components need. Instead of copying the same useEffect + useState logic into 5 components, you write it once as a custom hook.",
      example: `// Without custom hook — repeated in every component:
function UserProfile() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => { /* fetch logic */ }, []);
  // ...
}

// ✅ Custom hook — write once, use everywhere:
function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    fetch(url, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(\`Error \${res.status}\`);
        return res.json();
      })
      .then(d => { if (mounted) { setData(d); setLoading(false); } })
      .catch(e => { if (e.name !== "AbortError" && mounted) {
        setError(e.message); setLoading(false);
      }});

    return () => { mounted = false; controller.abort(); };
  }, [url]);

  return { data, loading, error };
}

// Use in ANY component — clean and simple:
function UserProfile({ userId }) {
  const { data: user, loading, error } = useFetch(\`/api/users/\${userId}\`);
  if (loading) return <Spinner />;
  if (error) return <Error message={error} />;
  return <h1>{user.name}</h1>;
}`,
      followups: [
        {
          q: "What are the rules for hooks?",
          a: "Two rules:\n1. Only call hooks at the TOP LEVEL — never inside if/else, loops, or nested functions\n2. Only call hooks inside React function components or other custom hooks\n\nReason: React remembers hooks by their ORDER. If you call hooks conditionally, the order changes between renders and React gets confused about which state belongs to which hook."
        }
      ]
    },
    {
      level: "Senior",
      question: "What is the Compound Component pattern?",
      answer: "Compound components work together as a group. The parent manages shared state and shares it through Context. The children are separate components that consume that state. The user (developer) controls how they're arranged.\n\nThink of how HTML <select> and <option> work together — that's the same pattern.",
      example: `import { createContext, useContext, useState } from "react";

const TabsContext = createContext(null);

// Parent — owns the state, provides context:
function Tabs({ children, defaultTab }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div>{children}</div>
    </TabsContext.Provider>
  );
}

// Children — consume context, no prop drilling needed:
function Tab({ id, children }) {
  const { activeTab, setActiveTab } = useContext(TabsContext);
  return (
    <button
      onClick={() => setActiveTab(id)}
      style={{ fontWeight: activeTab === id ? "bold" : "normal" }}
    >
      {children}
    </button>
  );
}

function TabPanel({ id, children }) {
  const { activeTab } = useContext(TabsContext);
  if (activeTab !== id) return null;
  return <div>{children}</div>;
}

// Usage — developer controls the structure:
<Tabs defaultTab="profile">
  <Tab id="profile">Profile</Tab>
  <Tab id="settings">Settings</Tab>
  <Tab id="billing">Billing</Tab>

  <TabPanel id="profile"><ProfileContent /></TabPanel>
  <TabPanel id="settings"><SettingsContent /></TabPanel>
  <TabPanel id="billing"><BillingContent /></TabPanel>
</Tabs>`,
      followups: [
        {
          q: "When would you use a Compound Component vs just passing props?",
          a: "Compound components when: the component has multiple parts that need to share state, the user needs flexibility in how parts are arranged, or there are many optional sub-parts. Examples: Tabs, Modal, Accordion, Dropdown, Form with fields.\n\nSimple props when: the component is self-contained, has few configuration options, and the user doesn't need to control internal layout."
        }
      ]
    }
  ],

  coding: [
    {
      level: "Mid",
      question: "Build a counter component with increment, decrement, and reset buttons.",
      answer: "Simple state management with multiple actions. Shows how to use one state value with multiple update functions. Key thing: always use functional updater (prev => prev + 1) when the new value depends on the old value.",
      example: `import { useState } from "react";

function Counter({ start = 0, min = 0, max = 10 }) {
  const [count, setCount] = useState(start);

  const increment = () => setCount(prev => Math.min(prev + 1, max));
  const decrement = () => setCount(prev => Math.max(prev - 1, min));
  const reset = () => setCount(start);

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <button onClick={decrement} disabled={count === min}>−</button>
      <span style={{ fontSize: 24, minWidth: 40, textAlign: "center" }}>
        {count}
      </span>
      <button onClick={increment} disabled={count === max}>+</button>
      <button onClick={reset} style={{ marginLeft: 8 }}>Reset</button>
    </div>
  );
}

// Usage:
<Counter start={5} min={0} max={20} />

// Follow-up: add step support
const increment = () => setCount(prev => Math.min(prev + step, max));`,
      followups: [
        {
          q: "How would you lift state up if two counters need to share count?",
          a: "Move the useState to the PARENT component. Pass count as a prop and setCount as a callback:\n\nParent:\nconst [count, setCount] = useState(0);\n<Counter count={count} onChange={setCount} />\n<Display count={count} />\n\nChild Counter:\nfunction Counter({ count, onChange }) { /* use count, call onChange */ }"
        }
      ]
    },
    {
      level: "Mid",
      question: "Build a search filter component that filters a list as you type.",
      answer: "Shows controlled input + useMemo for filtering. The key is to make the input feel instant while the filter result is derived from state, not stored separately.",
      example: `import { useState, useMemo } from "react";

const USERS = [
  { id: 1, name: "Raj Sharma", role: "Developer" },
  { id: 2, name: "Priya Singh", role: "Designer" },
  { id: 3, name: "Arjun Patel", role: "Manager" },
  { id: 4, name: "Sneha Gupta", role: "Developer" },
  { id: 5, name: "Vikram Nair", role: "Designer" },
];

function UserSearch() {
  const [search, setSearch] = useState("");

  // useMemo: only re-filters when USERS or search changes
  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return USERS;
    return USERS.filter(u =>
      u.name.toLowerCase().includes(term) ||
      u.role.toLowerCase().includes(term)
    );
  }, [search]);

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name or role..."
        style={{ padding: "8px 12px", width: "100%", marginBottom: 12 }}
      />

      {filtered.length === 0 ? (
        <p>No users found for "{search}"</p>
      ) : (
        <ul>
          {filtered.map(user => (
            <li key={user.id}>
              <strong>{user.name}</strong> — {user.role}
            </li>
          ))}
        </ul>
      )}

      <p>{filtered.length} of {USERS.length} users</p>
    </div>
  );
}`,
      followups: [
        {
          q: "When would you add debounce to this component?",
          a: "If the search was fetching from an API (not filtering local data), you'd add debounce to avoid sending a request on every keystroke.\n\nuseDebounce hook:\nfunction useDebounce(value, delay) {\n  const [debounced, setDebounced] = useState(value);\n  useEffect(() => {\n    const timer = setTimeout(() => setDebounced(value), delay);\n    return () => clearTimeout(timer);\n  }, [value, delay]);\n  return debounced;\n}\n\nconst debouncedSearch = useDebounce(search, 300);\n// Use debouncedSearch to fetch from API"
        }
      ]
    },
    {
      level: "Mid",
      question: "Build a form with validation in React.",
      answer: "Shows how to handle multiple form fields, validate on submit, and show error messages. Uses one state object for all field values and another for errors.",
      example: `import { useState } from "react";

function RegistrationForm() {
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  // Update any field by name:
  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));
    // Clear error for this field as user types:
    setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors = {};
    if (!values.name.trim()) newErrors.name = "Name is required";
    if (!values.email.includes("@")) newErrors.email = "Enter a valid email";
    if (values.password.length < 8)
      newErrors.password = "Password must be at least 8 characters";
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();  // Prevent page reload
    const foundErrors = validate();
    if (Object.keys(foundErrors).length > 0) {
      setErrors(foundErrors);
      return;
    }
    // No errors — submit!
    console.log("Submitting:", values);
    setSubmitted(true);
  };

  if (submitted) return <p>✅ Registration successful!</p>;

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input name="name" placeholder="Full Name"
          value={values.name} onChange={handleChange} />
        {errors.name && <span style={{color:"red"}}>{errors.name}</span>}
      </div>
      <div>
        <input name="email" placeholder="Email"
          value={values.email} onChange={handleChange} />
        {errors.email && <span style={{color:"red"}}>{errors.email}</span>}
      </div>
      <div>
        <input name="password" type="password" placeholder="Password"
          value={values.password} onChange={handleChange} />
        {errors.password && <span style={{color:"red"}}>{errors.password}</span>}
      </div>
      <button type="submit">Register</button>
    </form>
  );
}`,
      followups: [
        {
          q: "Why would you use React Hook Form instead of building your own?",
          a: "React Hook Form uses uncontrolled inputs (refs) instead of controlled inputs (state). This means NO re-render on every keystroke — much better for large forms. It also provides: built-in validation, error messages, dirty/touched states, form submission handling, and easy integration with Zod/Yup for schema validation. For any form with more than 3-4 fields, React Hook Form is worth using."
        }
      ]
    },
    {
      level: "Senior",
      question: "Build a custom useFetch hook that handles loading, error, caching, and cleanup.",
      answer: "This is a complete data fetching hook that handles all real-world concerns. It prevents state updates on unmounted components, caches results to avoid duplicate requests, and handles errors properly.",
      example: `import { useState, useEffect, useRef } from "react";

// Simple in-memory cache (outside hook so it persists across renders):
const cache = new Map();

function useFetch(url) {
  const [state, setState] = useState({
    data: cache.get(url) || null,
    loading: !cache.has(url),
    error: null,
  });

  // Track if component is still mounted:
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!url) return;

    // Already cached — use it, no fetch needed:
    if (cache.has(url)) {
      setState({ data: cache.get(url), loading: false, error: null });
      return;
    }

    const controller = new AbortController();
    setState(prev => ({ ...prev, loading: true, error: null }));

    fetch(url, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
        return res.json();
      })
      .then(data => {
        cache.set(url, data);  // Store in cache
        if (mountedRef.current) {
          setState({ data, loading: false, error: null });
        }
      })
      .catch(err => {
        if (err.name === "AbortError") return;  // Normal — ignore
        if (mountedRef.current) {
          setState({ data: null, loading: false, error: err.message });
        }
      });

    return () => controller.abort();  // Cancel on unmount or url change
  }, [url]);

  // Clear cache for a url (for refresh functionality):
  const refetch = () => {
    cache.delete(url);
    setState({ data: null, loading: true, error: null });
  };

  return { ...state, refetch };
}

// Usage — clean and simple:
function UserCard({ userId }) {
  const { data: user, loading, error, refetch } = useFetch(
    \`/api/users/\${userId}\`
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error} <button onClick={refetch}>Retry</button></div>;
  return <div>{user.name} — {user.email}</div>;
}`,
      followups: [
        {
          q: "What is React Query and why use it instead of a custom hook?",
          a: "React Query (TanStack Query) is a full data fetching library that gives you everything useFetch does PLUS: automatic background refetching, cache invalidation, pagination, optimistic updates, retry on failure, deduplication of identical requests, devtools, and prefetching.\n\nFor small apps: custom useFetch is fine. For real production apps with multiple API calls: React Query saves weeks of work and handles edge cases you haven't thought of yet."
        }
      ]
    },
    {
      level: "Senior",
      question: "Implement an optimistic UI update — like a 'Like' button that feels instant.",
      answer: "Optimistic update means: update the UI immediately as if the action succeeded, then make the API call in the background. If the API fails, roll back the UI to the previous state. This makes the app feel much faster.",
      example: `import { useState } from "react";

function LikeButton({ postId, initialLikes, initialIsLiked }) {
  const [likes, setLikes] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [isLoading, setIsLoading] = useState(false);

  const handleLike = async () => {
    if (isLoading) return;  // Prevent double-click

    // Save current state for rollback:
    const prevLikes = likes;
    const prevIsLiked = isLiked;

    // OPTIMISTIC UPDATE — change UI immediately:
    setIsLiked(!isLiked);
    setLikes(isLiked ? likes - 1 : likes + 1);
    setIsLoading(true);

    try {
      // API call in background:
      await fetch(\`/api/posts/\${postId}/like\`, {
        method: isLiked ? "DELETE" : "POST"
      });
      // Success — optimistic update was correct, nothing to do
    } catch (error) {
      // ROLLBACK — API failed, restore previous state:
      setIsLiked(prevIsLiked);
      setLikes(prevLikes);
      alert("Failed to like. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={isLoading}
      style={{
        color: isLiked ? "red" : "gray",
        opacity: isLoading ? 0.7 : 1,
      }}
    >
      {isLiked ? "❤️" : "🤍"} {likes}
    </button>
  );
}`,
      followups: [
        {
          q: "How does React Query handle optimistic updates?",
          a: "React Query's useMutation has built-in optimistic update support:\nonMutate: runs BEFORE API call — update cache optimistically, return snapshot\nonError: runs if API fails — use snapshot to rollback\nonSettled: runs after success OR error — refetch to sync with server\n\nThis pattern is more reliable than manual state because React Query handles race conditions and cache consistency automatically."
        }
      ]
    },
    {
      level: "Senior",
      question: "Build a custom useDebounce hook and explain how to use it with an API search.",
      answer: "Debounce means: wait until the user STOPS typing for X milliseconds before doing something. Without debounce, a search sends an API request on EVERY keystroke. With debounce, it sends only when the user pauses.",
      example: `import { useState, useEffect } from "react";

// Custom useDebounce hook:
function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set a timer to update the debounced value after 'delay' ms:
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // If value changes before timer fires, cancel and restart:
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Using it in a search component:
function ProductSearch() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // This value only updates after user stops typing for 500ms:
  const debouncedSearch = useDebounce(input, 500);

  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    fetch(\`/api/products?search=\${debouncedSearch}\`)
      .then(res => res.json())
      .then(data => { setResults(data); setLoading(false); })
      .catch(() => setLoading(false));

  }, [debouncedSearch]);  // Only runs when debouncedSearch changes!

  return (
    <div>
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Search products..."
      />
      {loading && <p>Searching...</p>}
      <ul>
        {results.map(p => <li key={p.id}>{p.name}</li>)}
      </ul>
    </div>
  );
}

// Without debounce: user types "react" → 5 API calls (r, re, rea, reac, react)
// With debounce: user types "react" → 1 API call (after pause)`,
      followups: [
        {
          q: "What is the difference between debounce and throttle?",
          a: "Debounce: waits for user to STOP and then fires ONCE. Good for search, form validation.\n\nThrottle: fires at most once every X milliseconds regardless. Good for scroll events, resize events, where you want updates but not too frequently.\n\nExample: Window resize handler — throttle to run every 100ms. Search input — debounce to run 300ms after user stops typing."
        }
      ]
    }
  ]
};

// ─── COMPONENT ─────────────────────────────────────────────────────────────

export default function ReactPrep() {
  const [activeCat, setActiveCat] = useState("js_basics");
  const [openIdx, setOpenIdx] = useState(null);
  const [openFollowups, setOpenFollowups] = useState({});
  const [done, setDone] = useState({});
  const [search, setSearch] = useState("");
  const [timeLeft, setTimeLeft] = useState(null);
  const [tipIdx, setTipIdx] = useState(0);

  const TIPS = [
    "💬 Use simple words — imagine explaining to a friend, not a textbook",
    "📌 Always give a real example from your past projects",
    "⚖️  Mention trade-offs — every choice has pros and cons",
    "❓ Ask clarifying questions before answering system design",
    "🐛 Mention edge cases: empty state, loading, error, unmount",
    "🔢 Use numbers: '300ms debounce', 'reduced renders by 80%'",
    "🎯 STAR format: Situation → Task → Action → Result",
  ];

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const t = new Date(now);
      t.setHours(10, 0, 0, 0);
      if (now >= t) t.setDate(t.getDate() + 1);
      setTimeLeft(Math.max(0, Math.floor((t - now) / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTipIdx(i => (i + 1) % TIPS.length), 4500);
    return () => clearInterval(id);
  }, []);

  const fmtTime = s =>
    `${String(Math.floor(s / 3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  const activeColor = CATEGORIES.find(c => c.id === activeCat)?.color || "#60A5FA";

  const qs = search.trim()
    ? Object.values(DATA).flat().filter(q =>
        q.question.toLowerCase().includes(search.toLowerCase()) ||
        q.answer.toLowerCase().includes(search.toLowerCase()))
    : DATA[activeCat] || [];

  const totalQ = Object.values(DATA).flat().length;
  const doneCount = Object.keys(done).filter(k => done[k]).length;

  const toggleDone = (key, e) => {
    e.stopPropagation();
    setDone(p => ({ ...p, [key]: !p[key] }));
  };

  const toggleFollowup = (key) => {
    setOpenFollowups(p => ({ ...p, [key]: !p[key] }));
  };

  const LEVEL_COLOR = { Basic: "#34D399", Mid: "#60A5FA", Senior: "#F87171" };

  return (
    <div style={{ minHeight:"100vh", background:"#0E1117", color:"#C9D1D9", fontFamily:"'Segoe UI', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:4px; background:#161b22; }
        ::-webkit-scrollbar-thumb { background:#30363d; border-radius:4px; }
        .cat-btn { cursor:pointer; transition:all 0.15s; font-family:inherit; }
        .cat-btn:hover { opacity:0.85; transform:translateY(-1px); }
        .q-card { border:1px solid #21262d; border-radius:12px; overflow:hidden; transition:border-color 0.2s; }
        .q-card:hover { border-color:#30363d; }
        .q-card.open { border-color:var(--cc); }
        .q-header { display:flex; gap:12px; align-items:flex-start; padding:16px 18px; cursor:pointer; background:#161b22; }
        .q-header:hover { background:#1c2128; }
        .section-label { font-size:10px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; margin-bottom:6px; }
        .answer-text { font-size:13.5px; line-height:1.85; color:#8b949e; white-space:pre-wrap; }
        .code-box { background:#0d1117; border:1px solid #21262d; border-radius:8px; padding:14px 16px; font-family:'JetBrains Mono', monospace; font-size:12px; line-height:1.8; color:#79c0ff; overflow-x:auto; white-space:pre; margin:10px 0; }
        .fu-card { background:#161b22; border:1px solid #21262d; border-radius:8px; padding:14px 16px; margin-top:10px; }
        .reveal-btn { background:transparent; border:1px solid #f0883e; color:#f0883e; border-radius:6px; padding:4px 12px; font-size:11px; cursor:pointer; font-family:inherit; margin-top:8px; transition:opacity 0.15s; }
        .reveal-btn:hover { opacity:0.7; }
        .check-btn { width:20px; height:20px; border-radius:4px; border:1.5px solid; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:4px; font-size:10px; font-weight:800; transition:all 0.15s; background:transparent; }
        .badge { display:inline-block; font-size:10px; padding:2px 8px; border-radius:4px; font-weight:700; letter-spacing:0.06em; }
        .tip-fade { animation:fadeIn 0.4s ease; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        input[type=text] { background:#161b22; border:1px solid #30363d; border-radius:8px; padding:10px 14px; color:#C9D1D9; font-family:inherit; font-size:13px; outline:none; }
        input[type=text]:focus { border-color:#388bfd; }
      `}</style>

      {/* TOP BAR */}
      <div style={{ background:"#161b22", borderBottom:"1px solid #21262d", padding:"14px 20px", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ maxWidth:900, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ fontSize:11, color:"#484f58", letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:2, fontFamily:"'Nunito',sans-serif" }}>React JS Interview Prep · 5 Years · Simple English</div>
            <div style={{ fontSize:20, fontWeight:800, color:"#e6edf3", fontFamily:"'Nunito',sans-serif" }}>⚛️ React Interview Prep</div>
          </div>
          <div style={{ display:"flex", gap:24, alignItems:"center" }}>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:10, color:"#484f58", textTransform:"uppercase", letterSpacing:"0.1em" }}>Reviewed</div>
              <div style={{ fontSize:15, fontWeight:700, color:"#3fb950" }}>{doneCount}/{totalQ}</div>
              <div style={{ height:3, width:80, background:"#21262d", borderRadius:2, marginTop:3 }}>
                <div style={{ height:"100%", width:`${(doneCount/totalQ)*100}%`, background:"linear-gradient(90deg,#3fb950,#58a6ff)", borderRadius:2, transition:"width 0.4s" }} />
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:10, color:"#484f58", textTransform:"uppercase", letterSpacing:"0.1em" }}>Interview In</div>
              <div style={{ fontSize:18, fontWeight:800, color:"#58a6ff", fontFamily:"'JetBrains Mono',monospace" }}>
                {timeLeft !== null ? fmtTime(timeLeft) : "--:--:--"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:900, margin:"0 auto", padding:"20px 16px" }}>

        {/* TIP */}
        <div key={tipIdx} className="tip-fade" style={{ background:"#161b22", border:"1px solid #21262d", borderRadius:8, padding:"10px 16px", marginBottom:16, fontSize:12.5, color:"#6e7681", fontFamily:"'Nunito',sans-serif" }}>
          {TIPS[tipIdx]}
        </div>

        {/* SEARCH */}
        <input type="text" placeholder="🔍  Search any topic..." value={search} onChange={e=>setSearch(e.target.value)} style={{ width:"100%", marginBottom:16 }} />

        {/* CATEGORY TABS */}
        {!search && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:20 }}>
            {CATEGORIES.map(cat => {
              const catDone = Object.keys(done).filter(k => k.startsWith(cat.id) && done[k]).length;
              const catTotal = DATA[cat.id]?.length || 0;
              const isActive = activeCat === cat.id;
              return (
                <button key={cat.id} className="cat-btn"
                  onClick={() => { setActiveCat(cat.id); setOpenIdx(null); }}
                  style={{ background: isActive ? `${cat.color}18` : "#161b22", border:`1px solid ${isActive ? cat.color : "#21262d"}`, color: isActive ? cat.color : "#6e7681", padding:"7px 14px", borderRadius:8, fontSize:12.5, fontWeight:600, fontFamily:"'Nunito',sans-serif", display:"flex", alignItems:"center", gap:6 }}>
                  {cat.icon} {cat.label}
                  <span style={{ fontSize:10, background:"#0d1117", borderRadius:4, padding:"1px 5px", color: catDone===catTotal ? "#3fb950" : "#484f58" }}>
                    {catDone}/{catTotal}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* QUESTIONS */}
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {qs.map((item, idx) => {
            const key = search ? `s${idx}` : `${activeCat}-${idx}`;
            const isOpen = openIdx === key;
            const isDone = done[key];
            const cc = search ? "#58a6ff" : activeColor;

            return (
              <div key={key} className={`q-card ${isOpen?"open":""}`} style={{ "--cc":cc, opacity: isDone ? 0.55 : 1 }}>

                {/* QUESTION HEADER */}
                <div className="q-header" onClick={() => setOpenIdx(isOpen ? null : key)}>
                  <button className="check-btn"
                    style={{ borderColor: isDone ? cc : "#30363d", background: isDone ? cc : "transparent", color: isDone?"#0d1117":"transparent" }}
                    onClick={e => toggleDone(key, e)}>✓</button>

                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:6 }}>
                      <span className="badge" style={{ background:`${LEVEL_COLOR[item.level]}18`, color:LEVEL_COLOR[item.level] }}>{item.level}</span>
                      {item.followups?.length > 0 && (
                        <span className="badge" style={{ background:"#f0883e18", color:"#f0883e" }}>
                          {item.followups.length} follow-up{item.followups.length>1?"s":""}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize:14.5, fontWeight:700, color: isDone?"#484f58":"#e6edf3", fontFamily:"'Nunito',sans-serif", lineHeight:1.5 }}>
                      {item.question}
                    </p>
                  </div>
                  <span style={{ color:"#30363d", fontSize:13, flexShrink:0, marginTop:4 }}>{isOpen?"▲":"▼"}</span>
                </div>

                {/* BODY */}
                {isOpen && (
                  <div style={{ background:"#0d1117", padding:"18px 20px", borderTop:`1px solid #21262d` }}>

                    {/* ANSWER */}
                    <div className="section-label" style={{ color:"#58a6ff" }}>📝 Answer</div>
                    <p className="answer-text">{item.answer}</p>

                    {/* EXAMPLE */}
                    {item.example && (
                      <div style={{ marginTop:14 }}>
                        <div className="section-label" style={{ color:"#3fb950" }}>💡 Example</div>
                        <div className="code-box">{item.example}</div>
                      </div>
                    )}

                    {/* FOLLOW-UPS */}
                    {item.followups?.length > 0 && (
                      <div style={{ marginTop:14 }}>
                        <div className="section-label" style={{ color:"#f0883e" }}>⚡ Follow-up Questions</div>
                        {item.followups.map((fu, fi) => {
                          const fuKey = `${key}-fu${fi}`;
                          return (
                            <div key={fi} className="fu-card">
                              <p style={{ fontSize:13.5, fontWeight:700, color:"#e6edf3", fontFamily:"'Nunito',sans-serif" }}>
                                Q: {fu.q}
                              </p>
                              <button className="reveal-btn" onClick={() => toggleFollowup(fuKey)}>
                                {openFollowups[fuKey] ? "▲ Hide Answer" : "▼ Show Answer"}
                              </button>
                              {openFollowups[fuKey] && (
                                <p style={{ marginTop:10, fontSize:12.5, color:"#8b949e", lineHeight:1.8, whiteSpace:"pre-wrap" }}>
                                  A: {fu.a}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })}

          {qs.length === 0 && (
            <div style={{ textAlign:"center", padding:"50px 20px", color:"#30363d", fontSize:15, fontFamily:"'Nunito',sans-serif" }}>
              No results for "{search}"
            </div>
          )}
        </div>

        {/* TOPICS COVERED */}
        {!search && (
          <div style={{ marginTop:28, background:"#161b22", border:"1px solid #21262d", borderRadius:12, padding:"18px 20px" }}>
            <div style={{ fontSize:10, color:"#484f58", letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:12, fontFamily:"'Nunito',sans-serif", fontWeight:700 }}>
              ✅ All Topics Covered
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px,1fr))", gap:6 }}>
              {[
                "Closures & Stale Closures","Event Loop & Microtasks","var / let / const & Hoisting",
                "Promise.all / allSettled / race","== vs === vs Object.is","Props vs State",
                "Virtual DOM & Diffing","Reconciliation & Keys","Controlled vs Uncontrolled",
                "When components re-render","useState deep dive","useEffect & dependency array",
                "useRef vs useState","useMemo & useCallback","useReducer pattern",
                "useTransition & useDeferredValue","Custom Hooks","Code Splitting & lazy()",
                "Virtualization (10k items)","Profiling & Performance","Memory Leaks & Cleanup",
                "WeakMap & WeakRef","React Fiber explained simply","Suspense & lazy loading",
                "Error Boundaries","React Server Components","Compound Components",
                "Optimistic UI Updates","useDebounce custom hook","Form with validation",
              ].map(t => (
                <div key={t} style={{ fontSize:12, color:"#3fb950", fontFamily:"'Nunito',sans-serif" }}>✓ {t}</div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop:20, textAlign:"center", fontSize:12, color:"#21262d", fontFamily:"'Nunito',sans-serif" }}>
          YOU GOT THIS 💪 — {totalQ} QUESTIONS · {CATEGORIES.length} TOPICS · SIMPLE ENGLISH
        </div>
      </div>
    </div>
  );
}
