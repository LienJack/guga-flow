import "reflect-metadata";

import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { readAppConfig } from "./config/app-config";

async function bootstrap() {
  const config = readAppConfig();
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: config.corsAllowedOrigins,
  });
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  await app.listen(config.port);
}

void bootstrap();
