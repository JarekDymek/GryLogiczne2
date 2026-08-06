import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const STYLES: Record<string, string> = {
  "friendly-illustration": "friendly, warm editorial illustration suitable for a youth educational game",
  caricature: "kind, light caricature with recognizable features; never mocking or demeaning",
  realistic: "clean realistic portrait photography with natural facial detail",
};

function corsHeaders(request: Request): Record<string, string> {
  const configuredOrigin = Deno.env.get("APP_ORIGIN") ?? "";
  const requestOrigin = request.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": configuredOrigin && configuredOrigin === requestOrigin ? requestOrigin : configuredOrigin,
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function response(request: Request, body: string, status: number): Response {
  return new Response(body, { status, headers: { ...corsHeaders(request), "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const output = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) output[index] = binary.charCodeAt(index);
  return output;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return response(request, "Dozwolona jest tylko metoda POST.", 405);

  const configuredOrigin = Deno.env.get("APP_ORIGIN") ?? "";
  if (!configuredOrigin || request.headers.get("origin") !== configuredOrigin) return response(request, "Niedozwolone źródło żądania.", 403);
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return response(request, "Brak autoryzacji właściciela.", 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const openAiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
  if (!supabaseUrl || !supabaseAnonKey || !openAiKey) return response(request, "Generator nie jest skonfigurowany.", 503);

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return response(request, "Sesja właściciela wygasła.", 401);
  const { data: role, error: roleError } = await supabase.rpc("current_app_role");
  if (roleError || role !== "owner") return response(request, "Ta funkcja jest dostępna wyłącznie dla właściciela.", 403);

  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return response(request, "Nieprawidłowe dane formularza.", 400);
  }
  const references = incoming.getAll("reference").filter((value): value is File => value instanceof File);
  if (references.length < 1 || references.length > 3) return response(request, "Dodaj od 1 do 3 zdjęć.", 400);
  if (references.some((file) => !ACCEPTED_TYPES.has(file.type) || file.size > MAX_FILE_BYTES)) {
    return response(request, "Zdjęcia muszą być plikami JPG, PNG lub WebP do 8 MB.", 400);
  }
  if (references.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES) return response(request, "Łączny rozmiar zdjęć przekracza 20 MB.", 400);

  const styleKey = String(incoming.get("style") ?? "friendly-illustration");
  const mentorName = String(incoming.get("mentorName") ?? "Mentor").slice(0, 80);
  const label = String(incoming.get("reactionLabel") ?? "radość").slice(0, 60);
  const title = String(incoming.get("reactionTitle") ?? "Brawo").slice(0, 80);
  const category = String(incoming.get("reactionCategory") ?? "neutral").slice(0, 30);
  const prompt = [
    "Create one square reaction portrait for an educational logic game, based only on the same person in the supplied reference photos.",
    `Character name: ${mentorName}. Visual style: ${STYLES[styleKey] ?? STYLES["friendly-illustration"]}.`,
    `Emotion/gesture: ${label}. Context category: ${category}. Intended message: ${title}.`,
    "Keep the person's identity, age, facial structure and distinguishing features consistent. Head and upper torso, expressive face and hands, uncluttered neutral background, centered composition.",
    "No text, letters, logos, watermark, extra people, extra fingers, insulting exaggeration, violence or sexual content.",
  ].join(" ");

  const openAiForm = new FormData();
  openAiForm.set("model", "gpt-image-2");
  openAiForm.set("prompt", prompt);
  openAiForm.set("size", "1024x1024");
  openAiForm.set("quality", "medium");
  openAiForm.set("output_format", "webp");
  references.forEach((file) => openAiForm.append("image[]", file, file.name));

  const generated = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAiKey}` },
    body: openAiForm,
  });
  if (!generated.ok) {
    console.error("OpenAI image edit failed", generated.status, (await generated.text()).slice(0, 500));
    return response(request, "Usługa generowania obrazu nie zakończyła pracy poprawnie.", 502);
  }
  const payload = await generated.json() as { data?: Array<{ b64_json?: string }> };
  const encoded = payload.data?.[0]?.b64_json;
  if (!encoded) return response(request, "Generator nie zwrócił obrazu.", 502);
  return new Response(decodeBase64(encoded), {
    status: 200,
    headers: { ...corsHeaders(request), "Content-Type": "image/webp", "Cache-Control": "no-store" },
  });
});
