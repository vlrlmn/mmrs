FROM node:22

WORKDIR /app

ENV PORT=5001
ENV JWT_SECRET=super_secure_secret_key
ENV JWT_SALT=random_salt_string
ENV JWT_ACCESS_EXPIRES_IN=15m
ENV JWT_REFRESH_EXPIRES_IN=90d
ENV RADISH_HOST=localhost
ENV RADISH_PORT=5100
ENV UMS_ADDR=localhost:5000/auth
ENV GAME_ADDR=localhost:5002/game
ENV ALLOWED_ORIGIN=http://localhost:3000

COPY package*.json ./

RUN npm install

COPY . .
COPY ./db/migrations /app/db/migrations

RUN npm run build

EXPOSE ${PORT}

RUN chmod +x ./docker-run.sh

CMD ["sh", "./docker-run.sh"]

