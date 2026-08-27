import { redirect } from "next/navigation";

// Root redirects to admin; guest traffic enters via /s/{token} only.
export default function RootPage() {
  redirect("/admin");
}
