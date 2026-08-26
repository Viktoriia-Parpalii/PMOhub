import { writeFile } from 'node:fs/promises';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { createApp } from './main';

async function main() {
  const app = await createApp();
  const document = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('PMO Hub API').setVersion('1.0').addBearerAuth().build());
  await writeFile('openapi.json', JSON.stringify(document, null, 2), 'utf8');
  await app.close();
}

void main();
