FROM node:18-alpine
WORKDIR /app
COPY chat-server/package*.json ./
RUN npm install
COPY . .
CMD ["node", "chat-server/index.js"]
