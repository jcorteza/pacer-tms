FROM node:26
WORKDIR /usr/src/app
COPY package.json .
COPY pnpm-*.yaml .
RUN npm install -g pnpm@12.21.0
RUN pnpm install
COPY . .
RUN pnpm run build
EXPOSE 3000
CMD ["node", "dist/main"]