import { signUp } from "../actions";
import { AuthCard } from "../auth-card";

export const metadata = { title: "Sign up — Marginalia" };

export default async function SignupPage(props: PageProps<"/signup">) {
  const { error } = await props.searchParams;

  return (
    <AuthCard
      title="Sign up"
      description="Create your Marginalia account."
      submitLabel="Create account"
      action={signUp}
      error={typeof error === "string" ? error : undefined}
      footer={{
        prompt: "Already have an account?",
        linkLabel: "Log in",
        href: "/login",
      }}
    />
  );
}
