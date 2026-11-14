import { NextRequest, NextResponse } from "next/server";
import { auth0, hasAdminPermission } from "./lib/auth";

export async function proxy(request: NextRequest) {
  const authResponse = await auth0.middleware(request);
  const url = new URL(request.url);

  if (url.pathname !== "/admin" && !url.pathname.startsWith("/admin/")) {
    return authResponse;
  }

  const session = await auth0.getSession(request);
  if (!session) {
    return NextResponse.redirect(
      new URL(`/auth/login?returnTo=${encodeURIComponent(url.pathname)}`, url)
    );
  }

  if (!await hasAdminPermission(request, authResponse)) {
    return new Response("Forbidden", { status: 403 });
  }

  return authResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
