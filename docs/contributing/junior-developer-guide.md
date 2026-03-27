# Junior Developer Guide

Welcome! This guide is designed to help junior developers understand and contribute to the Peer Care Connect codebase.

## 🎯 Getting Started

### Your First Day

1. **Read the README** - Start with the main [README.md](../../README.md)
2. **Set up your environment** - Follow [Development Setup](../getting-started/development-setup.md)
3. **Explore the codebase** - Start with simple components (see below)
4. **Ask questions** - Don't hesitate to ask for help!

### Customer mobile (Expo + customer docs)

If your work is the **client or guest** experience on **mobile**, or parity with customer flows on web, read this first:

- **[Theramate mobile app README](../../theramate-ios-client/README.md)**
- **[Mobile / web full inventory](../product/MOBILE_WEB_FULL_SCREEN_INVENTORY.md)**

The component suggestions below focus on the **web** app (`peer-care-connect`).

### Where to Start Reading Code

**Easy Components (Start Here):**

- `src/components/ui/button.tsx` - Simple UI component
- `src/lib/validation.ts` - Clear validation logic
- `src/lib/file-path-sanitizer.ts` - Well-documented utility

**Medium Complexity:**

- `src/services/bookingService.ts` - Service layer with good structure
- `src/lib/credits.ts` - Business logic (well-documented)

**Advanced (Read Later):**

- `src/lib/treatment-exchange.ts` - Complex business logic
- `src/components/marketplace/BookingFlow.tsx` - Large component

## 📚 Understanding the Codebase

### Project Structure

```
peer-care-connect/
├── src/
│   ├── components/     # React components (UI)
│   ├── lib/           # Business logic & utilities
│   ├── services/      # API services
│   ├── pages/         # Page components
│   └── contexts/      # React contexts (state)
```

### Key Concepts

#### 1. Components (UI)

Components are in `src/components/`. They handle:

- Displaying data
- User interactions
- UI state

**Example:**

```typescript
// Simple component
export const Button = ({ onClick, children }) => {
  return <button onClick={onClick}>{children}</button>;
};
```

#### 2. Services (Business Logic)

Services are in `src/lib/` or `src/services/`. They handle:

- API calls
- Data processing
- Business rules

**Example:**

```typescript
// Service function
export async function getCreditBalance(userId: string): Promise<number> {
  // Makes API call, processes data, returns result
}
```

#### 3. Types (Data Structures)

TypeScript types define data shapes:

```typescript
// Type definition
interface User {
  id: string;
  name: string;
  email: string;
}
```

## 🔍 Reading Code Effectively

### Step 1: Start with the File Header

Look for:

- File purpose
- Main exports
- Key functions

### Step 2: Read Type Definitions

Understand the data structures:

```typescript
interface BookingData {
  session_date: string;
  start_time: string;
  duration_minutes: number;
}
```

### Step 3: Follow the Flow

1. Find the entry point (exported function)
2. Trace through the logic
3. Understand what each step does

### Step 4: Look for Comments

- JSDoc comments explain "what"
- Inline comments explain "why"

## 🛠️ Common Patterns

### Pattern 1: API Call

```typescript
// 1. Call Supabase
const { data, error } = await supabase
  .from("table_name")
  .select("*")
  .eq("id", userId);

// 2. Handle errors
if (error) {
  console.error("Error:", error);
  return null;
}

// 3. Return data
return data;
```

### Pattern 2: React Component with State

```typescript
export const MyComponent = () => {
  // 1. State
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // 2. Effects
  useEffect(() => {
    loadData();
  }, []);

  // 3. Functions
  const loadData = async () => {
    setLoading(true);
    // ... fetch data
    setLoading(false);
  };

  // 4. Render
  return <div>{/* UI */}</div>;
};
```

### Pattern 3: Validation

```typescript
// Using Zod for validation
const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

const result = schema.safeParse(data);
if (!result.success) {
  // Handle validation errors
}
```

## 📖 Domain Terms Glossary

### HEP

**Home Exercise Program** - Exercises prescribed to clients

### SOAP Notes

**Subjective, Objective, Assessment, Plan** - Clinical documentation format

### RLS

**Row Level Security** - Database security feature (Supabase)

### RPC

**Remote Procedure Call** - Database function call

### Edge Function

**Supabase Edge Function** - Serverless function (like API endpoint)

## 🐛 Common Tasks for Juniors

### Task 1: Fix a Simple Bug

1. Read the bug report
2. Find the relevant file
3. Understand the code
4. Make the fix
5. Test it
6. Submit PR

### Task 2: Add a New Field

1. Find the relevant component/service
2. Add field to type definition
3. Update form/display
4. Update validation
5. Test

### Task 3: Improve Documentation

1. Find function without JSDoc
2. Add JSDoc comment
3. Add inline comments if needed
4. Submit PR

## ❓ When to Ask for Help

**Ask for help when:**

- You've been stuck for >30 minutes
- You don't understand the business logic
- You're unsure about the approach
- You need clarification on requirements

**Before asking:**

- Read the code carefully
- Check documentation
- Try to understand the context
- Formulate a specific question

## 📝 Code Review Tips

### Before Submitting PR

- [ ] Code follows project style
- [ ] Added tests if needed
- [ ] Updated documentation
- [ ] Tested locally
- [ ] No console errors

### During Review

- Read feedback carefully
- Ask questions if unclear
- Make requested changes
- Learn from suggestions

## 🎓 Learning Resources

### Internal

- **[Feature Index](./junior-dev-feature-index.md)** – One-page map of feature docs (Diary, Dashboard, Client Management, Services, Treatment Exchange, Notifications, Messaging, Profile)
- [Architecture Overview](../architecture/system-overview.md)
- [Database Schema](../architecture/database-schema.md) – Core tables and relationships
- [API Documentation](../api/rest-api.md)
- [Testing Guide](../testing/testing-guide.md)

### External

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Supabase Docs](https://supabase.com/docs)

## 🚀 Your First Contribution

### Recommended First Tasks

1. **Add JSDoc comments** to undocumented functions
2. **Fix simple bugs** (typos, small UI issues)
3. **Improve error messages** (make them clearer)
4. **Add code examples** to documentation
5. **Write tests** for untested functions

### How to Find Tasks

- Look for `TODO` comments
- Check GitHub issues labeled "good first issue"
- Ask your mentor for suggestions

## 💡 Tips for Success

1. **Start small** - Don't try to understand everything at once
2. **Read code daily** - Familiarity comes with practice
3. **Ask questions** - Better to ask than guess
4. **Take notes** - Document what you learn
5. **Pair program** - Learn from others
6. **Review PRs** - Learn from code reviews

## 🆘 Getting Help

- **Slack/Discord** - Quick questions
- **GitHub Discussions** - Technical questions
- **Code Review** - Code-specific questions
- **Documentation** - Reference material

---

**Remember:** Every senior developer was once a junior. Don't be afraid to ask questions or make mistakes. That's how we learn! 🎉

**Last Updated:** 2025-02-09
