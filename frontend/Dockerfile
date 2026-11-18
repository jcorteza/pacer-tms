FROM node:26
WORKDIR /usr/src/app
COPY package.json .
COPY pnpm-lock.yaml .
RUN npm install -g pnpm@12.21.0
RUN pnpm install
COPY . .
CMD ["pnpm", "run", "dev"]