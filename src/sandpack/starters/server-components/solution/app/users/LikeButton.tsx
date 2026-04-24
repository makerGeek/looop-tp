// app/users/LikeButton.tsx — Client island (ships JS).
"use client";

import { useState } from "react";

export function LikeButton({ initial }: { initial: number }) {
  const [likes, setLikes] = useState(initial);
  return (
    <button onClick={() => setLikes((n) => n + 1)}>
      👍 {likes}
    </button>
  );
}
