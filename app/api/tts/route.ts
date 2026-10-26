const VOICES: Record<string, string> = {
  jarvis: "wDsJlOXPqcvIUKdLXjDs",
  megatron: "6sFKzaJr574YWVu4UuJF",
};

export async function POST(req: Request) {
  const { text, voice = "jarvis" } = await req.json();
  const id = VOICES[voice];
  if (!id || !text) return new Response("Bad request", { status: 400 });

  const r = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${id}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({ text, model_id: "eleven_multilingual_v2" }),
    }
  );
  if (!r.ok) return new Response(await r.text(), { status: r.status });
  return new Response(r.body, { headers: { "Content-Type": "audio/mpeg" } });
        }
