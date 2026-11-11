export function demoOnly(): Response | null {
  if (process.env.NODE_ENV === "development") return null;

  return Response.json(
    { error: "Demo endpoint disabled" },
    { status: 501 }
  );
}