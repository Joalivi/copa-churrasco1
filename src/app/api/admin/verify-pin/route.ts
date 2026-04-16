const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";

  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (entry) {
    if (now > entry.resetAt) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    } else {
      if (entry.count >= RATE_LIMIT_MAX) {
        return Response.json(
          { error: "Muitas tentativas. Tente novamente em breve." },
          { status: 429 }
        );
      }
      entry.count++;
    }
  } else {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  }

  const body = await request.json();
  const { pin } = body;

  if (!pin) {
    return Response.json(
      { error: "PIN obrigatorio" },
      { status: 400 }
    );
  }

  if (pin !== process.env.ADMIN_PIN) {
    return Response.json({ valid: false }, { status: 403 });
  }

  return Response.json({ valid: true });
}
