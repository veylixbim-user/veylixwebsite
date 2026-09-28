import { notFound } from "next/navigation";

/** Routes every unknown path under a locale to the localized not-found boundary. */
export default function CatchAll() {
  notFound();
}
