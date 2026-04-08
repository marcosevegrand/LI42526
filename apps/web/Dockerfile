FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/tooling-eslint/package.json packages/tooling-eslint/package.json
COPY packages/tooling-typescript/package.json packages/tooling-typescript/package.json

RUN corepack enable
RUN pnpm install --no-frozen-lockfile

COPY . .

EXPOSE 5173

CMD ["pnpm", "--filter", "@gengis-khan/web", "dev", "--", "--host", "0.0.0.0"]