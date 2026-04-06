/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly JWT_SECRET: string;
  readonly JWT_EXPIRES_IN: string;
  readonly DATABASE_URL: string;
  readonly PORT: string;
}

declare namespace App {
  interface Locals {
    user: {
      userId: number;
      username: string;
      role: 'admin' | 'operador';
    };
  }
}
