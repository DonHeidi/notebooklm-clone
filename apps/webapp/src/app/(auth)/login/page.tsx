import { logIn } from "../actions";
import { AuthCard } from "../auth-card";

export const metadata = { title: "Log in — Marginalia" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { error } = await props.searchParams;

  return (
    <AuthCard
      title="Log in"
      description="Welcome back to Marginalia."
      submitLabel="Log in"
      action={logIn}
      error={typeof error === "string" ? error : undefined}
      footer={{
        prompt: "No account yet?",
        linkLabel: "Sign up",
        href: "/signup",
      }}
    />
  );
}
