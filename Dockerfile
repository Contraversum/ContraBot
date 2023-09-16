FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD [ "npx", "ts-node", "index.ts" ]