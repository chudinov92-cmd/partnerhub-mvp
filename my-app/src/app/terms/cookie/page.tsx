import { redirect } from "next/navigation";

export default function CookiePolicyRedirect() {
  redirect("/terms/cookies");
}
