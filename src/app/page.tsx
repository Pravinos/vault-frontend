import { redirect } from "next/navigation";

// Let middleware handle all auth routing — do not redirect here
export default function Home() {
  return null;
}