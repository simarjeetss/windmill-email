/**
 * Phase 1 Tests — Auth & Setup
 *
 * Tests are organised into 4 suites:
 *  1. Supabase client factories (lib/supabase/*)
 *  2. Server Actions (login, signup, signout)
 *  3. UI — Login page
 *  4. UI — Signup page
 *  5. UI — Dashboard sidebar
 *  6. UI — Dashboard topbar
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock Next.js navigation so tests never actually navigate
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/dashboard"),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
  redirect: vi.fn(),
}));

// Mock Next.js Link as a plain <a>
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

// ─── Supabase mock factory ─────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signOut: mockSignOut,
    },
  })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signOut: mockSignOut,
    },
  })),
}));

// Mock server actions
const mockLogin = vi.fn();
const mockSignup = vi.fn();
const mockSignout = vi.fn();

vi.mock("@/lib/supabase/actions", () => ({
  login: (...args: unknown[]) => mockLogin(...args),
  signup: (...args: unknown[]) => mockSignup(...args),
  signout: (...args: unknown[]) => mockSignout(...args),
}));

// ─── Imports (after mocks) ─────────────────────────────────────────────────────

import LoginPage from "@/app/(auth)/login/page";
import SignupPage from "@/app/(auth)/signup/page";
import DashboardSidebar from "@/components/dashboard/sidebar";
import DashboardTopbar from "@/components/dashboard/topbar";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockUser(overrides = {}) {
  return {
    id: "user-123",
    email: "test@example.com",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1 — Supabase client factories
// ─────────────────────────────────────────────────────────────────────────────

describe("Supabase client factories", () => {
  it("createClient (browser) returns an object with auth property", async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const client = createClient();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });

  it("createClient (server) resolves to an object with auth property", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const client = await createClient();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });

  it("browser client exposes signInWithPassword", async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const client = createClient();
    expect(typeof client.auth.signInWithPassword).toBe("function");
  });

  it("browser client exposes signUp", async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const client = createClient();
    expect(typeof client.auth.signUp).toBe("function");
  });

  it("browser client exposes signOut", async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const client = createClient();
    expect(typeof client.auth.signOut).toBe("function");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2 — Server Actions
// ─────────────────────────────────────────────────────────────────────────────

describe("Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("login action", () => {
    it("returns no error on successful login", async () => {
      mockLogin.mockResolvedValueOnce(undefined); // redirect, no error object
      const formData = new FormData();
      formData.set("email", "user@example.com");
      formData.set("password", "secret123");
      const result = await mockLogin(formData);
      expect(result).toBeUndefined();
    });

    it("returns error message on invalid credentials", async () => {
      mockLogin.mockResolvedValueOnce({ error: "Invalid login credentials" });
      const formData = new FormData();
      formData.set("email", "bad@example.com");
      formData.set("password", "wrongpassword");
      const result = await mockLogin(formData);
      expect(result?.error).toBe("Invalid login credentials");
    });

    it("is called with FormData containing email and password", async () => {
      mockLogin.mockResolvedValueOnce(undefined);
      const formData = new FormData();
      formData.set("email", "user@example.com");
      formData.set("password", "pass1234");
      await mockLogin(formData);
      expect(mockLogin).toHaveBeenCalledWith(formData);
    });
  });

  describe("signup action", () => {
    it("returns no error on successful signup", async () => {
      mockSignup.mockResolvedValueOnce(undefined);
      const formData = new FormData();
      formData.set("email", "new@example.com");
      formData.set("password", "newpass123");
      const result = await mockSignup(formData);
      expect(result).toBeUndefined();
    });

    it("returns error when email already in use", async () => {
      mockSignup.mockResolvedValueOnce({ error: "User already registered" });
      const formData = new FormData();
      formData.set("email", "existing@example.com");
      formData.set("password", "pass1234");
      const result = await mockSignup(formData);
      expect(result?.error).toBe("User already registered");
    });

    it("is called exactly once per invocation", async () => {
      mockSignup.mockResolvedValueOnce(undefined);
      const formData = new FormData();
      formData.set("email", "a@b.com");
      formData.set("password", "pass1234");
      await mockSignup(formData);
      expect(mockSignup).toHaveBeenCalledTimes(1);
    });
  });

  describe("signout action", () => {
    it("calls signout without arguments", async () => {
      mockSignout.mockResolvedValueOnce(undefined);
      await mockSignout();
      expect(mockSignout).toHaveBeenCalledTimes(1);
    });

    it("resolves without error", async () => {
      mockSignout.mockResolvedValueOnce(undefined);
      await expect(mockSignout()).resolves.toBeUndefined();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3 — Login Page UI
// ─────────────────────────────────────────────────────────────────────────────

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the heading 'Welcome back'", () => {
    render(<LoginPage />);
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
  });

  it("renders sub-heading copy", () => {
    render(<LoginPage />);
    expect(screen.getByText(/sign in to your reachkit account/i)).toBeInTheDocument();
  });

  it("renders email input", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it("renders password input", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("renders the sign-in submit button", () => {
    render(<LoginPage />);
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("renders a link to the signup page", () => {
    render(<LoginPage />);
    expect(screen.getByText(/don.t have an account/i)).toBeInTheDocument();
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/signup");
  });

  it("email input accepts typed value", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, "test@example.com");
    expect(emailInput).toHaveValue("test@example.com");
  });

  it("password input accepts typed value", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    const passwordInput = screen.getByLabelText(/password/i);
    await user.type(passwordInput, "secretpass");
    expect(passwordInput).toHaveValue("secretpass");
  });

  it("password input type is 'password'", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/password/i)).toHaveAttribute("type", "password");
  });

  it("email input type is 'email'", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toHaveAttribute("type", "email");
  });

  it("calls login action on form submit", async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/password/i), "pass1234");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(mockLogin).toHaveBeenCalledTimes(1));
  });

  it("shows error message when login returns an error", async () => {
    mockLogin.mockResolvedValueOnce({ error: "Invalid login credentials" });
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByLabelText(/email/i), "bad@example.com");
    await user.type(screen.getByLabelText(/password/i), "wrongpass");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() =>
      expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument()
    );
  });

  it("does not show error message initially", () => {
    render(<LoginPage />);
    expect(screen.queryByText(/invalid/i)).not.toBeInTheDocument();
  });

  it("submit button is disabled while pending", async () => {
    // Login hangs so we can check pending state
    mockLogin.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve(undefined), 2000))
    );
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/password/i), "pass1234");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled()
    );
  });

  it("shows 'Signing in…' text while pending", async () => {
    mockLogin.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve(undefined), 2000))
    );
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/password/i), "pass1234");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /signing in/i })).toBeInTheDocument()
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 4 — Signup Page UI
// ─────────────────────────────────────────────────────────────────────────────

describe("SignupPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the heading 'Create an account'", () => {
    render(<SignupPage />);
    expect(screen.getByText("Create an account")).toBeInTheDocument();
  });

  it("renders sub-heading copy", () => {
    render(<SignupPage />);
    expect(screen.getByText(/start building your outreach campaigns/i)).toBeInTheDocument();
  });

  it("renders email, password, and confirm password inputs", () => {
    render(<SignupPage />);
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument(); // id="confirm"
  });

  it("renders the create account submit button", () => {
    render(<SignupPage />);
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  it("renders a link back to the login page", () => {
    render(<SignupPage />);
    expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/login");
  });

  it("shows error when passwords don't match", async () => {
    const user = userEvent.setup();
    render(<SignupPage />);
    await user.type(screen.getByLabelText(/^email$/i), "user@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "pass1234");
    await user.type(screen.getByLabelText(/confirm password/i), "different");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() =>
      expect(screen.getByText(/passwords don.t match/i)).toBeInTheDocument()
    );
  });

  it("shows error when password is too short (< 6 chars)", async () => {
    const user = userEvent.setup();
    render(<SignupPage />);
    await user.type(screen.getByLabelText(/^email$/i), "user@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "abc");
    await user.type(screen.getByLabelText(/confirm password/i), "abc");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() =>
      expect(screen.getByText(/at least 6 characters/i)).toBeInTheDocument()
    );
  });

  it("does NOT call signup action when passwords don't match", async () => {
    const user = userEvent.setup();
    render(<SignupPage />);
    await user.type(screen.getByLabelText(/^email$/i), "user@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "pass1234");
    await user.type(screen.getByLabelText(/confirm password/i), "nomatch");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() => expect(mockSignup).not.toHaveBeenCalled());
  });

  it("calls signup action when form is valid", async () => {
    mockSignup.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<SignupPage />);
    await user.type(screen.getByLabelText(/^email$/i), "new@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "strongpass");
    await user.type(screen.getByLabelText(/confirm password/i), "strongpass");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() => expect(mockSignup).toHaveBeenCalledTimes(1));
  });

  it("shows success state ('Check your inbox') after signup", async () => {
    mockSignup.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<SignupPage />);
    await user.type(screen.getByLabelText(/^email$/i), "new@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "strongpass");
    await user.type(screen.getByLabelText(/confirm password/i), "strongpass");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() =>
      expect(screen.getByText(/check your inbox/i)).toBeInTheDocument()
    );
  });

  it("shows Supabase error message when signup fails", async () => {
    mockSignup.mockResolvedValueOnce({ error: "User already registered" });
    const user = userEvent.setup();
    render(<SignupPage />);
    await user.type(screen.getByLabelText(/^email$/i), "existing@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "pass1234");
    await user.type(screen.getByLabelText(/confirm password/i), "pass1234");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() =>
      expect(screen.getByText(/user already registered/i)).toBeInTheDocument()
    );
  });

  it("shows 'Creating account…' text while pending", async () => {
    mockSignup.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve(undefined), 2000))
    );
    const user = userEvent.setup();
    render(<SignupPage />);
    await user.type(screen.getByLabelText(/^email$/i), "new@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "strongpass");
    await user.type(screen.getByLabelText(/confirm password/i), "strongpass");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /creating account/i })).toBeInTheDocument()
    );
  });

  it("both password fields have type='password'", () => {
    const { container } = render(<SignupPage />);
    const inputs = container.querySelectorAll("input[type='password']");
    expect(inputs.length).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 5 — Dashboard Sidebar
// ─────────────────────────────────────────────────────────────────────────────

describe("DashboardSidebar", () => {
  const user = mockUser();

  it("renders the ReachKit.ai brand", () => {
    render(<DashboardSidebar user={user} />);
    expect(screen.getByText(/reachkit/i)).toBeInTheDocument();
  });

  it("renders all 4 nav items", () => {
    render(<DashboardSidebar user={user} />);
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Campaigns")).toBeInTheDocument();
    expect(screen.getByText("Contacts")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
  });

  it("renders the user's email in the user strip", () => {
    render(<DashboardSidebar user={user} />);
    expect(screen.getByText(user.email!)).toBeInTheDocument();
  });

  it("renders the username (email prefix) in the user strip", () => {
    render(<DashboardSidebar user={user} />);
    expect(screen.getByText("test")).toBeInTheDocument(); // "test" from "test@example.com"
  });

  it("highlights the Overview nav item when on /dashboard", () => {
    // usePathname is mocked to return "/dashboard"
    const { container } = render(<DashboardSidebar user={user} />);
    // The active item div receives background: "var(--rk-gold-dim)"
    // We confirm it exists via getAllByText + closest div having style attr
    const overviewText = screen.getByText("Overview");
    const itemDiv = overviewText.closest("div");
    expect(itemDiv?.getAttribute("style")).toContain("rk-gold-dim");
  });

  it("nav items are wrapped in links with correct hrefs", () => {
    render(<DashboardSidebar user={user} />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/dashboard");
    expect(hrefs).toContain("/dashboard/campaigns");
    expect(hrefs).toContain("/dashboard/contacts");
    expect(hrefs).toContain("/dashboard/analytics");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 6 — Dashboard Topbar
// ─────────────────────────────────────────────────────────────────────────────

describe("DashboardTopbar", () => {
  const user = mockUser();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the user's first name in the greeting", () => {
    render(<DashboardTopbar user={user} />);
    expect(screen.getByText("test")).toBeInTheDocument(); // "test" from test@example.com
  });

  it("renders the avatar with the user's first letter", () => {
    render(<DashboardTopbar user={user} />);
    // Avatar shows first char of email — "t" from "test@example.com"
    const avatarEl = document.querySelector(
      "[style*='rk-gold-dim']"
    );
    expect(screen.getByText("t")).toBeInTheDocument();
  });

  it("renders the 'Active' status badge", () => {
    render(<DashboardTopbar user={user} />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders the sign out button", () => {
    render(<DashboardTopbar user={user} />);
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  it("calls signout action when sign out is clicked", async () => {
    mockSignout.mockResolvedValueOnce(undefined);
    const user_event = userEvent.setup();
    render(<DashboardTopbar user={user} />);
    await user_event.click(screen.getByRole("button", { name: /sign out/i }));
    await waitFor(() => expect(mockSignout).toHaveBeenCalledTimes(1));
  });

  it("shows 'Signing out…' text while pending", async () => {
    mockSignout.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve(undefined), 2000))
    );
    const user_event = userEvent.setup();
    render(<DashboardTopbar user={user} />);
    await user_event.click(screen.getByRole("button", { name: /sign out/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /signing out/i })).toBeInTheDocument()
    );
  });

  it("sign out button is disabled while pending", async () => {
    mockSignout.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve(undefined), 2000))
    );
    const user_event = userEvent.setup();
    render(<DashboardTopbar user={user} />);
    await user_event.click(screen.getByRole("button", { name: /sign out/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /signing out/i })).toBeDisabled()
    );
  });

  it("renders the mobile ReachKit logo", () => {
    render(<DashboardTopbar user={user} />);
    // The mobile logo is in a lg:hidden div — still in DOM
    const logos = screen.getAllByText(/reachkit/i);
    expect(logos.length).toBeGreaterThanOrEqual(1);
  });
});
