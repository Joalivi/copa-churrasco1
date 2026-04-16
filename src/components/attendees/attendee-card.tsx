"use client";

import { useState } from "react";
import type { User } from "@/types";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface AttendeeCardProps {
  user: User;
}

export function AttendeeCard({ user }: AttendeeCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="card flex flex-col items-center gap-2 py-4 px-3 hover:shadow-lg transition-all duration-200">
      {/* Avatar */}
      {user.photo_url && !imgError ? (
        <img
          src={user.photo_url}
          alt={user.name}
          className="w-16 h-16 rounded-full object-cover border-2 border-green/30 ring-2 ring-green/10 ring-offset-1"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green to-green-dark text-white flex items-center justify-center font-bold text-lg">
          {getInitials(user.name)}
        </div>
      )}

      {/* Nome */}
      <p className="font-semibold text-sm text-center leading-tight line-clamp-2">
        {user.name}
      </p>

      {/* Instagram */}
      {user.instagram && (
        <a
          href={`https://instagram.com/${user.instagram}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-foreground/50 hover:text-green transition-colors"
        >
          @{user.instagram}
        </a>
      )}
    </div>
  );
}
