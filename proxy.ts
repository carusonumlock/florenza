import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * No Next 16 o middleware passou a se chamar `proxy` e a viver neste arquivo.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Roda em tudo, menos assets estáticos, imagens e vídeos — o site tem ~94 MB
     * de .mp4 e fotos de produto, e cobrar um round-trip ao Supabase por arquivo
     * servido deixaria a vitrine lenta à toa.
     */
    "/((?!_next/static|_next/image|favicon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|glb)$).*)",
  ],
};
