import { writeFile } from "node:fs/promises";
import { createApp } from "./main";
import { createSwaggerDocument } from "./swagger-document";

async function main() {
  const app = await createApp();
  const document = createSwaggerDocument(app);
  await writeFile("openapi.json", JSON.stringify(document, null, 2), "utf8");
  await app.close();
}

void main();
