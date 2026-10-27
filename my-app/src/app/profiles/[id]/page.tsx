import { redirect } from "next/navigation";
import { buildProfileMapSharePath } from "@my-startup/chat";

type PageProps = {
  params: Promise<{ id: string }>;
};

/** Legacy URL: /profiles/{id} → попап профиля на карте. */
export default async function PublicProfileRedirectPage({ params }: PageProps) {
  const { id } = await params;
  redirect(buildProfileMapSharePath(id));
}
