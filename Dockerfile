FROM node:19
WORKDIR /usr/src/app

# For getBins.sh to work
RUN apt install unzip
RUN apt install wget

COPY . .
RUN sh ./getBins.sh

# make sure it matches your config file
EXPOSE 8080

RUN yarn
CMD [ "yarn", "run", "serve" ]
