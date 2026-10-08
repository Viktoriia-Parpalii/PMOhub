import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export const createSwaggerDocument = (app: INestApplication) => {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("PMO Hub API")
      .setVersion("1.0")
      .addBearerAuth()
      .build(),
  );

  // Class-level @ApiOkResponse also appears on POST commands. Nest returns 201
  // for those commands, so keep their response schema under the actual status.
  for (const path of Object.values(document.paths)) {
    const responses = path.post?.responses;
    const created = responses?.["201"];
    const ok = responses?.["200"];
    if (!responses || !created || !ok) continue;
    if (!("$ref" in created) && !("$ref" in ok) && !created.content && ok.content) {
      created.content = ok.content;
    }
    delete responses["200"];
  }

  return document;
};
