/* eslint-disable @typescript-eslint/no-explicit-any */
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://dummy:dummy@localhost:5432/dummy';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dummy_access_secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dummy_refresh_secret';

import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';
import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { zodToJsonSchema } from 'zod-to-json-schema';

async function generate() {
  const registry = new OpenAPIRegistry();
  const routeFiles = globSync('src/app/api/**/route.ts');

  const register = (item: any) => {
    const openApiPath = item.path.replace(/\[([^\]]+)\]/g, '{$1}');

    const jsonSchema = item.requestBody
      ? zodToJsonSchema(item.requestBody, { target: "openApi3" })
      : undefined;

    registry.registerPath({
      method: item.method,
      path: openApiPath,
      summary: item.summary,
      tags: item.tags || ['default'], // <--- 1. เพิ่มบรรทัดนี้ (ถ้าไม่ได้ใส่ tag ให้ไปอยู่ default)
      responses: { 200: { description: 'Success' } },
      request: jsonSchema
        ? {
          body: {
            content: {
              'application/json': { schema: jsonSchema as any }
            }
          }
        }
        : undefined
    });
  };

  for (const file of routeFiles) {
    const routeModule = await import(path.resolve(file));

    if (Array.isArray(routeModule.openapiList)) {
      routeModule.openapiList.forEach(register);
    } else if (routeModule.openapi) {
      register(routeModule.openapi);
    }
  }

  const generator = new OpenApiGeneratorV3(registry.definitions);
  const document = generator.generateDocument({
    openapi: '3.0.0',
    info: { title: 'My API', version: '1.0.0' },
  });

  fs.writeFileSync('public/openapi.json', JSON.stringify(document, null, 2));
  console.log('✅ OpenAPI generated!');
}

generate().catch(console.error);