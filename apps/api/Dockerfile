FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/tooling-eslint/package.json packages/tooling-eslint/package.json
COPY packages/tooling-typescript/package.json packages/tooling-typescript/package.json

RUN corepack enable
RUN pnpm install --no-frozen-lockfile

COPY . .

RUN pnpm --filter @gengis-khan/api build

EXPOSE 3000

CMD ["pnpm", "--filter", "@gengis-khan/api", "dev"]