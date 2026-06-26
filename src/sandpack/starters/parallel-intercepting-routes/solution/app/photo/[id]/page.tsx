// app/photo/[id]/page.tsx — Canonical full-page route (deep-linkable).
export default async function PhotoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main>
      <h1>Photo #{id}</h1>
      <img src={`/photos/${id}.jpg`} alt="" />
    </main>
  );
}
