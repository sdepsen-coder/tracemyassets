import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

/**
 * /.well-known/security.txt (RFC 9116): where to report a security problem.
 * "Expires" is required and must be under a year away, so it is set to six
 * months after the build; every deploy renews it. Without a contact address
 * there is nothing to publish.
 */
export function GET() {
  if (!CONTACT_EMAIL) {
    return new Response("Not found", { status: 404 });
  }

  const expires = new Date(Date.now() + 182 * 24 * 60 * 60 * 1000);
  const body = [
    `Contact: mailto:${CONTACT_EMAIL}`,
    `Expires: ${expires.toISOString()}`,
    "Preferred-Languages: en",
    `Canonical: ${SITE_URL}/.well-known/security.txt`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
