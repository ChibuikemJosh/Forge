import demoSourceRaw from "../../../../backend/app/security_demo.py?raw";
export const demoSource: string = demoSourceRaw;
export const DEMO_FILE_PATH = "backend/app/security_demo.py";
export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
