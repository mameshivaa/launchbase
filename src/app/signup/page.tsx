import { SignUpForm } from "@/components/auth/signup-form";

export default function SignUpPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Sign up</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Create an account with email and password. A profile row is created
          automatically by the database trigger.
        </p>
      </div>
      <SignUpForm />
    </main>
  );
}
