// app/@modal/(.)photo/[id]/page.tsx — Intercepted route that renders as a modal.
import Link from "next/link";

export default async function PhotoModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="modal-backdrop">
      <dialog open>
        <img src={`/photos/${id}.jpg`} alt="" />
        <Link href="/feed">Close</Link>
      </dialog>
    </div>
  );
}
