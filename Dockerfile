FROM node:19.9.0-alpine
WORKDIR /usr/src/app

# For getBins.sh to work
RUN apk add unzip
RUN apk add wget

COPY . .
RUN ./getBins.sh

# make sure it matches your config file
EXPOSE 8080

RUN npm i -g yarn
RUN yarn
CMD [ "yarn", "run", "serve" ]